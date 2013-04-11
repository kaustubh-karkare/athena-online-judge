/*

Name  : delivery
Description  : Reliable ITC with the leader.
Dependencies : itc leader

Given that data is sent to the server only via the leader tab, we need to guarantee that
it at least reaches the leader. This fulfills that need using queues, acknowledgments
and callbacks, providing a reliable system of communication with the current leader.

*/

var prefix = "delivery/";
var counter = 0;
var timeout = 3*1000;

var delivery = exports = misc.emitter();

delivery.$emit = delivery.emit;

itc.on(prefix+"up",function(key){
	if(leader.check()==false) return;
	var args = Array.prototype.slice.apply(arguments,[1]);
	itc.emit.apply(null,[prefix+"ack",key]);
	// Callback sends only once as if the follower is dead, no point.
	var callback = function(){
		var args = Array.prototype.slice.apply(arguments);
		itc.emit.apply(null,[prefix+"down",key].concat(args));
	};
	delivery.$emit.apply(null,args.concat(callback));
});

delivery.emit = function(){
	var args = Array.prototype.slice.apply(arguments);
	var callback = args[args.length-1];
	if(typeof(callback)==="function") args.pop();
	else callback = misc.nop;

	if(leader.check()) delivery.$emit.apply(null,args.concat(callback));
	else {
		var key1 = unique+":"+(counter++);
		// Keep sending ITC broadcasts until leader confirms.
		var send = function send(){
			if(!leader.check()) itc.emit.apply(null,[prefix+"up",key1].concat(args));
			else {
				// In case you become leader while waiting.
				itc.off(prefix+"ack",f_ack);
				itc.off(prefix+"down",f_down);
				window.clearInterval(sendloop);
				delivery.$emit.apply(null,args.concat(callback));
			}
		};
		var sendloop = window.setInterval(send,1000);
		// Initialize expiry procedures
		var f_expire = function(){
			itc.off(prefix+"ack",f_ack);
			itc.off(prefix+"down",f_down);
			window.clearInterval(sendloop);
			callback("timeout");
		};
		var expire;
		// If acknowledged, stop sending and start expiry timeout.
		var f_ack = function(key2){
			if(key1!=key2) return;
			itc.off(prefix+"ack",f_ack);
			window.clearInterval(sendloop);
			expire = window.setTimeout(f_expire,timeout);
		};
		// If response, stop all and callback.
		var f_down = function(key2){
			if(key1!=key2) return;
			itc.off(prefix+"ack",f_ack);
			itc.off(prefix+"down",f_down);
			window.clearInterval(sendloop);
			window.clearTimeout(expire);
			var args = Array.prototype.slice.apply(arguments,[1]);
			callback.apply(null,args);
		};
		itc.on(prefix+"ack",f_ack);
		itc.on(prefix+"down",f_down);
		send();
	}
};