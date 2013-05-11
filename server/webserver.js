
var http = require("http");
var express = require("express");
var socketio = require("socket.io");

var app = express();
var server = http.createServer(app);
var io = socketio.listen(server,{log:false});

var last_unique = (new Date).getTime();
app.get(/^\/$/,function(req,res){
	var unique = (new Date).getTime();
	if(unique==last_unique) unique++;
	last_unique = unique;
	
	var html = ["<!doctype html><html><head>"];
	html.push("<title>Athena Online Judge</title>");
	html.push("<script>var unique = "+(++unique)+";</script>");
	html.push(fs.fileRead("./client/template/page-headers.html"));
	html.push("<script src='client.js'></script>");
	html.push("</head><body onLoad='main()'></body></html>");
	res.send(html.join("\n"));
});

app.get(/^\/download$/, function(req,res){
	var first = true;
	rpc.emit("file.download",null,{
		"id": String(req.query.id),
		"send": function(file,data){
			if(first){
				first = false;
				res.set("Content-Type","application/force-download");
				res.set("Content-Disposition","attachment; filename= \""+String(req.query.name).quotes()+"\"");
				res.set("Content-Length",file.size);
				res.set("Content-Transfer-Encoding","binary");
			}
			res.write(data);
		}
	}, function(e){
		if(e) res.end("File Download Error : "+e.stack); else res.end();
	});
});

app.get(/.*/,function(req,res){
	path = "./static"+req.path;
	if(req.path.indexOf("/code")===0) path = "."+req.path.substr(5);
	if(fs.fileExists(path)) res.sendfile(path);
	else res.send(404);
});

//app.get(/.*/,function(req,res){ res.send(404); });

io.sockets.on("connection", function(socket){
	socket.data = {}; // Session Data.
	socket.remote = socket.handshake.address; // remote.address & remote.port
	rpc.process(socket); // Add RPC Handlers
	// socket.on("disconnect",function(socket){}(socket));
});

exports = {
	"start" : function(cb){ server.listen(8080,function(e){ cb(e); }); },
	"end" : function(cb){ server.close(function(e){ cb(e); });  },
	"socket" : { "broadcast" : function(){ io.sockets.emit.apply(io.sockets,arguments); } }
};