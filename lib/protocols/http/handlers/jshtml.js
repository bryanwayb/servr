'use strict';

var	mimetypes = require('../mimetypes.js'),
	JsHtml = require('js-html').JsHtml;

function renderJsHtmlScript(script, response) {
    response.writeHead(200, { 'Content-Type': mimetypes.EnumMimeType.HTML });
    response.end(script.render());
}

module.exports = function(buffer, request, response) {
    var jsHtmlScript = new JsHtml();
    jsHtmlScript.loadBuffer(buffer);

    renderJsHtmlScript(jsHtmlScript, response);

    return function(request, response) {
        renderJsHtmlScript(jsHtmlScript, response);
    };
};