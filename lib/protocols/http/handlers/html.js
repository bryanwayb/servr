'use strict';

var mimetypes = require('../mimetypes.js');

module.exports = function(buffer, request, response) {
    response.statusCode = 200;
    response.setHeader('Content-Type', mimetypes.EnumMimeType.HTML);

    response.end(buffer);

    return function(request, response) {
        module.exports(buffer, request, response);
    };
};