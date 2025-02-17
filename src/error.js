/*
JustServer/error.js

Simple web server package for Node.js.

by JustNode Dev Team / JustApple
*/

//load classes and functions
const processFinal = require('./final.js');

//process HandleObject error
async function processError(req, res, map, p, e) {
	try {
		//500 error
		return await processFinal(req, res, map['!500'] ?? e.default['!500'] ?? { //default error response
			'+STATUS': 500,
			'TEXT': '500 Internal server error.'
		}, p, e);
	} catch (err) {
		//last error response
		try { res.writeHead(500, { 'Content-Type': 'text/plain' }); } catch { }
		try { res.end('500 Internal server error.'); } catch { }
		
		//emit error
		e.emitError(err);
		return;
	}
}

//export
module.exports = processError;