'use strict';

/*
    Simple example showing a filesystem based website
*/

var servr = require('../lib/index.js');

servr({
    host: 'localhost',
    port: 8080
}, {
    protocol: 'http',
    directories: {
        '/': {
            root: '../www/',
            options: '*',
            default: [ 'index.jshtml', 'index.html', 'default.html' ]
        }
    }
}).start();