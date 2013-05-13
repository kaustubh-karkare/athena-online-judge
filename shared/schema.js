
/*

type = integer, float,  string, select, reference, file, array, object.

general attributes
	primary = whether or not this attribute is cached, unique (as defined below) & indexed.
		(there must be exactly one top-level primary attribute in each collection)
	title = The appropriate label for this input used during dynamic form generation.
	optional = Whether or not this string/reference/file/array be left empty.
	cache = Whether or not to save this attribute in all references to this object.
	unique = Whether or not the values of this top-level field are unique in the collection.
	default = What value this object should take on if none is specified.
	internal = Skip this attribute during dynamic form generation. The value will be internally provided.
integer attributes
	datetime = whether or not this value represents a timestamp.
string attributes
	password = whether or not a password input should be used for this field.
	long = whether or not a textarea should be used for this field.
select attributes
	options (required) = an object contain key-value pairs corresponding to the options.
	default (required) = the default value of this field.
reference attributes
	collection (required) = to which objects of which collection does this reference point to.
array attributes
	items (required) = the schema of each of the objects contained in the array
object attributues
	items (required) = the schema of this object

*/

var schema = exports = {};

schema.user = {
	"username": { type: "string", title: "Username", primary: true },
	"password": { type: "string", title: "Password", password: true },
	"realname": { type: "string", title: "Real Name", cache: true },
	// "email": { type: "string", title: "EMail Address" },
	// "image": { type: "file", title: "Profile Picture", optional: true },
	"groups": {
		type: "array",
		title: "Groups",
		optional: true,
		items: { type: "reference", collection: "group", title: "Group" }
	},
	"auth": {
		type: "select",
		title: "Status",
		options: { 0: "Anonymous", 1: "Normal", 2: "Administrator" },
		default: 0
	}
};

schema.group = {
	"name": { type: "string", title: "Group Name", primary: true },
	"desc": { type: "string", title: "Description", optional: true },
	"owner": { type: "reference", collection: "user", title: "Owner" },
	"set": { type: "reference", collection:"set", title:"Set", cache: true }
};

schema.set = {
	"name": { type: "string", title: "Set Name", primary: true },
	"desc": { type: "string", title: "Description", optional:true },
	"freedom": {
		type: "select",
		title: "Freedom",
		options: {
			0:"Users are not free to choose their groups within this set.",
			1:"Users can freely change groups within this set."
		},
		default:0
	},
	"exclusive": {
		type: "select",
		title: "Exclusive",
		options: {
			0:"Users can be part of multiple groups within this set.",
			1:"Users can be part of only group within this set at a time."
		},
		default:1
	},
	"create": {
		type: "select",
		title: "Create",
		options: {
			0:"Users can only choose existing groups within this set.",
			1:"Users can create new groups as and when they wish within this set."
		},
		default:0
	},
	"limit": { type:"integer", title:"User Limit", default:0 }
};

schema.language = {
	"name": { type: "string", title: "Language Name", primary: true },
	"multiplier": { type: "float", title: "Time Limit Multiplier", optional: true, default: 1 }
};

schema.judge = {
	"name": { type: "string", title: "Judge Name", primary: true },
	"desc": { type: "string", title: "Description", optional: true },
	"language": { type: "reference", collection: "language", title: "Language" },
	"code": { type: "file", title: "Code" }
};

schema.problem = {
	"name": { type:"string", title: "Problem Name", primary: true },
	"tags": {
		type:"array",
		title: "Tags",
		items: { type: "string", title:"Tag" },
		optional: true
	},
	"languages": {
		type: "array",
		title: "Allowed Languages",
		optional: true,
		items: { type: "reference", title: "Language", collection: "language" }
	},
	"setter": { type:"string", title: "Problem Setter / Source", optional: true },
	"statement": { type: "string", title: "Statement", long: true },
	"tutorial": { type: "string", title: "Tutorial", long: true },
	"files": {
		type: "array",
		title: "Associated Files",
		optional: true,
		items: { type: "file", title: "File" }
	},
	"tests": {
		type: "array",
		title: "Test Data",
		items: {
			type:"object",
			items: {
				"input" : { type: "file", title: "Input" },
				"output" : { type: "file", title: "Output" },
				"timelimit" : { type: "float", title: "Time Limit" }
			}
		}
	},
	"judge": { type:"reference", collection: "judge", title: "Judge" }
};

schema.contest = {
	"name": { type: "string", title: "Contest Name", primary: true },
	"desc": { type: "string", title: "Description", optional: true },
	"problems": {
		type: "array",
		optional: true,
		title: "Problems",
		items: {
			type: "object",
			items: {
				"problem": { type: "reference", collection: "problem", title: "Problem" },
				"points": { type: "integer", title: "Points" }
			}
		}
	},
	"start": { type: "integer", datetime: true, title: "Start Time" },
	"end": { type: "integer", datetime: true, title: "End Time" },
	"groups": {
		type: "array",
		title: "Allowed Groups",
		optional: true,
		items: { type: "reference", collection: "group", title: "Group" }
	},
	"ranking": { type: "reference", collection: "set", title: "Ranking Scheme", optional: true }
};

var result = {
	type: "select",
	title: "Result",
	options: {
		"NA1" : "Judgement Pending",
		"NA2" : "Judgement Ongoing",
		"AC" : "Accepted",
		"CE" : "Compilation Error",
		"RTE" : "Run Time Error",
		"TLE" : "Time Limit Exceeded",
		"WA" : "Wrong Answer",
		"PE" : "Presentation Error",
		"DQ" : "Manually Disqualified"
	},
	default: "NA1"
};

schema.code = {
	"name": { type: "string", title: "Name", primary: true },
	"problem": { type: "reference", collection: "problem", title: "Problem" },
	"contest": { type: "reference", collection: "contest", title: "Contest", optional: true },
	"user": { type: "reference", collection: "user", title: "User" },
	"language": { type: "reference", collection: "language", title: "Language" },
	"code": { type: "string", title: "Code", long: true },
	"results": {
		type: "array",
		title: "Results",
		optional: true,
		items: {
			type: "object",
			items: {
				"error": { type: "string", title: "Error Message", optional:true },
				"time": { type: "float", title: "Run Time" },
				"output": { type: "file", title: "Solution Output", optional: true },
				"result": result
			}
		}
	},
	"result": result, // cached, based on the details specified in results array
	"access": {
		type: "select",
		title: "Access",
		options: { "0": "Private", "1": "Protected", "2": "Public" },
		default: "0"
	},
	"time": { type: "integer", datetime: true, title: "Submission Time" }
};

schema.comment = {
	"name": { type: "string", title: "Name", primary: true },
	"location": { type: "string", title: "Location"	},
	"replyto": { type: "reference", collection: "comment", title: "Reply To", optional: true },
	"user": { type: "reference", collection: "user", title: "User" },
	"time": { type: "integer", title: "Submission Time", datetime: true },
	"message": { type: "string", title: "Message", long: true },
	"access": {
		type: "select",
		title: "Access",
		options: { "0": "Private", "1": "Public" },
		default: "0"
	}
};