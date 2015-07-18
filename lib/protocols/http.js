var mimetypes = require('../mimetypes.js'),
	handlers = require('../handlers.js'),
	functions = require('../functions.js'),
	path = require('path'),
	httpStatus = require('../httpStatus.js'),
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
	
	this._options = { }; // TODO: Setup
}

HttpServer.prototype.request = function(request, response) {
	var rawUrl = request.url;
	var filterUrl = rawUrl.replace(requestURLFilterRegex, '');
	
	var urlMapIndex = 0; // Default to '/'
	var matchLengthMax = 1;
	if(this._rootPathMap.length > 1) {
		for(var current in this._rootPathMap) {
			var m = this._rootPathMap[current].reg.exec(filterUrl);
			if(m != null && m.index === 0 && m[0].length >= matchLengthMax) {
				urlMapIndex = current;
				matchLengthMax = m[0].length;
			}
		}
	}
	
	var relativeUrl = filterUrl.slice(matchLengthMax).trim();
	
	// TODO: Resolve rewrites rules here
	var resolvedUrl = relativeUrl;
	
	var physicalPath = path.join(this._rootPathMap[urlMapIndex].path, resolvedUrl);
	var self = this;
	fs.stat(physicalPath, function(error, stat) {
		if(!error) {
			if(stat.isDirectory()) {
				HttpServer.prototype._responseWriteDirectory.call(self, physicalPath,
					self._config.directories[self._rootPathMap[urlMapIndex].url].default, response);
			}
		}
	});
};

HttpServer.prototype._responseWriteDirectory = function(rootPath, files, response) { // Takes a single path or an array of paths and generates a response
	var responseFinished = false, checkCount = 0, self = this;
	for(var i in files) {
		(function(currentPath) {
			fs.readFile(currentPath, function(error, buffer) {
				checkCount++;
				if(!error && !responseFinished) {
					responseFinished = true;
					
					var fileExtension = path.extname(currentPath);
					if(fileExtension in mimetypes.EnumMimeTypeExt) {
						var fileMimeType = mimetypes.EnumMimeTypeExt[fileExtension];
						response.writeHead(200, { 'Content-Type' : fileMimeType });
						handlers[fileMimeType](buffer, response);
					}
					else {
						response.end(buffer);
					}
				}
				else if(checkCount == files.length) {
					if(self._options.listDirectory) {
						// TODO: Handle listing of directory contents
					}
					else {
						httpStatus(403, response); // Create forbidden response
					}
				}
			});
		})(path.join(rootPath, files[i]));
	}
};

HttpServer.prototype.listen = function() {
	this._server.listen(this._instance._port, this._instance._host);
};
	
module.exports = HttpServer;