
var option = config.operation;

var terminate = function(error){
	async.series([
		function(cb){
			if(!option.webserver){ cb(null); return; }
			if(!error) console.log("Closing Web Server ...");
			webserver.end(cb);
		},
		function(cb){
			if(!option.evaluator){ cb(null); return; }
			if(!error) console.log("Closing Code Evaluation System ...");
			webserver.end(cb);
		},
		function(cb){
			if(!error) console.log("Disconnecting from Database ...");
			mongodb.disconnect(cb);
		}
	],function(error2){
		if(error2) console.log("Error :",error2);
		else if(!error) console.log("Operation(s) complete. Exiting ...");
	});
};

var initialize = function(){
		async.series([
			function(cb){
			console.log("Connecting to Database ...");
			async.series([mongodb.connect,action.initialize],cb);
		},
		function(cb){
			if(!option.integrity){ cb(null); return; }
			console.log("Performing Database Integrity Check ...");
			action.integrity(cb);
		},
		function(cb){
			if(!option.evaluator){ cb(null); return; }
			console.log("Starting Code Evaluation System ...");
			evaluator.start(cb);
		},
		function(cb){
			if(!option.webserver){ cb(null); return; }
			console.log("Starting Web Server ...");
			webserver.start(cb);
		},
	],function(error){
		if(error){
			console.log("Error :",error);
			terminate(error);
		} else if(option.evaluator || option.webserver){
			console.log("Initialization Successful.");
			process.once('SIGINT',function(){
				console.log("\tSIGINT");
				terminate();
				process.once('SIGINT',function(){
					console.log("\tSIGINT");
					process.exit();
				});
			});
		} else { terminate(); }
	});
};

initialize();

