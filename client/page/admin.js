
var legend = function(type,collection){
	var name = collection.ucwords();
	var text = name+" Index", href = "index", link = name+" Index";
	if(type==="new") text = "Create New "+name;
	else if(type==="edit") text = "Modify "+name+" Settings";
	else if(type==="index"){ href="new"; link="Create New "+name; }
	else return;
	return $("<legend style='width:760px;padding:10px;'>"+text+"<span class='pull-right'><a class='btn' href='#admin/"+collection.urlencode()+"/"+href+"'>"+link+"</a></span></legend>");
}

exports = new page(function(data,callback){
	var path = data.path;
	var key = schema[path[1]].keys[0], select = {$collection:path[1]}; select[key] = path[3];
	async.series([
		function(cb){ cb(path[1] in schema?null:"unknown-collection"); },
		function(cb){
			if(path[2]==="new") cb(null);
			else if(path[2]==="edit") rpc("database.specific",select,cb);
			else if(path[2]==="index") cb(null);
			else cb("unknown-operation");
		}
	], function(error,result){
		if(error){ callback(error); return; }

		if(path[2]==="new" || path[2]==="edit")
			callback(null,[legend(path[2],path[1],path[3]),plugin.generateform({
				collection : path[1],
				data : result[1],
				submit : function(data){
					if(data!==null) location.hash = path.slice(0,2).concat("edit",data[key].urlencode()).join("/");
					else location.hash = path.slice(0,2).concat("index").join("/"); // delete
				}
			})]);
		if(path[2]==="index"){
			var p = plugin.pagination({
				"collection" : path[1],
				"page" : {"sort":key},
				"loaded" : function(){ callback(null,[legend(path[2],path[1]),p.node]); },
				"click" : function(item){ location.hash="#admin/"+path[1]+"/edit/"+item[key].urlencode(); }
			});
		}
	});
},config.adminlevel);