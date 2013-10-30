var Client = require('./Client'),
    Dust = require('./Dust'),
    $ = require('jquery-browserify'),
    Timer = require('./Timer'),
    Vector = require('./Vector');

$(document).ready(main);

function main() {
    var DUST = new Dust(),
        offset = $('canvas').offset(),
        timer = new Timer();

    $('canvas').mousedown(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $('canvas').unbind('mouseup');
        switch(e.which) {
            case 1:
                var x = Math.round(e.pageX - offset.left),
                    y = Math.round(e.pageY - offset.top);

                DUST.spawnDust(x, y);

                $('canvas').mousemove(function(e) {
                    x = Math.round(e.pageX - offset.left),
                    y = Math.round(e.pageY - offset.top);

                    DUST.spawnDust(x, y);
                });
                
                $('canvas').mouseup(function(e) {
                    $('canvas').unbind('mousemove');
                });
                break;
            case 2:
                var xOrig = Math.round(e.pageX - offset.left),
                    yOrig = Math.round(e.pageY - offset.top),
                    w = 0,
                    h = 0;
                
                    DUST.drawSelection(xOrig, yOrig, 0, 0);

                $('canvas').mousemove(function(e) {
                    w = Math.abs(xOrig - Math.round(e.pageX - offset.left));
                    h = Math.abs(yOrig - Math.round(e.pageY - offset.top - 20)); //No I'm not entirely clear why that -20 has to be there

                    DUST.resizeSelection(w, h);
                });

                $('canvas').mouseup(function(e) {
                    $('canvas').unbind('mousemove');

                    DUST.selectionBox = null;

                    DUST.spawnSolid(xOrig, yOrig, w, h);
                });

                break;
        }
    });
    
    
    var frame = 0,
        fpsTimer = new Timer();

    tick();

    DUST.socket.on('client connected', function(data) {
        var ip = "192.168.1.77"

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

        frame++;
        if(fpsTimer.getTime() > 1000) {
            $('#fps').html(frame + 'fps');
            fpsTimer.reset();
            frame = 0;
        }

        DUST.updateWorld(timer.getTime() / 1000);

        DUST.drawWorld();

        timer.reset();
    }
}
