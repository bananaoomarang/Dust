var $ = require('jquery-browserify'),
    Vector = require('./Vector'),
    AABB = require('./AABB'),
    World = require('./World'),
    Solid = require('./Solid'),
    PIXI = require('pixi');

module.exports = Dust;

function Dust() {
    var self = this;

    this.socket = io.connect('http://192.168.1.77:9966');
    this.width  = $('#canvainer').width(),
    this.height = $('#canvainer').height(),
    this.renderer = this.createRenderer();
    this.stage = this.setStage();
    this.shapes = new PIXI.Graphics();
    this.world = this.initWorld();
    this.selectionBox = null;

    this.stage.addChild(this.shapes);

    window.particleArray = [];
    for (var i = 0; i <= this.width; i++) {
        window.particleArray[i] = [];
        for (var j = 0; j <= this.height; j++) {
            window.particleArray[i][j] = 0;
        };
    };
    

    $(window).resize(function() {
        self.width = $('#canvainer').width();
        self.height = $('#canvainer').height();
        
        self.resizeRenderer(self.width, self.height);
    });
};

Dust.prototype.createRenderer = function() {
    var renderer = PIXI.autoDetectRenderer(this.width, this.height);
    renderer.view.style.display= 'block';

    $('#canvainer').append(renderer.view);

    return renderer;
}

Dust.prototype.setStage = function() {
    var stage = new PIXI.Stage(0xFFFFFF, true);
    stage.setInteractive(true);


    return stage;
}

Dust.prototype.resizeRenderer = function(w, h) {
    this.renderer.width = w;
    this.renderer.height = h;
}

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
}

Dust.prototype.updateWorld = function(dt) {
    this.world.update(dt);
}

Dust.prototype.drawWorld = function() {
    var self = this;
    
    this.shapes.clear();

    // Draw solids
    for (var i = 0; i < this.world.solids.length; i++) {
        var s = this.world.solids[i];
    
        this.shapes.beginFill(0xFF3300);
        this.shapes.drawRect(s.pos.x, s.pos.y, s.w, s.h);
        this.shapes.endFill();
    };

    // Draw sand
    for (var i = 0; i < this.world.sands.length; i++) {
        var s = this.world.sands[i];

        this.shapes.beginFill(0xD4A519);
        this.shapes.drawRect(s.x, s.y, 1, 1);
        this.shapes.endFill();
    };

    // Draw Selection Box (if one exists)
    if(this.selectionBox !== null) {
        this.shapes.beginFill(0xB3B3B3);
        this.shapes.drawRect(this.selectionBox.pos.x, this.selectionBox.pos.y, this.selectionBox.w, this.selectionBox.h);
        this.shapes.endFill();
    }
    
    this.renderer.render(this.stage);
}

Dust.prototype.resizeSelection = function(w, h) {
    this.selectionBox.resize(w, h);
}

Dust.prototype.moveSelection = function(vec) {
    this.selectionBox.move(vec);
}

Dust.prototype.drawSelection = function(x, y, w, h) {
    this.selectionBox = new Solid(w, h, x, y);
}

Dust.prototype.spawnSolid = function(x, y, w, h) {
    var s = new Solid(w, h, x, y);
    this.world.pushSolid(s);
}

Dust.prototype.spawnDust = function(x, y) {
    var n = 50,
        area = 10;
    for (var i = 0; i < n; i++) {
        var x = Math.round((x - area/2) + area*Math.random()),
            y = Math.round((y - area/2) + area*Math.random()),
            s = new Vector(x, y);

        if(!this.world.collides(s) && s.within(this.world.bounds)) this.world.pushSand(s);
    };
}

// If a solid exists here, it will be sandified
Dust.prototype.sandifySolid = function(vec) {
    var s = this.world.collides(vec);
    if(s) {
        for (var x = 0; x < s.w; x++) {
            for (var y = 0; y < s.h; y++) {
                var sand = new Vector(x + s.pos.x, y + s.pos.y);
                this.world.pushSand(sand);
            };
        };
        var index = this.world.solids.indexOf(s);
        this.world.solids.splice(index, 1)
    }
}
