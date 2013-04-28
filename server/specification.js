
var specification = exports = {};

var datatypes = {
	"integer" : function(name,spec,obj,callback,save){
		obj = parseInt(obj);
		if(isNaN(obj)) callback("corrupt:"+name);
		else callback(null,obj);
	},
	"float" : function(name,spec,obj,callback,save){
		obj = parseFloat(obj);
		if(isNaN(obj)) callback("corrupt:"+name);
		else callback(null,obj);
	},
	"datetime" : function(name,spec,obj,callback,save){ // duplicate: integer
		obj = parseInt(obj);
		if(isNaN(obj)) callback("corrupt:"+name);
		else callback(null,obj);
	},
	"string" : function(name,spec,obj,callback,save){
		obj = String(obj);
		if(!spec.optional && obj.length===0) callback("empty:"+name);
		else callback(null,obj);
	},
	"select" : function(name,spec,obj,callback,save){
		obj = String(obj);
		if(Object.keys(spec.options).indexOf(obj)===-1) callback("corrupt:"+name);
		else callback(null,obj);
	},
	"reference" : function(name,spec,obj,callback,save){
		if(spec.optional && obj===null){ callback(null,null); return; }
		if(typeof(obj)!=="object" || obj===null || !("_id" in obj)){ callback("corrupt:"+name); return; }
		var fields = {}; schema[spec.collection].keys.forEach(function(key){ fields[key]=1; });
		database.get(spec.collection,{_id:obj._id},fields,function(error,result){
			if(!error){
				if(!(spec.collection in save.references)) save.references[spec.collection] = [];
				if(save.references[spec.collection].indexOf(result._id)===-1)
					save.references[spec.collection].push(result._id);
			}
			callback(error,error===null?result:undefined);
		});
	},
	"file" : function(name,spec,obj,callback,save){
		if(spec.optional && obj===null){ callback(null,null); return; }
		if(typeof(obj)!=="object" || obj===null  || !("id" in obj) || !("name" in obj) || !("size" in obj))
			{ callback("corrupt:"+name); return; }
		obj.id = String(obj.id).toLowerCase(); obj.name = String(obj.name); obj.size = parseInt(obj.size);
		if(obj.id.match(/^[0-9a-f]{24}$/)===null || obj.name==="" || isNaN(obj.size) || obj.size<0)
			{ callback("corrupt:"+name); return; }
		filesystem.file.exists(obj.id,function(error,result){
			if(!error) save.files.push(obj);
			callback(error?error: !result?"nonexistant": null, obj);
		});
	},
	"array" : function(name,spec,obj,callback,save){
		var i, result = [];
		if(!Array.isArray(obj)){ callback("corrupt:"+name); return; }
		for(i=0;i<obj.length;++i)
			result.push(function(i){
				return function(cb){ match_recursive(name+"."+i,spec.items,obj[i],cb,save); };
			}(i));
		if(result.length>0) async.parallel(result,callback);
		else if(spec.optional) callback(null,[]);
		else callback("empty:"+name);
	},
	"object" : function(name,spec,obj,callback,save){
		if(typeof(obj)!=="object" || obj===null){ callback("corrupt:"+name); return; }
		var result = {};
		for(var key in spec.items)
			if(!(key in obj)){
				if(save.complete<2 || spec.items[key].optional) continue;
				else if("default" in spec.items[key]) result[key] = function(key){
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
	var save = {"complete":complete,"files":[],"references":{}};
	match_recursive(name,spec,obj,function(error,result){
		if(save.complete===1 && error===null && "keys" in spec &&
			spec.keys.filter(function(key){ return key in result; }).length===0) error = "incomplete";
		if(error) callback(error); else callback(null,result,save);
	},save);
};

specification.match_partial = function(name,spec,obj,callback){ match_common(name,spec,obj,callback,0); };
specification.match_select = function(name,spec,obj,callback){ match_common(name,spec,obj,callback,1); };
specification.match_complete = function(name,spec,obj,callback){ match_common(name,spec,obj,callback,2); };



var verify_recursive = function(name,spec,callback){
	if(typeof(spec)==="object" && spec!==null && spec.type in datatypes && spec.type!=="document"){
		if(spec.type==="array") verify_recursive(name+"[]",spec.items,callback);
		else if(spec.type==="object"){
			if(typeof(spec.items)!=="object") callback("specification-error:corrupt-object:"+name);
			else async.parallel(Object.keys(spec.items).map(function(key){
				return function(cb){ verify_recursive(name+"."+key,spec.items[key],cb); };
			}),callback);
		} else if(spec.type==="select"){
			if("options" in spec && "default" in spec && Object.keys(spec.options).indexOf(String(spec.default))!==-1) callback(null);
			else callback("specification-error:corrupt-select:"+name);
		} else if(spec.type==="reference"){
			if("collection" in spec && spec.collection in schema) callback(null);
			else callback("specification-error:corrupt-reference:"+name)
		} else callback(null);
	} else callback("specification-error:corrupt:"+name);
};

specification.verify = function(name,spec,callback){
	if(typeof(spec)==="object" && spec!==null && spec.type==="document"){
		verify_recursive(name,{type:"object","items":spec.items},function(error,result){
			if(error!==null
				|| !Array.isArray(spec.keys)
				|| spec.keys.length===0
				|| spec.keys.filter(function(key){ return key in spec.items; }).length!=spec.keys.length
				) callback(error?error:"specification-error");
			else callback(null);
		});
	} else callback("specification-error:corrupt-document:"+name);
};