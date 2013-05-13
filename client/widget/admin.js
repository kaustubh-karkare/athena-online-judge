
var legend = function(type,collection){
	var name = collection.ucwords();
	var text = name+" Index", href = "index", link = name+" Index";
	if(type==="new") text = "Create New "+name;
	else if(type==="edit") text = "Modify "+name+" Settings";
	else if(type==="index"){ href="new"; link="Create New "+name; }
	else return;
	return $("<legend style='width:760px;padding:10px;'>"+text+"<span class='pull-right'><a class='btn' href='#admin/"+collection.urlencode()+"/"+href+"'>"+link+"</a></span></legend>");
};

var reflink = function(coll,obj){
	if($.type(obj)!=="object") return;
	var key = misc.primary(coll);
	return "<a href='"+["admin",coll,"edit",obj[key]].hash()+"'>"+obj[key].htmlentities()+"</a>";
};

var filelink = function(obj){
	if($.type(obj)!=="object") return;
	else return "<a href='/download?id="+obj.id+"&name="+obj.name.urlencode()+"'>"+obj.name.htmlentities()+" ("+misc.hrsize(obj.size)+")</a>";
};

var modspec = {};
modspec.user = $.extend(true,{},schema.user,{password:null});
modspec.problem = $.extend(true,{},schema.problem,{statement:null,tutorial:null,files:null,tests:null});
modspec.code = $.extend(true,{},schema.code,{code:null});

var render = {
	"$generic": function(name,spec){
		var keys = Object.keys(spec).filter(function(k){ return spec[k]!==null; }); keys.unshift("_id");
		var head = keys.map(function(k){
			if(k==="_id") return (name+" ID").ucwords();
			else if($.type(spec[k])==="function") return spec[k](null);
			else return "title" in spec[k] ? spec[k].title : String(k).ucwords;
		});
		var tostr = function(spec,obj){
			if($.type(spec)==="function") return spec(obj);
			else if(spec.type==="integer" && spec.datetime) return datetime.abs(obj);
			else if(spec.type==="select") return spec.options[obj];
			else if(spec.type==="reference") return reflink(spec.collection,obj);
			else if(spec.type==="file") return filelink(obj);
			else if(spec.type==="array") return $("<ul>").append(obj.map(function(item){ return $("<li>").append(tostr(spec.items,item)); }));
			else if(spec.type==="object"){
				var span = $("<span>").append("{ ");
				$.each(spec.items,function(key,subspec){ span.append(key,":",tostr(subspec,obj[key]),", "); });
				return span.append("}");
			} else return String(obj);
		};
		return function(x,cb){
			cb( null , x ? keys.map(function(k){ return k==="_id" ? x[k] : tostr(spec[k],x[k]); }) : head );
		}
	}
};

exports = new widget(function(data,callback){
	if(data===undefined) return;
	var path = data.path;
	var key = misc.primary(path[1]), select = {$collection:path[1]}; select[key] = path[3];
	async.series([
		function(cb){ if(auth.level<config.adminlevel) cb("redirect",""); else cb(null); },
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
			callback(null,$("<div>").append([
				legend(path[2],path[1],path[3]),
				plugin.form({
					collection : path[1],
					data : result[2],
					submit : function(data){
						if(path[2]==="new" || (data!==null && data[key]!==path[3]))
							location.hash = path.slice(0,2).concat("edit",data[key].urlencode()).join("/");
						else if(data!==null) exports.reload(); // modify
						else location.hash = path.slice(0,2).concat("index").join("/"); // delete
					}
				})
			])[0]);
		if(path[2]==="index"){
			var p = plugin.pagination({
				"collection" : path[1],
				"page" : {"sort":key},
				"loaded" : function(){ callback(null,$("<div>").append([legend(path[2],path[1]),p.node])[0]); },
				"click" : function(item){ location.hash="#admin/"+path[1]+"/edit/"+item[key].urlencode(); },
				"render" : (
					$.type(render[path[1]])==="function" ? render[path[1]] :
					$.type(modspec[path[1]])==="object" ? render.$generic(path[1],modspec[path[1]]) :
					render.$generic(path[1],schema[path[1]])
				)
			});
		}
	});
});

auth.change(function(){ exports.reload(); });