
itc.on("reload",function(){
	var fn = arguments.callee;
	$.ajax({
		type: "HEAD",
		url: document.location,
		success: function(){ window.location.reload(); },
		error: function(){ setTimeout(fn,1000); }
	});
});

window.main = function(){
	var skip = true;
	socket.on("connect",function(){
		if(skip) skip = false; else itc.broadcast("reload"); // debug
		auth.autologin();
	});
	auth.autologin(function(){ display.load(); });
	if(unique!==null) leader.start();
};
