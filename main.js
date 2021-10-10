"use strict";

/*
 * Created with @iobroker/create-adapter v1.34.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const rax = require("retry-axios");
const axios = require("axios");
const crypto = require("crypto");
const qs = require("qs");
const { extractKeys_features } = require("./lib/extractKeys_features");  //JF
const { extractKeys_events } = require("./lib/extractKeys_events");//JF
const { extractKeys_installation } = require("./lib/extractKeys_installation");//JF
const { extractKeys_gateway } = require("./lib/extractKeys_gateway");//JF
const { extractKeys_devices } = require("./lib/extractKeys_devices");//JF
class Viessmannapi extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: "viessmannapi_testbranch",//JF
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Reset the connection indicator during startup
        this.setState("info.connection", false, true);
        if (this.config.interval < 0.5) {
            this.log.info("Set interval to minimum 0.5");
            this.config.interval = 0.5;
        }
        if (this.config.eventInterval < 0.5) {
            this.log.info("Set interval to minimum 0.5");
            this.config.eventInterval = 0.5;
        }
        this.requestClient = axios.create();
        this.requestClient.defaults.raxConfig = {
            instance: this.requestClient,
            statusCodesToRetry: [[500, 599]],
            httpMethodsToRetry: ["POST"],
        };
        const interceptorId = rax.attach(this.requestClient);

        this.updateInterval = null;
        this.eventInterval = null;
        this.reLoginTimeout = null;
        this.refreshTokenTimeout = null;
        this.extractKeys_features = extractKeys_features;//JF
        this.extractKeys_events = extractKeys_events;//JF
        this.extractKeys_installation = extractKeys_installation;//JF
        this.extractKeys_gateway = extractKeys_gateway;//JF
        this.extractKeys_devices = extractKeys_devices;//JF
        this.idArray = [];
        this.session = {};
        this.rangeMapSupport = {};

        this.subscribeStates("*");


        //States für den Connection Counter anlegen //JF
        await this.setObjectNotExistsAsync("info.ConnectionCounter", {
            type: "state",
            common: {
                name: "ConnectionCounter",
                read: true,
                write: false,
                type: "number",
            },
            native: {},
        });
        this.setState("info.ConnectionCounter", 0,true);


        await this.setObjectNotExistsAsync("info.LastResetDate", {
            type: "state",
            common: {
                name: "LastResetDate",
                read: true,
                write: false,
                type: "string",
            },
            native: {},
        });

    

        await this.login();
        if (this.session.access_token) {
            await this.getDeviceIds();
            await this.updateDevices(true);
            await this.getEvents();
            this.updateInterval = setInterval(async () => {
                await this.updateDevices();
            }, this.config.interval * 60 * 1000);

            this.eventInterval = setInterval(async () => {
                await this.getEvents();
            }, this.config.eventInterval * 60 * 1000);

            this.refreshTokenInterval = setInterval(() => {
                this.refreshToken();
            }, (this.session.expires_in - 100) * 1000);
        }
    }
    async login() {
        const [code_verifier, codeChallenge] = this.getCodeChallenge();
        const headers = {
            Accept: "*/*",
            "User-Agent": "ioBroker 2.0.3",
        };
        let data = {
            client_id: this.config.client_id,
            response_type: "code",
            scope: "IoT User offline_access",
            code_challenge_method: "S256",
            code_challenge: codeChallenge,
            redirect_uri: "http://localhost:4200/",
        };

        const htmlLoginForm = await this.requestClient({
            method: "get",
            url: "https://iam.viessmann.com/idp/v2/authorize",
            headers: headers,
            params: data,
        })
            .then((res) => {
                this.log.debug(JSON.stringify(res.data));
                this.incrementConnectionCounter();//JF
                return res.data;
            })
            .catch((error) => {
                this.log.error(error);
                if (error.response) {
                    this.log.error(JSON.stringify(error.response.data));
                }
            });
        if (!htmlLoginForm) {
            return;
        }
        let url = htmlLoginForm.split('action="')[1].split('" auto')[0];
        url = url.replace(/&amp;/g, "&");
        data = {
            isiwebuserid: this.config.username,
            "hidden-password": "00",
            isiwebpasswd: this.config.password,
            stayloggedin: "Stay+logged+on",
            submit: "LOGIN",
        };
        const code = await this.requestClient({
            method: "post",
            url: url,
            headers: headers,
            data: qs.stringify(data),
        })
            .then((res) => {
                this.log.debug(JSON.stringify(res.data));
                this.incrementConnectionCounter();//JF
                this.log.error("Please check username/password and deactivated Google Captcha in the Viessmann Settings");
                return res.data;
            })
            .catch((error) => {
                let code = "";
                if (error.response && error.response.status === 400) {
                    this.log.error(JSON.stringify(error.response.data));
                    return;
                }
                if (error.response && error.response.status === 500) {
                    this.log.info("Please check username and password.");
                }
                if (error.request) {
                    this.log.debug(JSON.stringify(error.request._currentUrl));
                    code = qs.parse(error.request._currentUrl.split("?")[1]).code;
                    this.log.debug(code);
                    return code;
                }
            });
        data = {
            grant_type: "authorization_code",
            code: code,
            client_id: this.config.client_id,
            code_verifier: code_verifier,
            redirect_uri: "http://localhost:4200/",
        };

        await this.requestClient({
            method: "post",
            url: "https://iam.viessmann.com/idp/v2/token",
            headers: headers,
            data: qs.stringify(data),
        })
            .then((res) => {
                this.log.debug(JSON.stringify(res.data));
                this.incrementConnectionCounter();//JF
                this.session = res.data;
                this.setState("info.connection", true, true);
                return res.data;
            })
            .catch((error) => {
                this.setState("info.connection", false, true);
                this.log.error(error);
                if (error.response && error.response.status === 429) {
                    this.log.info("Rate limit reached. Will be reseted next day 02:00");
                }
                if (error.response) {
                    this.log.error(JSON.stringify(error.response.data));
                }
            });
    }
    async getDeviceIds() {
        const headers = {
            "Content-Type": "application/json",
            Accept: "*/*",
            "User-Agent": "ioBroker 2.0.3",
            Authorization: "Bearer " + this.session.access_token,
        };

        this.installationId = await this.requestClient({
            method: "get",
            url: "https://api.viessmann.com/iot/v1/equipment/installations",
            headers: headers,
        })
            .then(async (res) => {
                this.log.debug(JSON.stringify(res.data));
                this.incrementConnectionCounter();//JF
                if (res.data.data && res.data.data.length > 0) {
                    const installation = res.data.data[0];
                    const installationId = installation.id.toString();
                    this.extractKeys_installation(this, installationId, installation);//JF
                    return installationId;
                }
            })
            .catch((error) => {
                this.log.error(error);
                if (error.response && error.response.status === 429) {
                    this.log.info("Rate limit reached. Will be reseted next day 02:00");
                }
                error.response && this.log.error(JSON.stringify(error.response.data));
            });

        this.gatewaySerial = await this.requestClient({
            method: "get",
            url: "https://api.viessmann.com/iot/v1/equipment/gateways",
            headers: headers,
        })
            .then(async (res) => {
                this.log.debug(JSON.stringify(res.data));
                this.incrementConnectionCounter();//JF
                if (res.data.data && res.data.data.length > 0) {
                    const gateway = res.data.data[0];
                    const gatewayId = gateway.serial.toString();
                    this.extractKeys_gateway(this,  gateway);//JF
                    return gatewayId;
                }
            })
            .catch((error) => {
                this.log.error(error);
                if (error.response && error.response.status === 429) {
                    this.log.info("Rate limit reached. Will be reseted next day 02:00");
                }
                error.response && this.log.error(JSON.stringify(error.response.data));
            });

        await this.requestClient({
            method: "get",
            url: "https://api.viessmann.com/iot/v1/equipment/installations/" + this.installationId + "/gateways/" + this.gatewaySerial + "/devices",
            headers: headers,
        })
            .then(async (res) => {
                this.log.debug(JSON.stringify(res.data));
                this.incrementConnectionCounter(); //JF
                for (const device of res.data.data) {
                    this.idArray.push({ id: device.id, type: device.roles[0] });//JF




                    this.extractKeys_devices(this, device.id , device);//JF
                }
            })
            .catch((error) => {
                this.log.error(error);
            });
    }
    async updateDevices(ignoreFilter) {
        const statusArray = [
            {
                path: "features",
                url: "https://api.viessmann.com/iot/v1/equipment/installations/" + this.installationId + "/gateways/" + this.gatewaySerial + "/devices/$id/features",
                desc: "Features and States of the device",
            },
        ];

        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "User-Agent": "ioBroker 2.0.3",
            Authorization: "Bearer " + this.session.access_token,
        };
        this.idArray.forEach((device) => {
            statusArray.forEach(async (element) => {
                const url = element.url.replace("$id", device.id);
		//JF
                if (!ignoreFilter && (device.type === "type:gateway" || device.type === "type:virtual")) {
                    this.log.debug("ignore " + device.type);
                    return;
                }
                await this.requestClient({
                    method: "get",
                    url: url,
                    headers: headers,
                })
                    .then((res) => {
			 this.log.debug(url + " " + device.id + " " + JSON.stringify(res.data));
                        this.incrementConnectionCounter(); //JF
                        if (!res.data) {
                            return;
                        }

			 //JF
                        let extractPath = this.installationId + "." + device.id + "." + element.path;
                        let forceIndex = null;
                        this.extractKeys_features(this, extractPath, res.data, "feature", forceIndex, false, element.desc);
                    })
                    .catch((error) => {
                        if (error.response && error.response.status === 401) {
                            error.response && this.log.debug(JSON.stringify(error.response.data));
                            this.log.info(element.path + " receive 401 error. Refresh Token in 30 seconds");
                            clearTimeout(this.refreshTokenTimeout);
                            this.refreshTokenTimeout = setTimeout(() => {
                                this.refreshToken();
                            }, 1000 * 30);

                            return;
                        }
                        if (error.response && error.response.status === 429) {
                            this.log.info("Rate limit reached. Will be reseted next day 02:00");
                        }
                        if (error.response && error.response.status === 502) {
                            this.log.info(JSON.stringify(error.response.data));
                            this.log.info("Please check the connection of your gateway");
                        }
                        if (error.response && error.response.status === 504) {
                            this.log.info("Viessmann API is not available please try again later");
                        }
                        this.log.error(element.url);
                        this.log.error(error);
                        error.response && this.log.debug(JSON.stringify(error.response.data));
                    });
            });
        });
    }
    async getEvents() {
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "User-Agent": "ioBroker 2.0.3",
            Authorization: "Bearer " + this.session.access_token,
        };

        await this.requestClient({
            method: "get",
            url: "https://api.viessmann.com/iot/v1/events-history/events?gatewaySerial=" + this.gatewaySerial + "&installationId=" + this.installationId,
            headers: headers,
        })
            .then((res) => {
                this.log.debug(JSON.stringify(res.data));
                this.incrementConnectionCounter(); //JF
                if (!res.data) {
                    return;
                }
                let data = res.data;
                const keys = Object.keys(res.data);
                if (keys.length === 1) {
                    data = res.data[keys[0]];
                }
                if (data.length === 1) {
                    data = data[0];
                }

                this.extractKeys_events(this, this.installationId + ".events", res.data, null, true);//JF
            })
            .catch((error) => {
                if (error.response && error.response.status === 401) {
                    error.response && this.log.debug(JSON.stringify(error.response.data));

                    this.log.info("Get Events receive 401 error. Refresh Token in 30 seconds");
                    clearTimeout(this.refreshTokenTimeout);
                    this.refreshTokenTimeout = setTimeout(() => {
                        this.refreshToken();
                    }, 1000 * 30);

                    return;
                }
                if (error.response && error.response.status === 429) {
                    this.log.info("Rate limit reached. Will be reseted next day 02:00");
                }
                if (error.response && error.response.status === 502) {
                    this.log.info(JSON.stringify(error.response.data));
                    this.log.info("Please check the connection of your gateway");
                }
                if (error.response && error.response.status === 504) {
                    this.log.info("Viessmann API is not available please try again later");
                }
                this.log.error("Receiving Events");
                this.log.error(error);
                error.response && this.log.debug(JSON.stringify(error.response.data));
            });
    }

    async refreshToken() {
        await this.requestClient({
            method: "post",
            url: "https://iam.viessmann.com/idp/v2/token",
            headers: {
                "User-Agent": "ioBroker 2.0.3",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data: "grant_type=refresh_token&client_id=" + this.config.client_id + "&refresh_token=" + this.session.refresh_token,
        })
            .then((res) => {
                this.log.debug(JSON.stringify(res.data));
                this.incrementConnectionCounter(); //JF
                this.session = res.data;
                this.setState("info.connection", true, true);
                return res.data;
            })
            .catch((error) => {
                this.setState("info.connection", false, true);
                this.log.error("refresh token failed");
                this.log.error(error);
                error.response && this.log.error(JSON.stringify(error.response.data));
                this.log.error("Start relogin in 1min");
                this.reLoginTimeout = setTimeout(() => {
                    this.login();
                }, 1000 * 60 * 1);
            });
    }
    getCodeChallenge() {
        let hash = "";
        let result = "";
        const chars = "0123456789abcdef";
        result = "";
        for (let i = 64; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        hash = crypto.createHash("sha256").update(result).digest("base64");
        hash = hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

        return [result, hash];
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.setState("info.connection", false, true);
            clearTimeout(this.refreshTimeout);
            clearTimeout(this.reLoginTimeout);
            clearTimeout(this.refreshTokenTimeout);
            clearInterval(this.updateInterval);
            clearInterval(this.eventInterval);
            clearInterval(this.refreshTokenInterval);
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Increments the connection counter //JF
     */
    async incrementConnectionCounter()
    {
        this.log.info("IncrementingConnectionCounter");
        
        //Zähler inkrementieren
        const n = await this.getStateAsync("info.ConnectionCounter");
        this.setState("info.ConnectionCounter", n.val+1,true);

        //Checken ob wir den Zähler auf 0 setzen müssen
        var now = new Date();
        //TODO: Korrektur um 2h da nicht um 0 Uhr zurück gesetzt wird
        var date = now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate();
        const lastResetDate = await this.getStateAsync("info.LastResetDate");

        if(lastResetDate.val!=date)
        {
            this.log.debug("Set ConnectionCounter to 0");
            this.setState("info.LastResetDate", date,true);
            this.setState("info.ConnectionCounter", 0,true);
        }
        

    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
        if (state) {
            if (!state.ack) {
                const deviceId = id.split(".")[2];
                const parentPath = id.split(".").slice(1, -1).slice(1).join(".");

                const uriState = await this.getStateAsync(parentPath + ".uri");
                const idState = await this.getObjectAsync(parentPath + ".setValue");

                const param = idState.common.param;

                if (!uriState || !uriState.val) {
                    this.log.info("No URI found");
                    return;
                }
                const data = {};
                if (param) {
                    data[param] = state.val;
                    if (!isNaN(state.val)) {
                        data[param] = Number(state.val);
                    }
                }
                const headers = {
                    "Content-Type": "application/json",
                    Accept: "*/*",
                    "User-Agent": "ioBroker 2.0.3",
                    Authorization: "Bearer " + this.session.access_token,
                };
                await this.requestClient({
                    method: "post",
                    url: uriState.val,
                    headers: headers,
                    data: data,
                    raxConfig: {
                        retry: 5,
                        noResponseRetries: 2,
                        retryDelay: 5000,
                        backoffType: "static",
                        statusCodesToRetry: [[500, 599]],
                        onRetryAttempt: (err) => {
                            const cfg = rax.getConfig(err);
                            if (err.response) {
                                this.log.error(JSON.stringify(err.response.data));
                            }
                            this.log.info(`Retry attempt #${cfg.currentRetryAttempt}`);
                        },
                    },
                })
                    .then((res) => {
                        this.log.debug(JSON.stringify(res.data));
                        this.incrementConnectionCounter(); //JF
                        return res.data;
                    })
                    .catch((error) => {
                        this.log.error(error);
                        if (error.response) {
                            this.log.error(JSON.stringify(error.response.data));
                        }
                        this.log.error("URL: " + uriState.val);
                        this.log.error("Data: " + JSON.stringify(data));
                    });
                this.refreshTimeout = setTimeout(async () => {
                    await this.updateDevices();
                }, 10 * 1000);
            }
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Viessmannapi(options);
} else {
    // otherwise start the instance directly
    new Viessmannapi();
}
