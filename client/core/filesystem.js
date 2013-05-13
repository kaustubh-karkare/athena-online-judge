var filesystem = exports = {};

var toolarge = 100*1024;
var blocksize = 100*1024;

filesystem.load = function(file,callback){
	var fileReader = new FileReader();
	if(file.size>toolarge){ callback("file.too-large"); return; }
	fileReader.onload = function(event){ callback(null,event.target.result); };
	fileReader.readAsBinaryString(file);
};

/*
The stream function takes 3 arguments:
	file = the actual file object from the file input.
	next = the function to be called each time a new block of data is available
		args : offset (integer), data (string), callback (to initiate next block read)
	callback = the function to be called when the process is complete
		args : error (if null, the file has been read completely)
*/
filesystem.stream = function(file,next,callback){
	var fileReader = new FileReader(), offset = 0, length = 0;
	var running = true, paused = false;
	var interface = {
		"cancel": function(){ running = false; },
		"pause": function(){ paused = true; },
		"resume": function(){
			var restart = paused; paused = false;
			if(restart) step(null);
		}
	};
	var step = function(error){
		if(error){ step=misc.nop; callback(error); return; }
		if(!running){ step=misc.nop; callback("cancel"); return; }
		if(paused) return;
		offset += length;
		length = Math.min(file.size-offset,blocksize);
		if(length===0){ step=misc.nop; callback(null); return; }
		fileReader.onload = function(event){ next(offset,event.target.result,step); };
		fileReader.readAsBinaryString(file.slice(offset,offset+length));
	};
	step(null);
	return interface;
};