/**
 * Module dependencies.
 */

var util = require('util');
var PATH = require('path');

var vow = require('vow');

var Runnable = require('../runnable');

/**
 * Expose `Checker`.
 */

module.exports = Checker;

/**
 * Initialize a new `Checker` with the given configuration.
 *
 * @api private
 * @param {String} title
 */
function Checker(title, fn) {
    Runnable.call(this, title, fn);
    this.type = 'linter';
}

/**
 * Inherit from `Runnable.prototype`.
 */

util.inherits(Checker, Runnable);

var ptp = Checker.prototype;

ptp.run = function (targets, fn) {
    var _this = this;
    Runnable.prototype.run.call(this, function (err) {
        vow.all(
            targets.map(function (target) {
                return this.check(target)
                    .then(function (res) {
                        return res.getErrorList();
                    });
            }, _this)
        )
            .then(function (res) {
                res = res.reduce(function (errs, res) {
                    return res.concat(errs);
                }, []);
                if (res.length) {
                    // throw Error(res);
                }
                _this;
                debugger;
                fn();
            })
            .catch(fn);
    });
};

/**
 * Checking a file.
 *
 * @param {string} path
 * @returns {?Error[]}
 */
ptp.check = function (path) {
    throw Error('oopsie!');
};
