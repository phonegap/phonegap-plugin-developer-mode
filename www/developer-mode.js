
var exec = cordova.require('cordova/exec');
var config = {
        'host': 'http://127.0.0.1:3000',
        'enabledScripts' : {
            // these should be set via local storage or some other mechanism
            'autoreload': true,
            'console': false,
            'deploy': true,
            'homepage': true,
            'push': true,
            'refresh': true
        }
    };

module.exports = {
    setHostAddress: function(address) {
        config.host = address;
    },
    getHostAddress: function() {
        return config.host;
    }
}

if(config.enabledScripts.autoreload) {
    /**
     * Reload the app if server detects local change
     */

    console.log('DeveloperMode: enabling autoreload script');

    var host = module.exports.getHostAddress(),
        url = host + '/__api__/autoreload',
        timer;

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
                        window.phonegap.app.config.load(function(config){
                            window.phonegap.app.downloadZip({
                                address: 'http://' + module.exports.getHostAddress(),
                                update: true
                            });
                        });
                    }
                } else if (response.projectChanged) {
                    window.phonegap.app.config.load(function(config) {
                        window.phonegap.app.downloadZip({
                            address: 'http://' + module.exports.getHostAddress(),
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

}

if(config.enabledScripts.console) {
    /**
     * enable console.log to report back to cli
     */

    console.log('DeveloperMode: enabling console script');

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
    });a
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
