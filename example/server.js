var npm = require('../');

npm.server(3000);

//run with:
// curl http://localhost:3000/ -d '{"colors":"latest"}' | gzip -d | tar xf -
//   or
// curl http://localhost:3000/ -d '{"colors":"latest"}' > node_modules.tar.gz