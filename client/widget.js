
var widget = exports = function(disp,auth){
	this.element = $();
	this.display = (typeof(disp)==="function"?disp:function(data,cb){ cb(null,JSON.stringify(data)); });
	this.auth = (auth===undefined?0:auth);
};

widget.prototype.bind = function(e){
	this.element = $(e);
	return this;
};

widget.prototype.show = function(data){
	var first = this.element.children().first();
	this.element.children().not(first).remove();
	var second = this.element.append("<div>").children().last().css("display","none");
	var process = function(e,r){
		if(e){ second.hide(); return; }
		first.css("position","absolute").fadeOut(display.duration,function(){ first.remove(); });
		second.append(r).fadeIn(display.duration);
	};
	if(auth.level<this.auth) process("unauthorized");
	else this.display.call(this,data,process);
};

widget.prototype.hide = function(){
	this.element.animate({opacity:0,height:0},display.duration,function(){ this.element.empty(); });
};

widget.prototype.reload = function(){ this.show(); };