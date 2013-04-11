
var left="#layout-base-left", mid="#layout-base-mid", right="#layout-base-right";

var reload = function(){
	$(document.body).empty().html(template["layout-base"]);
	
};

var hashchange = function(){
	var path = location.hash.substr(1).split("/").map(function(p){ return decodeURIComponent(p); });
	console.log(path);
};

$(window).bind('hashchange',hashchange);

exports = { "reload": reload };