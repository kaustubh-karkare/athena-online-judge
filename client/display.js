
var left="#layout-base-left", mid="#layout-base-mid", right="#layout-base-right";
var skip=false, history = [];

var display = exports = {
	duration: 500,
	prevhash: function(){ skip=true; location.hash = history[0]; }
};

display.top = function(){ $("body").animate({"scrollTop":0},display.duration); };
display.bottom = function(){ $("body").animate({"scrollTop":$(document).height()},display.duration); };

var hashchange = function(){
	if(skip){ skip=false; history.pop(); return; }
	var path = location.hash.substr(1).split("/").map(function(p){ return decodeURIComponent(p); });
	if(path[0]==="admin") widget.admin.show(path);
	else widget.admin.show(["admin","user","index"]);
	display.top();
	history = history.concat(location.hash).slice(-2);
};
$(window).bind('hashchange',hashchange);

// needs to be called once at the beginning
display.reload = function(){
	$(document.body).empty().html(template["layout-base"]);
	var main = $(mid)[0];
	Object.keys(widget).forEach(function(name){ widget[name].bind(main); });
	$(left).append("<ul class='nav nav-list'><li class='nav-header'>Administration</li>"+Object.keys(schema).map(function(name){ return "<li><a href='#admin/"+name.urlencode()+"/index'>"+name.ucwords().htmlentities()+"s</a></li>"; }).join("")+"</ul>");
	hashchange();
};

