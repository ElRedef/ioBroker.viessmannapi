/*********************************************************************************************
 * Extracts the gateways.json of vissmannapi into the iobroker object tree
 * 
*/



/*********************************************************************************************
 * 
 * Extracts the events into the iobroker Object tree
 */
async function extractKeys_gateway(adapter,  gateway) {
    try {

        adapter.log.error("ExtractKeys_Gateway")

        if (gateway === null || gateway === undefined) {
            adapter.log.debug("Cannot extract empty: " + gateway);
            return;
        }

        //console.log.debug(installationId)
        //console.log.debug(installation)

        //addDevice(adapter, "events")

        //Run trough all Events 
        /*for (const event of element.data) {
            //adapter.log.debug("Event:" + event.eventType)
            addEvent(adapter,event)
        }*/

    } catch (error) {
        adapter.log.error("Error analyzing gateway: " + gateway + " " + JSON.stringify(element));
        adapter.log.error(error);
    }

}//async function extractKeys_events(...)





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
    extractKeys_gateway,
};