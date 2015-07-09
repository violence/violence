/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var debug = require('debug')('violence:runner');

var Pending = require('./pending');
var filter = require('./utils').filter;
var indexOf = require('./utils').indexOf;
var keys = require('./utils').keys;
var stackFilter = require('./utils').stackTraceFilter();
var stringify = require('./utils').stringify;
var type = require('./utils').type;
var undefinedError = require('./utils').undefinedError;

/**
 * Non-enumerable globals.
 */

var globals = [
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'XMLHttpRequest',
    'Date',
    'setImmediate',
    'clearImmediate'
];

/**
 * Expose `Runner`.
 */

module.exports = Runner;

/**
 * Initialize a `Runner` for the given `scope`.
 *
 * Events:
 *
 *   - `start`  execution started
 *   - `end`  execution complete
 *   - `scope`  (scope) checker scope execution started
 *   - `scope end`  (scope) all checkers (and sub-scopes) have finished
 *   - `checker`  (checker) checker execution started
 *   - `checker end`  (checker) checker completed
 *   - `hook`  (hook) hook execution started
 *   - `hook end`  (hook) hook complete
 *   - `pass`  (checker) checker passed
 *   - `fail`  (checker, err) checker failed
 *   - `pending`  (checker) checker pending
 *
 * @api public
 * @param {Scope} scope Root scope
 * @param {string[]} targets
 * until ready.
 */
function Runner(scope, targets) {
    var self = this;
    this._globals = [];
    this._abort = false;
    this.scope = scope;
    this.targets = targets;
    this.total = scope.total();
    this.failures = 0;
    this.on('checker end', function(checker) {
        self.checkGlobals(checker);
    });
    this.on('hook end', function(hook) {
        self.checkGlobals(hook);
    });
    this.grep(/.*/);
    this.globals(this.globalProps().concat(extraGlobals()));
}

/**
 * Wrapper for setImmediate, process.nextTick, or browser polyfill.
 *
 * @api private
 * @param {Function} fn
 */
Runner.immediately = global.setImmediate || process.nextTick;

/**
 * Inherit from `EventEmitter.prototype`.
 */

util.inherits(Runner, EventEmitter);

var ptp = Runner.prototype;

/**
 * Run checkers with full titles matching `re`. Updates runner.total
 * with number of checkers matched.
 *
 * @api public
 * @param {RegExp} re
 * @param {boolean} invert
 * @return {Runner} Runner instance.
 */
ptp.grep = function(re, invert) {
    debug('grep %s', re);
    this._grep = re;
    this._invert = invert;
    this.total = this.grepTotal(this.scope);
    return this;
};

/**
 * Returns the number of checkers matching the grep search for the
 * given scope.
 *
 * @api public
 * @param {Scope} scope
 * @return {number}
 */
ptp.grepTotal = function(scope) {
    var self = this;
    var total = 0;

    scope.eachTest(function(checker) {
        var match = self._grep.test(checker.fullTitle());
        if (self._invert) {
            match = !match;
        }
        if (match) {
            total++;
        }
    });

    return total;
};

/**
 * Return a list of global properties.
 *
 * @api private
 * @return {Array}
 */
ptp.globalProps = function() {
    var props = keys(global);

    // non-enumerables
    for (var i = 0; i < globals.length; ++i) {
        if (~indexOf(props, globals[i])) {
            continue;
        }
        props.push(globals[i]);
    }

    return props;
};

/**
 * Allow the given `arr` of globals.
 *
 * @api public
 * @param {Array} arr
 * @return {Runner} Runner instance.
 */
ptp.globals = function(arr) {
    if (!arguments.length) {
        return this._globals;
    }
    debug('globals %j', arr);
    this._globals = this._globals.concat(arr);
    return this;
};

/**
 * Check for global variable leaks.
 *
 * @api private
 */
