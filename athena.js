
var async = require("async"), fs = require("fs");
fs.fileExists = function(path){ return fs.existsSync(path) && fs.statSync(path).isFile(); };
fs.dirExists = function(path){ return fs.existsSync(path) && fs.statSync(path).isDirectory(); };
fs.fileRead = function(path){ return fs.fileExists(path) ? fs.readFileSync(path).toString() : undefined; };
fs.fileWrite = function(path,data){ return fs.writeFileSync(path, data); };
// #####

var code = { shared:"", server:"", client:"" };
var list = { shared:[], server:[], client:[] };

var compress = function(str){
	return !false ? str+"\n": str
		.replace(/\/\/[^\n]*/g,"") // remove single line comments
		.replace(/\r/g,"\n").replace(/\n\s*/g,"\n").replace(/\n+/g," ") // remove new lines & indenting
		.replace(/\s*\/\*.*?\*\/\s*/g," ") // remove multiline comments
		.replace(/^\s*/,"").replace(/\s*$/,""); // remove whitespace before & after
};

String.prototype.addslashes = function(){ return this.replace(/([\\"'])/g, "\\$1").replace(/\0/g, "\\0"); };
var wrapcode = function(path){ return "(function(){var exports={};"+compress(fs.fileRead(path))+"return exports;})();\n"; };
code.server += compress(fs.fileRead(__filename).replace(/#####[\s\S]*/,""))+"\n";

var module_lister = function(location,process){
	var index = "index.txt", extension = ".js";
	var modules = fs.fileRead(location+index);
	if(modules!==undefined) modules = modules.split(/[\n\r]/g)
		.map(function(line){ return line.replace(/\s*#.*$/,""); })
		.filter(function(line){ return line.length>0; })
		.map(function(name){ return name+extension; });
	else modules = fs.readdirSync(location);
	for(var i=0;i<modules.length;++i)
		try { process(location+modules[i]); } catch(e){ console.log(e.stack); }
};

list.client.push("template");
code.client+="var template = {};\n";
module_lister("client/template/",function(path){
	var name = path.match(/([^\/]+)\.[^\.]+$/,"")[1];
	code.client+="template[\""+name.addslashes()+"\"] = \""+fs.fileRead(path).replace(/\r?\n\s*/g,"").addslashes()+"\";\n";
});

var module_loader = function(target){
	module_lister(target+"/",function(path){
		var name = path.match(/([^\/]+)\.[^\.]+$/,"")[1];
		list[target].push(name);
		if(fs.fileExists(path)) code[target]+="var "+name+"="+wrapcode(path);
		else code[target]+="var "+name+"={};\n"
		path = target+"/"+name+"/";
		if(fs.dirExists(path)) module_lister(path,function(path2){
			var name2 = path2.match(/([^\/]+)\.[^\.]+$/,"")[1];
			code[target]+=name+"[\""+name2.addslashes()+"\"]="+wrapcode(path2);
		});
	});
};

module_loader("shared");
module_loader("client");
module_loader("server");

["client","server"].forEach(function(target){
	code[target] = "var athena = (function(){\n" + code.shared + code[target] + "return {" +
		list.shared.concat(list[target]).map(function(n){ return "\""+n+"\":"+n; }).join(", ") +
		"}; })();";
	fs.fileWrite("static/"+target+".js",code[target]);
});

require("./static/server.js");