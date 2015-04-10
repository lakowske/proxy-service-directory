/*
 * (C) 2014 Seth Lakowske
 */

var fs               = require('fs');
var path             = require('path');
var http             = require('http');
var httpProxy        = require('http-proxy');
var proxyByDirectory = require('proxy-by-directory');
var level            = require('level');
var logger           = require('http-request-logger');
var router           = require('routes')();
var methods          = require('http-methods');
var Deployer         = require('github-webhook-deployer');
var cors             = new (require('http-cors'))();

var port   = parseInt(process.argv[2], 10);

if (!port) {
    console.log('invalid port\n');
    console.log('Usage: node index.js <port>');
    process.exit(-1);
}

//open the request db
var db = level('./request.db');
requestLogger = logger(db);
request       = requestLogger.request();
router.addRoute('/requests', methods({GET:requestLogger.requests(), POST:requestLogger.classified()}));

var proxy  = httpProxy.createProxyServer({});

proxy.on('error', function(er, req, res) {
    console.log(er);
    res.writeHead(500, {
        'Content-Type':'text/plain'
    });

    res.end("Something went wrong. Probably an unresponsive web server.");
})

var proxyFn = proxyByDirectory({
    '/articles' : { target : 'http://localhost:5555/' },
    '/static' : { target : 'http://localhost:5555/' },
    '/' : { target : 'http://localhost:7777' }
}, proxy)

var server = http.createServer(function(req, res) {

    console.log(req.method);
    console.log(req.url);
    if (cors.apply(req, res)) return;

    var m = router.match(req.url);
    if (m) m.fn(req, res, m.params, function() {console.log("served proxy req")}); //check if we should serve the request
    else {
        //log the request
        request(req, res);
        //route the request to the correct server
        proxyFn(req, res);
    }

});

server.listen(port);

try {
    var config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
} catch (error) {
    console.log(error);
    console.log('Problem loading configuration. Create a config.json file with deployer configuration');
    process.exit(-1);
}

var deployerPort = port+1
var deployer = new Deployer(config);
deployer.listen(deployerPort);
