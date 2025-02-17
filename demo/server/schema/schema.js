const db = require('../models/countriesModel');
const dbBooks = require('../models/booksModel');

const graphqlNodeModule =
  process.env.NODE_ENV === 'development'
    ? '../../../quell-server/node_modules/graphql'
    : 'graphql';

const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLList,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLNonNull,
} = require(graphqlNodeModule);

// =========================== //
// ===== TYPE DEFINITIONS ==== //
// =========================== //

/*
  Generally corresponds with table we're pulling from
*/

const BookShelfType = new GraphQLObjectType({
  name: 'BookShelf',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    books: {
      type: new GraphQLList(BookType),
      async resolve(parent, args) {
        const booksList = await dbBooks.query(
          `
          SELECT * FROM books WHERE shelf_id=$1`,
          [Number(parent.id)]
        );

        return booksList.rows;
      },
    },
  }),
});

const BookType = new GraphQLObjectType({
  name: 'Book',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    author: { type: GraphQLString },
    shelf_id: { type: GraphQLString },
  }),
});

const CountryType = new GraphQLObjectType({
  name: 'Country',
  fields: () => ({
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    capital: { type: GraphQLString },
    cities: {
      type: new GraphQLList(CityType),
      async resolve(parent, args) {
        const citiesList = await db.query(
          `SELECT * FROM cities WHERE country_id=$1`,
          [Number(parent.id)]
        );

        return citiesList.rows;
      },
    },
  }),
});

const CityType = new GraphQLObjectType({
  name: 'City',
  fields: () => ({
    country_id: { type: GraphQLString },
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    population: { type: GraphQLInt },
    attractions: {
      type: new GraphQLList(AttractionType),
      async resolve(parent, args) {
        const attractionsList = await db.query(
          `SELECT * FROM attractions WHERE city_id=$1`,
          [Number(parent.id)]
        );

        return attractionsList.rows;
      },
    },
  }),
});

const AttractionType = new GraphQLObjectType({
  name: 'Attraction',
  fields: () => ({
    city_id: { type: GraphQLString },
    id: { type: GraphQLID },
    name: { type: GraphQLString },
  }),
});

// ADD LANGUAGES TYPE HERE

// ================== //
// ===== QUERIES ==== //
// ================== //

const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    // GET COUNTRY BY ID
    country: {
      type: CountryType,
      args: { id: { type: GraphQLID } },
      async resolve(parent, args) {
        const country = await db.query(
          `
          SELECT * FROM countries WHERE country_id=$1`,
          [Number(args.id)]
        );

        return country.rows[0];
      },
    },
    // GET ALL COUNTRIES
    countries: {
      type: new GraphQLList(CountryType),
      async resolve(parent, args) {
        const countriesFromDB = await db.query(`
          SELECT * FROM countries
          `);

        return countriesFromDB.rows;
      },
    },
    // GET ALL CITIES IN A COUNTRY
    citiesByCountry: {
      type: new GraphQLList(CityType),
      args: { country_id: { type: GraphQLID } },
      async resolve(parent, args) {
        const citiesList = await db.query(
          `
          SELECT * FROM cities WHERE country_id=$1`,
          [Number(args.country_id)]
        ); // need to dynamically resolve this

        return citiesList.rows;
      },
    },
    // GET CITY BY ID
    city: {
      type: CityType,
      args: { id: { type: GraphQLID } },
      async resolve(parent, args) {
        const city = await db.query(
          `
          SELECT * FROM cities WHERE id=$1`,
          [Number(args.id)]
        );

        return city.rows[0];
      },
    },
    // GET ALL CITIES
    cities: {
      type: new GraphQLList(CityType),
      async resolve(parent, args) {
        const citiesList = await db.query(`
          SELECT * FROM cities`);

        return citiesList.rows;
      },
    },
    // GET ALL ATTRACTIONS IN A CITY
    attractionsByCity: {
      type: new GraphQLList(AttractionType),
      args: { city_id: { type: GraphQLID } },
      async resolve(parent, args) {
        const attractionsList = await db.query(
          `
          SELECT * FROM attractions WHERE city_id=$1`,
          [Number(args.city_id)]
        ); // need to dynamically resolve this

        return attractionsList.rows;
      },
    },
    // GET ATTRACTION BY ID
    attraction: {
      type: AttractionType,
      args: { id: { type: GraphQLID } },
      async resolve(parent, args) {
        const attraction = await db.query(
          `
          SELECT * FROM attractions WHERE id=$1`,
          [Number(args.id)]
        );

        return attraction.rows[0];
      },
    },
    // GET ALL ATTRACTIONS
    attractions: {
      type: new GraphQLList(AttractionType),
      async resolve(parent, args) {
        const attractionsList = await db.query(`
          SELECT * FROM attractions`);

        return attractionsList.rows;
      },
    },
    // GET ALL BOOKS
    books: {
      type: new GraphQLList(BookType),
      async resolve(parent, args) {
        const books = await dbBooks.query(`SELECT * FROM books`);
        return books.rows;
      },
    },
    // GET BOOK BY ID
    book: {
      type: BookType,
      args: { id: { type: GraphQLID } },
      async resolve(parent, args) {
        const book = await dbBooks.query(`SELECT * FROM books WHERE id=$1`, [
          Number(args.id),
        ]);
        return book.rows[0];
      },
    },
    // GET ALL BOOKSHELVES
    bookShelves: {
      type: new GraphQLList(BookShelfType),
      async resolve(parent, args) {
        const shelvesList = await dbBooks.query(`
          SELECT * FROM bookShelves`);

        return shelvesList.rows;
      },
    },
    // GET SHELF BY ID
    bookShelf: {
      type: BookShelfType,
      args: { id: { type: GraphQLID } },
      async resolve(parent, args) {
        const bookShelf = await dbBooks.query(
          `SELECT * FROM bookShelves WHERE id=$1`,
          [Number(args.id)]
        );

        return bookShelf.rows[0];
      },
    },
  },
});

