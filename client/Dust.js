var $ = require('jquery-browserify'),
    Vector = require('./Vector'),
    AABB = require('./AABB'),
    World = require('./World'),
    Solid = require('./Solid');

module.exports = Dust;

function Dust() {
    var self = this;

    this.socket = io.connect('http://192.168.1.77:9966');
    this.width  = $('#canvainer').width();
    this.height = $('#canvainer').height();
    this.gl = this.getGL();
    this.world = this.initWorld();
    this.selectionBox = null;

    window.particleArray = [];
    for (var i = 0; i <= this.width; i++) {
        window.particleArray[i] = [];
        for (var j = 0; j <= this.height; j++) {
            window.particleArray[i][j] = 0;
        }
    }
}

Dust.prototype.getGL = function() {
    htmlCanvas = "<canvas width=" + "\"" + this.width + "\"" + "height=" + "\"" + this.height + "\"" + "></canvas>";

    $('#canvainer').append(htmlCanvas);

    return $('canvas').get(0).getContext('webgl');
};

Dust.prototype.initWorld = function() {
    // Define world
    var gravity = new Vector(0.0, 50),
        worldBounds = new AABB(0, 0, this.width, this.height);

    var world = new World({
        forces: gravity,
        bounds: worldBounds
    });

    var solid = new Solid(100, 10, 100, 300);
    world.pushSolid(solid);

    return world;
};

Dust.prototype.updateWorld = function(dt) {
    this.world.update(dt);
};

Dust.prototype.drawWorld = function() {
    var self = this;
};

Dust.prototype.resizeSelection = function(w, h) {
    this.selectionBox.resize(w, h);
};

Dust.prototype.moveSelection = function(vec) {
    this.selectionBox.move(vec);
};

Dust.prototype.drawSelection = function(x, y, w, h) {
    this.selectionBox = new Solid(w, h, x, y);
};

Dust.prototype.spawnSolid = function(x, y, w, h) {
    var s = new Solid(w, h, x, y);
    this.world.pushSolid(s);
};

Dust.prototype.spawnDust = function(x, y) {
    var n = 50,
        area = 10;
    for (var i = 0; i < n; i++) {
        x = Math.round((x - area/2) + area*Math.random());
        y = Math.round((y - area/2) + area*Math.random());
        s = new Vector(x, y);

        if(!this.world.collides(s) && s.within(this.world.bounds)) this.world.pushSand(s);
    }
};

// If a solid exists here, it will be sandified
Dust.prototype.sandifySolid = function(vec) {
    var s = this.world.collides(vec);
    if(s) {
        for (var x = 0; x < s.w; x++) {
            for (var y = 0; y < s.h; y++) {
                var sand = new Vector(x + s.pos.x, y + s.pos.y);
                this.world.pushSand(sand);
            }
        }
        var index = this.world.solids.indexOf(s);
        this.world.solids.splice(index, 1);
    }
};
