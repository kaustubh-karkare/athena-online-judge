
// #user/dog/edit

exports = new widget(function(data,callback){
	var reg = data.path[0]==="register";
	if(!reg) data.path[0] = "user";
	if(!reg && data.path[1]===undefined)
		if(auth.user) data.path[1] = auth.user.username;
		else { callback("redirect",""); return; }

	if(reg) var head = $("<legend>Create New Account</legend>");
	else var head = $("<legend>User Details : "+data.path[1].htmlentities()+"</legend>");

	var edit = auth.level>=config.adminlevel || (auth.user && auth.user.username===data.path[1]);
	var edit2 = reg || edit&&data.path[2]==="edit";
	if((!edit && data.path[2]==="edit") || [undefined,"edit"].indexOf(data.path[2])===-1)
		{ callback("redirect",data.path.slice(0,2).hash()); return; }
	var that = this, reload = function(){ that.reload(); };
	async.parallel({
		"user": function(cb){ if(!reg) rpc("user.display",{"username":data.path[1],"edit":edit2},cb); else cb(null); },
		"set": function(cb){ if(edit2) rpc("set.list",null,cb); else cb(null); }
	}, function(error,result){
		if(error){ callback(error); return; }
		if(edit2){
			head.append("<span class='pull-right'><a class='btn' href='"+data.path.slice(0,2).hash()+"'>View User Details</a></span>");
			var form = $("<form>");
			var left = form.append("<div class='half'>").children().last();
			var table1 = left.append("<table class='table table-striped'>").children().last();
			var su = function(k){ return schema.user[k].title.htmlentities(); };
			table1.append("<tr><th>Field</th><th>Value</th></tr>");
			table1.append("<tr><td>"+su("username")+"</td><td>"+(reg||auth.level>=config.adminlevel?"<input type='text' name='username' value='"+(reg?"":result.user.username.quotes())+"'>":result.user.username)+"</td></tr>");
			table1.append("<tr><td>"+su("password")+"</td><td><input type='password' name='password' value='"+(reg?"":result.user.password.quotes())+"'></td></tr>");
			table1.append("<tr><td>"+su("realname")+"</td><td><input type='text' name='realname' value='"+(reg?"":result.user.realname.quotes())+"'></td></tr>");
			if(auth.level>=config.adminlevel){
				var auth_select = plugin.selection({options:schema.user.auth.options,initial:result.user.auth})
				table1.append($("<tr>").append( $("<td>").append(su("auth")), $("<td>").append(auth_select.node) ));
			} else var auth_select = null;
			var right = form.append("<div class='half'>").children().last();
			var table2 = right.append("<table class='table table-striped'>").children().last();
			table2.append("<tr><th>Set</th><th>Groups</th></tr>");
			result.set.forEach(function(set){
				var initial = reg ? [] : result.user.groups.filter(function(g){ return g.set._id===set._id; });
				if(set.freedom==="1" || auth.level>=config.adminlevel || reg){
					if(set.exclusive==="1") initial = reg ? null : initial[0];
					var refinput = plugin.suggestion({"multiselect":set.exclusive==="0","initial":initial,"collection":"group","filter":{"set":{"_id":set._id}}});
					var x = refinput.node;
					set.groups = function(){
						var val = refinput.value();
						return set.exclusive==="1"?(val===null?[]:[val]):val;
					};
				} else {
					var x = "<ul style='margin-bottom:0px;'>"+initial.map(function(g){
						return "<li><a href='"+["group",g.name].hash()+"'>"+g.name.htmlentities()+"</a></li>";
					}).join("")+"</ul>";
				}
				table2.append($("<tr>").append( $("<td>").append(set.name.htmlentities()), $("<td>").append(x) ));
			});
			form.find("input").css("margin-bottom",0);
			var bottom = form.append("<div class='full' style='text-align:center;'>").children().last();
			bottom.append([
				"<input class='btn btn-primary' type='submit' value='Update User Details'> ",
				$("<input class='btn btn-inverse' type='button' value='Reset'>").click(function(){ exports.reload(); })
			]);
			form.submit(function(){
				var data = reg ? {} : {"_id":result.user._id}, that = this;
				["realname","password"].forEach(function(key){ data[key] = that[key].value; });
				if(reg || auth.level>=config.adminlevel){
					data.username = this.username.value;
					if(!reg) data.auth = auth_select.value();
				}
				var keys = [];
				data.groups = misc.array2object(keys,result.set.filter(function(set){
					return set.freedom==="1" || auth.level>=config.adminlevel;
				}).map(function(set){ keys.push(set._id); return set.groups(); }));
				console.log(JSON.stringify(data));
				rpc("user."+(reg?"create":"modify"),data,function(e,r){
					if(!e && !reg && r._id===result.user._id) itc.broadcast("auth",r);
					if(e) console.log(e);
					else if(!reg && r.username===result.user.username) exports.reload();
					else location.hash = ["user",r.username].concat(reg?[]:["edit"]).hash();
				});
				return false;
			});
			callback(null,$("<div>").append([head,form])[0]);
		} else {
			if(edit) head.append("<span class='pull-right'><a class='btn' href='"+data.path.slice(0,2).concat("edit").hash()+"'>Edit User Details</a></span>");
			var left = $("<div class='half'>");
			var table1 = left.append("<table class='table table-striped'>").children().last();
			table1.append("<tr><th>Field</th><th>Value</th></tr>");
			["username","realname","auth"].forEach(function(key){
				if(key==="auth") val = schema.user.auth.options[result.user.auth];
				else val = result.user[key];
				table1.append("<tr><td>"+schema.user[key].title.htmlentities()+"</td><td>"+val+"</td></tr>");
			});
			var right = $("<div class='half'>");
			var table2 = right.append("<table class='table table-striped'>").children().last();
			table2.append("<tr><th>Set</th><th>Groups</th></tr>");
			var groups = {};
			result.user.groups.forEach(function(g){
				if(!Array.isArray(groups[g.set.name])) groups[g.set.name] = [];
				groups[g.set.name].push(g);
			});
			for(var set in groups)
				table2.append("<tr><td>"+set.htmlentities()+"</td><td><ul style='margin-bottom:0px;'>"+groups[set].map(function(g){
					return "<li><a href='"+["group",g.name].hash()+"'>"+g.name.htmlentities()+"</a></li>";
				}).join("")+"</ul></td></tr>");
			callback(null,$("<div>").append([head,left,right])[0]);
		}
	});
},0);

auth.change(function(){ exports.reload(); });