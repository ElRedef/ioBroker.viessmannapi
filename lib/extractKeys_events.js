/*********************************************************************************************
 * Extracts the events.json of vissmannapi into the iobroker object tree
 * 
*/



/*********************************************************************************************
 * 
 * Extracts the events into the iobroker Object tree
 */
async function extractKeys_events(adapter, path, element, preferedArrayName, forceIndex, write, channelName) {
    try {

        adapter.log.debug("ExtractKeys_Events")

        if (element === null || element === undefined) {
            adapter.log.debug("Cannot extract empty: " + path);
            return;
        }

        addDevice(adapter, "events")

        //Run trough all Events 
        for (const event of element.data) {
            //adapter.log.debug("Event:" + event.eventType)
            addEvent(adapter,event)
        }

    } catch (error) {
        adapter.log.error("Error analyzing element: " + path + " " + JSON.stringify(element));
        adapter.log.error(error);
    }

}//async function extractKeys_events(...)



/*********************************************************************************************
 * Adds an Event to the object tree
 */
async function addEvent(adapter, event) {
    try{

        let channelName = "events."+event.eventTimestamp.replace('.','_');
        //adapter.log.debug("Adding Event: "+ channelName);
        
        addChannel(adapter,channelName,event.eventType)

    
        //origin
        await adapter
            .setObjectNotExistsAsync(channelName+".origin", {
                type: "state",
                common: {
                    name: 'origin',
                    read: true,
                    write: false,
                    type: 'string',
                },
                native: {},
            })
            .catch((error) => {
                adapter.log.error(error);
            });
        //set the value    
        adapter.setState(channelName+".origin", event.origin, true);

        //type
        await adapter
        .setObjectNotExistsAsync(channelName+".type", {
            type: "state",
            common: {
                name: 'type',
                read: true,
                write: false,
                type: 'string',
            },
            native: {},
        })
        .catch((error) => {
            adapter.log.error(error);
        });
        //set the value    
        adapter.setState(channelName+".type", event.eventType, true);


   
        //body
        let keys = Object.keys(event.body)
        for(const key in keys){

            let name = channelName+"."+keys[key]

            await adapter
            .setObjectNotExistsAsync(name, {
                type: "state",
                common: {
                    name: keys[key],
                    read: true,
                    write: true,
                    type: 'json',
                },
                native: {},
            })
            .catch((error) => {
                adapter.log.error(error);
            });

            //set the value 
            let keyval = event.body[keys[key]];
            let val = JSON.stringify(keyval)
            adapter.setState(name, val, true);
        }//for(const key in keys){

    } 
    catch (error) {
        adapter.log.error("Cannot Add Event:" + event);
        adapter.log.error(error);
    }

}//async function addElement(...) {



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
    extractKeys_events,
};