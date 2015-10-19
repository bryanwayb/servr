var jshint = require('jshint').JSHINT,
    fs = require('fs'),
    path = require('path'),
    colors = require('colors'),
    JSCS = require('jscs');

var argv = require('minimist')(process.argv.slice(2));

var allowFix = argv.fix || argv.f;
var totalFiles = 0;
var totalErrorsInFiles = 0;
var totalFixableErrorsInFiles = 0;
var returnCode = 0;

function recursiveCheckDirectory(dir) {
    var dirList = fs.readdirSync(dir);
    for(var i in dirList) {
        if(dirList.hasOwnProperty(i)) {
            var pathname = path.join(dir, dirList[i]);
            if(fs.statSync(pathname).isDirectory()) {
                recursiveCheckDirectory(pathname);
            }
            else if (path.extname(pathname).toLowerCase() === '.js') {
                var fileContents = fs.readFileSync(pathname).toString();
                var totalErrors = 0;
                
                jshint(fileContents, require('./jshint.json'));
                totalErrors += jshint.errors.length;
                
                var jscsChecker = new JSCS();
                jscsChecker.registerDefaultRules();
                jscsChecker.configure(require('./jscs.json'));
                var jscsErrors = jscsChecker.checkString(fileContents).getErrorList();
                totalErrors += jscsErrors.length;
                
                var jscsFixableErrors = 0;
                for(var o in jscsErrors) {
                    if(jscsErrors.hasOwnProperty(o) && jscsErrors[o].fixed) {
                        jscsFixableErrors++;
                        totalFixableErrorsInFiles++;
                    }
                }
                
                if(allowFix) {
                    totalErrors -= jscsFixableErrors;
                }
                
                var success = totalErrors === 0;
                totalErrorsInFiles += totalErrors;
                
                var printColor = success ? colors.green : colors.red;
                console.log(printColor('[' + (success ? 'PASS' : 'FAIL') + '] ') + pathname);
                
                totalFiles++;
                if(!success || jscsFixableErrors > 0) {
                    console.log('  ' + totalErrors + ' error' + (totalErrors === 1 ? '' : 's'));
                    
                    if(jscsFixableErrors > 0) {
                        console.log('  ' + jscsFixableErrors + ' fixable error' + (jscsFixableErrors === 1 ? '' : 's'));
                    }
                    
                    for(var o in jshint.errors) {
                        if(jshint.errors.hasOwnProperty(o)) {
                            console.log(colors.red('    code  [' + jshint.errors[o].line + ', ' + jshint.errors[o].character + ']: ' + jshint.errors[o].reason));
                        }
                    }

                    for(var o in jscsErrors) {
                        if(jscsErrors.hasOwnProperty(o)) {
                            console.log((jscsErrors[o].fixed && allowFix ? colors.green : colors.yellow)('    style [' + jscsErrors[o].line + ', ' + jscsErrors[o].column + ']: ' + jscsErrors[o].message + (jscsErrors[o].fixed ? ' (fix' + (allowFix ? 'ed' : 'able') + ')' : '')));
                        }
                    }
                    
                    console.log();
                    
                    if(jscsFixableErrors > 0 && allowFix) {
                        fs.writeFileSync(pathname, jscsChecker.fixString(fileContents).output);
                    }
                    
                    if(!success) {
                        returnCode++;
                    }
                }
            }
        }
    }
}

recursiveCheckDirectory(path.resolve(__dirname, '../bin'));
recursiveCheckDirectory(path.resolve(__dirname, '../lib'));

console.log('\n' + (totalFiles - returnCode) + '/' + totalFiles + ' files passed (' + totalErrorsInFiles + ' error' + (totalErrorsInFiles === 1 ? '' : 's') + ', ' + totalFixableErrorsInFiles + ' fix' + (allowFix ? 'ed' : 'able') + ')');

process.exit(allowFix ? 0 : returnCode);