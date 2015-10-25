'use strict';

var protocols = require('./protocols.js');

function Server(host, config) { // host can be either a string 'ip:port' (ip can be a hostname or wildcard), or can be an object as { host, port }
    this._host = undefined;
    this._port = 80; // Default to port 80

    if(typeof host === 'string') {
        var hostParts = host.split(':');
        this._host = hostParts[0];
        if(hostParts.length > 1) {
            this._port = hostParts[1];
        }
    }
    else if(typeof host === 'object') {
        this._host = host.host;
        if(host.port) {
            this._port = host.port;
        }
    }

    if(this._host === '*') {
        this._host = undefined;
    }

    this._protocolInstance = undefined;

    if(config) {
        this._config = config;
        this._protocolInstance = protocols[config.protocol || 'http'](this, this._config);
    }
}

Server.prototype.start = function() {
    if(this._protocolInstance) {
        this._protocolInstance();
    }
};

module.exports = Server;