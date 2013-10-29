var Client = require('./Client'),
    Dust = require('./Dust'),
    $ = require('jquery-browserify'),
    Timer = require('./Timer');

$(document).ready(main);

function main() {
    var DUST = new Dust(),
        offset = $('canvas').offset(),
        timer = new Timer();

    $('canvas').mousedown(function(e) {
        switch(event.which) {
            case 1:
                var x = Math.round(e.pageX - offset.left),
                    y = Math.round(e.pageY - offset.top);

                DUST.spawnDust(x, y);

                $('canvas').mousemove(function(e) {
                    x = Math.round(e.pageX - offset.left),
                    y = Math.round(e.pageY - offset.top);

                    DUST.spawnDust(x, y);
                });
                break;
            case 3:
                var x = Math.round(e.pageX - offset.left),
                    y = Math.round(e.pageY - offset.top);
                
                DUST.spawnSquare(x, y);
                break;
        }
    });
    
    $('canvas').mouseup(function(e) {
        $('canvas').unbind('mousemove');
    });

    tick();

    DUST.socket.on('client connected', function(data) {
        var ip = "172.16.0.20"

        if(data === 1) {
            DUST.client = new Client(ip, "red");
            DUST.client.turn = true;
        } else if(data === 2) {
            DUST.client = new Client(ip, "blue");
        } else if(data > 2) {
            DUST.client = new Client(ip);
        }

    });

    function tick() {
        requestAnimationFrame(tick);

        DUST.updateWorld(timer.getTime() / 1000);

        DUST.drawWorld();

        timer.reset();
    }
}
