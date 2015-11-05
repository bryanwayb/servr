'use strict';

var zlib = require('zlib');

var EnumCompressionMethod = {
    Identity: 'identity',
    GZip: 'gzip',
    Deflate: 'deflate'
};

var PreferedCompressionOrder = [
    EnumCompressionMethod.GZip,
    EnumCompressionMethod.Deflate,
    EnumCompressionMethod.Identity
];

var CompressionFunc = { };
CompressionFunc[EnumCompressionMethod.Identity] = function(buffer, callback) {
    callback(undefined, buffer);
};

CompressionFunc[EnumCompressionMethod.GZip] = function(buffer, callback) {
    zlib.gzip(buffer, callback);
};

CompressionFunc[EnumCompressionMethod.Deflate] = function(buffer, callback) {
    zlib.deflate(buffer, callback);
};

module.exports = {
    request: function(config, request, response) {
        var resolvedCompMethod,
            resolvedQValue = -1,
            i,
            len;

        var acceptEncodingHeader = request.headers['accept-encoding'];
        if(acceptEncodingHeader) {
            var compressionSections = acceptEncodingHeader.split(',');

            len = compressionSections.length;
            for(i = 0; i < len; i++) {
                var subSections = compressionSections[i].split(';');
                var compMethod = subSections[0].trim().toLowerCase();

                var qvalue = 1;
                if(compMethod !== '*' && !config[compMethod]) {
                    qvalue = 0;
                }

                if(subSections.length > 1 && qvalue === 1) {
                    var qsections = subSections[1].split('=');
                    if(qsections.length > 1 && qsections[0].trim().toLowerCase() === 'q') {
                        qvalue = parseFloat(qsections[1]);
                    }
                }

                if(qvalue > resolvedQValue) {
                    resolvedCompMethod = compMethod;
                    resolvedQValue = qvalue;

                    if(qvalue === 1) {
                        break;
                    }
                }
            }
        }
        else {
            resolvedCompMethod = EnumCompressionMethod.Identity;
            resolvedQValue = 1;
        }

        if(resolvedQValue <= 0) {
            this._errorPage(406, request, response); // Return 406 - Not Acceptable
            return false;
        }
        else if(resolvedCompMethod === '*') {
            len = PreferedCompressionOrder.length;
            for(i = 0; i < len; i++) {
                if(config[PreferedCompressionOrder[i]]) {
                    break;
                }
            }

            if(i === len) {
                this._errorPage(406, request, response);
                return false;
            }
            else {
                resolvedCompMethod = PreferedCompressionOrder[i];
            }
        }
        
        var compress = CompressionFunc[resolvedCompMethod];
        
        if(compress) {
            response.setHeader('Content-Encoding', resolvedCompMethod);

            var response_write = response.write,
                response_end = response.end,
                buffer = '';
    
            // Emulate an instant write response, even though this is technically being buffered.
            response.write = function(data, encoding, callback) {
                if(typeof encoding === 'function') {
                    callback = encoding;
                    encoding = undefined;
                }
                
                if(data instanceof Buffer) {
                    data = data.toString(encoding);
                }
                
                buffer += data;
                
                if(callback) {
                    process.nextTick(callback);
                }
                
                return true;
            };
    
            var self = this;
            response.end = function(data, encoding, callback) {
                if(data) {
                    response.write.call(response, data, encoding, callback);
                }
    
                compress(buffer, function(error, compressed) {
                    response.write = response_write;
                    response.end = response_end;
                    
                    if(!error) {
                        response_end.call(response, compressed);
                    }
                    else {
                        response.removeHeader('Content-Encoding');
                        self._errorPage(500, request, response);
                    }
                });
            };
        }

        return true;
    }
};