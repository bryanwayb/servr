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
CompressionFunc[EnumCompressionMethod.Identity] = function(response) {
    return response;
};

function makeLikeResponse(dest, response) { // Give the returned object functions used from the actual response that was passed.
    dest.setHeader = function() {
        response.setHeader.apply(response, arguments);
    };
}

CompressionFunc[EnumCompressionMethod.GZip] = function(response) {
    var ret = zlib.createGzip();
    ret.pipe(response);
    makeLikeResponse(ret, response);
    return ret;
};

CompressionFunc[EnumCompressionMethod.Deflate] = function(response) {
    var ret = zlib.createGzip();
    ret.pipe(response);
    makeLikeResponse(ret, response);
    return ret;
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
            return compress(response);
        }

        return response;
    }
};