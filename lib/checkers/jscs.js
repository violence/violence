/**
 * Module dependencies.
 */

var JSCS = require('jscs');

var util = require('util');

var Checker = require('./base.js');

/**
 * Expose `JSCSChecker`.
 */

module.exports = JSCSChecker;

/**
 * Initialize a new `Checker` with the given configuration.
 *
 * @api private
 * @param {String} title
 */
function JSCSChecker(conf) {
    Checker.call(this, 'jscs', this.check.bind(this));

    this._conf = conf;
    var _jscs = this._jscs = new JSCS();

    _jscs.registerDefaultRules();
    _jscs.configure(conf);
}

/**
 * Inherit from `Checker.prototype`.
 */

util.inherits(JSCSChecker, Checker);

var ptp = JSCSChecker.prototype;

ptp.check = function (uhm) {

    if (!uhm) return;

    return this._jscs.checkFile(uhm);

};
