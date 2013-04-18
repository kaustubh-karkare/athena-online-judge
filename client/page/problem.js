
var authlevel = 2; // for editting statement/tutorial
var tabs = ["statement","tutorial","submissions"];

exports = new page(function(data,callback){
	var path = data.path;
	if(path[4]==="code" && !isNaN(parseInt(path[5]))) { callback("redirect","code"); return; }
	if(path[4]===undefined) path[4] = "statement";
	else if(tabs.indexOf(path[4])===-1){ location.hash = path.slice(0,4).hash(); return; }
	async.parallel({
		"contest": function(cb){ rpc("contest.display",path[1],cb); },
		"problem": function(cb){ rpc("problem.display",path[3],cb); }
	}, function(error,result){
		if(error){ callback(error); return; }

		var heading = $("<legend style='width:760px;padding:10px;'><a href='"+path.slice(0,2).hash()+"'>"+result.contest.name.htmlentities()+"</a> / "+
			result.problem.name.htmlentities()+"</legend>");
		heading.append(
			$("<span class='pull-right'>").append(tabs.map(function(x){
				return "<a class='btn "+(path[4]===x?"btn-primary":"")+"' href='"+path.slice(0,4).concat(x).hash()+"'>"+x.ucwords()+"</a> ";
			}))
		);
		
		if(path[4]==="statement" || path[4]==="tutorial"){
			if(path[5]==="edit"){
				var main = $("<div class='problem'><textarea></textarea></div>");
				var t = main.find("textarea")[0]; t.value = result.problem[path[4]];
				window.setTimeout(function(){
					var editor = CodeMirror.fromTextArea(t,{mode:CodeMirror.loadMode("Markdown")});
					main.append($("<div style='text-align:center;margin-top:20px;'>").append([
						$("<a class='btn'>Update "+path[4].ucwords()+"</a>").click(function(){
							editor.save(); main.animate({opacity:0.5},display.duration);
							rpc("problem.update",[result.problem._id,path[4],t.value],function(e,r){
								if(!e) location.hash = path.slice(0,4).concat(path[4]).hash();
								else { main.animate({opacity:1},display.duration); display.error(e); }
							});
						}), " ",
						$("<a class='btn' href='"+path.slice(0,4).hash()+"'>Cancel</a>")
					]));
				},0);
			} else {
				var html = Markdown.getSanitizingConverter().makeHtml(result.problem[path[4]]);
				var main = $("<div class='problem'>"+html+"</div>");
				main.find("a,img").each(function(i,e){
					url = (e.nodeName==="A"?e.href:e.src).match(/\/([^\/]+)$/,""); url = url?url[1]:url;
					var f = result.problem.files.filter(function(f){ console.log(f.name,url); return f.name===url; });
					if(f.length) url = "download?id="+f[0].id+"&name="+url; else return;
					if(e.nodeName==="A"){ e.href = url; e.target='new'; } else e.src = url;
				});
				if(auth.level>=authlevel) main.append($("<div style='text-align:center;margin-top:20px;'>").append([
					"<a href='"+path.slice(0,5).concat("edit").hash()+"' class='btn'>Edit "+path[4].ucwords()+"</a>"
				]));
			}
		} else {
			var main = plugin.pagination({
				"rpc":"code.list",
				"page":{"size":25},
				"data":{"contest":result.contest._id,"problem":result.problem._id},
				"render":function(item,cb){ cb(null,item===null?["Code ID","User","Language"]:
					[item._id,item.user.username.htmlentities(),item.language.name.htmlentities()]); },
				"click": function(item){ location.hash = path.slice(0,4).concat("code",item._id).hash(); }
			}).node;
		}

		if(path[4]==="statement" && path[5]!=="edit"){
			var lang = plugin.suggestion({"collection":"language"});
			var textarea = $("<textarea name='code'></textarea>");
			var editor = null;
			window.setTimeout(function(){
				editor = CodeMirror.fromTextArea(textarea[0],{mode:"text/plain",lineNumbers:true});
				$(lang.node).blur(function(){ var v = lang.value(); editor.setOption("mode",CodeMirror.loadMode(v?v.name:v)); });
			},0);
			var upload = $("<input type='file'>").change(function(){
				if(this.files.length===0) return;
				var file = this.files[0], fileReader = new FileReader();
				if(file.size>100*1024){ display.error("file.too-large"); return; }
				fileReader.onload = function(event){ if(editor) editor.setValue(event.target.result); else textarea[0].value = event.target.result; };
				fileReader.readAsBinaryString(file);
				return false;
			});
			var uploadbtn = $("<span class='btn pull-right' style='width:100px;'>Load from File</span>");
			uploadbtn.click(function(){ upload.click(); });
			var submit = $("<form class='problem'>").append([
				"<legend>Submit a Solution</legend>",
				"<span style='position:relative;top:-5px;'>Language :</span> ", lang.node, uploadbtn, textarea,
				"<input type='submit' value='Submit Code' class='btn pull-right' style='width:126px;margin:10px 0px;'>"
			]).submit(function(){
				rpc("code.submit",{"contest":{_id:result.contest._id},"problem":{_id:result.problem._id},"code":editor?editor.getValue():textarea[0].value,"language":lang.value()},function(e,r){
					if(e===null) location.hash=path.slice(0,4).concat(["code",r._id+""]).hash();
					else display.error(e);
				});
				return false;
			});
		} else var submit = $();

		callback(null,$("<div>").append([ heading, main, "<hr>", submit ]));
	});
});