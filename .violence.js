describe('js', function () {
    includes('lib/*.js');

    jscs({
        "plugins": ["jscs-jsdoc"],
        "preset": "google",

        "requireParenthesesAroundIIFE": true,
        "maximumLineLength": 120,
        "validateLineBreaks": "LF",
        "validateIndentation": 4,

        "disallowSpacesInsideObjectBrackets": null,
        "disallowImplicitTypeConversion": ["string"],

        "safeContextKeyword": "_this",

        "jsDoc": {
            "checkAnnotations": "closurecompiler",
            "checkParamNames": true,
            "requireParamTypes": true,
            "checkRedundantParams": true,
            "checkReturnTypes": true,
            "checkRedundantReturns": true,
            "requireReturnTypes": true,
            "checkTypes": "capitalizedNativeCase",
            "checkRedundantAccess": true,
            "requireNewlineAfterDescription": true
        }
    });
});
