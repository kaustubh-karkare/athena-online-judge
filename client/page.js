
var unauthorized = $("<div style='text-align:center;padding:10px;border:2px solid #eee;border-radius:10px;margin:100px 300px;'>Access Denied<div>");

var current;

var page = exports = function(){ widget.apply(this,arguments); };

page.prototype = new widget();

var lock = new misc.semaphore(1);

page.prototype.show = function(data){
	lock.acquire(function(){
		var old = current; current = this;
		this.data = data;
		this.element.children().not(":first-child").remove();
		var first = this.element.children().first();
		var second = this.element.append("<div></div>").children().last().css("display","none");
		first.animate({opacity:0.5},display.duration);
		var process = function(error,result){
			// support to load a different page without changing location.hash
			if(error==="redirect" && page[result] instanceof page){
				page[result].display.call(page[result],data,process);
			} else if(error){
				display.error(error);
				first.animate({opacity:1},display.duration);
				second.remove();
				if(old!==undefined){ current = old; display.prevhash(); }
				else { location.hash = "#"; current = undefined; }
			} else {
				first.stop().animate({opacity:0,height:0},display.duration,function(){ first.remove(); });
				second.append(result).fadeIn(display.duration);
			}
			lock.release();
		};
		if(auth.level<this.auth) process(null,unauthorized);
		else this.display.call(this,data,process);
	}, this);
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
		--lock.count;
		current.show(current.data);
	});
	return this;
};

auth.change(function(){ if(current) current.reload(); });
