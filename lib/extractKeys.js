/***************************************
@todo wenn in den Properties mehr als ein Eintrag ist korrekt machen e.g.  heating.dhw.pumps.circulation.schedule gibt es activ und entries
@todo Die Uri bei den "settern" in die CommonSection schieben und keinen Channel mehr auf machen
@todo "Celsius" in "°C"
@todo refactor Create Channel and create devices to  addChannel and addDevice to have the same structure
@todo Clean Up
*/




//v3.0viessmannapi
const JSONbig = require("json-bigint")({ storeAsString: true });
const alreadyCreatedOBjects = {};
const deviceNames = [];
const channelNames = [];
const commandNames = [];
const datapointNames = [];


/******************************************************************
 * 
 * Runs trough the element
 * Does first an analysis what element is what (datapoint, command, channel, device)
 * Uses the global arrays to store this info. 
 * 
 * Then creates those elements in the iobroker object tree.
 * 
 */
async function extractKeys(adapter, path, element, preferedArrayName, forceIndex, write, channelName) {
    try {
        if (element === null || element === undefined) {
            adapter.log.debug("Cannot extract empty: " + path);
            return;
        }

        //Run trough all Elements and do an analysis
        //Fills the global arrays (see top of the file)
        adapter.log.debug("Analysing Elements")
        for (const dataPoint of element.data) {
            await AnalyzeDatapoint(adapter,dataPoint);
        }
        //adapter.log.error("Gefundene Devices: " + deviceNames);
        //adapter.log.error("Gefundene Channels: " + channelNames);
        //adapter.log.error("Gefundene Commands: " + commandNames);


        //Create Channels 
        adapter.log.debug("Creating Channels")
        for (const channel of channelNames) {
            await adapter
            .setObjectNotExistsAsync(channel, {
                type: "channel",
                common: {
                    name: channel || "",
                    write: false,
                    read: true,
                },
                native: {},
            })

            .catch((error) => {
                adapter.log.error(error);
            });
        }

        //Create Devices 
        adapter.log.debug("Creating Devices")
        for (const device of deviceNames) {
            await adapter
            .setObjectNotExistsAsync(device, {
                type: "device",
                common: {
                    name: device || "",
                    write: false,
                    read: true,
                },
                native: {},
            })
            .catch((error) => {
                adapter.log.error(error);
            });
        }

        //Create Commands 
        adapter.log.debug("Creating Commands")
        for (const command of commandNames) {
            //AddCommand(adapter,command[0], command[1], command[2]);
            AddCommand(adapter,command.name, command.uri, command.params);
        }
        

        //Create Datapoints 
        adapter.log.debug("Creating Datapoints")
        //Search fist if the datapoint name was already added as a channel -> then rename
        for (const datapoint of datapointNames) {
            let name = ""

            if(channelNames.indexOf(datapoint.name) === -1) {
                name = datapoint.name;
            }
            else
            {
                //adapter.log.error("Found doublette: " + datapoint.name)
                name = datapoint.name + ".value";
            }

            AddDataPoint(adapter, name, datapoint.prop, datapoint.feature, datapoint.uri);
        }
    } catch (error) {
        adapter.log.error("Error extract keys: " + path + " " + JSON.stringify(element));
        adapter.log.error(error);
    }

}// async function extractKeys(...) 


/****************************************************
 * Nur zum Debuggen. Gibt eine Liste mit Namen aus
 * 
*/
function nameDataPoint(adapter,dataPoint)
{
    adapter.log.info("Found: " + dataPoint.feature)

}


