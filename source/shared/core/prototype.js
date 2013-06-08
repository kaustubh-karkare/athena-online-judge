
Array.prototype.replace = function(x,y){
	for(var i=0;i<this.length;++i)
		if(this[i]===x) this[i] = y;
	return this;
};
Array.prototype.remove = function(that){
	if(Array.isArray(that)){ for(i=0;i<this.length;++i) if(that.indexOf(this[i])!==-1) this.splice(i--,1); }
	else { for(i=0;i<this.length;++i) if(this[i]===that) this.splice(i--,1); }
	return this;
};
Array.prototype.uniquify = function(){
	var result = [];
	for(var i=0;i<this.length;++i)
		if(result.indexOf(this[i])==-1) result.push(this[i]);
	return result;
};
Array.prototype.intersect = function(that){
	var result = [];
	for(var i=0;i<this.length;++i)
		if(that.indexOf(this[i])!=-1) result.push(this[i]);
	return result;
};

String.prototype.addslashes = function(){ return this.replace(/([\\"'])/g, "\\$1").replace(/\0/g, "\\0"); };
String.prototype.htmlentities = function(){ return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
String.prototype.quotes = function(){ return this.replace(/"/g, '&#34;').replace(/'/g, '&#39;').replace("/",'&#47;').replace("\\",'&#92;'); };
String.prototype.urlencode = function(){ return encodeURIComponent(this).replace("/","%2F").replace(/'/g,"%27"); };
String.prototype.repeat = function(num){ return new Array( num + 1 ).join( this ); };
String.prototype.ucwords = function(){ return this.replace(/^(\S)|\s+(\S)/g,function($1){return $1.toUpperCase();}); };

RegExp.quote = function(str){ return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1"); };

Array.prototype.hash = function(){ return "#"+this.map(function(x){ return (""+x).urlencode(); }).join("/"); };
