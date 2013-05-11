
var pages = ["register","contests"];

exports = new widget(function(data,callback){
	var path = data.path;
	var links = $("<ul class='nav nav-list'>"), last;
	pages.forEach(function(name){
		if(name==="register" && auth.level>0) name = "account";
		last = $("<li><a href='#"+name.urlencode()+"'>"+name.ucwords().htmlentities()+"</a></li>");
		if(path[0]===name) last.addClass("active");
		links.append(last);
	});
	if(auth.level>=config.adminlevel){
		links.append("<li class='nav-header'>Administration</li>");
		Object.keys(schema).forEach(function(name){
			last = $("<li><a href='#admin/"+name.urlencode()+"/index'>"+name.ucwords().htmlentities()+"s</a></li>");
			if(path[0]==="admin" && path[1]===name) last.addClass("active");
			links.append(last);
		});
	}
	callback(null,links);
});