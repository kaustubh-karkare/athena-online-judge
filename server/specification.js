
var specification = exports = {};

var datatypes = {
	"integer" : function(name,spec,obj,callback,save){
		obj = parseInt(obj);
		if(!isNaN(obj)) callback(null,obj);
		else if(save.fix) callback(null,spec.default!==undefined?spec.default:0);
		else callback("corrupt:"+name);
	},
	"float" : function(name,spec,obj,callback,save){
		obj = parseFloat(obj);
		if(!isNaN(obj)) callback(null,obj);
		else if(save.fix) callback(null,spec.default!==undefined?spec.default:0);
		else callback("corrupt:"+name);
	},
	"string" : function(name,spec,obj,callback,save){
		obj = typeof(obj)!=="string"?"":obj;
		if(obj.length>0 || spec.optional) callback(null,obj);
		else if(save.fix) callback(null,spec.default!==undefined?spec.default:"?????");
		else callback("empty:"+name);
	},
	"select" : function(name,spec,obj,callback,save){
		obj = String(obj);
		if(Object.keys(spec.options).indexOf(obj)!==-1) callback(null,obj);
		else if(save.fix) callback(null,spec.default);
		else callback("corrupt:"+name);
	},
	"reference" : function(name,spec,obj,callback,save){
		if(spec.optional && obj===null){ callback(null,null); return; }
		if(typeof(obj)!=="object" || obj===null || !("_id" in obj))
			{ callback( save.fix?null:"corrupt:"+name, save.fix?config.dummy.reference:undefined ); return; }
		database.get(spec.collection,{_id:obj._id},{},function(error,item){
			if(error){
				if(save.fix && error==="not-found") callback(null,config.dummy.reference);
				else callback(error);
			} else {
				var result = {};
				schema[spec.collection].keys.sort().forEach(function(key){ result[key]=item[key]; });
				if(!(spec.collection in save.references)) save.references[spec.collection] = [];
				if(save.references[spec.collection].indexOf(result._id)===-1)
					save.references[spec.collection].push(result._id);
				callback(null,result);
			}
		});
	},
	"file" : function(name,spec,obj,callback,save){
		if(spec.optional && obj===null){ callback(null,null); return; }
		if(typeof(obj)!=="object" || obj===null  || !("id" in obj) || !("name" in obj) || !("size" in obj))
			{ callback( save.fix?null:"corrupt:"+name, save.fix?config.dummy.file:undefined ); return; }
		obj.id = String(obj.id).toLowerCase(); obj.name = String(obj.name); obj.size = parseInt(obj.size);
		if(obj.id.match(/^[0-9a-f]{24}$/)===null || obj.name==="" || isNaN(obj.size) || obj.size<0)
			{ callback("corrupt:"+name); return; }
		filesystem.file.exists(obj.id,function(error,result){
			if(error) callback(error);
			else if(!result) callback(save.fix?null:"not-found",save.fix?config.dummy.file:undefined);
			else { save.files.push(obj); callback(null,obj); }
		});
	},
	"array" : function(name,spec,obj,callback,save){
		var i, result = [];
		if(!Array.isArray(obj))
			if(spec.optional) obj = [];
			else if(save.fix){
				match_recursive(name+".x",spec.items,obj,function(e,r){ callback(e,e?null:[r]); },save);
				return;
			}
			else { callback("corrupt:"+name+"//spec:"+JSON.stringify(spec)); return; }
		for(i=0;i<obj.length;++i)
			result.push(function(i){
				return function(cb){ match_recursive(name+"."+i,spec.items,obj[i],cb,save); };
			}(i));
		if(result.length>0) async.parallel(result,callback);
		else if(spec.optional) callback(null,[]);
		else callback("empty:"+name);
	},
	"object" : function(name,spec,obj,callback,save){
		if(typeof(obj)!=="object" || obj===null)
			if(save.fix) obj = {};
			else { callback("corrupt:"+name); return; }
		var result = {};
		for(var key in spec.items)
			if(!(key in obj)){
				if(save.complete<2 || spec.items[key].optional) continue;
				else if("default" in spec.items[key] || save.fix) result[key] = function(key){
					return function(cb){ match_recursive(name+"."+key,spec.items[key],spec.items[key].default,cb,save); };
				}(key);
				else { callback("missing:"+key); return; }
			} else result[key] = function(key){
				return function(cb){ match_recursive(name+"."+key,spec.items[key],obj[key],cb,save); };
			}(key);
		if(Object.keys(result).length==0) callback(null,{});
		else async.parallel(result,callback);
	},
	"document" : function(name,spec,obj,callback,save){
		match_recursive(name,{type:"object",items:spec.items},obj,callback,save);
	}
};

var match_recursive = function(name,spec,obj,callback,save){
	if(spec.type in datatypes) datatypes[spec.type](name,spec,obj,callback,save);
	else callback("unknown-type");
};

var match_common = function(name,spec,obj,callback,complete){
	var save = {"collection":name,"complete":complete,"files":[],"references":{}};
	if(complete===3){ save.complete = 2; save.fix = true; } else save.fix = false;
	match_recursive(name,spec,obj,function(error,result){
		if(save.complete===1 && error===null && "keys" in spec &&
			spec.keys.filter(function(key){ return key in result; }).length===0) error = "incomplete";
		if(error) callback(error); else callback(null,result,save);
	},save);
};

specification.match_partial = function(name,spec,obj,callback){ match_common(name,spec,obj,callback,0); };
specification.match_select = function(name,spec,obj,callback){ match_common(name,spec,obj,callback,1); };
specification.match_complete = function(name,spec,obj,callback){ match_common(name,spec,obj,callback,2); };
specification.match_repair = function(name,spec,obj,callback){ match_common(name,spec,obj,callback,3); };



var verify_recursive = function(name,spec,callback){
	if(typeof(spec)==="object" && spec!==null && spec.type in datatypes && spec.type!=="document"){
		if(spec.type==="array") verify_recursive(name+"[]",spec.items,callback);
		else if(spec.type==="object"){
			if(typeof(spec.items)!=="object") callback("corrupt-object:"+name);
			else async.parallel(Object.keys(spec.items).map(function(key){
				return function(cb){ verify_recursive(name+"."+key,spec.items[key],cb); };
			}),callback);
		} else if(spec.type==="select"){
			if("options" in spec && "default" in spec && Object.keys(spec.options).indexOf(String(spec.default))!==-1) callback(null);
			else callback("corrupt-select:"+name);
		} else if(spec.type==="reference"){
			if("collection" in spec && spec.collection in schema) callback(null);
			else callback("corrupt-reference:"+name)
		} else callback(null);
	} else callback("corrupt:"+name);
};

specification.verify = function(name,spec,callback){
	async.series([
		function(cb){ cb(typeof(spec)==="object" && spec!==null && spec.type==="document" ? null : "corrupt-document") },
		function(cb){ verify_recursive(name,{type:"object","items":spec.items},cb); },
		function(cb){ cb(Array.isArray(spec.keys) && spec.keys.length>0 && spec.keys.filter(function(key){ return key in spec.items; }).length===spec.keys.length ? null : "corrupt-keys"); }
	],function(e){ callback(e?"specification-error:"+e:null); });
};