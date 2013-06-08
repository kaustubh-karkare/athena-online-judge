
exports = new widget(function(data,callback){
	var top = $("<div>");
	var legend = $("<legend>Group Index</legend>").appendTo(top);
	var span = $("<span class='pull-right'>").appendTo(legend);
	if(auth.user!==null) span.append("<a href='#group-new' class='btn'>Create New Group</a>");
	top.append(plugin.pagination({
		"rpc":"group.list",
		"page":{"size":25},
		"data":{},
		"render":function(item,cb){
			cb(null,(item===null?["Set","Group Name","Owner","Description"]:[
				"<a href='"+["set",item.set.name].hash()+"'>"+item.set.name.htmlentities()+"</a>",
				item.name,
				"<a href='"+["user",item.owner.username].hash()+"'>"+item.owner.realname.htmlentities()+"</a>",
				item.desc
			]));
		},
		"click": function(item){ location.hash = ["group",item.name].hash(); }
	}).node);
	callback(null,top[0]);
});