
rpc.on("database.insert", function(socket,data,callback){
	if(socket.data.auth<config.adminlevel) callback("unauthorized");
	else action.insert(socket,data,callback);
});

rpc.on("database.update", function(socket,data,callback){
	if(socket.data.auth<config.adminlevel) callback("unauthorized");
	else action.update(socket,data,callback);
});

rpc.on("database.delete", function(socket,data,callback){
	if(socket.data.auth<config.adminlevel) callback("unauthorized");
	else action.delete(socket,data,callback);
});

// The following functions are not part of the action module because they do not change the database state.

rpc.on("database.specific",function(socket,data,callback){
	if(socket.data.auth<config.adminlevel){ callback("unauthorized"); return; }
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var item, result;
	async.series([
		function(cb){ specification.match_select(collection,schema[collection],data,function(e,i){ if(!e) item=i; cb(e); }); },
		function(cb){
			if("_id" in item) item._id = {"$in":[item._id],"$nin":[0]}; else item._id = {"$nin":[0]};
			database.get(collection,item,{_ref:0},function(e,r){ if(!e) result=r; cb(e); });
		}
	], function(error){ callback(error,result); });
});

rpc.on("database.pagination",function(socket,data,callback){
	if(socket.data.auth<config.adminlevel){ callback("unauthorized"); return; }
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var item, result;
	async.series([
		function(cb){ specification.match_partial(collection,schema[collection],data,function(e,i){ if(!e) item=i; cb(e); }); },
		function(cb){
			if("_id" in item) item._id = {"$in":[item._id],"$nin":[0]}; else item._id = {"$nin":[0]};
			database.page(collection,item,{_ref:0},data.$page,function(e,r){ if(!e) result=r; cb(e); });
		}
	], function(error){ callback(error,result); });
});

// The following function does not require elevated authorization as it only responds with keys, which are assumed to contain public data.

rpc.on("database.suggest",function(socket,data,callback){
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var item, result, key = schema[collection].keys[0], columns = {};
	schema[collection].keys.forEach(function(x){ columns[x]=1; });
	async.series([
		function(cb){ specification.match_partial(collection,schema[collection],data,function(e,i){ if(!e) item=i; cb(e); }); },
		function(cb){
			if(typeof(data)==="object" && data!==null && Array.isArray(data["$exclude"])){
				var exclude = data["$exclude"].map(function(x){ return parseInt(x); }).filter(function(x){ return !isNaN(x); }).concat(0);
				if("_id" in item) item._id = {"$in":[item._id],"$nin":exclude}; else item._id = {"$nin":exclude};
			} else item._id = ("_id" in item?{"$in":[item._id],"$nin":[0]}:{"$nin":[0]});
			if(key in item) item[key] = RegExp(RegExp.quote(item[key]),"i");
			cb(null);
		},
		function(cb){ database.page(collection,item,columns,{"number":1,"size":5,"sort":key},function(e,r){ if(!e) result=r; cb(e); }); }
	], function(error){ callback(error,result); });
});