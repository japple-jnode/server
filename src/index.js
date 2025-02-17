/*
JustServer

Simple web server package for Node.js.

by JustNode Dev Team / JustApple
*/

//export
module.exports = {
	Server: require('./server.js'),
	processMap: require('./map.js'),
	processHandle: require('./handle.js'),
	processFinal: require('./final.js'),
	processError: require('./error.js'),
	mimeType: require('./mime.json')
};