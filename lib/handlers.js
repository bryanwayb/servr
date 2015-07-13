/* File handlers based on MIME type */
var EnumMimeType = require('./mimetypes.js').EnumMimeType;

function makeHandleContext() { // Creates an object for grouped storage
	return {
		rawUrl: undefined,			// Raw URL as received from the request
		filterUrl: undefined,		// Post filtering for malicious URL requests (e.g. '/../files.txt' becomes '/files.txt')
		relativeUrl: undefined,		// The URL relative to the current virtual direcotry configuration. (A virtual directory of '/virtual/' would alter a '/virtual/path/file.txt' to 'path/file.txt')
		resolvedUrl: undefined,		// URL once post processing has been applied, if any exist (i.e. rewrites, default files, etc...)
		physicalUrl: undefined,		// Final translation to a physical path that will be used for further processing
	};
}

// handles['mimetype/here'] = function(filepath) { return processedFileContents; }

var handles = { };
handles[EnumMimeType.HTML] = require('./handlers/html.js');

module.exports = {
	makeHandleContext: makeHandleContext,
	Handles: handles
};