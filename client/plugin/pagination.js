
exports = function(args){
	if(typeof(args)!=="object") return false;
	else args = $.extend(true,{},args);
	var filter = {};

	// either args.rpc needs to be specified or args.collection
	if(typeof(args.rpc)==="string");
	else if(typeof(args.collection)==="string") filter.$collection = args.collection;
	else return false;

	filter.data = args.data;

	// args.page can be used to specify paging infomation
	if(typeof(args.page)!=="object" || args.page===null) args.page = {};
	args.page.number = parseInt(args.page.number); args.page.size = parseInt(args.page.size);
	filter.$page = {
		number: (isNaN(args.page.number) ? 1 : args.page.number),
		size: (isNaN(args.page.size) ? 20 : args.page.size),
		sort: (args.page.sort ? String(args.page.sort) : null)
	};

	if(typeof(args.render)!=="function") args.render = function(item,cb){ cb(null,item?[JSON.stringify(item).htmlentities()]:["Item"]); };
	if(typeof(args.loaded)!=="function") args.loaded = misc.nop; // to be called once the first page is loaded
	if(typeof(args.diffpage)!=="function") args.diffpage = misc.nop; // to be called each time the page changes
	if(typeof(args.click)!=="function") args.click = misc.nop; // to be called each time an item is clicked upon

	var top = $("<div style='text-align:center;'>");
	var table = top.append("<table class='table table-striped table-hover'><tbody>").find("tbody");
	var ul = top.append("<div class='pagination'><ul></ul></div>").find("ul");

	var first = true; // to track args.loaded, which should only be called once

	var loadpage = function(page){
		filter.$page.number = page;
		// the specified rpc must return directly from database.page or at least in that format
		rpc(filter.$collection ? "database.pagination" : args.rpc, filter, function(error,result){
			if(error){ display.error(error); return; }
			var tr = table.empty().append("<tr>").children().last();
			args.render(null,function(e,r){
				if(!e) tr.append(r.map(function(x){ return $("<th>").append(x); }));
			});
			result.order.forEach(function(i){
				var tr = table.append("<tr>").children().last().click(function(event){
					if($(event.target).closest("a").length===0) args.click(result.data[i]);
				});
				args.render(result.data[i],function(e,r){
					if(!e) tr.append(r.map(function(x){ return $("<td>").append(x); }));
				});
			});
			ul.empty();

			var load = function(i){ return function(){ loadpage(i); }; };
			var i = ul.append("<li><a>&laquo;</a></li>").children().last();
			if(result.number===1) i.addClass("disabled"); else i.find("a").click(load(result.number-1));
			for(i=Math.max(1,result.number-5);i<=Math.min(result.total,result.number+5);++i)
				ul.append("<li"+(result.number===i?" class='active'":"")+"><a>"+i+"</a></li>").find("a").last().click(load(i));
			var i = ul.append("<li><a>&raquo;</a></li>").children().last();
			if(result.number===result.total) i.addClass("disabled"); else i.find("a").click(load(result.number+1));

			if(first){ args.loaded(); first = false; }
			args.diffpage(result);
		});
	};

	loadpage(filter.$page.number);
	return {"node":top};
};