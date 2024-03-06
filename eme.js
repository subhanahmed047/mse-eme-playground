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

var keySystem = 'com.widevine.alpha';
var licenseUri = 'https://drm-widevine-licensing.axtest.net/AcquireLicense';
var customData = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJ2ZXJzaW9uIjogMSwKICAiY29tX2tleV9pZCI6ICI2OWU1NDA4OC1lOWUwLTQ1MzAtOGMxYS0xZWI2ZGNkMGQxNGUiLAogICJtZXNzYWdlIjogewogICAgInR5cGUiOiAiZW50aXRsZW1lbnRfbWVzc2FnZSIsCiAgICAidmVyc2lvbiI6IDIsCiAgICAibGljZW5zZSI6IHsKICAgICAgImFsbG93X3BlcnNpc3RlbmNlIjogdHJ1ZQogICAgfSwKICAgICJjb250ZW50X2tleXNfc291cmNlIjogewogICAgICAiaW5saW5lIjogWwogICAgICAgIHsKICAgICAgICAgICJpZCI6ICI0MDYwYTg2NS04ODc4LTQyNjctOWNiZi05MWFlNWJhZTFlNzIiLAogICAgICAgICAgImVuY3J5cHRlZF9rZXkiOiAid3QzRW51dVI1UkFybjZBRGYxNkNCQT09IiwKICAgICAgICAgICJ1c2FnZV9wb2xpY3kiOiAiUG9saWN5IEEiCiAgICAgICAgfQogICAgICBdCiAgICB9LAogICAgImNvbnRlbnRfa2V5X3VzYWdlX3BvbGljaWVzIjogWwogICAgICB7CiAgICAgICAgIm5hbWUiOiAiUG9saWN5IEEiLAogICAgICAgICJwbGF5cmVhZHkiOiB7CiAgICAgICAgICAibWluX2RldmljZV9zZWN1cml0eV9sZXZlbCI6IDE1MCwKICAgICAgICAgICJwbGF5X2VuYWJsZXJzIjogWwogICAgICAgICAgICAiNzg2NjI3RDgtQzJBNi00NEJFLThGODgtMDhBRTI1NUIwMUE3IgogICAgICAgICAgXQogICAgICAgIH0KICAgICAgfQogICAgXQogIH0KfQ.l8PnZznspJ6lnNmfAE9UQV532Ypzt1JXQkvrk8gFSRw';
var header = 'X-AxDRM-Message';
var manifestUri = 'https://media.axprod.net/TestVectors/Dash/protected_dash_1080p_h264_singlekey/manifest.mpd';
// var keySystem = 'com.widevine.alpha';
// var licenseUri = 'https://lic.staging.drmtoday.com/license-proxy-widevine/cenc/';
// var customData = 'eyJ1c2VySWQiOiAiMzAyNjRmNDBlMTYzNDgzYjlkNjJlYmE1MGFjMDdiMDUiLCJzZXNzaW9uSWQiOiAiZXlKaGJHY2lPaUpJVXpJMU5pSXNJbXRwWkNJNkluQnBhMkZqYUhVaUxDSjBlWEFpT2lKS1YxUWlmUS5leUpwWVhRaU9qRTNNRGsyTVRNMU1Ua3NJbVZ1ZENJNkluTmtJaXdpY0dsa0lqb3lOemd4TXpVeUxDSm1aV0YwSWpveU5qZzBNelUwTmpVMkxDSndkWEpqYUdGelpYTWlPakFzSW1Gd2NDSTZJbE4wWVc1VVZpMU1iMk5oYkNJc0lteHliaUk2TWpBek56RXhOVFk1TXpFM01qZzBNek14TVgwLjBSQ2NLSFo4N0lpVjJ3TG5xXy1LRy14bVNVMlMyN2J4WkljdHR3TmNCUlUiLCJtZXJjaGFudCI6ICJzdGFuIn0=';
// var manifestUri = 'https://manifestproxy.tun.sgrok.tv/dash/hisense.mpd?url=https%3A%2F%2F434-stan.akamaized.net%2F04%2Fdash%2Fsit%2Flive%2F683a0af262e302881f306a20c2bfc92f%2F2781352A-6%2Fsd%2Fsdr%2Fmedium_h264-af9f786d.mpd%3FmaxQuality%3Dsd&type=tv&manufacturer=hisense&model=ha55m7030uwtg&platformVersion=mtk5658&version=5&drm=widevine';
// var keySystem = 'com.microsoft.playready';
// var licenseUri = 'http://lic.staging.drmtoday.com/license-proxy-headerauth/drmtoday/RightsManager.asmx';
// var customData = 'eyJ1c2VySWQiOiAiYTEyMTQ3YmEzOGFjNGQ4NjhhZTYyYWJmMmNkZGM2YzIiLCJzZXNzaW9uSWQiOiAiZXlKaGJHY2lPaUpJVXpJMU5pSXNJbXRwWkNJNkluQnBhMkZqYUhVaUxDSjBlWEFpT2lKS1YxUWlmUS5leUpwWVhRaU9qRTJPVFV3TVRJNU5EUXNJbVZ1ZENJNkltaGtJaXdpY0dsa0lqbzBNVGN4T0RNNUxDSm1aV0YwSWpveU5qZzBNelUxTlRVMExDSndkWEpqYUdGelpYTWlPall3ZlEuZ0tYNnhEMXBnSGRIYzNxaXpuUm9EQnMwQVVyUWxzeHowR3FlWHBMT3pFZyIsIm1lcmNoYW50IjogInN0YW4ifQ==';
// var header = 'dt-custom-data';
// var initData = 'AAAATHBzc2gBAAAA7e-LqXnWSs6jyCfc1R0h7QAAAAG-CI7ecj9IiosWXRdFxtDUAAAAGBIQvgiO3nI_SIqLFl0XRcbQ1Ejj3JWbBg==';
// var manifestUri = 'https://api.stan.com.au/manifest/v1/dash/lg.mpd?url=https%3A%2F%2Faws.stan.video%2F45%2Fdash%2Flive%2F3259748C-1%2Fhd%2Fsdr%2Fhigh_h264-7beec36c.mpd%3FmaxQuality%3Dhd&type=tv&manufacturer=lg&model=49uj654t-td&platformVersion=webos3_5&version=4&drm=playready';
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
    xhr.setRequestHeader(header, customData);
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
            videoElement.addEventListener('webkitkeyerror', function (err) { console.error('Key Error Occured', err) });
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
                            console.log('Setting the MediaKeys on the video element i.e. videoElement.setMediaKeys', mediaKeys);
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
