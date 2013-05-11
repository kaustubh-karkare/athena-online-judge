
exports = new page(function(data,callback){
	var path = data.path, past, future;
	var render = function(item,cb){ cb(null,item===null?["Contest Name","Timings"]:[item.name,[datetime.abs(item.start)," to<br>",datetime.abs(item.end)]]); }
	var click = function(item){ location.hash = ["contest",item.name].hash(); };
	var spec = { "rpc":"contest.list", "page":{"size":10}, "render": render, "click": click };
	async.parallel([
		function(cb){ spec.data="past"; spec.loaded=cb; past = plugin.pagination(spec); },
		function(cb){ spec.data="future"; spec.loaded=cb; future = plugin.pagination(spec); }
	], function(error,result){
		if(error){ callback(error); return; }
		var top = $("<div>").append([
			$("<div class='half'>").append(["<legend>Past Contests",past.node]),
			$("<div class='half'>").append(["<legend>Ongoing/Upcoming Contests",future.node]),
			$("<div class='full'>").append([
				"<legend>Comments</legend>",
				plugin.comment({"location":"C0"}).node
			])
		]);
		callback(null,top[0]);
	});
});