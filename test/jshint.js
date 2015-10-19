var jshint = require('jshint').JSHINT,
    fs = require('fs'),
    path = require('path'),
    colors = require('colors');

var config = require('./jshint.json');

var totalFiles = 0;
var returnCode = 0;

function recursiveJSHintDirectory(dir) {
    var dirList = fs.readdirSync(dir);
    for(var i in dirList) {
        if(dirList.hasOwnProperty(i)) {
            var pathname = path.join(dir, dirList[i]);
            if(fs.statSync(pathname).isDirectory()) {
                recursiveJSHintDirectory(pathname);
            }
            else if (path.extname(pathname).toLowerCase() === '.js') {
                jshint(fs.readFileSync(pathname).toString(), config);
                
                var success = jshint.errors.length === 0;
                var printColor = success ? colors.green : colors.red;
                console.log(printColor('[' + (success ? 'PASS' : 'FAIL') + '] ') + pathname);
                
                totalFiles++;
                if(!success) {
                    console.log('  ' + jshint.errors.length + ' error' + (jshint.errors.length === 1 ? '' : 's'));
                    
                    for(var o in jshint.errors) {
                        if(jshint.errors.hasOwnProperty(o)) {
                            console.log('  [' + jshint.errors[o].line + ', ' + jshint.errors[o].character + ']: ' + jshint.errors[o].reason);
                        }
                    }
                    
                    console.log();
                    
                    returnCode++;
                }
            }
        }
    }
}

recursiveJSHintDirectory(path.resolve(__dirname, '../bin'));
recursiveJSHintDirectory(path.resolve(__dirname, '../lib'));

console.log('\n' + (totalFiles - returnCode) + '/' + totalFiles + ' files passed');

process.exit(returnCode);