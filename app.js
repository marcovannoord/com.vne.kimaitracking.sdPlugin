//@js-nocheck
/* global $CC, Utils, $SD */

/**
 * Here are a couple of wrappers we created to help you quickly setup
 * your plugin and subscribe to events sent by Stream Deck to your plugin.
 */

/**
 * The 'connected' event is sent to your plugin, after the plugin's instance
 * is registered with Stream Deck software. It carries the current websocket
 * and other information about the current environmet in a JSON object
 * You can use it to subscribe to events you want to use in your plugin.
 */

$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    // Subscribe to the willAppear and other events
    console.log(`[connected] ${JSON.stringify(jsn)}`);

    $SD.on('com.vne.kimaitracking.action.willAppear', (jsonObj) => action.onWillAppear(jsonObj));
    $SD.on('com.vne.kimaitracking.action.keyUp', (jsonObj) => action.onKeyUp(jsonObj));
    $SD.on('com.vne.kimaitracking.action.keyDown', (jsonObj) => action.onKeyDown(jsonObj));
    $SD.on('com.vne.kimaitracking.action.sendToPlugin', (jsonObj) => action.onSendToPlugin(jsonObj));
    $SD.on('com.vne.kimaitracking.action.didReceiveSettings', (jsonObj) => action.onDidReceiveSettings(jsonObj));
    $SD.on('com.vne.kimaitracking.action.propertyInspectorDidAppear', (_jsonObj) => {
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });
    $SD.on('com.vne.kimaitracking.action.propertyInspectorDidDisappear', (_jsonObj) => {
        console.log('%c%s', 'color: white; background: red; font-size: 13px;', '[app.js]propertyInspectorDidDisappear:');
    });
};

// ACTIONS

