var cordova = require('./helper/cordova'),
    window = require('./helper/window'),
    LocalFileSystem = require('./helper/LocalFileSystem'),
    devMode = require('../www/developer-mode'),
    execSpy,
    execWin;


describe('developer-mode', function() {
    beforeEach(function() {
        execWin = jasmine.createSpy();
        execSpy = spyOn(cordova.required, 'cordova/exec').andCallFake(execWin);
        
    });

    it('should return an object', function() {
        expect(devMode).toEqual(jasmine.any(Object));
    });
});