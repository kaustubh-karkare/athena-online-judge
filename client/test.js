
window.main = function(){
	leader.start();
	auth.autologin(function(){ display.load(); });
};