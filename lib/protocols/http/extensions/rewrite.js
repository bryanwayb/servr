'use strict';

var vm = require('vm');

var rewriteVariableRegex = /\${(.+)}/g;

function processVariables(str, request, quotes) {
    var match;
    while((match = rewriteVariableRegex.exec(str)) != null) {
        var variable;

        switch(match[1].toLowerCase()) {
            case 'useragent':
                variable = request.headers['user-agent'];
                break;
            default:
                variable = match[0];
                break;
        }

        str = str.slice(0, match.index) + (quotes ? "\"" : "") + variable + (quotes ? "\"" : "") + str.slice(match.index + match[0].length);
    }

    return str;
}

module.exports = {
    url: function(config, url, request) {
        for(var i = 0; i < config.length; i++) {
            var current = config[i];
            
            if(current.condition) {
                // TODO: Optimize this to use a pre-compiled VM script, changing only the sandboxed properties
                // As it is now, this is open to script injection
                if(!vm.runInNewContext(processVariables(current.condition, request, true))) {
                    continue;
                }
            }
            
            if(typeof current.regex === 'string') {
                current.regex = new RegExp(current.regex, current.options);
            }

            url = url.replace(current.regex, processVariables(current.replace, request, false));
        }

        return url;
    }
};