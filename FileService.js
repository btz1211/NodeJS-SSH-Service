var fs = require('fs');
var http = require('http');
var mkdirp = require('mkdirp');
var master = require('./ResourceMaster');
var sshManagers = master.sshManagers;
var resourceManager = master.resourceManager;


//@TODO
//add https to file upload
//clean downloads
//...

//remove unused SSH sessions (remove if idle > 15 min)
setInterval(function(){
	var currentTime = Date.now();
	console.log('current time::' + currentTime);
	for(var connectionKey in sshManagers){
		if((currentTime - sshManagers[connectionKey]['last_accessed']) > (15 * 60 * 1000)){
			console.log('removing the manager::' + connectionKey);
			delete sshManagers[connectionKey];
		}
	}
}, (15 * 60 * 1000));

//create download location
try{
	if(!fs.lstatSync('./downloads').isDirectory()){
		mkdirp('./downloads', function(error) { 
			if(error){
				console.log('Unable to create download location, server shuting down...');
			}
		});
	}
}catch(e){
	console.log('error when creating downloads directory::' + e);
}

//create server
var server = resourceManager.listen(3001, function(){
	var host = server.address().address;
	var port = server.address().port;
	console.log('Server running at::', host, port);
});