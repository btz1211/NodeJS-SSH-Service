var http = require('http');

var resourceMaster = require('./ResourceMaster');
var resourceManager = resourceMaster.resourceManager;
var sshManagers = resourceMaster.sshManagers;

setInterval(function(){
	console.log('cleaning ssh managers...' + sshManagers.dir);
	var currentTime = Date.now();
	console.log('current time::' + currentTime);
	for(var i = 0; i < sshManagers.length; ++i){
		console.log('manager time:: ' +sshManagers[i]['last_accessed']);
		if((currentTime - sshManagers[i]['last_accessed']) > 5000){
			console.log('removing the manager');
		}
	}
}, 5*1000);

/*------------------------create server---------------------*/
var server = http.createServer(function (req, res) {
	resourceManager.handle(req, res);
	
}).listen(3001, '127.0.0.1');
console.log('Server running at http://127.0.0.1:3001/');
