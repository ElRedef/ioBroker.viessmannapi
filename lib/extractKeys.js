//v3.0viessmannapi
const JSONbig = require("json-bigint")({ storeAsString: true });
const alreadyCreatedOBjects = {};


async function extractKeys(adapter, path, element, preferedArrayName, forceIndex, write, channelName) {
    try {
        if (element === null || element === undefined) {
            adapter.log.debug("Cannot extract empty: " + path);
            return;
        }

        const objectKeys = Object.keys(element);

        //element.data.forEach(dataPoint => nameDataPoint(adapter,dataPoint));
        element.data.forEach(dataPoint => addDataPoint(adapter,dataPoint));
        

    } catch (error) {
        adapter.log.error("Error extract keys: " + path + " " + JSON.stringify(element));
        adapter.log.error(error);
    }

}

/****************************************************
 * Nur zum Debuggen. Gibt eine Liste mit Namen aus
 * 
*/
function nameDataPoint(adapter,dataPoint)
{
    adapter.log.info("Found: " + dataPoint.feature)

}


/****************************************************
 * Adds a Datapoint
 * 
*/
async function addDataPoint(adapter,dataPoint)
{
    try{
        //if(!(dataPoint.properties.value == undefined )) {//Nur anlegen wenn eine value vorhanden ist
        if(Object.keys(dataPoint.properties).length > 0) {//Nur anlegen wenn eine value vorhanden ist
            
            adapter.log.debug("Adding: " + dataPoint.feature)

            prefix = ""

            let name = prefix + dataPoint.feature

            var value = ""
            var typ = ""
            var unit = ""
            var uri = dataPoint.uri
            var status = ""


            if (dataPoint.properties.value )  
            {   value = dataPoint.properties.value.value
                unit = dataPoint.properties.value.unit
                typ = dataPoint.properties.value.type
            }
            else if (dataPoint.properties.active )  
            {   
                value = dataPoint.properties.active.value
                typ = dataPoint.properties.active.type
                
            }
            else if (dataPoint.properties.status )  //dies wird genommen wenn es nur den Status gibt
            {
                value = dataPoint.properties.status.value
                typ = dataPoint.properties.status.type
            }
            else {
                value = JSON.stringify(dataPoint.properties);
                typ = 'json'
            }

            if (dataPoint.properties.status )  //Den Status gibt es mit und ohne 'value'. 
            {
                status = dataPoint.properties.status.value
            }

            if(Object.keys(dataPoint.commands).length > 0) { //wenn es kommandos gibt
    
                let keys = Object.keys(dataPoint.commands)

                keys.forEach(async (key) => {
                    adapter.log.debug("Command: " + key)
                    let cmd_name = name + "."+key
                    let cmd_uri = dataPoint.commands[key].uri
                    let cmd_params = JSON.stringify(dataPoint.commands[key].params)

                    await AddCommand(cmd_name, cmd_uri, cmd_params);
                    
                })//keys.forEach
            }

            await adapter
            .setObjectNotExistsAsync(name, {
                type: "state",
                common: {
                    name: dataPoint.feature,
                    read: true, 
                    write: false, 
                    uri: uri,
                    desc: dataPoint.feature, 
                    type: typ, 
                    status: status,
                    unit: unit
                },
                native: {},
            })
            .catch((error) => {
                adapter.log.error(error);
            });

            adapter.setState(name, value, true);

        }//if(!(data.data.properties.value == undefined )) 
        else
        {
            adapter.log.debug("Skipping: " + dataPoint.feature)
        }

    } catch (error) {
        adapter.log.error("Cannot addDataPoint " + dataPoint);
        adapter.log.error(error);
    }

    async function AddCommand(cmd_name, cmd_uri, cmd_params) {

        /*createState(cmd_name+".uri", cmd_uri,  {
            name: "uri",
            read: true, 
            write: false, 
            type: "string"
        })*/


        await adapter
            .setObjectNotExistsAsync(cmd_name + ".uri", {
                type: "state",
                common: {
                    name: "uri",
                    read: true,
                    write: false,
                    type: "string"
                },
                native: {},
            })
            .catch((error) => {
                adapter.log.error(error);
            });

        adapter.setState(cmd_name + ".uri", cmd_uri, true);

        /*createState(cmd_name+".params", cmd_params,  {
            name: "params",
            read: true,
            write: false,
            type: "json"
        })*/
        await adapter
            .setObjectNotExistsAsync(cmd_name + ".params", {
                type: "state",
                common: {
                    name: "params",
                    read: true,
                    write: false,
                    type: "json"
                },
                native: {},
            })
            .catch((error) => {
                adapter.log.error(error);
            });

        adapter.setState(cmd_name + ".params", cmd_params, true);


        /*createState(cmd_name+".setValue",   {
            name: "Einstellungen sind hier änderbar",
            read: true,
            write: true,
    
        })*/
        await adapter
            .setObjectNotExistsAsync(cmd_name + ".setValue", {
                type: "state",
                common: {
                    name: "Einstellungen sind hier änderbar",
                    read: true,
                    write: true,
                },
                native: {},
            })
            .catch((error) => {
                adapter.log.error(error);
            });
    }
}//async function addDataPoint(adapter,dataPoint)




























