
var current, next_id = 0;

var widget = exports = function(disp){
	this.id = ++next_id;
	this.element = null;
	this.display = (typeof(disp)==="function"?disp:function(data,cb){ cb(null,JSON.stringify(data)); });
};

widget.prototype.bind = function(e){
	this.element = $(e);
	return this;
};

var effect = 1;

widget.prototype.show = function(data){
	var oldid = current; current = this.id;
	this.data = data;
	this.element.children().not(":first-child").remove();
	var first = this.element.children().first();
	if(effect===2) first.css({"width":first.css("width"),"position":"absolute"});
	var second = this.element.append("<div></div>").children().last().css("display","none");
	first.animate({opacity:0.5},display.duration);
	this.display.call(this,data,function(error,result){
		if(error){
			first.animate({opacity:1},display.duration);
			current = oldid; display.prevhash();
			console.log(error);
		} else {
			if(effect===1) first.stop().animate({opacity:1,height:0},display.duration,function(){ first.remove(); });
			if(effect===2) first.stop().fadeOut(display.duration,function(){ first.remove(); });
			second.append(result).fadeIn(display.duration);
		}
	});
	return this;
};

widget.prototype.hide = function(){
	first.animate({opacity:0,height:0},display.duration);
	return this;
};

widget.prototype.reload = function(){
	if(current!=this.id) return this;
	else return this.show(this.data);
};