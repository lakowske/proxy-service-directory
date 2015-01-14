/*
 * (C) 2014 Seth Lakowske
 */


var http             = require('http');
var httpProxy        = require('http-proxy');
var proxyByDirectory = require('proxy-by-directory');

var proxy = httpProxy.createProxyServer({});

var server = http.createServer(proxyByDirectory({
    '/articles' : { target : 'http://localhost:4444/' },
    '/software' : { target : 'http://sethlakowske.com' }
}, proxy))

server.listen(8880);
