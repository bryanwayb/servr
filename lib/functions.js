/* Merges two objects together with rules applied based on denoting characters at the begginging of the key string
	! = Takes precedence over the corresponding tree. Throws error when both keys contain this.
	~ = Marked as unimportant, do not overwrite and only set from source when non-existant in dest. Can only be used in the source object. To escape a "~" as a key, use "~~"
	default = Merge as usual. Array objects get concat called on them, strings get concatenated together, and objects will repeate this process on their children.
*/
function mergeObjects(dest, source) {
	for(var property in source) {
		if(source.hasOwnProperty(property)) {
			var propertyWithoutChar = property.slice(1);
			
			if(property[0] === '!') {
				if(propertyWithoutChar[0] !== '!') {
					if(property in dest) {
						throw Error('Both source and destination keys for \'' + propertyWithoutChar + '\' have been marked as important. Cannot continue with merge.');
					}
					else if(('~' + propertyWithoutChar) in dest) {
						delete dest['~' + propertyWithoutChar];
					}
					
					dest[propertyWithoutChar] = source[property];
					continue;
				}
				else {
					property = propertyWithoutChar;
				}
			}
			
			if(property[0] === '~') {
				var important = (('!' + propertyWithoutChar) in dest);
				if(propertyWithoutChar !== '~' && !important) {
					if(!(property in dest) && !(propertyWithoutChar in dest)) {
						dest[propertyWithoutChar] = source[property];
					}
					continue;
				}
				
				if(important) {
					delete dest['!' + propertyWithoutChar];
				}
				
				property = propertyWithoutChar;
			}
			
			// If we made it this far we can go ahead and make do normal merge processing.
			if(!(('!' + property) in dest)) {
				if(typeof source[property] === 'string') {
					if(dest[property] && typeof dest[property] !== 'string') {
						throw Error('Mismatched types for keys \'' + property + '\', expected a string');
					}
					else if(!(property in dest)) {
						dest[property] = '';
					}
					dest[property] = dest[property] + source[property];
				}
				else if(source[property].constructor === Array) {
					if(dest[property] && dest[property].constructor !== Array) {
						throw Error('Mismatched types for keys \'' + property + '\', expected an array');
					}
					else if(!(property in dest)) {
						dest[property] = [];
					}
					
					for(var i = 0; i < source[property].length; i++) {
						if(dest[property].indexOf(source[property]) === -1) {
							dest[property].push(source[property]);
						}
					}
				}
				else if(property in dest) {
					if(typeof source[property] !== typeof dest[property]) {
						throw Error('Mismatched types for keys \'' + property + '\', expected an array');
					}
					else {
						mergeObjects(dest[property], source[property]);
					}
				}
				else {
					dest[property] = source[property];
				}
			}
		}
	}
	
	for(var property in dest) {
		if(dest.hasOwnProperty(property)) {
			if(property[0] === '!' && property[1] !== '!') {
				dest[property.slice(1)] = dest[property];
				delete dest[property];
			}
		}
	}
}

function buildFlatArray(args, source) { // Builds a one dimensional array from a multidimensional array and removes duplicates
	if(!args) {
		return;
	}

	if(args.constructor === Array) {
		if(!source) {
			source = [];
		}
		for(var i = 0; i < args.length; i++) {
			buildFlatArray(args[i], source);
		}
	}
	else {
		if(source.indexOf(args) === -1) {
			source.push(args);
		}
	}
	return source;
}

var outputEnabledEnvironmentVariable = '_WEB_MASTER_OUTPUT_CHILD';
var outputEnabled = process.env['_WEB_MASTER_OUTPUT_CHILD'] == 'true';

function makeWarning(message) {
	if(outputEnabled) {
		console.warn('\x1b[33mWARNING:\x1b[0m', message);
	}
}

function makeInfo(message) {
	if(outputEnabled) {
		console.info('\x1b[32mInfo:\x1b[0m', message);
	}
}

function makeError(message, exitCode) {
	if(outputEnabled) {
		console.error('\x1b[31m' + (exitCode !== undefined ? 'FATAL ERROR:' : 'ERROR:') + '\x1b[0m', message);
	}
	
	if(exitCode !== undefined) {
		process.exit(exitCode);
	}
}

module.exports = {
	mergeObjects: mergeObjects,
	buildFlatArray: buildFlatArray,
	makeWarning: makeWarning,
	makeError: makeError,
	makeInfo: makeInfo,
	outputEnabledEnvironmentVariable: outputEnabledEnvironmentVariable
}