/*********************************************************************************************
 * Extracts the *feature.json of vissmannapi into the iobroker object tree
 * 
 * 1.) Analyze the JSON and extract all devices, channels, commands and datapoints into arrays
 * 2,) Create all of these elements
 * 
 * 
 * @todo Commands mit 2 Params: heating.circuits.0.heating.curve. Wird hier Param richtig angegeben?
 * @todo Paramter der extractKeys funktionen anpassen
*/

//Global Arrays to store analysis result
const deviceNames = [];
const channelNames = [];
const commandNames = [];
const datapointNames = [];


/*********************************************************************************************
 * 
 * Runs trough the element
 * Does first an analysis what element is what (datapoint, command, channel, device)
 * Uses the global arrays to store this info. 
 * 
 * Then creates those elements in the iobroker object tree.
 * 
 */
async function extractKeys_features(adapter, path, element, preferedArrayName, forceIndex, write, channelName) {
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
            addChannel(adapter, channel);
        }

        //Create Devices 
        adapter.log.debug("Creating Devices")
        for (const device of deviceNames) {
            addDevice(adapter, device);
        }

        //Create Commands 
        adapter.log.debug("Creating Commands")
        for (const command of commandNames) {
            addCommand(adapter,command.name, command.uri, command.params);
        }
        
        //Create Datapoints 
        adapter.log.debug("Creating Datapoints")
        //Search fist if the datapoints name was already added as a channel -> then rename
        for (const datapoint of datapointNames) {
            let name = ""

            if(channelNames.indexOf(datapoint.name) === -1) {
                name = datapoint.name;
            }
            else{
                //adapter.log.error("Found doublette: " + datapoint.name)
                name = datapoint.name + ".value";
            }

            addDataPoint(adapter, name, datapoint.prop, datapoint.feature, datapoint.uri);
        }
    } catch (error) {
        adapter.log.error("Error extract keys: " + path + " " + JSON.stringify(element));
        adapter.log.error(error);
    }

}// async function extractKeys(...) 




/*********************************************************************************************
 * Anaylses a Datapoint
 * 
*/
async function AnalyzeDatapoint(adapter,dataPoint)
{
    try{
        if(Object.keys(dataPoint.properties).length > 0) {//Nur anlegen wenn ein value vorhanden ist
            
            let name = dataPoint.feature;
            //adapter.log.debug("Analyzing: " + name)

            /*if(name.indexOf("charging")!=-1)  //For setting breakpoints
            {
                adapter.log.debug("Charging found")
            }*/

            keys = Object.keys(dataPoint.properties)

            for(const key in keys){
                //adapter.log.debug(key+": "+ dataPoint.properties[key])
                prop = dataPoint.properties[keys[key]]

                //Okay, we have a datapoint. Lets add it. 
                let dp = {
                    "name": name+ "."+ keys[key],
                    "uri": dataPoint.uri,
                    "prop": prop,
                    "feature": dataPoint.feature
                }

                if(keys.length==1) dp.name = name; //if there is only one param; skip one level 

                if(datapointNames.indexOf(dp) === -1)  datapointNames.push(dp);  
            }


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




/*********************************************************************************************
 * Adds an Datapoint and the value to the object tree
 */
async function addDataPoint(adapter, name, prop,  feature, uri) {
    try{

        //adapter.log.debug("Adding Datapoint: "+ name);

        var value = "";
        var typ = "mixed";
        var unit = "";

        if(prop != undefined)
        {
            if(prop.value != undefined) {
                if(typeof prop.value === 'object')
                {
                    //adapter.log.debug("Found object with JSON value")
                    value = JSON.stringify(prop.value)
                    typ = "json"
                }
                else {
                    value = prop.value;
                    if(prop.unit != undefined) unit = prop.unit;
                    if(prop.type != undefined) typ = prop.type;
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
                    unit: getUnit(unit)
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

}//async function addDataPoint(...) {


/*********************************************************************************************
 * Adds an Command
 */
async function addCommand(adapter, cmd_name, cmd_uri, cmd_params) {

    /*
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
    adapter.setState(cmd_name + ".uri", cmd_uri, true);*/


    //Create the options for 'setValue'
    //const setStatePath = cmd_name + ".setValue";
    const common = {
        name: "Einstellungen sind hier änderbar / You can change the settings here",
        role: "value",
        type: "string",
        write: true,
        read: true,
        param: "",
        uri: cmd_uri,
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
        .setObjectNotExistsAsync(cmd_name, {
            type: "state",
            common: common,
            native: {},
        })
        .catch((error) => {
            adapter.log.error(error);
        });
    
}//async function addCommand(...) {


/*********************************************************************************************
 * Adds an Device
 */
async function addDevice(adapter, device) {
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
 

/*********************************************************************************************
 * Adds an Channel
 */
async function addChannel(adapter, channel) {
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
    

/*********************************************************************************************
 *  Verwandelt den Viessmann 'unit' String 
 *  in was wir wollen
 * Beispiel: Aujs 'celsius' wird "°C"
 */
function getUnit(unit){
    if(unit == "celsius") return "°C"
    else return unit

}


/*********************************************************************************************
 * Returns the Device Name
 * First Name before a . 
 */
function getDeviceName(name){
    let n= name.split("."); //'Adresse' aufteilen nach Punkten
    return n[0]
}//function getDeviceName(name){

/*********************************************************************************************
 * Returns alle Channel Names
 * First Name before a . is Device -> Ignore
 * Last Name is the Datapoint
 * Returns an array with all channel names (combinations) in between
 */
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
}//function getDeviceName(name){



module.exports = {
    extractKeys_features,
};
