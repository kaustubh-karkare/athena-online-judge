
var npm_check = function(list,load){
	list.forEach(function(name){
		try { if(load) global[name] = require(name); else require.resolve(name); }
		catch(e){ console.log("Module Missing : "+name); process.exit(1); }
	});
};

npm_check(["fs","jsmin","cssmin"],true);

fs.fileExists = function(path){ return fs.existsSync(path) && fs.statSync(path).isFile(); };
fs.dirExists = function(path){ return fs.existsSync(path) && fs.statSync(path).isDirectory(); };
fs.fileRead = function(path){ return fs.fileExists(path) ? fs.readFileSync(path).toString() : undefined; };
fs.fileWrite = function(path,data){ return fs.writeFileSync(path, data); };

String.prototype.addslashes = function(){ return this.replace(/([\\"'])/g, "\\$1").replace(/\0/g, "\\0"); };
String.prototype.endswith = function(x){ return this.substr(-x.length)===x; };

var compress = function(str){ return jsmin.jsmin(str,3).replace(/^\s*/,"").replace(/\s*$/,""); };

var code, list;

var filelister = function(location,process){
	var index = "index.txt", extension = ".js";
	var modules = fs.fileRead(location+index);
	if(modules!==undefined) modules = modules.split(/[\n\r]/g)
		.map(function(line){ return line.replace(/\s*#.*$/,""); })
		.filter(function(line){ return line.length>0; })
		.map(function(name){ return name+extension; });
	else modules = fs.readdirSync(location);
	for(var i=0;i<modules.length;++i)
		try {
			var path = location+modules[i], name = path.match(/([^\/]+)\.[^\.]+$/,"")[1];
			process(name, path);
		} catch(e){ console.log(e.stack); }
};

var wrapcode = function(path){
	return "(function(){var exports={};\n"+fs.fileRead(path)+"\nreturn exports;})();\n";
};

var module_loader = function(path_prefix,target){
	filelister(path_prefix+"/"+target+"/core/",function(name,path){
		list[target].push(name);
		if(fs.fileExists(path)) code[target]+="var "+name+"="+wrapcode(path);
		else code[target]+="var "+name+"={};"
		path = path_prefix+"/"+target+"/"+name+"/";
		if(fs.dirExists(path)) filelister(path,function(name2,path2){
			code[target]+=name+"[\""+name2.addslashes()+"\"]="+wrapcode(path2);
		});
	});
};

var scan = function(){
	var tree = {}, _scan = function(path1,path2){
		if(!fs.existsSync(path2)) return; else var stats = fs.statSync(path2);
		if(stats.isFile()){
			var data = fs.readFileSync(path2);
			if(path2.endswith("js")) data = new Buffer(compress(data.toString()));
			if(path2.endswith("css")) data = new Buffer(cssmin(data.toString()));
			tree[path1] = data.toString("base64");
		}
		if(stats.isDirectory()) fs.readdirSync(path2).forEach(function(x){ return _scan(path1+"/"+x,path2+"/"+x); });
	};
	return function(path1,path2){ tree = {}; _scan(path1,path2); return tree; };
}();

var pad_start = "var athena = (function(){";
var pad_end = function(target){
	return "return {" +
		list.shared.concat(list[target]).map(function(n){ return "\""+n+"\":"+n; }).join(", ") +
		"}; })();";
};

var minify = function(minifile,config){

	console.log("Started Minification ...");

	// Default Settings
	minifile = minifile || "./athena.min.js";

	code = { shared:"", server:"", client:"" };
	list = { shared:[], server:[], client:[] };

	// Internal Modules
	module_loader(__dirname,"shared");
	module_loader(__dirname,"client");
	module_loader(__dirname,"server");

	// Static Files
	var tree = scan("",__dirname+"/static");
	tree["/athena-client.js"] = new Buffer( pad_start + code.shared + code.client + pad_end("client") ).toString("base64");
	var files ="var files = "+JSON.stringify(tree)+";";
	list.server.push("files");

	// Ensure existance of external node modules
	var modules = code.server.match(/require\([\'\"]([A-Za-z0-9._]+)[\'\"]\)/g).map(function(x){ return x.slice(9,-2); });
	var npm = compress("("+npm_check.toString()+")("+JSON.stringify(modules)+");");

	// Write Minified File to FS
	code.server = "#!/usr/bin/env node\n" + 
		compress( npm + pad_start + files + code.shared + code.server + pad_end("server") );
	fs.fileWrite(minifile,code.server);

	console.log("Minification Complete.");

	return minifile;
};

module.exports = exports = { "minify" : minify };