/****************************************************
 * Anaylses a Datapoint
 * 
*/
async function AnalyzeDatapoint(adapter,dataPoint)
{
    try{
        if(Object.keys(dataPoint.properties).length > 0) {//Nur anlegen wenn ein value vorhanden ist
            
            let name = dataPoint.feature;
            //adapter.log.debug("Adding: " + name)

            keys = Object.keys(dataPoint.properties)
            //keys.remove("unit") //Unit is also represented in the value itself. Therfore delete
        
            if(keys.length>1) { //more than one property, lets 
                adapter.log.debug("Found more then one key: " + keys)

                for(const key in keys){
                    //prop = dataPoint.properties[key]
                    //adapter.log.debug(key+": "+ dataPoint.properties[key])
                    prop = dataPoint.properties[keys[key]]

                    //Okay, we have a datapoint. Lets add it. 
                    let dp = {
                        "name": name+ "."+ keys[key],
                        "uri": dataPoint.uri,
                        "prop": prop,
                        "feature": dataPoint.feature
                    }
                    if(datapointNames.indexOf(dp) === -1)  datapointNames.push(dp);  

                }

            }
            else {//only one property, lets save the properties substructure
        
                let prop = ""

                if (dataPoint.properties.value) { 
                    prop = dataPoint.properties.value
                }
                else if (dataPoint.properties.active) { 
                    prop = dataPoint.properties.active
                }
                else if (dataPoint.properties.status) 
                {
                    prop = dataPoint.properties.status
                }


                //Okay, we have a datapoint. Lets add it. 
                let dp = {
                    "name": name,
                    "uri": dataPoint.uri,
                    "prop": prop,
                    "feature": dataPoint.feature
                }

                //if(datapointNames.indexOf(dp) === -1)  datapointNames.push(dp);  
            } //else    


            //Look if we have a new command found. If yes: save
            if(Object.keys(dataPoint.commands).length > 0) { //wenn es kommandos gibt
    
                let keys = Object.keys(dataPoint.commands)

                keys.forEach(async (key) => {
                    //adapter.log.debug("Command: " + key)
                    
                    let command = {
                        "name": name+ "."+key,
                        "uri": dataPoint.commands[key].uri,
                        "params": JSON.stringify(dataPoint.commands[key].params),
                    }

                    if(commandNames.indexOf(command) === -1)  commandNames.push(command);  
                    
                    
                    //Also cmmmands can create channels: save
                    for (const channel of getChannelNames(command.name)) {
                        if(channelNames.indexOf(channel) === -1)  channelNames.push(channel);
                    }
                })//keys.forEach
            }

            //Look if we have a new device found. If yes: save
            let deviceName = getDeviceName(name);
            if(deviceNames.indexOf(deviceName) === -1)  deviceNames.push(deviceName);
            

            //Look if we have new channel found. If yes: save
            for (const channel of getChannelNames(name)) {
                if(channelNames.indexOf(channel) === -1)  channelNames.push(channel);
            }
        }//if(!(data.data.properties.value == undefined )) 
        else
        {
            //adapter.log.debug("Skipping: " + dataPoint.feature)
        }
    } catch (error) {
        adapter.log.error("Cannot AnalyzeDatapoint " + dataPoint);
        adapter.log.error(error);
    }
}//async function AnalyzeDatapoint(...)




/************************************************************+
 * Adds an Datapoint and the value to the object tree
 */
async function AddDataPoint(adapter, name, prop,  feature, uri) {
    try{

        adapter.log.debug("Adding Datapoint: "+ name);

        var value = "";
        var typ = "mixed";
        var unit = "";

        if(prop)
        {
            // @todo: prop.value kann entweder nicht vorhanden sein, oder es ist boolean und false
            if(prop.value) {
                if(typeof prop.value === 'object')
                {
                    adapter.log.debug("Found object with JSON value")
                    value = JSON.stringify(prop.value)
                    typ = "json"
                }
                else {
                    value = prop.value;
                    if(prop.unit) unit = prop.unit;
                    if(prop.type) typ = prop.type;
                }

            }//if(prop.value)
        }
    
        //create the object
        await adapter
            .setObjectNotExistsAsync(name, {
                type: "state",
                common: {
                    name: feature,
                    read: true,
                    write: false,
                    uri: uri,
                    desc: feature,
                    type: typ,
                    unit: unit
                },
                native: {},
            })
            .catch((error) => {
                adapter.log.error(error);
            });

        //set the value    
        adapter.setState(name, value, true);

    } 
    catch (error) {
        adapter.log.error("Cannot AddDatapoint:" + name);
        adapter.log.error(error);
    }

}//async function AddDataPoint(...) {


/************************************************************+
 * Adds an Command
 */
async function AddCommand(adapter, cmd_name, cmd_uri, cmd_params) {

    //Create the Uri Element
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
    //Write the Uri Value
    adapter.setState(cmd_name + ".uri", cmd_uri, true);


    //Create the options for 'setValue'
    const setStatePath = cmd_name + ".setValue";
    const common = {
        name: "Einstellungen sind hier änderbar / You can change the settings here",
        role: "value",
        type: "string",
        write: true,
        read: true,
        param: "",
    };


    //What to write as an parameter
    cmd_params = JSON.parse(cmd_params);
    param = Object.keys(cmd_params)[0];
    common.param = param;
    if (cmd_params[param] && cmd_params[param].type === "number") {
        common.type = "number";
    }
    if (cmd_params[param] && cmd_params[param].constraints) {
        const constrains = cmd_params[param].constraints;
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

    //Create the Object
    await adapter
        .setObjectNotExistsAsync(cmd_name + ".setValue", {
            type: "state",
            common: common,
            native: {},
        })
        .catch((error) => {
            adapter.log.error(error);
        });
    
}//async function AddCommand(...) {


























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


function getDeviceName(name){
    let n= name.split("."); //'Adresse' aufteilen nach Punkten
    return n[0]
}

function getChannelNames(name){
    let n= name.split("."); //'Adresse' aufteilen nach Punkten
    let ChannelName = n[0]
    let ChannelArray = [];

    //loop and add to string and array
    for (var i = 1; i < n.length-1; i++) {
        ChannelName+="."+n[i]
        ChannelArray.push(ChannelName);   
    }
    return ChannelArray
}



module.exports = {
    extractKeys,
};
