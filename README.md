npm-service
=============

Dependencies in, tar-gzipped `node_modules` out

### Install
```
npm install npm-service
```

### API

#### HTTP

##### Demo: http://npm-service.herokuapp.com

``` js
var npm = require('npm-service');

npm.server(3000);

//run with:
// node example.js
//then visit:
// http://localhost:3000/
//or use:
// curl http://localhost:3000/ -d '{"colors":"latest"}' | gzip -d | tar xf -
//   or
// curl http://localhost:3000/ -d '{"colors":"latest"}' > node_modules.tar.gz
```

#### Programmatic

Callbacks:

``` js
var npm = require('npm-service');

npm.install({
  colors:'latest'
}, function(err, buff) {
  if(err)
    console.log(err.stack || err);
  else
    console.log('node_modules.tar.gz', buff);
});
```

Streams:

``` js
var npm = require('npm-service');

npm.install({
  colors:'latest'
}).pipe(process.stdout);

//run with:
// node example.js | gzip -d | tar xf -
```

#### CLI

```
npm install -g npm-service
```

```
npm-service [path/to/package.json] > node_modules.tar.gz
```

---

See examples

#### MIT License

Copyright &copy; 2014 Jaime Pillora &lt;dev@jpillora.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
