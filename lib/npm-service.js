
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var TMP_DIR = path.join(__dirname, '..', 'tmp');
mkdirp.sync(TMP_DIR);

var crypto = require('crypto');
var hash = function(str) {
  var hash = crypto.createHash('sha256');
  hash.update(str);
  return hash.digest('hex');
};

//50MB cache
var cache = require("lru-cache")({
  max: 50*1024,
  length: function (buff) { return buff.length; }
});

var rimraf = require('rimraf');
var zlib = require('zlib');
var tar = require('tar-stream');
var glob = require('glob');
var through = require('through2');
var exec = require('child_process').execFile;
exports.install = function(deps, opts, callback) {

  if(arguments.length === 2)
    if(typeof opts === 'function') {
      callback = opts;
      opts = null;
    }
  if(!opts)
    opts = { gzip:true };

  //hash deps
  var sortedDeps = opts.deps = {};
  Object.keys(deps).forEach(function(key) {
    var version = deps[key];
    if(typeof version === 'string')
      sortedDeps[key] = version;
  });
  var depsHash = hash(JSON.stringify(opts));

  //create stream if no callback
  var stream;
  if(typeof callback !== 'function') {
    stream = through();
    stream.depsHash = depsHash;
  }

  //load from cache
  if(cache.has(depsHash)) {
    var buff = cache.get(depsHash);
    if(stream) {
      stream.end(buff);
    } else {
      callback(null, buff);
    }
    return stream;
  }

  console.log('installing', sortedDeps);
  var archive = tar.pack();

  //not in cache - begin install
  var pkg = JSON.stringify({
    name: "npm-service-dependencies",
    hash: depsHash,
    repository: "https://github.com/jpillora/npm-service",
    date: new Date().toUTCString(),
    dependencies: deps
  }, null, 2);

  archive.entry({ name: 'npm-service.json' }, pkg);

  //setup dirs
  var installDir = path.join(TMP_DIR, depsHash);
  mkdirp.sync(installDir);
  var nodeModulesDir = path.join(installDir, 'node_modules');

  //error helper
  function error(err) {
    cleanup();
    if(stream)
      stream.emit('error', err);
    else
      callback(err);
  }

  //kick off
  (function writePkg() {
    //write temporary package.json
    fs.writeFile(path.join(installDir, 'package.json'), pkg, npmInstall);
  })();

  function npmInstall(err) {
    if(err) return error(err);
    exec('npm', ['install'], {cwd:installDir}, listFiles);
  }

  function listFiles(err) {
    if(err) return error(err);
    glob("**", {cwd: nodeModulesDir}, readFiles);
  }

  function readFiles(err, files) {
    if(err) return error(err);
    readFile(files);
  }

  function readFile(files) {
    if(files.length === 0)
      return finalize();
    var rela = files.pop();
    var abs = path.join(nodeModulesDir, rela);
    fs.stat(abs, statFile);
    function statFile(err, stats) {
      if(err) return error(err);
      if(!stats.isFile()) return readFile(files);
      fs.readFile(abs, addFile);
    }
    function addFile(err, buff) {
      // console.log('add file "%s" #%s', rela, buff.length);
      archive.entry({ name: rela }, buff);
      readFile(files);
    }
  }

  function finalize() {
    // console.log('finalize...');
    //all data now in memory
    cleanup();
    archive.finalize();
    var src = archive;
    if(opts.gzip)
      src = src.pipe(zlib.createGzip());
    if(stream)
      src.pipe(stream);

    var parts = [];
    src.on('data',function(buff) {
      parts.push(buff);
    }).on('end', function() {
      var buff = Buffer.concat(parts);
      cache.set(depsHash, buff);
      if(callback)
        callback(null, buff);
    });
  }

  function cleanup() {
    rimraf(installDir, function(err) {
      if(err) console.warn('rm dir failed');
    });
  }

  return stream;
};

var index = fs.readFileSync(path.join(__dirname, 'index.html'));
var http = require('http');
exports.server = function(port) {
  return http.createServer(function(req, res) {
    if(req.url === '/favicon.ico')
      return res.end();
    if(req.method === 'GET' && req.url === '/')
      return res.end(index);
    var json = '';
    //json body from GET
    if(/\?(\{.+\})$/.test(req.url))
      json += decodeURIComponent(RegExp.$1);
    //json body from POST
    req.on('data', function(b) {
      json += b;
    }).on('end', function() {
      function error(err) {
        res.writeHead(400);
        res.end(err.toString());
      }
      try {
        var deps = JSON.parse(json);
        exports.install(deps, function(err, buff) {
          if(err)
            return error(err.stack || err);
          res.writeHead(200, {
            'content-type': 'application/octet-stream',
            'content-disposition':'attachment;filename=node_modules.tar.gz'
          });
          res.end(buff);
        });
      } catch(err) {
        error('Invalid JSON:'+json);
      }
    });
  }).listen(port);
};
