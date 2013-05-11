
window.main = function(){
	var flag = true;
	socket.on("connect",function(){
		auth.autologin(function(){
			if(!flag) return; else flag = false;
			display.load(); // should be called only once
		});
	});
	leader.start(); // => socket.connect => display.load
};