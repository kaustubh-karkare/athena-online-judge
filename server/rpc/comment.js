
rpc.on("comment.load",function(socket,data,callback){ // data = location
	// TODO : authorization
	var cl;
	async.series([
		function(cb){ cb(typeof(data)==="string"?null:"corrupt:data"); },
		function(cb){
			async.parallel(
				socket.data.auth>=config.adminlevel ?
				[function(cb2){ database.select("comment",{"location":data,"replyto":null},{},cb2); }] :
				[function(cb2){ database.select("comment",{"location":data,"replyto":null,"access":"1"},{},cb2); }].concat(
					socket.data.user===null ? [] :
					[function(cb2){ database.select("comment",{"location":data,"replyto":null,"access":"0","user._id":socket.data.user._id},{},cb2); }]
				)
			,function(e,r){ if(!e) cl = r[0].concat(r[1]?r[1]:[]); cb(e); });
		},
		function(cb){
			var fns = [];
			cl.forEach(function(c){
				fns.push(function(cb2){
					database.select("comment",{"location":data,"replyto._id":c._id},{},function(e,r){ if(!e) c.replies=r; cb(e); });
				});
			});
			async.parallel(fns,cb);
		}
	],function(error,result){
		if(error){ callback(error); return; }
		callback(null,cl);
	});
});

rpc.on("comment.insert",function(socket,data,callback){
	var id;
	async.series([
		function(cb){ cb(socket.data.user!==0?null:"unauthorized"); },
		function(cb){
			if(typeof(data)!=="object" || data===null){ cb("corrupt"); return; }
			data.$collection = "comment";
			data._id = -1;
			data.name = "meow";
			data.time = (new Date()).valueOf();
			data.user = {_id:socket.data.user._id};
			data.$id = ["name"];
			action.insert(socket,data,function(e,r){ if(!e) id = r._id; cb(e); });
		},
	],function(e){ callback(e,id); })
});

rpc.on("comment.delete",function(socket,data,callback){
	async.series([
		function(cb){ cb(typeof(data)==="object" && data!==null && !isNaN(data._id=parseInt(data._id))?null:"corrupt") },
		function(cb){
			if(socket.data.auth>=config.adminlevel) cb(null);
			else if(socket.data.user) database.get("comment",{"_id":data._id},{},function(e,r){
				cb(r.user._id===socket.data.user._id ? null : "unauthorized");
			});
			else cb("unauthorized");
		},
		function(cb){
			data = {"_id":data._id,"$collection":"comment"};
			action.delete(socket,data,cb);
		}
	],function(e){ callback(e); });
});

rpc.on("comment.access",function(socket,data,callback){
	async.series([
		function(cb){ cb(socket.data.auth>=config.adminlevel?null:"unauthorized"); },
		function(cb){ cb(typeof(data)==="object" && data!==null && !isNaN(data._id=parseInt(data._id))?null:"corrupt") },
		function(cb){ cb(data.access in schema.comment.access.options?null:"corrupt") },
		function(cb){ database.update("comment",{"_id":data._id},{"$set":{"access":data.access}},{},cb); }
	],function(e){ callback(e); });
});