
rpc.on("code.list",function(socket,data,callback){
	if(typeof(data.data)!=="object" || data.data===null){ callback("corrupt"); return; }
	var condition = {}, i;
	["contest","problem","user","language"].forEach(function(x){
		if(x in data.data && !isNaN(i = parseInt(data.data[x]))) condition[x+"._id"] = i;
	});
	condition._id = {"$ne":0};
	database.page("code",condition,{},data.$page,function(e,r){ callback(e,e?undefined:r); });
});

rpc.on("code.display",function(socket,data,callback){
	database.get("code",{"_id":data},{},function(e,r){
		if(e) callback(e);
		else if((r.access===0) || (socket.data.user && socket.data.user._id===r.user._id) || (socket.data.auth>=2)) callback(null,r);
		else callback("unauthorized");
	});
});

rpc.on("code.submit",function(socket,data,callback){
	var id, contest, problem, now = misc.now();
	async.series([
		function(cb){ cb(socket.data.user!==null?null:"unauthorized"); },
		function(cb){ cb(misc.isobj(data) && misc.isobj(data.language) ? null : "corrupt"); },
		function(cb){
			async.parallel([
				function(cb2){ database.get("contest",{"_id":data.contest._id},{},function(e,r){ if(!e) contest=r; cb2(e); }) },
				function(cb2){ database.get("problem",{"_id":data.problem._id},{},function(e,r){ if(!e) problem=r; cb2(e); }) },
			],cb);
		},
		function(cb){
			cb(
				// the specified problem must be a part of the specified contest
				contest.problems.filter(function(p){ return p.problem._id===problem._id; }).length===1 &&
				// the contest start-time must be in the past or you must be an admin
				(socket.data.auth>=config.adminlevel || now>=contest.start) &&
				// the specified language must be allowed for the problem.
				problem.languages.filter(function(l){ return l._id===data.language._id; }).length===1
				// only then is this submission valid
				? null : "unauthorized"
			);
		},
		function(cb){
			data.$collection = "code";
			data._id = -1;
			data.name = "meow";
			data.time = now;
			data.user = {_id:socket.data.user._id};
			data.$id = ["name"];
			action.insert(socket,data,function(e,r){ if(!e) id = r._id; cb(e); });
		}
	], function(e){ callback(e,id); });
});

rpc.on("code.update",function(socket,data,callback){
	var code;
	async.series([
		function(cb){ cb(socket.data.auth>=config.adminlevel ? null : "unauthorized"); },
		function(cb){ cb(typeof(data)==="object" && data!==null && !isNaN(data._id=parseInt(data._id)) ? null : "corrupt" ); },
		function(cb){ database.get("code",{"_id":data._id},{},function(e,r){ if(!e)code=r; cb(e); }) },
		function(cb){
			code["$collection"] = "code";
			["result"].forEach(function(key){ if(key in data) code[key]=data[key]; });
			action.update(socket,code,cb);
		}
	],function(e){ callback(e); });
});