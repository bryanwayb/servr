'use strict';

var	mimetypes = require('../mimetypes.js'),
	JsHtml = require('js-html').JsHtml;

function renderJsHtmlScript(script, response) {
    response.statusCode = 200;
    response.setHeader('content-type', mimetypes.EnumMimeType.HTML);

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