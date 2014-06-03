var npm = require('../');

npm.install({
  colors:'latest'
}).pipe(process.stdout);

//run with:
// node stream.js | gzip -d | tar xf -