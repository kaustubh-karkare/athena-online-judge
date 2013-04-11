
var async = require("async"), fs = require("fs");
fs.fileExists = function(path){ return fs.existsSync(path) && fs.statSync(path).isFile(); };
fs.dirExists = function(path){ return fs.existsSync(path) && fs.statSync(path).isDirectory(); };
fs.fileRead = function(path){ return fs.fileExists(path) ? fs.readFileSync(path).toString() : undefined; };
fs.fileWrite = function(path,data){ return fs.writeFileSync(path, data); };
// #####

var module_loader = function(location,process,done){
	var modules = fs.fileRead(location+"index.txt"), extension = ".js";
	if(modules!==undefined)
		modules = modules.split(/[\n\r]/g)
		.map(function(line){ return line.replace(/\s*#.*$/,""); })
		.filter(function(line){ return line.length>0; })
		.map(function(line){ return line+extension; })
		.filter(function(name){ return fs.fileExists(location+name); });
	else modules = fs.readdirSync(location);
	for(var i=0;i<modules.length;++i) process(modules[i].replace(/\.[^\.]+$/,""),location+modules[i]);
};

var compress = function(str){
	return !false ? str+"\n": str
		.replace(/\/\/[^\n]*/g,"") // remove single line comments
		.replace(/\r/g,"\n").replace(/\n\s*/g,"\n").replace(/\n+/g," ") // remove new lines & indenting
		.replace(/\s*\/\*.*?\*\/\s*/g," ") // remove multiline comments
		.replace(/^\s*/,"").replace(/\s*$/,""); // remove whitespace before & after
};

var code_shared = "", code_server = "", code_client = "";
var smlist = ["test"]; cmlist = ["template","plugin","widget"];
code_server += "var athena = (function(){ var "+smlist.map(function(n){ return n+" = {}"; }).join(", ")+";\n";
code_client += "var athena = (function(){ var "+cmlist.map(function(n){ return n+" = {}"; }).join(", ")+";\n";

String.prototype.addslashes = function(){ return this.replace(/([\\"'])/g, "\\$1").replace(/\0/g, "\\0"); };
var wrapcode = function(path){ return "(function(){var exports={};"+compress(fs.fileRead(path))+"return exports;})();\n"; };
code_server += compress(fs.fileRead(__filename).replace(/#####[\s\S]*/,""))+"\n";

module_loader("shared/",function(name,path){ code_shared+="var "+name+"="+wrapcode(path); cmlist.push(name); smlist.push(name); });
code_server+=code_shared;
code_client+=code_shared;

module_loader("client/template/",function(name,path){ code_client+="template['"+name.addslashes()+"']='"+fs.fileRead(path).replace(/\r/g,"\n").replace(/\n\s*/g,"\n").replace(/\n+/g,"").addslashes()+"';\n"; });
module_loader("client/plugin/",function(name,path){ code_client+="plugin['"+name.addslashes()+"']="+wrapcode(path); });
module_loader("client/widget/",function(name,path){ code_client+="widget['"+name.addslashes()+"']="+wrapcode(path); });
module_loader("client/",function(name,path){ code_client+="var "+name+"="+wrapcode(path); cmlist.push(name); });

module_loader("server/",function(name,path){
	code_server+="var "+name+"="+wrapcode(path); smlist.push(name);
	if(name=="rpc") module_loader("server/rpc/",function(name,path){ code_server+=wrapcode(path); });
});

code_server += "return {"+smlist.map(function(n){ return "\""+n+"\":"+n; }).join(", ")+"}; })();";
code_client += "return {"+cmlist.map(function(n){ return "\""+n+"\":"+n; }).join(", ")+"}; })();";

fs.fileWrite("main/server.js",code_server);
fs.fileWrite("main/client.js",code_client);
require("./main/server.js");