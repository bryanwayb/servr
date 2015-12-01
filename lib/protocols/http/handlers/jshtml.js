'use strict';

var	mimetypes = require('../mimetypes.js'),
	jshtml = require('js-html');

function renderJsHtmlScript(render, response) {
    response.statusCode = 200;
    response.setHeader('Content-Type', mimetypes.EnumMimeType.HTML);
    response.end(render());
}

var scriptOptions = {
    syntaxCheck: true,
    format: true,
    mangle: true,
    optimize: true,
    minify: true,
    isolate: true
};

module.exports = function(buffer, request, response) {
    var script = jshtml.script(buffer, scriptOptions);
    var render = script.makeFunction();

    renderJsHtmlScript(render, response);
    return function(request, response) {
        renderJsHtmlScript(render, response);
    };
};