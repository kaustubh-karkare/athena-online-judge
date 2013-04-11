
window.main = function(){
	leader.start();
	display.reload();
	var reload = function(e){ if(e) console.log(e); else window.location.reload(); };
	rpc("user.select",{},function(e,r){
		$(document.body).append( plugin.generateform({
			name:"user",
			spec:schema.user,
			data:(r.length?r[0]:undefined),
			submit:function(data){ console.log(data); }
		}) );
	});
};

/*
rpc("user.create",{"username":"dog","password":"bark","email":"dog@bark.com","realname":"Sir Barksmith the 3rd","groups":[]},misc.echo);
*/

