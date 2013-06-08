
rpc.on("user.list",function(socket,data,callback){
	if(misc.isobj(data)) database.page("user",{"_id":{"$ne":0}},{},data.$page,callback);
	else callback("corrupt");
});

rpc.on("user.display",function(socket,data,callback){
	async.waterfall([
		function(cb){ cb(typeof(data)==="object" && data!==null && typeof(data.username)==="string" ? null : "corrupt"); },
		function(cb){ cb(!data.edit || socket.data.auth>=constant.adminlevel || (socket.data.user && socket.data.user.username===data.username) ? null : "unauthorized"); },
		function(cb){ database.get("user",{"username":data.username},{},function(e,r){ if(!e && !data.edit) delete r.password; cb(e,r); }); }
	],function(e,r){ callback(e,r); });
});

var verify_groups = function(admin_reg,user,sets,groups){
	var result = [], error = false;
	sets.forEach(function(set){
		if(set.freedom==="1" || admin_reg){
			// check for data format, and if exclusive set, ensure that exactly one item is selected
			if(!Array.isArray(groups[set._id]) || set.exclusive==="1" && groups[set._id].length!==1) error = 1;
			else groups[set._id].forEach(function(g){
				if(!misc.isobj(g) || typeof(g._id)!=="number") error = 2;
				else if(set._refs.group.indexOf(g._id)===-1) error = 3;
				else result.push(g);
			});
		} else result = result.concat(user.groups.filter(function(g){ return g.set._id===set._id; }));
	});
	return error?error:result;
};

var verify_limits = function(userid,groups,sets,callback){
	var limit = {};
	sets.forEach(function(set){ limit[set._id]=set.limit; });
	async.parallel(groups.map(function(g){
		return function(cb){
			database.get("group",{"_id":g._id},{},function(e,r){
				cb(
					e ? e :
					limit[g._id]===0 ? null :
					(!misc.isobj(r._refs) || !Array.isArray(r._refs.user) || r._refs.user.filter(function(u){ return u!==userid; }).length<limit[g.set._id] ? null : "limit-exceeded:"+g.name)
				);
			});
		};
	}),callback);
};

rpc.on("user.create",function(socket,data,callback){
	async.waterfall([
		function(cb){ cb(typeof(data)==="object" && data!==null && typeof(data.groups)==="object" && data.groups!==null ? null : "corrupt"); },
		function(cb){ rpc.emit("set.list",socket,null,function(e,r){ cb(e,e?null:r); }); },
		function(s,cb){
			data.auth = schema.user.auth.default;
			data.groups = verify_groups(true,{groups:[]},s,data.groups);
			if(!Array.isArray(data.groups)){ cb("corrupt:groups"); return; }
			data.$collection = "user";
			verify_limits(0,data.groups,s,cb);
		}
	],function(e){ if(e) callback(e); else action.insert(socket,data,callback); });
});

rpc.on("user.modify",function(socket,data,callback){
	async.waterfall([
		function(cb){ cb(typeof(data)==="object" && data!==null && typeof(data._id)==="number" && typeof(data.groups)==="object" && data.groups!==null ? null : "corrupt"); },
		function(cb){ database.get("user",{"_id":parseInt(data._id)},{},function(e,r){ cb(e,e?null:r); }); },
		function(u,cb){ database.select("set",{"_id":{"$ne":0}},{},function(e,r){ cb(e,e?null:u,e?null:r); }); },
		function(u,s,cb){
			if(socket.data.user===null){ cb("unauthorized"); return; }
			if(socket.data.auth<constant.adminlevel){
				data.username = u.username;
				data.auth = u.auth;
			} // or else they should be provided
			data.groups = verify_groups(socket.data.auth>=constant.adminlevel,u,s,data.groups);
			if(!Array.isArray(data.groups)){ cb("corrupt:groups"); return; }
			data.$collection = "user";
			cb(null);
			verify_limits(u._id,data.groups,s,cb);
		}
	],function(e){ if(e) callback(e); else action.update(socket,data,callback); });
});