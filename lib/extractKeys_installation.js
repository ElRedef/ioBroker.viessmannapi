/*********************************************************************************************
 * Extracts the installations.json of viessmannapi into the iobroker object tree
 * 
*/



/*********************************************************************************************
 * 
 * Extracts the installation details into the iobroker Object tree
 */
async function extractKeys_installation(adapter,  installationId, installation) {
    try {

        adapter.log.debug("ExtractKeys_Installation")
        path="info.installation"

        if (installation === null || installation === undefined) {
            adapter.log.debug("Cannot extract empty: " + installationId);
            return;
        }

        //adapter.log.debug(installationId)
        //adapter.log.debug(JSON.stringify(installation))

        addChannel(adapter, path)

        //Add all keys in the file
        keys = Object.keys(installation)
        for(const key in keys){
            //adapter.log.debug(keys[key]+": "+ installation[keys[key]])
            addDataPoint(adapter,path, keys[key],installation[keys[key]])
        }

    } catch (error) {
        adapter.log.error("Error analyzing installation: " + installationId + " " + JSON.stringify(installation));
        adapter.log.error(error);
    }

}//async function extractKeys_installation(...)




/*********************************************************************************************
 * Adds an Datapoint and the value to the object tree
 */
 async function addDataPoint(adapter, path, name, value) {
    try{
        var typ = "mixed";
        
        if(value == null) return; //skip empty ones

        if(typeof value === 'object')
        {
            //adapter.log.debug("Found object with JSON value")
            value = JSON.stringify(value)
            typ = "json"
        }
        else {
            typ = typeof value;
         }

        //adapter.log.debug("Adding Datapoint: "+ name+ "  Value: "+ value + " Typ: "+ typ);
    
        //create the object
        await adapter
            .setObjectNotExistsAsync(path+"." + name, {
                type: "state",
                common: {
                    name: name,
                    read: true,
                    write: false,
                    type: typ,
                },
                native: {},
            })
            .catch((error) => {
                adapter.log.error(error);
            });

        //set the value    
        adapter.setState(path+ "." + name, value, true);

    } 
    catch (error) {
        adapter.log.error("Cannot AddDatapoint:" + name);
        adapter.log.error(error);
    }

}//async function addDataPoint(...) {



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
 async function addChannel(adapter, channel,typ) {
    await adapter
        .setObjectNotExistsAsync(channel, {
            type: "channel",
            common: {
                name: typ || "",
                write: false,
                read: true,
            },
            native: {},
        })

        .catch((error) => {
            adapter.log.error(error);
        });
}



module.exports = {
    extractKeys_installation,
};