const action = {
    settings: {},
    lastPressed: 0,
    onDidReceiveSettings: function (jsn) {
        console.log('%c%s', 'color: white; background: red; font-size: 15px;', '[app.js]onDidReceiveSettings:');

        this.settings = Utils.getProp(jsn, 'payload.settings', {});
        this.doSomeThing(this.settings, 'onDidReceiveSettings', 'orange');

        /**
         * In this example we put a HTML-input element with id='mynameinput'
         * into the Property Inspector's DOM. If you enter some data into that
         * input-field it get's saved to Stream Deck persistently and the plugin
         * will receive the updated 'didReceiveSettings' event.
         * Here we look for this setting and use it to change the title of
         * the key.
         */

        this.setTitle(jsn);
    },

    /** 
     * The 'willAppear' event is the first event a key will receive, right before it gets
     * shown on your Stream Deck and/or in Stream Deck software.
     * This event is a good place to setup your plugin and look at current settings (if any),
     * which are embedded in the events payload.
     */

    onWillAppear: function (jsn) {
        console.log("You can cache your settings in 'onWillAppear'", jsn.payload.settings);
        /**
         * The willAppear event carries your saved settings (if any). You can use these settings
         * to setup your plugin or save the settings for later use. 
         * If you want to request settings at a later time, you can do so using the
         * 'getSettings' event, which will tell Stream Deck to send your data 
         * (in the 'didReceiveSettings above)
         * 
         * $SD.api.getSettings(jsn.context);
        */
        this.settings = jsn.payload.settings;
        // // Make sure we periodically get the latest data
        setInterval(this.intervalNow,30000, jsn);
        // Nothing in the settings pre-fill, just something for demonstration purposes
        if (!this.settings || Object.keys(this.settings).length === 0) {
            this.settings.mynameinput = 'TEMPLATE';
        }
        this.setTitle(jsn);
    },

    onKeyDown: function (_jsn) {
        this.lastPressed = Date.now();
    },

    onKeyUp: function (jsonObj) {
        console.log(`[onKeyUp] ${JSON.stringify(jsonObj)}`);
        let timeDiff = Date.now() - this.lastPressed
        // Check if it was a long-press, which is >500ms
        if (timeDiff > 500) {
            console.log(`[LongPress] ${Date.now()} last: ${this.lastPressed} diff: ${timeDiff}`);
            // Check for valid settings
            if (!jsonObj.payload.settings || !jsonObj.payload.settings.myurl || !jsonObj.payload.settings.myapikey) {
                $SD.api.showAlert(jsonObj.context);
                return;
            }
            // Check if we are currently tracking anything
            fetch(jsonObj.payload.settings.myurl + "/core/json.php", {
                "method": "POST",
                "headers": {
                    "content-type": "application/json"
                },
                "body": JSON.stringify({
                    "method": "getActiveRecording",
                    "params": [
                        jsonObj.payload.settings.myapikey
                    ],
                    "id": "1",
                    "jsonrpc": "2.0"
                })
            }).then(result => {
                // Got a successfull API call
                if (result.status == 200) {
                    result.json().then(bodydata => {
                        // console.log(`[response] ${JSON.stringify(bodydata)}`);
                        if (bodydata.result.error && bodydata.result.error.msg == "No active recording.") {
                            console.log(`[response] no active recording, start recording`);
                            fetch(jsonObj.payload.settings.myurl + "/core/json.php", {
                                "method": "POST",
                                "headers": {
                                    "content-type": "application/json"
                                },
                                "body": JSON.stringify({
                                    "method": "startRecord",
                                    "params": [
                                        jsonObj.payload.settings.myapikey
                                    ],
                                    "id": "1",
                                    "jsonrpc": "2.0"
                                })
                            }).then(_result => {
                                this.updateIconFromAPI(jsonObj);
                            })

                        } else if (bodydata.result.success == true) { // Currently running, so stop recording
                            console.log(`[running] ${JSON.stringify(bodydata)}`);
                            fetch(jsonObj.payload.settings.myurl + "/core/json.php", {
                                "method": "POST",
                                "headers": {
                                    "content-type": "application/json"
                                },
                                "body": JSON.stringify({
                                    "method": "stopRecord",
                                    "params": [
                                        jsonObj.payload.settings.myapikey
                                    ],
                                    "id": "1",
                                    "jsonrpc": "2.0"
                                })
                            }).then(_result => {
                                this.updateIconFromAPI(jsonObj);
                            })
                        }
                    })

                } else {
                    $SD.api.showAlert(jsonObj.context)
                }

            }, _error => {
                $SD.api.showAlert(jsonObj.context)
            }
            );
        } else { // short press
            this.updateIconFromAPI(jsonObj);
        }
    },
    // onKeyUp: function (jsn) {
    //     this.doSomeThing(jsn, 'onKeyUp', 'green');
    // },

    onSendToPlugin: function (jsn) {
        /**
         * This is a message sent directly from the Property Inspector 
         * (e.g. some value, which is not saved to settings) 
         * You can send this event from Property Inspector (see there for an example)
         */

        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            this.doSomeThing({ [sdpi_collection.key]: sdpi_collection.value }, 'onSendToPlugin', 'fuchsia');
        }
    },

    /**
     * This snippet shows how you could save settings persistantly to Stream Deck software.
     * It is not used in this example plugin.
     */

    saveSettings: function (jsn, sdpi_collection) {
        console.log('saveSettings:', jsn);
        if (sdpi_collection.hasOwnProperty('key') && sdpi_collection.key != '') {
            if (sdpi_collection.value && sdpi_collection.value !== undefined) {
                this.settings[sdpi_collection.key] = sdpi_collection.value;
                console.log('setSettings....', this.settings);
                $SD.api.setSettings(jsn.context, this.settings);
            }
        }
    },

    /**
     * Here's a quick demo-wrapper to show how you could change a key's title based on what you
     * stored in settings.
     * If you enter something into Property Inspector's name field (in this demo),
     * it will get the title of your key.
     * 
     * @param {JSON} jsn // The JSON object passed from Stream Deck to the plugin, which contains the plugin's context
     * 
     */

    setTitle: function (jsn) {
        if (this.settings && this.settings.hasOwnProperty('mynameinput')) {
            console.log("watch the key on your StreamDeck - it got a new title...", this.settings.mynameinput);
            $SD.api.setTitle(jsn.context, this.settings.mynameinput);
        }
    },

    /**
     * Finally here's a method which gets called from various events above.
     * This is just an idea on how you can act on receiving some interesting message
     * from Stream Deck.
     */

    doSomeThing: function (_inJsonData, caller, tagColor) {
        console.log('%c%s', `color: white; background: ${tagColor || 'grey'}; font-size: 15px;`, `[app.js]doSomeThing from: ${caller}`);
        // console.log(inJsonData);
    },
    padZeroes: function (num) {
        num = num.toString();
        while (num.length < 2) num = "0" + num
        return num
    },
    intervalNow: function(jsn){
        // console.log(`[interval] ${JSON.stringify(jsn)}`);
        action.updateIconFromAPI(jsn)
    },
    updateIconFromAPI: function (jsonObj) {
        if (!jsonObj.payload.settings || !jsonObj.payload.settings.myurl || !jsonObj.payload.settings.myapikey) {
            $SD.api.showAlert(jsonObj.context);
            return;
        }
        fetch(jsonObj.payload.settings.myurl + "/core/json.php", {
            "method": "POST",
            "headers": {
                "content-type": "application/json"
            },
            "body": JSON.stringify({
                "method": "getActiveRecording",
                "params": [
                    jsonObj.payload.settings.myapikey
                ],
                "id": "1",
                "jsonrpc": "2.0"
            })
        }).then(result => {
            // Got a successfull API call
            if (result.status == 200) {
                result.json().then(bodydata => {
                    // console.log(`[response] ${JSON.stringify(bodydata)}`);
                    if (bodydata.result.error && bodydata.result.error.msg == "No active recording.") {
                        console.log(`[response] no active recording`);
                        $SD.api.setImage(jsonObj.context, "data:image/png;base64,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")
                        $SD.api.setTitle("Stopped")// Set the title
                        // $SD.api.setState(jsonObj.context, 2)
                    } else if (bodydata.result.success == true) {
                        console.log(`[running] ${JSON.stringify(bodydata)}`);
                        console.log("Cst: " + bodydata.result.items[0].customerName + " project: " + bodydata.result.items[0].projectName + " activity: " + bodydata.result.items[0].activityName);
                        // Base64 encoded image of the kimai red running logo
                        $SD.api.setImage(jsonObj.context, "data:image/png;base64,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")
                        let elapsedTimeseconds = (bodydata.result.items[0].servertime - Number(bodydata.result.items[0].start));
                        // Print the currently running task, and the elapsed time
                        $SD.api.setTitle(jsonObj.context, bodydata.result.items[0].customerName + "\n" + bodydata.result.items[0].projectName + "\n" + bodydata.result.items[0].activityName + "\n" + this.padZeroes(Math.floor(elapsedTimeseconds / 3600)) + ":" + this.padZeroes(Math.floor((elapsedTimeseconds / 60)%60)) + ":" + this.padZeroes(elapsedTimeseconds % 60))// Set the title


                        // TODO: show stop icon
                    }
                })

            } else {
                $SD.api.showAlert(jsonObj.context)
            }

        }, _error => {
            $SD.api.showAlert(jsonObj.context)
        }
        );

    },


};

