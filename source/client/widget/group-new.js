
exports = new widget(function(data,callback){
	if(auth.user===null) callback("redirect","#groups");
	else callback("load","group");
},0);