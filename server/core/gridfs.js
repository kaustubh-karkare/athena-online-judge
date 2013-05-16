
var gridfs = exports = {};

var openfiles = {}, timeout = function(id,done){
	if(!(id in openfiles)) return;
	clearTimeout(openfiles[id].timeout);
	if(!done) openfiles[id].timeout = setTimeout(function(){
		if(!openfiles[id]) delete openfiles[id];
		else async.series([
			function(cb){ openfiles[id].file.close(cb); }
		],function(e){
			delete openfiles[id];
		});
	},10000);
};

gridfs.list = function(callback){
	if(typeof(callback)!=="function") callback = misc.nop;
	async.waterfall(mongodb.ready().concat([
		function(cb){ mongodb.GridStore.list(mongodb,cb); }
	]), function(error,result){
		if(error){ callback(error); return; }
		result = result.remove(constant.dummy.file.id);
		callback(null, result);
	});
};
gridfs.exists = function(id,callback){
	id = String(id);
	if(typeof(callback)!=="function") callback = misc.nop;
	async.waterfall(mongodb.ready().concat([
		function(cb){ mongodb.GridStore.exist(mongodb,id,cb); }
	]), function(e,r){ callback(e,e?undefined:r); });
};
gridfs.delete = function(id,callback){
	id = String(id);
	if(typeof(callback)!=="function") callback = misc.nop;
	async.waterfall(mongodb.ready().concat([
		function(cb){ gridfs.exists(id,cb); },
		function(r,cb){ if(!r) cb(null); else mongodb.GridStore.unlink(mongodb, id, cb); }
	]), function(e){ callback(e); });
};
gridfs.open = function(id,mode,callback){
	if(id===null) id = String(mongodb.ObjectID());
	else id = String(id);
	if(typeof(callback)!=="function") callback = misc.nop;
	openfiles[id] = {"file": new mongodb.GridStore(mongodb, id, id, mode, {})};
	async.waterfall(mongodb.ready().concat([
		function(cb){ openfiles[id].file.open(cb); }
	]), function(e,gs){
		timeout(id);
		callback(e,e?undefined:{"id":id,"length":gs.length});
	});
};
// not using mongodb.ready in read/write/close because open already has it
gridfs.read = function(id,length,callback){
	id = String(id);
	if(length!==null){ length = parseInt(length); if(isNaN(length) || length<0) length = null; }
	if(typeof(callback)!=="function") callback = misc.nop;
	if(!(id in openfiles)) callback("file-not-open");
	else openfiles[id].file.read(length,function(e,block){
		timeout(id);
		callback(e,e?undefined:block);
	});
};
gridfs.write = function(id,data,callback){
	id = String(id);
	if(typeof(callback)!=="function") callback = misc.nop;
	if(!(id in openfiles)) callback("file-not-open");
	else openfiles[id].file.write(data,function(e){
		timeout(id);
		callback(e);
	});
};
gridfs.close = function(id,callback){
	id = String(id);
	if(typeof(callback)!=="function") callback = misc.nop;
	if(!(id in openfiles)) callback("file-not-open");
	else openfiles[id].file.close(function(error){
		if(error===null) delete openfiles[id];
		timeout(id,true);
		callback(error);
	});
};

var blocksize = 100*1024;

var transfer = function(type,id,path,callback){
	id = String(id); path = String(path);
	var offset = 0, size, file;
	if(typeof(callback)!=="function") callback = misc.nop;
	async.series([
		function(cb){ gridfs.open(id,(type?"r":"w"),function(e,r){ if(!e) size=r.length; cb(e); }); },
		function(cb){ if(type) cb(null); else fs.stat(path,function(e,r){ if(!e) size=r.size; cb(e); }) },
		function(cb){ fs.open(path,(type?"w":"r"),"777",function(e,r){ file=r; cb(e); }); },
		function(cb){
			var length, buffer = new Buffer(blocksize);
			// calculate next block length & start read
			var step1 = function(){
				length = Math.min(size-offset,blocksize);
				if(length===0){ cb(null); return; }
				if(type) gridfs.read(id,length,step2);
				else fs.read(file,buffer,0,length,null,step2);
			};
			// read done, start write
			var step2 = function(error,data){
				if(error){ cb(error); return; }
				if(type) fs.write(file,buffer = new Buffer(data),0,buffer.length,null,step3);
				else gridfs.write(id,buffer.toString("utf8",0,data),step3);
			};
			// write done, loop back to step1
			var step3 = function(error){
				if(error){ cb(error); return; }
				offset+=length; step1();
			};
			step1();
		},
		function(cb){ gridfs.close(id,cb); },
		function(cb){ fs.close(file,cb); }
	],function(e){ callback(e); });
};

gridfs.extract = function(id,path,callback){
	transfer(true,id,path,callback);
};

gridfs.insert = function(id,path,callback){
	transfer(false,id,path,function(e){ callback(e,e?undefined:id); });
};