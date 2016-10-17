var cordova = require('./helper/cordova'),
    window = require('./helper/window'),
    LocalFileSystem = require('./helper/LocalFileSystem'),
    devMode = require('../www/developer-mode'),
    execSpy,
    execWin,
    fileWin,
    fileSpy;


describe('developer-mode', function() {
    beforeEach(function() {
        execWin = jasmine.createSpy();
        execSpy = spyOn(cordova.required, 'cordova/exec').andCallFake(execWin);
        fileWin = jasmine.createSpy();
        fileSpy = spyOn(window, 'requestFileSystem').andCallFake(fileWin);
        
    });

    it('should return the proper interface', function() {
        expect(devMode).toEqual(    
                                    jasmine.any(Object),
                                    jasmine.any(Function), 
                                    jasmine.any(Function), 
                                    jasmine.any(Function), 
                                    jasmine.any(Function), 
                                    jasmine.any(Function) 
                                );    
    });

    it('deploy should be an object', function() {
        expect(devMode.deploy).toEqual(jasmine.any(Object));
    });

    it('formatAddress should return a proper formatted address with no http protocol', function() {
        expect(devMode.formatAddress('127.0.0.1')).toEqual('http://127.0.0.1');
    });

    it('formatAddress should return a proper formatted address with extra slashes', function() {
        expect(devMode.formatAddress('127.0.0.1//')).toEqual('http://127.0.0.1/');
    });

    it('setHostAddress should save the address', function() {
        devMode.setHostAddress('123.123.123.123');
        expect(fileSpy).toHaveBeenCalled();
        expect(devMode.getHostAddress()).toEqual('http://123.123.123.123');
    });

    it('getHostAddress should return the address', function() {
        devMode.setHostAddress('123.123.123.123');
        expect(devMode.getHostAddress()).toEqual('http://123.123.123.123');  
    });

    it('setEnabledScript should set a script to be enabled or disabled', function() {
        devMode.setEnabledScript('deploy', false);
        expect(fileSpy).toHaveBeenCalled();
        expect(devMode.getEnabledScript('deploy')).toEqual(false);
    });

    it('getEnabledScript should return whether a script is enabled or disabled', function() {
        devMode.setEnabledScript('autoreload', true);
        expect(devMode.getEnabledScript('autoreload')).toEqual(true);
    });
});