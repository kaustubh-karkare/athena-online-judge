
exports = new page(function(data,callback){
	var path = data.path;
	async.series([
		function(cb){ rpc("contest.display",path[1],cb); }
	], function(error,result){
		if(error){ callback(error); return; }
		var contest = result[0], top = $("<div>").append([
			$("<legend style='width:760px;padding:10px;'>"+contest.name.htmlentities()+
				"<span class='pull-right'><a class='btn' href='#contests'>Contests Index</a></span></legend>"
			),
			$("<div class='half'>").append("<table class='table'><tbody>"+
				"<tr><th>Start Time</th><td>"+misc.datetime.abs(contest.start)+"</td></tr>"+
				"<tr><th>End Time</th><td>"+misc.datetime.abs(contest.end)+"</td></tr>"+
				"<tr><th>Ranking Scheme</th><td>"+(contest.ranking?contest.ranking.name.htmlentities():"Individual")+"</td></tr>"+
				"<tr><th>Allowed Groups</th><td>"+(contest.groups.length===0?"No Restrictions":"<ul>"+contest.groups.map(function(g){
					return "<li>"+g.name.htmlentities()+"</li>";
				})+"</ul>")+"</td></tr>"+
				"</tbody></table>"
			),
			$("<div class='half'>").append(contest.problems.map(function(p){
				return $("<a href='#contest/"+contest.name.urlencode()+"/problem/"+p.name.urlencode()+"'>"+
					"<div class='well well-small' style='cursor:pointer;'>"+p.name.htmlentities()+"</div></a>");
				})
			)
		]);
		callback(null,top);
	});
});