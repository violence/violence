/**
 * Module dependencies.
 */

var Eslint = require('eslint');

var util = require('util');

var Checker = require('./base.js');

/**
 * Expose `EslintChecker`.
 */

module.exports = EslintChecker;

/**
 * Initialize a new `Checker` with the given configuration.
 *
 * @api private
 * @param {String} title
 */
function EslintChecker(conf) {
    Checker.call(this, 'eslint', this.check.bind(this));

    this._conf = conf;
    this._eslint = new Eslint();
}

/**
 * Inherit from `Checker.prototype`.
 */

util.inherits(EslintChecker, Checker);

var ptp = EslintChecker.prototype;

ptp.check = function (uhm) {

    //

};
