
var safe = function(callback){ return function(e,r){ callback(e,e?undefined:r); }; };

rpc.on("contest.list",function(socket,data,callback){
	var condition = data.data==="past" ? {"end":{$lt:new Date().valueOf()}} : {"end":{$gte:new Date().valueOf()}};
	condition._id = {"$ne":0};
	database.page("contest",condition,{},data.$page,safe(callback));
});

rpc.on("contest.display",function(socket,data,callback){ database.get("contest",{"name":data},{},safe(callback)); });
rpc.on("problem.display",function(socket,data,callback){ database.get("problem",{"name":data},{},safe(callback)); });

rpc.on("problem.update",function(socket,data,callback){
	async.series([
		function(cb){ cb(socket.data.auth>=2?null:"unauthorized"); },
		function(cb){ cb(Array.isArray(data) && data.length===3 && !isNaN(parseInt(data[0])) && (data[1]==="statement"||data[1]==="tutorial") && typeof(data[2])==="string" ? null : "corrupt"); },
		function(cb){ var set={};set[data[1]]=data[2]; database.update("problem",{_id:parseInt(data[0])},{"$set":set},cb); }
	],function(e){ callback(e); });
});