ptp.checkGlobals = function(checker) {
    if (this.ignoreLeaks) {
        return;
    }
    var ok = this._globals;

    var globals = this.globalProps();
    var leaks;

    if (checker) {
        ok = ok.concat(checker._allowedGlobals || []);
    }

    if (this.prevGlobalsLength === globals.length) {
        return;
    }
    this.prevGlobalsLength = globals.length;

    leaks = filterLeaks(ok, globals);
    this._globals = this._globals.concat(leaks);

    if (leaks.length > 1) {
        this.fail(checker, new Error('global leaks detected: ' + leaks.join(', ') + ''));
    } else if (leaks.length) {
        this.fail(checker, new Error('global leak detected: ' + leaks[0]));
    }
};

/**
 * Fail the given `checker`.
 *
 * @api private
 * @param {Test} checker
 * @param {Error} err
 */
ptp.fail = function(checker, err) {
    ++this.failures;
    checker.state = 'failed';

    if (!(err instanceof Error || err && typeof err.message === 'string')) {
        err = new Error('the ' + type(err) + ' ' + stringify(err) + ' was thrown, throw an Error :)');
    }

    err.stack = (this.fullStackTrace || !err.stack)
        ? err.stack
        : stackFilter(err.stack);

    this.emit('fail', checker, err);
};

/**
 * Fail the given `hook` with `err`.
 *
 * Hook failures work in the following pattern:
 * - If bail, then exit
 * - Failed `before` hook skips all checkers in a scope and subscopes,
 *   but jumps to corresponding `after` hook
 * - Failed `before each` hook skips remaining checkers in a
 *   scope and jumps to corresponding `after each` hook,
 *   which is run only once
 * - Failed `after` hook does not alter
 *   execution order
 * - Failed `after each` hook skips remaining checkers in a
 *   scope and subscopes, but executes other `after each`
 *   hooks
 *
 * @api private
 * @param {Hook} hook
 * @param {Error} err
 */
ptp.failHook = function(hook, err) {
    this.fail(hook, err);
    if (this.scope.bail()) {
        this.emit('end');
    }
};

/**
 * Run hook `name` callbacks and then invoke `fn()`.
 *
 * @api private
 * @param {string} name
 * @param {Function} fn
 */
ptp.hook = function(name, fn) {
    var scope = this.scope;
    var hooks = scope['_' + name];
    var self = this;

    function next(i) {
        var hook = hooks[i];
        if (!hook) {
            return fn();
        }
        self.currentRunnable = hook;

        hook.ctx.currentTest = self.checker;

        self.emit('hook', hook);

        hook.on('error', function(err) {
            self.failHook(hook, err);
        });

        hook.run(function(err) {
            hook.removeAllListeners('error');
            var checkerError = hook.error();
            if (checkerError) {
                self.fail(self.checker, checkerError);
            }
            if (err) {
                if (err instanceof Pending) {
                    scope.pending = true;
                } else {
                    self.failHook(hook, err);

                    // stop executing hooks, notify callee of hook err
                    return fn(err);
                }
            }
            self.emit('hook end', hook);
            delete hook.ctx.currentTest;
            next(++i);
        });
    }

    Runner.immediately(function() {
        next(0);
    });
};

/**
 * Run hook `name` for the given array of `scopes`
 * in order, and callback `fn(err, errScope)`.
 *
 * @api private
 * @param {string} name
 * @param {Array} scopes
 * @param {Function} fn
 */
ptp.hooks = function(name, scopes, fn) {
    var self = this;
    var orig = this.scope;

    function next(scope) {
        self.scope = scope;

        if (!scope) {
            self.scope = orig;
            return fn();
        }

        self.hook(name, function(err) {
            if (err) {
                var errScope = self.scope;
                self.scope = orig;
                return fn(err, errScope);
            }

            next(scopes.pop());
        });
    }

    next(scopes.pop());
};

/**
 * Run hooks from the top level down.
 *
 * @api private
 * @param {string} name
 * @param {Function} fn
 */
ptp.hookUp = function(name, fn) {
    var scopes = [this.scope].concat(this.parents()).reverse();
    this.hooks(name, scopes, fn);
};

/**
 * Run hooks from the bottom up.
 *
 * @api private
 * @param {string} name
 * @param {Function} fn
 */
