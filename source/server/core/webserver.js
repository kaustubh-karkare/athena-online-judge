
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
	res.cookie("unique",unique);
	res.set("Content-Type","text/html");
	res.send(new Buffer(files["/index.html"],"base64"));
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

var ect = {
	"html":"text/html", "js": "application/x-javascript", "css": "text/css",
	"png": "image/png", "gif": "image/gif", "jpg": "image/jpeg",
};

app.get(/.*/,function(req,res){
	if(req.path in files){
		var ext = req.path.split("."); ext = ext[ext.length-1];
		if(ext in ect) res.set("Content-Type",ect[ext]);
		else res.set("Content-Type","text/plain");
		res.send(new Buffer(files[req.path],"base64"));
	} else res.send(404);
});

io.sockets.on("connection", function(socket){
	socket.data = {}; // Session Data.
	// socket.remote = socket.handshake.address; // remote.address & remote.port
	rpc.process(socket); // Add RPC Handlers
});

var running = false;
exports = {
	"start" : function(cb){
		if(!running){
			running = true;
			server.listen(config.webserver_port || 8080,function(e){ cb(e); });
		} else cb(null);
	},
	"end" : function(cb){
		if(running){
			running = false;
			io.sockets.clients().forEach(function(socket){ socket.disconnect(); });
			server.close(function(e){ cb(e); });
		} else cb(null);
	},
	"socket" : { "broadcast" : function(){ io.sockets.emit.apply(io.sockets,arguments); } }
};
