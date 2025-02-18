/*
JustServer/final.js

Simple web server package for Node.js.

by JustNode Dev Team / JustApple
*/

//load node packages
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

//load mime types
const mimeTypes = require('./mime.json');

//process FinalObject
async function processFinal(req, res, map, p, e) {
	//firewall
	if (map['+FIREWALL'] && !(await map['+FIREWALL'](req, res, map, p, e))) return;
	
	//custom function
	if (map['FUNCTION']) return map['FUNCTION'](req, res, map, p, e);
	
	//text response (include empty text)
	if (map['TEXT'] !== undefined) {
		res.writeHead(map['+STATUS'] ?? 200, {
			'Content-Type': 'text/plain; charset=UTF-8',
			'Content-Length': Buffer.byteLength(map['TEXT']),
			...map['+HEADERS']
		});
		res.end(map['TEXT'], 'utf8');
		return;
	}
	
	//buffer (binary) response
	if (map['BUFFER']) {
		res.writeHead(map['+STATUS'] ?? 200, {
			'Content-Type': 'application/octet-stream',
			'Content-Length': map['BUFFER'].length,
			...map['+HEADERS']
		});
		res.end(map['BUFFER']);
		return;
	}
	
	//file response
	if (map['FILE']) {
		let fileSize;
		
		//get file size and check file exists
		try {
			fileSize = (await fsPromises.stat(map['FILE'])).size;
		} catch (err) { return '!404'; } //return error
		
		//write head
		res.writeHead(map['+STATUS'] ?? 200, {
			'Content-Type': mimeTypes[path.extname(map['FILE'])] ?? 'application/octet-stream',
			'Content-Length': fileSize,
			...map['+HEADERS']
		});
		
		//stream response
		const readStream = fs.createReadStream(map['FILE']);
		readStream.pipe(res);
		
		//wait for stream
		return await new Promise((resolve, reject) => {
			readStream.on('error', reject);
			readStream.on('end', resolve);
		});
	}
	
	//folder
	if (map['FOLDER']) {
		//get file path
		const file = path.resolve(map['FOLDER'], p.map((e) => encodeURIComponent(e)).join('/'));
		
		//check file path
		if (path.relative(path.resolve(map['FOLDER']), file).startsWith('..')) return '!403';
		
		//check hidden file
		if (
			path.basename(file).startsWith('.') &&
			!(map['__ALLOW_HIDDEN_FILE'] || e.default['__ALLOW_HIDDEN_FILE'])
		) return '!404';
		
		let fileSize;
		
		//get file size and check file exists
		try {
			fileSize = (await fsPromises.stat(file)).size;
		} catch (err) { return '!404'; } //return error
		
		//write head
		res.writeHead(map['+STATUS'] ?? 200, {
			'Content-Type': mimeTypes[path.extname(file)] ?? 'application/octet-stream',
			'Content-Length': fileSize,
			...map['+HEADERS']
		});
		
		//stream response
		const readStream = fs.createReadStream(file);
		readStream.pipe(res);
				
		//wait for stream
		return await new Promise((resolve, reject) => {
			readStream.on('error', reject);
			readStream.on('end', resolve);
		});
	}
	
	//only headers or status code
	if (map['+STATUS'] || map['+HEADERS']) {
		res.writeHead(map['+STATUS'] ?? 200, map['+HEADERS']);
		res.end();
		return;
	}
	
	return '!404';
}

//export
module.exports = processFinal;