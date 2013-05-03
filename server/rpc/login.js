
rpc.on("socket.connect",function(socket){
	socket.data.user = null;
	socket.data.auth = 0;
});

var spec_login = {type:"object",items:{username:{type:"string"},password:{type:"string"}}};

rpc.on("user.login",function(socket,data,callback){
	async.waterfall([
		function(cb){ specification.match_complete("login",spec_login,data,cb); },
		function(select,save,cb){ database.get("user",select,{},cb); }
	], function(error,result){
		if(error){ callback(error); return; }
		socket.data.user = result;
		socket.data.auth = result.auth;
		callback(null,{"user":socket.data.user});
	});
});

rpc.on("user.logout",function(socket,data,callback){
	socket.data.user = null;
	socket.data.auth = 0;
	callback(null);
});