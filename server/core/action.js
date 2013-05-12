
var action = exports = {};

action.initialize = function(callback){
	async.series([
		// Step 1 : Specification Verification
		function(cb){
			async.parallel(Object.keys(schema).map(function(collection){
				return function(cb2){ specification.verify(collection,schema[collection],cb2); };
			}),cb);
		},
		// Step 2 : Ensuring Indexes
		function(cb){
			var fns = [];
			Object.keys(schema).map(function(collection){
				schema[collection]["_id"] = { type:"integer", internal: true };
				Object.keys(schema[collection]).forEach(function(key){
					if(schema[collection][key].primary===false) return;
					var field = {}; field[key] = 1;
					fns.push(function(cb2){
						mongodb.ensureIndex(config.database.prefix+collection,field,cb2);
					}); // fns.push
				}); // field
			}); // collection
			async.parallel(fns,cb);
		}
	],function(e){ callback(e); });
};

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
		function(cb){ data._id = -1; specification.match.complete(collection,schema[collection],data,function(e,i,s){ if(!e){ item=i; save=s; } cb(e); }); },
		// prevent collisions for keys
		function(cb){
			async.parallel(Object.keys(schema[collection]).filter(function(key){
				var x = schema[collection];
				return x.primary || x.unique;
			}).map(function(key){
				var select = {}; select[key] = item[key];
				return function(cb2){ database.prevent(collection,select,{},cb2); };
			}),cb);
		},
		// calculate the actual value _id and replace the dummy value
		function(cb){
			database.nextid(collection,function(e,n){
				if(!e){
					item._id=n;
					if("$id" in data && Array.isArray(data["$id"]))
						data["$id"].forEach(function(x){ item[x]=""+n; });
				}
				cb(e);
			});
		},
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
		function(cb){ specification.match.complete(collection,schema[collection],data,function(e,i,s){ if(!e){ item2=i; save2=s; } cb(e); }); },
		// ensure that the item _id is present and extract it
		function(cb){ if("_id" in item2){ id=item2._id; delete item2._id; cb(null); } else cb("missing:_id"); },
		// prevent collisions for keys
		function(cb){
			async.parallel(Object.keys(schema[collection]).filter(function(key){
				var x = schema[collection];
				return x.primary || x.unique;
			}).map(function(key){
				var select = {"_id":{"$ne":id}}; select[key] = item2[key];
				return function(cb2){ database.prevent(collection,select,{},cb2); };
			}),cb);
		},
		// use the above _id to obtain the current version of the object
		function(cb){ database.get(collection,{"_id":id},{},function(e,i){ if(!e) item1=i; cb(e); }); },
		// obtain the current list of references & files
		function(cb){ backref = item1._refs; specification.match.complete(collection,schema[collection],item1,function(e,i,s){ if(!e){ item1=i; save1=s; } cb(e); }) },
		// update back-references from other rows to this one
		function(cb){
			// for all those rows to which references not longer exist, remove remote back-references
			var x = {"$pop":{}}; x["$pop"]["_refs."+collection] = id;
			for(key in save1.references) save1.references[key].forEach(function(id){
				if(Array.isArray(save2.references[key]) && save2.references[key].indexOf(id)!==-1) return; // unchanged => skip
				refs.push(function(key,id){
					return function(cb2){ database.update(key,{"_id":id},x,{},cb2); };
				}(key,id));
			});
			// for all those rows to which references have just come into existance, add remote back-references
			var x = {"$push":{}}; x["$push"]["_refs."+collection] = id;
			for(key in save2.references) save2.references[key].forEach(function(id){
				if(Array.isArray(save1.references[key]) && save1.references[key].indexOf(id)!==-1) return; // unchanged => skip
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
			Object.keys(schema[collection]).filter(function(key){
				var x = schema[collection];
				return x.primary || x.cache;
			}).forEach(function(key){ if(item1[key]!==item2[key]) change = true; });
			if(change){
				// queue updates for all rows that remotely forward-reference this
				for(var key in backref) backref[key].forEach(function(id){ refs.push(function(key,id){
					return function(cb2){
						async.waterfall([
							function(cb3){ database.get(key,{_id:id},{},function(e,r){ cb3(e,r); }) },
							function(r,cb3){ specification.match.complete(key,schema[key],r,function(e,r){ cb3(e,r); }); },
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
				return function(cb2){ filesystem.delete(fid,cb2); };
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
		// ensure that the data provided is sufficient to uniquely identify the item
		function(cb){
			if(isNaN(data._id=parseInt(data._id))) cb("corrupt:"+collection+"._id");
			else { item2 = { "_id": data._id }; cb(null); }
		},
		// obtain the item to be deleted from the database
		function(cb){ database.get(collection,item2,{},function(e,i){ if(!e) item1=i; cb(e); }); },
		// save backward-references and set marker to prevent another delete operation from starting on the same item
		function(cb){ backref = item1._refs; if(item1._deleting) cb("deleting"); else database.update(collection,item2,{"$set":{_deleting:true}},{},cb); },
		// set the flag to indicate that a delete marker has been set and in case of failure must be unset. additionally, get list of files & forward-references
		function(cb){ flag = true; specification.match.complete(collection,schema[collection],item1,function(e,i,s){ if(!e){ item1=i; save1=s; } cb(e); }); },
		// delete all the attached files
		function(cb){ async.parallel(save1.files.map(function(f){ return function(cb2){ filesystem.delete(f.id,cb2); }; }),cb); },
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






action.integrity = function(callback){
	var files = [];
	async.series([
		function(cb){
			async.series([
				// 1 : Create a dummy file for broken file references.
				function(cb2){ filesystem.open(config.dummy.file.id,"w",cb2); },
				function(cb2){ filesystem.close(config.dummy.file.id,cb2); },
				// 4.4 : Get list of all files in database
				function(cb2){ filesystem.list(function(e,r){ if(!e) files=r; cb2(e); }) }
			],function(e){ cb(e); });
		},
		function(cb){
			// for each table
			async.parallel(Object.keys(schema).map(function(name){
				return function(cb2){
					async.waterfall(mongodb.ready(name).concat([
						// 2 : Create dummy rows in each table for broken row references.
						function(collection,cb3){ specification.match.repair(name,schema[name],config.dummy.reference,function(e,item){ cb3(e,collection,item); }); },
						function(collection,item,cb3){ collection.update(config.dummy.reference,item,{upsert:true},function(e){ cb3(e,collection); }); },
						// 3 : Remove back-references from all rows of all tables.
						function(collection,cb3){ collection.update({},{"$unset":{"_refs":1}},{multi:true},cb3); }
					]),cb2);
				};
			}), cb);
		},
		function(cb){
			// for each table
			async.series(Object.keys(schema).map(function(name){
				return function(cb2){
					async.waterfall(mongodb.ready(name).concat([
						// Step 4 : Check each row in each table
						function(collection,cb3){
							var cursor = collection.find({"_id":{"$ne":0}});
							var process = function(e,item){
								if(e===null && item===null) cb3(null);
								else async.waterfall([
									function(cb4){ cb4(e); },
									// 4.1 : Fix the current object
									function(cb4){ var backref = item._refs ? item._refs : {}; specification.match.repair(name,schema[name],item,function(e,r,s){ r._refs = backref; cb4(e,r,s); }); },
									// 4.2 : Update the current object
									function(r,s,cb4){ collection.update({_id:r._id},r,{},function(e){ cb4(e,r,s); }); },
									// 4.3 : Update back-references
									function(r,s,cb4){
										var refs = [], push = {"$push":{}}; push["$push"]["_refs."+name] = r._id;
										for(var name2 in s.references) s.references[name2].forEach(function(id){
											refs.push(function(name2,id){
												return function(cb5){ database.update(name2,{"_id":id},push,{},cb5); };
											}(name2,id));
										});
										async.parallel(refs,function(e){ cb4(e,r,s); });
									},
									// 4.5 : Update files
									function(r,s,cb4){
										s.files.forEach(function(f){ files.remove(f.id); });
										cb4(null);
									}
								], function(e){ if(e) cb3(e); else cursor.nextObject(process); })
							}; // process
							cursor.nextObject(process);
						} // function:cb3
					]),cb2); // waterfall
				}; // function:cb2
			}), cb); // parallel
		}, // function:cb
		function(cb){
			// 4.6 Delete all unreferenced files.
			async.parallel(files.map(function(f){
				return function(cb2){ filesystem.delete(f.id,cb2); };
			}),cb);
		}
	],function(e){ callback(e); });

}; // integrity