const c = require('colors/safe')
const util = require('util')

function formatArgs(args){
    return util.format.apply(util.format, Array.prototype.slice.call(args));
}

console.sys = function() {
    console.log(
        c.green('[SYSTEM]'),
        `[ ${new Date().toUTCString()} ]`,
        formatArgs(arguments)
    )
};

console.siem = function() {
    console.log(
        c.green('[SEIM]'),
        formatArgs(arguments)
    )
};

console.info = function() {
    console.log(
        c.green('[INFO]'),
        `[ ${new Date().toUTCString()} ]`,
        formatArgs(arguments)
    )
};

console.warn = function() {
    console.log(
        c.yellow('[WARN]'),
        `[ ${new Date().toUTCString()} ]`,
        formatArgs(arguments)
    )
};

console.error = function() {
    console.log(
        c.red('[ERROR]'),
        `[ ${new Date().toUTCString()} ]`,
        formatArgs(arguments)
    )
};