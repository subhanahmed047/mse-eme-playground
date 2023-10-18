// DRM License Request Process

// 1. Set global variables
// Configure global variables such as keySystem, license server URL, custom data, and DRM configurations.

// 2. Fetch the DASH manifest
// Load the DASH manifest(mpd) file to extract content protection elements.

// 3. Parse manifest and get initData
// Parse the manifest to obtain the initialization data (initData) required for content decryption.
// The initData is either obtained from the media itself (e.g., part of the pssh atom within the init segment)
// or from the manifest if specified (cenc:pssh tag inside ContentProtection tag).

// 4. Set up the video element
// Prepare the HTML video element for playback.

// 5. Check if mediaKeys need to be set
// Determine if mediaKeys for the keySystem need to be set on the video element.

// 6. Request MediaKeySystemAccess
// Use navigator.requestMediaKeySystemAccess to check what Key Systems are available and select an appropriate one.
// Create a MediaKeys object for the selected Key System via a MediaKeySystemAccess object.

// 7. Create MediaKeySession
// Create a MediaKeySession using mediaKeys.createSession(). This represents the lifetime of a license and its key(s).

// 8. Generate license request
// Generate a license request by calling generateRequest() on the MediaKeySession.
// The generated license request will be used to obtain the decryption keys from the license server.

// 9. Send license request
// Send the generated license request to the DRM license server using an XMLHttpRequest (XHR).
// Attach necessary headers such as Content-Type and custom data required by the license server.

// 10. Handle license server response
// When the license server responds, process the license data received.
// Decode the base64-encoded license response, and update the MediaKeySession with the license data.

// 11. Update MediaKeySession
// Update the MediaKeySession with the license response data using keySession.update().
// This step completes the process of acquiring the decryption keys for playing encrypted content.

// 12. Play encrypted content
// With the MediaKeySession updated with the license, the encrypted content can be played using the MediaSource API.


// Override console methods to display logs on the screen
(function () {
    function appendLog(message, type) {
        var logContainer = document.getElementById('logs');
        if (logContainer) {
            var logElement = document.createElement('div');
            logElement.classList.add('log', type);
            logElement.textContent = message;
            logContainer.appendChild(logElement);
        }
    }

    var originalLog = console.log;
    console.log = function () {
        var message = Array.from(arguments).map(function (arg) {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return arg;
        }).join(' ');

        originalLog.apply(console, arguments);
        appendLog(message, 'log');
    };

    var originalWarn = console.warn;
    console.warn = function () {
        var message = Array.from(arguments).map(function (arg) {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return arg;
        }).join(' ');

        originalWarn.apply(console, arguments);
        appendLog(message, 'warn');
    };

    var originalInfo = console.info;
    console.info = function () {
        var message = Array.from(arguments).map(function (arg) {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return arg;
        }).join(' ');

        originalInfo.apply(console, arguments);
        appendLog(message, 'info');
    };

    var originalError = console.error;
    console.error = function () {
        var message = Array.from(arguments).map(function (arg) {
            if (typeof arg === 'object') {
                return JSON.stringify(arg, null, 2);
            }
            return arg;
        }).join(' ');

        originalError.apply(console, arguments);
        appendLog(message, 'error');
    };
})();

var keySystem = 'com.widevine.alpha';
var licenseUri = '';
var customData = '';
var initData = '';
var config = [{
    initDataTypes: ['cenc'],
    sessionTypes: ['temporary'],
    audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }],
    videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }]
}];

// Fetch the DASH manifest
function fetchManifest(manifestUri) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', manifestUri, true);
        xhr.responseType = 'text';

        xhr.onload = function () {
            if (xhr.status === 200) {
                resolve(xhr.response);
            } else {
                reject('Error fetching manifest: ' + xhr.statusText);
            }
        };

        xhr.send();
    });
}

// Convert a given base64 string to an ArrayBuffer
function base64ToArrayBuffer(base64) {
    var binaryString = atob(base64);
    var len = binaryString.length;
    var bytes = new Uint8Array(len);

    for (var i = 0; i < len; ++i) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
}

// Parse manifest and get initData
function parseManifestAndGetInitData(manifest, keySystem) {
    return new Promise(function (resolve, reject) {
        try {
            var base64InitData = null;
            var regex;

            if (keySystem === 'com.widevine.alpha') {
                regex = /<cenc:pssh>(.*?)<\/cenc:pssh>/g;
            } else if (keySystem === 'com.microsoft.playready') {
                regex = /<mspr:pro>(.*?)<\/mspr:pro>/g;
            }

            var matches = manifest.match(regex);

            if (matches.length === 0) {
                reject('No valid initData found for key system ' + keySystem + ' in the manifest.');
                return;
            }

            // Extract the value from the first match
            base64InitData = matches[0].replace(regex, '$1');
            resolve(base64ToArrayBuffer(base64InitData));
        } catch (error) {
            reject(error);
        };
    });
}

