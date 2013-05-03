
var schema = exports = {};

/*

types = integer, float,  string, select, reference, file, array, object, document

title (string) = the text visible to the user during dynamic form generation, beside the input field
password (boolean) = applicable for string type only, makes the input "password" type
internal (boolean) = skip this key-value pair during dynamic form generation
optional (boolean) = makes the value optional (empty for string/array type, undefined for reference/file type)
default (variable) = default value for object to be assumed when not specified
keys (array) = applicable for document type only, the list of fields to index the collection by
	_id key is added automatically in server/rpc/database.js
items (object) = the specification for what an array/object/document contains
collection (string) = applicable in case of reference type, the name of the collection referred to
add (string) = applicable for arrays, the text to display on the "Add New Element" button

*/

schema.user = {
	type: "document",
	keys: ["username","realname"],
	items: {
		"username": { type: "string", title: "Username" },
		"password": { type: "string", title: "Password", password: true },
		"email": { type: "string", title: "EMail Address" },
		"realname": { type: "string", title: "Real Name", unique: false },
		"image": { type: "file", title: "Profile Picture", optional: true },
		"groups": {
			type: "array",
			title: "Groups",
			optional: true,
			items: { type:"reference", collection:"group", title:"Group" }
		},
		"auth": {
			type: "select",
			title: "Status",
			options: { 0: "Anonymous", 1: "Normal", 2: "Administrator" },
			default: 0
		}
	}
};

schema.group = {
	type: "document",
	keys: ["name"],
	items: {
		"name": { type: "string", title: "Group Name" },
		"desc": { type: "string", title: "Description", optional: true },
		"owner": { type: "reference", collection: "user", title: "Owner" },
		"set": { type: "reference", collection:"set", title:"Set" }
	}
};

schema.set = {
	type: "document",
	keys: ["name"],
	items: {
		"name": { type:"string", title:"Set Name" },
		"desc": { type:"string", title:"Description", optional:true },
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
	}
};

schema.language = {
	type: "document",
	keys: ["name"],
	items: {
		"name": { type: "string", title: "Language Name" },
		"compile": { type: "string", title: "Compile Command", optional: true },
		"execute": { type: "string", title: "Execute Command" },
		"multiplier": { type: "float", title: "Time Limit Multiplier", optional: true }
	}
};

schema.judge = {
	type: "document",
	keys: ["name"],
	items: {
		"name": { type: "string", title: "Judge Name" },
		"desc": { type: "string", title: "Description", optional: true },
		"language": { type: "reference", collection: "language", title: "Language" },
		"code": { type: "file", title: "Code" }
	}
};

schema.problem = {
	type: "document",
	keys: ["name"],
	items: {
		"name": { type:"string", title: "Problem Name" },
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
			optional: true,
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
	}
};

schema.contest = {
	type: "document",
	keys: ["name"],
	items: {
		"name": { type: "string", title: "Contest Name" },
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
		"start": { type: "integer", title: "Start Time", datetime: true },
		"end": { type: "integer", title: "End Time", datetime: true },
		"groups": {
			type: "array",
			title: "Allowed Groups",
			optional: true,
			items: { type: "reference", collection: "group", title: "Group" }
		},
		"ranking": { type: "reference", collection: "set", title: "Ranking Scheme", optional: true }
	}
};

schema.code = {
	type: "document",
	keys: ["name"],
	items: {
		"name": { type: "string", title: "Name" },
		"problem": { type: "reference", collection: "problem", title: "Problem" },
		"contest": { type: "reference", collection: "contest", title: "Contest" },
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
					"error": { type: "string", title: "Error Message" },
					"time": { type: "float", title: "Run Time" },
					"output": { type: "file", title: "Solution Output", optional: true },
					"result": {
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
					}
				}
			},
			default: []
		},
		"access": {
			type: "select",
			title: "Access",
			options: { 0: "Private", 1: "Protected", 2: "Public" },
			default: 0
		},
		"time": { type: "integer", title: "Submission Time", datetime: true }
	}
};

schema.comment = {
	type: "document",
	keys: ["name"],
	items: {
		"name": { type: "string", title: "Name" },
		"location": { type: "string", title: "Location" },
		"replyto": { type: "reference", collection: "comment", optional: true, title: "Reply To" },
		"user": { type: "reference", collection: "user", title: "User" },
		"time": { type: "integer", title: "Submission Time", datetime: true },
		"message": { type: "string", title: "Message", long: true },
		"access": {
			type: "select",
			title: "Access",
			options: { 0: "Private", 1: "Public" },
			default: 0
		}
	}
};