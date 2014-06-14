//nodejitsu startup
var npm = require('../');

var port = process.env.PORT || 80;

npm.server(port)
  .on('connect', require('./connect-proxy'))
  .on('listening', console.log.bind(console,'listening on %s...', port));
