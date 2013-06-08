
var child_process = require("child_process"), pty = require("pty.js");
var env = "judge/", running = true, timeout;

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

var process = function(){
	var code, problem, judge, solution;
	async.waterfall(mongodb.ready("code").concat([
		// Select an unjudged code.
		function(collection,cb){
			collection
				.find({"_id":{"$ne":0},"result":schema.code.result.default,"language.name":{"$in":Object.keys(languages)}},{})
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
			gridfs.extract(id,judge.source,cb);
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
					var fi, fo, fe; // gfs actual input & output & expected files
					var pi = env+"actual-input.txt", po = env+"actual-output.txt", pe = env+"expected.txt";
					async.series([
						// create the expected and actual IO files (assuming judge needs them)
						function(cb3){
							async.parallel([
								function(cb4){ gridfs.extract(test.input.id,env+"input.txt",cb4); },
								function(cb4){ gridfs.extract(test.output.id,env+"output.txt",cb4); },
								function(cb4){ fs.open(pi,"w","777",function(e,fd){ if(!e) fi=fd; cb4(e); }); },
								function(cb4){ fs.open(po,"w","777",function(e,fd){ if(!e) fo=fd; cb4(e); }); }
							],cb3);
						},
						// spawn the processes, interlink their IO streams & track evaluation
						function(cb3){
							var j = spawn(judge.execute[0],judge.execute[1]);
							var s = spawn(solution.execute[0],solution.execute[1]);
							var starttime = new Date().valueOf();
							var timer = setTimeout(function(){ end("TLE"); },test.timelimit*1000);
							var fiq = new misc.fnq(), foq = new misc.fnq();
							var result = null, end = function(x){
								if(result!==null) return;
								var endtime = new Date().valueOf();
								j.kill("SIGKILL"); s.kill("SIGKILL");
								clearTimeout(timer);
								fiq.push(function(cb4){ fs.close(fi,cb4); });
								fiq.push(function(cb4){ gridfs.insert(null,pi,function(e,r){ fi=r; cb4(e); }); });
								foq.push(function(cb4){ fs.close(fo,cb4); });
								fiq.push(function(cb4){ gridfs.insert(null,po,function(e,r){ fo=r; cb4(e); }); });
								async.parallel([
									function(cb4){ fiq.push(function(cb5){ cb5("end"); cb4(null); }); },
									function(cb4){ foq.push(function(cb5){ cb5("end"); cb4(null); }); },
									function(cb4){
										var expected = env+"output.txt";
										async.series([
											function(cb5){ fs.exists(pe,function(r){ cb5(r?null:"non-existant"); }); },
											function(cb5){ fs.stat(pe,function(e,s){ cb5(e?e:(s.isFile()?null:"non-existant")); }); },
											function(cb5){ expected = pe; cb5(null); }
										],function(e){
											gridfs.insert(null,expected,function(e,r){ if(!e) fe=r; cb4(e); });
										});
									}
								],function(e){
									if(!(x in schema.code.result.options)){ cb3("unknown-result"); return; }
									code.results.push({
										"time":(endtime-starttime)/1000,
										"input":fi,
										"output":fo,
										"expected":fe,
										"result":x
									});
									cb3(null);
								});
							};
							s.readline(function(data){
								// console.log("solution->judge",data);
								j.writeline(data);
								foq.push(function(cb4){
									var buffer = new Buffer(data);
									fs.write(fo,buffer,0,buffer.length,null,cb4);
								});
							});
							var prefix = null;
							j.readline(function(data){
								// console.log("judge->solution",data);
								if(prefix===null) prefix = data.trim();
								else if(data.substr(0,prefix.length)===prefix) end(data.substr(prefix.length).trim());
								else {
									s.writeline(data);
									fiq.push(function(cb4){
										var buffer = new Buffer(data);
										fs.write(fi,buffer,0,buffer.length,null,cb4);
									});
								};
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
		],function(){ if(running) timeout = setTimeout(process,error==="wait"?3000:0); });
	});
};

exports = {
	"start" : function(cb){ if(!running){ running = true; process(); } cb(null); },
	"end" : function(cb){ running = false; clearTimeout(timeout); cb(null); }
};
