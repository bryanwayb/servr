'use strict';

var mimetypes = require('./mimetypes.js'),
    http = require('http');

var npmPackage = require('../package.json');

module.exports = function(code, request, response) {
    response.writeHead(code, { 'content-type': mimetypes.EnumMimeType.HTML });
    response.end('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"><html><head><title>' + code + ' ' + http.STATUS_CODES[code] + '</title></head>' +
        '<body><h1>' + code + ' ' + http.STATUS_CODES[code] + '</h1><hr /><p style="font-style: italic;">' + npmPackage.name + '/' + npmPackage.version + '</p></body></html>');
};