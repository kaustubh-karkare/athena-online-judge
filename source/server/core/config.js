
var option = function(){
	var cache = {};
	return function(x,read){
		if(x in cache) return cache[x];
		var index = process.argv.indexOf("--"+x);
		if(index===-1) return null;
		read = process.argv.splice(index+1, typeof(read)==="number" ? parseInt(read) : 0 );
		return cache[x] = read.slice(0, (
			limit = read.length,
			read.forEach(function(x,i){ if(limit===read.length && x.substr(0,2)==="--") limit = i }),
			limit
		) );
	};
}();

var path = option("config",1);
if(path===null || path.length===0) path = "athena.config.js";

var config = {}, jsmin = require("jsmin");

if(fs.existsSync(path) && fs.statSync(path).isFile()){
	try {
		config = JSON.parse( jsmin.jsmin( fs.readFileSync(path).toString() ) ) || {};
		console.log("Configuration: "+path);
	} catch(e){ console.log("Configuration file ignored due to errors."); }
}

config.operation = {};
var flag = false, operations = "integrity,evaluator,webserver".split(",");
process.argv.replace("--web","--webserver").replace("--judge","--evaluator");
operations.forEach(function(x){	if( config.operation[x]=option(x) ) flag = true; });
if(!flag){ console.log("Error : No Operation Specified."); process.exit(); }

exports = config;
