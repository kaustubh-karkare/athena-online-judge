
rpc.on("problem.update",function(socket,data,callback){
	async.series([
		function(cb){ cb(socket.data.auth>=constant.adminlevel?null:"unauthorized"); },
		function(cb){ cb(Array.isArray(data) && data.length===3 && !isNaN(parseInt(data[0])) && (data[1]==="statement"||data[1]==="tutorial") && typeof(data[2])==="string" ? null : "corrupt"); },
		function(cb){ var set={};set[data[1]]=data[2]; database.update("problem",{_id:parseInt(data[0])},{"$set":set},cb); }
	],function(e){ callback(e); });
});

rpc.on("problem.display",function(socket,data,callback){
	var contest, problem;
	async.series([
		function(cb){ cb(misc.isobj(data) && typeof(data.contest)==="string" && typeof(data.problem)==="string" ? null : "corrupt"); },
		function(cb){
			async.parallel([
				function(cb2){ database.get("contest",{"name":data.contest},{},function(e,r){ contest=r; cb2(e); }); },
				function(cb2){ database.get("problem",{"name":data.problem},{},function(e,r){ problem=r; cb2(e); }); }
			],cb);
		},
		function(cb){ cb(contest.problems.filter(function(p){ return p.problem._id===problem._id; }).length===1 ? null : "invalid"); },
		function(cb){ cb(socket.data.auth<constant.adminlevel && misc.now()<contest.start ? "unauthorized" : null); },
		function(cb){ if(socket.data.auth<constant.adminlevel && misc.now()<contest.end) problem.tutorial=null; cb(null); }
	],function(e){ callback(e,{"problem":problem,"contest":contest}); });
});