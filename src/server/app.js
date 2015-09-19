var XWISAdmin = require('./XWISAdmin');
var config = require('./config');
var debug = require('debug')('xwisadmin');
var errors = config.messages;

var http = require('http');
var server = http.createServer(function(request, response) {});
var io = require('socket.io')(server);
server.listen(4008);

var impersonation = new RegExp(/(\s{10,}\[\w{3,9}\])/);

var bot = new XWISAdmin(config.games.ra);
/*var bot = new XWISAdmin(config.games.ra);*/

bot.on('privmsg', function(data) {
    if (impersonation.test(data.message)) {
        bot.page(data.originator, errors['USER_IMPERSONATION']);
        data.warned = true;
    }

    io.emit('privmsg', data);
});

bot.on('join', function(data) {
    io.emit('join', data);
});

bot.on('part', function(data) {
    io.emit('part', data);
});

bot.on('names', function(data) {
    io.emit('names', data);
});

io.on('connect', function(socket) {
    debug('socket.io connection!');

    socket.on('channels', function(data) {
        debug('channels request');
        io.emit('channels', bot.channels);
    });

    socket.on('privmsg', function(data) {
        debug('privmsg sent');
        bot.privmsg(data.destination, data.message);
    });

    socket.on('action', function(data) {
        debug('action sent');
        bot.action(data.destination, data.message);
    });
});
