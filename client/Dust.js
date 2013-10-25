var b2d = require('box2d'),
    $ = require('jquery-browserify')

module.exports = Dust;

function Dust() {
    var self = this;

    this.socket = io.connect('http://172.16.0.20:9966');
    this.width  = $('#canvainer').width().toString(),
    this.height = $('#canvainer').height().toString(),
    this.renderer = this.createRenderer();
    this.world = this.initWorld();

    $(window).resize(function() {
        self.width = $('#canvainer').width().toString();
        self.height = $('#canvainer').height().toString();
        
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

    // Ground Box
    var groundBodyDef = new b2d.b2BodyDef();
    groundBodyDef.position.Set(200.0, 400.0);

    var groundBody = world.CreateBody(groundBodyDef);

    var groundShapeDef = new b2d.b2PolygonDef();
    groundShapeDef.SetAsBox(500.0, 10.0);

    groundBody.CreateShape(groundShapeDef);

    groundBody.w = 500;
    groundBody.h = 10;

    // Dynamic Body
    var bodyDef = new b2d.b2BodyDef();
    bodyDef.position.Set(300.0, 4.0);

    var body = world.CreateBody(bodyDef);

    var shapeDef = new b2d.b2PolygonDef();
    shapeDef.SetAsBox(50.0, 50.0);
    shapeDef.density = 1.0;
    shapeDef.friction = 0.3;
    body.CreateShape(shapeDef);
    body.SetMassFromShapes();
    body.w = 50;
    body.h = 50;

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

DUST.prototype.spawnDust() {
    //TODO
}
