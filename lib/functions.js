'use strict';

/* Merges two objects together with rules applied based on denoting characters at the begginging of the key string
    ! = Takes precedence over the corresponding tree. Throws error when both keys contain this.
    ~ = Marked as unimportant, do not overwrite and only set from source when non-existant in dest. Can only be used in the source object. To escape a "~" as a key, use "~~"
    default = Merge as usual. Array objects get concat called on them, strings get concatenated together, and objects will repeat this process on their children.
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

                    var len = source[property].length;
                    for(var i = 0; i < len; i++) {
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

    for(var destProperty in dest) {
        if(dest.hasOwnProperty(destProperty)) {
            if(destProperty[0] === '!' && destProperty[1] !== '!') {
                dest[destProperty.slice(1)] = dest[destProperty];
                delete dest[destProperty];
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
        var len = args.length;
        for(var i = 0; i < len; i++) {
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

module.exports = {
    mergeObjects: mergeObjects,
    buildFlatArray: buildFlatArray
};