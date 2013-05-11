
// TODO : Proper handling of $(window).focus/blur
// TODO : proper handling of Enter Key

exports = function(args){

	if(typeof(args)!=="object" || args===null) args = {};
	args.multiselect = !!args.multiselect;
	if(typeof(args.collection)!=="string") return false;

	var input = $("<input type='text'>");
	var key = schema[args.collection].keys[0];
	var saved = $("<div id='selected'></div>");

	var wrap = function(x){
		return $("<a>").html(String(x[key]).htmlentities()).click(function(){
			$(this).parent().parent().find("a").removeClass("active");
			$(this).addClass("active"); transfer();
		}).attr("data-id",x._id).attr("data-ref",JSON.stringify(x));
	};
	if(args.initial){
		if(!args.multiselect) args.initial = [args.initial];
		args.initial = args.initial.filter(function(x){ return x._id!==0; });
		var flag = true, result = [];
		args.initial.forEach(function(x){
			flag &= ("_id" in x && !isNaN(x._id) && key in x && typeof(x[key])==="string");
			if(flag) result.push("\""+x[key]+"\"");
		});
		// if(!flag) return false;
		input.val(result.join(", "));
		saved.append(args.initial.map(wrap));
	}
	if(typeof(args.filter)!=="object" || args.filter===null) args.filter = {};

	// The following references to DOM elements will be frequently used later
	var popover = "div.popover-content "; // container
	var suggested = popover+"div#suggested "; // suggested items, but not selected
	var selected = popover+"div#selected "; // selected items	

	/*
	Since the blur event is not provided with information regarding what caused it,
	an alternative mechanism is being used to determine if it was a click that caused it,
	and if yes, its location. We do not want blurring to take place if the click was on
	the suggestion (popover) box itself.

	2 Deferred objects (delayed functions) are being used: blur & click.
	If blur is resolved, the suggestion box is hidden, and if rejected, it continues to be
	displayed, with the focus back on the associated input field.
	So, in case of a click inside the suggestion box, blur should be rejected, and in all
	other cases, it should be resolved.
	The suggestion box's mouse-down event therefore rejects the blur. In case of all other
	events that triggered the blurring of the input field, the blur needs to be resolved.
	For that, we wait for a short duration after the input field's blur event, and if the
	blur deferred is not rejected by the above mouse-down event, we resolve it.
	However, the mouse-down event for the suggestion box may be triggered before or after
	the blur-event of the input field. In case mouse-down comes before, the timeout event
	(ie, the short wait duration mentioned above) that would be scheduled to resolve it
	does not exist yet, and so cannot be canceled. And so the rejection is delayed using
	the second deferred object (click) until after the timeout event is scheduled, so that
	it can be properly canceled.

	In case of rejection of the blur deferred (ie, if the focus is to be retained on the
	input), the "data-focus" attribute is being set to "skip" so that the initialization
	operations are not done again unnecessarily.
	*/
	var blur, click, skip = false;
	var show = function(){
		blur = new misc.deferred();
		blur.done(function(){
			input.popover("hide");
			saved = $(selected).detach(); // save selection
			var result = [];
			saved.find("a").each(function(i,x){ result.push("\""+$(x).html()+"\""); });
			input.val(result.join(", "));
		});
		blur.fail(function(){
			window.clearTimeout(blur.timeout); // no need to resolve (hide) anymore
			skip=true; // prevent re-initialization of input field & suggestions
			window.setTimeout(function(){ input.focus(); },0); // since focus cannot be called in a hide event
		});
		click = new misc.deferred();
		if(skip){ skip=false; return; }
		
		input.popover("show");
		$(popover).bind("mousedown",function(){ click.done(function(){ blur.reject(); }); });
		$(window).blur(function window_blur(){ $(window).unbind('blur',window_blur); input.blur(); });

		input.val("").attr("placeholder","Start Typing ...");
		$(selected).replaceWith(saved); // load selections
		oldval = undefined; change(this); // reload suggestions
	};
	var hide = function(){
		blur.timeout = window.setTimeout(function(){ if(blur.state()=="pending") blur.resolve(); },100);
		click.resolve();
	};



	var oldval;
	var change = function(){
		// prevent unnecessary calls
		var newval = input.value; if(newval===undefined) newval = "";
		if(newval===oldval) return; else oldval = newval;
		var aid = $(popover).find("a.active").attr("data-id");
		// build query
		var query = misc.deepcopy(args.filter);
		query["$exclude"] = [];
		query["$collection"] = args.collection;
		if(newval.length>0) query[key] = newval;
		$(selected).children("a").each(function(i,x){ query["$exclude"].push(parseInt($(x).attr("data-id"))); });
		if(query["$exclude"].length===0) delete query["$exclude"];
		// invoke rpc
		rpc("database.suggest",query,function(error,result){
			if(error){ console.log("change",error); return; }
			// ensuring filter
			var re_val = RegExp(RegExp.quote(newval),"i"), exclude = ("$exclude" in query?query["$exclude"]:[]);
			var list = result.order.map(function(x){ return result.data[x]; })
				.filter(function(x){ return x[key].match(re_val)!==null && exclude.indexOf(x._id)===-1; });
			// modifying DOM
			if(list.length>0) $(suggested).empty().append(list.map(wrap));
			else $(suggested).html("<a>No Suggestions</a>");
			// item activation
			$(popover).find("a").removeClass("active");
			$(popover).find("a[data-id="+aid+"]").addClass("active");
			if($(popover).find("a.active").length===0)
				$($(popover).find("a")[0]).addClass("active");
		});
	};
	var move = function(up){
		var current = $(popover).find("a.active").removeClass("active");
		var next = current[up?"prev":"next"]();
		if(next.length==0) next = current.parent().siblings().not("#divider").find("a")[up?"last":"first"]();
		if(next.length==0) next = current.parent().find("a")[up?"last":"first"]();
		next.addClass("active");
	};
	var transfer = function(){ // select or deselect
		var active = $(popover).find("a.active");
		var id = parseInt(active.attr("data-id"));
		if(id===0) return; // TODO : create redirect
		var other = $(active).parent().siblings().not("#divider");
		if($(other).attr("id")=="selected" && $(other).children().length>0 && !args.multiselect)
			$(active).parent().append($(other).children().detach());
		$(other).append($(active).detach());
	};
	var value = function(){
		var data = ($(selected).length===0?saved:$(selected)), result = [];
		data.find("a").each(function(i,x){ try { result.push(JSON.parse($(x).attr("data-ref"))); } catch(e){} });
		return args.multiselect ? result : (result[0]?result[0]:null);
	};

	input.popover({
		"placement":"bottom",
		"trigger":"manual",
		"content":"<div id='suggested'></div><div id='divider'>Selected Item(s)</div><div id='selected'></div>",
		"html":true
	}).keyup(function(event){
		// console.log(event.keyCode);
		if(event.keyCode==undefined) event.keyCode = 13; // default is enter, for when click is used to trigger this
		if(event.keyCode===38 || event.keyCode===40) move(event.keyCode===38?1:0);
		else if(event.keyCode===13) transfer();
		else change();
		// if(event.keyCode==13){ event.preventDefault(); return false; }
	}).focus(function(event){
		show();
	}).blur(function(event){
		hide();
	});

	return {"node":input,"value":value};
};