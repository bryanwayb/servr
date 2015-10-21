var mimetypes = require('../mimetypes.js');

module.exports = function(buffer, request, response) {
    response.writeHead(200, { 'Content-Type': mimetypes.EnumMimeType.HTML });
    response.end(buffer);

    return function(request, response) {
        module.exports(buffer, request, response);
    };
};