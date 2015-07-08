var handlers = require('../handlers.js'),
	path = require('path'),
	fs = require('fs');

var requestURLFilterRegex = /\/\.\.?/g;
var confDirectory = path.resolve(__dirname, '../../conf');

console.log(confDirectory);

function HttpServer(instance, config, useHttps) {
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
	
	
	// URL route configuration
	if(!('/' in this._config.directories)) { // '/' is required
		throw new Error('No root path given for the required path \'/\'');
	}
	
	this._rootPathMap = []; // Will store URL configuraiton variables that will be used at runtime
	
	for(var urlPath in this._config.directories) {
		if(this._config.directories.hasOwnProperty(urlPath)) {
			var resolvedPath = path.resolve(confDirectory, this._config.directories[urlPath].root);
			
			if(!fs.statSync(resolvedPath).isDirectory()) { // TODO: Allow lstat and isSymbolicLink() with options
				throw new Error('Path \'' + resolvedPath + '\' does not exist or is not a directory');
			}
			
			var mapObject = {
				url: urlPath,
				reg: new RegExp(urlPath),
				path: resolvedPath
			};
			
			if(mapObject.url === '/') { // Ensure the root directory is at the front, saves CPU time later on
				this._rootPathMap.unshift(mapObject);
			}
			else {
				this._rootPathMap.push(mapObject);
			}
		}
	}
}

HttpServer.prototype.request = function(request, response) {
	var url = request.url.replace(requestURLFilterRegex, '');
	
	var urlMapIndex = 0; // Default to '/'
	if(this._rootPathMap.length > 1) {
		var matchLengthMax = 0;
		for(var current in this._rootPathMap) {
			var m = this._rootPathMap[current].reg.exec(url);
			if(m != null && m.index === 0 && m[0].length >= matchLengthMax) {
				urlMapIndex = current;
				matchLengthMax = m[0].length;
			}
		}
	}
	
	response.end(this._rootPathMap[urlMapIndex].path);
};

HttpServer.prototype.listen = function() {
	this._server.listen(this._instance._port, this._instance._host);
};
	
module.exports = HttpServer;