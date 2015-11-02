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

    this._hosts = [ '' ];
    if(config.hosts && typeof config.hosts === 'object') {
        for(var host in config.hosts) {
            if(config.hosts.hasOwnProperty(host)) {
                this._hosts.push(host);
            }
        }
    }

    this._useHosts = this._hosts.length > 1;
    
    this._context = { };
    for(var i = 0; i < this._hosts.length; i++) {
        var hostname = this._hosts[i];
        
        var contextEntry = {
            config: { },
            cache: {
                stat: { },
                files: { },
                handlers: { },
                directoryDefaults: { },
                urlMap: { }
            },
            rootPathMap: [ ], // Will store URL configuration variables that will be used at runtime
            extensions: {
                request: [ ], // When a request begins processing; return false to discontinue processing
                url: [ ] // Processes and allows manipulation of the requested URL before being locally mapped
            }
        };
        
        functions.mergeObjects(contextEntry.config, config);
        delete contextEntry.config.hosts;
        
        var hostConfig;
        if(config.hosts && (hostConfig = config.hosts[hostname])) {
            functions.mergeObjects(contextEntry.config, hostConfig);
        }
        
        functions.mergeObjects(contextEntry.config, { // Sets some default configuration options
            cache: {
                stat: true, // Stat checks on requested files/folders
                files: true, // Cache file contents
                handlers: true, // Enable/disable caching file handlers - overrides file content cache when enabled and handlers exist,
                directoryDefaults: true, // Caches resolved directory file index
                urlMap: true // When virutal directories are enabled this will cache indexes based on their URL
            }
        });
        
        // URL route configuration
        if(!contextEntry.config.directories['/']) { // '/' is required
            functions.makeError('No root path given for the required path \'/\'');
        }
    
        for(var urlPath in contextEntry.config.directories) {
            if(contextEntry.config.directories.hasOwnProperty(urlPath)) {
                var resolvedPath = path.resolve(confDirectory, contextEntry.config.directories[urlPath].root);
    
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
                    delete contextEntry.config.directories[urlPath];
                    continue;
                }
    
                var mapObject = {
                    url: urlPath,
                    reg: new RegExp(urlPath),
                    path: resolvedPath
                };
    
                if(mapObject.url === '/') { // Ensure the root directory is at the front, saves CPU time later on
                    contextEntry.rootPathMap.unshift(mapObject);
                }
                else {
                    contextEntry.rootPathMap.push(mapObject);
                }
            }
        }
    
        for(var extensionName in contextEntry.config.extensions) {
            if(contextEntry.config.extensions.hasOwnProperty(extensionName)) {
                try {
                    var ext = require(path.resolve(path.join(__dirname, 'extensions'), extensionName));
    
                    var extConfig = contextEntry.config.extensions[extensionName];
                    for(var prop in ext) {
                        if(ext.hasOwnProperty(prop) && contextEntry.extensions[prop]) {
                            var func = ext[prop];
                            func.config = extConfig;
                            contextEntry.extensions[prop].push(func);
                        }
                    }
                }
                catch(ex) {
                    functions.makeError('Error loading extension ' + extensionName, 1);
                }
            }
        }
        
        this._context[hostname] = contextEntry;
    }
}

HttpServer.prototype.request = function(request, response) {
    var context;
    var host = request.headers.host;
    if(this._useHosts) {
        if(host) {
            var portSeparatorPosition = host.indexOf(':');
            if(portSeparatorPosition !== -1) {
                host = host.slice(0, portSeparatorPosition);
            }
            
            if(this._hosts.indexOf(host) !== -1) {
                context = this._context[host];
            }
        }
    }
    
    if(!context) {
        context = this._context[''];
    }
    
    var i, len = context.extensions.request.length;
    for(i = 0; i < len; i++) {
        var requestInit = context.extensions.request[i];
        if(!requestInit.call(this, requestInit.config, request, response)) {
            return;
        }
    }

    var cacheEntry;
    var rawUrl = request.url;
    var filterUrl = rawUrl.replace(requestURLFilterRegex, '');

    // Apply URL manipulation
    len = context.extensions.url.length;
    for(i = 0; i < len; i++) {
        var func = context.extensions.url[i];
        filterUrl = func.call(this, func.config, filterUrl, request);
    }

    // Virtual directory maps
    var urlMapIndex = 0; // Default to '/'
    var matchLengthMax = 1;
    len = context.rootPathMap.length;
    if(len > 1) {
        if(context.config.cache.urlMap && (cacheEntry = context.cache.urlMap[filterUrl]) != null) {
            urlMapIndex = cacheEntry;
        }
        else {
            for(i = 0; i < len; i++) {
                var m = context.rootPathMap[i].reg.exec(filterUrl);
                if(m !== null && m.index === 0 && m[0].length >= matchLengthMax) {
                    urlMapIndex = i;
                    matchLengthMax = m[0].length;
                }
            }
        }
    }

    var physicalPath = path.join(context.rootPathMap[urlMapIndex].path, filterUrl.slice(matchLengthMax));

    if((cacheEntry = context.cache.stat[physicalPath])) {
        this._requestStatCallback(undefined, cacheEntry, context, physicalPath, urlMapIndex, request, response);
    }
    else {
        var self = this;
        fs.stat(physicalPath, function(error, stat) {
            self._requestStatCallback.call(self, error, stat, context, physicalPath, urlMapIndex, request, response);
        });
    }
};

