
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
	var id;
	async.series([
		function(cb){ cb(socket.data.auth>0?null:"unauthorized"); },
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

rpc.on("problem.update",function(socket,data,callback){
	async.series([
		function(cb){ cb(socket.data.auth>=2?null:"unauthorized"); },
		function(cb){ cb(Array.isArray(data) && data.length===3 && !isNaN(parseInt(data[0])) && (data[1]==="statement"||data[1]==="tutorial") && typeof(data[2])==="string" ? null : "corrupt"); },
		function(cb){ var set={};set[data[1]]=data[2]; database.update("problem",{_id:parseInt(data[0])},{"$set":set},cb); }
	],function(e){ callback(e); });
});