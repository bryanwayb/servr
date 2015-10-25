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
CompressionFunc[EnumCompressionMethod.Identity] = function(buffer) {
    return buffer;
};

CompressionFunc[EnumCompressionMethod.GZip] = function(buffer) {
    return zlib.gzipSync(buffer);
};

CompressionFunc[EnumCompressionMethod.Deflate] = function(buffer) {
    return zlib.deflateSync(buffer);
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
                if(!config[compMethod] && compMethod !== '*') {
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
        
        response.setHeader('content-encoding', resolvedCompMethod);
        
        var responseWrite = response.write;
        response.write = function() {
            arguments[0] = CompressionFunc[resolvedCompMethod](arguments[0]);
            responseWrite.apply(response, arguments);
        };
        
        return true;
    }
};