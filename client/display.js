
var base="#layout-base-";
var skip=false, history = [""];

var display = exports = {
	duration: 500,
	prevhash: function(){ skip=true; location.hash = history[0]; }
};

display.top = function(){ $("body").animate({"scrollTop":0},display.duration); };
display.bottom = function(){ $("body").animate({"scrollTop":$(document).height()},display.duration); };
display.success = function(msg){ console.log("display.success",msg); };
display.error = function(msg){ console.log("display.error",msg); };

var sidebox = "links,login".split(",");
var pages = Object.keys(widget).remove(sidebox);
var hashchange = function(){
	if(skip){ skip=false; history.pop(); return; }
	var path = location.hash.substr(1).split("/").map(function(p){ return decodeURIComponent(p); });
	if(pages.indexOf(path[0])!==-1) widget[path[0]].show({"path":path},"slideup");
	else if(path[0]==="") widget.home.show(null,"slideup");
	else location.hash="#";
	widget.links.show({"path":path},"fade"); display.top();
	history = history.concat(location.hash).slice(-2);
};
$(window).bind('hashchange',hashchange);

auth.change(function(){ widget.links.reload(); });

display.load = function(){
	$(document.body).empty().html(template["layout-base"]);
	var left = $(base+"left"), flash = $(base+"flash"), main = $(base+"main"), right = $(base+"right");
	pages.forEach(function(name){ widget[name].bind(main); });
	widget.links.bind(left);
	widget.login.bind(right).show(null,"fade");
	hashchange();
};