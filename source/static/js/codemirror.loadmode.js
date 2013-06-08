
CodeMirror.loadMode = function(){
	var source = {
		"clike":{"C":"text/x-c","C++":"text/x-c++src","Java":"text/x-java","C#":"text/x-csharp"},
		"javascript":{"JavaScript":"text/javascript"},
		"python":{"Python":"text/x-python"},
		"markdown":{"Markdown":"text/x-markdown"}
	};
	return function(name){
		var result = "text/plain", done = false;
		Object.keys(source).forEach(function(mode){
			if(done || source[mode][name]===undefined) return;
			if(mode==="markdown" && CodeMirror.mimeModes["xml"]===undefined) load.js("js/codemirror/xml.js");
			if(CodeMirror.mimeModes[mode]===undefined) load.js("js/codemirror/"+mode+".js");
			result = source[mode][name]; done = true;
		});
		return result;
	};
}();