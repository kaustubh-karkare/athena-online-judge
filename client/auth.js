
var key = "athena/autologin";

var auth = exports = new misc.emitter();
auth.event = "auth"; auth.user = null; auth.level = 0;

auth.change = function(fn){ auth.on(auth.event,fn); };
itc.on(auth.event,function(user){
	auth.user = user; old = auth.level;
	auth.emit(auth.event, auth.level=(user===null?0:parseInt(user.auth)), old );
});

auth.login = function(username,password,auto){
	rpc("user.login",{"username":username,"password":password},function(error,result){
		if(!error) window.localStorage[key] = JSON.stringify([username,password]);
		if(error){
			itc.broadcast(auth.event,null);
			if(!auto) display.error(error);
			return;
		}
		else itc.broadcast(auth.event,result.user);
	});
};

auth.logout = function(){
	rpc("user.logout",null,function(error,result){
		if(error){ display.error(error); return; }
		delete window.localStorage[key];
		itc.broadcast(auth.event,null);
	});
};

var autologin = [];
auth.change(function(){
	while(autologin.length)
		autologin.pop()(auth.level);
});

auth.autologin = function(callback){
	if(typeof(callback)==="function") autologin.push(callback);
	try { auth.login.apply(auth,JSON.parse(window.localStorage[key]).concat(true)); }
	catch(e){ itc.$emit(auth.event,null); }
};