/**
 * @fileOverview Compact formatter
 */

module.exports = function(results) {
    var ctx = {
        output: "",
        total: 0,
    };

    results.forEach(function(result) {

        var messages = result.messages || result.getErrorList();
        ctx.total += messages.length;

        messages.forEach(function (message) {

            ctx.output += result.filePath + ": ";
            ctx.output += "line " + (message.line || 0);
            ctx.output += ", col " + (message.column || 0);
            ctx.output += ", " + getMessageType(message);
            ctx.output += " - " + message.message;
            ctx.output += message.ruleId ? " (" + message.ruleId + ")" : "";
            ctx.output += "\n";

        });

    });

    // finalize

    if (ctx.total > 0) {
        ctx.output += "\n" + ctx.total + " problem" + (ctx.total !== 1 ? "s" : "");
    }

    return ctx.output;
};

// Helpers

function getMessageType(message) {
    if (message.fatal || message.severity === 2) {
        return "Error";
    } else {
        return "Warning";
    }
}
