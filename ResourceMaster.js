var mime = require('mime');
var path = require('path');
var util = require('util');
var events = require('events');
var crypto = require('crypto');
var multer = require('multer');
var express = require('express');
var URLParser = require('url');
var queryParser = require('querystring');
var SSHManager = require('./SSHManager');

var sshManagers = {};
var uploadTracker = [];
var resourceManager = express();

resourceManager.use(multer({
	dest: './uploads/',
	
	rename: function (fieldname, filename) {
		return filename+Date.now();
	},
	onFileUploadStart: function (file) {
		console.log(file.originalname + ' is starting ...');
		uploadTracker[file.name] = false;
	},
	onFileUploadComplete: function (file) {
		console.log(file.fieldname + ' uploaded to ' + file.path)
		uploadTracker[file.name] = true;
	}
}));

//middle-ware for checking if ssh manager exists and update time stamp of last used
resourceManager.use(function(req, res, next){
	var url = URLParser.parse(req.url);
	var pathRegex = /\/files*/;
	console.log('url path::' + url['pathname']);
	
	if(pathRegex.exec(url['pathname'])){
		var queryParameters = queryParser.parse(url['query']);
		var sshManager = sshManagers[queryParameters['connection_key']];
		if(sshManager){
			sshManager['last_accessed'] = Date.now();
			console.log('manager::' + queryParameters['connection_key']+' timestamp is updated');
			next();
		}else{
			res.writeHead(400);
			return res.end('Please provide a valid connection key');
		}
	}else{
		next();
	}
});



//register the resource 'files'
resourceManager.get('/files', function(req, res){
	var directory  = queryParameters['path']
	var sshManagerInfo = sshManagers[queryParameters['connection_key']];
	var queryParameters = queryParser.parse(URLParser.parse(req.url)['query']);
	
	if(directory){
		var sshManager = sshManagers[queryParameters['connection_key']]['manager'];
		
		console.log('received directory:: ' + directory );
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
		
		//read directory on server
		sshManager.checkDirectory(directory, res);
		
	}else{
		res.writeHead(400);
		return res.end('Please provide a directory');

	}
});

//ftp file
resourceManager.get('/file', function(req, res){
	var queryParameters = queryParser.parse(URLParser.parse(req.url)['query']);
	var sshManagerInfo = sshManagers[queryParameters['connection_key']];
	var filePath = queryParameters['path']

	console.log('queryParameters::' + JSON.stringify(queryParameters));
	if(filePath){
		var sshManager = sshManagers[queryParameters['connection_key']]['manager'];
		
		//handle data event
		res.on('dataReady', function(data){
			if(! data){
				res.writeHead(406);
				return res.end('file not found, please provide a valid path');
			}
			console.log('file path: ' + mime.lookup(path.basename(filePath)));
			res.writeHead(200, {"Content-Type": mime.lookup(path.basename(filePath)), "Content-Disposition": "inline; filename="+path.basename(filePath)});
			return res.end(data);
		});
		
		//handle error
		sshManager.on('error', function(error){
			res.writeHead(400);
			res.end('Unable to get the file, please make sure the file path is correct and the file type is not a directory, ERROR::' + error);
		});
		
		//load file
		sshManager.loadFile(filePath, res);
		
	}else{
		res.writeHead(400);
		return res.end('Please provide a file path');
	}
});

//connect to server
resourceManager.post('/server/connect', function(req, res){
	if(! req.body){
		return res.status(404).end('Please provide server information');
	}else{
		//console.log('req body:: ' + JSON.stringify(req.body) + 'req files:: ' + JSON.stringify(req.files));
		//get host info
		var hostInfo = {
			'host': (req.body['host']+'').trim(),
			'port': (req.body['port']+'').trim(),
			'username': (req.body['username']+'').trim(),
			'password': (req.body['password']+'').trim(),
			'key': req.files['key']
		};
		
		var key = req.files['key'];
				
		//make sure the user defines either a password or auth key
		if(! hostInfo['password'] && ! hostInfo['key']){
			res.status(404).end('Please provide either a password or upload an auth-key');
		}else{
			console.log('host info:: ' + JSON.stringify(hostInfo));
			var sshManager = new SSHManager(hostInfo);
			
			sshManager.on('error', function(error){
				res.status(400).end('Unable to connect to server, ERROR::' + error);
			});
			
			//add to the ssh manager cache
			sshManager.on('ready', function(){
				//encrypt the host info and replace all special chars
				var connectionKey = crypto.createHash("sha1").update(JSON.stringify(hostInfo)).digest('base64').replace(/[^\w\s]/gi, '');
				sshManagers[connectionKey] = {'manager':this, 'last_accessed':(Date.now())};
				res.status(200).end(connectionKey);
			});
		}
	}
});

exports.sshManagers = sshManagers;
exports.resourceManager = resourceManager;
