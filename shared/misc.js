var misc = exports = {};

misc.nop = function(){};
misc.echo = function(){ console.log(arguments); };
misc.echo2 = function(){ console.log(JSON.stringify(arguments)); };
misc.timestamp = function(){ return (new Date().getTime()); };

misc.deferred = function(){
	this.success = [];
	this.failure = [];
	this._state = "pending";
};
misc.deferred.prototype.done = function(fn){ this.success.push(fn); };
misc.deferred.prototype.fail = function(fn){ this.failure.push(fn); };
misc.deferred.prototype.resolve = function(){
	this._state = "resolved";
	var args = Array.prototype.slice.apply(arguments);
	this.done = function(fn){ fn.apply(null,args); };
	this.fail = misc.nop;
	while(this.success.length) this.success.shift().apply(null,args);
};
misc.deferred.prototype.reject = function(){
	this._state = "rejected";
	var args = Array.prototype.slice.apply(arguments);
	this.done = misc.nop;
	this.fail = function(fn){ fn.apply(null,args); };
	while(this.failure.length) this.failure.shift().apply(null,args);
};
misc.deferred.prototype.state = function(){ return this._state; };

misc.emitter = function(){ this.events = {}; };
misc.emitter.prototype.clear = function(){ this.events = {}; };
misc.emitter.prototype.on = misc.emitter.prototype.addListener = function(name,listener){
	(this.events[name] = this.events[name] || []).push(listener);
};
misc.emitter.prototype.off = misc.emitter.prototype.removeListener = function(name,listener){
	if(this.events[name]){
		this.events[name].remove(listener);
		if(this.events[name].length==0) delete this.events[name];
	}
};
misc.emitter.prototype.once = function(name,listener){
	emitter.prototype.addListener(name,function wrapper(){
		listener.apply(null,Array.prototype.slice.apply(arguments));
		emitter.prototype.removeListener(name,wrapper);
	});
};
misc.emitter.prototype.listeners = function(name){
	return (name!==undefined ? this.events[name] || [] : this.events);
};
misc.emitter.prototype.emit = function(name){
	var args = Array.prototype.slice.apply(arguments,[1]);
	if(name in this.events) this.events[name].forEach(function(fn){ fn.apply(null,args); });
	return name in this.events;
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