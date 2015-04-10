/*
 * (C) 2014 Seth Lakowske
 */

var fs               = require('fs');
var path             = require('path');
var http             = require('http');
var httpProxy        = require('http-proxy');
var proxyByRoutes    = require('proxy-by-routes');
var level            = require('level');
var router           = require('routes')();
var logger           = require('http-request-logger');
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

var proxyRouter = proxyByRoutes.proxyByRoute([{pattern:'/articles*', host:'localhost', port:5555 },
                                              {pattern:'/static*'  , host:'localhost', port:5555 },
                                              {pattern:'/*'        , host:'localhost', port:7777 }]);


requestLogger = logger(db);
request       = requestLogger.request();
router.addRoute('/requests', methods({GET:requestLogger.requests(), POST:requestLogger.classified()}));

var server = http.createServer(function(req, res) {

    console.log(req.method);
    console.log(req.url);
    if (cors.apply(req, res)) return;

    //check if we should serve the request
    var m = router.match(req.url);
    if (m) m.fn(req, res, m.params, function() {console.log("served /requests")});
    else {
        //log the request
        request(req, res);
        var m = proxyRouter.match(req.url);
        if (m) {
            console.log('matched ' + m.route);
            m.fn(req, res, m.params)
        }
        else { res.end('not found') }
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
