'use strict';

var servr = require('../lib/index.js'),
    logger = require('../lib/logger.js'),
    enums = require('../lib/enums.js');

// This is the actual server worker. This should only handle server operations, independent of
// cluster management (which should be handled by the command line entry file, index.js)
module.exports = function(configuration) {
    servr.pool(configuration).start();
    logger.log(enums.LogType.Info, 'listening');
};