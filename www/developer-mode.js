
var exec = cordova.require('cordova/exec');



/*!
 * Content Sync Plugin.
 */

module.exports = {

    /**
     * Enables injection of home (3-finger-tap) javascript code on page load.
     *
     */

    enableHomeScript: function() {
        exec(null, null, 'DeveloperMode', 'enableHomeScript');
    },

    enableAutoreload: function() {

    },

    enableConsole: function() {

    },

    enableDeploy: function() {

    },

    enablePush: function() {

    }

};