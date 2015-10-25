'use strict';

var mimetypes = require('./mimetypes.js'),
    handlers = require('./handlers.js'),
    functions = require('../../functions.js'),
    path = require('path'),
    fs = require('fs'),
    npmPackage = require('../../../package.json');

var requestURLFilterRegex = /\/\.\.?/g;
var confDirectory = path.resolve(__dirname, '../../../conf');

function HttpServer(instance, config, useHttps) {
    this._server = undefined;
    this._instance = instance;

    functions.mergeObjects(config, { // Sets some default configuration options
        cache: {
            stat: true, // Stat checks on requested files/folders
            files: true, // Cache file contents
            handlers: true, // Enable/disable caching file handlers - overrides file content cache when enabled and handlers exist,
            directoryDefaults: true, // Caches resolved directory file index
            urlMap: true // When virutal directories are enabled this will cache indexes based on their URL
        }
    });
    this._config = config;

    this._cache = {
        stat: { },
        files: { },
        handlers: { },
        directoryDefaults: { },
        urlMap: { }
    };

    if(useHttps) {
        this._http = require('https');
        this._server = this._http.createServer(config.ssl);
    }
    else {
        this._http = require('http');
        this._server = this._http.createServer();
    }

    var self = this;
    this._server.on('request', function(req, res) {
        self.request(req, res);
    });

    // URL route configuration
    if(!this._config.directories['/']) { // '/' is required
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

    // Load extensions
    this._extensions = {
        url: [ ]
    };

    for(var extensionName in this._config.extensions) {
        if(this._config.extensions.hasOwnProperty(extensionName)) {
            try {
                var ext = require(path.resolve(path.join(__dirname, 'extensions'), extensionName));

                var extConfig = this._config.extensions[extensionName];
                for(var prop in ext) {
                    if(ext.hasOwnProperty(prop) && this._extensions[prop]) {
                        var func = ext[prop];
                        func.config = extConfig;
                        this._extensions[prop].push(func);
                    }
                }
            }
            catch(ex) {
                functions.makeError('Error loading extension ' + extensionName, 1);
            }
        }
    }
}

HttpServer.prototype.request = function(request, response) {
    var cacheEntry;

    var rawUrl = request.url;
    var filterUrl = rawUrl.replace(requestURLFilterRegex, '');

    var urlMapIndex = 0; // Default to '/'
    var matchLengthMax = 1;
    var i;
    if(this._rootPathMap.length > 1) {
        if(this._config.cache.urlMap && (cacheEntry = this._cache.urlMap[filterUrl]) != null) {
            urlMapIndex = cacheEntry;
        }
        else {
            for(i = 0; i < this._rootPathMap; i++) {
                var m = this._rootPathMap[i].reg.exec(filterUrl);
                if(m !== null && m.index === 0 && m[0].length >= matchLengthMax) {
                    urlMapIndex = i;
                    matchLengthMax = m[0].length;
                }
            }
        }
    }

    var relativeUrl = filterUrl.slice(matchLengthMax).trim();

    var resolvedUrl = relativeUrl;
    for(i = 0; i < this._extensions.url.length; i++) {
        var func = this._extensions.url[i];
        resolvedUrl = func.call(this, func.config, resolvedUrl, request);
    }

    var physicalPath = path.join(this._rootPathMap[urlMapIndex].path, resolvedUrl);

    if((cacheEntry = this._cache.stat[physicalPath])) {
        this._requestStatCallback(undefined, cacheEntry, physicalPath, urlMapIndex, request, response);
    }
    else {
        var self = this;
        fs.stat(physicalPath, function(error, stat) {
            self._requestStatCallback.call(self, error, stat, physicalPath, urlMapIndex, request, response);
        });
    }
};

HttpServer.prototype._requestStatCallback = function(error, stat, physicalPath, mapIndex, request, response) {
    if(!error) {
        if(stat.isDirectory()) {
            this._responseWriteDirectory(physicalPath, request, response, this._config.directories[this._rootPathMap[mapIndex].url].default);
        }
        else if(stat.isFile()) {
            this._responseWriteFile(physicalPath, request, response);
        }

        if(this._config.cache.stat) {
            this._cache.stat[physicalPath] = stat;
        }
    }
    else {
        this._errorPage(404, request, response);
    }
};

HttpServer.prototype._responseWriteDirectory = function(rootPath, request, response, files, currentIndex) { // Takes a single path and an array of files and generates a response
    var cacheEntry;
    if(!currentIndex) {
        if(this._config.cache.directoryDefaults && (cacheEntry = this._cache.directoryDefaults[rootPath]) != null) {
            currentIndex = cacheEntry;
        }
        else {
            currentIndex = 0;
        }
    }

    var currentPath = path.join(rootPath, files[currentIndex]);

    if(this._config.cache.handlers && (cacheEntry = this._cache.handlers[currentPath])) {
        cacheEntry(request, response);
    }
    else if(this._config.cache.files && (cacheEntry = this._cache.files[currentPath])) {
        this._responseWriteDirectoryReadFileCalback(undefined, cacheEntry, rootPath, request, response, files, currentIndex, currentPath);
    }
    else {
        var self = this;
        fs.readFile(currentPath, function(error, buffer) {
            self._responseWriteDirectoryReadFileCalback.call(self, error, buffer, rootPath, request, response, files, currentIndex, currentPath);
        });
    }
};

HttpServer.prototype._responseWriteDirectoryReadFileCalback = function(error, buffer, rootPath, request, response, files, currentIndex, currentPath) {
    if(!error) {
        var fileExtension = path.extname(currentPath);
        if(mimetypes.EnumMimeTypeExt[fileExtension]) {
            var cacheHandler = handlers[mimetypes.EnumMimeTypeExt[fileExtension]](buffer, request, response);
            if(cacheHandler && this._config.cache.handlers) {
                this._cache.handlers[currentPath] = cacheHandler;
            }
            else if(this._config.cache.files) {
                this._cache.files[currentPath] = buffer;
            }
        }
        else {
            response.end(buffer);

            if(this._config.cache.files) {
                this._cache.files[currentPath] = buffer;
            }
        }

        if(this._config.cache.directoryDefaults) {
            this._cache.directoryDefaults[rootPath] = currentIndex;
        }
    }
    else {
        if(++currentIndex < files.length) {
            this._responseWriteDirectory(rootPath, request, response, files, currentIndex);
        }
        else {
            if(this._options.listDirectory) {
                // TODO: Handle listing of directory contents
            }
            else {
                this._errorPage(403, request, response); // Create forbidden response
            }
        }
    }
};

HttpServer.prototype._responseWriteFile = function(filepath, request, response) {
    var cacheEntry;
    if(this._config.cache.handlers && (cacheEntry = this._cache.handlers[filepath])) {
        cacheEntry(request, response);
    }
    else if(this._config.cache.files && (cacheEntry = this._cache.files[filepath])) {
        this._responseWriteFileReadFileCallback(undefined, cacheEntry, request, response, filepath);
    }
    else {
        var self = this;
        fs.readFile(filepath, function(error, buffer) {
            self._responseWriteFileReadFileCallback.call(self, error, buffer, request, response, filepath);
        });
    }
};

HttpServer.prototype._responseWriteFileReadFileCallback = function(error, buffer, request, response, filepath) {
    if(!error) {
        var fileExtension = path.extname(filepath);
        if(mimetypes.EnumMimeTypeExt[fileExtension]) {
            var cacheHandler = handlers[mimetypes.EnumMimeTypeExt[fileExtension]](buffer, request, response);
            if(cacheHandler && this._config.cache.handlers) {
                this._cache.handlers[filepath] = cacheHandler;
            }
            else if(this._config.cache.files) {
                this._cache.files[filepath] = buffer;
            }
        }
        else {
            response.end(buffer);

            if(this._config.cache.files) {
                this._cache.files[filepath] = buffer;
            }
        }
    }
    else {
        this._errorPage(500, request, response);
    }
};

HttpServer.prototype._errorPage = function(code, request, response) {
    // This will one day be implemented in a JsHtml document, but until then we'll be using this
    response.writeHead(code, { 'content-type': mimetypes.EnumMimeType.HTML });
    response.end('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"><html><head><title>' + code + ' ' + this._http.STATUS_CODES[code] + '</title></head>' +
        '<body><h1>' + code + ' ' + this._http.STATUS_CODES[code] + '</h1><hr /><p style="font-style: italic;">' + npmPackage.name + '/' + npmPackage.version + '</p></body></html>');
};

HttpServer.prototype.listen = function() {
    this._server.listen(this._instance._port, this._instance._host);
};

module.exports = HttpServer;