// Send license request
function sendLicenseRequest(event) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', licenseUri, true);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.setRequestHeader('dt-custom-data', customData);
    console.log('Sending the License Request...', licenseUri);

    xhr.onload = function () {
        if (xhr.status === 200) {
            var keySession = event.target;
            console.log('License Request Successful:', { response: xhr.response });
            // decode the license information from the response and convert it to an ArrayBuffer
            var licenseResponseArrayBuffer = base64ToArrayBuffer(xhr.response.license); // decode the base64 license data
            // update the MediaKeySession with the licence information
            keySession.update(licenseResponseArrayBuffer).then(function () {
                console.log('Key Session - license update successful');
            }).catch(function (error) {
                console.error('Key Session - Failed to update the license', error);
            });
        } else if (xhr.status === 403) {
            console.error('Error Fetching license - Your custom data has expired');
        } else {
            console.error('Error fetching license:', xhr.statusText);
        }
    };

    // The event parameter contains the license request message in event.message
    var licenseRequest = event.message;
    xhr.send(licenseRequest);
}

function load() {
    // on some platfroms such as LG 2017, the `generateKeykeyRequest` is broken, in that case simply delete it and let shaka polyfill it
    //delete HTMLMediaElement.prototype.webkitGenerateKeyRequest
    //delete HTMLMediaElement.prototype.generateKeyRequest
    console.info('Installing Shaka Polyfills...');
    shaka.polyfill.installAll();
    // Fetch the DASH manifest
    console.info('Fetching the manifest...', manifestUri);
    fetchManifest(manifestUri).then(function (manifest) {
        // Parse the manifest to get initData
        console.info('Parsing the manifest...');
        parseManifestAndGetInitData(manifest, keySystem).then(function (initData) {
            console.log('Got initData from the manifest');
            if (!initData) {
                // iniData might not always be present on a manifest, 
                // sometimes you have to wait for the encryted event to trigger
                // as the pssh atom in the init segment has the initData
                // but that part is out of the scope for this demo
                console.error('No valid initData found in the manifest.');
                return;
            }
            // Get the video element
            var videoElement = document.getElementById('videoElement');

            // Check if mediaKeys need to be set
            if (!videoElement.mediaKeys) {

                if (!navigator.requestMediaKeySystemAccess) {
                    return Promise.reject('EME API is unavailable');
                }

                // Set video source to the manifest
                videoElement.src = manifestUri;

                // Request MediaKeySystemAccess
                console.info('Checking for ' + keySystem + ' support...');
                return navigator.requestMediaKeySystemAccess(keySystem, config).then(
                    function (mediaKeySystemAccess) {
                        console.log(keySystem + ' is supported');
                        // Create MediaKeys
                        console.info('Creating MediaKeys...');
                        mediaKeySystemAccess.createMediaKeys().then(function (mediaKeys) {
                            console.log('MediaKeys successfully created');
                            // Set MediaKeys for video element
                            videoElement.setMediaKeys(mediaKeys);

                            // Create MediaKeySession
                            console.info('Creating a Session...');
                            var keySession = mediaKeys.createSession();
                            // note the sessionId will be empty at this point as it is only populated when there is a successful handshake between the cdm and the userAgent
                            // this handshake is successful if your generateRequest function is resolved
                            console.log('Key Session successfully created', keySession);

                            videoElement.addEventListener('dispose', function () {
                                console.log('Disposing the video object');
                                keySession.close().then(function (reason) {
                                    console.log('Session closed', reason);
                                });
                            });

                            // Check if the session is closed
                            keySession.closed.then(function (reason) {
                                console.log('Session is closed because', reason);
                                // Do not generate request on a closed session
                            });

                            // Listen for any error with the session
                            keySession.addEventListener('error', function (event) {
                                console.error('There is an error with the session', event.error);
                                // Do not generate request on an error session
                            });


                            // Generate license request
                            console.info('Generating License Request...');
                            keySession.generateRequest('cenc', initData).then(function (res) {
                                console.log('License request generated', res);
                            }).catch(function (error) {
                                console.error('Failed to generate the license request', error)
                            });

                            console.log('Waiting for the message event...');
                            // Listen for license request message
                            keySession.addEventListener('message', function (event) {
                                // Send the license request to the server
                                console.info('Message Received from the CDM, Fetching License Data...', event.message);
                                sendLicenseRequest(event, initData);
                            }, false);
                        }).catch(function (error) {
                            console.error('Unable to create MediaKeys', error);
                        });
                    }
                ).catch(function (error) {
                    console.error('Key Configuration is not supported', keySystem, config, error);
                });
            }
        }).catch(function (error) {
            console.error('Error:', error);
        });
    });
}

// Main function when the DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        load();
    }, 3000)
});
