
exports = function(args){
	if(typeof(args)!=="object" || args===null) return false;
	if(typeof(args.options)!=="object" || args.options===null) return false;
	args.initial = String(args.initial);
	if(Object.keys(args.options).indexOf(args.initial)===-1) return false;

	var value, dd = $("<div class='dropdown input-append'>");
	var input = dd.append("<input type='text' readonly='readonly' style='width:183px;cursor:pointer' data-toggle='dropdown'>").children().last();
	dd.append("<a class='btn dropdown-toggle' title='Change' data-toggle='dropdown' style='width:14px; padding:4px; border-radius:0px 4px 4px 0px;'><i class='caret'></i></a>");
	dd.append("<ul class='dropdown-menu'></ul></div>");
	var ul = dd.children("ul");
	for(var key in args.options) ul.append("<li><a data-value='"+key+"'>"+key+" : "+args.options[key]+"</a></li>");
	ul.find("a").click(function(){
		$(this).addClass("active").parent().siblings().children().removeClass("active");
		input.val((value=$(this).attr("data-value"))+" : "+args.options[value]);
	});
	ul.find("a[data-value="+args.initial+"]").click();

	return {node:dd[0],value:function(){ return String(value); }}
};