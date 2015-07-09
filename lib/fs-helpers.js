/**
 * Module dependencies.
 */

var PATH = require('path');
var FS = require('fs');
var GLOB = require('glob');

// var debug = require('debug')('violence:watch');

/**
 * Expose fs helpers.
 */

module.exports = {
    lookup: lookupFiles,
    files: files
};

/**
 * Ignored directories.
 */

var IGNORED = ['node_modules', '.git', '.svn'];

/**
 * Lookup file names at the given `path`.
 *
 * @api public
 * @param {string} path Base path to start searching from.
 * @param {string[]} extensions File extensions to look for.
 * @param {boolean} recursive Whether or not to recurse into subdirectories.
 * @return {string[]} An array of paths.
 */
function lookupFiles(path, extensions, recursive) {
    var files = [];
    var re = new RegExp('\\.(' + extensions.join('|') + ')$');

    if (!FS.existsSync(path)) {
        if (FS.existsSync(path + '.js')) {
            path += '.js';
        } else {
            files = GLOB.sync(path);
            if (!files.length) {
                throw new Error("cannot resolve path (or pattern) '" + path + "'");
            }
            return files;
        }
    }

    try {
        var stat = FS.statSync(path);
        if (stat.isFile()) {
            return path;
        }
    } catch (err) {
        // ignore error
        return;
    }

    FS.readdirSync(path).forEach(function(file) {
        var stat;
        file = PATH.join(path, file);
        try {
            stat = FS.statSync(file);
            if (recursive && stat.isDirectory()) {
                if (IGNORED.indexOf(PATH.basename(file)) !== -1) { // todo: rewrite
                    return;
                }
                files = files.concat(lookupFiles(file, extensions, recursive));
                return;
            }
        } catch (err) {
            // ignore error
            return;
        }
        if (!stat.isFile() || !re.test(file) || PATH.basename(file)[0] === '.') {
            return;
        }
        files.push(file);
    });

    return files;
}

/**
 * Lookup files in the given `dir`.
 *
 * @api private
 * @param {string} dir
 * @param {string[]} [ext=['.js']]
 * @param {Array} [ret=[]]
 * @return {Array}
 */
function files(dir, ext, ret) {
    ret = ret || [];
    ext = ext || ['js'];

    var re = new RegExp('\\.(' + ext.join('|') + ')$');

    FS.readdirSync(dir)
        .filter(ignored)
        .forEach(function(path) {
            path = PATH.join(dir, path);
            if (FS.statSync(path).isDirectory()) {
                files(path, ext, ret);
            } else if (path.match(re)) {
                ret.push(path);
            }
        });

    return ret;
}

/**
 * Ignored files.
 *
 * @api private
 * @param {string} path
 * @return {boolean}
 */
function ignored(path) {
    return !~ignore.indexOf(path);
}
