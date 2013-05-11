
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
	var id;
	async.series([
		function(cb){ cb(socket.data.user!==null?null:"unauthorized"); },
		function(cb){
			if(typeof(data)!=="object" || data===null){ cb("corrupt"); return; }
			data.$collection = "code";
			data._id = -1;
			data.name = "meow";
			data.time = (new Date()).valueOf();
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