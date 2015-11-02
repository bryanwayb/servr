'use strict';

var vm = require('vm');

var rewriteVariableRegex = /\${(\w+)}/g;

var variableLookup = {
    'useragent': function(request) {
        return request.headers['user-agent'];
    }
};

function processVariables(str, request, context) {
    var match;
    while((match = rewriteVariableRegex.exec(str)) != null) {
        var value;
        var variable = match[1].toLowerCase();
        var getterFunction = variableLookup[variable];
        if(getterFunction) {
            value = getterFunction(request);
            if(context) {
                context[variable] = value;
                if(context.isProcessed) {
                    continue;
                }
            }
        }

        str = str.slice(0, match.index) + (context ? variable : value) + str.slice(match.index + match[0].length);
    }
    
    if(context) {
        if(context.isProcessed) {
            return;
        }
        context.isProcessed = true;
    }

    return str;
}

module.exports = {
    url: function(config, url, request) {
        var len = config.length;
        for(var i = 0; i < len; i++) {
            var current = config[i];

            if(current.condition) {
                if(!current._conditionScript) {
                    var context = { };
                    vm.createContext(context);
                    current._conditionScript = vm.createScript(processVariables(current.condition, request, context), { displayErrors: true });
                    current._conditionScript.context = context;
                }
                else {
                    processVariables(current.condition, request, current._conditionScript.context);
                }
                
                if(!current._conditionScript.runInContext(current._conditionScript.context)) {
                    continue;
                }
            }

            if(typeof current.regex === 'string') {
                current.regex = new RegExp(current.regex, current.options);
            }

            url = url.replace(current.regex, processVariables(current.replace, request));
        }

        return url;
    }
};