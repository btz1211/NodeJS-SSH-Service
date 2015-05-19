var http = require('http');

//managers
var managers = require('./Managers');
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
var server = http.createServer(function (req, res) {
	resourceManager.handle(req, res);
	
}).listen(3001, '127.0.0.1');
console.log('Server running at http://127.0.0.1:3001/');
