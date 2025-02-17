/*
JustServer/server.js

Simple web server package for Node.js.

by JustNode Dev Team / JustApple
*/

//load node packages
const http = require('http');
const https = require('https');
const { domainToUnicode } = require('url');
const EventEmitter = require('events');

//load classes and functions
const processMap = require('./map.js');

//http server
class Server extends EventEmitter {
	constructor(map = {}, useHttps = false, options) {
		super();
		
		this.map = map; //server map
		this.server = (useHttps ? https : http).createServer(options); //create server
		
		//on normal request
		this.server.on('request', (req, res) => {
			//emit event
			this.emit('request', req, res);
			
			//parse url
			const url = new URL(req.url, 'http://localhost');
			
			//create path
			let p = url.pathname.split('/').map((e) => decodeURIComponent(e));
			p[0] = req.headers.host; //set root path to host
			
			//process map
			processMap(req, res, this.map, p, {
				url: url,
				default: {},
				time: Date.now(),
				emitError: (...err) => { this.emit('error', ...err); }
			});
		});
	}
	
	//listen a port to receive requests
	listen(port, cb) {
		return this.server.listen(port, cb);
	}
}

//export
module.exports = Server;