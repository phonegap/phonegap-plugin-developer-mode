
var exec = cordova.require('cordova/exec');

module.exports = {
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

}

if(module.exports.enabledScripts.console) {

}

if(module.exports.enabledScripts.deploy) {

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

}

if(module.exports.enabledScripts.refresh) {

}