'use strict';

var enums = require('./enums.js');

module.exports = {
    log: function(logType, subject, error) {
        if(this.level < logType) {
            return;
        }

        if(this.stream) {
            this.stream.write(enums.LogTypeTheme[logType](enums.LogTypeString[logType]) + ': ' + subject + (error !== undefined ? '\n' + error : '') + '\n');
        }

        if(logType === enums.LogType.Fatal) {
            process.exit(1);
        }
    },
    level: 0,
    stream: null
};