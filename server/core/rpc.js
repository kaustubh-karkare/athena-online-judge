
var prefix = "rpc/";
var log = !false;

var rpc = exports = new misc.emitter();

var suppress = function(name,data){
	return name=="file.upload.continue"?{"id":data.id,"offset":data.offset,"block":"<suppressed>"}:data;
};

rpc.process = function(socket){
	socket.on(prefix+"up",function(key,name,data){
		if(log) console.log("[rpc] request ",name,suppress(name,data));
		if(name.indexOf("socket.")===0){
			socket.emit(prefix+"down",key,"rpc-suppressed");
			return;
		}
		rpc.emit(name,socket,data,function(error,result){
			if(log) console.log("[rpc] response",name,error,result);
			socket.emit(prefix+"down",key,error,result);
		}) || socket.emit(prefix+"down",key,"rpc-unknown");
	});
	socket.on("disconnect",function(){ rpc.emit("socket.disconnect",socket); });
	rpc.emit("socket.connect",socket);
};

rpc.on("square",function(socket,data,callback){ callback(null,data*data); });
rpc.on("eval",function(socket,data,callback){try{console.log(eval(data));}catch(e){console.log(e.stack);}callback(null);});