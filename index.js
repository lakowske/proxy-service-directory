/*
 * (C) 2014 Seth Lakowske
 */

var fs               = require('fs');
var path             = require('path');
var http             = require('http');
var httpProxy        = require('http-proxy');
var proxyByDirectory = require('proxy-by-directory');
var pg               = require('pg');
var pgReqPersister   = require('pg-http-request-logger');
var router           = require('routes')();
var methods          = require('http-methods');
var Deployer         = require('github-webhook-deployer');
var cors             = new (require('http-cors'))();
var throttleEmail    = require('./email').throttleEmail;
var url              = require('url');

var port   = parseInt(process.argv[2], 10);

if (!port) {
    console.log('invalid port\n');
    console.log('Usage: node index.js <port>');
    process.exit(-1);
}

try {
    var config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')));
} catch (error) {
    console.log(error);
    console.log('Problem loading configuration. Create a config.json file with deployer configuration');
    process.exit(-1);
}

function connectOrFail(callback) {
    console.info('connecting to ' + connection);
    pg.connect(connection, function(err, client, done) {
        if (err) {
            console.log('error while connecting to postgres server');
            console.log(err);
            process.exit();
        }

        pgReqPersister.requestTable(client, function(err, result) {
            done();
            callback();
        })
    })
}

function onConnection() {

    var proxy  = httpProxy.createProxyServer({});

    proxy.on('error', function(er, req, res) {
        console.log(er);
        res.writeHead(500, {
            'Content-Type':'text/plain'
        });
        var millisPerEmail = 1000 * 20; //one minute between emails
        throttleEmail(millisPerEmail, config.serviceDirectory, 'Error: reverse-proxy', 'Something went wrong. Probably an unresponsive web server.', function() {
            console.log('emailed error');
        });
        res.end("Something went wrong. Probably an unresponsive web server.");
    })

    var proxyFn = proxyByDirectory(config.directory, proxy)

    var server = http.createServer(function(req, res) {

        console.log(req.method + ' ' + req.url);

        if (cors.apply(req, res)) return;

        //log the request
        var reqDescription = pgReqPersister.request(req, res);
        pg.connect(connection, function(err, client, done) {
            if (err) console.error('Problem establishing connection to the database')
            pgReqPersister.insertRequest(client, reqDescription, function(err, result) {
                if (err) console.error('Problem adding request to the database');
                done();
            })
        })

        //route the request to the correct server
        proxyFn(req, res);

    });

    server.listen(port);
}


var deployerPort = port+1
var deployer = new Deployer(config);
deployer.listen(deployerPort);

var user = process.env['USER'];
if (config.user) user = config.user;

var connection = 'postgres://'+user+'@localhost/request';
if (config.pass) {
    connection = 'postgres://'+user+':'+config.pass+'@localhost/request';
}

connectOrFail(onConnection);
