
exports = new page(function(data,callback){
	if(data.path[2]==="problem" && data.path[3]!==undefined){ callback("load","problem"); return; }
	if(data.path[2]!==undefined && data.path[2]!=="submissions"){ callback("redirect",data.path.slice(0,2).hash()); return; }
	async.series([
		function(cb){ rpc("contest.display",data.path[1],cb); }
	], function(error,result){
		if(error){ callback(error); return; }
		var contest = result[0];
		var legend = $("<legend style='width:760px;padding:10px;'>"+contest.name.htmlentities()+"</legend>");
		legend.append($("<span class='pull-right'>").append([
			"<a class='btn' href='#contests'>Contests Index</a> ",
			"<a class='btn"+(data.path[2]===undefined?" btn-primary":"")+"' href='"+data.path.slice(0,2).hash()+"'>Contests Details</a> ",
			"<a class='btn"+(data.path[2]==="submissions"?" btn-primary":"")+"' href='"+data.path.slice(0,2).concat("submissions").hash()+"'>Contests Submissions</a> "
		]));
		var top = $("<div>").append(legend);
		if(data.path[2]===undefined) top.append([
			$("<div class='half'>").append("<table class='table'><tbody>"+
				"<tr><th>Start Time</th><td>"+datetime.abs(contest.start)+"</td></tr>"+
				"<tr><th>End Time</th><td>"+datetime.abs(contest.end)+"</td></tr>"+
				"<tr><th>Ranking Scheme</th><td>"+(contest.ranking?contest.ranking.name.htmlentities():"Individual")+"</td></tr>"+
				"<tr><th>Allowed Groups</th><td>"+(contest.groups.length===0?"No Restrictions":"<ul>"+contest.groups.map(function(g){
					return "<li>"+g.name.htmlentities()+"</li>";
				})+"</ul>")+"</td></tr>"+
				"</tbody></table>"
			),
			$("<div class='half'>").append(contest.problems.map(function(p){
				return $("<a href='#contest/"+contest.name.urlencode()+"/problem/"+p.problem.name.urlencode()+"'>"+
					"<div class='well well-small' style='cursor:pointer;'>"+p.problem.name.htmlentities()+"</div></a>");
				})
			),
			$("<div class='full'>").append([
				"<legend>Comments</legend>",
				plugin.comment({"location":"C"+contest._id}).node
			])
		]); else top.append([ // submissions
			plugin.pagination({
				"rpc":"code.list",
				"page":{"size":25},
				"data":{"contest":contest._id},
				"render":function(item,cb){ cb(null,item===null?["Code ID","User","Problem","Language","Result"]:
					[
						item._id,
						"<a href='"+["user",item.user.username].hash()+"'>"+item.user.realname.htmlentities()+"</a>",
						"<a href='"+data.path.slice(0,2).concat("problem",item.problem.name).hash()+"'>"+item.problem.name.htmlentities()+"</a>",
						item.language.name.htmlentities(),
						schema.code.items.result.options[item.result]
					]); },
				"click": function(item){ location.hash = data.path.slice(0,2).concat("problem",item.problem.name,"code",item._id).hash(); }
			}).node
		]);
		callback(null,top[0]);
	});
});