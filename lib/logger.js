'use strict';

var enums = require('./enums.js');

var outputEnabledEnvironmentVariable = '_WEB_MASTER_OUTPUT_CHILD';
var outputEnabled = process.env[outputEnabledEnvironmentVariable] === 'true' || require('cluster').isMaster;

module.exports = {
    log: function(logType, subject, error) {
        if(outputEnabled) {
            console.log(enums.LogTypeTheme[logType](enums.LogTypeString[logType]) + ': ' + subject + (error !== undefined ? '\n' + error : ''));
        }

        if(logType === enums.LogType.Fatal) {
            process.exit(1);
        }
    },
    outputEnabledEnvironmentVariable: outputEnabledEnvironmentVariable
};