
var key = "athena/autologin";

var auth = exports = new misc.emitter();
auth.event = "auth"; auth.user = null; auth.level = 0;

auth.change = function(fn){ auth.on(auth.event,fn); };
itc.on(auth.event,function(user){
	auth.user = user; old = auth.level;
	auth.emit(auth.event, auth.level=(user===null?0:parseInt(user.auth)), old );
});

auth.login = function(username,password,callback){ delivery.emit(auth.event,"login",username,password,callback); };
auth.logout = function(callback){ delivery.emit(auth.event,"logout",null,null,callback); };
auth.autologin = function(callback){
	delivery.emit(auth.event,"autologin",null,null,function(e,r){
		if(!e) itc.$emit(auth.event,r);
		if(typeof(callback)==="function") callback(e,r);
	});
};

delivery.on(auth.event,function(type,username,password,callback){
	if(typeof(callback)!=="function") callback = misc.nop;
	// Step 1 : Check if target state already achieved.
	if(type==="login" && auth.user!==null && auth.user.username===username && auth.user.password===password){ callback(null,auth.user); return; }
	else if(type==="logout" && auth.user===null){ callback(null,null); return; }
	else if(type==="autologin" && auth.user!==null){ callback(null,auth.user); return; }
	// Step 2 : If the required state is not the current one, communicate with the server to make it so.
	if(type==="login"){
		rpc("user.login",{"username":username,"password":password},function(error,result){
			if(!error){
				window.localStorage[key] = JSON.stringify([username,password]);
				itc.broadcast(auth.event,result===null?null:result.user);
				callback(null,result.user);
			} else callback(error);
		});
	} else if(type==="logout"){
		rpc("user.logout",null,function(error,result){
			if(!error){
				delete window.localStorage[key];
				itc.broadcast(auth.event,null);
			}
			callback(null,null);
		});
	} else if(type){
		try {
			var t = JSON.parse(window.localStorage[key]);
			if(t.length!==2
				|| typeof(t[0])!=="string" || t[0].length===0
				|| typeof(t[1])!=="string" || t[1].length===0
				) throw "invalid";
		} catch(e){ callback(null,null); return; }
		arguments.callee("login",t[0],t[1],callback);
	}
});