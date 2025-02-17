/*
JustServer/map.js

Simple web server package for Node.js.

by JustNode Dev Team / JustApple
*/

//load classes and functions
const processHandle = require('./handle.js');
const processFinal = require('./final.js');
const processError = require('./error.js');

//process MapObject
async function processMap(req, res, map, p, e) {
	//overwrite default handle object
	Object.assign(e.default, map['#']);
	
	//path ends, process HandleObject
	if (p.length === 0) return await processHandle(req, res, map, p, e);
	
	//specific path
	if (map['/' + p[0]]) return await processMap(req, res, map['/' + p.shift()], p, e);
	
	//any path
	if (map['*']) {
		p.shift(); //remove first one
		return await processMap(req, res, map['*'], p, e);
	}
	
	//any path following
	if (map['**']) return await processHandle(req, res, map['**'], p, e);
	
	//page not found
	try {
		return await processFinal(req, res, map['!404'] ?? e.default['!404'] ?? { //default error response
			'+STATUS': 404,
			'TEXT': '404 Page not found.'
		}, p, e);
	} catch (err) {
		//emit error
		e.emitError(err);
		
		//internal server error
		return processError(req, res, map, p, e);
	}
}

//export
module.exports = processMap;