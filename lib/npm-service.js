
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var TMP_DIR = path.join(__dirname, '..', 'tmp');
mkdirp.sync(TMP_DIR);

var crypto = require('crypto');
var guid = function() {
  return crypto.randomBytes(6).toString('hex');
};

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

  var archive = tar.pack();

  var installId = guid();
  var pkg = {
    version: "0.0.0",
    description: "npm-install run",
    repository: "https://github.com/jpillora/npm-install",
    dependencies: deps
  };
  var installDir = path.join(TMP_DIR, installId);
  mkdirp.sync(installDir);

  var nodeModulesDir = path.join(installDir, 'node_modules');

  var stream;
  if(typeof callback !== 'function')
    stream = through();

  function error(err) {
    cleanup();
    console.log('install error', err);
    if(stream)
      stream.emit('error', err);
    else
      callback(err);
  }

  writePkg();

  function writePkg() {
    //write temporary package.json
    fs.writeFile(path.join(installDir, 'package.json'), JSON.stringify(pkg), npmInstall);
  }

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
    else
      buffer(src);
  }

  function buffer(src) {
    var parts = [];
    src.on('data',function(buff) {
      parts.push(buff);
    }).on('end', function() {
      callback(null, Buffer.concat(parts));
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
    req.on('data', function(b) {
      json += b;
    }).on('end', function() {
      function error(err) {
        res.writeHead(400);
        res.end(err.toString());
      }
      try {
        var deps = JSON.parse(json);
        res.writeHead(200, { 'content-type': 'application/x-compressed' });
        var stream = exports.install(deps);
        stream.on('error', error);
        stream.pipe(res);
      } catch(err) {
        error('Invalid JSON');
      }
    });
  }).listen(port);
};
