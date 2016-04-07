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
                this.stream.write(prefix + '[' + Date.now() + ']: ' + subject + (error !== undefined ? '\n  ->' + error : '') + '\n');
            }
        }
        else {
            process.send({
                logType: logType,
                subject: subject,
                error: error,
                workerId: process.pid
            });
        }

        if(logType === enums.LogType.Fatal) {
            process.exit(1);
        }
    },
    level: 0,
    stream: null,
    useColor: false,
    workerMessage: function(message) {
        var msg = message.subject;
        if(msg == null) {
            msg = '';
        }
        module.exports.log(message.logType, '<' + message.workerId + '> ' + msg, message.error);
    }
};