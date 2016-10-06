#import "DeveloperMode.h"
@implementation DeveloperMode

- (void)pluginInitialize {
}

- (void)enableHomeScript:(CDVInvokedUrlCommand*)command {
    [[NSNotificationCenter defaultCenter] removeObserver:self name:CDVPageDidLoadNotification object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(pageDidLoad:) name:CDVPageDidLoadNotification object:nil];
}

- (void)disableHomeScript:(CDVInvokedUrlCommand*)command {
    [[NSNotificationCenter defaultCenter] removeObserver:self name:CDVPageDidLoadNotification object:nil];
}

- (void) pageDidLoad:(NSNotification *) notification
{
    // Michael Brooks' homepage.js (https://github.com/phonegap/connect-phonegap/blob/master/res/middleware/homepage.js)
    NSString* tapScript = @"javascript: console.log('adding homepage.js'); (function(){var e={},t={touchstart:'touchstart',touchend:'touchend'};if(window.navigator.msPointerEnabled){t={touchstart:'MSPointerDown',touchend:'MSPointerUp'}}document.addEventListener(t.touchstart,function(t){var n=t.touches||[t],r;for(var i=0,s=n.length;i<s;i++){r=n[i];e[r.identifier||r.pointerId]=r}},false);document.addEventListener(t.touchend,function(t){var n=Object.keys(e).length;e={};if(n===3){t.preventDefault();window.history.back(window.history.length)}},false)})(window)";
    [self.commandDelegate evalJs:tapScript];
}

@end