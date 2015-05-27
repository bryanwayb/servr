var http = require('http');

var protocols = [];

protocols['http'] = function(instance, site, config) {
	return http.createServer(function(request, response) {
		try {
			response.write('Test Output');
		}
		catch(e) {
			response.write(e);
		}
		finally {
			response.end();
		}
	});
};

module.exports = protocols;