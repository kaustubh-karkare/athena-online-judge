
var socket = exports = new misc.emitter();
socket.itc_exclude = [];
var link = null;
var log = false;

socket.$emit = socket.emit;
socket.emit = function(){
	var args = Array.prototype.slice.apply(arguments);
	if(link===null) delivery.emit("socket",args);
	else link.emit.apply(link,args);
};

leader.on("start",function(){
	link = io.connect();
	link.on("connect",function(){
		link.$emit = socketio.modified_$emit; // global-capture
		link.on(socketio.event_global_receive,function(){
			var args = Array.prototype.slice.apply(arguments);
			socket.$emit.apply(socket,args);
			if(socket.itc_exclude.indexOf(args[0])==-1) itc.emit("socket",args);
			if(log) console.log("[socket] recv",arguments);
		});
		link.emit = socketio.modified_emit; // pre-send
		link.on(socketio.event_global_presend,function(){
			if(log) console.log("[socket] send",arguments);
		});
		socket.$emit("connect");
	});
});

delivery.on("socket",function(args,callback){
	link.emit.apply(link,args);
	callback(null);
});

itc.on("socket",function(args){
	socket.$emit.apply(socket, args);
});