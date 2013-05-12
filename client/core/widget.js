
var transitions = ["fade","slideup"];

var widget = exports = function(display){
	this.element = $();
	this.display = (typeof(display)==="function"?display:function(data,cb){ cb(null,JSON.stringify(data)); });
};

widget.prototype.bind = function(selector){
	this.element = $(selector);
	return this;
};

widget.prototype.show = function(data,transition){
	var that = this;
	var first = this.element.children().first();
	this.element.children().not(first).remove();
	var second = this.element.append("<div>").children().last().css("display","none");
	first.animate({opacity:0.5},display.duration);
	var process = function(error,result){
		// support to load a different widget without changing location.hash
		if(error==="load" && widget[result] instanceof widget){
			that = widget[result];
			widget[result].display.call(widget[result],data,process);
		} else if(error==="redirect"){
			location.hash = result;
		} else if(error){
			display.error(error);
			first.animate({opacity:1},display.duration);
			second.remove();
			display.prevhash();
		} else {
			that.data = data;
			that.transition = transition;
			that.result = result;
			if(transition==="fade"){
				first.stop().css("position","absolute").fadeOut(display.duration,function(){ first.remove(); });
				second.append(result).fadeIn(display.duration);
			} else {
				first.stop().animate({opacity:0,height:0},display.duration,function(){ first.remove(); });
				second.append(result).fadeIn(display.duration);
			}
		}
	};
	this.display.call(this,data,process);
	return this;
};

widget.prototype.hide = function(){
	this.element.stop().animate({opacity:0,height:0},display.duration,function(){ this.element.empty(); });
	return this;
};

widget.prototype.reload = function(d,t){
	if(this.result!==undefined && this.element.children().first().children().first()[0]===$(this.result)[0])
		this.show(
			d===undefined?this.data:d,
			t===undefined?this.transition:t
		);
	return this;
};
