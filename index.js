#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cmd = require('node-cmd');
const connect = require('connect');
const cors = require('cors');
const dirlist = require('dirlist');
const yargs = require('yargs');

const argv = yargs
	.option('port', {
		alias: 'p',
		description: 'Port to run the server on',
		type: 'number'
	})
	.option('python', {
		alias: 't',
		description: '[this function is currently not working] use python3, not nodejs',
		type: 'boolean'
	})
	.help()
	.alias('help', 'h')
	.argv;

const host = '0.0.0.0';
const port = parseInt(argv.port, 10) || 48489;
const base = '.';

// Middleware to decode URL paths
function decodeUrlMiddleware(req, res, next) {
	req.url = decodeURIComponent(req.url);
	next();
}

// Error handling middleware for dirlist
function dirlistErrorHandler(base) {
	const dirlistMiddleware = dirlist(base);
	return function(req, res, next) {
		try {
			dirlistMiddleware(req, res, function(err) {
				if (err) {
					next(); // Continue to next middleware if error occurs
				} else {
					next();
				}
			});
		} catch (error) {
			next(); // Continue to next middleware if error occurs
		}
	};
}

// Error handling middleware for static files
function staticErrorHandler(base) {
	const staticMiddleware = connect.static(base);
	return function(req, res, next) {
		staticMiddleware(req, res, function(err) {
			if (err) {
				res.statusCode = 404;
				res.end('File not found');
			}
		});
	};
}

if (argv.python) {
	console.log("using python -m http.server on " + String(port));
	const syncClone = cmd.runSync('python3 -m http.server ' + String(port));
	console.log(syncClone);
} else {
	const faviconBase64 = 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAgAAAAAAAAAAAAAAA...'; // truncated for brevity
	const faviconBuffer = Buffer.from(faviconBase64.split(',')[1], 'base64');

	connect(
		cors(),
		(req, res, next) => {
			if (req.url === '/favicon.ico') {
				res.writeHead(200, { 'Content-Type': 'image/x-icon' });
				res.end(faviconBuffer);
			} else {
				next();
			}
		},
		decodeUrlMiddleware,
		dirlistErrorHandler(base),
		staticErrorHandler(base)
	).listen(port, host);
	console.log('Server running at http://' + host + ':' + port + '/');
}
