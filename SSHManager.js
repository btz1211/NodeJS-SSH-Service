var fs = require('fs');
var util = require('util');
var path = require('path');
var SSHClient = require('ssh2');
var events = require('events');

function SSHManager(hostInfo){
	var manager = this;
	this.client = new SSHClient();
	
	this.client.on('ready', function(){
		console.log('Client:: Ready');
		manager.emit('ready');
	});
	
	this.client.on('error', function(error){
		console.log('Client:: Error :: ' + error);
		manager.emit('error', error);
	});

	this.client.connect({
		host: hostInfo['host'],
		port: hostInfo['port'],
		username: hostInfo['username'],
		password: hostInfo['password'],
		privateKey: fs.readFileSync(hostInfo['key']['path'])
	});
}

util.inherits(SSHManager, events.EventEmitter);

//view directory
SSHManager.prototype.checkDirectory = function(directory, resultHandler){
	manager = this;
	
	this.client.sftp(function(error, sftp){
		if(error){
			console.log('SFTP::Error::'+error);
			return manager.emit('error', error);
		}
		
		sftp.readdir(directory, function(error, list){
			if(error){
				console.log('READDIR::Error::' + error);
				manager.emit('error', error);
			}
			
			sftp.end();
			resultHandler.emit('dataReady', JSON.stringify(list));
		});
	});
};

//ftp file
SSHManager.prototype.loadFile = function(filePath, resultHandler){
	manager = this;
	
	this.client.sftp(function(error, sftp){
		if(error){
			console.log('SFTP::Error::'+error);
			return manager.emit('error', error);
		}
		
		var fileName = path.basename(filePath);
		
		//read file loaded and send it back to user
		sftp.on('end', function(){
			fs.readFile(fileName, function(error, data){
				if(error){
					console.log('READFILE::Error::' + error);
					manager.emit('error', error);
				}
				
				resultHandler.emit('fileReady', data);
			});
		});
		
		//first load file to local file
		sftp.fastGet(filePath, fileName, function(error){
			if(error){
				console.log('FASTGET::Error::' + error);
				return manager.emit('error', error);
			}
			sftp.end();
		});
	});
};

module.exports = SSHManager;
