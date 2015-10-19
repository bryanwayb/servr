var	mimetypes = require('../mimetypes.js'),
	JsHtml = require('js-html').JsHtml;

function renderJsHtmlScript(script, stream) {
    stream.writeHead(200, { 'Content-Type': mimetypes.EnumMimeType.HTML });
    stream.end(script.render());
}

module.exports = function(buffer, stream) {
    var jsHtmlScript = new JsHtml();
    jsHtmlScript.loadBuffer(buffer);

    renderJsHtmlScript(jsHtmlScript, stream);

    return function(s) {
        renderJsHtmlScript(jsHtmlScript, s);
    };
};