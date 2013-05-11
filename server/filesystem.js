
var filesystem = exports = {}, openfiles = {};

var timeout = function(id,done){
	if(!(id in openfiles)) return;
	clearTimeout(openfiles[id].timeout);
	if(!done) openfiles[id].timeout = setTimeout(function(){
		if(!openfiles[id]) delete openfiles[id];
		else async.series([
			function(cb){ openfiles[id].file.close(cb); },
			function(cb){ openfiles[id].file.unlink(cb); }
		],function(e){
			delete openfiles[id];
		});
	},10000);
};

filesystem.list = function(callback){
	if(typeof(callback)!=="function") callback = misc.nop;
	async.waterfall(mongodb.ready().concat([
		function(cb){ mongodb.GridStore.list(mongodb,cb); }
	]), function(error,result){
		if(error){ callback(error); return; }
		result = result.remove(config.dummy.file.id);
		callback(null, result);
	});
};
filesystem.file = {};
filesystem.file.exists = function(id,callback){
	id = String(id);
	if(typeof(callback)!=="function") callback = misc.nop;
	async.waterfall(mongodb.ready().concat([
		function(cb){ mongodb.GridStore.exist(mongodb,id,cb); }
	]), function(e,r){ callback(e,e?undefined:r); });
};
filesystem.file.delete = function(id,callback){
	id = String(id);
	if(typeof(callback)!=="function") callback = misc.nop;
	async.waterfall(mongodb.ready().concat([
		function(cb){ filesystem.file.exists(id,cb); },
		function(r,cb){ if(!r) cb(null); else mongodb.GridStore.unlink(mongodb, id, cb); }
	]), function(e){ callback(e); });
};
filesystem.file.open = function(id,mode,callback){
	id = String(id);
	if(typeof(callback)!=="function") callback = misc.nop;
	openfiles[id] = {"file": new mongodb.GridStore(mongodb, id, id, mode, {})};
	async.waterfall(mongodb.ready().concat([
		function(cb){ openfiles[id].file.open(cb); }
	]), function(e,gs){
		timeout(id);
		callback(e,e?undefined:{"length":gs.length});
	});
};
// not using mongodb.ready in read/write/close because open already has it
filesystem.file.read = function(id,length,callback){
	id = String(id);
	if(length!==null){ length = parseInt(length); if(isNaN(length) || length<0) length = null; }
	if(typeof(callback)!=="function") callback = misc.nop;
	if(!(id in openfiles)) callback("file-not-open");
	else openfiles[id].file.read(length,function(e,block){
		timeout(id);
		callback(e,e?undefined:block);
	});
};
filesystem.file.write = function(id,data,callback){
	id = String(id);
	if(typeof(callback)!=="function") callback = misc.nop;
	if(!(id in openfiles)) callback("file-not-open");
	else openfiles[id].file.write(data,function(e){
		timeout(id);
		callback(e);
	});
};
filesystem.file.close = function(id,callback){
	id = String(id);
	if(typeof(callback)!=="function") callback = misc.nop;
	if(!(id in openfiles)) callback("file-not-open");
	else openfiles[id].file.close(function(error){
		if(error===null) delete openfiles[id];
		timeout(id,true);
		callback(error);
	});
};