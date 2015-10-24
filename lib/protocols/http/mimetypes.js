'use strict';

var EnumMimeType = {
    HTML: 'text/html',
    JSHTML: 'text/jshtml'
};

var EnumMimeTypeExt = {
    '.html': EnumMimeType.HTML,
    '.jshtml': EnumMimeType.JSHTML
};

module.exports = {
    EnumMimeType: EnumMimeType,
    EnumMimeTypeExt: EnumMimeTypeExt
};