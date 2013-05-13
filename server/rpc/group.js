
rpc.on("group.list",function(socket,data,callback){
	if(misc.isobj(data)) database.page("group",{"_id":{"$ne":0}},{},data.$page,callback);
	else callback("corrupt");
});

rpc.on("group.members",function(socket,data,callback){
	if(misc.isobj(data) && typeof(data.data.group)==="number")
		database.page("user",{"groups._id":data.data.group},{},data.$page,callback);
	else callback("corrupt");
});

rpc.on("group.display",function(socket,data,callback){
	async.waterfall([
		function(cb){ database.get("group",{"name":String(data)},{},cb); }
	], function(e,r){ callback(e,e?undefined:r); })
});

rpc.on("group.create",function(socket,data,callback){
	async.waterfall([
		function(cb){ cb(misc.isobj(data) && misc.isobj(data.owner) ? null : "corrupt"); },
		function(cb){ data.$collection = "group"; cb(socket.data.user!==null ? null : "unauthorized"); },
		function(cb){ data.owner = {"_id":socket.data.user._id}; cb(null); }
	],function(e){ if(!e) action.insert(socket,data,callback); else callback(e); });
});

rpc.on("group.update",function(socket,data,callback){
	var group;
	async.series([
		function(cb){ cb(misc.isobj(data) && typeof(data._id)==="number" && misc.isobj(data.owner) && typeof(data.owner._id)==="number" ? null : "corrupt"); },
		function(cb){ data.$collection = "group"; database.get("group",{"_id":data._id},{},function(e,r){ if(!e) group=r; cb(e); }); },
		function(cb){ cb(socket.data.auth>=config.adminlevel || group.owner._id===data.owner._id ? null : "unauthorized"); },
		function(cb){ if(socket.data.auth<config.adminlevel) data.owner = {"_id":socket.data.user._id}; cb(null); }
	],function(e){ if(!e) action.update(socket,data,callback); else callback(e); });
});

rpc.on("group.delete",function(socket,data,callback){
	async.series([
		function(cb){ cb(misc.isobj(data) && typeof(data._id)==="number"  ? null : "corrupt"); },
		function(cb){
			async.parallel([
				function(cb2){ database.update("user",{},{"$pull":{"groups":{"_id":data._id}}},{multi:true},cb2); },
				function(cb2){ database.update("contest",{},{"$pull":{"groups":{"_id":data._id}}},{multi:true},cb2); }
			],cb);
		},
		function(cb){ database.update("group",{"_id":data._id},{"$unset":{"_refs":1}},{},cb); },
		function(cb){ data.$collection="group"; action.delete(socket,data,cb); }
	],function(e){ callback(e); });
});