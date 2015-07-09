var mock = require('mock-fs');
var Violence = require('../');

describe('simple', function () {
    before(function () {
        mock({
            'simpleconf': 'group("js", function () {\
                includes("*.js");\
                jshint({boss: true});\
            });',
        });
    });

    after(function () {
        mock.restore();
    });

    it('should load simple conf file', function () {
        var violence = new Violence();
        violence.load('simpleconf');
        console.log(violence);
    });
});
