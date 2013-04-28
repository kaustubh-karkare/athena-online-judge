
exports = new page(function(data,callback){
	if(auth.level){ location.hash="#contests"; callback(null,""); return; }
	var x = misc.deepcopy(schema.user); delete x.items.auth; delete x.items.groups;
	var p = plugin.generateform({
		collection : "user",
		schema: x,
		submit : function(data){ location.hash = ["user",data.username].hash(); }
	});
	callback(null,["<legend>Create New Account</legend>",p]);
},0);