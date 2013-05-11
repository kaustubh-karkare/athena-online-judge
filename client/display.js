
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

var path = [];
var hashchange = function(){
	if(skip){ skip=false; history.pop(); return; }
	path = location.hash.substr(1).split("/").map(function(p){ return decodeURIComponent(p); });
	if(Object.keys(page).indexOf(path[0])!==-1) page[path[0]].show({"path":path});
	else if(path[0]==="") page.home.show(); // $(base+"main").empty();
	else location.hash="#";
	widget.links.show(path); display.top();
	history = history.concat(location.hash).slice(-2);
};
$(window).bind('hashchange',hashchange);

auth.change(function(){ widget.links.show(path); });

display.load = function(){
	$(document.body).empty().html(template["layout-base"]);
	var left = $(base+"left"), flash = $(base+"flash"), main = $(base+"main"), right = $(base+"right");
	Object.keys(page).forEach(function(name){
		if(typeof(page[name].bind)==="function") page[name].bind(main);
	});
	widget.links.bind(left);
	widget.login.bind(right).show();
	hashchange();
};