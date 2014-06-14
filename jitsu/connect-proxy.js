
var net = require('net');
var url = require('url');
var Transform = require('stream').Transform;

function inspector(fn) {
  var insp = new Transform();
  insp._transform = function(buff, enc, next) {
    if(process.env.DEBUG)
      fn(buff);
    this.push(buff);
    next();
  };
  return insp;
}

module.exports = function(req, cltSocket, head) {
  // get server address
  var srvUrl = url.parse('http://' + req.url);
  // connect to server
  console.log('connecting to %s:%s', srvUrl.hostname, srvUrl.port);
  var srvSocket = net.connect(srvUrl.port, srvUrl.hostname, function() {
    console.log('connected to %s:%s', srvUrl.hostname, srvUrl.port);

    cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                    'Proxy-agent: Node-Proxy\r\n' + '\r\n');
    srvSocket.write(head);

    srvSocket
      .pipe(inspector(function(buff) {
        console.log('in #%s', buff.length);
      }))
      .pipe(cltSocket)
      .pipe(inspector(function(buff) {
        console.log('out #%s "%s"', buff.length, buff);
      }))
      .pipe(srvSocket);
  });
};
