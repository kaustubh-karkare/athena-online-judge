
var prefix = "rpc/";
var counter = 0;
var log = false;

var cache_store = {};
var cache_event = "cache";

socket.itc_exclude.push(prefix+"down");

delivery.on("rpc",function(name,data,callback){
	var key1 = unique+":"+(counter++), done = false;
	var response = function(key2,error,result){
		if(key1!=key2 || done) return; else done = true;
		socket.off(prefix+"down",response);
		if(log) console.log("[rpc] recv",data);
		callback(error,result);
	};
	socket.on(prefix+"down",response);
	if(log) console.log("[rpc] send",name,data);
	socket.emit(prefix+"up",key1,name,data);
});

var interface = exports = function(name,data,callback,cache_key){
	if(typeof(callback)!=="function") callback = misc.nop;
	if(cache_key==undefined) delivery.emit("rpc",name,data,callback);
	else {
		if(cache_key in cache_store) callback(null,cache_store[cache_key]);
		else delivery.emit("rpc",name,data,function(error,result){
			if(error!=null){ callback(error); return; }
			interface.cache_set(cache_key,result);
			itc.emit(cache_event,"set",cache_key,result);
			callback(error,result);
		});
	}
};

interface.cache_get = function(key){ return cache_store[key]; };
interface.cache_set = function(key,value){ cache_store[key]=value; };
interface.cache_del =  function(key){ delete cache_store[key]; };

itc.on(cache_event,function(name,key,value){ interface["cache_"+name](key,value); });