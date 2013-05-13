
exports = new widget(function(data,callback){
	var top = $("<div>");
	var legend = $("<legend>Set Index</legend>").appendTo(top);
	top.append(plugin.pagination({
		"rpc":"set.list",
		"page":{"size":25},
		"data":{},
		"render":function(item,cb){
			cb(null,item===null?[
				"Set Name",
				"Freedom",
				"Exclusive",
				"Creation",
				"Group Member Limit"
			]:[
				item.name.htmlentities(),
				item.freedom==="1" ? "Yes" : "No",
				item.exclusive==="1" ? "Yes" : "No",
				item.create==="1" ? "Yes" : "No",
				item.limit === 0 ? "Unlimited" : item.limit
			]);
		},
		"click": function(item){ location.hash = ["set",item.name].hash(); }
	}).node)
	callback(null,top[0]);
});