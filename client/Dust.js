var $ = require('jquery-browserify'),
    Vec = require('./Vector'),
    Body = require('./Body'),
    World = require('./World');

module.exports = Dust;

function Dust() {
    var self = this;

    this.socket = io.connect('http://172.16.0.20:9966');
    this.width  = $('#canvainer').width(),
    this.height = $('#canvainer').height(),
    this.renderer = this.createRenderer();
    this.world = this.initWorld();

    $(window).resize(function() {
        self.width = $('#canvainer').width();
        self.height = $('#canvainer').height();
        
        self.resizeRenderer(self.width, self.height);
    });
};

Dust.prototype.createRenderer = function() {
    htmlCanvas = "<canvas width=" + "\"" + this.width + "\"" + "height=" + "\"" + this.height + "\"" + "></canvas>";

    $('#canvainer').append(htmlCanvas);

    return $('canvas').get(0).getContext('2d');
}

Dust.prototype.resizeRenderer = function(w, h) {
    this.renderer.width = w;
    this.renderer.height = h;
}

Dust.prototype.initWorld = function() {
    // Define world
    var gravity = new Vec(0.0, 9.8);

    var world = new World();

    world.addForce(gravity);
    
    var body = new Body(20, 20, 100, 100);
    world.pushBody(body);

    return world;
}

Dust.prototype.updateWorld = function(dt) {
    this.world.update(dt);
}

Dust.prototype.drawWorld = function() {
    var self = this;

    this.renderer.clearRect(0, 0, this.width, this.height);
    this.renderer.strokeStyle = 'black';

    for (var i = 0; i < this.world.bodies.length; i++) {
        var b = this.world.bodies[i];
        console.log(b);
        this.renderer.fillRect(b.pos.x, b.pos.y, b.w, b.h);
    };
}

Dust.prototype.spawnDust = function(x, y) {
    console.log(this.world.m_bodyCount);
    var bodyDef = new b2d.b2BodyDef();
    bodyDef.position.Set(x, y);

    var body = this.world.CreateBody(bodyDef);
    
    if(this.world.m_bodyCount === 520 || this.world.m_bodyCount === 500) {
        console.log(this.world.m_broadPhase);
    }

    var shapeDef = new b2d.b2PolygonDef();
    shapeDef.SetAsBox(1, 1);
    shapeDef.density = 1.0;
    shapeDef.friction = 0.3;
    body.CreateShape(shapeDef);
    body.SetMassFromShapes();
    body.w = 1;
    body.h = 1;
}
