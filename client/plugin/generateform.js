
var counter = 0;

var controlgroup = function(title,input){
	if(typeof(title)!=="string") title = "?????";
	var top = $("<div class='control-group' style='margin-bottom:10px; padding:5px 0px;'>")
		.append("<label class='control-label' for='df"+(++counter)+"'>")
		.append("<div class='controls'>"); // style='display:inline-block;margin-left:20px;'
	top.children(":first-child")
		.html(title.htmlentities())
		.next()
		.append(input)
		.children(":first-child")
		.attr("id","df"+counter);
	return top[0];
};

var timestamp = {
	to : function(date,time){
		date = date.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
		time = time.match(/^([0-9]{2})\:([0-9]{2})$/);
		if(date==null || time==null) return null;
		date = date.slice(1).map(function(i){ return parseInt(i); });
		time = time.slice(1).map(function(i){ return parseInt(i); });
		var result = new Date(date[0],date[1]-1,date[2],time[0],time[1]);
		return Math.floor(result);
	},
	from : function(result){
		var d = new Date(result);
		var date = d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
		var time = ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
		return [date,time];
	}
};

var datatypes = {
	"integer" : function(name,spec,obj,save){
		if(spec.datetime){
			var date = $("<input type='date' style='margin-bottom:5px;'>");
			var time = $("<input type='time'>").attr("name",name+"-time");
			if(obj!==undefined){ obj = timestamp.from(obj); date.val(obj[0]); time.val(obj[1]); }
			else if(spec.default!==undefined){ obj = timestamp.from(parseInt(spec.default)); date.val(obj[0]); time.val(obj[1]); }
			return [function(cb){ cb(null,timestamp.to(date[0].value,time[0].value)); }, controlgroup(spec.title?spec.title:name,[date,"<br>",time])];
		} else {
			var input = $("<input type='number'>");
			if(obj!==undefined) input.val(parseInt(obj));
			else if(spec.default!==undefined) input.val(parseInt(spec.default));
			return [function(cb){ cb(null,parseInt(input[0].value)); }, controlgroup(spec.title?spec.title:name,input[0])];
		}
	},
	"float" : function(name,spec,obj,save){
		var input = $("<input type='text'>");
		if(obj!==undefined) input.val(parseFloat(obj));
		else if(spec.default!==undefined) input.val(parseFloat(spec.default));
		return [function(cb){ cb(null,parseFloat(input[0].value)); }, controlgroup(spec.title?spec.title:name,input[0])];
	},
	"string" : function(name,spec,obj,save){
		if(spec.long) var input = $("<textarea></textarea>");
		else var input = $("<input type='"+(spec.password?"password":"text")+"'>");
		if(obj!==undefined) input.val(String(obj));
		else if(spec.default!==undefined) input.val(String(spec.default));
		return [function(cb){ cb((input[0].value.length||spec.optional)?null:"empty:"+name,input[0].value); },controlgroup(spec.title?spec.title:name,input[0])];
	},
	"select" : function(name,spec,obj,save){
		var select = plugin.select({"initial":(obj===undefined?spec.default:obj),"options":spec.options});
		return [function(cb){ cb(null,select.value()); }, controlgroup(spec.title?spec.title:name,select.node)]
	},
	"reference" : function(name,spec,obj,save){
		var refinput = plugin.suggestion({"initial":obj,"collection":spec.collection});
		return [function(cb){
			var x = refinput.value();
			if(!spec.optional && x===null) cb("empty:"+name); else cb(null,x);
		}, controlgroup(spec.title?spec.title:name,refinput.node)];
	},
	"file" : function(name,spec,obj,save){
		var fileinput = plugin.fileupload({"initial":obj});
		save.file_interface.push(fileinput.interface);
		return [function(cb){
			fileinput.interface.result(function(e,r){
				if(e===null && !spec.optional && r===null) cb("empty:"+name); else cb(e,r);
			});
		},controlgroup(spec.title?spec.title:name,fileinput.node)];
	},

	"array" : function(name,spec,obj,save){
		// special case : array of references
		if(spec.items.type==="reference"){
			var refinput = plugin.suggestion({"initial":obj,"collection":spec.items.collection,"multiselect":true});
			return [function(cb){
				var x = refinput.value();
				if(!spec.optional && x.length===0) cb("empty:"+name); else cb(null,x);
			}, controlgroup(spec.title?spec.title:name,refinput.node)];
		}
		// special case : array of files
		if(false && spec.items.type==="file"){
			var fileinput = plugin.fileupload({"initial":obj,"multiselect":true});
			save.file_interface.push(fileinput.interface);
			return [function(cb){
				fileinput.interface.result(function(e,r){
					if(e===null && !spec.optional && r.length===0) cb("empty:"+name); else cb(e,r);
				});
			},controlgroup(spec.title?spec.title:name,fileinput.node)];
		}
		// default case
		if(!Array.isArray(obj)) obj = [];
		var first = [], second = [], order = [];
		// function to wrap each input and provide buttons for reordering and deletion
		var element = function(x,i){
			first.push(x[0]); order.push(i);
			return $("<div><div></div><div></div></div>")
				.children().css("display","inline-block").first().append(x[1])
				.next().append("<a class='btn'><i class='icon-move'></i></a><a class='btn'><i class='icon-remove-circle'></i></a>")
				.children().css("margin-left","10px").css("padding","3px 6px").last().click(function(){
					$(this).parent().parent().remove();
					first.remove(x[0]); order.remove(i);
					return false;
				}).parent().parent().attr("data-order",i)[0];
		};
		// sequentially generate the element inputs and then wrap them
		for(var i=0;i<obj.length;++i) second.push(generate_recursive(name+"."+i,spec.items,obj[i],save));
		second = second.map(function(x,i){ return element(x,i); });
		var _i = first.length, add = spec.add?spec.add:"Add Array Element";
		// enable sorting of elements
		var arraytop = $("<div style='border:1px solid #eee;border-radius:4px;padding:10px 10px 0px 0px;'><div></div><div></div></div>");
		arraytop.children(":first-child").append(second).sortable({"handle":".icon-move","stop":function(){
			var order2 = [], first2 = [];
			arraytop.children(":first-child").children().each(function(i,e){
				order2.push(parseInt($(e).attr("data-order")));
			});
			if(order.join(",")!==order2.join(",")) order = order2;
		} });
		// add button to add additional array items
		arraytop.children(":last-child").append(controlgroup(" ",
			$("<input type='button' class='btn' value='"+add+"' style='width:220px;'>").click(function(){
				var i = _i++;
				var x = generate_recursive(name+"."+i,spec.items,undefined,save);
				var y = element(x,i);
				arraytop.children(":last-child").before(y);
			})[0]
		));
		// wrap the list of array elements in a control group
		second = controlgroup(spec.title?spec.title:name,arraytop[0]);
		return [function(cb){
			var reordered = [];
			for(var i=0;i<order.length;++i) reordered.push(first[order[i]]);
			async.parallel(reordered,cb);
		},second];
	},

	"object" : function(name,spec,obj,save){
		if(typeof(obj)!=="object" || obj===null) obj = {};
		var result = {};
		for(var key in spec.items)
			if(!spec.items[key].internal)
				result[key] = generate_recursive(name+"."+key,spec.items[key],obj[key],save);
		var first = {}, second = [];
		Object.keys(result).forEach(function(key){
			first[key] = result[key][0];
			second.push(result[key][1]);
		});
		return [function(cb){ async.parallel(first,cb); },$("<div>").append(second)[0]];
	},
	
	"document" : function(name,spec,obj,args){
		var id = parseInt(typeof(obj)==="object" && obj!==null ? obj._id : null);
		var form = $("<form name='"+name.quotes()+"' class='form-horizontal'>");
		var save = {"file_interface":[]};
		var result = generate_recursive(name,{type:"object",items:spec.items},obj,save);

		// prepare handlers for submit events
		if(typeof(args.submit)!=="function") args.submit = misc.nop;
		var submit = function(error,result){
			if(error){
				console.log(error);
			} else {
				args.submit(result);
				form.remove(); // self-destruct now that the purpose of this form has been served
			}
		};

		// attach the resultant DOM tree to a new form element
		form.append("<input type='hidden' name='_id' value='"+id+"'>")
			.append(result[1])
			.append(controlgroup("","<input type='submit' class='btn btn-primary' style='width:220px;' value='"+(isNaN(id)?"Create New "+name.ucwords().quotes():"Modify "+name.ucwords().quotes()+" Details")+"'>"));
		if(!isNaN(id)) form
			.append(controlgroup("","<input type='button' class='btn btn-danger' style='width:220px;' value='Delete "+name.ucwords().quotes()+"'>"))
			.find("input.btn-danger")
			.click(function(){ if(confirm("Are you sure you want to delete this "+name.quotes()+"?")) rpc("database.delete",{"$collection":name,"_id":id},submit); });

		// add handlers for submit event
		var submitlock = false;
		form.submit(function(){
			if(submitlock) return false; else submitlock=true;
			async.waterfall([
				function(cb){ result[0](cb); },
				function(data,cb){
					data.$collection = name;
					if(!isNaN(id)) data._id = id;
					rpc("database."+(isNaN(id)?"insert":"update"),data,cb);
				}
			],submit);
			submitlock=false;
			return false;
		});
		return [{},form[0]];
	}
};

var generate_recursive = function(name,spec,obj,args){
	if(spec.type in datatypes) return datatypes[spec.type](name,spec,obj,args);
	else return false;
};

exports = function(args){
	if(typeof(args)!=="object" || !(args.collection in schema)) return false;
	return generate_recursive(args.collection, schema[args.collection], args.data, args)[1];
};