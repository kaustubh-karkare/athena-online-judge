
var month = "January,February,March,April,May,June,July,August,September,October,November,December".split(",");
var days = "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday";

var datetime = exports = {
	format : function(time,how){
		var d = new Date(t);
		return how.replace(/[A-Za-z]/g,function(c){
			if(c==="d") return ("0"+d.getDate()).slice(-2);
			else if(c==="D") return days[d.getDay()].substr(0,3);
			else return c; // incomplete
		});
	},
	abs : function(t){
		var d = (t===undefined?new Date():new Date(t));
		return d.getFullYear()+" "+month[d.getMonth()]+" "+d.getDate()+", "+
			("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);
	},
	now : function(){ // must be appended to DOM tree immediately
		var s = $("<span>").html(datetime.abs());
		var t = setInterval(function(){
			if(s.closest("html").length===0) clearInterval(t);
			else s.html(datetime.abs());
		},1000);
		return s;
	}
};