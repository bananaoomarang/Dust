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

    // Hack CSS because Jesus man CSS is screwed up
    $('#fps').css('position', 'absolute');
    $('#fps').css('top', $('canvas').position().top + 10);
    $('#fps').css('left', $('canvas').position().left - 50);
    $('#fps').html(0 + 'fps');
    
    $('#menu').css('top', $('canvas').position().top);
    $('#menu').css('left', $('canvas').position().left + DUST.WIDTH + 10);
    
    $('#menu2').css('top', $('canvas').position().top);
    $('#menu2').css('left', $('canvas').position().left + DUST.WIDTH + 10 + 120 + 10); // 120 is the width of the forms
    
    //$('#thumbnail').css('left', $('input[name=levelName]', '#saveMenu').position().left + 10 + 100);
    
    $('#thumbnail').css('top', $('canvas').position().top);
    $('#thumbnail').css('left', $('#fps').position().left - 125 - 10); // 125 is the width of the thumbnail
                    
    $('#paused').hide();
    $('#limitReached').hide();
    $('#selectionBox').hide();
    $('#thumbnail').hide();

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
                    brushType = $('input[name=brushType]:checked', '#menu2').val(),
                    infect = $('input[name=infectant]:checked', '#menu').val(),
                    brushGirth = parseInt($('#brushSize').val());

                if(DUST.dustCount >= DUST.MAX_DUST && type !== 'eraser') {
                    $('#limitReached').show();
                } else {
                    var x = Math.round(e.pageX - offset.left);
                        y = Math.round(e.pageY - offset.top);

                    switch(brushType) {
                        case 'circle':
                            DUST.spawnCircle(x, y, type, brushGirth, infect);
                            break;
                        case 'square':
                            DUST.spawnRect(x - (brushGirth / 2), y - (brushGirth / 2), brushGirth, brushGirth, type, infect);
                            break;
                        case 'boxfill':
                            x = Math.round(e.pageX);
                            y = Math.round(e.pageY);

                            $('#selectionBox').show();
                            $('#selectionBox').css({
                                'top': x,
                                'left': y,
                                'width': 0,
                                'height': 0
                            });
                            break;
                    }

                    $('#canvainer').mousemove(function(e) {
                        if(DUST.dustCount >= DUST.MAX_DUST && type !== 'eraser') {
                            $('#limitReached').show(); 
                        } else {
                            newX = Math.round(e.pageX - offset.left);
                            newY = Math.round(e.pageY - offset.top);

                            switch(brushType) {
                                case 'circle':
                                    DUST.spawnCircle(newX, newY, type, brushGirth, infect);
                                    break;
                                case 'square':
                                    DUST.spawnRect(newX - (brushGirth / 2), newY - (brushGirth / 2), brushGirth, brushGirth, type, infect);
                                    break;
                                case 'boxfill':
                                    newX = Math.round(e.pageX);
                                    newY = Math.round(e.pageY);

                                    var width = Math.abs(newX - x),
                                        height = Math.abs(newY - y);

                                    newX = (newX < x) ? (x - width) : x;
                                    newY = (newY < y) ? (y - height) : y;

                                    $('#selectionBox').css({
                                        'width': width,
                                        'height': height,
                                        'top': newY,
                                        'left': newX
                                    });
                                    break;
                            }
                        }
                    });
                }

                $(document).mouseup(function(e) {
                    $('#canvainer').unbind('mousemove');
                    $('#limitReached').hide();

                    if(brushType === 'boxfill') {
                        var $sb = $('#selectionBox');

                        x = Math.round($sb.position().left - $('canvas').position().left);
                        y = Math.round($sb.position().top - $('canvas').position().top);

                        DUST.spawnRect(x, y, $sb.width(), $sb.height(), type, infect);

                        $sb.hide();
                    }
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
                DUST.dustCount = 0;
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
        DUST.getLevelThumb(name);

        $('#loadButton').blur();
    });

    $('#levelName').autocomplete({
        serviceUrl: '/listLevels',
        onSelect: function(suggestion) {
            console.log('user selected', suggestion.value);
            DUST.getLevelThumb(suggestion.value);
            $('#thumbnail').show();
        }
    });

    $('#levelName').on('input', function(e) {
        $('#thumbnail').hide();
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
}
