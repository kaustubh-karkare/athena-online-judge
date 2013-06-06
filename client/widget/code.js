
var codeid = 0;
var pathbase = document.location.href.substr(0,(t=document.location.href.indexOf("#"),t==-1?undefined:t));
var popup_base =
	"<link href='"+pathbase+"css/popup.css' rel='stylesheet'>" +
	"<table><tbody> <tr><th>Actual Input</th><th>Expected Output</th><th>Actual Output</th></tr>" +
	"<tr><td><pre id='ti'></pre></td><td><pre id='eo'></pre></td><td><pre id='to'></pre></td></tr> </tbody></table>";

exports = new widget(function(data,callback){
	var path = data.path;
	async.parallel({
		"code": function(cb){ rpc("code.display",{"contest":path[1],"problem":path[3],"code":codeid=parseInt(path[5]),"key":path[6]},cb); }
	}, function(error,result){
		if(error==="unauthorized"){ callback("redirect",path.slice(0,4).hash()); return; }
		if(error){ callback(error); return; }
		var heading = $("<legend style='width:760px;padding:10px;'><a href='"+path.slice(0,2).hash()+"'>"+result.code.contest.name.htmlentities()+"</a> / <a href='"+path.slice(0,4).hash()+"'>"+result.code.problem.name.htmlentities()+"</a> / Code Submission</legend>");
		heading.append($("<span class='pull-right'>").append([
			"<a class='btn' href='"+path.slice(0,2).concat("submissions").hash()+"'>Contest Submissions</a> ",
			"<a class='btn' href='"+path.slice(0,4).concat("submissions").hash()+"'>Problem Submissions</a>"
		]));
		var code = $("<textarea></textarea>"); code[0].value = result.code.code;
		if(result.code.key){
			var sharelink = pathbase+path.slice(0,6).concat(result.code.key).hash();
			var share = $("<div style='text-align:center;'><br>Share this code via the URL : <a href='"+sharelink+"'>"+sharelink+"</a></div>");
		} else var share = $();
		var pending = result.code.result.substr(0,2)==="NA";
		var legend = $("<legend>"+(pending?"Status":"Evaluation Result")+" : "+schema.code.result.options[result.code.result]+"</legend>");
		legend.append($("<span class='pull-right'>").append(auth.level<constant.adminlevel ? [] : [
			pending ? "" : $("<a class='btn'>Rejudge</a>").click(function(){
				rpc("code.update",{"_id":result.code._id,"result":"NA1"},function(e){
					if(e) display.error(e); else { display.success("This code has been successfully queued for rejudgement."); exports.reload(); }
				});
			}),
			" ",
			$("<a class='btn btn-danger'>Disqualify</a>").click(function(){
				rpc("code.update",{"_id":result.code._id,"result":"DQ"},function(e){
					if(e) display.error(e); else { display.success("This code has been successfully disqualified."); exports.reload(); }
				});
			})
		]));
		var results = $("<div>").append("<br><br>",legend);
		var auth_io = (auth.level>=constant.adminlevel);
		var list = results.append("<table class='table table-striped"+(auth_io?" table-hover":"")+"'>").children().last();
		list.append("<tr><th>Test Number</th><th>Run Time (seconds)</th><th>Result</th></tr>"); // error & output not being considered
		if(!pending && Array.isArray(result.code.results)) result.code.results.forEach(function(test,i){
			var tr = $("<tr>").append("<td>"+(i+1)+"</td>", "<td>"+test.time+"</td>", "<td>"+schema.code.result.options[test.result]+"</td>");
			if(auth_io) tr.click(function(){
				var popup = window.open("","","width=400,height=300,top=100,left=100");
				popup.document.body.innerHTML = popup_base;
				var gen = function(id){
					return function(cb){
						$.ajax({
							"url": pathbase+"download",
							"data": {"id":id},
							"success": function(data){ cb(null,data); },
							"error": function(data){ cb("ajax-error"); }
						});
					};
				};
				async.parallel({
					"ti":gen(test.input.id),
					"eo":gen(test.expected.id),
					"to":gen(test.output.id)
				},function(e,r){
					if(!e) $(popup.document.body).find("pre").each(function(i,e){ $(e).html(r[e.id]); });
					else { display.error("Could not download Input/Output data."); popup.close(); }
				});
			});
			list.append(tr);
		});
		callback(null,$("<div>").append(heading[0],code[0],share[0],results[0]));
		// CodeMirror requires access to the parent attribute, which will only be defined now.
		CodeMirror.fromTextArea(code[0],{mode:CodeMirror.loadMode(result.code.language.name),lineNumbers:true,readOnly:true});
	});
});

auth.change(function(){ exports.reload(); });
socket.on("judge.reload",function(data){ if(data.code===codeid) exports.reload(); });