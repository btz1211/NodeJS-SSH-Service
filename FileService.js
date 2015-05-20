var http = require('http');

//managers
var managers = require('./ResourceMaster');
var resourceManager = managers.resourceManager;
var sshManagers = managers.sshManagers;

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

//create server
var server = resourceManager.listen(3001, function(){
	var host = server.address().address;
	var port = server.address().port;
	console.log('Server running at::', host, port);

});