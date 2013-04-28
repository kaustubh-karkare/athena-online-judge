
rpc.on("socket.connect",function(socket){
	if(arguments.length!==1) return; // prevent remote triggering
	socket.data.user = null;
	socket.data.auth = 0;
	socket.data.files = [];
});

rpc.on("socket.disconnect",function(socket){
	if(arguments.length!==1) return; // prevent remote triggering
	socket.data.files.forEach(function(id){
		filesystem.file.delete(id,function(e){ console.log("socket.disconnect","file.delete",id,e); });
	});
});

var spec_login = {type:"object",items:{username:{type:"string"},password:{type:"string"}}};
rpc.on("user.login",function(socket,data,callback){
	async.waterfall([
		function(cb){ specification.match_complete("login",spec_login,data,cb); },
		function(select,save,cb){ database.get("user",select,{},cb); }
	], function(error,result){
		if(error){ callback(error); return; }
		socket.data.user = result;
		socket.data.auth = result.auth;
		callback(null,{"user":socket.data.user});
	});
});

rpc.on("user.logout",function(socket,data,callback){
	socket.data.user = null;
	socket.data.auth = 0;
	callback(null);
});

var safe = function(callback){ return function(e,r){ callback(e,e?undefined:r); }; };

rpc.on("contest.list",function(socket,data,callback){
	var condition = data.data==="past" ? {"end":{$lt:new Date().valueOf()}} : {"end":{$gte:new Date().valueOf()}};
	condition._id = {"$ne":0};
	database.page("contest",condition,{},data.$page,safe(callback));
});
rpc.on("code.list",function(socket,data,callback){
	if(typeof(data.data)!=="object" || data.data===null){ callback("corrupt"); return; }
	var condition = {}, i;
	["contest","problem","user","language"].forEach(function(x){
		if(x in data.data && !isNaN(i = parseInt(data.data[x]))) condition[x+"._id"] = i;
	});
	condition._id = {"$ne":0};
	database.page("code",condition,{},data.$page,safe(callback));
});

rpc.on("contest.display",function(socket,data,callback){ database.get("contest",{"name":data},{},safe(callback)); });
rpc.on("problem.display",function(socket,data,callback){ database.get("problem",{"name":data},{},safe(callback)); });
rpc.on("code.display",function(socket,data,callback){
	database.get("code",{"_id":data},{},function(e,r){
		if(e) callback(e);
		else if((r.access===0) || (socket.data.user && socket.data.user._id===r.user._id) || (socket.data.auth>=2)) callback(null,r);
		else callback("unauthorized");
	});
});

rpc.on("code.submit",function(socket,data,callback){
	var code = {};
	async.series([
		function(cb){ cb(socket.data.auth>0?null:"unauthorized"); },
		function(cb){
			data._id = -1; data.name = "meow"; data.time = (new Date()).valueOf(); data.user = {_id:socket.data.user._id};
			specification.match_complete("code.submit",schema.code,data,function(e,r){ if(!e) code=r; cb(e); });
		},
		function(cb){
			var fn = {_id: function(cb){ database.nextid("code",function(e,n){ if(!e) code._id=n; code.name=""+n; cb(e); }); } };
			["contest","problem"].forEach(function(c){ fn[c] = function(cb2){ database.get(c,code[c],{},cb2); }; });
			async.parallel(fn,cb);
		}
	], function(error,result){
		if(error){ callback(error); return; }
		database.insert("code",code,{},function(e,r){ callback(e,e?undefined:code) });
	});
});

rpc.on("problem.update",function(socket,data,callback){
	async.series([
		function(cb){ cb(socket.data.auth>=2?null:"unauthorized"); },
		function(cb){ cb(Array.isArray(data) && data.length===3 && !isNaN(parseInt(data[0])) && (data[1]==="statement"||data[1]==="tutorial") && typeof(data[2])==="string" ? null : "corrupt"); },
		function(cb){ var set={};set[data[1]]=data[2]; database.update("problem",{_id:parseInt(data[0])},{"$set":set},cb); }
	],function(e){ callback(e); });
});