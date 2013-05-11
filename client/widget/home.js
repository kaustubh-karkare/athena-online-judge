
exports = new widget(function(data,callback){
	var top = $("<div>");
	top.append("<legend>Athena Online Judge</legend>");
	top.append("<p>Programming Contest Control System</p>");
	callback(null,top[0]);
});