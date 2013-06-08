
## Architectural Highlights

### Basic Organization
* The `shared` directory contains modules that are common to both the server and the client.
* The `server` directory contains modules that are inaccessible to normal users.
* The `client` directory contains modules that are responsible for generating the web-interface. Since these are sent to the client-side, their behaviour cannot be trusted, and must be verified by the server during all interactions.
* The `static` directory contains additional files (scripts, stylesheets images, etc) that are required for the client-side modules to function properly.

### Minification
* `minifier.js` defines the procedures used to merge the project source-code into a single file. The `shared`, `server` and the `client` sub-directories are sequentially processed, with the `core` modules loaded first. The loading order is specified in the file `index.txt`, the lack of which results in the loading of all modules in the directory in an arbitrary order. Loading involves wrapping the file contents in an anonymous function to avoid namespace pollution, and joining them all together so that previously loaded modules are directly accessible by name. Additionally, the contents of all files in the static directory are available in base64 encoded form (allowing arbitrary binary data) in a JS Object called `files`.

### Augmented DBMS
* `shared/core/schema.js` defines the database structure.
* `server/core/specification.js` provides functions to ensure the validity of the above definitions and to check if a given object matches the given structure (dynamic server-side form validation).
* `server/core/action.js` provides functions for high-level database manipulation. Since MongoDB does not provide a reference datatype & requires that large data objects be stored through the GridFS, this file takes care of the low-level details to provide this functionality in a convenient form.

### Server-Side : Operations
* `server/plugin/webserver.js` provides handlers for HTTP requests and setting up the Socket.IO link and RPC handlers. It also provides (time-based) unique integers via a cookie that is used in `client/core/leader.js`.
* `server/plugin/evaluator.js` contains the Code Evaluation System. The basic idea is to compile the test code and judge code (if necessary), start both, interconnect their input and output streams, and track the judge output for special symbols indicating evaluation results.
* `server/core/action.js` additionally provides of a function that scans the entire database to repairs any errors that might have crept in.

### Client-Server Communication
* `client/core/itc.js` implements an event-based system that can be used by the various tabs of the browser to communicate with each other.
* `client/core/leader.js` implements a leader-election algorithm to select a single leader tab, designating the rest as followers. In case the current leader dies (the tab is closed), a new one is selected based on the smallest unique integer.
* `client/core/delivery.js` provides reliable communication (with buffering and acknowledgements) with the leader tab.
* `client/core/socket.js` implements Socket.IO link sharing. In order to reduce server load, only the leader tab maintains a link with the server. All messages to and from the follower tabs are then relayed by the leader.
* `server/core/rpc.js` & `client/core/rpc.js` implement Remote Procedure Calls, which are used by all plugins and widgets to interact with the server.

### Client-Side : Web Interface
* `client/core/widget.js` specify the basic functionality for all widgets (the individual components of the web interface) defined in the `client/widget/` directory. Widgets may use functionality provided by the core modules, in addition to the plugins defined in the `client/plugin/` directory.
* `client/core/display.js` is responsible for providing basic structure to the page, functions to report success/errors, and keeping track of changes in `window.location.hash` to show/hide appropriate widgets.

### Client-Side Plugins
* `client/plugin/form.js` implements dynamic form generation, requiring only the collection schema and an optional data object.
* `client/plugin/fileupload.js` provides an elegant and easy-to-use file input element, with a progress bar and various options, to upload files specified by the user directly into GridFS.
* `client/plugin/suggestion.js` provides a type-ahead style input element which can be used to specify references by selecting one or more documents from the relevant collection.
* `client/plugin/pagination.js` implements dynamic table generation, requiring an RPC that returns paginated data and functions that specify how to render each row and what happens when the user clicks on it.