ptp.hookDown = function(name, fn) {
    var scopes = [this.scope].concat(this.parents());
    this.hooks(name, scopes, fn);
};

/**
 * Return an array of parent Scopes from
 * closest to furthest.
 *
 * @api private
 * @return {Array}
 */
ptp.parents = function() {
    var scope = this.scope;
    var scopes = [];
    while (scope = scope.parent) {
        scopes.push(scope);
    }
    return scopes;
};

/**
 * Run the current checker and callback `fn(err)`.
 *
 * @api private
 * @param {Function} fn
 */
ptp.runTest = function(fn) {
    var self = this;
    var checker = this.checker;
    var targets = this.targets;

    debug('running checker ' + checker.title);
    try {
        checker.on('error', function (err) {
            self.fail(checker, err);
        });
        // checker.run(fn);
        checker.run(targets, fn);
    } catch (err) {
        fn(err);
    }
};

/**
 * Run checkers in the given `scope` and invoke the callback `fn()` when complete.
 *
 * @api private
 * @param {Scope} scope
 * @param {Function} fn
 */
ptp.runTests = function(scope, fn) {
    var self = this;
    var checkers = scope.checkers.slice();
    var checker;

    function hookErr(_, errScope, after) {
        // before/after Each hook for errScope failed:
        var orig = self.scope;

        // for failed 'after each' hook start from errScope parent,
        // otherwise start from errScope itself
        self.scope = after ? errScope.parent : errScope;

        if (!self.scope) {
            // there is no need calling other 'after each' hooks
            self.scope = orig;
            fn(errScope);
            return;
        }

        // call hookUp afterEach
        self.hookUp('afterEach', function(err2, errScope2) {
            self.scope = orig;
            // some hooks may fail even now
            if (err2) {
                return hookErr(err2, errScope2, true);
            }
            // report error scope
            fn(errScope);
        });
    }

    function next(err, errScope) {
        // if we bail after first err
        if (self.failures && scope._bail) {
            return fn();
        }

        if (self._abort) {
            return fn();
        }

        if (err) {
            return hookErr(err, errScope, true);
        }

        // next checker
        checker = checkers.shift();

        // all done
        if (!checker) {
            return fn();
        }

        // grep
        var match = self._grep.test(checker.fullTitle());
        if (self._invert) {
            match = !match;
        }
        if (!match) {
            return next();
        }

        // pending
        if (checker.pending) {
            self.emit('pending', checker);
            self.emit('checker end', checker);
            return next();
        }

        // execute checker and hook(s)
        self.emit('checker', self.checker = checker);
        self.hookDown('beforeEach', function(err, errScope) {
            // pending again
            if (scope.pending) {
                self.emit('pending', checker);
                self.emit('checker end', checker);
                return next();
            }
            if (err) {
                return hookErr(err, errScope, false);
            }

            self.currentRunnable = self.checker;
            self.runTest(function (err) {
                checker = self.checker;

                if (err) {
                    if (err instanceof Pending) {
                        self.emit('pending', checker);
                    } else {
                        self.fail(checker, err);
                    }
                    self.emit('checker end', checker);

                    if (err instanceof Pending) {
                        return next();
                    }

                    return self.hookUp('afterEach', next);
                }

                checker.state = 'passed';
                self.emit('pass', checker);
                self.emit('checker end', checker);
                self.hookUp('afterEach', next);
            });
        });
    }

    this.next = next;
    next();
};

/**
 * Run the given `scope` and invoke the callback `fn()` when complete.
 *
 * @api private
 * @param {Scope} scope
 * @param {Function} fn
 */
