
if(typeof(config.database)!=="object") config.database = {};
if(config.database.host===undefined) config.database.host = "127.0.0.1";
if(config.database.port===undefined) config.database.port = 27017;
if(config.database.name===undefined) config.database.name = "athena";
if(config.database.prefix===undefined) config.database.prefix = "athena_";

var mongodb = require("mongodb");
var server = new mongodb.Server(config.database.host, config.database.port, {});
var db = exports = new mongodb.Db(config.database.name, server, {w:1});

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
db.disconenct = function(cb){
	db.close(function(e){ cb(e); });
};
db.ready = function(name){
	return [
		function(cb){ delay.done(cb); },
		function(cb){
			if(name===undefined) cb(null);
			else db.collection(config.database.prefix+name,cb);
		}
	];
};

db.ObjectID = mongodb.ObjectID;
db.GridStore = mongodb.GridStore;