// ================== //
// ===== MUTATIONS ==== //
// ================== //

const RootMutation = new GraphQLObjectType({
  name: 'RootMutationType',
  fields: {
    // add book
    addBook: {
      type: BookType,
      args: {
        id: { type: GraphQLID },
        name: { type: new GraphQLNonNull(GraphQLString) },
        author: { type: GraphQLString },
        shelf_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, args) {
        const author = args.author || '';

        const newBook = await dbBooks.query(
          `INSERT INTO books (name, author, shelf_id) VALUES ($1, $2, $3) RETURNING *`,
          [args.name, author, Number(args.shelf_id)]
        );
        return newBook.rows[0];
      },
    },
    // update book name using author data
    changeBooksByAuthor: {
      type: BookType,
      args: {
        author: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, args) {
        const updatedBook = await dbBooks.query(
          `UPDATE books SET name=$2 WHERE author=$1 RETURNING *`,
          [args.author, args.name]
        );
        return updatedBook.rows[0];
      },
    },
    // update book author using name data
    changeBooksByName: {
      type: BookType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        author: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, args) {
        const updatedBook = await dbBooks.query(
          `UPDATE books SET author=$2 WHERE name=$1 RETURNING *`,
          [args.name, args.author]
        );
        return updatedBook.rows[0];
      },
    },
    // delete book by name
    deleteBooksByName: {
      type: BookType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, args) {
        const deletedBook = await dbBooks.query(
          `DELETE FROM books WHERE name=$1 RETURNING *`,
          [args.name]
        );
        return deletedBook.rows[0];
      },
    },
    // delete book by author
    deleteBooksByAuthor: {
      type: BookType,
      args: { 
        author: { type: new GraphQLNonNull(GraphQLID) },
      },
      async resolve(parent, args) {
        const deletedBook = await dbBooks.query(
          `DELETE FROM books WHERE author=$1 RETURNING *`,
          [args.author]
        );
        return deletedBook.rows[0];
      },
    },
    // ADD SHELF
    addBookShelf: {
      type: BookShelfType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(parent, args) {
        const newBookShelf = await dbBooks.query(
          `INSERT INTO bookShelves (name) VALUES ($1) RETURNING *`,
          [args.name]
        );
        return newBookShelf.rows[0];
      },
    },
    // UPDATE SHELF
  },
});

// imported into server.js
module.exports = new GraphQLSchema({
  query: RootQuery,
  mutation: RootMutation,
  types: [CountryType, CityType, AttractionType, BookType, BookShelfType],
});
