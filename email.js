var url    = require('url');
var lookup = require('service-directory').lookup;
var http   = require('http');

var lastEmailMillis = null;
var timerHandle = null;
var messages = [];

function throttleEmail(millisPerEmail, serviceDirectory, subject, message, cb) {

    var now = Date.now();

    messages.push({subject : subject, message : message, time : now})

    if (timerHandle) return;



    var sendmail = function() {

        var sentSubject = 'email service: ' + messages.length + ' messages'

        if (messages.length === 1) {
            sentSubject = messages[0].subject;
        }

        var sentBody = '';
        for (var i = 0 ; i < messages.length ; i++) {
            sentBody += JSON.stringify(messages[i]) + '\n';
        }

        email(serviceDirectory, sentSubject, sentBody, cb);

        lastEmailMillis = Date.now();
        messages = []
        timerHandle = null;
    }

    if (lastEmailMillis) {
        var soonestEmailTime = lastEmailMillis + millisPerEmail;
        if (now < soonestEmailTime) {
            var waitMillis = soonestEmailTime - now;
            timerHandle = setTimeout(sendmail, waitMillis);
            return;
        }
    }

    sendmail();

}

function email(serviceDirectory, subject, message, cb) {

    lookup(serviceDirectory, 'email', function(service) {
        var options = url.parse(service.email.url);
        options.headers = {'subject' : subject};
        options.method  = 'POST';

        var req = http.request(options, function(res) {
            res.on('end', cb);
        });

        req.write(message);

        req.on('error', function(er) {
            console.log(er);
        })

        req.end();
    })

}
/*
throttleEmail(20000, 'http://sethlakowske.com:1111/', 'throttle', 'msg 1', function() {
    console.log('sent 1');
})
throttleEmail(20000, 'http://sethlakowske.com:1111/', 'throttle', 'msg 2', function() {
    console.log('sent 2');
})
throttleEmail(20000, 'http://sethlakowske.com:1111/', 'throttle', 'msg 3', function() {
    console.log('sent 2');
})
*/

module.exports.email = email;
module.exports.throttleEmail = throttleEmail;
