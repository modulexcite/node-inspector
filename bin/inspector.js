#!/usr/bin/env node

if (process.env.SystemDrive) { // we are running on Windows
  // This is a "nuclear option" workaround for a node Windows issue https://github.com/joyent/node/issues/1697
  // An intermittent assert in net_uv is causing the process to go down which reduces
  // the reliability of the end to end debugging experience. This problem manifests itself
  // frequently with xhr-polling transport. The bug is expected to be fixed in v0.6.0 of node.

  process.on('uncaughtException', function (err) {
    console.log('Unandled exception cought: ' + err);
    console.log(err.stack);
    console.stdout.flush();
    console.stderr.flush();
  });
}

var DebugServer = require('../lib/debug-server').DebugServer,
    fs = require('fs'),
    path = require('path'),
    options = {};

process.argv.forEach(function (arg) {
  var parts;
  if (arg.indexOf('--') > -1) {
    parts = arg.split('=');
    if (parts.length > 1) {
      switch (parts[0]) {
      case '--web-port':
        options.webPort = parseInt(parts[1], 10);
        break;
      default:
        console.log('unknown option: ' + parts[0]);
        break;
      }
    }
    else if (parts[0] === '--help') {
      console.log('Usage: node-inspector [options]');
      console.log('Options:');
      console.log('--web-port=[port]     port to host the inspector (default 8080)');
      process.exit();
    }
  }
});

fs.readFile(path.join(__dirname, '../config.json'), function(err, data) {
  var config,
      debugServer;
  if (err) {
    console.warn("could not load config.json\n" + err.toString());
    config = {};
  }
  else {
    config = JSON.parse(data);
    if (config.hidden) {
      config.hidden = config.hidden.map(function(s) {
        return new RegExp(s, 'i');
      });
    }
  }
  // process.env.PORT, if specified, will take precedence over the configured web port
  // NOTE: it need not be TCP port number, it may be a string file descriptor e.g. named pipe name
  config.webPort = process.env.PORT || options.webPort || config.webPort || 8080;
  config.debugPort = process.env.DEBUGPORT || config.debugPort || 5858;
  config.transports = config.transports || ['websocket'];

  debugServer = new DebugServer();
  debugServer.on('close', function () {
    console.log('session closed');
    process.exit();
  });
  debugServer.start(config);
});
