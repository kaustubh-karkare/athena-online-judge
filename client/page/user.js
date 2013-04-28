
exports = new page(function(data,callback){
	if(data.path[1]===undefined){ callback("missing"); return; }
	var head = "<legend>User Details : "+data.path[1].htmlentities()+"</legend>";
	var that = this, reload = function(){ that.reload(); };
	async.parallel({
		"user": function(cb){ rpc("database.specific",{$collection:"user",username:data.path[1]},cb); }
	}, function(error,result){
		if(error){ callback(error); return; }
		if(auth.level && auth.user._id===result.user._id){
			var x = misc.deepcopy(schema.user); delete x.items.auth;
			var p = plugin.generateform({
				collection : "user",
				data: result.user,
				schema: x,
				submit : function(data){ reload(); }
			});
			callback(null,[head,p]);
		} else {
			var table = $("<table class='table table-striped'>");
			Object.keys(schema.user.items).forEach(function(key){
				if(key==="password") return;
				var tr = table.append("<tr><td></td><td></td></tr>").find("tr").last();
				tr.children().first().append(key.ucwords().htmlentities());
				if(key==="image") tr.children().last().append(result.user[key] ? "<img src='/download?id="+result.user[key].id+"'>" : "NA");
				else if(key==="groups"){
					if(result.user[key]===undefined || result.user[key].length===0) return;
					tr.children().last().append("<ul>"+result.user[key].map(function(g){ return "<li>"+g.name.htmlentities()+"</li>"; }).join("")+"</ul>");
				} else tr.children().last().append(result.user[key].htmlentities());
			});
			callback(null,[head,table]);
		}
	});
},0);