
var skip=false, history = [""];
var left, flash = $(), main, right;

var display = exports = {
	duration: 500,
	prevhash: function(){ skip=true; location.hash = history[0]; }
};

display.top = function(){ $("body").animate({"scrollTop":0},display.duration); };
display.bottom = function(){ $("body").animate({"scrollTop":$(document).height()},display.duration); };

var flashnow = function(divclass,msg){
	var x = $("<div class='"+divclass+"' style='display:none;cursor:pointer;' title='Click to dismiss.'>").html(msg);
	var y = function(){ x.slideUp(250,function(){ x.remove(); }); };
	x.click(y);
	setTimeout(y,5000);
	flash.append(x);
	display.top();
	x.slideDown(250);
	var z = flash.children();
	z = z.not(z.slice(-3));
	z.slideUp(250,function(){ z.remove(); });
};
display.success = function(msg){ flashnow("alert alert-success",msg); };
display.error = function(msg){ flashnow("alert alert-error",msg); };

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
	$(document.body).empty().append(["<br>",
		$("<div class='container' style='width:1100px;'>").append([
			$("<div class='row'>").append([
				left = $("<div class='span2'></div>"),
				$("<div class='span10'></div>").append( flash = $("<div>"), main = $("<div>") ),
				right = $("<div class='span2'></div>"),
			])
		])
	]);
	pages.forEach(function(name){ widget[name].bind(main); });
	widget.links.bind(left);
	widget.login.bind(right).show(null,"fade");
	hashchange();
};