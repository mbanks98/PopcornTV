var logger = require('./logger');

function parseRange(str, size) {
    if (str.indexOf(",") != -1) {
        return;
    }
    if (str.substr(0, 6) == "bytes=") {
    	str = str.substr(6, str.length - 6);
    }
    var range = str.split("-"),
        start = parseInt(range[0], 10),
        end = parseInt(range[1], 10);
    // Case: -100
    if (isNaN(start)) {
        start = size - end;
        end = size - 1;
    // Case: 100-
    } else if (isNaN(end)) {
        end = size - 1;
    }

    // Invalid
    if (isNaN(start) || isNaN(end) || start > end || end > size) {
        return;
    }

    return {start: start, end: end};
};

function startWebServer(localIp) {

	var url    = require("url");
	var http   = require("http");
	var path   = require("path");
	var fs     = require("fs");
	var querystring = require("querystring");
	var torrent = require('./streamer');
	var PreviousID = "0";

	var mime   = require("./mime").types;
	var server = http.createServer(function(request, response) {
		var pathname = url.parse(request.url).pathname;
		var query = querystring.parse(url.parse(request.url).query);
		var staticFile = true;
		if (pathname.charAt(pathname.length - 1) == "/") {
			pathname += "index.html";
		} else if(pathname.indexOf("MoviePlay.xml") >= 0){
			var xml = require('./XMLGenerator');
			response.writeHead(200, {'Content-Type': 'text/xml'});
			logger.Streamer('Streamer: Starting Stream... Please wait for stream to be ready.');
			torrent.startStreamer(query.torrent, query.id, localIp);
			torrent.getStreamer().on('ready', function (data) {
				response.write(xml.generatePlayXML(torrent.getURL(), query.title, query.desc, query.poster));
				response.end();
			});
			torrent.getStreamer().on('close', function () {
				logger.Streamer('Streamer: Streaming Closed');
			});
			staticFile = false;
		} else if(pathname.indexOf("MoviesGrid.xml") >= 0){
			var xml = require('./XMLGenerator');
			response.writeHead(200, {'Content-Type': 'text/xml'});
			logger.Debug('=== Starting MoviesGrid.xml Generation ===');
			xml.generateMoviesXML(query.title, query.sort_by, function(xmlstring){
				logger.Debug('=== Ending MoviesGrid.xml Generation ===');
				response.write(xmlstring);
				response.end();
			})
			staticFile = false;
		} else if(pathname.indexOf("Parade.xml") >= 0){
			var xml = require('./XMLGenerator');
			response.writeHead(200, {'Content-Type': 'text/xml'});
			logger.Debug('=== Starting Parade.xml Generation ===');
			xml.generateMovieParadeXML(query.sort_by, function(xmlstring){
			logger.Debug('=== Starting Parade.xml Generation ===');
				response.write(xmlstring);
				response.end();
			})
			staticFile = false;
		} else if(pathname.indexOf("MoviesGenreGrid.xml") >= 0){
			var xml = require('./XMLGenerator');
			response.writeHead(200, {'Content-Type': 'text/xml'});
			logger.Debug('=== Starting MoviesGenreGrid.xml Generation ===');
			xml.generateMovieGenre(query.genre, function(xmlstring){
			logger.Debug('=== Starting MoviesGenreGrid.xml Generation ===');
				response.write(xmlstring);
				response.end();
			})
			staticFile = false;
		} else if(pathname.indexOf("MoviePrePlay.xml") >= 0){
			try{
				torrent.getStreamer().close();
			} catch(e) {
				logger.Streamer('Streamer: No Stream Running');
			}
			var xml = require('./XMLGenerator');
			response.writeHead(200, {'Content-Type': 'text/xml'});
			logger.Debug('=== Starting MoviePrePlay.xml Generation ===');
			xml.generateMoviePrePlayXML(query.torrentID, function(xmlstring){
			logger.Debug('=== Starting MoviePrePlay.xml Generation ===');
				response.write(xmlstring);
				response.end();
			})
			staticFile = false;
		} else if(pathname.indexOf("results.xml") >= 0){
			var xml = require('./XMLGenerator');
			response.writeHead(200, {'Content-Type': 'text/xml'});
			logger.Debug('=== Starting results.xml Generation ===');
			xml.generateSearchResults(query.query, function(xmlstring){
			logger.Debug('=== Starting results.xml Generation ===');
				response.write(xmlstring);
				response.end();
			})
			staticFile = false;
		} else if(pathname.indexOf("TVGrid.xml") >= 0){
			var xml = require('./XMLGenerator');
			response.writeHead(200, {'Content-Type': 'text/xml'});
			logger.Debug('=== Starting TVGrid.xml Generation ===');
			xml.generateTVXML(query.title, query.sort_by, function(xmlstring){
			logger.Debug('=== Starting TVGrid.xml Generation ===');
				response.write(xmlstring);
				response.end();
			})
			staticFile = false;
		} else if(pathname.indexOf("seasons.xml") >= 0){
			var xml = require('./XMLGenerator');
			response.writeHead(200, {'Content-Type': 'text/xml'});
			logger.Debug('=== Starting seasons.xml Generation ===');
			xml.generateTVSeasons(query.imdb, query.title, function(xmlstring){
			logger.Debug('=== Starting seasons.xml Generation ===');
				response.write(xmlstring);
				response.end();
			})
			staticFile = false;
		}  else if(pathname.indexOf("episodes.xml") >= 0){
			var xml = require('./XMLGenerator');
			response.writeHead(200, {'Content-Type': 'text/xml'});
			logger.Debug('=== Starting episodes.xml Generation ===');
			xml.generateTVEpisodes(query.imdb, query.season, query.title, function(xmlstring){
				logger.Debug('=== Ending episodes.xml Generation ===');
				response.write(xmlstring);
				response.end();
			})
			staticFile = false;
		} else if(pathname.indexOf("TVPrePlay.xml") >= 0){
			var xml = require('./XMLGenerator');
			response.writeHead(200, {'Content-Type': 'text/xml'});
			logger.Debug('=== Starting TVPrePlay.xml Generation ===');
			xml.generateTVPrePlayXML(query.imdb, query.season, query.episode, function(xmlstring){
				logger.Debug('=== Ending TVPrePlay.xml Generation ===');
				response.write(xmlstring);
				response.end();
			})
			staticFile = false;
		} else if(pathname.indexOf(".cer") >= 0){
			pathname = "certificates/trailers.cer";
		} else if(pathname.indexOf(".xml") >= 0){
			pathname = "templates" + pathname;
		}
		var realPath = path.join("assets", path.normalize(pathname.replace(/\.\./g, "")));
		logger.Web(pathname);
		if(staticFile){
			fs.stat(realPath, function(err, stats) {
				if (err) {
					logger.Web('404: ' + pathname)
					response.writeHead(404, {'Content-Type': 'text/plain'});
					response.write("This request URL " + pathname + " was not found on this server.");
					response.end();						
				} else {
					response.setHeader("Server", "Node/V5");
					response.setHeader('Accept-Ranges', 'bytes');				
					
					var ext = path.extname(realPath);
					ext = ext ? ext.slice(1) : "unknown";
					var contentType = mime[ext] || "application/octet-stream";
					
					response.setHeader("Content-Type", contentType);
					response.setHeader('Content-Length', stats.size);				
					if (request.headers["range"]) {
						var range = parseRange(request.headers["range"], stats.size);
						if (range) {
							response.setHeader("Content-Range", "bytes " + range.start + "-" + range.end + "/" + stats.size);
							response.setHeader("Content-Length", (range.end - range.start + 1));
							var raw = fs.createReadStream(realPath, {"start": range.start, "end": range.end});
							response.writeHead(206, "Partial Content");
							raw.pipe(response);
						} else {
							response.removeHeader("Content-Length");
							response.writeHead(416, "Request Range Not Satisfiable");
							response.end();						
						}					
					} else {
						var raw = fs.createReadStream(realPath);
						response.writeHead(200, "OK");
						raw.pipe(response);
					}
				}
			});
		}
	});
	server.listen(80);
	logger.Web("listening on " + localIp + ":80");
}

