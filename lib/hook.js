/**
 * Module dependencies.
 */

var util = require('util');

var Runnable = require('./runnable');

/**
 * Expose `Hook`.
 */

module.exports = Hook;

/**
 * Initialize a new `Hook` with the given `title` and callback `fn`.
 *
 * @param {String} title
 * @param {Function} fn
 * @api private
 */
function Hook(title, fn) {
    Runnable.call(this, title, fn);
    this.type = 'hook';
}

util.inherits(Hook, Runnable);

/**
 * Get or set the test `err`.
 *
 * @param {Error} err
 * @return {Error}
 * @api public
 */
Hook.prototype.error = function(err) {
    if (!arguments.length) {
        err = this._error;
        this._error = null;
        return err;
    }

    this._error = err;
};