ptp.runScope = function(scope, fn) {
    var i = 0;
    var self = this;
    var total = this.grepTotal(scope);

    debug('run scope %s', scope.fullTitle());

    if (!total) {
        return fn();
    }

    this.emit('scope', this.scope = scope);

    function next(errScope) {
        if (errScope) {
            // current scope failed on a hook from errScope
            if (errScope === scope) {
                // if errScope is current scope
                // continue to the next sibling scope
                return done();
            }
            // errScope is among the parents of current scope
            // stop execution of errScope and all sub-scopes
            return done(errScope);
        }

        if (self._abort) {
            return done();
        }

        var curr = scope.scopes[i++];
        if (!curr) {
            return done();
        }
        self.runScope(curr, next);
    }

    function done(errScope) {
        self.scope = scope;
        self.hook('afterAll', function () {
            self.emit('scope end', scope);
            fn(errScope);
        });
    }

    this.hook('beforeAll', function (err) {
        if (err) {
            return done();
        }
        self.runTests(scope, next);
    });
};

/**
 * Handle uncaught exceptions.
 *
 * @api private
 * @param {Error} err
 */
ptp.uncaught = function(err) {
    if (err) {
        debug('uncaught exception %s', err !== function() {
            return this;
        }.call(err) ? err : (err.message || err));
    } else {
        debug('uncaught undefined exception');
        err = undefinedError();
    }
    err.uncaught = true;

    var runnable = this.currentRunnable;
    if (!runnable) {
        return;
    }

    runnable.clearTimeout();

    // Ignore errors if complete
    if (runnable.state) {
        return;
    }
    this.fail(runnable, err);

    // recover from checker
    if (runnable.type === 'checker') {
        this.emit('checker end', runnable);
        this.hookUp('afterEach', this.next);
        return;
    }

    // bail on hooks
    this.emit('end');
};

/**
 * Run the root scope and invoke `fn(failures)`
 * on completion.
 *
 * @api public
 * @param {Function} fn
 * @return {Runner} Runner instance.
 */
ptp.run = function(fn) {
    var self = this;
    var rootScope = this.scope;

    fn = fn || function() {};

    function uncaught(err) {
        self.uncaught(err);
    }

    function start() {
        self.emit('start');
        self.runScope(rootScope, function() {
            debug('finished running');
            self.emit('end');
        });
    }

    debug('start');

    // callback
    this.on('end', function() {
        debug('end');
        process.removeListener('uncaughtException', uncaught);
        fn(self.failures);
    });

    // uncaught exception
    process.on('uncaughtException', uncaught);

    start();

    return this;
};

/**
 * Cleanly abort execution.
 *
 * @api public
 * @return {Runner} Runner instance.
 */
ptp.abort = function() {
    debug('aborting');
    this._abort = true;

    return this;
};

/**
 * Filter leaks with the given globals flagged as `ok`.
 *
 * @api private
 * @param {Array} ok
 * @param {Array} globals
 * @return {Array}
 */
function filterLeaks(ok, globals) {
    return filter(globals, function(key) {
        // Firefox and Chrome exposes iframes as index inside the window object
        if (/^d+/.test(key)) {
            return false;
        }

        // in firefox
        // if runner runs in an iframe, this iframe's window.getInterface method not init at first
        // it is assigned in some seconds
        if (global.navigator && (/^getInterface/).test(key)) {
            return false;
        }

        // an iframe could be approached by window[iframeIndex]
        // in ie6,7,8 and opera, iframeIndex is enumerable, this could cause leak
        if (global.navigator && (/^\d+/).test(key)) {
            return false;
        }

        // Opera and IE expose global variables for HTML element IDs
        if (/^violence-/.test(key)) {
            return false;
        }

        var matched = filter(ok, function(ok) {
            if (~ok.indexOf('*')) {
                return key.indexOf(ok.split('*')[0]) === 0;
            }
            return key === ok;
        });
        return !matched.length && (!global.navigator || key !== 'onerror');
    });
}

/**
 * Array of globals dependent on the environment.
 *
 * @api private
 * @return {Array}
 */
function extraGlobals() {
    if (typeof process === 'object' && typeof process.version === 'string') {
        var nodeVersion = process.version.split('.').reduce(function(a, v) {
            return a << 8 | v;
        });

        // 'errno' was renamed to process._errno in v0.9.11.

        if (nodeVersion < 0x00090B) {
            return ['errno'];
        }
    }

    return [];
}
