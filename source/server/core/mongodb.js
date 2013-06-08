
var mongodb = require("mongodb");
var server = new mongodb.Server(config.database_host || "127.0.0.1", config.database_port || 27017, {});
var db = exports = new mongodb.Db(config.database_name || "athena", server, {w:1});
config.database_prefix = config.database_prefix || "athena_";

var delay = new misc.deferred();
delay.fail(function(){
	console.log("Database Connection Error :",arguments);
});
db.connect = function(cb){
	db.open(function(e){
		delay[e===null?"resolve":"reject"]();
		cb(e);
	});
};
db.disconnect = function(cb){
	db.close(function(e){ cb(e); });
};
db.ready = function(name){
	return [
		function(cb){ delay.done(cb); },
		function(cb){
			if(name===undefined) cb(null);
			else db.collection(config.database_prefix+name,cb);
		}
	];
};

db.ObjectID = mongodb.ObjectID;
db.GridStore = mongodb.GridStore;
