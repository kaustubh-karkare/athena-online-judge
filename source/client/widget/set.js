
exports = new widget(function(data,callback){
	async.parallel([
		function(cb){ rpc("set.display",data.path[1],cb); }
	],function(error,result){
		if(error){ callback(error); return; }
		var set = result[0];

		var top = $("<div>");
		var legend = $("<legend>Set Details : "+set.name.htmlentities()+"</legend>").appendTo(top);

		var left = $("<div class='half'>").appendTo(top);
		var table = $("<table class='table table-striped'>").appendTo(left);
		var f1 = function(l,r){
			table.append($("<tr>").append(
				$("<td>").append( schema.set[l].title.htmlentities() ),
				$("<td>").append(r)
			));
		};
		// f1("name",set.name.htmlentities());
		f1("desc",set.desc.htmlentities());
		f1("freedom",set.freedom==="1" ? "Yes" : "No");
		f1("exclusive",set.exclusive==="1" ? "Yes" : "No");
		f1("create",set.create==="1" ? "Yes" : "No");
		f1("limit",set.limit===0 ? "Unlimited" : set.limit);

		var right = $("<div class='half'>").appendTo(top);
		right.append(plugin.pagination({
			"rpc":"set.groups",
			"page":{"size":25},
			"data":{"set":set._id},
			"render":function(item,cb){
				cb(null,item===null?["Group Name","Description"]:[
					"<a href='"+["group",item.name].hash()+"'>"+item.name.htmlentities()+"</a>",
					item.desc.htmlentities()
				]);
			},
			"click": function(item){ location.hash = ["group",item.name].hash(); }
		}).node);

		callback(null,top[0]);
	});
});