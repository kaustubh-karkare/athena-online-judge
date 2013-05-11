
exports = new page(function(data,callback){
	if(auth.level) callback("redirect","#contests");
	else callback("load","user");
},0);