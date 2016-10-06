#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

@interface DeveloperMode : CDVPlugin

- (void) enableHomeScript:(CDVInvokedUrlCommand*)command;

@end