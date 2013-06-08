#!/usr/bin/env node

var source = "./source/"; // directory containing the sourcecode

// Remove "node" & __filename from process.argv
process.argv = process.argv.slice(2);

// Parse command line options
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

process.chdir(__dirname);

if(option("loop")){
	var nodemon = require.resolve("nodemon"); // path to the nodemon script
	require("child_process").fork(nodemon,["--watch",source,__filename].concat(process.argv));
} else {
	var minifile = require(source+"minifier.js").minify();
	if(option("run")) require(minifile);
}
