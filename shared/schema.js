
var schema = exports = {};

/*

types = boolean, integer, float, timestamp, string, reference, file, array, object, document

title (string) = the text visible to the user during dynamic form generation, beside the input field
password (boolean) = applicable for string type only, makes the input "password" type
internal (boolean) = skip this key-value pair during dynamic form generation
optional (boolean) = makes the value optional (empty for string/array type, undefined for reference/file type)
default (variable) = default value for object to be assumed when not specified
keys (array) = applicable for document type only, the list of fields to index the collection by
items (object) = the specification for what an array/object/document contains
collection (string) = applicable in case of reference type, the name of the collection referred to

*/

schema.user = {
	"type": "document",
	"keys": ["username"],
	"items": {
		"_id": {type:"integer",internal:true},
		"username": {type:"string",title:"Username"},
		"password": {type:"string",title:"Password",password:true},
		"dob": {type:"timestamp",title:"Date of Birth"},
		"type": {type:"string",default:"normal",internal:true},
		"email": {type:"string",title:"EMail Address"},
		"realname": {type:"string",title:"Real Name"},
		"image": {type:"file",title:"Profile Picture"},
		"groups": {type:"array",title:"Groupswa",optional:true,items:{type:"reference",collection:"user"}},
		"multifile": {type:"array",title:"Multiple Files",optional:true,items:{type:"file",title:"singlefile"}},
		"randints": {type:"array",title:"Random Integers",optional:true,items:{type:"integer",title:"randint"}}
	}
};

schema.group = {
	"type": "document",
	"keys": ["name"],
	"items": {
		"_id": {type:"integer"},
		"name": {type:"string"},
		"desc": {type:"string"},
		"owner": {type:"reference",collection:"users"},
		"users": {type:"array",items:{type:"reference",collection:"users"}}
	}
};

schema.set = {
	"type": "document",
	"keys": ["name"],
	"items": {
		"_id": {type:"integer"},
		"name": {type:"string"},
		"desc": {type:"string"},
		"freedom": {type:"boolean"},
		"exclusive": {type:"boolean"},
		"create": {type:"boolean"},
		"integer": {type:"integer"},
		"groups": {type:"array",items:{type:"reference",collection:"groups"},default:[]}
	}
};