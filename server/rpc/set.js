
rpc.on("set.list",function(socket,data,callback){
	if(misc.isobj(data)) database.page("set",{"_id":{"$ne":0}},{},data.$page,callback);
	else if(data===null){
		database.select("set",{"_id":{"$ne":0}},{},function(e,r){
			callback(e,e?null:
				r.filter(function(set){
					return Array.isArray(set._refs.group) && set._refs.group.length>0;
				})
			);
		});
	} else callback("corrupt");

});

rpc.on("set.display",function(socket,data,callback){
	async.waterfall([
		function(cb){ database.get("set",{"name":String(data)},{},cb); }
	], function(e,r){ callback(e,e?undefined:r); })
});

rpc.on("set.groups",function(socket,data,callback){
	if(misc.isobj(data)) database.page("group",{"_id":{"$ne":0},"set._id":data.data.set},{},data.$page,callback);
	else callback("corrupt");
});