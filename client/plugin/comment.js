
var replyoffset = 40;

var input = function(interface,location,replyto){
	return $("<div style='width:100%; text-align:left;'>").append([
		$("<a style='vertical-align:top; font-weight:bold;' href='"+["user",auth.user.username].hash()+"'>"+auth.user.realname.htmlentities()+"</a>"),
		" ",
		$("<textarea>").keyup(function(event){
			if(event.keyCode!==13 || event.shiftKey || this.value.trim().length===0) return;
			rpc("comment.insert",{"replyto":replyto===null?null:{"_id":replyto},"location":location,"message":this.value},function(e){
				if(!e) interface.reload(); else display.error(e);
			});
			event.stopPropagation()
		}).autosize()
	]);
};

var format = function(interface,comment){
	var r1, r2;
	var r3 = $("<div style='"+(comment.replyto===null?"padding-bottom:4px; border-bottom:1px solid #ddd; margin-bottom:4px;":"margin-left: "+replyoffset+"px;")+"'>").append(
		$("<div class='comment-body'>").append([
			$("<a style='font-weight:bold;' href='"+["user",comment.user.username].hash()+"'>"+comment.user.realname.htmlentities()+"</a>"),
			" ",
			comment.message.htmlentities()
		]),
		$("<div style='color:#999; font-size:11px;'>").append([datetime.abs(comment.time)].concat( auth.user===null ? [] : [
			" &middot; ",
			r1 = $("<a class='reply'>Reply</a>")
		]).concat( auth.level<constant.adminlevel || comment.replyto!==null ? [] : [
			" &middot; ",
			$("<a>"+schema.comment.access.options[comment.access]+"</a>").click(function(){
				rpc("comment.access",{"_id":comment._id,"access":comment.access==="0"?"1":"0"},function(e){ if(!e) interface.reload(); else display.error(e); });
			})
		]).concat( auth.level<constant.adminlevel && (auth.user===null || auth.user._id!==comment.user._id ) ? [] : [
			" &middot; ",
			$("<a>Delete</a>").click(function(){
				if(confirm("Are you sure you want to delete this comment?")) rpc("comment.delete",{"_id":comment._id},function(e){ if(!e) interface.reload(); else display.error(e); });
			})
		])),
		$("<div>").append(
			comment.replies && comment.replies.length>0 ? comment.replies.map(function(c){ return format(interface,c); }) : []
		).append(
			comment.replyto===null && auth.user ? [r2 = input(interface,comment.location,comment._id)] : []
		)
	);
	r2 && r2.css("margin-left",replyoffset);
	comment.replyto===null && r3.find("a.reply").click(function(){ r2.stop().slideToggle(250); });
	return r3[0];
};

var ta_width =function(t){
	t = $(t).width("100%");
	var w = t.width()-t.prev().width()-18;
	t.css({"width":w,"min-width":w,"max-width":w});
};

exports = function(args){
	if(typeof(args)!=="object") return false;
	if(typeof(args.location)!=="string") args.location = "";
	var top = $("<div>"), interface = {};
	top.append("<div class='well well-small'>");

	interface.reload = function(){
		rpc("comment.load", args.location, function(error,result){
			if(error) return;
			result.sort(function(a,b){ return a.time-b.time; });
			top.children().last().empty().append(result.map(function(c){ return format(interface,c); })).append(
				auth.user!==null ? input(interface,args.location,null) :
				$("<div class='comment-info'>You need to be logged in to be able to post comments.</div>")
			);
			if(auth.user!==null) {
				ta_width(top.find("textarea").slice(-1));
				top.find("textarea").slice(0,-1).parent().each(function(i,e){ e = $(e);
					e.width("100%");
					e.width(e.width()-parseFloat(e.css("margin-left")));
					ta_width(e.children("textarea")[0]);
					e.hide();
				});
			}
		}); // rpc
	}; // reload

	auth.change(function ac(l2,l1){
		if(top.closest("html").length===0) auth.off(ac); // if detached
		else if((!l1)^(!l2)) interface.reload();
	});

	window.setTimeout(function(){ interface.reload(); },0);

	return {"node":top[0],"interface":interface};
};