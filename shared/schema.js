
var schema = exports = {};

/*

types = integer, float, datetime, string, select, reference, file, array, object, document

title (string) = the text visible to the user during dynamic form generation, beside the input field
password (boolean) = applicable for string type only, makes the input "password" type
internal (boolean) = skip this key-value pair during dynamic form generation
optional (boolean) = makes the value optional (empty for string/array type, undefined for reference/file type)
default (variable) = default value for object to be assumed when not specified
keys (array) = applicable for document type only, the list of fields to index the collection by
items (object) = the specification for what an array/object/document contains
collection (string) = applicable in case of reference type, the name of the collection referred to
add (string) = applicable for arrays, the text to display on the "Add New Element" button

*/

schema.user = {
	"type": "document",
	"keys": ["username"],
	"items": {
		"type": {type:"string",default:"normal",internal:true},
		"username": {type:"string",title:"Username"},
		"password": {type:"string",title:"Password",password:true},
		"email": {type:"string",title:"EMail Address"},
		"realname": {type:"string",title:"Real Name"},
		"image": {type:"file",title:"Profile Picture",optional:true},
		"groups": {type:"array",title:"Groups",optional:true,items:{type:"reference",collection:"group"}}
	}
};

schema.group = {
	"type": "document",
	"keys": ["name"],
	"items": {
		"name": {type:"string",title:"Group Name"},
		"desc": {type:"string",title:"Description"},
		"owner": {type:"reference",collection:"user",title:"Owner"},
		"set": {type:"reference",collection:"set",title:"Set"}
	}
};

schema.set = {
	"type": "document",
	"keys": ["name"],
	"items": {
		"name": {type:"string",title:"Set Name"},
		"desc": {type:"string",title:"Description"},
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
		"limit": {type:"integer",title:"User Limit"}
	}
};