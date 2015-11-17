var colors = require('colors');

module.exports = {
    LogType: {
        Info: 0x0,
        Warning: 0x1,
        Error: 0x2,
        Critical: 0x3,
        Fatal: 0x4
    },
    LogTypeString: [
        'Info',
        'Warning',
        'Error',
        'Critical',
        'Fatal'
    ],
    LogTypeTheme: [
        colors.green,
        colors.yellow,
        colors.red,
        colors.red.bold,
        colors.red.bold
    ],
    WorkerMessages: {
        Configuration: 'configuration'
    }
};