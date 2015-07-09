/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var debug = require('debug')('violence:scope');

var Hook = require('./hook');
var utils = require('./utils');

/**
 * Expose `Scope`.
 */

exports = module.exports = Scope;

/**
 * Create a new `Scope` with the given `title` and parent `Scope`. When a scope
 * with the same title is already present, that scope is returned to provide
 * nicer reporter and more flexible meta-checkering.
 *
 * @api public
 * @param {Scope} parent
 * @param {string} title
 * @return {Scope}
 */
exports.create = function(parent, title) {
    var scope = new Scope(title, parent.ctx);
    scope.parent = parent;
    if (parent.pending) {
        scope.pending = true;
    }
    title = scope.fullTitle();
    parent.addScope(scope);
    return scope;
};

/**
 * Initialize a new `Scope` with the given `title` and `ctx`.
 *
 * @api private
 * @param {string} title
 * @param {Context} parentContext
 * @implements {EventEmitter}
 */
function Scope(title, parentContext) {
    this.title = title;

    function Context() {}
    Context.prototype = parentContext;

    this.ctx = new Context();
    this.scopes = [];
    this.checkers = [];
    this.ignores = [];
    this.pending = false;
    this._beforeEach = [];
    this._beforeAll = [];
    this._afterEach = [];
    this._afterAll = [];
    this.root = !title;
    this._bail = false;
}

util.inherits(Scope, EventEmitter);

var ptp = Scope.prototype;

/**
 * Return a clone of this `Scope`.
 *
 * @api private
 * @return {Scope}
 */
ptp.clone = function() {
    var scope = new Scope(this.title);
    debug('clone');
    scope.ctx = this.ctx;
    scope.bail(this.bail());
    return scope;
};

/**
 * Sets whether to bail after first error.
 *
 * @api private
 * @param {boolean} bail
 * @return {Scope|number} for chaining
 */
ptp.bail = function(bail) {
    if (!arguments.length) {
        return this._bail;
    }
    debug('bail %s', bail);
    this._bail = bail;
    return this;
};

/**
 * Run `fn(checker[, done])` before running checkers.
 *
 * @api private
 * @param {string} title
 * @param {Function} fn
 * @return {Scope} for chaining
 */
ptp.beforeAll = function(title, fn) {
    if (this.pending) {
        return this;
    }
    if (typeof title === 'function') {
        fn = title;
        title = fn.name;
    }
    title = '"before all" hook' + (title ? ': ' + title : '');

    var hook = new Hook(title, fn);
    hook.parent = this;
    hook.ctx = this.ctx;
    this._beforeAll.push(hook);
    this.emit('beforeAll', hook);
    return this;
};

/**
 * Run `fn(checker[, done])` after running checkers.
 *
 * @api private
 * @param {string} title
 * @param {Function} fn
 * @return {Scope} for chaining
 */
ptp.afterAll = function(title, fn) {
    if (this.pending) {
        return this;
    }
    if (typeof title === 'function') {
        fn = title;
        title = fn.name;
    }
    title = '"after all" hook' + (title ? ': ' + title : '');

    var hook = new Hook(title, fn);
    hook.parent = this;
    // hook.timeout(this.timeout());
    // hook.enableTimeouts(this.enableTimeouts());
    // hook.slow(this.slow());
    hook.ctx = this.ctx;
    this._afterAll.push(hook);
    this.emit('afterAll', hook);
    return this;
};

/**
 * Run `fn(checker[, done])` before each checker case.
 *
 * @api private
 * @param {string} title
 * @param {Function} fn
 * @return {Scope} for chaining
 */
ptp.beforeEach = function(title, fn) {
    if (this.pending) {
        return this;
    }
    if (typeof title === 'function') {
        fn = title;
        title = fn.name;
    }
    title = '"before each" hook' + (title ? ': ' + title : '');

    var hook = new Hook(title, fn);
    hook.parent = this;
    hook.timeout(this.timeout());
    hook.enableTimeouts(this.enableTimeouts());
    hook.slow(this.slow());
    hook.ctx = this.ctx;
    this._beforeEach.push(hook);
    this.emit('beforeEach', hook);
    return this;
};

/**
 * Run `fn(checker[, done])` after each checker case.
 *
 * @api private
 * @param {string} title
 * @param {Function} fn
 * @return {Scope} for chaining
 */
ptp.afterEach = function(title, fn) {
    if (this.pending) {
        return this;
    }
    if (typeof title === 'function') {
        fn = title;
        title = fn.name;
    }
    title = '"after each" hook' + (title ? ': ' + title : '');

    var hook = new Hook(title, fn);
    hook.parent = this;
    // hook.timeout(this.timeout());
    // hook.enableTimeouts(this.enableTimeouts());
    // hook.slow(this.slow());
    hook.ctx = this.ctx;
    this._afterEach.push(hook);
    this.emit('afterEach', hook);
    return this;
};

/**
 * Add a checker `scope`.
 *
 * @api private
 * @param {Scope} scope
 * @return {Scope} for chaining
 */
ptp.addScope = function(scope) {
    scope.parent = this;
    // scope.timeout(this.timeout());
    // scope.enableTimeouts(this.enableTimeouts());
    // scope.slow(this.slow());
    scope.bail(this.bail());
    this.scopes.push(scope);
    this.emit('scope', scope);
    return this;
};

/**
 * Add a `checker` to this scope.
 *
 * @api private
 * @param {Checker} checker
 * @return {Scope} for chaining
 */
ptp.addChecker = function(checker) {
    checker.parent = this;
    // checker.timeout(this.timeout());
    // checker.enableTimeouts(this.enableTimeouts());
    // checker.slow(this.slow());
    checker.ctx = this.ctx;
    this.checkers.push(checker);
    this.emit('checker', checker);
    return this;
};

/**
 * Return the full title generated by recursively concatenating the parent's
 * full title.
 *
 * @api public
 * @return {string}
 */
ptp.fullTitle = function() {
    if (this.parent) {
        var full = this.parent.fullTitle();
        if (full) {
            return full + ' ' + this.title;
        }
    }
    return this.title;
};

/**
 * Return the total number of checkers.
 *
 * @api public
 * @return {number}
 */
ptp.total = function() {
    return utils.reduce(this.scopes, function(sum, scope) {
        return sum + scope.total();
    }, 0) + this.checkers.length;
};

/**
 * Iterates through each scope recursively to find all checkers. Applies a
 * function in the format `fn(checker)`.
 *
 * @api private
 * @param {Function} fn
 * @return {Scope}
 */
ptp.eachTest = function(fn) {
    utils.forEach(this.checkers, fn);
    utils.forEach(this.scopes, function(scope) {
        scope.eachTest(fn);
    });
    return this;
};

/**
 * This will run the root scope if we happen to be running in delayed mode.
 */
ptp.run = function run() {
    if (this.root) {
        this.emit('run');
    }
};
