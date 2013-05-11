
async.series([
	function(cb){ mongodb.connect(cb); },
	function(cb){ action.integrity(cb); },
	function(cb){ judge.start(cb); },
	function(cb){ webserver.start(cb); }
],function(error){
	if(error){
		judge.end(misc.nop);
		webserver.end(misc.nop);
		console.log("Error:",error);
		return;
	}
	console.log("Initialization Successful ...");
});