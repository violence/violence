/**
 * Violence
 * Copyright 2015 The Protein Corp <info@theprotein.io>
 * MIT Licensed
 */

// Consts.

var DEFAULT_CONFS = ['.config/violence.js', '.violence.js', '../presets'];

// Module dependencies.

var debug = require('debug')('violence');

var PATH = require('path');
var FS = require('fs');

var utils = require('./utils');
var lookup = require('../lib/fs-helpers.js').lookup;

// Expose `Violence`.

module.exports = exports = Violence;

// Expose internals.

exports.utils = utils;
exports.interfaces = require('./interfaces');
exports.formatters = require('./formatters');
exports.Reporter = require('./reporter');
exports.Runnable = require('./runnable');
exports.Context = require('./context');
exports.Runner = require('./runner');
exports.Scope = require('./scope');
exports.Hook = require('./hook');

/**
 * Violence class.
 *
 * Options:
 *
 *   - `formatter` formatter instance, defaults to `violence.formatters.compact`
 *   - `bail` bail on the first test failure
 *   - `grep` string or regexp to filter tests with
 *
 * @api public
 * @param {?Object} opts - options
 * @param {?string|string[]} files - configuration file or array to preload
 */
function Violence(opts, files) {
    if (Array.isArray(opts) || typeof opts === 'string') {
        files = opts;
        opts = {};
    }

    opts = opts || {};
    this.files = DEFAULT_CONFS.concat(files || []);

    this.options = opts;
    if (opts.grep) {
        this.grep(new RegExp(opts.grep));
    }
    if (opts.fgrep) {
        this.grep(opts.fgrep);
    }

    this.scope = new exports.Scope('', new exports.Context());
    this.ui('default');
    this.bail(opts.bail);
    this.formatter(opts.formatter, opts.formatterOptions);
    this.useColors(opts.useColors);

    this.scope.on('pre-require', function(context) {
        exports.includes = context.includes;
        exports.excludes = context.excludes;
        exports.describe = context.describe || 'asd';
        exports.preset = context.preset;
    });
}

var ptp = Violence.prototype;

/**
 * Enable or disable bailing on the first failure.
 *
 * @api public
 * @param {boolean} [bail]
 */
ptp.bail = function(bail) {
    if (!arguments.length) {
        bail = true;
    }
    this.scope.bail(bail);
    return this;
};

/**
 * Set test UI `name`, defaults to "default".
 *
 * @api public
 * @param {string} name
 */
ptp.ui = function(name) {
    name = name || 'default';
    this._ui = exports.interfaces[name];
    if (!this._ui) {
        try {
            this._ui = require(name);
        } catch (err) {
            throw new Error('invalid interface "' + name + '"');
        }
    }
    this._ui = this._ui(this.scope);
    return this;
};

/**
 * Load registered configuration files
 *
 * @param {Function} fn - callback function
 * @api private
 */
ptp.loadFiles = function (fn) {
    var self = this;
    var pending = this.files.length;
    this.files.forEach(function (file) {
        FS.existsSync(file) && self.load(file);
        if (!(--pending) && fn) fn();
    });
};

/**
 * Load any configuration file
 *
 * @api public
 * @param {string} file - configuration file
 * @returns {*} - result of require
 */
ptp.load = function (file) {
    var scope = this.scope;
    file = PATH.resolve(file);
    scope.emit('pre-require', global, file, this);
    var result = require(file);
    scope.emit('require', result, file, this);
    scope.emit('post-require', global, file, this);
    return result;
};

/**
 * Add test `file`.
 *
 * @api public
 * @param {string} file
 */
ptp.addFile = function(file) {
    this.files.push(file);
    return this;
};

/*
ptp.presets = {};
ptp.addPreset = function (title, fn) {
    this.presets[title] = fn;
};

ptp.scopes = [];
ptp.addScope = function (title, fn) {
    scopes.push({title: title, fn: fn});
};
*/

/**
 * Set formatter to `formatter`, defaults to "compact".
 *
 * @api public
 * @param {string|Function} formatter name or constructor
 * @param {Object} formatterOptions optional options
 */
ptp.formatter = function(formatter, formatterOptions) {
    this.options.formatterOptions = formatterOptions;

    if (typeof formatter === 'function') {
        this._formatter = formatter;
        return this;
    }

    formatter = formatter || 'compact';

    var _formatter;
    try {
        _formatter = require('./formatters/' + formatter);
    } catch (err) {
        // Try again later
    }
    if (!_formatter) {
        try {
            _formatter = require(formatter);
        } catch (err) {
            console.warn(
                err.message.indexOf('Cannot find module') !== -1?
                '"' + formatter + '" formatter not found' :
                '"' + formatter + '" formatter blew up with error:\n' + err.stack
            );
        }
    }
    if (!_formatter) {
        throw new Error('invalid formatter "' + formatter + '"');
    }

    this._formatter = _formatter;

    return this;
};

/**
 * Add regexp to grep, if `re` is a string it is escaped.
 *
 * @api public
 * @param {RegExp|string} re
 * @returns {Violence}
 */
ptp.grep = function(re) {
    this.options.grep = typeof re === 'string' ? new RegExp(escapeRe(re)) : re;
    return this;
};

/**
 * Invert `.grep()` matches.
 *
 * @api public
 * @returns {Violence}
 */
ptp.invert = function() {
    this.options.invert = true;
    return this;
};

/**
 * Emit color output.
 *
 * @api public
 * @param {boolean} colors
 * @return {Violence}
 */
ptp.useColors = function(colors) {
    if (colors !== undefined) {
        this.options.useColors = colors;
    }
    return this;
};

/**
 * Resolve and set target files
 */
ptp.targets = function(targets, flat) {
    targets = targets || ['.'];
    var _targets = [];
    debug('collecting targets for ', targets);
    targets.forEach(function (arg) {
        _targets = _targets.concat(lookup(arg, ['.*'], !flat));
    });
    this.targets = _targets.map(function (path) {
        return PATH.resolve(path);
    });
    debug('targets %j', this.targets);
};

/**
 * Run tests and invoke `fn()` when complete.
 *
 * @api public
 * @param {Function} fn
 * @return {Runner}
 */
ptp.run = function(fn) {
    if (this.files.length) {
        this.loadFiles();
    }

    var scope = this.scope;
    var options = this.options;
    options.files = this.files;

    var runner = new exports.Runner(scope, this.targets);
    var reporter = new exports.Reporter(runner, options);

    reporter.formatter(this._formatter);

    if (options.grep) {
        runner.grep(options.grep, options.invert);
    }
    if (options.useColors !== undefined) {
        exports.reporters.Base.useColors = options.useColors;
    }

    function done(failures) {
        console.log('res', failures, reporter && reporter.done);
        if (reporter.done) {
            reporter.done(failures, fn);
        } else if (fn) {
            fn(failures);
        }
    }

    return runner.run(done);
};
