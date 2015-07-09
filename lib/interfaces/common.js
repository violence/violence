/**
 * Functions common to more than one interface.
 *
 * @param {Scope[]} scopes
 * @param {Context} context
 * @return {Object} An object containing common functions.
 */
module.exports = function(scopes, context) {
    return {
        /**
         * Execute before running tests.
         *
         * @param {string} name
         * @param {Function} fn
         */
        before: function(name, fn) {
            scopes[0].beforeAll(name, fn);
        },

        /**
         * Execute after running tests.
         *
         * @param {string} name
         * @param {Function} fn
         */
        after: function(name, fn) {
            scopes[0].afterAll(name, fn);
        },

        /**
         * Execute before each test case.
         *
         * @param {string} name
         * @param {Function} fn
         */
        beforeEach: function(name, fn) {
            scopes[0].beforeEach(name, fn);
        },

        /**
         * Execute after each test case.
         *
         * @param {string} name
         * @param {Function} fn
         */
        afterEach: function(name, fn) {
            scopes[0].afterEach(name, fn);
        }
    };
};
