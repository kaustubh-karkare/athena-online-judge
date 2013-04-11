
var prefix = "leader/"; // Prefix for all Leader Management Event names.
var timeout = 2*1000; // This is the amount of time for which a tab waits between leader checks.
var frequency = 2; // The number of times a heartbeat must be emitted in a timeout duration, at least 2.
var status = false; // Boolean value indicating whether or not this tab is currently the leader.
var process = {}; // Object containing various processes
var expire; // Pointer to the current timeout event
var previous = "stop"; // Last event emitted.
var log = false;

var leader = exports = misc.emitter();

// What to do when the leader's heartbeats timeout.
var leader_expire = function(){
	// Challenge the leader, call for election, nominating yourself.
	itc.emit(prefix+"new",unique);
	// If there is no response for a while and no one defeated you, elect yourself and connect.
	expire = window.setTimeout(function(){
		status = true;
		if(log) console.log("[leader] true");
		leader.emit(previous="start");
		itc.emit(prefix+"set",unique);
	},timeout);
};
var leader_set = function(data){
	status = false;
	// Somebody else is the leader. Show your loyalty by ensuring disconnection.
	if(previous!="stop"){
		if(log) console.log("[leader] false");
		leader.emit(previous="stop");
	}
	// Wait for sometime before challenging your leader. You are an infidel.
	window.clearTimeout(expire);
	expire = window.setTimeout(leader_expire,timeout);
};
var leader_get = function(data){
	// You are already a leader, so you must reassert yourself to the infidels.
	if(status) itc.emit(prefix+"new",unique);
	// You recognize that someone else deserves to be the leader more than you, and step back.
	else if(data<unique) leader_set(data);
	// You are a more deserving leader than the challenger, and must stand fearless where you are, doing nothing.
};

// if leader, periodically broadcast
window.setInterval(function(){
	if(!status) return;
	// If there are any (unacknowledged) objects in queue, pop and transmit them.
	itc.emit(prefix+"set",unique);
}, window.parseFloat(timeout)/frequency);

// Attach all functions to events and initialize.
itc.on(prefix+"set",leader_set);
itc.on(prefix+"new",leader_get);

leader.check = function(){ return status; };
// Delayed because other modules should have opportunity to add processes.
leader.start = leader_expire;