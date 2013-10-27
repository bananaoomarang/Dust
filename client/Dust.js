var b2d = require('box2d'),
    $ = require('jquery-browserify')

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
    var worldAABB = new b2d.b2AABB();
    worldAABB.lowerBound.Set(-10000.0, -10000.0);
    worldAABB.upperBound.Set(10000.0, 10000.0);

    var gravity = new b2d.b2Vec2(0.0, 9.8);
    var doSleep = true;

    var world = new b2d.b2World(worldAABB, gravity, doSleep);
    console.log(world);

    // Ground Box
    var groundBodyDef = new b2d.b2BodyDef();
    groundBodyDef.position.Set(0, this.height - 100);

    var groundBody = world.CreateBody(groundBodyDef);

    var groundShapeDef = new b2d.b2PolygonDef();
    groundShapeDef.SetAsBox(this.width, 1.0);

    groundBody.CreateShape(groundShapeDef);

    groundBody.w = this.width;
    groundBody.h = 1;
    
    // Top Box
    var topBodyDef = new b2d.b2BodyDef();
    topBodyDef.position.Set(0, 100);

    var topBody = world.CreateBody(topBodyDef);

    var topShapeDef = new b2d.b2PolygonDef();
    topShapeDef.SetAsBox(this.width, 1.0);

    topBody.CreateShape(topShapeDef);

    topBody.w = this.width;
    topBody.h = 1;
    
    // Left Box
    var leftBodyDef = new b2d.b2BodyDef();
    leftBodyDef.position.Set(100, this.height);

    var leftBody = world.CreateBody(leftBodyDef);

    var leftShapeDef = new b2d.b2PolygonDef();
    leftShapeDef.SetAsBox(1, this.height);

    leftBody.CreateShape(leftShapeDef);

    leftBody.w = 1;
    leftBody.h = this.height;
    
    // Left Box
    var rightBodyDef = new b2d.b2BodyDef();
    rightBodyDef.position.Set(this.width - 100, this.height);

    var rightBody = world.CreateBody(rightBodyDef);

    var rightShapeDef = new b2d.b2PolygonDef();
    rightShapeDef.SetAsBox(1, this.height);

    rightBody.CreateShape(rightShapeDef);

    rightBody.w = 1;
    rightBody.h = this.height;

    return world;
}

Dust.prototype.updateWorld = function() {
    var timeStep = 1.0 / 60.0;

    var iterations = 10;

    this.world.Step(timeStep, iterations);
}

Dust.prototype.drawWorld = function() {
    var self = this;

    this.renderer.clearRect(0, 0, this.width, this.height);

    for (var j = this.world.m_jointList; j; j = j.m_next) {
        drawJoint(j, this.renderer);
    }

    for (var b = this.world.m_bodyList; b; b = b.m_next) {
        for (var s = b.GetShapeList(); s != null; s = s.GetNext()) {
            drawShape(s, this.renderer);
        }
    }

    function drawJoint(joint, context) {
        var b1 = joint.m_body1;
        var b2 = joint.m_body2;
        var x1 = b1.m_position;
        var x2 = b2.m_position;
        var p1 = joint.GetAnchor1();
        var p2 = joint.GetAnchor2();
        context.strokeStyle = '#00eeee';
        context.beginPath();

        switch (joint.m_type) {
            case b2Joint.e_distanceJoint:
                context.moveTo(p1.x, p1.y);
                context.lineTo(p2.x, p2.y);
                break;

            default:
                if (b1 == self.world.m_groundBody) {
                    context.moveTo(p1.x, p1.y);
                    context.lineTo(x2.x, x2.y);
                }
                else if (b2 == self.world.m_groundBody) {
                    context.moveTo(p1.x, p1.y);
                    context.lineTo(x1.x, x1.y);
                }
                else {
                    context.moveTo(x1.x, x1.y);
                    context.lineTo(p1.x, p1.y);
                    context.lineTo(x2.x, x2.y);
                    context.lineTo(p2.x, p2.y);
                }
                break;
        }
        context.stroke();
    }
    function drawShape(shape, ctx) {
        var b = shape.m_body,
            t = b.m_xf;

        ctx.fillStyle = "#000000";
        ctx.translate(t.position.x, t.position.y);
        ctx.rotate(b.GetAngle());
        ctx.fillRect(-b.w, -b.h, b.w*2, b.h*2);
        ctx.rotate(-b.GetAngle());
        ctx.translate(-t.position.x, -t.position.y);
    }
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
