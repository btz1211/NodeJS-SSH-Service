var fs = require('fs');
var util = require('util');
var path = require('path');
var events = require('events');
var SSHClient = require('ssh2');


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

	
	var key = fs.readFileSync(hostInfo['key']['path']).toString('utf8').trim();
	console.log('key:: ' + key);
	
	this.client.connect({
		host: hostInfo['host'],
		port: hostInfo['port'],
		username: hostInfo['username'],
		password: hostInfo['password'],
		privateKey: key
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
				return manager.emit('error', error);
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
		
		//ftp file name
		var fileName = './downloads/'+path.basename(filePath);
		
		//read file loaded and send it back to user
		sftp.on('end', function(){
			fs.readFile(fileName, function(error, data){
				if(error){
					console.log('READFILE::Error::' + error);
					return manager.emit('error', error);
				}					
				console.log('data loaded');
				resultHandler.emit('dataReady', data);
			});
			
			//remove file - no need to keep after 
			fs.unlink(fileName, function (error) {
				if (error){
					console.log('error when attempting to delete::' + fileName);
				}
			});
		});
		
		//first get file from server and put in to local drive
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
