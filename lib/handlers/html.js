var mimetypes = require('../mimetypes.js');

module.exports = function(buffer, stream) {
    stream.writeHead(200, { 'Content-Type': mimetypes.EnumMimeType.HTML });
    stream.end(buffer);

    return function(s) {
        module.exports(buffer, s);
    };
};