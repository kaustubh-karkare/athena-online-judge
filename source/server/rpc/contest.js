
rpc.on("contest.list",function(socket,data,callback){
	var condition = data.data==="past" ? {"end":{$lt:new Date().valueOf()}} : {"end":{$gte:new Date().valueOf()}};
	condition._id = {"$ne":0};
	database.page("contest",condition,{"problems":0},data.$page,function(e,r){ callback(e,e?undefined:r); });
});

rpc.on("contest.display",function(socket,data,callback){
	var contest;
	async.series([
		function(cb){ cb(misc.isobj(data) && typeof(data.contest)==="string" ? null : "corrupt"); },
		function(cb){ database.get("contest",{"name":data.contest},{},function(e,r){ contest=r; cb(e); }); },
		function(cb){ if(misc.now()<contest.start) contest.problems = null; cb(null); }
	],function(e){ callback(e,e?undefined:contest); });
});