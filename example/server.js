var npm = require('../');

npm.server(3000).on('listening', function() {
  console.log('listening...');
});

//run with:
// curl http://localhost:3000/ -d '{"colors":"latest"}' | gzip -d | tar xf -
//   or
// curl http://localhost:3000/ -d '{"colors":"latest"}' > node_modules.tar.gz