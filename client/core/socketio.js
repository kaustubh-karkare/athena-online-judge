exports = {
	// A special event whose handlers are called along with all other events.
	event_global_receive : "*",
	// A special event that is called before sending any data up the socket.
	event_global_presend : "^",
	// Adds support for a Global Event capturing mechanism.
	modified_$emit : function (name) {
		if(!this.$events) return false;
		for(var i=0;i<2;++i){
			if(i==1 && (name==socketio.event_global_receive || name==socketio.event_global_presend)) continue;
			var args = Array.prototype.slice.call(arguments, i);
			var handler = this.$events[i==0?socketio.event_global_receive:name];
			if(!handler) handler = [];
			if ('function' == typeof handler) handler.apply(this, args);
			else if (io.util.isArray(handler)) {
				var listeners = handler.slice();
				for (var j=0, l=listeners.length; j<l; j++)
					listeners[j].apply(this, args);
			} else return false;
		}
		return true;
	},
	// Adds support to intercept all events before sending.
	modified_emit : function (name) {
		// Global Event : Before Sending
		var args = Array.prototype.slice.call(arguments, 0);
		var handler = this.$events[socketio.event_global_presend];
		if(!handler) handler = [];
		if ('function' == typeof handler) handler.apply(this, args);
		else if (io.util.isArray(handler)) {
			var listeners = handler.slice();
			for (var i=0, l=listeners.length; i<l; i++)
				listeners[i].apply(this, args);
		}
		// Send data up the socket
		var args = Array.prototype.slice.call(arguments, 1);
		var lastArg = args[args.length - 1];
		var packet = { type: 'event', name: name };
		if ('function' == typeof lastArg) {
			packet.id = ++this.ackPackets;
			packet.ack = 'data';
			this.acks[packet.id] = lastArg;
			args = args.slice(0, args.length - 1);
		}
		packet.args = args;
		return this.packet(packet);
	}
};