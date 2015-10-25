'use strict';

var vm = require('vm');

var rewriteVariableRegex = /\${(.+)}/g;

function processVariables(str, request, context) {
    var match;
    while((match = rewriteVariableRegex.exec(str)) != null) {
        var value;
        var variable = match[1].toLowerCase();

        switch(variable) {
            case 'useragent':
                value = request.headers['user-agent'];
                break;
            default:
                value = match[0];
                break;
        }

        if(context) {
            context[variable] = value;
            if(context.isProcessed) {
                continue;
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
        for(var i = 0; i < config.length; i++) {
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