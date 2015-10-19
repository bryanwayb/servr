var Server = require('./server.js');

function ServerPool(config) {
    this._pool = [];
    this._config = config;

    if(config) {
        for(var site in config.hosts) {
            if(config.hosts.hasOwnProperty(site)) {
                this._pool.push(new Server(site, config.hosts[site]));
            }
        }
    }
}

ServerPool.prototype.start = function() {
    for(var server in this._pool) {
        if(this._pool.hasOwnProperty(server)) {
            this._pool[server].start();
        }
    }
};

module.exports = function(config) {
    return new ServerPool(config);
};