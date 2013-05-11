
exports = new widget(function(data,callback){
	var form = $("<form id='widget-login'>"), lower, upper, submit;
	if(auth.user===null){
		form.append(upper=$("<input type='text' placeholder='Username'>"));
		form.append(lower=$("<input type='password' placeholder='Password'>"));
		form.append(submit=$("<input type='submit' value='Log In' class='btn'>"));
		form.submit(function(){ auth.login(upper.val(),lower.val()); return false; });
	} else {
		form.append(upper=$("<input type='text' disabled='disabled'>").val(auth.user.username));
		form.append(lower=$("<input type='text' disabled='disabled'>").val(auth.user.realname));
		form.append(submit=$("<input type='submit' value='Log Out' class='btn'>"));
		form.submit(function(){ auth.logout(); return false; });
	}
	callback(null,form);
});

auth.change(function(){ exports.reload(); });