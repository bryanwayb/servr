/* File handlers based on MIME type */
var EnumMimeType = require('./mimetypes.js').EnumMimeType;

// module.exports['mimetype/here'] = function(fileBuffer, responseStream) { return function(response) { /* handle response here */ }; };
/*
	A bit of explination for this section might be needed for the returned function in the example above.
	The mime type handler should respond with a function that can be called to duplicate the response
	that was just processed for caching purposes. Usually it's as simple as just calling the handler
	again with the fileBuffer but there may be situations where more complicated configurations will be
	needed, such as with JsHtml where scripts are compiled each time they are loaded and stored into
	an object. In those situations, this would be much more useful than having the calling code	handle
	caching on its own.
*/

module.exports[EnumMimeType.HTML] = require('./handlers/html.js');
module.exports[EnumMimeType.JSHTML] = require('./handlers/jshtml.js');