async function extractKeysOld(adapter, path, element, preferedArrayName, forceIndex, write, channelName) {
    try {
        if (element === null || element === undefined) {
            adapter.log.debug("Cannot extract empty: " + path);
            return;
        }


        const objectKeys = Object.keys(element);

        if (!write) {
            write = false;
        }

        if (typeof element === "string" || typeof element === "number") {
            let name = element;
            if (typeof element === "number") {
                name = element.toString();
            }
            if (!alreadyCreatedOBjects[path]) {
                await adapter
                    .setObjectNotExistsAsync(path, {
                        type: "state",
                        common: {
                            name: name,
                            role: getRole(element, write),
                            type: typeof element,
                            write: write,
                            read: true,
                        },
                        native: {},
                    })
                    .then(() => {
                        alreadyCreatedOBjects[path] = true;
                    })
                    .catch((error) => {
                        adapter.log.error(error);
                    });
            }

            adapter.setState(path, element, true);
            return;
        }
        if (!alreadyCreatedOBjects[path]) {
            await adapter
                .setObjectNotExistsAsync(path, {
                    type: "channel",
                    common: {
                        name: channelName || "",
                        write: false,
                        read: true,
                    },
                    native: {},
                })
                .then(() => {
                    alreadyCreatedOBjects[path] = true;
                })
                .catch((error) => {
                    adapter.log.error(error);
                });
        }
        if (Array.isArray(element)) {
            extractArray(adapter, element, "", path, write, preferedArrayName, forceIndex);
            return;
        }
        objectKeys.forEach(async (key) => {
            if (isJsonString(element[key])) {
                element[key] = JSONbig.parse(element[key]);
            }

            if (Array.isArray(element[key])) {
                extractArray(adapter, element, key, path, write, preferedArrayName, forceIndex);
            } else if (element[key] !== null && typeof element[key] === "object") {
                extractKeys(adapter, path + "." + key, element[key], preferedArrayName, forceIndex, write);
            } else {
                if (!alreadyCreatedOBjects[path + "." + key]) {
                    //adapter.log.error("Lege Key an" + element + " "); //JF
                    await adapter
                        .setObjectNotExistsAsync(path + "." + key, {
                            type: "state",
                            common: {
                                name: key,
                                role: getRole(element[key], write),
                                type: typeof element[key],
                                write: write,
                                read: true,
                            },
                            native: {},
                        })
                        .then(() => {
                            alreadyCreatedOBjects[path + "." + key] = true;
                        })
                        .catch((error) => {
                            adapter.log.error(error);
                        });
                    if (key === "isExecutable") {
                        const setStatePath = path + ".setValue";
                        const common = {
                            name: "Einstellungen sind hier änderbar / You can change the settings here",
                            role: "value",
                            type: "string",
                            write: true,
                            read: true,
                            param: "",
                        };

                        if (element.params && Object.keys(element.params).length > 0) {
                            param = Object.keys(element.params)[0];
                            common.param = param;
                            if (element.params[param] && element.params[param].type === "number") {
                                common.type = "number";
                            }
                            if (element.params[param] && element.params[param].constraints) {
                                const constrains = element.params[param].constraints;
                                if (constrains.min) {
                                    common.min = constrains.min;
                                }
                                if (constrains.max) {
                                    common.max = constrains.max;
                                }
                                if (constrains.enum) {
                                    common.states = {};
                                    for (const cenum of constrains.enum) {
                                        common.states[cenum] = cenum;
                                    }
                                }
                            }
                        }
                        await adapter.setObjectNotExistsAsync(setStatePath, {
                            type: "state",
                            common: common,
                            native: {},
                        });
                    }
                }
                adapter.setState(path + "." + key, element[key], true);
            }
        });
    } catch (error) {
        adapter.log.error("Error extract keys: " + path + " " + JSON.stringify(element));
        adapter.log.error(error);
    }
}
function extractArray(adapter, element, key, path, write, preferedArrayName, forceIndex) {
    try {
        if (key) {
            element = element[key];
        }
        element.forEach(async (arrayElement, index) => {
            index = index + 1;
            if (index < 10) {
                index = "0" + index;
            }
            let arrayPath = key + index;
            if (typeof arrayElement === "string") {
                extractKeys(adapter, path + "." + key + "." + arrayElement, arrayElement, preferedArrayName, forceIndex, write);
                return;
            }
            if (typeof arrayElement[Object.keys(arrayElement)[0]] === "string") {
                arrayPath = arrayElement[Object.keys(arrayElement)[0]];
            }
            Object.keys(arrayElement).forEach((keyName) => {
                if (keyName.endsWith("Id")) {
                    if (arrayElement[keyName] && arrayElement[keyName].replace) {
                        arrayPath = arrayElement[keyName].replace(/\./g, "");
                    } else {
                        arrayPath = arrayElement[keyName];
                    }
                }
            });
            Object.keys(arrayElement).forEach((keyName) => {
                if (keyName.endsWith("Name")) {
                    arrayPath = arrayElement[keyName];
                }
            });

            if (arrayElement.id) {
                if (arrayElement.id.replace) {
                    arrayPath = arrayElement.id.replace(/\./g, "");
                } else {
                    arrayPath = arrayElement.id;
                }
            }
            if (arrayElement.name) {
                arrayPath = arrayElement.name.replace(/\./g, "");
            }
            if (arrayElement.start_date_time) {
                arrayPath = arrayElement.start_date_time.replace(/\./g, "");
            }
            if (preferedArrayName && arrayElement[preferedArrayName]) {
                arrayPath = arrayElement[preferedArrayName]; //.replace(/\./g, "");
            }

            if (forceIndex) {
                arrayPath = key + index;
            }
            //special case array with 2 string objects
            if (
                Object.keys(arrayElement).length === 2 &&
                typeof Object.keys(arrayElement)[0] === "string" &&
                typeof Object.keys(arrayElement)[1] === "string" &&
                typeof arrayElement[Object.keys(arrayElement)[0]] !== "object" &&
                typeof arrayElement[Object.keys(arrayElement)[1]] !== "object" &&
                arrayElement[Object.keys(arrayElement)[0]] !== "null"
            ) {
                let subKey = arrayElement[Object.keys(arrayElement)[0]];
                const subValue = arrayElement[Object.keys(arrayElement)[1]];
                const subName = Object.keys(arrayElement)[0] + " " + Object.keys(arrayElement)[1];
                if (key) {
                    subKey = key + "." + subKey;
                }
                if (!alreadyCreatedOBjects[path + "." + subKey]) {
                    await adapter
                        .setObjectNotExistsAsync(path + "." + subKey, {
                            type: "state",
                            common: {
                                name: subName,
                                role: getRole(subValue, write),
                                type: typeof subValue,
                                write: write,
                                read: true,
                            },
                            native: {},
                        })
                        .then(() => {
                            alreadyCreatedOBjects[path + "." + subKey] = true;
                        });
                }
                adapter.setState(path + "." + subKey, subValue, true);
                return;
            }
            extractKeys(adapter, path + "." + arrayPath, arrayElement, preferedArrayName, forceIndex, write);
        });
    } catch (error) {
        adapter.log.error("Cannot extract array " + path);
        adapter.log.error(error);
    }
}
function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
function getRole(element, write) {
    if (typeof element === "boolean" && !write) {
        return "indicator";
    }
    if (typeof element === "boolean" && write) {
        return "switch";
    }
    if (typeof element === "number" && !write) {
        return "value";
    }
    if (typeof element === "number" && write) {
        return "level";
    }
    if (typeof element === "string") {
        return "text";
    }
    return "state";
}
module.exports = {
    extractKeys,
};
