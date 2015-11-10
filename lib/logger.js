'use strict';

var enums = require('./enums.js'),
    cluster = require('cluster');

module.exports = {
    log: function(logType, subject, error) {
        if(this.level > logType) {
            return;
        }

        if(cluster.isMaster) {
            if(this.stream) {
                var prefix = this.useColor ? enums.LogTypeTheme[logType](enums.LogTypeString[logType]) : enums.LogTypeString[logType];
                this.stream.write(prefix + '[' + Date.now() + ']: ' + subject + (error !== undefined ? '\n' + error : '') + '\n');
            }
        }
        else {
            process.send(arguments);
        }

        if(logType === enums.LogType.Fatal) {
            process.exit(1);
        }
    },
    level: 0,
    stream: null,
    useColor: false,
    workerMessage: function(message) {
        module.exports.log(message[0], message[1], message[2]);
    }
};