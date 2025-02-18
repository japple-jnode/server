/*
JustServer/handle.js

Simple web server package for Node.js.

by JustNode Dev Team / JustApple
*/

//load classes and functions
const processFinal = require('./final.js');
const processError = require('./error.js');

//error handler function
async function handleStatus(req, res, map, p, e, status) {
	let statusCode;
	let defaultMap;
	
	switch (status) {
		case '!404':
			statusCode = 404;
			defaultMap = e.default['!404'] ?? {
				'+STATUS': 404,
				'TEXT': '404 Page not found.'
			};
				break;
		case '!403':
			statusCode = 403;
			defaultMap = e.default['!403'] ?? {
				'+STATUS': 403,
				'TEXT': '403 Forbidden.'
			};
				break;
		default:
			return status; //if status is not a special error, return it directly
	}
	
	return await processFinal(req, res, map[status] ?? defaultMap, p, e);
}

//process function with error handling
async function safeProcessFinal(req, res, map, p, e, finalObject) {
	try {
		let status = await processFinal(req, res, finalObject, p, e);
		
		//handle special status codes
		status = await handleStatus(req, res, map, p, e, status);
		
		//fall into loop error
		if ((typeof status === 'string') && status.startsWith('!')) {
			throw new Error('Process may fall into infinity loop.');
		}
		return status;
	} catch (err) {
		//emit error
		e.emitError(err);
		
		//internal server error
		return processError(req, res, map, p, e);
	}
}

//process HandleObject
async function processHandle(req, res, map, p, e) {
	//protocol upgrade
	if (
		req.headers.connection &&
		req.headers.connection.toLowerCase() === 'upgrade' &&
		map['^' + req.headers.upgrade]
	) {
		return await safeProcessFinal(req, res, map, p, e, map['^' + req.headers.upgrade]);
	}
	
	//method check
	if (map['@' + req.method]) {
		return await safeProcessFinal(req, res, map, p, e, map['@' + req.method]);
	}
	
	//get final object by function
	if (map['>']) {
		return await safeProcessFinal(req, res, map, p, e, await map['>'](req, res, map, p, e));
	}
	
	//process final
	return await safeProcessFinal(req, res, map, p, e, map);
}

//export
module.exports = processHandle;