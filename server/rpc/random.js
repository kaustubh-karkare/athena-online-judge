
var safe = function(callback){ return function(e,r){ callback(e,e?undefined:r); }; };

rpc.on("contest.list",function(socket,data,callback){
	var condition = data.data==="past" ? {"end":{$lt:new Date().valueOf()}} : {"end":{$gte:new Date().valueOf()}};
	condition._id = {"$ne":0};
	database.page("contest",condition,{"problems":0},data.$page,safe(callback));
});

rpc.on("contest.problem",function(socket,data,callback){
	var contest, problem;
	async.series([
		function(cb){ cb(misc.isobj(data) && typeof(data.contest)==="string" ? null : "corrupt"); },
		function(cb){
			async.parallel([
				function(cb2){
					if(typeof(data.problem)!=="string") cb2(null);
					else database.get("problem",{"name":data.problem},{},function(e,r){ problem=r; cb2(e); });
				},
				function(cb2){
					database.get("contest",{"name":data.contest},{},function(e,r){ contest=r; cb2(e); });
				}
			],cb);
		},
		function(cb){
			if(socket.data.auth<config.adminlevel){
				// problem can only be accessed if it is a part of the specified contest
				if(problem && contest.problems.filter(function(p){ return p.problem._id===problem._id; }).length===0) problem = null;
				// problem data can only be accessed if contest start-time is in the past
				if(misc.now()<contest.start){ if(problem!==undefined) problem = null; else contest.problems = null; }
				// problem tutorial can only be accessed if contest end-time is in the past
				if(misc.now()<contest.end && problem) problem.tutorial = null;
				// in case of any problems, raise error
				if(problem===null){ cb("unauthorized"); return; } // should be undefined / object
			}
			cb(null);
		}
	],function(e){ callback(e,e?undefined:{"contest":contest,"problem":problem}); });
});

rpc.on("problem.update",function(socket,data,callback){
	async.series([
		function(cb){ cb(socket.data.auth>=config.adminlevel?null:"unauthorized"); },
		function(cb){ cb(Array.isArray(data) && data.length===3 && !isNaN(parseInt(data[0])) && (data[1]==="statement"||data[1]==="tutorial") && typeof(data[2])==="string" ? null : "corrupt"); },
		function(cb){ var set={};set[data[1]]=data[2]; database.update("problem",{_id:parseInt(data[0])},{"$set":set},cb); }
	],function(e){ callback(e); });
});