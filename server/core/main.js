
async.series([
	function(cb){ console.log("Connecting to Database ..."); mongodb.connect(cb); },
	function(cb){ console.log("Ensuring Database Indices ..."); action.initialize(cb); },
	function(cb){ console.log("Database Integrity Check ..."); action.integrity(cb); },
	function(cb){ console.log("Starting Judge ..."); judge.start(cb); },
	function(cb){ console.log("Starting WebServer ..."); webserver.start(cb); }
],function(error){
	if(error){
		judge.end(misc.nop);
		webserver.end(misc.nop);
		console.log("Error:",error);
		return;
	}
	console.log("Initialization Successful ...");
});