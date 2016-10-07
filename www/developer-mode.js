
var exec = cordova.require('cordova/exec');

module.exports = {
    config: {
        'host': 'http://127.0.0.1:3000'
    },
    enabledScripts : {
        // these should be set via local storage or some other mechanism
        'autoreload': true,
        'console': true,
        'deploy': true,
        'homepage': true,
        'push': true,
        'refresh': true
    }
};

if(module.exports.enabledScripts.autoreload) {
    /**
     * Reload the app if server detects local change
     */

    (function() {
        var host = 'http://127.0.0.1:3000',
            url = host + '/__api__/autoreload',
            timer;

        function postStatus() {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.onreadystatechange = function() {
                if (this.readyState === 4 && /^[2]/.test(this.status)) {
                }
            };
            xhr.send();
        }

        function checkForReload() {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.onreadystatechange = function() {
                if (this.readyState === 4 && /^[2]/.test(this.status)) {
                    var response = JSON.parse(this.responseText);
                    if (response.content.outdated) {
                        postStatus();

                        // this is ensure we don't duplicate a download when we first launch the app on device
                        if(response.content.lastUpdated !== 0){
                            window.clearTimeout(timer);
                            window.phonegap.app.config.load(function(config){
                                window.phonegap.app.downloadZip({
                                    address: 'http://' + config.address,
                                    update: true
                                });
                            });
                        }
                    } else if (response.projectChanged) {
                        window.phonegap.app.config.load(function(config) {
                            window.phonegap.app.downloadZip({
                                address: 'http://' + config.address,
                                update: false
                            });
                        });
                    }
                }
            };
            xhr.send();
        }

        document.addEventListener("deviceready", function(){
            timer = setInterval(checkForReload, 1000 * 3);
        }, false);
    })(window);
}

if(module.exports.enabledScripts.console) {
    /**
     * enable console.log to report back to cli
     */

    (function(window) {
        var socket = io('http://127.0.0.1:3000');
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
    })(window);
}

if(module.exports.enabledScripts.deploy) {
    /**
     * Allow the app to content sync and deploy on updates
     */

    (function() {

        /*!
         * Create export namespace.
         */

        if (!window.phonegap) window.phonegap = {};
        if (!window.phonegap.app) window.phonegap.app = {};

        /*!
         * Configuration.
         */

        if (!window.phonegap.app.config) window.phonegap.app.config = {};

        /**
         * Load Configuration.
         *
         * Options:
         *   - `callback` {Function} is triggered on completion
         *     - `data` {Object} is the configuration data
         */

        window.phonegap.app.config.load = function(callback) {
            readFile('config.json', function(e, text) {
                config = parseAsJSON(text);

                // load defaults
                config.address = config.address || '127.0.0.1:3000';

                callback(config);
            });
        };

        /**
         * Save Configuration.
         *
         * Options:
         *   - `data` {Object} is the data to save to the config file.
         *   - `callback` {Function} is triggered on completion.
         */

        window.phonegap.app.config.save = function(data, callback) {
            saveFile('config.json', data, function(e) {
                callback();
            });
        };

        /*!
         * Configuration helper functions.
         */

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

        /**
         * Download, Extract, and Deploy App.
         *
         * Options:
         *   - `options` {Object}
         *     - `address` {String} is the server address.
         */

        window.phonegap.app.downloadZip = function(options) {
            var uri, sync;
            if (options.update) {
                uri = encodeURI(options.address + '/__api__/update');
                sync = ContentSync.sync({ src: uri, id: 'phonegapdevapp', type: 'merge', copyCordovaAssets: false });
            } else {
                uri = encodeURI(options.address + '/__api__/appzip');
                sync = ContentSync.sync({ src: uri, id: 'phonegapdevapp', type: 'replace', copyCordovaAssets: true });
            }

            sync.on('complete', function(data){
                window.location.reload();
            });

            sync.on('error', function(e){
                if (options.onDownloadError) {
                    setTimeout(function() {
                        options.onDownloadError(e);
                    }, 10);
                }
                console.log('download error', e.message);
            });
        };

    })();
}

if(module.exports.enabledScripts.homepage) {
    /**
     * Enables 3-finger-tap home script
     * Runs on plugin load.
     */

    (function () {

      console.log('DeveloperMode: enabling 3-finger home script')

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

    })();
}

if(module.exports.enabledScripts.push) {
    /**
     * Enable push notifications
     */
    (function() {

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

    })(window);
}

if(module.exports.enabledScripts.refresh) {
    /**
     * Reload the app on 4 finger tap
     */
    (function() {

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

    })(window);
}