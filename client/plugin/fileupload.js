
/*
Options that would be nice : ability to deselect specific files.
*/

var blocksize = 100*1024; // 100KB

var hrsize = function(b){ // human readable size
	if(b<1024) return Math.ceil(b)+ "B"; b/=1024;
	if(b<1024) return Math.ceil(b)+"KB"; b/=1024;
	if(b<1024) return Math.ceil(b)+"MB"; b/=1024;
	return Math.ceil(b)+"GB";
};

exports = function(args){
	if(typeof(args)!=="object") return false;
	args.multiselect = !!args.multiselect;
	var s = (args.multiselect?"(s)":"");

	// Looks

	var top = $("<div>");
	var input = top.append("<input type='file' style='display:none;'>").children(":first-child");
	if(args.multiselect) input.attr("multiple","multiple");
	var pbar1 = top.append("<div style='position:absolute;z-index:-1;'></div>").children(":last-child");
	var pbar2 = pbar1.append("<div style='background:#eee;width:0%;height:30px;'></div>").children(":last-child");
	var display = top.append("<div class='input-append' style='display:inline-block;'>").children(":last-child");
	var output = top.append("<input type='hidden'>").children(":last-child");
	display.append("<input type='text' style='cursor:text;background:transparent;' readonly='readonly' placeholder='Select File ...'>");
	var text = display.children("input");
	display.append("<span class='btn' title='Download File"+s+"'><i class='icon-download'></i></span>");
	display.append("<span class='btn' title='Add File"+s+"'><i class='icon-plus-sign'></i></span>");
	display.append("<span class='btn' title='Replace File"+s+"'><i class='icon-edit'></i></span>");
	display.append("<span class='btn' title='Delete File"+s+"'><i class='icon-trash'></i></span>");
	display.append("<span class='btn' title='Cancel Change"+s+"'><i class='icon-remove-circle'></i></span>");
	display.children("span").css("padding","4px 4px");

	var change = function(){
		var i,count=0,last,total=5;
		for(i=0;i<total;++i){
			count+=arguments[i]?1:0;
			if(arguments[i]) last=i+1;
			$(display.children().get(i+1))
				.css("display",arguments[i]?"inline-block":"none")
				.css("border-radius","0px");
		}
		if(last) $(display.children().get(last)).css("border-radius","0px 4px 4px 0px");
		text.css("width",206-23*count);
		// match progress bar style with input
		pbar1.css("width",206-23*count+14);
		["top","bottom"].forEach(function(v){
			["left","right"].forEach(function(h){
				var p = "border-"+v+"-"+h+"-radius";
				pbar1.children("div").css(p,text.css(p));
			});
		});
	};

	var text_display = function(files){
		text.val($.map(files,function(f){
			return "\""+f.name+"\" ("+hrsize(f.size)+")";
		}).join(", "));
	};

	// Uploading Mechanism
	var interface = {}, uploaded, response_lock = new misc.semaphore(1);
	var running = 0, totaloffset, totalsize;

	var upload_actual = function(file,progress,callback){
		progress(0,file.size);
		rpc("file.upload.start",{"size":file.size},function(error,id){
			var length=0, fileReader = new FileReader(); offset = 0;
			var send = function(error){
				if(running<=0){ rpc("file.upload.cancel",{"id":id},function(e){ callback("cancelled"); }); return; }
				if(error){ callback(error); return; }
				offset += length; length = Math.min(file.size-offset,blocksize);
				progress(offset,file.size);
				if(length==0) rpc("file.upload.end",{"id":id},function(e){
					callback(e,e?undefined:{"id":id,"name":file.name,"size":file.size});
				}); else {
					fileReader.onload = function(event){ rpc("file.upload.continue",{"id":id,"offset":offset,"block":event.target.result},send); };
					fileReader.readAsBinaryString(file.slice(offset,offset+length));
				}
			}; send(null);
		});
	};

	var upload_manage = function(progress){
		if(typeof(progress)!=="function") progress = misc.nop;
		response_lock.acquire(function(){
			if(++running<=0) return false;
			var offsets={}; totaloffset = 0; totalsize = 0;
			var files = Array.prototype.slice.call(input[0].files);
			files.forEach(function(f){ totalsize+=f.size; });
			files = files.map(function(file){
				return function(cb){
					upload_actual(file,function(offset,size){
						offsets[file.name]=offset;
						totaloffset = 0; for(var fn in offsets) totaloffset += offsets[fn];
						pbar2.css("width",Math.floor(100*totaloffset/totalsize)+"%");
						progress(totaloffset,totalsize);
					},function(error,result){
						if(error) pbar2.css("width","0%");
						cb(error,result);
					});
				};
			});
			async[args.parallel?"parallel":"series"](files,function(error,result){
				uploaded = (error===null?result:undefined);
				response_lock.release();
			});
		});
	};

	var upload_cancel = function(done){
		--running;
		response_lock.acquire(function(){
			if(Array.isArray(uploaded)) uploaded.forEach(function(f){ rpc("file.upload.delete",{"id":f.id},misc.nop); });
			response_lock.release();
			done();
		});
	};

	interface.start = function(progress){ upload_manage(progress); };
	interface.stop = function(){ upload_cancel(); };
	interface.status = function(){ return running>0?[totaloffset,totalsize]:null; };
	interface.result = function(callback){
		if(typeof(callback)!=="function") callback = misc.nop;
		response_lock.acquire(function(){
			if(input[0].files.length===0){
				if(mode===3) callback(null,args.multiselect?[]:null);
				else callback(null,args.multiselect?args.initial:(args.initial[0]?args.initial[0]:null)); // mode 0 or 1
			} else callback(null,args.multiselect?uploaded:uploaded[0]); // mode 2
			response_lock.release();
		});
	};

	// Button Click Behaviour

	var initial, mode; // mode: 0=init_empty, 1=init_filled, 2=now_replaced, 3=now_deleted

	if(typeof(args.initial)==="object" && args.initial && (!Array.isArray(args.initial) || args.initial.length>0)){
		if(!args.multiselect) args.initial = [args.initial];
		args.initial = args.initial.filter(function(f){ return typeof(f)==="object" && f!==null && typeof(f.id)==="string" && typeof(f.name)==="string" && typeof(f.size)==="number" && f.id!==config.dummy.file.id; });
	} else args.initial = [];

	if(args.initial.length>0) initial = function(){
		mode=1; change(1,0,1,1,0);
		text_display(args.initial); pbar2.css("width","100%");
	}; else initial = function(){
		mode=0; change(0,1,0,0,0);
		text_display([]); pbar2.css("width","0%");
	};

	var file_change = function(){
		var files = Array.prototype.slice.call(input[0].files);
		text_display(files);
		if(files.length===0) initial();
		else {
			mode=2;
			change(0,0,1,0,1);
			pbar2.css("width","0%");
			upload_manage();
		}
	};
	var file_remove = function(){
		text.val("File"+s+" to be deleted.");
		mode = 3; change(0,0,0,0,1); pbar2.css("width","0%");
	};
	var file_reset = function(){
		upload_cancel(function(){
			var attrmap = misc.attrmap(input.replaceWith("<input>")[0]);
			input = top.children(":first-child");
			for(var key in attrmap) input.attr(key,attrmap[key]);
			input.change(file_change);
			initial();
		});
	};
	var file_download = function(){ window.location="/download?id="+args.initial[0].id+"&name="+args.initial[0].name.urlencode(); };

	input.change(file_change);
	text.focus(function(){ if(mode==0){ input.click(); } });

	$(display.children()[1]).click(file_download);
	$(display.children()[2]).click(function(){ input.click(); });
	$(display.children()[3]).click(function(){ input.click(); });
	$(display.children()[4]).click(file_remove);
	$(display.children()[5]).click(file_reset);

	initial();

	return {"node":top,"interface":interface};
};