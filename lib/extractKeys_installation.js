/*********************************************************************************************
 * Extracts the installations.json of viessmannapi into the iobroker object tree
 * 
*/



/*********************************************************************************************
 * 
 * Extracts the events into the iobroker Object tree
 */
async function extractKeys_installation(adapter,  installationId, installation) {
    try {

        adapter.log.error("ExtractKeys_Installation")

        if (installation === null || installation === undefined) {
            adapter.log.debug("Cannot extract empty: " + installationId);
            return;
        }

        adapter.log.debug(installationId)
        adapter.log.debug(installation)

        //addDevice(adapter, "events")

        //Run trough all Events 
        /*for (const event of element.data) {
            //adapter.log.debug("Event:" + event.eventType)
            addEvent(adapter,event)
        }*/

    } catch (error) {
        adapter.log.error("Error analyzing installation: " + installationId + " " + JSON.stringify(installation));
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
    extractKeys_installation,
};