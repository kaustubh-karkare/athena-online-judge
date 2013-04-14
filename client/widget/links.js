
exports = new widget(function(path,callback){
	var links = $("<ul class='nav nav-list'>"), last;
	links.append("<li class='nav-header'>Administration</li>");
	Object.keys(schema).forEach(function(name){
		last = $("<li><a href='#admin/"+name.urlencode()+"/index'>"+name.ucwords().htmlentities()+"s</a></li>");
		links.append(last);
		if(path[0]==="admin" && path[1]===name) last.addClass("active");
	});
	callback(null,links);
});