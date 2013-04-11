
// EJS Helpers

// Addslashes
EJS.Helpers.prototype.s = function(str){ return String(str).replace(/([\\"'])/g, "\\$1").replace(/\0/g, "\\0"); };
// HTML Entities, for normal display & textareas.
EJS.Helpers.prototype.h = function(str){ return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
// Convert Quotes, for input field, titles
EJS.Helpers.prototype.q = function(str){ return String(str).replace(/"/g, '&#34;').replace(/'/g, '&#39;'); };
// Debugging; JSON repr
EJS.Helpers.prototype.r = function(obj){ return JSON.stringify(obj); };
// URL Encode
EJS.Helpers.prototype.u = function(str){ return encodeURIComponent(String(str)).replace(/\//g,"%2F").replace(/'/g,"%27"); };