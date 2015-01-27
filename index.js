/*
 * (C) 2014 Seth Lakowske
 */

var fs               = require('fs');
var http             = require('http');
var httpProxy        = require('http-proxy');
var proxyByDirectory = require('proxy-by-directory');
var Deployer         = require('github-webhook-deployer');

var port   = parseInt(process.argv[2], 10);

if (!port) {
    console.log('invalid port\n');
    console.log('Usage: node index.js <port>');
    process.exit(-1);
}

var proxy  = httpProxy.createProxyServer({});

var server = http.createServer(proxyByDirectory({
    '/articles' : { target : 'http://localhost:5555/' },
    '/static' : { target : 'http://localhost:5555/' },
    '/' : { target : 'http://sethlakowske.com:7777' }
}, proxy))

console.log('proxy listening on ' + port);

server.listen(port);

try {
    var config = JSON.parse(fs.readFileSync('config.json'));
} catch (error) {
    console.log(error);
    console.log('Problem loading configuration. Create a config.json file with deployer configuration');
    process.exit(-1);
}

var deployerPort = port+1
var deployer = new Deployer(config);
console.log('deployer listening on ' + deployerPort);
deployer.listen(deployerPort);
