var mime = require('mime');
var path = require('path');
var crypto = require('crypto');
var URLParser = require('url');
var queryParser = require('querystring');
var SSHManager = require('./SSHManager');
var ResourceManager = require('./ResourceManager');

var sshManagers = [];
var resourceManager = new ResourceManager();

//register the resource 'files'
resourceManager.register('/files', {
	"GET":function(req, res, args){
		var queryParameters = queryParser.parse(URLParser.parse(req.url)['query']);
		var directory  = queryParameters['directory']
		var sshManager = sshManagers[queryParameters['connection_key']]['manager'];
		
		console.log('received directory:: ' + directory );
		if(directory && sshManager){
			res.on('dataReady', function(data){
				if(! data){
					res.writeHead(406);
					return res.end('Directory not found, please provide a valid directory');

				}
				res.writeHead(200);
				res.end(data);
				
			});
			sshManager.on('error', function(error){
				res.writeHead(400);
				res.end('Unable to read the directory, ERROR::' + error);
			});
			sshManager.checkDirectory(directory, res);
		}else{
			res.writeHead(400);
			res.end('Please provide a connection key and a directory to view');
		}
	}
});

resourceManager.register('/file', {
	'GET':function(req, res, args){
		var queryParameters = queryParser.parse(URLParser.parse(req.url)['query']);
		var filePath = queryParameters['path']
		var sshManager = sshManagers[queryParameters['connection_key']]['manager'];
		
		console.log('received file path: ' & filePath);
		if(filePath && sshManager){
			res.on('fileReady', function(data){
				if(! data){
						res.writeHead(406);
						return res.end('file not found, please provide a valid path');
				}
				console.log('file path: ' + mime.lookup(path.basename(filePath)));
				res.writeHead(200, {"Content-Type": mime.lookup(path.basename(filePath))});
				res.end(data);
			});
			
			sshManager.on('error', function(error){
				res.writeHead(400);
				res.end('Unable to get the file, ERROR::' + error);
			});
			sshManager.loadFile(filePath, res);
		}else{
			res.writeHead(400);
			res.end('Please provide a connection key and a file path');
		}
	}
});

resourceManager.register('/server/connect', {
	'POST':function(req, res, args){
		var finalData = '';
		req.on('data', function(data){
			finalData+=data;
		});
		
		req.on('end', function(){
			var parameters = queryParser.parse(finalData);
		
			var hostInfo = {
				'host': parameters['host'].trim(),
				'port': parameters['port'].trim(),
				'username': parameters['username'].trim(),
				'password': parameters['password'].trim()
			};
			console.log('host info:: ' + JSON.stringify(hostInfo));
		
			var sshManager = new SSHManager(hostInfo);
			sshManager.on('ready', function(){
				
				var connectionKey = crypto.createHash("sha1").update(JSON.stringify(hostInfo)).digest('base64');
				sshManagers[connectionKey] = {'manager':this, 'last_accessed':(Date.now())};
				res.writeHead(200);
				res.end(connectionKey);
			});
			
			sshManager.on('error', function(error){
				res.writeHead(400);
				res.end('Unable to connect to server, ERROR::' + error);
			});
		});
	}
});

exports.sshManagers = sshManagers;
exports.resourceManager = resourceManager;
