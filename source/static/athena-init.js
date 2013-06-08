(function(){

	var head = document.getElementsByTagName("head")[0] || document.documentElement;

	var add2head = function(tag,attr,before){
		var element = document.createElement(tag);
		for(var key in attr) element[key] = attr[key];
		if(before) head.insertBefore(element,head.firstChild);
		else head.appendChild(element);
		return element;
	};

	window.load = {};

	load.js = function(){
		var queue = [];
		var actual = function(url,callback){
			// Based on http://stackoverflow.com/a/4845802/903585
			var script, done = false, process = function() {
				if( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
					done = true;
					script.onload = script.onreadystatechange = null;
					if ( head && script.parentNode ) head.removeChild( script );
					callback();
			    }
			};
			script = add2head("script",{"src":url,"onload":process,"onreadystatechange":process},true);
		};
		var callback = function(){
			if(queue.length){
				actual(queue[0][0],function(){
					if(typeof(queue[0][1])==="function") queue[0][1]();
					queue.shift();
					callback();
				});
			}
		};
		return function(url,cb){
			queue.push([url,cb]);
			if(queue.length===1) callback();
		}
	}();

	load.css = function(url){ add2head("link",{"rel":"stylesheet","media":"screen","href":url}); };

	add2head("link",{"rel":"shortcut icon","href":"abstergo-industries-logo.png"});

	load.js("socket.io/socket.io.js");
	load.js("js/cookie.js");

	load.js("js/jquery-1.9.0.min.js");
	load.js("js/jquery-ui-1.10.0.min.js");
	load.js("js/jquery.autosize.js");

	load.css("css/bootstrap.min.css");
	load.js("js/bootstrap.min.js");

	load.js("js/async.min.js");

	load.js("js/showdown.js");

	load.css("css/codemirror.css");
	load.js("js/codemirror.js");
	load.js("js/codemirror.loadmode.js");

	load.css("css/custom.css");

	load.js("athena-client.js",function(){ athena.main(); });

})();