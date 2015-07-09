/**
 * Expose `Context`.
 */

module.exports = Context;

/**
 * Initialize a new `Context`.
 *
 * @api private
 */
function Context() {}

/**
 * Set or get the context `Runnable` to `runnable`.
 *
 * @api private
 * @param {Runnable} runnable
 * @return {Context}
 */
Context.prototype.runnable = function(runnable) {
    if (!arguments.length) {
        return this._runnable;
    }
    this.test = this._runnable = runnable;
    return this;
};

/**
 * Inspect the context void of `._runnable`.
 *
 * @api private
 * @return {string}
 */
Context.prototype.inspect = function() {
    return JSON.stringify(this, function(key, val) {
        return key === 'runnable' || key === 'test' ? undefined : val;
    }, 2);
};
