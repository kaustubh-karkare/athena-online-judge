var misc = exports = {};

misc.nop = function(){};
misc.echo = function(){ console.log(arguments); };
misc.echo2 = function(){ console.log(JSON.stringify(arguments)); };
misc.timestamp = function(){ return (new Date().getTime()); };

misc.deferred = function(){
	var interface = {}, success = [], failure = [], state = "pending";
	interface.done = function(fn){ success.push(fn); };
	interface.fail = function(fn){ failure.push(fn); };
	interface.resolve = function(){
		state = "resolved";
		var args = Array.prototype.slice.apply(arguments);
		interface.done = function(fn){ fn.apply(null,args); };
		interface.fail = misc.nop;
		while(success.length) success.shift().apply(null,args);
	};
	interface.reject = function(){
		state = "rejected";
		var args = Array.prototype.slice.apply(arguments);
		interface.done = misc.nop;
		interface.fail = function(fn){ fn.apply(null,args); };
		while(failure.length) failure.shift().apply(null,args);
	};
	interface.state = function(){ return state; };
	return interface;
};

misc.emitter = function(){
	var interface = {}, events = {};
	interface.clear = function(){ events = {}; };
	interface.on = interface.addListener = function(name,listener){
		(events[name] = events[name] || []).push(listener);
	};
	interface.off = interface.removeListener = function(name,listener){
		if(events[name]){
			events[name].remove(listener);
			if(events[name].length==0) delete events[name];
		}
	};
	interface.once = function(name,listener){
		interface.addListener(name,function wrapper(){
			listener.apply(null,Array.prototype.slice.apply(arguments));
			interface.removeListener(name,wrapper);
		});
	};
	interface.listeners = function(name){
		return (name!==undefined ? events[name] || [] : events);
	};
	interface.emit = function(name){
		var args = Array.prototype.slice.apply(arguments,[1]);
		if(name in events) events[name].forEach(function(fn){ fn.apply(null,args); });
		return name in events;
	};
	interface.events = events;
	return interface;
};

misc.array2object = function(array1,array2){
	var result = {}, len = Math.min(array1.length,array2.length);
	for(i=0;i<len;++i) if(typeof(array1[i])!="object" && array1[i]!==undefined) result[array1[i]] = array2[i];
	return result;
};

misc.deepcopy = function(x){
	var y = x;
    if(Array.isArray(x)){ y=[]; for(var i=0;i<x.length;++i) y[i]=arguments.callee(x[i]); }
    if(typeof(x)==="object" && x!==null){ y={}; for(var i in x) y[i]=arguments.callee(x[i]); }
    return y;
};

misc.attrmap = function(x){
	var attrs = {};
	$.each(x.attributes, function(i,e){ attrs[e.nodeName]=e.nodeValue; });
	return attrs;
};