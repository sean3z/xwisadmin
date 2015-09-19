var net = require('net');
var debug = require('debug')('xwisadmin');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function XWISAdmin(options) {
    if (!options) {
        throw new Error('missing options');
    }

    this.options = options;
    this.bans = [];
    this.channels = {};

    this.connect();
}

util.inherits(XWISAdmin, EventEmitter);

XWISAdmin.prototype.connect = function() {
    var self = this;
    this.socket = net.connect({
        port: this.options.port,
        host: 'xwis.net'
    });

    this.socket.on('connect', function() {
        var message = [
            'CVERS '+ self.options.cvers,
            'PASS supersecret',
            'NICK '+ self.options.nick,
            'apgar '+ self.options.apgar,
            'SERIAL '+ self.options.serial,
            'USER UserName HostName irc.westwood.com :RealName',
            'verchk '+ self.options.verchk,
            'SETOPT 16,33',
            'SETCODEPAGE 1252',
            'SETLOCALE 1'
        ];

        self.send(message.join('\r\n'));
    });

    this.socket.on('data', function(data) {
        data = data.toString().split('\r\n');
        for(var key in data) {
            self.delegate(data[key].split(' '));
        }
    });

    this.socket.on('close', function(error) {
        if (error) self.connect();
    });
};

XWISAdmin.prototype.send = function(message) {
    if (this.socket) {
        this.socket.write(message +'\r\n');
        debug('out: %s', message);
    }
};

XWISAdmin.prototype.join = function(channel, password) {
    password = password || '';
    this.send(['JOIN', channel, password].join(' '));
};

XWISAdmin.prototype.list = function() {
    for(var id in this.options.lobby) {
        this.send(['LIST', '0', this.options.lobby[id]].join(' '));
    }
};

XWISAdmin.prototype.part = function(channel) {
    this.send(['PART', channel].join(' '));
};

XWISAdmin.prototype.privmsg = function(destination, message) {
    this.send(['PRIVMSG', destination, ':'+ message].join(' '));
};

XWISAdmin.prototype.page = function(destination, message) {
    this.send(['PAGE', destination, ':'+ message].join(' '));
};

XWISAdmin.prototype.voice = function(nick) {
    this.privmsg(this.options.nick, '/voice '+ nick);
};

XWISAdmin.prototype.devoice = function(nick) {
    this.privmsg(this.options.nick, '/devoice '+ nick);
};

XWISAdmin.prototype.drop = function(nick) {
    this.privmsg(this.options.nick, '/xd '+ nick);
};

XWISAdmin.prototype.action = function(destination, message) {
    this.privmsg(destination, String.fromCharCode(1) + 'ACTION' + message + String.fromCharCode(1));
};

XWISAdmin.prototype.announce = function(message) {
    for(var channel in this.channels) {
        this.privmsg(channel, message);
    }
};

XWISAdmin.prototype.delegate = function(buffer) {
    debug('in: %s', buffer.join(' '));

    if (buffer[0] == 'PING') {
        this.send('PONG '+ buffer[1]);
    } else if (typeof buffer[1] != undefined) {
        switch(buffer[1]) {
            case '327':
                this.join(buffer[3], 'zotclot9');
            break;

            case '376':
                this.list();
            break;

            case '353':
                var names = irc.names(buffer.slice(5).join(' ').substring(1));
                this.channels[buffer[4]] = this.channels[buffer[4]].concat(names);
            break;

            case 'PAGE':
                var data = {
                    originator: irc.nick(buffer[0]),
                    destination: irc.nick(buffer[2]),
                    message: buffer.slice(3).join(' ').substring(1)
                };

                this.emit('page', data);
            break;

            case 'PRIVMSG':
                var data = {
                    originator: irc.nick(buffer[0]),
                    destination: buffer[2],
                    message: buffer.slice(3).join(' ').substring(1)
                };

                if (data.destination.indexOf('#') < 0) {
                    data.destination = irc.nick(data.destination);
                }

                this.emit('privmsg', data);
            break;

            case 'JOIN':
                var data = {
                    originator: irc.nick(buffer[0]),
                    destination: buffer[3]
                };

                if (data.originator != this.options.nick.toLowerCase()) {
                    if (this.channels[data.destination].indexOf(data.originator) < 0) {
                        this.channels[data.destination].push(data.originator);
                    }

                    this.emit('join', data);
                } else {
                    this.channels[data.destination] = [];
                }
            break;

            case 'PART':
                var data = {
                    originator: irc.nick(buffer[0]),
                    destination: buffer[2]
                };

                if (data.originator != this.options.nick.toLowerCase()) {
                    var i = this.channels[data.destination].indexOf(data.originator);
                    if (i >= 0) this.channels[data.destination].splice(i, 1);
                    this.emit('part', data);
                } else {
                    delete this.channels[data.destination];
                }
            break;
        }
    }
};

var irc = {
    nick: function(string) {
        return string.replace(/:|!u@h/g, '').toLowerCase();
    },
    names: function(string) {
        string = string.replace(/,\d+,\d+/g, '').split(' ');
        for(var i = 0; i < string.length; i++) {
            string[i] = irc.nick(string[i]);
        }
        return string;
    }
};

module.exports = XWISAdmin;
