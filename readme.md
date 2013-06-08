
## Requirements

* Node.js
* MongoDB

## Development

    npm install fs jsmin cssmin
    node athena.build.js --run --loop

The build process creates a single file named `athena.min.js` which contains the source-code for the entire project (with the exception of the build system) in addition to all associated data. The command-line options for `athena.build.js` are :

* `--run` : Run the minified file after the build process is complete.
* `--loop` : Rebuild (and possibly restart) when changes are detected in the source directory.


## Production

    npm install async fs mongodb jsmin path http express socket.io child_process pty.js
    node athena.min.js --integrity --evaluator --webserver
    
The file `athena.min.js` has not been included in this repository, since it can be built as described above. The configuration file (default: `athena.config.js`) should be modified as necessary. The command-line options for `athena.min.js` are :

* `--integrity` : Perform Database Integrity Check. [operation]
* `--evaluator` or `--judge` : Enable Code Evaluation System. [operation]
* `--webserver` or `--web` : Enable Web Interface. [operation]
* `--config [filepath]` : Use the given configuration file, instead of the default.

At least one of the options marked [operation] above is required.