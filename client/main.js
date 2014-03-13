var $ = require('jquery'),
    Client = require('./Client'),
    Dust = require('./Dust'),
    Timer = require('./Timer'),
    Vector = require('./Vector');

require('nouislider');
require('autocomplete');

$(document).ready(main);

function main() {
    var DUST = new Dust(),
        timer = new Timer(),
        frame = 0,
        fpsTimer = new Timer();

    $('#fps').css('position', 'absolute');
    $('#fps').css('top', $('canvas').position().top + 10);
    $('#fps').css('left', $('canvas').position().left - 50);

    $('#fps').html(0 + 'fps');
                    
    $('#paused').hide();
    $('#limitReached').hide();

    var offset = $('canvas').offset();

    $('#brushSize').noUiSlider({
        range: [1, 60],
        start: 10,
        connect: "lower",
        handles: 1
    });

    $('#canvainer').mousedown(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(document).unbind('mouseup');

        switch(e.which) {
            case 1:
                var type = $('input[name=dustType]:checked', '#menu').val(),
                    infect = $('input[name=infectant]:checked', '#menu').val(),
                    brushGirth = parseInt($('#brushSize').val());

                if(DUST.dustCount >= DUST.MAX_DUST && type !== 'eraser') {
                    $('#limitReached').show();
                } else {
                    var x = Math.round(e.pageX - offset.left);
                        y = Math.round(e.pageY - offset.top);

                    DUST.spawnCircle(x, y, type, brushGirth, infect);

                    $('#canvainer').mousemove(function(e) {
                        if(DUST.dustCount >= DUST.MAX_DUST && type !== 'eraser') {
                            $('#limitReached').show(); 
                        } else {
                            x = Math.round(e.pageX - offset.left);
                            y = Math.round(e.pageY - offset.top);

                            DUST.spawnCircle(x, y, type, brushGirth, infect);
                        }
                    });
                }

                $(document).mouseup(function(e) {
                    $('#canvainer').unbind('mousemove');
                    $('#limitReached').hide();
                });

                break;
        }
    });

    $(document).keydown(function(e) {
        switch(e.which) {
            // Space
            case 32:
                if(DUST.paused) {
                    $('#paused').hide();
                    DUST.paused = false;
                } else {
                    $('#paused').show();
                    DUST.paused = true;
                }
                break;
            // R
            case 82:
                for (var x = 0; x < DUST.grid.length; x++) {
                    for (var y = 0; y < DUST.grid[x].length; y++) {
                        DUST.grid[x][y] = 0;
                    }
                }
                break;
        }
    });

    $('#saveButton').click(function() {
        var name = $('input[name=levelName]', '#saveMenu').val();

        DUST.saveLevel(name);
        
        $('#saveButton').blur();
    });
    
    $('#loadButton').click(function() {
        var name = $('input[name=levelName]', '#saveMenu').val();

        DUST.loadLevel(name);

        $('#loadButton').blur();
    });

    $('#levelName').autocomplete({
        serviceUrl: '/listLevels',
        onSelect: function(suggestion) {
            console.log('user selected', suggestion.value);
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

        if(!DUST.paused) DUST.update(timer.getTime() / 1000);

        DUST.draw();

        timer.reset();
    }
    
    tick();
    
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
