
var database = exports = {};

database.select = function(collection,query,options,callback){
	async.waterfall(mongodb.ready(collection).concat([
		function(c,cb){ c.find(query,options).sort().toArray(cb); }
	]), typeof(callback)==="function"?callback:misc.nop);
};
database.insert = function(collection,object,options,callback){
	async.waterfall(mongodb.ready(collection).concat([
		function(c,cb){ c.insert(object,options,cb); }
	]), typeof(callback)==="function"?callback:misc.nop);
};
database.update = function(collection,object,update,options,callback){
	async.waterfall(mongodb.ready(collection).concat([
		function(c,cb){ c.update(object,update,options,cb); }
	]), typeof(callback)==="function"?callback:misc.nop);
};
database.delete = function(collection,object,options,callback){
	async.waterfall(mongodb.ready(collection).concat([
		function(c,cb){ c.remove(object,options,cb); }
	]), typeof(callback)==="function"?callback:misc.nop);
};
database.nextid = function(collection,callback){
	async.waterfall(mongodb.ready(collection).concat([
		function(c,cb){ c.find({},{_id:1}).sort({_id:-1}).limit(1).toArray(function(e,r){ cb(e,e?null: r.length==0?1:r[0]._id+1); }); }
	]), typeof(callback)==="function"?callback:misc.nop);
};
database.get = function(collection,query,options,callback){
	database.select(collection,query,options,function(error,result){
		if(error===null && result.length!=1) callback(result.length?"multiple-matches":"not-found");
		else callback(error,result[0]);
	});
};
database.prevent = function(collection,query,options,callback){
	database.select(collection,query,options,function(error,result){
		callback(error?error: result.length>0?"matches": null);
	});
};

database.page = function(collection,query,options,data,callback){
	var c,n;
	// validation of supplied data
	if(typeof(data)!=="object" || data===null){ callback("corrupt"); return; }
	var a = ["number","size","sort"];
	for(var i=0;i<a.length;++i){
		if(!(a[i] in data)){ callback("missing:"+a[i]); return; }
		if(i<2){
			data[a[i]] = parseInt(data[a[i]]);
			if(!isNaN(data[a[i]])) continue;
		} else {
			if(typeof(data[a[i]])==="string" || data[a[i]]===null) continue;
		}
		callback("corrupt:"+a[i]); return;
	}
	// actual database access
	async.waterfall(mongodb.ready(collection).concat([
		function(_c,cb){
			c = _c.find(query,options); // cursor
			if(data.sort!==null) c.sort(data.sort);
			c.count(cb);
		},
		function(_n,cb){
			n = _n; // count
			c.skip((data.number-1)*data.size).limit(data.size).toArray(cb)
		}
	]), function(error,result){
		if(error){ callback(error); return; }
		result = {"data":result,"number":data.number,"total":Math.max(1,Math.ceil(n/data.size))};
		result.order = result.data.map(function(e){ return e._id; });
		result.data = misc.array2object(result.order, result.data);
		callback(null,result);
	});
};