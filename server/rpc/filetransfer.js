
rpc.on("socket.connect",function(socket){
	socket.data.files = [];
});

rpc.on("socket.disconnect",function(socket){
	socket.data.files.forEach(function(id){
		filesystem.file.delete(id,function(e){ console.log("socket.disconnect","file.delete",id,e); });
	});
});

var uploads = {};
var check_ints = ["size","offset"];
var blocksize = 100*1024; // 100KB
var check = function(spec,data){
	if(typeof(data)!=="object" || data===null) return "corrupt";
	for(var i=0;i<spec.length;++i)
		if(spec[i] in data) data[spec[i]] = (check_ints.indexOf(spec[i])!=-1?parseInt:String)(data[spec[i]]);
		else return "missing:"+spec[i];
	return null;
};

rpc.on("file.upload.start",function(socket,data,callback){
	var e = check(["size"],data); if(e){ callback(e); return; }
	var id = String(mongodb.ObjectID());
	async.waterfall([
		function(cb){ filesystem.file.exists(id,function(e,r){ cb(e?e: r?"file-exists": null); }); },
		function(cb){ filesystem.file.open(id,"w",cb); }
	], function(e){
		if(e===null) uploads[id]={"size":data.size,"offset":0};
		callback(e,e?undefined:id);
	});
});

rpc.on("file.upload.continue",function(socket,data,callback){
	var e = check(["id","offset","block"],data); if(e){ callback(e); return; }
	async.waterfall([
		function(cb){ cb(data.id in uploads? null : "file-timeout"); },
		function(cb){ cb(uploads[data.id].offset==data.offset? null : "file-jumbled"); },
		function(cb){ filesystem.file.write(data.id,data.block,cb); }
	], function(e){ uploads[data.id].offset+=data.block.length; callback(e); });
});

rpc.on("file.upload.end",function(socket,data,callback){
	var e = check(["id"],data); if(e){ callback(e); return; }
	async.waterfall([
		function(cb){ filesystem.file.close(data.id,function(e){ cb(e); }); },
		function(cb){ cb(uploads[data.id].offset==uploads[data.id].size?null:"file-aborted"); }
	], function(e){
		if(e) filesystem.file.delete(data.id,misc.nop);
		else socket.data.files.push(data.id);
		delete uploads[data.id]; callback(e);
	});
});

rpc.on("file.upload.cancel",function(socket,data,callback){
	var e = check(["id"],data); if(e){ callback(e); return; }
	async.waterfall([
		function(cb){ filesystem.file.close(data.id,function(e){ cb(e); }); },
		function(cb){ filesystem.file.delete(data.id,function(e){ cb(e); }); }
	], function(e){ delete uploads[data.id]; callback(e); });
});

rpc.on("file.upload.delete",function(socket,data,callback){
	var e = check(["id"],data); if(e){ callback(e); return; }
	async.waterfall([
		function(cb){ cb(socket.data.files.indexOf(data.id)===-1?"unauthorized":null); },
		function(cb){ filesystem.file.delete(data.id,function(e){ cb(e); }); }
	], function(e){ socket.data.files.remove(data.id); callback(e); });
});

rpc.on("file.download",function(socket,data,callback){
	if(socket!==null) return; // prevent remote triggering
	var e = check(["id"],data); if(e){ callback(e); return; }
	if(typeof(data.send)!=="function"){ callback("missing:send"); return; }
	async.waterfall([
		function(cb){ filesystem.file.open(data.id,"r",function(e,r){ cb(e,e?undefined:r.length); }); },
		function(length,cb){
			var file = {"size":length,"offset":0};
			var send = function(){
				length = Math.min(file.size-file.offset,blocksize);
				if(length===0) cb(null);
				else filesystem.file.read(data.id,length,function(e,block){
					if(e){ cb(e); return; }
					data.send(file,block);
					file.offset+=length;
					setTimeout(send,0);
				});
			}; send();
		}
	], function(e){
		filesystem.file.close(data.id,"r",misc.nop);
		callback(e);
	});
});