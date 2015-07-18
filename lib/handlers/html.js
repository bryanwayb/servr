var fs = require('fs');

module.exports = function(buffer, stream) {
	stream.end(buffer);
};