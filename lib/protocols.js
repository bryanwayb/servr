'use strict';

var HttpServer = require('./protocols/http.js');

var protocols = []; // A hash of function(instance, config) that, when one is called, returns a function that activates the protocol

protocols.http = function(instance, config) {
    return function() {
        HttpServer.prototype.listen.call(new HttpServer(instance, config, false));
    };
};
protocols.https = function(instance, config) {
    return function() {
        HttpServer.prototype.listen.call(new HttpServer(instance, config, true));
    };
};

module.exports = protocols;