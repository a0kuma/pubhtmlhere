#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cmd = require('node-cmd');
const connect = require('connect');
const cors = require('cors');
const dirlist = require('dirlist');
const yargs = require('yargs');

// Parse command-line arguments
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

// Middleware to serve favicon
function faviconMiddleware(faviconBuffer) {
	return function (req, res, next) {
		if (req.url === '/favicon.ico') {
			res.writeHead(200, { 'Content-Type': 'image/x-icon' });
			res.end(faviconBuffer);
		} else {
			next();
		}
	};
}

// Error handling middleware for dirlist
function dirlistErrorHandler(base) {
	const dirlistMiddleware = dirlist(base);
	return function (req, res, next) {
		try {
			dirlistMiddleware(req, res, function (err) {
				if (err) {
					next(); // Continue to next middleware
				} else {
					next();
				}
			});
		} catch (error) {
			next();
		}
	};
}

// Node.js version check
const [major] = process.versions.node.split('.').map(Number);

// Dynamic middleware for static file handling
let staticErrorHandler;
if (major >= 24) {
	// Use serve-static for newer Node.js
	const serveStatic = require('serve-static');
	staticErrorHandler = function (base) {
		const staticMiddleware = serveStatic(base);
		return function (req, res, next) {
			staticMiddleware(req, res, function (err) {
				if (err) {
					res.statusCode = 404;
					res.end('File not found');
				}
			});
		};
	};
} else {
	// Use legacy connect.static (deprecated)
	staticErrorHandler = function (base) {
		const staticMiddleware = connect.static(base);
		return function (req, res, next) {
			staticMiddleware(req, res, function (err) {
				if (err) {
					res.statusCode = 404;
					res.end('File not found');
				}
			});
		};
	};
}

// Use Python HTTP server (optional)
if (argv.python) {
	console.log("using python -m http.server on " + String(port));
	const syncClone = cmd.runSync('python3 -m http.server ' + String(port));
	console.log(syncClone);
} else {
	const faviconBase64 = 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAgAAAAAAAAAAAAAAA...'; // truncated for brevity
	const faviconBuffer = Buffer.from(faviconBase64.split(',')[1], 'base64');

	connect(
		cors(),
		faviconMiddleware(faviconBuffer),
		decodeUrlMiddleware,
		dirlistErrorHandler(base),
		staticErrorHandler(base)
	).listen(port, host);

	console.log('Server running at http://' + host + ':' + port + '/');
}
