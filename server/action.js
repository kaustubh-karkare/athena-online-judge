
// Ensure that the Database Schema has no errors.
async.parallel(Object.keys(schema).map(function(collection){
	return function(cb){ specification.verify(collection,schema[collection],cb); };
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

var action = exports = {};

/*
For all actions, `data.$collection` should be a string containing the name of the collection.
In case of insertion or updation, the `data` argument should contain the complete new state of the object.
In case of update, the `data._id` attribute is additionally required for identification. In case of deletion, nothing else is needed.

A forward-reference consists of all keys of the object. A backward-reference consists of only the _id.
During insertion, the forward reference is part of the object data. Corresponding to that, backward-references are added to all the items to which this one refers.
During updation, a change in the forward-references of this object would require changing the corresponding backward-references from other objects (both addition & removal).
During deletion, all backward-references to this object need to be removed. Also, all objects that forward-reference this, ie - have backward-references stored here, need to be deleted.
*/

action.insert = function(socket,data,callback){
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var item, save, refs = [];
	async.series([
		// assuming a dummy value for _id, ensure validity of data and obtain list of files & references
		function(cb){ data._id = -1; specification.match_complete(collection,schema[collection],data,function(e,i,s){ if(!e){ item=i; save=s; } cb(e); }); },
		// calculate the actual value _id and replace the dummy value
		function(cb){ database.nextid(collection,function(e,n){ if(!e) item._id=n; cb(e); }); },
		// detach the newly uploaded files from the socket
		function(cb){ socket.data.files.remove(save.files.map(function(f){ return f.id; })); cb(null); },
		// prepare to update other referenced items
		function(cb){
			var x = {"$push":{}}; x["$push"]["_refs."+collection] = item._id;
			for(key in save.references) save.references[key].forEach(function(id){
				refs.push(function(key,id){
					// update the remote object with a reference back to this item
					return function(cb2){ database.update(key,{"_id":id},x,{},cb2); };
				}(key,id));
			});
			cb(null);
		},
		// perform the actual insertion & update operations
		function(cb){
			refs.push(function(cb2){ database.insert(collection,item,{},cb2); });
			async.parallel(refs,cb);
		}
	], function(error){ callback(error,error?undefined:item); });
};

action.update = function(socket,data,callback){
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var id, item1, save1, item2, save2, backref, refs = [];
	async.series([
		// ensure validity of data received from client, and obtain list of references & files
		function(cb){ specification.match_complete(collection,schema[collection],data,function(e,i,s){ if(!e){ item2=i; save2=s; } cb(e); }); },
		// ensure that the item _id is present and extract it
		function(cb){ if("_id" in item2){ id=item2._id; delete item2._id; cb(null); } else cb("missing:_id"); },
		// use the above _id to obtain the current version of the object
		function(cb){ database.get(collection,{"_id":id},{},function(e,i){ if(!e) item1=i; cb(e); }); },
		// obtain the current list of references & files
		function(cb){ backref = item1._refs; specification.match_complete(collection,schema[collection],item1,function(e,i,s){ if(!e){ item1=i; save1=s; } cb(e); }) },
		// update back-references from other rows to this one
		function(cb){
			// for all those rows to which references not longer exist, remove remote back-references
			var x = {"$pop":{}}; x["$pop"]["_refs."+collection] = id;
			for(key in save1.references) save1.references[key].forEach(function(id){
				if(save2.references[key].indexOf(id)!==-1) return; // unchanged => skip
				refs.push(function(key,id){
					return function(cb2){ database.update(key,{"_id":id},x,{},cb2); };
				}(key,id));
			});
			// for all those rows to which references have just come into existance, add remote back-references
			var x = {"$push":{}}; x["$push"]["_refs."+collection] = id;
			for(key in save2.references) save2.references[key].forEach(function(id){
				if(save1.references[key].indexOf(id)!==-1) return; // unchanged => skip
				refs.push(function(key,id){
					return function(cb2){ database.update(key,{"_id":id},x,{},cb2); };
				}(key,id));
			});
			async.parallel(refs,function(e){ refs=[]; cb(e); });
		},
		// update all reference to this row
		function(cb){
			var change = false;
			// check to see if the keys have changed
			schema[collection].keys.forEach(function(key){ if(item1[key]!==item2[key]) change = true; });
			if(change){
				// queue updates for all rows that remotely forward-reference this
				for(var key in backref) backref[key].forEach(function(id){ refs.push(function(key,id){
					return function(cb2){
						async.waterfall([
							function(cb3){ database.get(key,{_id:id},{},function(e,r){ cb3(e,r); }) },
							function(r,cb3){ specification.match_complete(key,schema[key],r,function(e,r){ cb3(e,r); }); },
							function(r,cb3){ database.update(key,{_id:id},r,{},cb3); }
						],cb2);
					};
				}(key,id)); });
				// actual updating of references is done later, once this row is updated
			}
			cb(null);
		},
		function(cb){
			// map file objects to file-ids for convenience
			save1.files = save1.files.map(function(f){ return f.id; });
			save2.files = save2.files.map(function(f){ return f.id; });
			// detach all newly uploaded files from the socket (or else they will be deleted)
			socket.data.files.remove(save2.files);
			// delete all files that are no longer referred to by the object
			async.parallel(save1.files.remove(save2.files).map(function(fid){
				return function(cb2){ filesystem.file.delete(fid,cb2); };
			}),cb);
		},
		// finally, perform the actual update operation
		function(cb){
			database.update(collection,{"_id":id},{"$set":item2},{},function(e){
				if(!e) async.parallel(refs,cb); else cb(e);
			});
		}
		// return
	], function(error){ if(error) callback(error); else callback(null,(item2._id=id,item2)); });
};


action.delete = function(socket,data,callback){
	if(typeof(data)==="object" && data!==null && data.$collection in schema) var collection = data.$collection; else { callback("unknown-collection"); return; }
	var item1, save1, item2, backref, flag = false;
	async.series([
		function(cb){ specification.match_select(collection,schema[collection],data,function(e,i){ if(!e) item2=i; cb(e); }); },
		function(cb){ database.get(collection,item2,{},function(e,i){ if(!e) item1=i; cb(e); }); },
		function(cb){ backref = item1._refs; if(item1._deleting) cb("deleting"); else database.update(collection,item2,{"$set":{_deleting:true}},{},cb); },
		function(cb){ flag = true; specification.match_complete(collection,schema[collection],item1,function(e,i,s){ if(!e){ item1=i; save1=s; } cb(e); }); },
		function(cb){ async.parallel(save1.files.map(function(f){ return function(cb2){ filesystem.file.delete(f.id,cb2); }; }),cb); },
		// delete all rows that forward-reference this one (ie - have a back-reference here)
		function(cb){
			var refs = [];
			for(var key in backref) backref[key].forEach(function(id){
				refs.push(function(key,id){
					return function(cb2){ action.delete(socket,{"$collection":key,"_id":id},cb2); };
				}(key,id));
			});
			async.parallel(refs,function(e){ cb(e==="deleting"?null:e); });
		},
		// remove all back-references to this row
		function(cb){
			var refs = [];
			var x = {"$pop":{}}; x["$pop"]["_refs."+collection] = item1._id;
			for(key in save1.references) save1.references[key].forEach(function(id){
				refs.push(function(key,id){
					return function(cb2){ database.update(key,{"_id":id},x,{},cb2); };
				}(key,id));
			});
			async.parallel(refs,cb);
		},
		function(cb){ database.delete(collection,item2,{},cb) }
	], function(error){
		if(error && flag) database.update(collection,item2,{"$unset":{_deleting:1}},{},misc.nop);
		callback(error);
	});
};
