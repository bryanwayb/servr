'use strict';

var servr = require('../lib/index.js');

module.exports = {
    'API Access': function(test) {
        test.notEqual(servr.pool, undefined, 'servr.pool function is not defined');

        var instance = servr('*:1337', {
        });
        test.notEqual(instance.start, undefined, 'servr.prototype.start function is not defined');

        instance = servr.pool({
            '*:1337': {
            }
        });
        test.notEqual(instance.start, undefined, 'servr.pool.prototype.start function is not defined');

        test.done();
    }
};