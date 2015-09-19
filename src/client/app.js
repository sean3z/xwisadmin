var socket = io.connect('http://xwis.org:4008');
var channels = {};
var me = 'xwisadmin';

socket.on('connect', function () {
    $('#status').html('Connected');
    $('#message').removeAttr('disabled');
    socket.emit('channels', {bots: ['ts', 'ra']});
});

socket.on('disconnect', function () {
    $('#status').html('Disconnected');
    $('#message').attr('disabled', 'disabled');
});

socket.on('channels', function(data) {
    if (Object.keys(channels).length < 1) {
        for(var channel in data) {
            XWISAdmin.addChannel(channel, data[channel]);
            createChannel(channel);

            var $nicklist = $('#nicklist select:eq(0)').clone().attr('data-chan', channel).css('display', 'none');
            $('#controls').before($nicklist);
            for(var nick in data[channel]) {
                $('#nicklist select[data-chan="'+ channel +'"]').append('<option>'+ data[channel][nick] +'</option>');
            }
        }

        switchDestination($('#channels select option:eq(0)').prop('selected', true).val());
    }
});

socket.on('part', function(data) {
    part(data.destination, data.originator);
});

socket.on('join', function(data) {
    join(data.destination, data.originator);
});

socket.on('privmsg', function(data) {
    if (data.destination == me) {
        if ($('.messages[data-chan="'+ data.originator +'"]').length < 1) {
           createChannel(data.originator);
        }

        message(data.originator, data.originator, data.message);
    } else {
        message(data.originator, data.destination, data.message);
    }
});

var XWISAdmin = {
    destination: function() {
        return $('#channels select :selected').val()
    },

    message: function(str) {
        if (str.length > 0) {
            var data = {
                destination: this.destination(),
                message: str,
                bot: 'ts'
            };

            var command = data.message.split(' ')[0].substring(1);
            var _message = data.message.split(' ').slice(1).join(' ');;

            switch(command) {
                case 'announce':
                    for(var channel in channels) {
                        socket.emit('action', {
                            destination: channel,
                            message: _message,
                            bot: data.bot
                        });

                        action(me, channel, _message);
                    }
                break;

                default:
                    socket.emit('privmsg', data);
                    message(me, data.destination, data.message);
            }

            $('#message').val('');
        }
    },

    addChannel: function(channel, nicks) {
        channels[channel] = {nicks: nicks, messages: []};
    }
};

function join(channel, originator) {
    channels[channel].nicks.push(originator);
    $('#nicklist select[data-chan="'+ channel +'"]').append('<option>'+ originator +'</option>');
    $('.messages[data-chan="'+ channel +'"]').append('<li class="join">'+ timestamp() +' '+ originator +' joined '+ channel +'</li>');
    scrollToBottom(channel);
}

function part(channel, originator) {
    delete channels[channel].nicks[originator];
    $('#nicklist select[data-chan="'+ channel +'"] option:contains("'+ originator +'")').remove();
    $('.messages[data-chan="'+ channel +'"]').append('<li class="part">'+ timestamp() +' '+ originator +' left '+ channel +'</li>');
    scrollToBottom(channel);
}

function message(originator, destination, message) {
    var $chan = $('.messages[data-chan="'+ destination +'"]');
    $chan.append('<li>'+ timestamp() +' &lt;'+ originator +'&gt; '+ message +'</li>');
    scrollToBottom(destination);
}

function action(originator, destination, message) {
    var $chan = $('.messages[data-chan="'+ destination +'"]');
    $chan.append('<li class="action">'+ timestamp() +' '+ originator +' '+ message +'</li>');
    scrollToBottom(destination);
}

function timestamp() {
    var date = new Date();
    return '['+ date.getHours() +':'+ (date.getMinutes() < 10 ? '0' : '')+ date.getMinutes() +']';
}

function switchDestination(destination) {
    $('.messages, #nicklist select').hide();
    $('.messages[data-chan="'+ destination +'"], #nicklist select[data-chan="'+ destination +'"]').show();
}

function createChannel(channel) {
    var $lobby = $('.messages:eq(0)').clone().attr('data-chan', channel).css('display', 'none');
    $('#status').before($lobby);
    $('#channels select').append('<option>'+ channel +'</option>');
}

function scrollToBottom(destination) {
    var $chan = $('.messages[data-chan="'+ destination +'"]');
    $chan.animate({ scrollTop: $chan[0].scrollHeight }, "fast");
}

$('input#message').bind('keyup', function(event){
    if (event.keyCode == 13) {
        XWISAdmin.message($('#message').val());
    }
});

$('#channels select').on('click', function(){
    switchDestination($(this).val());
});

$('#nicklist select option').on('dblclick', function() {
    var self = $(this);
    if ($('.messages[data-chan="'+ self.val() +'"]').length < 1) {
        createChannel(self.val());
    }
});
