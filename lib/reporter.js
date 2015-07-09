/**
 * Module dependencies.
 */

var tty = require('tty');
var utils = require('./utils');

var supportsColor = process.browser ? null : require('supports-color');

/**
 * Expose `Base`.
 */

exports = module.exports = Base;

/**
 * Check if both stdio streams are associated with a tty.
 */

var isatty = tty.isatty(1) && tty.isatty(2);

/**
 * Enable coloring by default, except in the browser interface.
 */

exports.useColors = !process.browser && (supportsColor || (process.env.VIOLENCE_COLORS !== undefined));

/**
 * Expose term window size, with some defaults for when stderr is not a tty.
 */

exports.window = {
    width: 75
};

if (isatty) {
    exports.window.width = process.stdout.getWindowSize ? process.stdout.getWindowSize(1)[0] : tty.getWindowSize()[1];
}

/**
 * Expose some basic cursor interactions that are common among reporters.
 */

exports.cursor = {
    hide: function() {
        isatty && process.stdout.write('\u001b[?25l');
    },

    show: function() {
        isatty && process.stdout.write('\u001b[?25h');
    },

    deleteLine: function() {
        isatty && process.stdout.write('\u001b[2K');
    },

    beginningOfLine: function() {
        isatty && process.stdout.write('\u001b[0G');
    },

    CR: function() {
        if (isatty) {
            exports.cursor.deleteLine();
            exports.cursor.beginningOfLine();
        } else {
            process.stdout.write('\r');
        }
    }
};

/**
 * Outut the given `failures` as a list.
 *
 * @param {Array} failures
 * @api public
 */

exports.list = function(failures) {
    console.log();
    failures.forEach(function(test, i) {
        // format
        var fmt = '  %s) %s:\n' + '     %s' + '\n%s\n';

        // msg
        var msg;
        var err = test.err;
        var message = err.message || '';
        var stack = err.stack || message;
        var index = stack.indexOf(message);
        var actual = err.actual;
        var expected = err.expected;
        var escape = true;

        if (index === -1) {
            msg = message;
        } else {
            index += message.length;
            msg = stack.slice(0, index);
            // remove msg from stack
            stack = stack.slice(index + 1);
        }

        // uncaught
        if (err.uncaught) {
            msg = 'Uncaught ' + msg;
        }

        // indent stack trace
        stack = stack.replace(/^/gm, '  ');

        console.log(fmt, (i + 1), test.fullTitle(), msg, stack);
    });
};

/**
 * Initialize a new `Base` reporter.
 *
 * All other reporters generally
 * inherit from this reporter, providing
 * stats such as test duration, number
 * of tests passed / failed etc.
 *
 * @param {Runner} runner
 * @api public
 */

function Base(runner) {
    var stats = this.stats = {
        scopes: 0,
        passes: 0,
        pending: 0,
        failures: 0
    };
    var failures = this.failures = [];

    if (!runner) {
        return;
    }
    this.runner = runner;

    runner.stats = stats;

    runner.on('start', function() {
    });

    runner.on('scope', function(scope) {
        stats.scopes = stats.scopes || 0;
        scope.root || stats.scopes++;
    });

    runner.on('test end', function() {
        stats.tests = stats.tests || 0;
        stats.tests++;
    });

    runner.on('pass', function(test) {
        stats.passes = stats.passes || 0;
        stats.passes++;
    });

    runner.on('fail', function(test, err) {
        stats.failures = stats.failures || 0;
        stats.failures++;
        test.err = err;
        failures.push(test);
    });

    runner.on('end', function() {
        stats.end = new Date();
        stats.duration = new Date() - stats.start;
    });

    runner.on('pending', function() {
        stats.pending++;
    });

    // ------

    runner.on('fail', function(test) {
        exports.cursor.CR();
        // console.log(require('util').inspect(test));
    });

    runner.on('end', this.epilogue.bind(this));
}

Base.prototype.formatter = function (formatter) {
    this._formatter = formatter;
};

/**
 * Output common epilogue used by many of
 * the bundled reporters.
 *
 * @api public
 */
Base.prototype.epilogue = function () {
    var stats = this.stats;
    var fmt;

    console.log();

    // passes
    fmt = ' ' + ' %d passing';

    console.log(fmt,
    stats.passes || 0);

    // pending
    if (stats.pending) {
        fmt = ' ' + ' %d pending';

        console.log(fmt, stats.pending);
    }

    // failures
    if (stats.failures) {
        fmt = '  %d failing';

        console.log(fmt, stats.failures);

        Base.list(this.failures);
        console.log();
    }

    console.log();
};