HttpServer.prototype._requestStatCallback = function(error, stat, context, physicalPath, mapIndex, request, response) {
    if(!error) {
        if(stat.isDirectory()) {
            this._responseWriteDirectory(context, physicalPath, request, response, context.config.directories[context.rootPathMap[mapIndex].url].default);
        }
        else if(stat.isFile()) {
            this._responseWriteFile(context, physicalPath, request, response);
        }

        if(context.config.cache.stat) {
            context.cache.stat[physicalPath] = stat;
        }
    }
    else {
        this._errorPage(404, request, response);
    }
};

HttpServer.prototype._responseWriteDirectory = function(context, rootPath, request, response, files, currentIndex) { // Takes a single path and an array of files and generates a response
    var cacheEntry;
    if(!currentIndex) {
        if(context.config.cache.directoryDefaults && (cacheEntry = context.cache.directoryDefaults[rootPath]) != null) {
            currentIndex = cacheEntry;
        }
        else {
            currentIndex = 0;
        }
    }

    var currentPath = path.join(rootPath, files[currentIndex]);

    if(context.config.cache.handlers && (cacheEntry = context.cache.handlers[currentPath])) {
        cacheEntry(request, response);
    }
    else if(context.config.cache.files && (cacheEntry = context.cache.files[currentPath])) {
        this._responseWriteDirectoryReadFileCalback(undefined, cacheEntry, context, rootPath, request, response, files, currentIndex, currentPath);
    }
    else {
        var self = this;
        fs.readFile(currentPath, function(error, buffer) {
            self._responseWriteDirectoryReadFileCalback.call(self, error, buffer, context, rootPath, request, response, files, currentIndex, currentPath);
        });
    }
};

HttpServer.prototype._responseWriteDirectoryReadFileCalback = function(error, buffer, context, rootPath, request, response, files, currentIndex, currentPath) {
    if(!error) {
        var fileExtension = path.extname(currentPath);
        if(mimetypes.EnumMimeTypeExt[fileExtension]) {
            var cacheHandler = handlers[mimetypes.EnumMimeTypeExt[fileExtension]](buffer, request, response);
            if(cacheHandler && context.config.cache.handlers) {
                context.cache.handlers[currentPath] = cacheHandler;
            }
            else if(context.config.cache.files) {
                context.cache.files[currentPath] = buffer;
            }
        }
        else {
            response.end(buffer);

            if(context.config.cache.files) {
                context.cache.files[currentPath] = buffer;
            }
        }

        if(context.config.cache.directoryDefaults) {
            context.cache.directoryDefaults[rootPath] = currentIndex;
        }
    }
    else {
        if(++currentIndex < files.length) {
            this._responseWriteDirectory(context, rootPath, request, response, files, currentIndex);
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

HttpServer.prototype._responseWriteFile = function(context, filepath, request, response) {
    var cacheEntry;
    if(context.config.cache.handlers && (cacheEntry = context.cache.handlers[filepath])) {
        cacheEntry(request, response);
    }
    else if(context.config.cache.files && (cacheEntry = context.cache.files[filepath])) {
        this._responseWriteFileReadFileCallback(undefined, cacheEntry, context, request, response, filepath);
    }
    else {
        var self = this;
        fs.readFile(filepath, function(error, buffer) {
            self._responseWriteFileReadFileCallback.call(self, error, buffer, context, request, response, filepath);
        });
    }
};

HttpServer.prototype._responseWriteFileReadFileCallback = function(error, buffer, context, request, response, filepath) {
    if(!error) {
        var fileExtension = path.extname(filepath);
        if(mimetypes.EnumMimeTypeExt[fileExtension]) {
            var cacheHandler = handlers[mimetypes.EnumMimeTypeExt[fileExtension]](buffer, request, response);
            if(cacheHandler && context.config.cache.handlers) {
                context.cache.handlers[filepath] = cacheHandler;
            }
            else if(context.config.cache.files) {
                context.cache.files[filepath] = buffer;
            }
        }
        else {
            response.end(buffer);

            if(context.config.cache.files) {
                context.cache.files[filepath] = buffer;
            }
        }
    }
    else {
        this._errorPage(500, request, response);
    }
};

HttpServer.prototype._errorPage = function(code, request, response) {
    // This will one day be implemented in a JsHtml document, but until then we'll be using this
    response.writeHead(code, { 'Content-Type': mimetypes.EnumMimeType.HTML });
    response.end('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"><html><head><title>' + code + ' ' + this._http.STATUS_CODES[code] + '</title></head>' +
        '<body><h1>' + code + ' ' + this._http.STATUS_CODES[code] + '</h1><hr /><p style="font-style: italic;">' + npmPackage.name + '/' + npmPackage.version + '</p></body></html>');
};

HttpServer.prototype.listen = function() {
    this._server.listen(this._instance._port, this._instance._host);
};

module.exports = HttpServer;