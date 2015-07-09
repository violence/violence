/**
 * Module dependencies.
 */

var Scope = require('../scope');
var checkers = require('../checkers');

/**
 * BDD-style interface:
 *
 *      describe('Array', function() {
 *        describe('#indexOf()', function() {
 *          it('should return the index when present', function() {
 *            // ...
 *          });
 *        });
 *      });
 *
 * @param {Scope} scope Root scope.
 */
module.exports = function(scope) {
    var scopes = [scope];

    scope.on('pre-require', function(context, file, vio) {
        var common = require('./common')(scopes, context);

        context.before = common.before;
        context.after = common.after;
        context.beforeEach = common.beforeEach;
        context.afterEach = common.afterEach;

        /**
         * Describe a "scope" with the given `title`
         * and callback `fn` containing nested scopes
         * and/or tests.
         */

        context.describe = context.group = function(title, fn) {
            var scope = Scope.create(scopes[0], title);
            scope.file = file;
            scopes.unshift(scope);
            fn.call(scope);
            scopes.shift();
            return scope;
        };

        /**
         * Ignores.
         */

        context.includes = function (data) {
            var scope = scopes[0];
            scope.ignores.push('!' + data);
        };

        context.excludes = function (data) {
            var scope = scopes[0];
            scope.ignores.push(data);
        };

        context.ignores = function (data) {
            context.excludes(data);
        };

        /**
         * Describe a specification or test-case
         * with the given `title` and callback `fn`
         * acting as a thunk.
         */

        context.jscs = function(conf) {
            var scope = scopes[0];
            var fn = null;

            /*if (!scope.pending) {
                fn = function (a, b, c) {
                    console.log(arguments);
                    return jscs.checkFile();
                };
            }*/

            var checker = new checkers.jscs(conf);
            checker.file = file;
            scope.addChecker(checker);
            return checker;
        };
    });
};
