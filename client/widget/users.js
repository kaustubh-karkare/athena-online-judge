
exports = new widget(function(data,callback){
	var top = $("<div>");
	var legend = $("<legend>User Index</legend>").appendTo(top);
	var span = $("<span class='pull-right'>").appendTo(legend);
	if(auth.user===null) span.append("<a href='#register' class='btn'>Create New User</a>");
	else span.append("<a href='#account' class='btn'>My Account</a>");
	top.append(plugin.pagination({
		"rpc":"user.list",
		"page":{"size":25},
		"data":{},
		"render":function(item,cb){
			cb(null,item===null?["Username","Real Name","Groups"]:[
				item.username.htmlentities(),
				item.realname.htmlentities(),
				item.groups.map(function(g){
					return "<a href='"+["group",g.name].hash()+"'>"+g.name.htmlentities()+"</a>";
				}).join(", ")
			]);
		},
		"click": function(item){ location.hash = ["user",item.username].hash(); }
	}).node)
	callback(null,top[0]);
});