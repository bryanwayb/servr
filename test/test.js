'use strict';

var servr = require('../lib/index.js');

module.exports = {
    'API Access': function(test) {
        test.notEqual(servr.Server, undefined, 'servr.Server function is not defined');
        
        test.done();
    }
};