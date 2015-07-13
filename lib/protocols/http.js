var mimetypes = require('../mimetypes.js'),
	handlers = require('../handlers.js'),
	functions = require('../functions.js'),
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
		functions.makeError('No root path given for the required path \'/\'');
	}
	
	this._rootPathMap = []; // Will store URL configuraiton variables that will be used at runtime
	
	for(var urlPath in this._config.directories) {
		if(this._config.directories.hasOwnProperty(urlPath)) {
			var resolvedPath = path.resolve(confDirectory, this._config.directories[urlPath].root);
			
			var deleteFromDirList = false;
			try {
				if(!fs.statSync(resolvedPath).isDirectory()) { // TODO: Allow lstat and isSymbolicLink() with options
					functions.makeWarning('Path \'' + resolvedPath + '\' is not a directory');
					deleteFromDirList = true;
				}
			}
			catch(error) {
				functions.makeWarning('Directory \'' + resolvedPath + '\' does not exist');
				deleteFromDirList = true;
			}
			
			if(deleteFromDirList) {
				delete this._config.directories[urlPath];
				continue;
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
	
	this._context = handlers.makeHandleContext(); // Use a global context object to reduce V8 overhead of recompilation
}

HttpServer.prototype.request = function(request, response) {
	this._context.rawUrl = request.url;
	this._context.filterUrl = this._context.rawUrl.replace(requestURLFilterRegex, '');
	
	var urlMapIndex = 0; // Default to '/'
	var matchLengthMax = 1;
	if(this._rootPathMap.length > 1) {
		for(var current in this._rootPathMap) {
			var m = this._rootPathMap[current].reg.exec(this._context.filterUrl);
			if(m != null && m.index === 0 && m[0].length >= matchLengthMax) {
				urlMapIndex = current;
				matchLengthMax = m[0].length;
			}
		}
	}
	
	this._context.relativeUrl = this._context.filterUrl.slice(matchLengthMax).trim();
	
	// TODO: Fix this
	this._context.resolvedUrl = this.context.relativeUrl;
	
	response.end(this._context.relativeUrl);

	
	/*var physicalPath = path.join(this._rootPathMap[urlMapIndex].path, relativePath);
	fs.stat(physicalPath, function(error, stats) {
		if(!error) {
			if(stats.isDirectory()) {
				response.end('Directory');
			}
			else if(stats.isFile()) {
				response.end(handlers.Handles[mimetypes.EnumMimeTypeExt[path.extname(relativePath)]](physicalPath));
			}
		}
		else {
			response.end('404');
		}
	});*/
};

HttpServer.prototype.listen = function() {
	this._server.listen(this._instance._port, this._instance._host);
};
	
module.exports = HttpServer;