
var child_process = require("child_process"), pty = require("pty.js");
var env = "judge/", timeout;

var languages = {
	"C": function(name){
		return {
			"source":name+".c",
			"compile":"gcc "+name+".c -o "+name+".exe",
			"execute":["./"+name+".exe",[]]
		};
	},
	"C++": function(name){
		return {
			"source":name+".cpp",
			"compile":"g++ "+name+".cpp -o "+name+".exe",
			"execute":["./"+name+".exe",[]]
		};
	},
	"Python": function(name){
		return {
			"source":name+".py",
			"execute":["python",[name+".py"]]
		};
	}
};

var spawn = function(){
	var terminal = pty.spawn.apply(null,arguments);
	var i, stdin = "", stdout = "", process;
	terminal.writeline = function(data){
		stdin+=data+"\n";
		terminal.write(data);
	};
	terminal.readline = function(callback){
		process = callback;
	};
	terminal.on("data",function(data){
		for(i=0;i<data.length;++i){
			if(data[i]===stdin[0]) stdin = stdin.substr(1);
			else stdout+=data[i];
		}
		while((i=stdout.indexOf("\n"))!==-1 && process.length){
			data = stdout.substr(0,i);
			stdout = stdout.substr(i+1);
			process(data);
		}
	});
	return terminal;
};

var gfs_extract = function(id,path,callback){
	id = String(id); path = String(path);
	var offset = 0, size, file, blocksize = 100*1024;
	if(typeof(callback)!=="function") callback = misc.nop;
	async.series([
		function(cb){ filesystem.file.open(id,"r",function(e,r){ size=r.length; cb(e); }); },
		function(cb){ fs.open(path,"w","777",function(e,r){ file=r; cb(e); }); },
		function(cb){
			var nextblock = function(){
				var length = Math.min(size-offset,blocksize);
				if(length===0){ cb(null); return; }
				filesystem.file.read(id,length,function(error,data){
					if(error){ cb(error); return; }
					var buffer = new Buffer(data);
					fs.write(file,buffer,0,buffer.length,null,function(error){
						if(error){ cb(error); return; }
						offset+=length; nextblock();
					});
				});
			};
			nextblock();
		},
		function(cb){ filesystem.file.close(id,cb); },
		function(cb){ fs.close(file,cb); }
	],function(e){ callback(e); });
};

var process = function(){
	var code, problem, judge, solution;
	async.waterfall(mongodb.ready("code").concat([
		// Select an unjudged code.
		function(collection,cb){
			collection
				.find({"_id":{"$ne":0},"result":schema.code.items.result.default,"language.name":{"$in":Object.keys(languages)}},{})
				.nextObject(function(e,r){ if(!e) code = r; cb(!e && code===null?"wait":e); });
		},
		// Select the problem corresponding to that code.
		function(cb){
			database.get("problem",{"_id":code.problem._id},{statement:0,tutorial:0},function(e,r){ if(!e) problem = r; cb(e); });
		},
		// Select the judge corresponding to that problem.
		function(cb){
			if(problem.judge===null){ judge = null; cb(null); }
			else database.get("judge",{"_id":problem.judge._id},{},function(e,r){ if(!e) judge = r; cb(e); });
		},
		// Clear Environment
		function(cb){ fs.readdir(env,cb); },
		function(filelist,cb){
			async.parallel(filelist.map(function(filename){
				return function(cb2){ fs.unlink(env+filename,cb2); };
			}),function(e){ cb(e); });
		},
		// Create & Compile the Solution
		function(cb){
			solution = languages[code.language.name](env+"solution");
			fs.writeFile(solution.source, code.code,cb); // , {"mode":511}
		},
		function(cb){
			if("compile" in solution)
				child_process.exec(solution.compile,function(error,stdout,stderr){
					if(error || stderr.length){ code.result = "CE"; cb("done"); } else cb(null);
				});
			else cb(null);
		},
		// Create & Compile the Judge
		function(cb){
			var id = judge.code.id;
			judge = languages[judge.language.name](env+"judge");
			gfs_extract(id,judge.source,cb);
		},
		function(cb){
			if("compile" in judge)
				child_process.exec(judge.compile,function(error,stdout,stderr){
					if(error || stderr.length){ code.result = "CE"; cb("done"); } else cb(null);
				});
			else cb(null);
		},
		// Tests
		function(cb){
			var tests = []; code.results = [];
			problem.tests.forEach(function(test){
				tests.push(function(cb2){
					async.series([
						// create the IO files (assuming the judge needs them)
						function(cb3){ gfs_extract(test.input.id,env+"input.txt",cb3); },
						function(cb3){ gfs_extract(test.output.id,env+"output.txt",cb3); },
						// spawn the processes, interlink their IO streams & track evaluation
						function(cb3){
							var j = spawn(judge.execute[0],judge.execute[1]);
							var s = spawn(solution.execute[0],solution.execute[1]);
							var starttime = new Date().valueOf();
							var timer = setTimeout(function(){ end("TLE"); },test.timelimit*1000);
							var result = null, end = function(x){
								if(result!==null) return;
								var endtime = new Date().valueOf();
								j.kill("SIGKILL"); s.kill("SIGKILL");
								clearTimeout(timer);
								if(!(x in schema.code.items.result.options)){ cb3("unknown-result"); return; }
								code.results.push({
									"error":"",
									"time":(endtime-starttime)/1000,
									"output":null,
									"result":x
								});
								cb3(null);
							};
							s.readline(function(data){
								// console.log("solution->judge",data);
								j.writeline(data);
							});
							var prefix = null;
							j.readline(function(data){
								// console.log("judge->solution",data);
								if(prefix===null) prefix = data.trim();
								else if(data.substr(0,prefix.length)!==prefix) s.writeline(data);
								else end(data.substr(prefix.length).trim());
							});
						}
					],function(e){ cb2(e); });
				});
			});
			async.series(tests,function(e){
				// generate overall result based on individual ones
				if(e) code.result = "RTE";
				else {
					var nac = code.results.filter(function(r){ return r.result!=="AC"; });
					code.result = nac.length?nac[0].result:"AC";
				}
				cb("done");
			});
		}
	]),function(error){
		async.series([
			function(cb){ if(error==="done") database.update("code",{"_id":code._id},{"$set":{"results":code.results,"result":code.result}},{},cb); else cb(null); },
			function(cb){ if(error==="done") webserver.socket.broadcast("judge.reload",{"code":code._id}); cb(null); }
		],function(){ timeout = setTimeout(process,error==="wait"?3000:0); });
	});
};

exports = {
	"start" : function(cb){ process(); cb(null); },
	"end" : function(cb){ clearTimeout(timeout); cb(null); }
};