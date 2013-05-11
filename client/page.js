
var unauthorized = $("<div style='text-align:center;padding:10px;border:2px solid #eee;border-radius:10px;margin:100px 300px;'>Access Denied<div>");

var page = exports = function(){ widget.apply(this,arguments); };

exports.$current = {data:null, reload:misc.nop, show:misc.nop};

page.prototype = new widget();

var lock = new misc.semaphore(1);

page.prototype.show = function(data){
	lock.acquire(function(){
		var that = this;
		this.element.children().not(":first-child").remove();
		var first = this.element.children().first();
		var second = this.element.append("<div></div>").children().last().css("display","none");
		first.animate({opacity:0.5},display.duration);
		var process = function(error,result){
			// support to load a different page without changing location.hash
			if(error==="load" && page[result] instanceof page){
				that = page[result];
				page[result].display.call(page[result],data,process);
			} else if(error==="redirect"){
				location.hash = result;
				lock.release();
			} else if(error){
				display.error(error);
				first.animate({opacity:1},display.duration);
				second.remove();
				display.prevhash();
				lock.release();
			} else {
				that.data = data;
				exports.$current = that;
				first.stop().animate({opacity:0,height:0},display.duration,function(){ first.remove(); });
				second.append(result).fadeIn(display.duration);
				lock.release();
			}
		};
		// if(auth.level<this.auth) process(null,unauthorized);
		this.display.call(this,data,process);
	},this);
	return this;
};

page.prototype.hide = function(){
	var first = this.element.children().first();
	first.animate({opacity:0,height:0},display.duration,function(){ first.remove(); });
	return this;
};

/*
In case a reload is invoked during a transition that fails, the dead page would
have taken the hit instead of the live one. To prevent that, reloads are delayed
until the transition is over.
*/

page.prototype.reload = function(){
	lock.acquire(function(){
		--lock.count; // release lock but dont execute the next function queued
		if(this===exports.$current) this.show(this.data);
	},this);
	return this;
};
