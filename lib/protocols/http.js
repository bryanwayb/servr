var handlers = require('../handlers.js');

function HttpServer(instance, config, useHttps)
{
	this._server = undefined;
	this._config = config;
	this._instance = instance;
	
	if(useHttps) {
		this._server = require('https').createServer(config.ssl);
	}
	else {
		this._server = require('http').createServer();
	}
	
	var self = this;
	this._server.on('request', function(req, res) {
		self.request(req, res);
	});
}

HttpServer.prototype.request = function(request, response) {
	try {
		response.write('Test Output');
	}
	catch(e) {
		response.write(e);
	}
	finally {
		response.end();
	}
};

HttpServer.prototype.listen = function() {
	this._server.listen(this._instance._port, this._instance._host);
};
	
module.exports = HttpServer;