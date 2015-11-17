'use strict';

var servr = require('../lib/index.js');

// This is the actual server worker. This should only handle server operations, independent of
// cluster management (which should be handled by the command line entry file, index.js)
module.exports = function(configuration) {
    servr.ServerPool(configuration).start();
};