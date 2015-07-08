/* File handlers based on MIME type */
var EnumMimeType = require('./mimetypes.js').EnumMimeType;

// module.exports['mimetype/here'] = function(filepath) { return processedFileContents; }

module.exports[EnumMimeType.HTML] = require('./handlers/html.js');