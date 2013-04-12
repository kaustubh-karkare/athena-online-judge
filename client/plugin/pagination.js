
// TODO : tr highlight and linking to item

exports = function(args){
	if(typeof(args)!=="object") return false;
	if(!(args.collection in schema)) return false;
	var key = schema[args.collection].keys[0];
	if(typeof(args.fields)!=="object" || args.fields===null) args.fields = {};
	if(typeof(args.page)!=="object" || args.page===null){ args.page = {page:1,size:20,sort:key}; }
	if(typeof(args.process)!=="function") args.process = function(item,cb){ cb(null,item?[item[key].htmlentities(),JSON.stringify(item).htmlentities()]:["Key","Value"]); };
	if(typeof(args.newpage)!=="function") args.newpage = misc.nop;

	var top = $("<div>");
	var table = top.append("<table class='table table-striped table-hover'><tbody>").find("tbody");

	var loadpage = function(page){
		args.page.page = page;
		rpc("database.pagination",{$collection:args.collection,$fields:args.fields,$page:args.page},function(error,result){
			if(error){ console.log(error); return; }
			var tr = table.empty().append("<tr>").children().last();
			args.process(null,function(e,r){
				if(!e) tr.append(r.map(function(x){ return $("<th>").append(x); }));
			});
			result.order.forEach(function(i){
				var tr = table.append("<tr>").children().last().click(function(){
					location.hash="#admin/"+args.collection.urlencode()+"/edit/"+result.data[i][key].urlencode();
				});
				args.process(result.data[i],function(e,r){
					if(!e) tr.append(r.map(function(x){ return $("<td>").append(x); }));
				});
			});
			args.newpage(result);
		});
	};

	loadpage(args.page.page);
	return {"node":top,interface:null};
};