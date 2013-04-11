
rpc.on("socket.connect",function(socket){
	if(arguments.length!==1) return; // prevent remote triggering
	socket.data.user = null;
	socket.data.auth = 0;
	socket.data.files = [];
});

rpc.on("socket.disconnect",function(socket){
	if(arguments.length!==1) return; // prevent remote triggering
	socket.data.files.forEach(function(id){
		filesystem.file.delete(id,function(e){ console.log("socket.disconnect","file.delete",id,e); });
	});
});

rpc.on("user.login",function(socket,data,callback){
	var spec = {type:"object",items:{username:{type:"string"},password:{type:"string"}}};
	async.waterfall([
		function(cb){ specification.match_complete(spec,data,cb); },
		function(select,cb){ database.get("user",select,{},cb); }
	], function(error,result){
		if(error){ callback(error); return; }
		socket.data.user = result;
		socket.data.auth = ["anon","normal","admin"].indexOf(socket.data.user.type);
		callback(null,{"user":socket.data.user,"auth":socket.data.auth});
	});
});

rpc.on("user.logout",function(socket,data,callback){
	socket.data.user = null;
	socket.data.auth = 0;
	callback(null);
});