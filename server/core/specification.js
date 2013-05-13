
var specification = exports = {};

var datatypes = {
	"integer" : function(name,spec,obj,callback,save){
		obj = parseInt(obj);
		if(!isNaN(obj)) callback(null,obj);
		else if(save.type==="repair") callback(null,spec.default!==undefined?spec.default:0);
		else callback("corrupt:"+name);
	},
	"float" : function(name,spec,obj,callback,save){
		obj = parseFloat(obj);
		if(!isNaN(obj)) callback(null,obj);
		else if(save.type==="repair") callback(null,spec.default!==undefined?spec.default:0);
		else callback("corrupt:"+name);
	},
	"string" : function(name,spec,obj,callback,save){
		obj = typeof(obj)!=="string"?"":obj;
		if(obj.length>0 || spec.optional) callback(null,obj);
		else if(save.type==="repair") callback(null,spec.default!==undefined?spec.default:"?????");
		else callback("empty:"+name);
	},
	"select" : function(name,spec,obj,callback,save){
		obj = String(obj);
		if(Object.keys(spec.options).indexOf(obj)!==-1) callback(null,obj);
		else if(save.type==="repair") callback(null,spec.default);
		else callback("corrupt:"+name);
	},
	"reference" : function(name,spec,obj,callback,save){
		if(spec.optional && obj===null){ callback(null,null); return; }
		// ensure that the reference object contains the required data
		if(typeof(obj)!=="object" || obj===null || !("_id" in obj)){
			if(save.type==="repair") callback(null,config.dummy.reference);
			else callback("corrupt:"+name);
			return;
		}
		database.get(spec.collection,{_id:obj._id},{},function(error,item){
			if(error){
				if(error==="not-found" && save.type==="repair") callback(null,config.dummy.reference);
				else callback(error);
			} else {
				var result = {};
				// sorting of keys is needed as mongodb cares about order
				Object.keys(schema[spec.collection]).filter(function(x){
					var y = schema[spec.collection][x];
					return x==="_id" || y.primary || y.cache;
				}).sort().forEach(function(key){ result[key]=item[key]; });
				// In the list of references in the save-object, add this.
				if(!(spec.collection in save.references)) save.references[spec.collection] = [];
				if(save.references[spec.collection].indexOf(result._id)===-1)
					save.references[spec.collection].push(result._id);
				callback(null,result);
			}
		});
	},
	"file" : function(name,spec,obj,callback,save){
		if(spec.optional && obj===null){ callback(null,null); return; }
		// ensure that the file-object contains a proper id, name and size
		if(typeof(obj)!=="object" || obj===null  || !("id" in obj) || !("name" in obj) || !("size" in obj)){
			if(save.type==="repair") callback(null,config.dummy.file);
			else callback("corrupt:"+name);
			return;
		}
		obj.id = String(obj.id).toLowerCase(); obj.name = String(obj.name); obj.size = parseInt(obj.size);
		if(obj.id.match(/^[0-9a-f]{24}$/)===null || obj.name==="" || isNaN(obj.size) || obj.size<0)
			{ callback("corrupt:"+name); return; }
		gridfs.exists(obj.id,function(error,result){
			if(error) callback(error);
			else if(!result){
				if(save.type==="repair") callback(null,config.dummy.file);
				else callback("not-found");
			} else {
				// In the list of files in the save-object, add this.
				save.files.push(obj);
				callback(null,obj);
			}
		});
	},
	"array" : function(name,spec,obj,callback,save){
		var i, result = [];
		if(!Array.isArray(obj)){
			if(spec.optional) obj = [];
			else if(save.type==="repair"){
				match_recursive(name+".x",spec.items,obj,function(e,r){ callback(e,e?null:[r]); },save);
				return;
			}
			else { callback("corrupt:"+name); return; }
		}
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
			if(save.type==="partial" || save.type==="repair") obj = {};
			else { callback("corrupt:"+name); return; }
		var result = {};
		for(var key in spec.items)
			if(key in obj)
				result[key] = function(key){
					return function(cb){ match_recursive(name+"."+key,spec.items[key],obj[key],cb,save); };
				}(key);
			else if(save.type==="partial" || spec.items[key].optional) continue;
			else if("default" in spec.items[key] || save.type==="repair")
				result[key] = function(key){
					return function(cb){ match_recursive(name+"."+key,spec.items[key],spec.items[key].default,cb,save); };
				}(key);
			else { callback("missing:"+key); return; }
		if(Object.keys(result).length==0) callback(null,{});
		else async.parallel(result,callback);
	}
};

var match_recursive = function(name,spec,obj,callback,save){
	if(spec.type in datatypes) datatypes[spec.type](name,spec,obj,callback,save);
	else callback("unknown-type");
};

var match_common = function(name,spec,obj,callback,type){
	var result, save = {"type":type,"files":[],"references":{}};
	async.series([
		function(cb){ match_recursive(name,{type:"object",items:spec},obj,function(e,r){ result=r; cb(e); },save); }
	], function(error){ callback.apply(null,[error,result,save].slice(0,error?1:3)); });
};

specification.match = {};
["partial","complete","repair"].forEach(function(key){
	specification.match[key] = function(name,spec,obj,callback){
		match_common(name,spec,obj,callback,key);
	};
});


var verify_recursive = function(name,spec,callback){
	if(typeof(spec)==="object" && spec!==null && spec.type in datatypes && spec.type!=="document"){
		if(spec.type==="array") verify_recursive(name+"[]",spec.items,callback);
		else if(spec.type==="object"){
			if(typeof(spec.items)!=="object" || spec.items===null) callback("corrupt-object:"+name);
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
		function(cb){ cb(typeof(spec)==="object" && spec!==null ? null : "corrupt-schema") },
		function(cb){ verify_recursive(name,{type:"object","items":spec},cb); },
		function(cb){
			cb(Object.keys(spec).filter(function(x){
				return !!spec[x].primary && !spec[x].optional; // a primary attribute cannot be optional
			}).length===1 ? null : "no-primary-key");
		}
	],function(e){ callback(e?"specification-error:"+e:null); });
};