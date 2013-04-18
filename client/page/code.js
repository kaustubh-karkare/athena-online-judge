
exports = new page(function(data,callback){
	var path = data.path;
	async.parallel({
		"contest": function(cb){ rpc("contest.display",path[1],cb); },
		"problem": function(cb){ rpc("problem.display",path[3],cb); },
		"code": function(cb){ rpc("code.display",parseInt(path[5]),cb); }
	}, function(error,result){
		if(error){ callback(error); return; }
		var heading = $("<legend style='width:760px;padding:10px;'><a href='"+path.slice(0,2).hash()+"'>"+result.contest.name.htmlentities()+"</a> / <a href='"+path.slice(0,4).hash()+"'>"+result.problem.name.htmlentities()+"</a> / Code Submission<span class='pull-right'><a class='btn' href='"+path.slice(0,4).concat("submissions").hash()+"'>Other Submissions</a></span></legend>");
		var code = $("<textarea></textarea>"); code[0].value = result.code.code;
		callback(null,$("<div>").append([heading,code]));
		// CodeMirror requires access to the parent attribute, which will only be defined now.
		CodeMirror.fromTextArea(code[0],{mode:CodeMirror.loadMode(result.code.language.name),lineNumbers:true,readOnly:true});
	});
});