//importing lokiJS to be used as client cache storage to replace sessionStorage
const loki = require("lokijs");
let lokidb = new loki("client-cache");
let lokiClientCache = lokidb.addCollection("loki-client-cache", {
  indices: ["id"],
});

/** 
 normalizeForCache traverses server response data and creates objects out of responses for cache. 
 * Iterates & recurses over response object & preps data to be sent to cache
 * and sends data to cache
 * necessary for cache consistency
 @param {object} responseData - the data from the graphQL response object
 @param {object} queryTypeMap - a map of queryType i.e. books, countries for query caching purpose
 @param {object} map - a map of graphQL fields to their corresponding graphQL Types
 @param {object} protoField - the prototype object, or a section of the prototype object, for accessing arguments, aliases, etc.
 * fieldsMap: potentially deprecated?
 */

function normalizeForLokiCache(responseData, queryTypeMap, isMutation, map = {}, protoField, subID, fieldsMap = {}) {
  // if we are recursing, we want to add a subid before caching
  // iterate over keys in our response data object
  for (const resultName in responseData) {

    // currentField we are iterating over & corresponding Prototype
    const currField = responseData[resultName];
    const currProto = protoField[resultName];
    
    if(isMutation) {
      for (const property in map) {
        if (currProto.__type.includes(map[property])) currProto.__type = map[property];
      }
    }

    // check if the value stored at that key is array
    if (Array.isArray(currField)) {
      const cacheKey = subID ? subID + "--" + resultName : resultName;
      let queryTypeKey = cacheKey;
      // create empty array to store refs
      const refList = [];

      // iterate over countries array
      for (let i = 0; i < currField.length; i++) {
        const el = currField[i];
        // for each object "resultName" is key on "map" for our Data Type
        const dataType = map[resultName];

        // grab ID from object we are iterating over
        let fieldID = dataType;

        // if key is an ID, append to fieldID for caching
        for (const key in el) { if (key === "id" || key === "_id" || key === "ID" || key === "Id") fieldID += `--${el[key]}`;}
        
        // push fieldID onto refList
        refList.push(fieldID);
        
        // if object, recurse to add all nested values of el to cache as individual entries
        if (typeof el === "object") { normalizeForLokiCache({ [dataType]: el }, queryTypeMap, isMutation, map, { [dataType]: currProto }) }
      }

      // old code for sessionStorage
      // sessionStorage.setItem(cacheKey, JSON.stringify(refList));

      // find if queryType value exists in lokiJS client cache and set it to dataInLoki
      let dataInLoki = lokiClientCache.find(queryTypeMap[queryTypeKey]);
      let isExisting = false;

      //if there is no data in LokiJS, then we know that we can cache the data query/mutation requested
      if(dataInLoki.length === 0) {
        lokiClientCache.insert({ id: cacheKey, cacheKey: refList, queryType: queryTypeMap[queryTypeKey] });
      //otherwise, check if cacheKey exists in dataLoki; if the condition is true, then we know we
      //do not need to cache it in lokiJS anymore. 
      }else{
        dataInLoki.forEach((data) => { if(cacheKey === data.id) isExisting = true;});
        //if it doesn't exist in lokiJS, cache the cacheID data in lokiJS.
        if (!isExisting) lokiClientCache.insert({ id: cacheKey, cacheKey: refList, queryType: queryTypeMap[queryTypeKey] }); 
      }     

    // if currField type is object
    } else if (typeof currField === "object") {
      // need to get non-Alias ID for cache
      // temporary store for field properties
      const fieldStore = {};

      // if object has id, generate fieldID
      let cacheID = map.hasOwnProperty(currProto.__type)
        ? map[currProto.__type]
        : currProto.__type;

      // assign cacheID to queryTypeID to be used for finding query type in lokiJS
      let queryTypeID = cacheID;
      // if prototype has ID, append it to cacheID
      cacheID += currProto.__id ? `--${currProto.__id}` : "";

      // iterate over keys in object
      for (const key in currField) {
        // if prototype has no ID, check field keys for ID (mostly for arrays)
        if (!currProto.__id && (key === "id" || key === "_id" || key === "ID" || key === "Id")) cacheID += `--${currField[key]}`;
        
        fieldStore[key] = currField[key];

        // if object, recurse normalizeForCache assign in that object
        // must also pass in protoFields object to pair arguments, aliases with response
        if (typeof currField[key] === "object") 
          normalizeForLokiCache({ [key]: currField[key] }, queryTypeMap, isMutation, map, { [key]: protoField[resultName][key] }, cacheID );
      }

      // store "current object" on cache
      let dataInLoki = lokiClientCache.find(queryTypeMap[queryTypeID])

      // use isExisting as tracker/flag to check whether the cacheID exists in dataInLoki
      let isExisting = false;
      //if there is no data in LokiJS, then we know that we can cache the data query/mutation requested
      if(dataInLoki.length === 0) {
        lokiClientCache.insert({ id: cacheID, cacheID: fieldStore, queryType: queryTypeMap[queryTypeID] }); 
      //otherwise, check if cacheID exists in dataLoki; if the condition exists, then we know we
      //do not need to cache it in lokiJS anymore.       
      }else{
        dataInLoki.forEach((data) => { if(cacheID === data.id) isExisting = true; });
        //if it doesn't exist in lokiJS, cache the cacheID data in lokiJS.
        if (!isExisting) lokiClientCache.insert({ id: cacheID, cacheID: fieldStore, queryType: queryTypeMap[queryTypeID] });  
      }      
    }
  }
}

module.exports = { normalizeForLokiCache, lokiClientCache };
