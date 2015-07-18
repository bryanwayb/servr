var mimetypes = require('./mimetypes.js');

module.exports = function(code, stream) {
	stream.writeHead(code, { 'content-type': mimetypes.EnumMimeType.HTML });
	stream.end('HTTP Status: ' + code); // TODO: Return an actual file, or generate a response on the fly. Perhaps use JsHtml to make templates easier.
};