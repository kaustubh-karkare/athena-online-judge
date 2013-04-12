
// Ensure that the Database Schema has no errors.
async.parallel(Object.keys(schema).map(function(collection){
	return function(cb){ specification.verify(schema[collection],cb); };
}),function(error,result){
	if(error){ console.log(error); process.exit(); }
});

// Ensure that all collections are appropriately indexed.
Object.keys(schema).map(function(collection){
	schema[collection].keys.push("_id");
	schema[collection].items["_id"] = {type:"integer",internal:true};
	schema[collection].keys.forEach(function(key){
		var field = {}; field[key] = 1;
		mongodb.ensureIndex(config.database.prefix+collection,field,misc.nop);
	});
});

rpc.on("database.insert",function(socket,data,callback){
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var item, save;
	async.series([
		function(cb){ data._id = -1; specification.match_complete(collection,schema[collection],data,function(e,i,s){ if(!e){ item=i; save=s; } cb(e); }); },
		function(cb){ database.nextid(collection,function(e,n){ if(!e) item._id=n; cb(e); }); },
		function(cb){ socket.data.files.remove(save.files.map(function(f){ return f.id; })); cb(null); },
		function(cb){ database.insert(collection,item,{},cb); }
	], function(error){ callback(error,error?undefined:item); });
});

rpc.on("database.update",function(socket,data,callback){
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var id, item1, save1, item2, save2;
	async.series([
		// ensure validity of data received from client, and obtain list of references & files
		function(cb){ specification.match_complete(collection,schema[collection],data,function(e,i,s){ if(!e){ item2=i; save2=s; } cb(e); }); },
		// ensure that the item _id is present and extract it
		function(cb){ cb("_id" in item2?(id=item2._id,delete item2._id,null):"missing:_id"); },
		// use the above _id to obtain the current version of the object
		function(cb){ database.get(collection,{"_id":id},{},function(e,i){ if(!e) item1=i; cb(e); }); },
		// obtain the current list of references & files
		function(cb){ specification.match_complete(collection,schema[collection],item1,function(e,i,s){ if(!e){ item1=i; save1=s; } cb(e); }) },
		// map file objects to file-ids for convenience, and detach all newly uploaded files from the socket (or else they will be deleted)
		function(cb){
			save1.files = save1.files.map(function(f){ return f.id; });
			save2.files = save2.files.map(function(f){ return f.id; });
			socket.data.files.remove(save2.files);
			cb(null);
		},
		// delete all files that are no longer referred to by the object
		function(cb){ async.parallel(save1.files.remove(save2.files).map(function(fid){ return function(cb2){ filesystem.file.delete(fid,cb2); }; }),cb); },
		// finally, perform the actual update operation
		function(cb){ database.update(collection,{"_id":id},{"$set":item2},{},cb); }
		// return
	], function(error){ if(error) callback(error); else callback(null,(item2._id=id,item2)); });
});

rpc.on("database.delete",function(socket,data,callback){
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var item1, save1, item2;
	async.series([
		function(cb){ specification.match_select(collection,schema[collection],data,function(e,i){ if(!e) item2=i; cb(e); }); },
		function(cb){ database.get(collection,item2,{},function(e,i){ if(!e) item1=i; cb(e); }); },
		function(cb){ specification.match_complete(collection,schema[collection],item1,function(e,i,s){ if(!e){ item1=i; save1=s; } cb(e); }); },
		function(cb){ async.parallel(save1.files.map(function(f){ return function(cb2){ filesystem.file.delete(f.id,cb2); }; }),cb); },
		function(cb){ database.delete(collection,item2,{},cb) }
	], function(error){ callback(error); });
});

rpc.on("database.specific",function(socket,data,callback){
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var item, result;
	async.series([
		function(cb){ specification.match_select(collection,schema[collection],data,function(e,i){ if(!e) item=i; cb(e); }); },
		function(cb){ database.get(collection,item,{},function(e,r){ if(!e) result=r; cb(e); }); }
	], function(error){ callback(error,result); });
});

rpc.on("database.pagination",function(socket,data,callback){
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var item, result;
	async.series([
		function(cb){ specification.match_partial(collection,schema[collection],data,function(e,i){ if(!e) item=i; cb(e); }); },
		function(cb){
			if(typeof(data.$page)!=="object" || data.$page===null){ cb("corrupt:$page"); return; }
			var a = ["page","size","sort"];
			for(var i=0;i<a.length;++i){
				if(!(a[i] in data.$page)){ cb("missing:$page:"+a[i]); return; }
				if(i<2){
					data.$page[a[i]] = parseInt(data.$page[a[i]]);
					if(!isNaN(data.$page[a[i]])) continue;
				} else {
					if(typeof(data.$page[a[i]])==="string") continue;
				}
				cb("corrupt:$page:"+a[i]); return;
			}
			cb(null);
		},
		function(cb){ database.page(collection,item,{},data.$page,function(e,r){ if(!e) result=r; cb(e); }); }
	], function(error){ callback(error,result); });
});

rpc.on("database.suggest",function(socket,data,callback){
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var item, result, key = schema[collection].keys[1], columns = {};
	schema[collection].keys.forEach(function(x){ columns[x]=1; });
	async.series([
		function(cb){ specification.match_partial(collection,schema[collection],data,function(e,i){ if(!e) item=i; cb(e); }); },
		function(cb){
			if(typeof(data)==="object" && data!==null && Array.isArray(data["$exclude"])){
				var exclude = data["$exclude"].map(function(x){ return parseInt(x); }).filter(function(x){ return !isNaN(x); });
				if("_id" in item) item._id = {"$in":item._id,"$nin":exclude}; else item._id = {"$nin":exclude};
			}
			if(key in item) item[key] = RegExp(RegExp.quote(item[key]),"i");
			cb(null);
		},
		function(cb){ database.page(collection,item,columns,{"page":1,"size":5,"sort":key},function(e,r){ if(!e) result=r; cb(e); }); }
	], function(error){ callback(error,result); });
});