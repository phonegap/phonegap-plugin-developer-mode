
var exec = cordova.require('cordova/exec');
var config;

module.exports = {
    deploy: {
        // reserved for namespacing
    },
    formatAddress: function(path) {
        // default to http:// when no protocol exists
        path = (path.match(/^(.*:\/\/)/)) ? path : 'http://' + path;
        // replace double forward slashes with a single forward-slash
        // except after the protocol (://)
        path = path.replace(/([^:])\/\//g, '$1/');

        return path;
    },
    setHostAddress: function(address) {
        config.host = address;
        save(config, function(){
            console.log('Saved config.host: ' + config.host);
        });
    },
    getHostAddress: function() {
        return this.formatAddress(config.host);
    },
    setEnabledScript: function(script, value) {
        if(typeof config.enabledScripts[script] != "undefined") {
            config.enabledScripts[script] = value;
            save(config, function(){
                console.log('Saved config.enabledScript.'+ script + ' : ' + value);
            });
        }
    },
    getEnabledScript: function(script) {
        if(typeof config.enabledScripts[script] != "undefined") {
            return config.enabledScripts[script];
        }
    }
}

/*
 * Configuration helper functions to help persist config data across parent and child apps
 */

function load(callback) {
    readFile('config.json', function(e, text) {
        var config = parseAsJSON(text);

        config.host = config.host || '127.0.0.1:3000';
        if(!config.enabledScripts) {
            config.enabledScripts = {
                'autoreload': true,
                'console': true,
                'deploy': true,
                'homepage': true,
                'push': true,
                'refresh': true
            }
        } else {
            config.enableScripts = config.enableScripts;
        }

        callback(config);
    });
};

function save(data, callback) {
    saveFile('config.json', data, function(e) {
        callback();
    });
};

function readFile(filepath, callback) {
    window.requestFileSystem(
        LocalFileSystem.PERSISTENT,
        0,
        function(fileSystem) {
            fileSystem.root.getFile(
                filepath,
                null,
                function gotFileEntry(fileEntry) {
                    fileEntry.file(
                        function gotFile(file){
                            var reader = new FileReader();
                            reader.onloadend = function(evt) {
                                // #72 - Fix WP8 loading of config.json
                                // On WP8, `evt.target.result` is returned as an object instead
                                // of a string. Since WP8 is using a newer version of the File API
                                // this may be a platform quirk or an API update.
                                var text = evt.target.result;
                                text = (typeof text === 'object') ? JSON.stringify(text) : text;
                                callback(null, text); // text is a string
                            };
                            reader.readAsText(file);
                        },
                        function(error) {
                            callback(error);
                        }
                    );
                },
                function(error) {
                    callback(error);
                }
            );
        },
        function(error) {
            callback(error);
        }
    );
}

function saveFile(filepath, data, callback) {
    data = (typeof data === 'string') ? data : JSON.stringify(data);

    window.requestFileSystem(
        LocalFileSystem.PERSISTENT,
        0,
        function(fileSystem) {
            fileSystem.root.getFile(
                filepath,
                { create: true, exclusive: false },
                function(fileEntry) {
                    fileEntry.createWriter(
                        function(writer) {
                            writer.onwriteend = function(evt) {
                                callback();
                            };
                            writer.write(data);
                        },
                        function(e) {
                            callback(e);
                        }
                    );
                },
                function(e) {
                    callback(e);
                }
            );
        },
        function(e) {
            callback(e);
        }
    );
}

function parseAsJSON(text) {
    try {
        return JSON.parse(text);
    } catch(e) {
        return {};
    }
}

/*!
 * Begin enabling scripts based on config values
 */

load(function(loadedConfig) {
    config = loadedConfig; 

    if(config.enabledScripts.autoreload) {
        /**
         * Reload the app if server detects local change
         */

        console.log('DeveloperMode: enabling autoreload script');

        var timer;

        function postStatus() {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', module.exports.getHostAddress() + '/__api__/autoreload', true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.onreadystatechange = function() {
                if (this.readyState === 4 && /^[2]/.test(this.status)) {
                }
            };
            xhr.send();
        }

        function checkForReload() {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', module.exports.getHostAddress() + '/__api__/autoreload', true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.onreadystatechange = function() {
                if (this.readyState === 4 && /^[2]/.test(this.status)) {
                    var response = JSON.parse(this.responseText);
                    if (response.content.outdated) {
                        postStatus();

                        // this is ensure we don't duplicate a download when we first launch the app on device
                        if(response.content.lastUpdated !== 0){
                            window.clearTimeout(timer);
                            window.DeveloperMode.downloadZip({
                                address: 'http://' + module.exports.getHostAddress(),
                                update: true
                            });
                        }
                    } else if (response.projectChanged) {
                        window.DeveloperMode.downloadZip({
                            address: 'http://' + module.exports.getHostAddress(),
                            update: false
                        });
                    }
                }
            };
            xhr.send();
        }

        document.addEventListener("deviceready", function(){
            timer = setInterval(checkForReload, 1000 * 3);
        }, false);

    }

    if(config.enabledScripts.console) {
        /**
         * enable console.log to report back to cli
         */

        console.log('DeveloperMode: enabling console script');

        if(typeof io != "undefined") {
            var socket = io(config.host);
            var previousConsole = window.console || {};
            window.console = {
                log:function(){
                    if(previousConsole.log) {
                        previousConsole.log.apply(previousConsole, arguments);
                    }
                    socket.emit('console','log', Array.prototype.slice.call(arguments).join(' '));
                },
                warn:function(){
                    if(previousConsole.warn) {
                        previousConsole.warn.apply(previousConsole, arguments);
                    }
                    socket.emit('console','warn', Array.prototype.slice.call(arguments).join(' '));
                },
                error:function(){
                    if(previousConsole.error) {
                        previousConsole.error.apply(previousConsole, arguments);
                    }
                    socket.emit('console','error', Array.prototype.slice.call(arguments).join(' '));
                },
                assert:function(assertion) {
                    if(previousConsole.assert) {
                        previousConsole.assert.apply(previousConsole, arguments);
                    }
                    if(assertion){
                        socket.emit('console','assert', Array.prototype.slice.call(arguments, 1).join(' '));
                    }
                }
            };
        }
    }

    if(config.enabledScripts.deploy) {
        /**
         * Allow the app to content sync and deploy on updates
         */

        /**
         * Download, Extract, and Deploy App.
         *
         * Options:
         *   - `options` {Object}
         *     - `address` {String} is the server address.
         */

        if (!module.exports.deploy) module.exports.deploy = {};

        module.exports.deploy.downloadZip = function(options) {
            var uri;
            var sync;
            var theHeaders = options.headers;
            if(options.update === true) {
                uri = encodeURI(options.address + '/__api__/update');
                sync = ContentSync.sync({ src: uri, id: 'phonegapdevapp', type: 'merge', copyCordovaAssets: false, headers: theHeaders });
                sync.on('complete', function(data) {
                    window.location.reload();
                });
            } else {
                uri = encodeURI(options.address + '/__api__/appzip');
                sync = ContentSync.sync({ src: uri, id: 'phonegapdevapp', type: 'replace', copyCordovaAssets: true, headers: theHeaders });
                sync.on('complete', function(data) {
                    window.location.href = data.localPath + '/www/index.html';
                });
            }

            sync.on('progress', function(data) {
                if(options.onProgress) {
                    options.onProgress(data);
                }
            });

            sync.on('error', function(e){
                if (options.onDownloadError) {
                    setTimeout(function() {
                        options.onDownloadError(e);
                    }, 10);
                }
                console.log("download error " + e);
            });

            document.addEventListener('cancelSync', function(e) {
                sync.cancel();
            });

            sync.on('cancel', function(e) {
                if (options.onCancel) {
                    setTimeout(function() {
                        options.onCancel(e);
                    }, 10);
                }
                console.log("download cancelled by user");
            });
        };
    }

    if(config.enabledScripts.homepage) {
        /**
         * Enables 3-finger-tap home script
         * Runs on plugin load.
         */

          console.log('DeveloperMode: enabling 3-finger home script');

          var e = {},
            t = {
              touchstart: 'touchstart',
              touchend: 'touchend'
            };

          if (window.navigator.msPointerEnabled) {
            t = {
              touchstart: 'MSPointerDown',
              touchend: 'MSPointerUp'
            }
          }

          document.addEventListener(t.touchstart, function(t) {
            var n = t.touches || [t],
              r;
            for (var i = 0, s = n.length; i < s; i++) {
              r = n[i];
              e[r.identifier || r.pointerId] = r
            }
          }, false);

          document.addEventListener(t.touchend, function(t) {
            var n = Object.keys(e).length;
            e = {};
            if (n === 3) {
              t.preventDefault();
              window.history.back(window.history.length)
            }
          }, false)
    }

    if(config.enabledScripts.push) {
        /**
         * Enable push notifications
         */

        console.log('DeveloperMode: enabling push script');

        document.addEventListener('deviceready', function() {
            var oldPushNotification;
            if (window.PushNotification) {
                oldPushNotification = window.PushNotification;
                window.PushNotification.init = function(options) {
                    if (options.android) {
                        options.android.senderID = "85075801930";
                        options.android.icon = "pushicon";
                        options.android.iconColor = "blue";
                    }
                    var pgdevPush = new oldPushNotification.PushNotification(options);
                    pgdevPush.on('registration', function(data) {
                        console.log('Device Push ID: \n' + data.registrationId);
                    });
                    return pgdevPush;
                };
            }
        });
    }

    if(config.enabledScripts.refresh) {
        /**
         * Reload the app on 4 finger tap
         */

        console.log('DeveloperMode: enabling 4-finger tap refresh script');

        var currentTouches = {},
            eventName = { touchstart: 'touchstart', touchend: 'touchend' };

        if (window.navigator.msPointerEnabled) {
            eventName = { touchstart: 'MSPointerDown', touchend: 'MSPointerUp' };
        }

        document.addEventListener(eventName.touchstart, function(evt) {
            var touches = evt.touches || [evt],
                touch;
            for(var i = 0, l = touches.length; i < l; i++) {
                touch = touches[i];
                currentTouches[touch.identifier || touch.pointerId] = touch;
            }
        });

        document.addEventListener(eventName.touchend, function(evt) {
            var touchCount = Object.keys(currentTouches).length;
            currentTouches = {};
            if (touchCount === 4) {
                evt.preventDefault();
                window.location.reload(true);
            }
        }, false);
    }    
});
  
