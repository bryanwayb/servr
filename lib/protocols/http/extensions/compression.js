'use strict';

function applyCompression(buffer) {
    return buffer;
}

module.exports = {
    request: function(config, request, response) {
        var responseWrite = response.write;
        
        console.log(request.headers);
        
        response.write = function() {
            arguments[0] = applyCompression(arguments[0]);
            responseWrite.apply(response, arguments);
        };
    }
};