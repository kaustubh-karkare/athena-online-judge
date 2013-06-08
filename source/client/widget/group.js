
exports = new widget(function(data,callback){
	var create = false;
	if(data.path[0]==="group-new") var create = true;
	if(create && auth.user===null){ callback("redirect","#groups"); return; }
	async.parallel([
		function(cb){ if(create) cb(null); else rpc("group.display",data.path[1],cb); }
	],function(error,result){
		if(error){ callback(error); return; }
		var group = result[0];
		if(create){
			var x = plugin.suggestion.create();
			if(x===null) x = [null,""];
			group = {"name":x[1],"desc":"","owner":auth.user,"set":x[0]};
		}

		var edit = false, admin = (auth.level>=constant.adminlevel);
		var allowed = admin || (auth.user!==null && group.owner._id===auth.user._id);
		if(create) edit = true;
		else if(data.path[2]==="edit"){
			if(!allowed){ callback("redirect",data.path.slice(0,2).hash()); return; }
			else edit = true;
		}

		// basic layout
		var top = $("<div>");
		var legend = $("<legend>"+(create?"Create New Group":"Group Details : "+group.name.htmlentities())+"</legend>").appendTo(top);
		var span = $("<span class='pull-right'>").appendTo(legend);
		if(allowed && !create){
			if(edit) $("<a class='btn' href='"+data.path.slice(0,2).hash()+"'>View Group Details</a>").appendTo(span);
			else $("<a class='btn' href='"+data.path.slice(0,2).concat("edit").hash()+"'>Edit Group Details</a>").appendTo(span);
		}
		if(create) $("<a class='btn' href='#groups'>Group Index</a>").appendTo(span);

		// left side
		var left = $("<div class='half'>").appendTo(top);
		var form = $("<form>").appendTo(left);
		var table = $("<table class='table table-striped'>").appendTo(form);
		var f1 = function(l,r){
			table.append($("<tr>").append(
				$("<td>").append( schema.group[l].title.htmlentities() ),
				$("<td>").append(r)
			));
		};
		f1("name",edit?"<input type='text' name='name' value='"+group.name.quotes()+"'>":group.name.htmlentities() );
		f1("desc",edit?"<input type='text' name='desc' value='"+group.desc.quotes()+"'>":group.desc.htmlentities() );
		if(admin && edit){
			var owner = plugin.suggestion({"initial":group.owner,"collection":"user"}); f1("owner",owner.node);
		} else {
			if(group.owner._id===0) f1("owner",group.owner.realname.htmlentities());
			else f1("owner","<a href='"+["user",group.owner.username].hash()+"'>"+group.owner.realname.htmlentities()+"</a>" );
		}
		if(edit){
			var set = plugin.suggestion({"initial":group.set,"collection":"set","filter":{"create":"1"}}); f1("set",set.node);
		} else {
			if(group.set._id===0) f1("set",group.set.name.htmlentities());
			else f1("set","<a href='"+["set",group.set.name].hash()+"'>"+group.set.name.htmlentities()+"</a>");
		}
		if(edit){
			form.append($("<div style='text-align:center;'>").append(
				$("<input class='btn btn-primary' type='submit' value='"+(create?"Create New Group":"Update Group Details")+"'>"), " ",
				$("<input class='btn btn-inverse' type='button' value='Reset'>").click(function(){ exports.reload(); }), " ",
				create ? "" : $("<input class='btn btn-danger' type='button' value='Delete Group'>").click(function(){
					if(confirm("Are you sure you wish to delete this group?"))
						rpc("group.delete",{"_id":group._id},function(e){
							if(e) display.error(e); else location.hash = ["groups"].hash();
						});
					return false;
				})
			));
			form.submit(function(){
				var data = {
					"name":this.name.value,
					"desc":this.desc.value,
					"owner": (admin && edit ? owner.value() : group.owner),
					"set":set.value()
				};
				if(!create) data._id = group._id;
				rpc("group."+(create?"create":"update"),data,function(e,r){
					if(e) display.error(e);
					else if(r.name!==group.name) location.hash = ["group",r.name,"edit"].hash();
					else exports.reload();
				});
				return false;
			});
		}

		// right side
		if(create) left.css("margin-left",190);
		else {
			var right = $("<div class='half'>").appendTo(top);
			right.append(plugin.pagination({
				"rpc":"group.members",
				"page":{"size":25},
				"data":{"group":group._id},
				"render":function(item,cb){ cb(null,item===null?["Username","Real Name"]:[item.username,item.realname]); },
				"click": function(item){ location.hash = ["user",item.username].hash(); }
			}).node);
		}

		callback(null,top[0]);
	});
});

auth.change(function(){ exports.reload(); });