function startSSLWebServer(localIp) {

	var url    = require("url");
	var https   = require("https");
	var path   = require("path");
	var mime   = require("./mime").types;

	//
	// SSL Certificates
	//
	fs = require('fs');
	options = {
	  key: fs.readFileSync('./assets/certificates/trailers.pem')
	, ca: [ fs.readFileSync('./assets/certificates/trailers.pem') ]
	, cert: fs.readFileSync('./assets/certificates/trailers.pem')
	, requestCert: false
	, rejectUnauthorized: false
	};

	server = https.createServer(options);
	server.listen(443);
	server.on('request', function(request, response) {
		var pathname = url.parse(request.url).pathname;
		var staticFile = true;
		if (pathname.charAt(pathname.length - 1) == "/") {
			pathname += "index.html";
		} else if(pathname == "/appletv/us/js/application.js"){
			pathname = "js/application.js";
		} else if(pathname.includes(".xml")){
			pathname = "templates/" + pathname;
		}
		var realPath = path.join("assets", path.normalize(pathname.replace(/\.\./g, "")));
		logger.Web("SSL: " + pathname);
		
		if(staticFile){
			fs.stat(realPath, function(err, stats) {
				if (err) {
					logger.Web('SSL 404: ' + pathname)
					response.writeHead(404, {'Content-Type': 'text/plain'});
					response.write("This request URL " + pathname + " was not found on this server.");
					response.end();						
				} else {
					response.setHeader("Server", "Node/V5");
					response.setHeader('Accept-Ranges', 'bytes');				
					
					var ext = path.extname(realPath);
					ext = ext ? ext.slice(1) : "unknown";
					var contentType = mime[ext] || "application/octet-stream";
					
					response.setHeader("Content-Type", contentType);
					response.setHeader('Content-Length', stats.size);				
					if (request.headers["range"]) {
						var range = parseRange(request.headers["range"], stats.size);
						if (range) {
							response.setHeader("Content-Range", "bytes " + range.start + "-" + range.end + "/" + stats.size);
							response.setHeader("Content-Length", (range.end - range.start + 1));
							var raw = fs.createReadStream(realPath, {"start": range.start, "end": range.end});
							response.writeHead(206, "Partial Content");
							raw.pipe(response);
						} else {
							response.removeHeader("Content-Length");
							response.writeHead(416, "Request Range Not Satisfiable");
							response.end();						
						}					
					} else {
						var raw = fs.createReadStream(realPath);
						response.writeHead(200, "OK");
						raw.pipe(response);
					}
				}
			});
		}
	});
	logger.Web("SSL Web: listening on " + localIp + ":443");
}

exports.startWebServer = startWebServer;
exports.startSSLWebServer = startSSLWebServer;
