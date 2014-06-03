var npm = require('../');

npm.install({
  colors:'latest'
}, function(err, buff) {
  if(err)
    console.log(err.stack || err);
  else
    console.log('node_modules.tar.gz', buff);
});