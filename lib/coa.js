#!/usr/bin/env node

/**
 * Module dependencies.
 */

var PATH = require('path'),
    FS = require('fs');

var COA = require('coa');

var Violence = require('../'),
    PKG = require('../package.json');

// Program.

module.exports = COA.Cmd()
    .helpful()
    .name(PKG.name)
    .title(PKG.description)
    .opt().flag().only().title('Version')
        .name('version').short('v').long('version')
        .act(function() {
            return PKG.version;
        })
        .end()

    .opt().title('Sets the current working dir that is omitted in the output')
        .name('cwd').long('cwd')
        .end()

    .opt().flag().title('Silence output')
        .name('silent').long('silent')
        .end()

    /*.opt().flag().title('Force disabling of colors')
        .name('noExit').short('C').long('no-colors')
        .end()*/

    .opt().flag().title('Force disabling of colors')
        .name('noColors').long('no-colors')
        .end()

    .opt().flag().title('Force enabling of colors')
        .name('colors').long('colors')
        .end()

    .opt().title('Specify the formatter to use')
        .name('formatter').short('F').long('formatter')
        .def('compact')
        .end()

    .opt().flag().title('Bail after first test failure')
        .name('bail').short('b').long('bail')
        .end()

    .opt().title('Only run tests matching <pattern>')
        .name('pattern').short('g').long('grep')
        .end()

    .opt().title('Only run tests containing <string>')
        .name('string').short('f').long('fgrep')
        .end()

    .opt().flag().title('Inverts --grep and --fgrep matches')
        .name('invert').short('i').long('invert')
        .end()

    .opt().arr().title('Configuration files')
        .name('config').short('c')
        .end()

    .arg().title('Source glob pattern matching files to check')
        .arr()
        .name('targets')
        .end()

    .completable()
    .act(function(opts, args) {

        var CWD = opts.cwd || process.cwd();

        var vio = new Violence();

        vio.scope.bail(opts.bail);

        // coloring
        if (opts.noColors) vio.useColors(false);
        if (opts.colors) vio.useColors(true);

        // filtering
        if (opts.pattern) vio.grep(new RegExp(opts.pattern));
        if (opts.string) vio.grep(opts.string);
        if (opts.invert) vio.invert();

        vio.formatter(opts.formatter);

        vio.targets(args.targets);

        var runner = vio.run(/*opts.noExit?*/ exitLater /*: exit*/);
    })

    .cmd()
        .name('formatters')
        .title('Show available formatters list')
        .act(function () {
            console.log();
            console.log('    compact - default formatter');
            console.log();
        })
        .end();

/**
 * Files.
 */

var files = [];

/**
 * Globals.
 */

var globals = [];

/**
 * Requires.
 */

var requires = [];

// reporter options

var reporterOptions = {};
if (0 && program.reporterOptions !== undefined) {
        program.reporterOptions.split(",").forEach(function(opt) {
                var L = opt.split("=");
                if (L.length > 2 || L.length === 0) {
                        throw new Error("invalid reporter option '" + opt + "'");
                } else if (L.length === 2) {
                        reporterOptions[L[0]] = L[1];
                } else {
                        reporterOptions[L[0]] = true;
                }
        });
}

// reporter

if (0)
mocha.reporter(program.reporter, reporterOptions);

// load reporter

try {
    if (0) Reporter = require('../lib/reporters/' + program.reporter);
} catch (err) {
    try {
        Reporter = require(program.reporter);
    } catch (err) {
        throw new Error('reporter "' + program.reporter + '" does not exist');
    }
}

// custom compiler support

var extensions = ['js'];
if (0)
program.compilers.forEach(function(c) {
    var compiler = c.split(':')
        , ext = compiler[0]
        , mod = compiler[1];

    if (mod[0] == '.') mod = PATH.join(process.cwd(), mod);
    require(mod);
    extensions.push(ext);
    program.watchExtensions.push(ext);
});




function exitLater(code) {
    process.on('exit', function() {
        process.exit(code);
    });
}

function exit(code) {
    // flush output for Node.js Windows pipe bug
    // https://github.com/joyent/node/issues/6247 is just one bug example
    // https://github.com/visionmedia/mocha/issues/333 has a good discussion
    function done() {
        if (!(draining--)) process.exit(code);
    }

    var draining = 0;
    var streams = [process.stdout, process.stderr];

    streams.forEach(function(stream){
        // submit empty write request and wait for completion
        draining += 1;
        stream.write('', done);
    });

    done();
}

process.on('SIGINT', function() {
    runner.abort();
});

/**
 * Hide the cursor.
 */

function hideCursor(){
    process.stdout.write('\u001b[?25l');
}

/**
 * Show the cursor.
 */

function showCursor(){
    process.stdout.write('\u001b[?25h');
}

/**
 * Stop play()ing.
 */

function stop() {
    process.stdout.write('\u001b[2K');
    clearInterval(play.timer);
}

/**
 * Play the given array of strings.
 */

function play(arr, interval) {
    var len = arr.length
        , interval = interval || 100
        , i = 0;

    play.timer = setInterval(function(){
        var str = arr[i++ % len];
        process.stdout.write('\u001b[0G' + str);
    }, interval);
}
