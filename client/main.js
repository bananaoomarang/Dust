var Client = require('./Client'),
    Dust = require('./Dust'),
    $ = require('jquery-browserify'),
    Timer = require('./Timer'),
    Vector = require('./Vector');

$(document).ready(main);

function main() {
    var DUST = new Dust(),
        timer = new Timer(),
        frame = 0,
        fpsTimer = new Timer();

    $('#fps').css('position', 'absolute');
    $('#fps').css('top', $('canvas').position().top);
    $('#fps').css('left', $('canvas').position().left - 50);

    $('#fps').html(0 + 'fps');
    var offset = $('canvas').offset();

    $('canvas').mousedown(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $('canvas').unbind('mouseup');

        switch(e.which) {
            case 1:
                var x = Math.round(e.pageX - offset.left);
                    y = Math.round(e.pageY - offset.top);

                var type = $('input[name=dustType]:checked', '#menu').val(),
                    infect = $('input[name=infectant]:checked', '#menu').val(),
                    brushGirth = parseInt($('input[name=brushSize]', '#menu').val());

                DUST.spawnCircle(x, y, type, brushGirth, infect);

                $('canvas').mousemove(function(e) {
                    x = Math.round(e.pageX - offset.left);
                    y = Math.round(e.pageY - offset.top);

                    DUST.spawnCircle(x, y, type, brushGirth, infect);
                });
                
                $('canvas').mouseup(function(e) {
                    $('canvas').unbind('mousemove');
                });
                break;
        }
    });

    $(document).keydown(function(e) {
        switch(e.which) {
            // Space
            case 32:
                if(DUST.paused)
                    DUST.paused = false;
                else
                    DUST.paused = true;
                break;
        }
    });

    $('#saveButton').click(function() {
        DUST.saveLevel();
    });
    
    $('#loadButton').click(function() {
        DUST.loadLevel();
    });
    
    tick();

    function tick() {
        requestAnimationFrame(tick);

        frame++;
        if(fpsTimer.getTime() > 1000) {
            $('#fps').html(frame + 'fps');
            fpsTimer.reset();
            frame = 0;
        }

        if(!DUST.paused) DUST.update(timer.getTime() / 1000);

        DUST.draw();

        timer.reset();
    }
    
    //DUST.socket.on('client connected', function(data) {
        //var ip = "192.168.1.77";

        //if(data === 1) {
            //DUST.client = new Client(ip, "red");
            //DUST.client.turn = true;
        //} else if(data === 2) {
            //DUST.client = new Client(ip, "blue");
        //} else if(data > 2) {
            //DUST.client = new Client(ip);
        //}

    //});
}
