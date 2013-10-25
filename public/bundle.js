;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = Client;

function Client(ip, type) {
    var self = this;

    this.type = type || "spectator";
    this.ip = ip;
};

},{}],2:[function(require,module,exports){
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

},{"box2d":4,"jquery-browserify":5}],3:[function(require,module,exports){
var Client = require('./Client'),
    Dust = require('./Dust'),
    $ = require('jquery-browserify');

$(document).ready(main);

function main() {
    var DUST = new Dust();
    
    var offset = $('canvas').offset();

    $('canvas').on('click', function(e) {

        var x = e.pageX - offset.left,
            y = e.pageY - offset.top;
        
        alert(x + ' ' + y);

    });

    draw();

    DUST.socket.on('client connected', function(data) {
        var ip = "172.16.0.20"

        console.log(data);
    if(data === 1) {
        DUST.client = new Client(ip, "red");
        DUST.client.turn = true;
    } else if(data === 2) {
        DUST.client = new Client(ip, "blue");
    } else if(data > 2) {
        DUST.client = new Client(ip);
    }

    });

    function draw() {
        requestAnimationFrame(draw);

        DUST.updateWorld();

        DUST.drawWorld();
    }
}

},{"./Client":1,"./Dust":2,"jquery-browserify":5}],4:[function(require,module,exports){
/**
 * Copyright 2010 Josh Adell. All rights reserved.
 *
 * Based on Box2d2 -  Jonas Wagner
 *   http://29a.ch/2010/4/17/box2d-2-flash-ported-javascript
 *
 * This software is provided 'as-is', without any express or
 * implied warranty. In no event will the authors be held liable 
 * for any damages arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose, 
 * including commercial applications, and to alter it and redistribute 
 * it freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you 
 *       must not claim that you wrote the original software. If you 
 *       use this software in a product, an acknowledgment in the product 
 *       documentation would be appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must 
 *       not be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source 
 *       distribution.
 */

function extend(a, b) {
    for(var c in b) {
        a[c] = b[c];
    }
}


var b2Settings = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Settings.prototype.__constructor = function(){}
b2Settings.prototype.__varz = function(){
}
b2Settings.USHRT_MAX =  0x0000ffff;
b2Settings.b2_pi =  Math.PI;
b2Settings.b2_maxManifoldPoints =  2;
b2Settings.b2_maxPolygonVertices =  8;
b2Settings.b2_maxProxies =  512;
b2Settings.b2_maxPairs =  8 * b2Settings.b2_maxProxies;
b2Settings.b2_linearSlop =  0.005;
b2Settings.b2_angularSlop =  2.0 / 180.0 * b2Settings.b2_pi;
b2Settings.b2_toiSlop =  8.0 * b2Settings.b2_linearSlop;
b2Settings.b2_maxTOIContactsPerIsland =  32;
b2Settings.b2_velocityThreshold =  1.0;
b2Settings.b2_maxLinearCorrection =  0.2;
b2Settings.b2_maxAngularCorrection =  8.0 / 180.0 * b2Settings.b2_pi;
b2Settings.b2_maxLinearVelocity =  200.0;
b2Settings.b2_maxLinearVelocitySquared =  b2Settings.b2_maxLinearVelocity * b2Settings.b2_maxLinearVelocity;
b2Settings.b2_maxAngularVelocity =  250.0;
b2Settings.b2_maxAngularVelocitySquared =  b2Settings.b2_maxAngularVelocity * b2Settings.b2_maxAngularVelocity;
b2Settings.b2_contactBaumgarte =  0.2;
b2Settings.b2_timeToSleep =  0.5;
b2Settings.b2_linearSleepTolerance =  0.01;
b2Settings.b2_angularSleepTolerance =  2.0 / 180.0;
b2Settings.b2Assert = function (a) {
		if (!a){
			var nullVec;
			nullVec.x++;
		}
	}
exports.b2Settings = b2Settings;


var b2Color = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Color.prototype.__constructor = function (rr, gg, bb) {
		this._r = parseInt(255 * b2Math.b2Clamp(rr, 0.0, 1.0));
		this._g = parseInt(255 * b2Math.b2Clamp(gg, 0.0, 1.0));
		this._b = parseInt(255 * b2Math.b2Clamp(bb, 0.0, 1.0));
	}
b2Color.prototype.__varz = function(){
}
b2Color.prototype._r =  0;
b2Color.prototype._g =  0;
b2Color.prototype._b =  0;
b2Color.prototype.Set = function (rr, gg, bb) {
		this._r = parseInt(255 * b2Math.b2Clamp(rr, 0.0, 1.0));
		this._g = parseInt(255 * b2Math.b2Clamp(gg, 0.0, 1.0));
		this._b = parseInt(255 * b2Math.b2Clamp(bb, 0.0, 1.0));
	}
b2Color.prototype.set = function (rr) {
		this._r = parseInt(255 * b2Math.b2Clamp(rr, 0.0, 1.0));
	}
b2Color.prototype.set = function (gg) {
		this._g = parseInt(255 * b2Math.b2Clamp(gg, 0.0, 1.0));
	}
b2Color.prototype.set = function (bb) {
		this._b = parseInt(255 * b2Math.b2Clamp(bb, 0.0, 1.0));
	}
b2Color.prototype.get = function () {
		return (this._r) | (this._g << 8) | (this._b << 16);
	}
exports.b2Color = b2Color;


var b2Vec2 = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Vec2.prototype.__constructor = function (x_, y_) {
    if(arguments.length == 2) {
        this.x=x_; this.y=y_;
    }
}
b2Vec2.prototype.__varz = function(){
}
b2Vec2.Make = function (x_, y_) {
		return new b2Vec2(x_, y_);
	}
b2Vec2.prototype.x =  0;
b2Vec2.prototype.y =  0;
b2Vec2.prototype.SetZero = function () { this.x = 0.0; this.y = 0.0; }
b2Vec2.prototype.Set = function (x_, y_) {this.x=x_; this.y=y_;}
b2Vec2.prototype.SetV = function (v) {this.x=v.x; this.y=v.y;}
b2Vec2.prototype.Negative = function () { return new b2Vec2(-this.x, -this.y); }
b2Vec2.prototype.Copy = function () {
		return new b2Vec2(this.x,this.y);
	}
b2Vec2.prototype.Add = function (v) {
		this.x += v.x; this.y += v.y;
	}
b2Vec2.prototype.Subtract = function (v) {
		this.x -= v.x; this.y -= v.y;
	}
b2Vec2.prototype.Multiply = function (a) {
		this.x *= a; this.y *= a;
	}
b2Vec2.prototype.MulM = function (A) {
		var tX = this.x;
		this.x = A.col1.x * tX + A.col2.x * this.y;
		this.y = A.col1.y * tX + A.col2.y * this.y;
	}
b2Vec2.prototype.MulTM = function (A) {
		var tX = b2Math.b2Dot(this, A.col1);
		this.y = b2Math.b2Dot(this, A.col2);
		this.x = tX;
	}
b2Vec2.prototype.CrossVF = function (s) {
		var tX = this.x;
		this.x = s * this.y;
		this.y = -s * tX;
	}
b2Vec2.prototype.CrossFV = function (s) {
		var tX = this.x;
		this.x = -s * this.y;
		this.y = s * tX;
	}
b2Vec2.prototype.MinV = function (b) {
		this.x = this.x < b.x ? this.x : b.x;
		this.y = this.y < b.y ? this.y : b.y;
	}
b2Vec2.prototype.MaxV = function (b) {
		this.x = this.x > b.x ? this.x : b.x;
		this.y = this.y > b.y ? this.y : b.y;
	}
b2Vec2.prototype.Abs = function () {
		if (this.x < 0) this.x = -this.x;
		if (this.y < 0) this.y = -this.y;
	}
b2Vec2.prototype.Length = function () {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
b2Vec2.prototype.LengthSquared = function () {
		return (this.x * this.x + this.y * this.y);
	}
b2Vec2.prototype.Normalize = function () {
		var length = Math.sqrt(this.x * this.x + this.y * this.y);
		if (length < Number.MIN_VALUE)
		{
			return 0.0;
		}
		var invLength = 1.0 / length;
		this.x *= invLength;
		this.y *= invLength;
		
		return length;
	}
b2Vec2.prototype.IsValid = function () {
		return b2Math.b2IsValid(this.x) && b2Math.b2IsValid(this.y);
	}
exports.b2Vec2 = b2Vec2;


var b2Mat22 = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Mat22.prototype.__constructor = function (angle, c1, c2) {
		if (c1!=null && c2!=null){
			this.col1.SetV(c1);
			this.col2.SetV(c2);
		}
		else{
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			this.col1.x = c; this.col2.x = -s;
			this.col1.y = s; this.col2.y = c;
		}
	}
b2Mat22.prototype.__varz = function(){
this.col1 =  new b2Vec2();
this.col2 =  new b2Vec2();
}
b2Mat22.prototype.col1 =  new b2Vec2();
b2Mat22.prototype.col2 =  new b2Vec2();
b2Mat22.prototype.Set = function (angle) {
		var c = Math.cos(angle);
		var s = Math.sin(angle);
		this.col1.x = c; this.col2.x = -s;
		this.col1.y = s; this.col2.y = c;
	}
b2Mat22.prototype.SetVV = function (c1, c2) {
		this.col1.SetV(c1);
		this.col2.SetV(c2);
	}
b2Mat22.prototype.Copy = function () {
		return new b2Mat22(0, this.col1, this.col2);
	}
b2Mat22.prototype.SetM = function (m) {
		this.col1.SetV(m.col1);
		this.col2.SetV(m.col2);
	}
b2Mat22.prototype.AddM = function (m) {
		this.col1.x += m.col1.x;
		this.col1.y += m.col1.y;
		this.col2.x += m.col2.x;
		this.col2.y += m.col2.y;
	}
b2Mat22.prototype.SetIdentity = function () {
		this.col1.x = 1.0; this.col2.x = 0.0;
		this.col1.y = 0.0; this.col2.y = 1.0;
	}
b2Mat22.prototype.SetZero = function () {
		this.col1.x = 0.0; this.col2.x = 0.0;
		this.col1.y = 0.0; this.col2.y = 0.0;
	}
b2Mat22.prototype.GetAngle = function () {
		return Math.atan2(this.col1.y, this.col1.x);
	}
b2Mat22.prototype.Invert = function (out) {
		var a = this.col1.x; 
		var b = this.col2.x; 
		var c = this.col1.y; 
		var d = this.col2.y;
		
		var det = a * d - b * c;
		
		det = 1.0 / det;
		out.col1.x = det * d;	out.col2.x = -det * b;
		out.col1.y = -det * c;	out.col2.y = det * a;
		return out;
	}
b2Mat22.prototype.Solve = function (out, bX, bY) {
		
		var a11 = this.col1.x;
		var a12 = this.col2.x;
		var a21 = this.col1.y;
		var a22 = this.col2.y;
		
		var det = a11 * a22 - a12 * a21;
		
		det = 1.0 / det;
		out.x = det * (a22 * bX - a12 * bY);
		out.y = det * (a11 * bY - a21 * bX);
		
		return out;
	}
b2Mat22.prototype.Abs = function () {
		this.col1.Abs();
		this.col2.Abs();
	}
exports.b2Mat22 = b2Mat22;


var b2XForm = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2XForm.prototype.__constructor = function (pos, r) {
		if (pos){
			this.position.SetV(pos);
			this.R.SetM(r);

		}
	}
b2XForm.prototype.__varz = function(){
this.position =  new b2Vec2;
this.R =  new b2Mat22();
}
b2XForm.prototype.position =  new b2Vec2;
b2XForm.prototype.R =  new b2Mat22();
b2XForm.prototype.Initialize = function (pos, r) {
		this.position.SetV(pos);
		this.R.SetM(r);
	}
b2XForm.prototype.SetIdentity = function () {
		this.position.SetZero();
		this.R.SetIdentity();
	}
b2XForm.prototype.Set = function (x) {

		this.position.SetV(x.position);

		this.R.SetM(x.R);

	}
exports.b2XForm = b2XForm;
	
	
var b2Math = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Math.prototype.__constructor = function(){}
b2Math.prototype.__varz = function(){
}
b2Math.b2Vec2_zero =  new b2Vec2(0.0, 0.0);
b2Math.b2Mat22_identity =  new b2Mat22(0, new b2Vec2(1.0, 0.0), new b2Vec2(0.0, 1.0));
b2Math.b2XForm_identity =  new b2XForm(b2Math.b2Vec2_zero, b2Math.b2Mat22_identity);
b2Math.b2IsValid = function (x) {
		return isFinite(x);
	}
b2Math.b2Dot = function (a, b) {
		return a.x * b.x + a.y * b.y;
	}
b2Math.b2CrossVV = function (a, b) {
		return a.x * b.y - a.y * b.x;
	}
b2Math.b2CrossVF = function (a, s) {
		var v = new b2Vec2(s * a.y, -s * a.x);
		return v;
	}
b2Math.b2CrossFV = function (s, a) {
		var v = new b2Vec2(-s * a.y, s * a.x);
		return v;
	}
b2Math.b2MulMV = function (A, v) {
		
		
		var u = new b2Vec2(A.col1.x * v.x + A.col2.x * v.y, A.col1.y * v.x + A.col2.y * v.y);
		return u;
	}
b2Math.b2MulTMV = function (A, v) {
		
		
		var u = new b2Vec2(b2Math.b2Dot(v, A.col1), b2Math.b2Dot(v, A.col2));
		return u;
	}
b2Math.b2MulX = function (T, v) {
		var a = b2Math.b2MulMV(T.R, v);
		a.x += T.position.x;
		a.y += T.position.y;
		
		return a;
	}
b2Math.b2MulXT = function (T, v) {
		var a = b2Math.SubtractVV(v, T.position);
		
		var tX = (a.x * T.R.col1.x + a.y * T.R.col1.y );
		a.y = (a.x * T.R.col2.x + a.y * T.R.col2.y );
		a.x = tX;
		return a;
	}
b2Math.AddVV = function (a, b) {
		var v = new b2Vec2(a.x + b.x, a.y + b.y);
		return v;
	}
b2Math.SubtractVV = function (a, b) {
		var v = new b2Vec2(a.x - b.x, a.y - b.y);
		return v;
	}
b2Math.b2Distance = function (a, b) {
		var cX = a.x-b.x;
		var cY = a.y-b.y;
		return Math.sqrt(cX*cX + cY*cY);
	}
b2Math.b2DistanceSquared = function (a, b) {
		var cX = a.x-b.x;
		var cY = a.y-b.y;
		return (cX*cX + cY*cY);
	}
b2Math.MulFV = function (s, a) {
		var v = new b2Vec2(s * a.x, s * a.y);
		return v;
	}
b2Math.AddMM = function (A, B) {
		var C = new b2Mat22(0, b2Math.AddVV(A.col1, B.col1), b2Math.AddVV(A.col2, B.col2));
		return C;
	}
b2Math.b2MulMM = function (A, B) {
		var C = new b2Mat22(0, b2Math.b2MulMV(A, B.col1), b2Math.b2MulMV(A, B.col2));
		return C;
	}
b2Math.b2MulTMM = function (A, B) {
		var c1 = new b2Vec2(b2Math.b2Dot(A.col1, B.col1), b2Math.b2Dot(A.col2, B.col1));
		var c2 = new b2Vec2(b2Math.b2Dot(A.col1, B.col2), b2Math.b2Dot(A.col2, B.col2));
		var C = new b2Mat22(0, c1, c2);
		return C;
	}
b2Math.b2Abs = function (a) {
		return a > 0.0 ? a : -a;
	}
b2Math.b2AbsV = function (a) {
		var b = new b2Vec2(b2Math.b2Abs(a.x), b2Math.b2Abs(a.y));
		return b;
	}
b2Math.b2AbsM = function (A) {
		var B = new b2Mat22(0, b2Math.b2AbsV(A.col1), b2Math.b2AbsV(A.col2));
		return B;
	}
b2Math.b2Min = function (a, b) {
		return a < b ? a : b;
	}
b2Math.b2MinV = function (a, b) {
		var c = new b2Vec2(b2Math.b2Min(a.x, b.x), b2Math.b2Min(a.y, b.y));
		return c;
	}
b2Math.b2Max = function (a, b) {
		return a > b ? a : b;
	}
b2Math.b2MaxV = function (a, b) {
		var c = new b2Vec2(b2Math.b2Max(a.x, b.x), b2Math.b2Max(a.y, b.y));
		return c;
	}
b2Math.b2Clamp = function (a, low, high) {
		return b2Math.b2Max(low, b2Math.b2Min(a, high));
	}
b2Math.b2ClampV = function (a, low, high) {
		return b2Math.b2MaxV(low, b2Math.b2MinV(a, high));
	}
b2Math.b2Swap = function (a, b) {
		var tmp = a[0];
		a[0] = b[0];
		b[0] = tmp;
	}
b2Math.b2Random = function () {
		return Math.random() * 2 - 1;
	}
b2Math.b2RandomRange = function (lo, hi) {
		var r = Math.random();
		r = (hi - lo) * r + lo;
		return r;
	}
b2Math.b2NextPowerOfTwo = function (x) {
		x |= (x >> 1) & 0x7FFFFFFF;
		x |= (x >> 2) & 0x3FFFFFFF;
		x |= (x >> 4) & 0x0FFFFFFF;
		x |= (x >> 8) & 0x00FFFFFF;
		x |= (x >> 16)& 0x0000FFFF;
		return x + 1;
	}
b2Math.b2IsPowerOfTwo = function (x) {
		var result = x > 0 && (x & (x - 1)) == 0;
		return result;
	}
exports.b2Math = b2Math;


var b2Sweep = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Sweep.prototype.__constructor = function(){}
b2Sweep.prototype.__varz = function(){
this.localCenter =  new b2Vec2();
this.c0 =  new b2Vec2;
this.c =  new b2Vec2();
}
b2Sweep.prototype.localCenter =  new b2Vec2();
b2Sweep.prototype.c0 =  new b2Vec2;
b2Sweep.prototype.c =  new b2Vec2();
b2Sweep.prototype.a0 =  null;
b2Sweep.prototype.a =  null;
b2Sweep.prototype.t0 =  null;
b2Sweep.prototype.GetXForm = function (xf, t) {
		
		
		if (1.0 - this.t0 > Number.MIN_VALUE)
		{
			var alpha = (t - this.t0) / (1.0 - this.t0);
			xf.position.x = (1.0 - alpha) * this.c0.x + alpha * this.c.x;
			xf.position.y = (1.0 - alpha) * this.c0.y + alpha * this.c.y;
			var angle = (1.0 - alpha) * this.a0 + alpha * this.a;
			xf.R.Set(angle);
		}
		else
		{
			xf.position.SetV(this.c);
			xf.R.Set(this.a);
		}
		
		
		
		var tMat = xf.R;
		xf.position.x -= (tMat.col1.x * this.localCenter.x + tMat.col2.x * this.localCenter.y);
		xf.position.y -= (tMat.col1.y * this.localCenter.x + tMat.col2.y * this.localCenter.y);
		
	}
b2Sweep.prototype.Advance = function (t) {
		if (this.t0 < t && 1.0 - this.t0 > Number.MIN_VALUE)
		{
			var alpha = (t - this.t0) / (1.0 - this.t0);
			
			this.c0.x = (1.0 - alpha) * this.c0.x + alpha * this.c.x;
			this.c0.y = (1.0 - alpha) * this.c0.y + alpha * this.c.y;
			this.a0 = (1.0 - alpha) * this.a0 + alpha * this.a;
			this.t0 = t;
		}
	}
exports.b2Sweep = b2Sweep;
	

var b2Pair = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Pair.prototype.__constructor = function(){}
b2Pair.prototype.__varz = function(){
}
b2Pair.b2_nullPair =  b2Settings.USHRT_MAX;
b2Pair.b2_nullProxy =  b2Settings.USHRT_MAX;
b2Pair.b2_tableCapacity =  b2Settings.b2_maxPairs;
b2Pair.b2_tableMask =  b2Pair.b2_tableCapacity - 1;
b2Pair.e_pairBuffered =  0x0001;
b2Pair.e_pairRemoved =  0x0002;
b2Pair.e_pairFinal =  0x0004;
b2Pair.prototype.userData =  null;
b2Pair.prototype.proxyId1 =  0;
b2Pair.prototype.proxyId2 =  0;
b2Pair.prototype.next =  0;
b2Pair.prototype.status =  0;
b2Pair.prototype.SetBuffered = function () { this.status |= b2Pair.e_pairBuffered; }
b2Pair.prototype.ClearBuffered = function () { this.status &= ~b2Pair.e_pairBuffered; }
b2Pair.prototype.IsBuffered = function () { return (this.status & b2Pair.e_pairBuffered) == b2Pair.e_pairBuffered; }
b2Pair.prototype.SetRemoved = function () { this.status |= b2Pair.e_pairRemoved; }
b2Pair.prototype.ClearRemoved = function () { this.status &= ~b2Pair.e_pairRemoved; }
b2Pair.prototype.IsRemoved = function () { return (this.status & b2Pair.e_pairRemoved) == b2Pair.e_pairRemoved; }
b2Pair.prototype.SetFinal = function () { this.status |= b2Pair.e_pairFinal; }
b2Pair.prototype.IsFinal = function () { return (this.status & b2Pair.e_pairFinal) == b2Pair.e_pairFinal; }
exports.b2Pair = b2Pair;


var b2PairCallback = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2PairCallback.prototype.__constructor = function(){}
b2PairCallback.prototype.__varz = function(){
}
b2PairCallback.prototype.PairAdded = function (proxyUserData1, proxyUserData2) {return null}
b2PairCallback.prototype.PairRemoved = function (proxyUserData1, proxyUserData2, pairUserData) {}
exports.b2PairCallback = b2PairCallback;


var b2PairManager = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2PairManager.prototype.__constructor = function () {
		var i = 0;
		
		
		this.m_hashTable = new Array(b2Pair.b2_tableCapacity);
		for (i = 0; i < b2Pair.b2_tableCapacity; ++i)
		{
			this.m_hashTable[i] = b2Pair.b2_nullPair;
		}
		this.m_pairs = new Array(b2Settings.b2_maxPairs);
		for (i = 0; i < b2Settings.b2_maxPairs; ++i)
		{
			this.m_pairs[i] = new b2Pair();
		}
		this.m_pairBuffer = new Array(b2Settings.b2_maxPairs);
		for (i = 0; i < b2Settings.b2_maxPairs; ++i)
		{
			this.m_pairBuffer[i] = new b2BufferedPair();
		}
		
		for (i = 0; i < b2Settings.b2_maxPairs; ++i)
		{
			this.m_pairs[i].proxyId1 = b2Pair.b2_nullProxy;
			this.m_pairs[i].proxyId2 = b2Pair.b2_nullProxy;
			this.m_pairs[i].userData = null;
			this.m_pairs[i].status = 0;
			this.m_pairs[i].next = (i + 1);
		}
		this.m_pairs[parseInt(b2Settings.b2_maxPairs-1)].next = b2Pair.b2_nullPair;
		this.m_pairCount = 0;
		this.m_pairBufferCount = 0;
	}
b2PairManager.prototype.__varz = function(){
}
b2PairManager.Hash = function (proxyId1, proxyId2) {
		var key = ((proxyId2 << 16) & 0xffff0000) | proxyId1;
		key = ~key + ((key << 15) & 0xFFFF8000);
		key = key ^ ((key >> 12) & 0x000fffff);
		key = key + ((key << 2) & 0xFFFFFFFC);
		key = key ^ ((key >> 4) & 0x0fffffff);
		key = key * 2057;
		key = key ^ ((key >> 16) % 65535);
		return key;
	}
b2PairManager.Equals = function (pair, proxyId1, proxyId2) {
		return (pair.proxyId1 == proxyId1 && pair.proxyId2 == proxyId2);
	}
b2PairManager.EqualsPair = function (pair1, pair2) {
		return pair1.proxyId1 == pair2.proxyId1 && pair1.proxyId2 == pair2.proxyId2;
	}
b2PairManager.prototype.m_broadPhase =  null;
b2PairManager.prototype.m_callback =  null;
b2PairManager.prototype.m_pairs =  null;
b2PairManager.prototype.m_freePair =  0;
b2PairManager.prototype.m_pairCount =  0;
b2PairManager.prototype.m_pairBuffer =  null;
b2PairManager.prototype.m_pairBufferCount =  0;
b2PairManager.prototype.m_hashTable =  null;
b2PairManager.prototype.AddPair = function (proxyId1, proxyId2) {
		
		if (proxyId1 > proxyId2){
			var temp = proxyId1;
			proxyId1 = proxyId2;
			proxyId2 = temp;
			
		}
		
		var hash = b2PairManager.Hash(proxyId1, proxyId2) & b2Pair.b2_tableMask;
		
		
		var pair = pair = this.FindHash(proxyId1, proxyId2, hash);
		
		if (pair != null)
		{
			return pair;
		}
		
		
		
		var pIndex = this.m_freePair;
		pair = this.m_pairs[pIndex];
		this.m_freePair = pair.next;
		
		pair.proxyId1 = proxyId1;
		pair.proxyId2 = proxyId2;
		pair.status = 0;
		pair.userData = null;
		pair.next = this.m_hashTable[hash];
		
		this.m_hashTable[hash] = pIndex;
		
		++this.m_pairCount;
		
		return pair;
	}
b2PairManager.prototype.RemovePair = function (proxyId1, proxyId2) {
		var pair;
		
		
		
		if (proxyId1 > proxyId2){
			var temp = proxyId1;
			proxyId1 = proxyId2;
			proxyId2 = temp;
			
		}
		
		var hash = b2PairManager.Hash(proxyId1, proxyId2) & b2Pair.b2_tableMask;
		
		var node = this.m_hashTable[hash];
		var pNode = null;
		
		while (node != b2Pair.b2_nullPair)
		{
			if (b2PairManager.Equals(this.m_pairs[node], proxyId1, proxyId2))
			{
				var index = node;
				
				
				pair = this.m_pairs[node];
				if (pNode){
					pNode.next = pair.next;
				}
				else{
					this.m_hashTable[hash] = pair.next;
				}
				
				pair = this.m_pairs[ index ];
				var userData = pair.userData;
				
				
				pair.next = this.m_freePair;
				pair.proxyId1 = b2Pair.b2_nullProxy;
				pair.proxyId2 = b2Pair.b2_nullProxy;
				pair.userData = null;
				pair.status = 0;
				
				this.m_freePair = index;
				--this.m_pairCount;
				return userData;
			}
			else
			{
				
				pNode = this.m_pairs[node];
				node = pNode.next;
			}
		}
		
		
		return null;
	}
b2PairManager.prototype.Find = function (proxyId1, proxyId2) {
		
		if (proxyId1 > proxyId2){
			var temp = proxyId1;
			proxyId1 = proxyId2;
			proxyId2 = temp;
			
		}
		
		var hash = b2PairManager.Hash(proxyId1, proxyId2) & b2Pair.b2_tableMask;
		
		return this.FindHash(proxyId1, proxyId2, hash);
	}
b2PairManager.prototype.FindHash = function (proxyId1, proxyId2, hash) {
		var pair;
		var index = this.m_hashTable[hash];
		
		pair = this.m_pairs[index];
		while( index != b2Pair.b2_nullPair && b2PairManager.Equals(pair, proxyId1, proxyId2) == false)
		{
			index = pair.next;
			pair = this.m_pairs[index];
		}
		
		if ( index == b2Pair.b2_nullPair )
		{
			return null;
		}
		
		
		
		return pair;
	}
b2PairManager.prototype.ValidateBuffer = function () {
		
	}
b2PairManager.prototype.ValidateTable = function () {
		
	}
b2PairManager.prototype.Initialize = function (broadPhase, callback) {
		this.m_broadPhase = broadPhase;
		this.m_callback = callback;
	}
b2PairManager.prototype.AddBufferedPair = function (proxyId1, proxyId2) {
		var bufferedPair;
		
		
		
		var pair = this.AddPair(proxyId1, proxyId2);
		
		
		if (pair.IsBuffered() == false)
		{
			
			
			
			
			pair.SetBuffered();
			bufferedPair = this.m_pairBuffer[this.m_pairBufferCount];
			bufferedPair.proxyId1 = pair.proxyId1;
			bufferedPair.proxyId2 = pair.proxyId2;
			++this.m_pairBufferCount;
			
			
		}
		
		
		pair.ClearRemoved();
		
		if (b2BroadPhase.s_validate)
		{
			this.ValidateBuffer();
		}
	}
b2PairManager.prototype.RemoveBufferedPair = function (proxyId1, proxyId2) {
		var bufferedPair;
		
		
		
		
		var pair = this.Find(proxyId1, proxyId2);
		
		if (pair == null)
		{
			
			return;
		}
		
		
		if (pair.IsBuffered() == false)
		{
			
			
			
			pair.SetBuffered();
			bufferedPair = this.m_pairBuffer[this.m_pairBufferCount];
			bufferedPair.proxyId1 = pair.proxyId1;
			bufferedPair.proxyId2 = pair.proxyId2;
			++this.m_pairBufferCount;
			
			
		}
		
		pair.SetRemoved();
		
		if (b2BroadPhase.s_validate)
		{
			this.ValidateBuffer();
		}
	}
b2PairManager.prototype.Commit = function () {
		var bufferedPair;
		var i = 0;
		
		var removeCount = 0;
		
		var proxies = this.m_broadPhase.m_proxyPool;
		
		for (i = 0; i < this.m_pairBufferCount; ++i)
		{
			bufferedPair = this.m_pairBuffer[i];
			var pair = this.Find(bufferedPair.proxyId1, bufferedPair.proxyId2);
			
			pair.ClearBuffered();
			
			
			
			var proxy1 = proxies[ pair.proxyId1 ];
			var proxy2 = proxies[ pair.proxyId2 ];
			
			
			
			
			if (pair.IsRemoved())
			{
				
				
				
				if (pair.IsFinal() == true)
				{
					this.m_callback.PairRemoved(proxy1.userData, proxy2.userData, pair.userData);
				}
				
				
				bufferedPair = this.m_pairBuffer[removeCount];
				bufferedPair.proxyId1 = pair.proxyId1;
				bufferedPair.proxyId2 = pair.proxyId2;
				++removeCount;
			}
			else
			{
				
				
				if (pair.IsFinal() == false)
				{
					pair.userData = this.m_callback.PairAdded(proxy1.userData, proxy2.userData);
					pair.SetFinal();
				}
			}
		}
		
		for (i = 0; i < removeCount; ++i)
		{
			bufferedPair = this.m_pairBuffer[i]
			this.RemovePair(bufferedPair.proxyId1, bufferedPair.proxyId2);
		}
		
		this.m_pairBufferCount = 0;
		
		if (b2BroadPhase.s_validate)
		{
			this.ValidateTable();
		}	
	}
exports.b2PairManager = b2PairManager;
	
	
var b2BufferedPair = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2BufferedPair.prototype.__constructor = function(){}
b2BufferedPair.prototype.__varz = function(){
}
b2BufferedPair.prototype.proxyId1 =  0;
b2BufferedPair.prototype.proxyId2 =  0;
exports.b2BufferedPair = b2BufferedPair;
	

var b2AABB = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2AABB.prototype.__constructor = function(){}
b2AABB.prototype.__varz = function(){
this.lowerBound =  new b2Vec2();
this.upperBound =  new b2Vec2();
}
b2AABB.prototype.lowerBound =  new b2Vec2();
b2AABB.prototype.upperBound =  new b2Vec2();
b2AABB.prototype.IsValid = function () {
		
		var dX = this.upperBound.x - this.lowerBound.x;
		var dY = this.upperBound.y - this.lowerBound.y;
		var valid = dX >= 0.0 && dY >= 0.0;
		valid = valid && this.lowerBound.IsValid() && this.upperBound.IsValid();
		return valid;
	}
exports.b2AABB = b2AABB;
	
	
var b2Manifold = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Manifold.prototype.__constructor = function () {
		this.points = new Array(b2Settings.b2_maxManifoldPoints);
		for (var i = 0; i < b2Settings.b2_maxManifoldPoints; i++){
			this.points[i] = new b2ManifoldPoint();
		}
		this.normal = new b2Vec2();
	}
b2Manifold.prototype.__varz = function(){
}
b2Manifold.prototype.points =  null;
b2Manifold.prototype.normal =  null;
b2Manifold.prototype.pointCount =  0;
b2Manifold.prototype.Reset = function () {
		for (var i = 0; i < b2Settings.b2_maxManifoldPoints; i++){
			(this.points[i]).Reset();
		}
		this.normal.SetZero();
		this.pointCount = 0;
	}
b2Manifold.prototype.Set = function (m) {
		this.pointCount = m.pointCount;
		for (var i = 0; i < b2Settings.b2_maxManifoldPoints; i++){
			(this.points[i]).Set(m.points[i]);
		}
		this.normal.SetV(m.normal);
	}	
exports.b2Manifold = b2Manifold;


var Features = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
Features.prototype = {
    get referenceEdge() {
        return this._referenceEdge;
    },
    set referenceEdge(value) {
		this._referenceEdge = value;
		this._m_id._key = (this._m_id._key & 0xffffff00) | (this._referenceEdge & 0x000000ff);
    },
    get incidentEdge() {
        return this._incidentEdge;
    },
    set incidentEdge(value) {
		this._incidentEdge = value;
		this._m_id._key = (this._m_id._key & 0xffff00ff) | ((this._incidentEdge << 8) & 0x0000ff00);
    },
    set incidentVertex(value) {
		this._incidentVertex = value;
		this._m_id._key = (this._m_id._key & 0xff00ffff) | ((this._incidentVertex << 16) & 0x00ff0000);
    },
    get incidentVertex() {
        return this._incidentVertex;
    },
    set flip(value) {
		this._flip = value;
		this._m_id._key = (this._m_id._key & 0x00ffffff) | ((this._flip << 24) & 0xff000000);
    },
    get flip() {
        return this._flip;
    }
}
Features.prototype.__constructor = function(){}
Features.prototype.__varz = function(){
}
Features.prototype._referenceEdge =  0;
Features.prototype._incidentEdge =  0;
Features.prototype._incidentVertex =  0;
Features.prototype._flip =  0;
Features.prototype._m_id =  null;
exports.Features = Features;


var b2ContactID = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ContactID.prototype = {
    get key() {
        return this._key;
    },
    set key(value) {
		this._key = value;
		this.features._referenceEdge = this._key & 0x000000ff;
		this.features._incidentEdge = ((this._key & 0x0000ff00) >> 8) & 0x000000ff;
		this.features._incidentVertex = ((this._key & 0x00ff0000) >> 16) & 0x000000ff;
		this.features._flip = ((this._key & 0xff000000) >> 24) & 0x000000ff;
    }
}
b2ContactID.prototype.__constructor = function () {
		this.features._m_id = this;
}
b2ContactID.prototype.__varz = function(){
    this.features =  new Features();
}
b2ContactID.prototype.features =  new Features();
b2ContactID.prototype._key =  0;
b2ContactID.prototype.Set = function (id) {
    this.key = id._key;
}
b2ContactID.prototype.Copy = function () {
    var id = new b2ContactID();
    id.key = this._key;
    return id;
}
exports.b2ContactID = b2ContactID;


var b2ManifoldPoint = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ManifoldPoint.prototype.__constructor = function(){}
b2ManifoldPoint.prototype.__varz = function(){
this.localPoint1 =  new b2Vec2();
this.localPoint2 =  new b2Vec2();
this.id =  new b2ContactID();
}
b2ManifoldPoint.prototype.localPoint1 =  new b2Vec2();
b2ManifoldPoint.prototype.localPoint2 =  new b2Vec2();
b2ManifoldPoint.prototype.separation =  null;
b2ManifoldPoint.prototype.normalImpulse =  null;
b2ManifoldPoint.prototype.tangentImpulse =  null;
b2ManifoldPoint.prototype.id =  new b2ContactID();
b2ManifoldPoint.prototype.Reset = function () {
		this.localPoint1.SetZero();
		this.localPoint2.SetZero();
		this.separation = 0.0;
		this.normalImpulse = 0.0;
		this.tangentImpulse = 0.0;
		this.id.key = 0;
	}
b2ManifoldPoint.prototype.Set = function (m) {
		this.localPoint1.SetV(m.localPoint1);
		this.localPoint2.SetV(m.localPoint2);
		this.separation = m.separation;
		this.normalImpulse = m.normalImpulse;
		this.tangentImpulse = m.tangentImpulse;
		this.id.key = m.id.key;
	}
exports.b2ManifoldPoint = b2ManifoldPoint;
	
	
var b2Point = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Point.prototype.__constructor = function(){}
b2Point.prototype.__varz = function(){
this.p =  new b2Vec2();
}
b2Point.prototype.p =  new b2Vec2();
b2Point.prototype.Support = function (xf, vX, vY) {
		return this.p;
	}
b2Point.prototype.GetFirstVertex = function (xf) {
		return this.p;
	}
exports.b2Point = b2Point;
	
	
var b2Bound = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Bound.prototype.__constructor = function(){}
b2Bound.prototype.__varz = function(){
}
b2Bound.prototype.value =  0;
b2Bound.prototype.proxyId =  0;
b2Bound.prototype.stabbingCount =  0;
b2Bound.prototype.IsLower = function () { return (this.value & 1) == 0; }
b2Bound.prototype.IsUpper = function () { return (this.value & 1) == 1; }
b2Bound.prototype.Swap = function (b) {
		var tempValue = this.value;
		var tempProxyId = this.proxyId;
		var tempStabbingCount = this.stabbingCount;
		
		this.value = b.value;
		this.proxyId = b.proxyId;
		this.stabbingCount = b.stabbingCount;
		
		b.value = tempValue;
		b.proxyId = tempProxyId;
		b.stabbingCount = tempStabbingCount;
	}
exports.b2Bound = b2Bound;
	
	
var b2BoundValues = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2BoundValues.prototype.__constructor = function(){}
b2BoundValues.prototype.__varz = function(){
this.lowerValues =  [0,0];
this.upperValues =  [0,0];
}
b2BoundValues.prototype.lowerValues =  [0,0];
b2BoundValues.prototype.upperValues =  [0,0];
exports.b2BoundValues = b2BoundValues;


var b2Collision = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Collision.prototype.__constructor = function(){}
b2Collision.prototype.__varz = function(){
}
b2Collision.b2_nullFeature =  0x000000ff;
b2Collision.b2CollidePolyTempVec =  new b2Vec2();
b2Collision.ClipSegmentToLine = function (vOut, vIn, normal, offset) {
		var cv;
		
		
		var numOut = 0;
		
		cv = vIn[0];
		var vIn0 = cv.v;
		cv = vIn[1];
		var vIn1 = cv.v;
		
		
		var distance0 = b2Math.b2Dot(normal, vIn0) - offset;
		var distance1 = b2Math.b2Dot(normal, vIn1) - offset;
		
		
		if (distance0 <= 0.0) vOut[numOut++] = vIn[0];
		if (distance1 <= 0.0) vOut[numOut++] = vIn[1];
		
		
		if (distance0 * distance1 < 0.0)
		{
			
			var interp = distance0 / (distance0 - distance1);
			
			
			cv = vOut[numOut];
			var tVec = cv.v;
			tVec.x = vIn0.x + interp * (vIn1.x - vIn0.x);
			tVec.y = vIn0.y + interp * (vIn1.y - vIn0.y);
			cv = vOut[numOut];
			var cv2;
			if (distance0 > 0.0)
			{
				cv2 = vIn[0];
				cv.id = cv2.id;
			}
			else
			{
				cv2 = vIn[1];
				cv.id = cv2.id;
			}
			++numOut;
		}
		
		return numOut;
	}
b2Collision.EdgeSeparation = function (	poly1, xf1, edge1, 
											poly2, xf2) {
		var count1 = poly1.m_vertexCount;
		var vertices1 = poly1.m_vertices;
		var normals1 = poly1.m_normals;
		
		var count2 = poly2.m_vertexCount;
		var vertices2 = poly2.m_vertices;
		
		
		
		var tMat;
		var tVec;
		
		
		
		tMat = xf1.R;
		tVec = normals1[edge1];
		var normal1WorldX = (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		var normal1WorldY = (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		tMat = xf2.R;
		var normal1X = (tMat.col1.x * normal1WorldX + tMat.col1.y * normal1WorldY);
		var normal1Y = (tMat.col2.x * normal1WorldX + tMat.col2.y * normal1WorldY);
		
		
		var index = 0;
		var minDot = Number.MAX_VALUE;
		for (var i = 0; i < count2; ++i)
		{
			
			tVec = vertices2[i];
			var dot = tVec.x * normal1X + tVec.y * normal1Y;
			if (dot < minDot)
			{
				minDot = dot;
				index = i;
			}
		}
		
		
		tVec = vertices1[edge1];
		tMat = xf1.R;
		var v1X = xf1.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		var v1Y = xf1.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		tVec = vertices2[index];
		tMat = xf2.R;
		var v2X = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		var v2Y = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		
		v2X -= v1X;
		v2Y -= v1Y;
		
		var separation = v2X * normal1WorldX + v2Y * normal1WorldY;
		return separation;
	}
b2Collision.FindMaxSeparation = function (edgeIndex , 
											poly1, xf1, 
											poly2, xf2) {
		var count1 = poly1.m_vertexCount;
		var normals1 = poly1.m_normals;
		
		var tVec;
		var tMat;
		
		
		
		tMat = xf2.R;
		tVec = poly2.m_centroid;
		var dX = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		var dY = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		tMat = xf1.R;
		tVec = poly1.m_centroid;
		dX -= xf1.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		dY -= xf1.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		
		var dLocal1X = (dX * xf1.R.col1.x + dY * xf1.R.col1.y);
		var dLocal1Y = (dX * xf1.R.col2.x + dY * xf1.R.col2.y);
		
		
		var edge = 0;
		var maxDot = -Number.MAX_VALUE;
		for (var i = 0; i < count1; ++i)
		{
			
			tVec = normals1[i];
			var dot = (tVec.x * dLocal1X + tVec.y * dLocal1Y);
			if (dot > maxDot)
			{
				maxDot = dot;
				edge = i;
			}
		}
		
		
		var s = b2Collision.EdgeSeparation(poly1, xf1, edge, poly2, xf2);
		if (s > 0.0)
		{
			return s;
		}
		
		
		var prevEdge = edge - 1 >= 0 ? edge - 1 : count1 - 1;
		var sPrev = b2Collision.EdgeSeparation(poly1, xf1, prevEdge, poly2, xf2);
		if (sPrev > 0.0)
		{
			return sPrev;
		}
		
		
		var nextEdge = edge + 1 < count1 ? edge + 1 : 0;
		var sNext = b2Collision.EdgeSeparation(poly1, xf1, nextEdge, poly2, xf2);
		if (sNext > 0.0)
		{
			return sNext;
		}
		
		
		var bestEdge = 0;
		var bestSeparation;
		var increment = 0;
		if (sPrev > s && sPrev > sNext)
		{
			increment = -1;
			bestEdge = prevEdge;
			bestSeparation = sPrev;
		}
		else if (sNext > s)
		{
			increment = 1;
			bestEdge = nextEdge;
			bestSeparation = sNext;
		}
		else
		{
			
			edgeIndex[0] = edge;
			return s;
		}
		
		
		while (true)
		{
			
			if (increment == -1)
				edge = bestEdge - 1 >= 0 ? bestEdge - 1 : count1 - 1;
			else
				edge = bestEdge + 1 < count1 ? bestEdge + 1 : 0;
			
			s = b2Collision.EdgeSeparation(poly1, xf1, edge, poly2, xf2);
			if (s > 0.0)
			{
				return s;
			}
			
			if (s > bestSeparation)
			{
				bestEdge = edge;
				bestSeparation = s;
			}
			else
			{
				break;
			}
		}
		
		
		edgeIndex[0] = bestEdge;
		return bestSeparation;
	}
b2Collision.FindIncidentEdge = function (c, 
											poly1, xf1, edge1, 
											poly2, xf2) {
		var count1 = poly1.m_vertexCount;
		var normals1 = poly1.m_normals;
		
		var count2 = poly2.m_vertexCount;
		var vertices2 = poly2.m_vertices;
		var normals2 = poly2.m_normals;
		
		
		
		var tMat;
		var tVec;
		
		
		
		tMat = xf1.R;
		tVec = normals1[edge1];
		var normal1X = (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		var normal1Y = (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		tMat = xf2.R;
		var tX = (tMat.col1.x * normal1X + tMat.col1.y * normal1Y);
		normal1Y = 		(tMat.col2.x * normal1X + tMat.col2.y * normal1Y);
		normal1X = tX;
		
		
		var index = 0;
		var minDot = Number.MAX_VALUE;
		for (var i = 0; i < count2; ++i)
		{
			
			tVec = normals2[i];
			var dot = (normal1X * tVec.x + normal1Y * tVec.y);
			if (dot < minDot)
			{
				minDot = dot;
				index = i;
			}
		}
		
		var tClip;
		
		var i1 = index;
		var i2 = i1 + 1 < count2 ? i1 + 1 : 0;
		
		tClip = c[0];
		
		tVec = vertices2[i1];
		tMat = xf2.R;
		tClip.v.x = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		tClip.v.y = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		tClip.id.features.referenceEdge = edge1;
		tClip.id.features.incidentEdge = i1;
		tClip.id.features.incidentVertex = 0;
		
		tClip = c[1];
		
		tVec = vertices2[i2];
		tMat = xf2.R;
		tClip.v.x = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		tClip.v.y = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		tClip.id.features.referenceEdge = edge1;
		tClip.id.features.incidentEdge = i2;
		tClip.id.features.incidentVertex = 1;
	}
b2Collision.b2CollidePolygons = function (manifold, 
											polyA, xfA,
											polyB, xfB) {
		var cv;
		
		manifold.pointCount = 0;

		var edgeA = 0;
		var edgeAO = [edgeA];
		var separationA = b2Collision.FindMaxSeparation(edgeAO, polyA, xfA, polyB, xfB);
		edgeA = edgeAO[0];
		if (separationA > 0.0)
			return;

		var edgeB = 0;
		var edgeBO = [edgeB];
		var separationB = b2Collision.FindMaxSeparation(edgeBO, polyB, xfB, polyA, xfA);
		edgeB = edgeBO[0];
		if (separationB > 0.0)
			return;

		var poly1;	
		var poly2;	
		var xf1 = new b2XForm();
		var xf2 = new b2XForm();
		var edge1 = 0;		
		var flip = 0;
		var k_relativeTol = 0.98;
		var k_absoluteTol = 0.001;

		
		if (separationB > k_relativeTol * separationA + k_absoluteTol)
		{
			poly1 = polyB;
			poly2 = polyA;
			xf1.Set(xfB);
			xf2.Set(xfA);
			edge1 = edgeB;
			flip = 1;
		}
		else
		{
			poly1 = polyA;
			poly2 = polyB;
			xf1.Set(xfA);
			xf2.Set(xfB);
			edge1 = edgeA;
			flip = 0;
		}

		var incidentEdge = [new ClipVertex(), new ClipVertex()];
		b2Collision.FindIncidentEdge(incidentEdge, poly1, xf1, edge1, poly2, xf2);

		var count1 = poly1.m_vertexCount;
		var vertices1 = poly1.m_vertices;

		var tVec = vertices1[edge1];
		var v11 = tVec.Copy();
		if (edge1 + 1 < count1) {
			tVec = vertices1[parseInt(edge1+1)];
			var v12 = tVec.Copy();
		} else {
			tVec = vertices1[0];
			v12 = tVec.Copy();
		}

		var dv = b2Math.SubtractVV(v12 , v11);
		var sideNormal = b2Math.b2MulMV(xf1.R, b2Math.SubtractVV(v12 , v11));
		sideNormal.Normalize();
		var frontNormal = b2Math.b2CrossVF(sideNormal, 1.0);
		
		v11 = b2Math.b2MulX(xf1, v11);
		v12 = b2Math.b2MulX(xf1, v12);

		var frontOffset = b2Math.b2Dot(frontNormal, v11);
		var sideOffset1 = -b2Math.b2Dot(sideNormal, v11);
		var sideOffset2 = b2Math.b2Dot(sideNormal, v12);

		
		var clipPoints1 = [new ClipVertex(), new ClipVertex()];
		var clipPoints2 = [new ClipVertex(), new ClipVertex()];
		var np = 0;

		
		
		np = b2Collision.ClipSegmentToLine(clipPoints1, incidentEdge, sideNormal.Negative(), sideOffset1);

		if (np < 2)
			return;

		
		np = b2Collision.ClipSegmentToLine(clipPoints2, clipPoints1, sideNormal, sideOffset2);

		if (np < 2)
			return;

		
		manifold.normal = flip ? frontNormal.Negative() : frontNormal.Copy();

		var pointCount = 0;
		for (var i = 0; i < b2Settings.b2_maxManifoldPoints; ++i)
		{
			cv = clipPoints2[i];
			var separation = b2Math.b2Dot(frontNormal, cv.v) - frontOffset;

			if (separation <= 0.0)
			{
				var cp = manifold.points[ pointCount ];
				cp.separation = separation;
				cp.localPoint1 = b2Math.b2MulXT(xfA, cv.v);
				cp.localPoint2 = b2Math.b2MulXT(xfB, cv.v);
				cp.id.key = cv.id._key;
				cp.id.features.flip = flip;
				++pointCount;
			}
		}

		manifold.pointCount = pointCount;
	}
b2Collision.b2CollideCircles = function (
		manifold, 
		circle1, xf1, 
		circle2, xf2) {
		manifold.pointCount = 0;
		
		var tMat;
		var tVec;
		
		
		tMat = xf1.R; tVec = circle1.m_localPosition;
		var p1X = xf1.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		var p1Y = xf1.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		tMat = xf2.R; tVec = circle2.m_localPosition;
		var p2X = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		var p2Y = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		var dX = p2X - p1X;
		var dY = p2Y - p1Y;
		
		var distSqr = dX * dX + dY * dY;
		var r1 = circle1.m_radius;
		var r2 = circle2.m_radius;
		var radiusSum = r1 + r2;
		if (distSqr > radiusSum * radiusSum)
		{
			return;
		}
		
		var separation;
		if (distSqr < Number.MIN_VALUE)
		{
			separation = -radiusSum;
			manifold.normal.Set(0.0, 1.0);
		}
		else
		{
			var dist = Math.sqrt(distSqr);
			separation = dist - radiusSum;
			var a = 1.0 / dist;
			manifold.normal.x = a * dX;
			manifold.normal.y = a * dY;
		}
		
		manifold.pointCount = 1;
		var tPoint = manifold.points[0];
		tPoint.id.key = 0;
		tPoint.separation = separation;
		
		p1X += r1 * manifold.normal.x;
		p1Y += r1 * manifold.normal.y;
		p2X -= r2 * manifold.normal.x;
		p2Y -= r2 * manifold.normal.y;
		
		
		var pX = 0.5 * (p1X + p2X);
		var pY = 0.5 * (p1Y + p2Y);
		
		
		var tX = pX - xf1.position.x;
		var tY = pY - xf1.position.y;
		tPoint.localPoint1.x = (tX * xf1.R.col1.x + tY * xf1.R.col1.y );
		tPoint.localPoint1.y = (tX * xf1.R.col2.x + tY * xf1.R.col2.y );
		
		tX = pX - xf2.position.x;
		tY = pY - xf2.position.y;
		tPoint.localPoint2.x = (tX * xf2.R.col1.x + tY * xf2.R.col1.y );
		tPoint.localPoint2.y = (tX * xf2.R.col2.x + tY * xf2.R.col2.y );
	}
b2Collision.b2CollidePolygonAndCircle = function (
		manifold, 
		polygon, xf1,
		circle, xf2) {
		manifold.pointCount = 0;
		var tPoint;
		
		var dX;
		var dY;
		var positionX;
		var positionY;
		
		var tVec;
		var tMat;
		
		
		
		tMat = xf2.R;
		tVec = circle.m_localPosition;
		var cX = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		var cY = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		
		dX = cX - xf1.position.x;
		dY = cY - xf1.position.y;
		tMat = xf1.R;
		var cLocalX = (dX * tMat.col1.x + dY * tMat.col1.y);
		var cLocalY = (dX * tMat.col2.x + dY * tMat.col2.y);
		
		var dist;
		
		
		var normalIndex = 0;
		var separation = -Number.MAX_VALUE;
		var radius = circle.m_radius;
		var vertexCount = polygon.m_vertexCount;
		var vertices = polygon.m_vertices;
		var normals = polygon.m_normals;

		for (var i = 0; i < vertexCount; ++i)
		{
			
			tVec = vertices[i];
			dX = cLocalX-tVec.x;
			dY = cLocalY-tVec.y;
			tVec = normals[i];
			var s = tVec.x * dX + tVec.y * dY;
			
			if (s > radius)
			{
				
				return;
			}
			
			if (s > separation)
			{
				separation = s;
				normalIndex = i;
			}
		}
		
		
		if (separation < Number.MIN_VALUE)
		{
			manifold.pointCount = 1;
			
			tVec = normals[normalIndex];
			tMat = xf1.R;
			manifold.normal.x = (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
			manifold.normal.y = (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
			
			tPoint = manifold.points[0];
			tPoint.id.features.incidentEdge = normalIndex;
			tPoint.id.features.incidentVertex = b2Collision.b2_nullFeature;
			tPoint.id.features.referenceEdge = 0;
			tPoint.id.features.flip = 0;
			
			positionX = cX - radius * manifold.normal.x;
			positionY = cY - radius * manifold.normal.y;
			
			dX = positionX - xf1.position.x;
			dY = positionY - xf1.position.y;
			tMat = xf1.R;
			tPoint.localPoint1.x = (dX*tMat.col1.x + dY*tMat.col1.y);
			tPoint.localPoint1.y = (dX*tMat.col2.x + dY*tMat.col2.y);
			
			dX = positionX - xf2.position.x;
			dY = positionY - xf2.position.y;
			tMat = xf2.R;
			tPoint.localPoint2.x = (dX*tMat.col1.x + dY*tMat.col1.y);
			tPoint.localPoint2.y = (dX*tMat.col2.x + dY*tMat.col2.y);
			
			tPoint.separation = separation - radius;
			return;
		}
		
		
		var vertIndex1 = normalIndex;
		var vertIndex2 = vertIndex1 + 1 < vertexCount ? vertIndex1 + 1 : 0;
		tVec = vertices[vertIndex1];
		var tVec2 = vertices[vertIndex2];
		
		var eX = tVec2.x - tVec.x;
		var eY = tVec2.y - tVec.y;
		
		
		var length = Math.sqrt(eX*eX + eY*eY);
		eX /= length;
		eY /= length;
		
		
		
		
		dX = cLocalX - tVec.x;
		dY = cLocalY - tVec.y;
		var u = dX*eX + dY*eY;
		
		tPoint = manifold.points[0];
		
		var pX, pY;
		if (u <= 0.0)
		{
			pX = tVec.x;
			pY = tVec.y;
			tPoint.id.features.incidentEdge = b2Collision.b2_nullFeature;
			tPoint.id.features.incidentVertex = vertIndex1;
		}
		else if (u >= length)
		{
			pX = tVec2.x;
			pY = tVec2.y;
			tPoint.id.features.incidentEdge = b2Collision.b2_nullFeature;
			tPoint.id.features.incidentVertex = vertIndex2;
		}
		else
		{
			
			pX = eX * u + tVec.x;
			pY = eY * u + tVec.y;
			tPoint.id.features.incidentEdge = normalIndex;
			tPoint.id.features.incidentVertex = b2Collision.b2_nullFeature;
		}
		
		
		dX = cLocalX - pX;
		dY = cLocalY - pY;
		
		dist = Math.sqrt(dX*dX + dY*dY);
		dX /= dist;
		dY /= dist;
		if (dist > radius)
		{
			return;
		}
		
		manifold.pointCount = 1;
		
		tMat = xf1.R;
		manifold.normal.x = tMat.col1.x * dX + tMat.col2.x * dY;
		manifold.normal.y = tMat.col1.y * dX + tMat.col2.y * dY;
		
		positionX = cX - radius * manifold.normal.x;
		positionY = cY - radius * manifold.normal.y;
		
		dX = positionX - xf1.position.x;
		dY = positionY - xf1.position.y;
		tMat = xf1.R;
		tPoint.localPoint1.x = (dX*tMat.col1.x + dY*tMat.col1.y);
		tPoint.localPoint1.y = (dX*tMat.col2.x + dY*tMat.col2.y);
		
		dX = positionX - xf2.position.x;
		dY = positionY - xf2.position.y;
		tMat = xf2.R;
		tPoint.localPoint2.x = (dX*tMat.col1.x + dY*tMat.col1.y);
		tPoint.localPoint2.y = (dX*tMat.col2.x + dY*tMat.col2.y);
		tPoint.separation = dist - radius;
		tPoint.id.features.referenceEdge = 0;
		tPoint.id.features.flip = 0;
	}
b2Collision.b2TestOverlap = function (a, b) {
		var t1 = b.lowerBound;
		var t2 = a.upperBound;
		
		var d1X = t1.x - t2.x;
		var d1Y = t1.y - t2.y;
		
		t1 = a.lowerBound;
		t2 = b.upperBound;
		var d2X = t1.x - t2.x;
		var d2Y = t1.y - t2.y;
		
		if (d1X > 0.0 || d1Y > 0.0)
			return false;
		
		if (d2X > 0.0 || d2Y > 0.0)
			return false;
		
		return true;
	}
exports.b2Collision = b2Collision;


var b2Proxy = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Proxy.prototype.__constructor = function(){}
b2Proxy.prototype.__varz = function(){
this.lowerBounds =  [parseInt(0), parseInt(0)];
this.upperBounds =  [parseInt(0), parseInt(0)];
}
b2Proxy.prototype.lowerBounds =  [parseInt(0), parseInt(0)];
b2Proxy.prototype.upperBounds =  [parseInt(0), parseInt(0)];
b2Proxy.prototype.overlapCount =  0;
b2Proxy.prototype.timeStamp =  0;
b2Proxy.prototype.userData =  null;
b2Proxy.prototype.GetNext = function () { return this.lowerBounds[0]; }
b2Proxy.prototype.SetNext = function (next) { this.lowerBounds[0] = next % 65535; }
b2Proxy.prototype.IsValid = function () { return this.overlapCount != b2BroadPhase.b2_invalid; }
exports.b2Proxy = b2Proxy;


var b2Segment = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Segment.prototype.__constructor = function(){}
b2Segment.prototype.__varz = function(){
this.p1 =  new b2Vec2();
this.p2 =  new b2Vec2();
}
b2Segment.prototype.p1 =  new b2Vec2();
b2Segment.prototype.p2 =  new b2Vec2();
b2Segment.prototype.TestSegment = function (lambda, 
								normal, 
								segment, 
								maxLambda) {
		
		var s = segment.p1;
		
		var rX = segment.p2.x - s.x;
		var rY = segment.p2.y - s.y;
		
		var dX = this.p2.x - this.p1.x;
		var dY = this.p2.y - this.p1.y;
		
		var nX = dY;
		var nY = -dX;
		
		var k_slop = 100.0 * Number.MIN_VALUE;
		
		var denom = -(rX*nX + rY*nY);
		
		
		if (denom > k_slop)
		{
			
			
			var bX = s.x - this.p1.x;
			var bY = s.y - this.p1.y;
			
			var a = (bX*nX + bY*nY);
			
			if (0.0 <= a && a <= maxLambda * denom)
			{
				var mu2 = -rX * bY + rY * bX;
				
				
				if (-k_slop * denom <= mu2 && mu2 <= denom * (1.0 + k_slop))
				{
					a /= denom;
					
					var nLen = Math.sqrt(nX*nX + nY*nY);
					nX /= nLen;
					nY /= nLen;
					
					lambda[0] = a;
					
					normal.Set(nX, nY);
					return true;
				}
			}
		}
		
		return false;
	}
exports.b2Segment = b2Segment;


var b2Distance = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Distance.prototype.__constructor = function(){}
b2Distance.prototype.__varz = function(){
}
b2Distance.g_GJK_Iterations =  0;
b2Distance.s_p1s =  [new b2Vec2(), new b2Vec2(), new b2Vec2()];
b2Distance.s_p2s =  [new b2Vec2(), new b2Vec2(), new b2Vec2()];
b2Distance.s_points =  [new b2Vec2(), new b2Vec2(), new b2Vec2()];
b2Distance.gPoint =  new b2Point();
b2Distance.ProcessTwo = function (x1, x2, p1s, p2s, points) {
	var points_0 = points[0];
	var points_1 = points[1];
	var p1s_0 = p1s[0];
	var p1s_1 = p1s[1];
	var p2s_0 = p2s[0];
	var p2s_1 = p2s[1];
	
	
	
	var rX = -points_1.x;
	var rY = -points_1.y;
	
	var dX = points_0.x - points_1.x;
	var dY = points_0.y - points_1.y;
	
	var length = Math.sqrt(dX*dX + dY*dY);
	dX /= length;
	dY /= length;
	
	
	var lambda = rX * dX + rY * dY;
	if (lambda <= 0.0 || length < Number.MIN_VALUE)
	{
		
		
		x1.SetV(p1s_1);
		
		x2.SetV(p2s_1);
		
		p1s_0.SetV(p1s_1);
		
		p2s_0.SetV(p2s_1);
		points_0.SetV(points_1);
		return 1;
	}

	
	lambda /= length;
	
	x1.x = p1s_1.x + lambda * (p1s_0.x - p1s_1.x);
	x1.y = p1s_1.y + lambda * (p1s_0.y - p1s_1.y);
	
	x2.x = p2s_1.x + lambda * (p2s_0.x - p2s_1.x);
	x2.y = p2s_1.y + lambda * (p2s_0.y - p2s_1.y);
	return 2;
}
b2Distance.ProcessThree = function (x1, x2, p1s, p2s, points) {
	var points_0 = points[0];
	var points_1 = points[1];
	var points_2 = points[2];
	var p1s_0 = p1s[0];
	var p1s_1 = p1s[1];
	var p1s_2 = p1s[2];
	var p2s_0 = p2s[0];
	var p2s_1 = p2s[1];
	var p2s_2 = p2s[2];
	
	
	var aX = points_0.x;
	var aY = points_0.y;
	
	var bX = points_1.x;
	var bY = points_1.y;
	
	var cX = points_2.x;
	var cY = points_2.y;

	
	var abX = bX - aX;
	var abY = bY - aY;
	
	var acX = cX - aX;
	var acY = cY - aY;
	
	var bcX = cX - bX;
	var bcY = cY - bY;

	
	var sn = -(aX * abX + aY * abY);
	var sd = (bX * abX + bY * abY);
	
	var tn = -(aX * acX + aY * acY);
	var td = (cX * acX + cY * acY);
	
	var un = -(bX * bcX + bY * bcY);
	var ud = (cX * bcX + cY * bcY);

	
	if (td <= 0.0 && ud <= 0.0)
	{
		
		
		x1.SetV(p1s_2);
		
		x2.SetV(p2s_2);
		
		p1s_0.SetV(p1s_2);
		
		p2s_0.SetV(p2s_2);
		points_0.SetV(points_2);
		return 1;
	}

	
	
	

	
	var n = abX * acY - abY * acX;

	
	
	var vc = n * (aX * bY - aY * bX); 
	
	var lambda;
	
	
	
	var va = n * (bX * cY - bY * cX); 
	if (va <= 0.0 && un >= 0.0 && ud >= 0.0 && (un+ud) > 0.0)
	{
		
		
		
		lambda = un / (un + ud);
		
		x1.x = p1s_1.x + lambda * (p1s_2.x - p1s_1.x);
		x1.y = p1s_1.y + lambda * (p1s_2.y - p1s_1.y);
		
		x2.x = p2s_1.x + lambda * (p2s_2.x - p2s_1.x);
		x2.y = p2s_1.y + lambda * (p2s_2.y - p2s_1.y);
		
		p1s_0.SetV(p1s_2);
		
		p2s_0.SetV(p2s_2);
		
		points_0.SetV(points_2);
		return 2;
	}

	
	
	var vb = n * (cX * aY - cY * aX);
	if (vb <= 0.0 && tn >= 0.0 && td >= 0.0 && (tn+td) > 0.0)
	{
		
		
		
		lambda = tn / (tn + td);
		
		x1.x = p1s_0.x + lambda * (p1s_2.x - p1s_0.x);
		x1.y = p1s_0.y + lambda * (p1s_2.y - p1s_0.y);
		
		x2.x = p2s_0.x + lambda * (p2s_2.x - p2s_0.x);
		x2.y = p2s_0.y + lambda * (p2s_2.y - p2s_0.y);
		
		p1s_1.SetV(p1s_2);
		
		p2s_1.SetV(p2s_2);
		
		points_1.SetV(points_2);
		return 2;
	}

	
	
	var denom = va + vb + vc;
	
	denom = 1.0 / denom;
	
	var u = va * denom;
	
	var v = vb * denom;
	
	var w = 1.0 - u - v;
	
	x1.x = u * p1s_0.x + v * p1s_1.x + w * p1s_2.x;
	x1.y = u * p1s_0.y + v * p1s_1.y + w * p1s_2.y;
	
	x2.x = u * p2s_0.x + v * p2s_1.x + w * p2s_2.x;
	x2.y = u * p2s_0.y + v * p2s_1.y + w * p2s_2.y;
	return 3;
}
b2Distance.InPoints = function (w, points, pointCount) {
	var k_tolerance = 100.0 * Number.MIN_VALUE;
	for (var i = 0; i < pointCount; ++i)
	{
		var points_i = points[i];
		
		var dX = Math.abs(w.x - points_i.x);
		var dY = Math.abs(w.y - points_i.y);
		
		var mX = Math.max(Math.abs(w.x), Math.abs(points_i.x));
		var mY = Math.max(Math.abs(w.y), Math.abs(points_i.y));
		
		if (dX < k_tolerance * (mX + 1.0) &&
			dY < k_tolerance * (mY + 1.0)){
			return true;
		}
	}

	return false;
}
b2Distance.DistanceGeneric = function (x1, x2, 
										shape1, xf1, 
										shape2, xf2) {
	var tVec;
	
	
	var p1s = b2Distance.s_p1s;
	var p2s = b2Distance.s_p2s;
	
	var points = b2Distance.s_points;
	
	var pointCount = 0;

	
	x1.SetV(shape1.GetFirstVertex(xf1));
	
	x2.SetV(shape2.GetFirstVertex(xf2));

	var vSqr = 0.0;
	var maxIterations = 20;
	for (var iter = 0; iter < maxIterations; ++iter)
	{
		
		var vX = x2.x - x1.x;
		var vY = x2.y - x1.y;
		
		var w1 = shape1.Support(xf1, vX, vY);
		
		var w2 = shape2.Support(xf2, -vX, -vY);
		
		vSqr = (vX*vX + vY*vY);
		
		var wX = w2.x - w1.x;
		var wY = w2.y - w1.y;
		
		var vw = (vX*wX + vY*wY);
		
		if (vSqr - vw <= 0.01 * vSqr) 
		{
			if (pointCount == 0)
			{
				
				x1.SetV(w1);
				
				x2.SetV(w2);
			}
			b2Distance.g_GJK_Iterations = iter;
			return Math.sqrt(vSqr);
		}
		
		switch (pointCount)
		{
		case 0:
			
			tVec = p1s[0];
			tVec.SetV(w1);
			
			tVec = p2s[0];
			tVec.SetV(w2);
			
			tVec = points[0];
			tVec.x = wX;
			tVec.y = wY;
			
			x1.SetV(p1s[0]);
			
			x2.SetV(p2s[0]);
			++pointCount;
			break;
			
		case 1:
			
			tVec = p1s[1];
			tVec.SetV(w1);
			
			tVec = p2s[1];
			tVec.SetV(w2);
			
			tVec = points[1];
			tVec.x = wX;
			tVec.y = wY;
			pointCount = b2Distance.ProcessTwo(x1, x2, p1s, p2s, points);
			break;
			
		case 2:
			
			tVec = p1s[2];
			tVec.SetV(w1);
			
			tVec = p2s[2];
			tVec.SetV(w2);
			
			tVec = points[2];
			tVec.x = wX;
			tVec.y = wY;
			pointCount = b2Distance.ProcessThree(x1, x2, p1s, p2s, points);
			break;
		}
		
		
		if (pointCount == 3)
		{
			b2Distance.g_GJK_Iterations = iter;
			return 0.0;
		}
		
		
		var maxSqr = -Number.MAX_VALUE;
		for (var i = 0; i < pointCount; ++i)
		{
			
			tVec = points[i];
			maxSqr = b2Math.b2Max(maxSqr, (tVec.x*tVec.x + tVec.y*tVec.y));
		}
		
		if (pointCount == 3 || vSqr <= 100.0 * Number.MIN_VALUE * maxSqr)
		{
			b2Distance.g_GJK_Iterations = iter;
			
			vX = x2.x - x1.x;
			vY = x2.y - x1.y;
			
			vSqr = (vX*vX + vY*vY);
			return Math.sqrt(vSqr);
		}
	}

	b2Distance.g_GJK_Iterations = maxIterations;
	return Math.sqrt(vSqr);
}
b2Distance.DistanceCC = function (
	x1, x2,
	circle1, xf1,
	circle2, xf2) {
	var tMat;
	var tVec;
	
	tMat = xf1.R;
	tVec = circle1.m_localPosition;
	var p1X = xf1.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
	var p1Y = xf1.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
	
	tMat = xf2.R;
	tVec = circle2.m_localPosition;
	var p2X = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
	var p2Y = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

	
	var dX = p2X - p1X;
	var dY = p2Y - p1Y;
	var dSqr = (dX*dX + dY*dY);
	var r1 = circle1.m_radius - b2Settings.b2_toiSlop;
	var r2 = circle2.m_radius - b2Settings.b2_toiSlop;
	var r = r1 + r2;
	if (dSqr > r * r)
	{
		
		var dLen = Math.sqrt(dSqr);
		dX /= dLen;
		dY /= dLen;
		var distance = dLen - r;
		
		x1.x = p1X + r1 * dX;
		x1.y = p1Y + r1 * dY;
		
		x2.x = p2X - r2 * dX;
		x2.y = p2Y - r2 * dY;
		return distance;
	}
	else if (dSqr > Number.MIN_VALUE * Number.MIN_VALUE)
	{
		
		dLen = Math.sqrt(dSqr);
		dX /= dLen;
		dY /= dLen;
		
		x1.x = p1X + r1 * dX;
		x1.y = p1Y + r1 * dY;
		
		x2.x = x1.x;
		x2.y = x1.y;
		return 0.0;
	}

	
	x1.x = p1X;
	x1.y = p1Y;
	
	x2.x = x1.x;
	x2.y = x1.y;
	return 0.0;
}
b2Distance.DistancePC = function (
	x1, x2,
	polygon, xf1,
	circle, xf2) {
	
	var tMat;
	var tVec;
	
	var point = b2Distance.gPoint;
	
	tVec = circle.m_localPosition;
	tMat = xf2.R;
	point.p.x = xf2.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
	point.p.y = xf2.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);

	
	var distance = b2Distance.DistanceGeneric(x1, x2, polygon, xf1, point, b2Math.b2XForm_identity);

	var r = circle.m_radius - b2Settings.b2_toiSlop;

	if (distance > r)
	{
		distance -= r;
		
		var dX = x2.x - x1.x;
		var dY = x2.y - x1.y;
		
		var dLen = Math.sqrt(dX*dX + dY*dY);
		dX /= dLen;
		dY /= dLen;
		
		x2.x -= r * dX;
		x2.y -= r * dY;
	}
	else
	{
		distance = 0.0;
		
		x2.x = x1.x;
		x2.y = x1.y;
	}
	
	return distance;
}
b2Distance.Distance = function (x1, x2,
				 shape1, xf1,
				 shape2, xf2) {
	
	var type1 = shape1.m_type;
	
	var type2 = shape2.m_type;

	if (type1 == b2Shape.e_circleShape && type2 == b2Shape.e_circleShape)
	{
		
		return b2Distance.DistanceCC(x1, x2, shape1, xf1, shape2, xf2);
	}
	
	if (type1 == b2Shape.e_polygonShape && type2 == b2Shape.e_circleShape)
	{
		
		return b2Distance.DistancePC(x1, x2, shape1, xf1, shape2, xf2);
	}

	if (type1 == b2Shape.e_circleShape && type2 == b2Shape.e_polygonShape)
	{
		return b2Distance.DistancePC(x2, x1, shape2, xf2, shape1, xf1);
	}

	if (type1 == b2Shape.e_polygonShape && type2 == b2Shape.e_polygonShape)
	{
		return b2Distance.DistanceGeneric(x1, x2, shape1, xf1, shape2, xf2);
	}
	
	return 0.0;
}
exports.b2Distance = b2Distance;


var b2OBB = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2OBB.prototype.__constructor = function(){}
b2OBB.prototype.__varz = function(){
this.R =  new b2Mat22();
this.center =  new b2Vec2();
this.extents =  new b2Vec2();
}
b2OBB.prototype.R =  new b2Mat22();
b2OBB.prototype.center =  new b2Vec2();
b2OBB.prototype.extents =  new b2Vec2();
exports.b2OBB = b2OBB;


var b2BroadPhase = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2BroadPhase.prototype.__constructor = function (worldAABB, callback) {
		
		var i = 0;
		
		this.m_pairManager.Initialize(this, callback);
		
		this.m_worldAABB = worldAABB;
		
		this.m_proxyCount = 0;
		
		
		for (i = 0; i < b2Settings.b2_maxProxies; i++){
			this.m_queryResults[i] = 0;
		}
		
		
		this.m_bounds = new Array(2);
		for (i = 0; i < 2; i++){
			this.m_bounds[i] = new Array(2*b2Settings.b2_maxProxies);
			for (var j = 0; j < 2*b2Settings.b2_maxProxies; j++){
				this.m_bounds[i][j] = new b2Bound();
			}
		}
		
		
		var dX = worldAABB.upperBound.x - worldAABB.lowerBound.x;;
		var dY = worldAABB.upperBound.y - worldAABB.lowerBound.y;
		
		this.m_quantizationFactor.x = b2Settings.USHRT_MAX / dX;
		this.m_quantizationFactor.y = b2Settings.USHRT_MAX / dY;
		
		var tProxy;
		for (i = 0; i < b2Settings.b2_maxProxies - 1; ++i)
		{
			tProxy = new b2Proxy();
			this.m_proxyPool[i] = tProxy;
			tProxy.SetNext(i + 1);
			tProxy.timeStamp = 0;
			tProxy.overlapCount = b2BroadPhase.b2_invalid;
			tProxy.userData = null;
		}
		tProxy = new b2Proxy();
		this.m_proxyPool[parseInt(b2Settings.b2_maxProxies-1)] = tProxy;
		tProxy.SetNext(b2Pair.b2_nullProxy);
		tProxy.timeStamp = 0;
		tProxy.overlapCount = b2BroadPhase.b2_invalid;
		tProxy.userData = null;
		this.m_freeProxy = 0;
		
		this.m_timeStamp = 1;
		this.m_queryResultCount = 0;
	}
b2BroadPhase.prototype.__varz = function(){
this.m_pairManager =  new b2PairManager();
this.m_proxyPool =  new Array(b2Settings.b2_maxPairs);
this.m_bounds =  new Array(2*b2Settings.b2_maxProxies);
this.m_queryResults =  new Array(b2Settings.b2_maxProxies);
this.m_quantizationFactor =  new b2Vec2();
}
b2BroadPhase.s_validate =  false;
b2BroadPhase.b2_invalid =  b2Settings.USHRT_MAX;
b2BroadPhase.b2_nullEdge =  b2Settings.USHRT_MAX;
b2BroadPhase.BinarySearch = function (bounds, count, value) {
		var low = 0;
		var high = count - 1;
		while (low <= high)
		{
			var mid = Math.round((low + high) / 2);
			var bound = bounds[mid];
			if (bound.value > value)
			{
				high = mid - 1;
			}
			else if (bound.value < value)
			{
				low = mid + 1;
			}
			else
			{
				return parseInt(mid);
			}
		}
		
		return parseInt(low);
	}
b2BroadPhase.prototype.m_pairManager =  new b2PairManager();
b2BroadPhase.prototype.m_proxyPool =  new Array(b2Settings.b2_maxPairs);
b2BroadPhase.prototype.m_freeProxy =  0;
b2BroadPhase.prototype.m_bounds =  new Array(2*b2Settings.b2_maxProxies);
b2BroadPhase.prototype.m_queryResults =  new Array(b2Settings.b2_maxProxies);
b2BroadPhase.prototype.m_queryResultCount =  0;
b2BroadPhase.prototype.m_worldAABB =  null;
b2BroadPhase.prototype.m_quantizationFactor =  new b2Vec2();
b2BroadPhase.prototype.m_proxyCount =  0;
b2BroadPhase.prototype.m_timeStamp =  0;
b2BroadPhase.prototype.ComputeBounds = function (lowerValues, upperValues, aabb) {
		
		
		
		
		var minVertexX = aabb.lowerBound.x;
		var minVertexY = aabb.lowerBound.y;
		minVertexX = b2Math.b2Min(minVertexX, this.m_worldAABB.upperBound.x);
		minVertexY = b2Math.b2Min(minVertexY, this.m_worldAABB.upperBound.y);
		minVertexX = b2Math.b2Max(minVertexX, this.m_worldAABB.lowerBound.x);
		minVertexY = b2Math.b2Max(minVertexY, this.m_worldAABB.lowerBound.y);
		
		
		var maxVertexX = aabb.upperBound.x;
		var maxVertexY = aabb.upperBound.y;
		maxVertexX = b2Math.b2Min(maxVertexX, this.m_worldAABB.upperBound.x);
		maxVertexY = b2Math.b2Min(maxVertexY, this.m_worldAABB.upperBound.y);
		maxVertexX = b2Math.b2Max(maxVertexX, this.m_worldAABB.lowerBound.x);
		maxVertexY = b2Math.b2Max(maxVertexY, this.m_worldAABB.lowerBound.y);
		
		
		
		
		lowerValues[0] = parseInt(this.m_quantizationFactor.x * (minVertexX - this.m_worldAABB.lowerBound.x)) & (b2Settings.USHRT_MAX - 1);
		upperValues[0] = (parseInt(this.m_quantizationFactor.x * (maxVertexX - this.m_worldAABB.lowerBound.x))% 65535) | 1;
		
		lowerValues[1] = parseInt(this.m_quantizationFactor.y * (minVertexY - this.m_worldAABB.lowerBound.y)) & (b2Settings.USHRT_MAX - 1);
		upperValues[1] = (parseInt(this.m_quantizationFactor.y * (maxVertexY - this.m_worldAABB.lowerBound.y))% 65535) | 1;
	}
b2BroadPhase.prototype.TestOverlapValidate = function (p1, p2) {
		
		for (var axis = 0; axis < 2; ++axis)
		{
			var bounds = this.m_bounds[axis];
			
			
			
			
			
			
			var bound1 = bounds[p1.lowerBounds[axis]];
			var bound2 = bounds[p2.upperBounds[axis]];
			if (bound1.value > bound2.value)
				return false;
			
			bound1 = bounds[p1.upperBounds[axis]];
			bound2 = bounds[p2.lowerBounds[axis]];
			if (bound1.value < bound2.value)
				return false;
		}
		
		return true;
	}
b2BroadPhase.prototype.Query = function (lowerQueryOut, upperQueryOut, lowerValue, upperValue, bounds, boundCount, axis) {
		
		var lowerQuery = b2BroadPhase.BinarySearch(bounds, boundCount, lowerValue);
		var upperQuery = b2BroadPhase.BinarySearch(bounds, boundCount, upperValue);
		var bound;
		
		
		
		for (var j = lowerQuery; j < upperQuery; ++j)
		{
			bound = bounds[j];
			if (bound.IsLower())
			{
				this.IncrementOverlapCount(bound.proxyId);
			}
		}
		
		
		
		if (lowerQuery > 0)
		{
			var i = lowerQuery - 1;
			bound = bounds[i];
			var s = bound.stabbingCount;
			
			
			while (s)
			{
				
				bound = bounds[i];
				if (bound.IsLower())
				{
					var proxy = this.m_proxyPool[ bound.proxyId ];
					if (lowerQuery <= proxy.upperBounds[axis])
					{
						this.IncrementOverlapCount(bound.proxyId);
						--s;
					}
				}
				--i;
			}
		}
		
		lowerQueryOut[0] = lowerQuery;
		upperQueryOut[0] = upperQuery;
	}
b2BroadPhase.prototype.IncrementOverlapCount = function (proxyId) {
		var proxy = this.m_proxyPool[ proxyId ];
		if (proxy.timeStamp < this.m_timeStamp)
		{
			proxy.timeStamp = this.m_timeStamp;
			proxy.overlapCount = 1;
		}
		else
		{
			proxy.overlapCount = 2;
			
			this.m_queryResults[this.m_queryResultCount] = proxyId;
			++this.m_queryResultCount;
		}
	}
b2BroadPhase.prototype.IncrementTimeStamp = function () {
		if (this.m_timeStamp == b2Settings.USHRT_MAX)
		{
			for (var i = 0; i < b2Settings.b2_maxProxies; ++i)
			{
				(this.m_proxyPool[i]).timeStamp = 0;
			}
			this.m_timeStamp = 1;
		}
		else
		{
			++this.m_timeStamp;
		}
	}
b2BroadPhase.prototype.InRange = function (aabb) {
		
		var dX;
		var dY;
		var d2X;
		var d2Y;
		
		dX = aabb.lowerBound.x;
		dY = aabb.lowerBound.y;
		dX -= this.m_worldAABB.upperBound.x;
		dY -= this.m_worldAABB.upperBound.y;
		
		d2X = this.m_worldAABB.lowerBound.x;
		d2Y = this.m_worldAABB.lowerBound.y;
		d2X -= aabb.upperBound.x;
		d2Y -= aabb.upperBound.y;
		
		dX = b2Math.b2Max(dX, d2X);
		dY = b2Math.b2Max(dY, d2Y);
		
		return b2Math.b2Max(dX, dY) < 0.0;
	}
b2BroadPhase.prototype.GetProxy = function (proxyId) {
		var proxy = this.m_proxyPool[proxyId];
		if (proxyId == b2Pair.b2_nullProxy || proxy.IsValid() == false)
		{
			return null;
		}
		
		return proxy;
	}
b2BroadPhase.prototype.CreateProxy = function (aabb, userData) {
		var index = 0;
		var proxy;
		
		
		
		
		var proxyId = this.m_freeProxy;
		proxy = this.m_proxyPool[ proxyId ];
		this.m_freeProxy = proxy.GetNext();
		
		proxy.overlapCount = 0;
		proxy.userData = userData;
		
		var boundCount = 2 * this.m_proxyCount;
		
		var lowerValues = new Array();
		var upperValues = new Array();
		this.ComputeBounds(lowerValues, upperValues, aabb);
		
		for (var axis = 0; axis < 2; ++axis)
		{
			var bounds = this.m_bounds[axis];
			var lowerIndex = 0;
			var upperIndex = 0;
			var lowerIndexOut = [lowerIndex];
			var upperIndexOut = [upperIndex];
			this.Query(lowerIndexOut, upperIndexOut, lowerValues[axis], upperValues[axis], bounds, boundCount, axis);
			lowerIndex = lowerIndexOut[0];
			upperIndex = upperIndexOut[0];
			
			
			
			var tArr = new Array();
			var j = 0;
			var tEnd = boundCount - upperIndex
			var tBound1;
			var tBound2;
			var tBoundAS3;
			
			for (j = 0; j < tEnd; j++){
				tArr[j] = new b2Bound();
				tBound1 = tArr[j];
				tBound2 = bounds[parseInt(upperIndex+j)];
				tBound1.value = tBound2.value;
				tBound1.proxyId = tBound2.proxyId;
				tBound1.stabbingCount = tBound2.stabbingCount;
			}
			
			tEnd = tArr.length;
			var tIndex = upperIndex+2;
			for (j = 0; j < tEnd; j++){
				
				tBound2 = tArr[j];
				tBound1 = bounds[parseInt(tIndex+j)]
				tBound1.value = tBound2.value;
				tBound1.proxyId = tBound2.proxyId;
				tBound1.stabbingCount = tBound2.stabbingCount;
			}
			
			
			tArr = new Array();
			tEnd = upperIndex - lowerIndex;
			for (j = 0; j < tEnd; j++){
				tArr[j] = new b2Bound();
				tBound1 = tArr[j];
				tBound2 = bounds[parseInt(lowerIndex+j)];
				tBound1.value = tBound2.value;
				tBound1.proxyId = tBound2.proxyId;
				tBound1.stabbingCount = tBound2.stabbingCount;
			}
			
			tEnd = tArr.length;
			tIndex = lowerIndex+1;
			for (j = 0; j < tEnd; j++){
				
				tBound2 = tArr[j];
				tBound1 = bounds[parseInt(tIndex+j)]
				tBound1.value = tBound2.value;
				tBound1.proxyId = tBound2.proxyId;
				tBound1.stabbingCount = tBound2.stabbingCount;
			}
			
			
			++upperIndex;
			
			
			tBound1 = bounds[lowerIndex];
			tBound2 = bounds[upperIndex];
			tBound1.value = lowerValues[axis];
			tBound1.proxyId = proxyId;
			tBound2.value = upperValues[axis];
			tBound2.proxyId = proxyId;
			
			tBoundAS3 = bounds[parseInt(lowerIndex-1)];
			tBound1.stabbingCount = lowerIndex == 0 ? 0 : tBoundAS3.stabbingCount;
			tBoundAS3 = bounds[parseInt(upperIndex-1)];
			tBound2.stabbingCount = tBoundAS3.stabbingCount;
			
			
			for (index = lowerIndex; index < upperIndex; ++index)
			{
				tBoundAS3 = bounds[index];
				tBoundAS3.stabbingCount++;
			}
			
			
			for (index = lowerIndex; index < boundCount + 2; ++index)
			{
				tBound1 = bounds[index];
				var proxy2 = this.m_proxyPool[ tBound1.proxyId ];
				if (tBound1.IsLower())
				{
					proxy2.lowerBounds[axis] = index;
				}
				else
				{
					proxy2.upperBounds[axis] = index;
				}
			}
		}
		
		++this.m_proxyCount;
		
		
		
		for (var i = 0; i < this.m_queryResultCount; ++i)
		{
			
			
			
			this.m_pairManager.AddBufferedPair(proxyId, this.m_queryResults[i]);
		}
		
		this.m_pairManager.Commit();
		
		
		this.m_queryResultCount = 0;
		this.IncrementTimeStamp();
		
		return proxyId;
	}
b2BroadPhase.prototype.DestroyProxy = function (proxyId) {
		var tBound1;
		var tBound2;
		
		
		
		var proxy = this.m_proxyPool[ proxyId ];
		
		
		var boundCount = 2 * this.m_proxyCount;
		
		for (var axis = 0; axis < 2; ++axis)
		{
			var bounds = this.m_bounds[axis];
			
			var lowerIndex = proxy.lowerBounds[axis];
			var upperIndex = proxy.upperBounds[axis];
			tBound1 = bounds[lowerIndex];
			var lowerValue = tBound1.value;
			tBound2 = bounds[upperIndex];
			var upperValue = tBound2.value;
			
			
			
			var tArr = new Array();
			var j = 0;
			var tEnd = upperIndex - lowerIndex - 1;
			
			for (j = 0; j < tEnd; j++){
				tArr[j] = new b2Bound();
				tBound1 = tArr[j];
				tBound2 = bounds[parseInt(lowerIndex+1+j)];
				tBound1.value = tBound2.value;
				tBound1.proxyId = tBound2.proxyId;
				tBound1.stabbingCount = tBound2.stabbingCount;
			}
			
			tEnd = tArr.length;
			var tIndex = lowerIndex;
			for (j = 0; j < tEnd; j++){
				
				tBound2 = tArr[j];
				tBound1 = bounds[parseInt(tIndex+j)]
				tBound1.value = tBound2.value;
				tBound1.proxyId = tBound2.proxyId;
				tBound1.stabbingCount = tBound2.stabbingCount;
			}
			
			
			tArr = new Array();
			tEnd = boundCount - upperIndex - 1;
			for (j = 0; j < tEnd; j++){
				tArr[j] = new b2Bound();
				tBound1 = tArr[j];
				tBound2 = bounds[parseInt(upperIndex+1+j)];
				tBound1.value = tBound2.value;
				tBound1.proxyId = tBound2.proxyId;
				tBound1.stabbingCount = tBound2.stabbingCount;
			}
			
			tEnd = tArr.length;
			tIndex = upperIndex-1;
			for (j = 0; j < tEnd; j++){
				
				tBound2 = tArr[j];
				tBound1 = bounds[parseInt(tIndex+j)]
				tBound1.value = tBound2.value;
				tBound1.proxyId = tBound2.proxyId;
				tBound1.stabbingCount = tBound2.stabbingCount;
			}
			
			
			tEnd = boundCount - 2;
			for (var index = lowerIndex; index < tEnd; ++index)
			{
				tBound1 = bounds[index];
				var proxy2 = this.m_proxyPool[ tBound1.proxyId ];
				if (tBound1.IsLower())
				{
					proxy2.lowerBounds[axis] = index;
				}
				else
				{
					proxy2.upperBounds[axis] = index;
				}
			}
			
			
			tEnd = upperIndex - 1;
			for (var index2 = lowerIndex; index2 < tEnd; ++index2)
			{
				tBound1 = bounds[index2];
				tBound1.stabbingCount--;
			}
			
			
			
			this.Query([0], [0], lowerValue, upperValue, bounds, boundCount - 2, axis);
		}
		
		
		
		for (var i = 0; i < this.m_queryResultCount; ++i)
		{
			
			
			this.m_pairManager.RemoveBufferedPair(proxyId, this.m_queryResults[i]);
		}
		
		this.m_pairManager.Commit();
		
		
		this.m_queryResultCount = 0;
		this.IncrementTimeStamp();
		
		
		proxy.userData = null;
		proxy.overlapCount = b2BroadPhase.b2_invalid;
		proxy.lowerBounds[0] = b2BroadPhase.b2_invalid;
		proxy.lowerBounds[1] = b2BroadPhase.b2_invalid;
		proxy.upperBounds[0] = b2BroadPhase.b2_invalid;
		proxy.upperBounds[1] = b2BroadPhase.b2_invalid;
		
		proxy.SetNext(this.m_freeProxy);
		this.m_freeProxy = proxyId;
		--this.m_proxyCount;
	}
b2BroadPhase.prototype.MoveProxy = function (proxyId, aabb) {
		var as3arr;
		var as3int;
		
		var axis = 0;
		var index = 0;
		var bound;
		var prevBound;
		var nextBound;
		var nextProxyId = 0;
		var nextProxy;
		
		if (proxyId == b2Pair.b2_nullProxy || b2Settings.b2_maxProxies <= proxyId)
		{
			
			return;
		}
		
		if (aabb.IsValid() == false)
		{
			
			return;
		}
		
		var boundCount = 2 * this.m_proxyCount;
		
		var proxy = this.m_proxyPool[ proxyId ];
		
		var newValues = new b2BoundValues();
		this.ComputeBounds(newValues.lowerValues, newValues.upperValues, aabb);
		
		
		var oldValues = new b2BoundValues();
		for (axis = 0; axis < 2; ++axis)
		{
			bound = this.m_bounds[axis][proxy.lowerBounds[axis]];
			oldValues.lowerValues[axis] = bound.value;
			bound = this.m_bounds[axis][proxy.upperBounds[axis]];
			oldValues.upperValues[axis] = bound.value;
		}
		
		for (axis = 0; axis < 2; ++axis)
		{
			var bounds = this.m_bounds[axis];
			
			var lowerIndex = proxy.lowerBounds[axis];
			var upperIndex = proxy.upperBounds[axis];
			
			var lowerValue = newValues.lowerValues[axis];
			var upperValue = newValues.upperValues[axis];
			
			bound = bounds[lowerIndex];
			var deltaLower = lowerValue - bound.value;
			bound.value = lowerValue;
			
			bound = bounds[upperIndex];
			var deltaUpper = upperValue - bound.value;
			bound.value = upperValue;
			
			
			
			
			
			
			if (deltaLower < 0)
			{
				index = lowerIndex;
				while (index > 0 && lowerValue < (bounds[parseInt(index-1)]).value)
				{
					bound = bounds[index];
					prevBound = bounds[parseInt(index - 1)];
					
					var prevProxyId = prevBound.proxyId;
					var prevProxy = this.m_proxyPool[ prevBound.proxyId ];
					
					prevBound.stabbingCount++;
					
					if (prevBound.IsUpper() == true)
					{
						if (this.TestOverlap(newValues, prevProxy))
						{
							this.m_pairManager.AddBufferedPair(proxyId, prevProxyId);
						}
						
						
						as3arr = prevProxy.upperBounds;
						as3int = as3arr[axis];
						as3int++;
						as3arr[axis] = as3int;
						
						bound.stabbingCount++;
					}
					else
					{
						
						as3arr = prevProxy.lowerBounds;
						as3int = as3arr[axis];
						as3int++;
						as3arr[axis] = as3int;
						
						bound.stabbingCount--;
					}
					
					
					as3arr = proxy.lowerBounds;
					as3int = as3arr[axis];
					as3int--;
					as3arr[axis] = as3int;
					
					
					
					
					
					bound.Swap(prevBound);
					
					--index;
				}
			}
			
			
			if (deltaUpper > 0)
			{
				index = upperIndex;
				while (index < boundCount-1 && (bounds[parseInt(index+1)]).value <= upperValue)
				{
					bound = bounds[ index ];
					nextBound = bounds[ parseInt(index + 1) ];
					nextProxyId = nextBound.proxyId;
					nextProxy = this.m_proxyPool[ nextProxyId ];
					
					nextBound.stabbingCount++;
					
					if (nextBound.IsLower() == true)
					{
						if (this.TestOverlap(newValues, nextProxy))
						{
							this.m_pairManager.AddBufferedPair(proxyId, nextProxyId);
						}
						
						
						as3arr = nextProxy.lowerBounds;
						as3int = as3arr[axis];
						as3int--;
						as3arr[axis] = as3int;
						
						bound.stabbingCount++;
					}
					else
					{
						
						as3arr = nextProxy.upperBounds;
						as3int = as3arr[axis];
						as3int--;
						as3arr[axis] = as3int;
						
						bound.stabbingCount--;
					}
					
					
					as3arr = proxy.upperBounds;
					as3int = as3arr[axis];
					as3int++;
					as3arr[axis] = as3int;
					
					
					
					
					
					bound.Swap(nextBound);
					
					index++;
				}
			}
			
			
			
			
			
			
			if (deltaLower > 0)
			{
				index = lowerIndex;
				while (index < boundCount-1 && (bounds[parseInt(index+1)]).value <= lowerValue)
				{
					bound = bounds[ index ];
					nextBound = bounds[ parseInt(index + 1) ];
					
					nextProxyId = nextBound.proxyId;
					nextProxy = this.m_proxyPool[ nextProxyId ];
					
					nextBound.stabbingCount--;
					
					if (nextBound.IsUpper())
					{
						if (this.TestOverlap(oldValues, nextProxy))
						{
							this.m_pairManager.RemoveBufferedPair(proxyId, nextProxyId);
						}
						
						
						as3arr = nextProxy.upperBounds;
						as3int = as3arr[axis];
						as3int--;
						as3arr[axis] = as3int;
						
						bound.stabbingCount--;
					}
					else
					{
						
						as3arr = nextProxy.lowerBounds;
						as3int = as3arr[axis];
						as3int--;
						as3arr[axis] = as3int;
						
						bound.stabbingCount++;
					}
					
					
					as3arr = proxy.lowerBounds;
					as3int = as3arr[axis];
					as3int++;
					as3arr[axis] = as3int;
					
					
					
					
					
					bound.Swap(nextBound);
					
					index++;
				}
			}
			
			
			if (deltaUpper < 0)
			{
				index = upperIndex;
				while (index > 0 && upperValue < (bounds[parseInt(index-1)]).value)
				{
					bound = bounds[index];
					prevBound = bounds[parseInt(index - 1)];
					
					prevProxyId = prevBound.proxyId;
					prevProxy = this.m_proxyPool[ prevProxyId ];
					
					prevBound.stabbingCount--;
					
					if (prevBound.IsLower() == true)
					{
						if (this.TestOverlap(oldValues, prevProxy))
						{
							this.m_pairManager.RemoveBufferedPair(proxyId, prevProxyId);
						}
						
						
						as3arr = prevProxy.lowerBounds;
						as3int = as3arr[axis];
						as3int++;
						as3arr[axis] = as3int;
						
						bound.stabbingCount--;
					}
					else
					{
						
						as3arr = prevProxy.upperBounds;
						as3int = as3arr[axis];
						as3int++;
						as3arr[axis] = as3int;
						
						bound.stabbingCount++;
					}
					
					
					as3arr = proxy.upperBounds;
					as3int = as3arr[axis];
					as3int--;
					as3arr[axis] = as3int;
					
					
					
					
					
					bound.Swap(prevBound);
					
					index--;
				}
			}
		}
	}
b2BroadPhase.prototype.Commit = function () {
		this.m_pairManager.Commit();
	}
b2BroadPhase.prototype.QueryAABB = function (aabb, userData, maxCount) {
		var lowerValues = new Array();
		var upperValues = new Array();
		this.ComputeBounds(lowerValues, upperValues, aabb);
		
		var lowerIndex = 0;
		var upperIndex = 0;
		var lowerIndexOut = [lowerIndex];
		var upperIndexOut = [upperIndex];
		this.Query(lowerIndexOut, upperIndexOut, lowerValues[0], upperValues[0], this.m_bounds[0], 2*this.m_proxyCount, 0);
		this.Query(lowerIndexOut, upperIndexOut, lowerValues[1], upperValues[1], this.m_bounds[1], 2*this.m_proxyCount, 1);
		
		
		
		var count = 0;
		for (var i = 0; i < this.m_queryResultCount && count < maxCount; ++i, ++count)
		{
			
			var proxy = this.m_proxyPool[ this.m_queryResults[i] ];
			
			userData[i] = proxy.userData;
		}
		
		
		this.m_queryResultCount = 0;
		this.IncrementTimeStamp();
		
		return count;
	}
b2BroadPhase.prototype.Validate = function () {
		var pair;
		var proxy1;
		var proxy2;
		var overlap;
		
		for (var axis = 0; axis < 2; ++axis)
		{
			var bounds = this.m_bounds[axis];
			
			var boundCount = 2 * this.m_proxyCount;
			var stabbingCount = 0;
			
			for (var i = 0; i < boundCount; ++i)
			{
				var bound = bounds[i];
				
				
				
				
				if (bound.IsLower() == true)
				{
					
					stabbingCount++;
				}
				else
				{
					
					stabbingCount--;
				}
				
				
			}
		}
		
	}
b2BroadPhase.prototype.TestOverlap = function (b, p) {
		for (var axis = 0; axis < 2; ++axis)
		{
			var bounds = this.m_bounds[axis];
			
			
			
			
			var bound = bounds[p.upperBounds[axis]];
			if (b.lowerValues[axis] > bound.value)
				return false;
			
			bound = bounds[p.lowerBounds[axis]];
			if (b.upperValues[axis] < bound.value)
				return false;
		}
		
		return true;
	}
exports.b2BroadPhase = b2BroadPhase;
	
	
var b2TimeOfImpact = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2TimeOfImpact.prototype.__constructor = function(){}
b2TimeOfImpact.prototype.__varz = function(){
}
b2TimeOfImpact.s_p1 =  new b2Vec2();
b2TimeOfImpact.s_p2 =  new b2Vec2();
b2TimeOfImpact.s_xf1 =  new b2XForm();
b2TimeOfImpact.s_xf2 =  new b2XForm();
b2TimeOfImpact.TimeOfImpact = function (	shape1, sweep1,
								shape2, sweep2) {
	var math1;
	var math2;
	
	var r1 = shape1.m_sweepRadius;
	var r2 = shape2.m_sweepRadius;

	
	

	var t0 = sweep1.t0;
	
	var v1X = sweep1.c.x - sweep1.c0.x;
	var v1Y = sweep1.c.y - sweep1.c0.y;
	
	var v2X = sweep2.c.x - sweep2.c0.x;
	var v2Y = sweep2.c.y - sweep2.c0.y;
	var omega1 = sweep1.a - sweep1.a0;
	var omega2 = sweep2.a - sweep2.a0;

	var alpha = 0.0;

	var p1 = b2TimeOfImpact.s_p1;
	var p2 = b2TimeOfImpact.s_p2;
	var k_maxIterations = 20;	
	var iter = 0;
	
	var normalX = 0.0;
	var normalY = 0.0;
	var distance = 0.0;
	var targetDistance = 0.0;
	for(;;)
	{
		var t = (1.0 - alpha) * t0 + alpha;
		
		var xf1 = b2TimeOfImpact.s_xf1;
		var xf2 = b2TimeOfImpact.s_xf2;
		sweep1.GetXForm(xf1, t);
		sweep2.GetXForm(xf2, t);
		
		
		distance = b2Distance.Distance(p1, p2, shape1, xf1, shape2, xf2);
		
		if (iter == 0)
		{
			
			
			if (distance > 2.0 * b2Settings.b2_toiSlop)
			{
				targetDistance = 1.5 * b2Settings.b2_toiSlop;
			}
			else
			{
				
				math1 = 0.05 * b2Settings.b2_toiSlop;
				math2 = distance - 0.5 * b2Settings.b2_toiSlop;
				targetDistance = math1 > math2 ? math1 : math2;
			}
		}
		
		if (distance - targetDistance < 0.05 * b2Settings.b2_toiSlop || iter == k_maxIterations)
		{
			break;
		}
		
		
		normalX = p2.x - p1.x;
		normalY = p2.y - p1.y;
		
		var nLen = Math.sqrt(normalX*normalX + normalY*normalY);
		normalX /= nLen;
		normalY /= nLen;
		
		
		
		var approachVelocityBound = 	(normalX*(v1X - v2X) + normalY*(v1Y - v2Y))
											+ (omega1 < 0 ? -omega1 : omega1) * r1 
											+ (omega2 < 0 ? -omega2 : omega2) * r2;
		
		if (approachVelocityBound == 0)
		{
			alpha = 1.0;
			break;
		}
		
		
		var dAlpha = (distance - targetDistance) / approachVelocityBound;
		
		var newAlpha = alpha + dAlpha;
		
		
		if (newAlpha < 0.0 || 1.0 < newAlpha)
		{
			alpha = 1.0;
			break;
		}
		
		
		if (newAlpha < (1.0 + 100.0 * Number.MIN_VALUE) * alpha)
		{
			break;
		}
		
		alpha = newAlpha;
		
		++iter;
	}

	return alpha;
}
exports.b2TimeOfImpact = b2TimeOfImpact;


var b2ContactPoint = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ContactPoint.prototype.__constructor = function(){}
b2ContactPoint.prototype.__varz = function(){
this.position =  new b2Vec2();
this.velocity =  new b2Vec2();
this.normal =  new b2Vec2();
this.id =  new b2ContactID();
}
b2ContactPoint.prototype.shape1 =  null;
b2ContactPoint.prototype.shape2 =  null;
b2ContactPoint.prototype.position =  new b2Vec2();
b2ContactPoint.prototype.velocity =  new b2Vec2();
b2ContactPoint.prototype.normal =  new b2Vec2();
b2ContactPoint.prototype.separation =  null;
b2ContactPoint.prototype.friction =  null;
b2ContactPoint.prototype.restitution =  null;
b2ContactPoint.prototype.id =  new b2ContactID();
exports.b2ContactPoint= b2ContactPoint;


var ClipVertex = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
ClipVertex.prototype.__constructor = function(){}
ClipVertex.prototype.__varz = function(){
this.v =  new b2Vec2();
this.id =  new b2ContactID();
}
ClipVertex.prototype.v =  new b2Vec2();
ClipVertex.prototype.id =  new b2ContactID();
exports.ClipVertex = ClipVertex;


var b2MassData = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2MassData.prototype.__constructor = function(){}
b2MassData.prototype.__varz = function(){
this.center =  new b2Vec2(0,0);
}
b2MassData.prototype.mass =  0.0;
b2MassData.prototype.center =  new b2Vec2(0,0);
b2MassData.prototype.I =  0.0;
exports.b2MassData = b2MassData;


var b2FilterData = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2FilterData.prototype.__constructor = function(){}
b2FilterData.prototype.__varz = function(){
this.categoryBits =  0x0001;
this.maskBits =  0xFFFF;
}
b2FilterData.prototype.categoryBits =  0x0001;
b2FilterData.prototype.maskBits =  0xFFFF;
b2FilterData.prototype.groupIndex =  0;
b2FilterData.prototype.Copy = function () {
		var copy = new b2FilterData();
		copy.categoryBits = this.categoryBits;
		copy.maskBits = this.maskBits;
		copy.groupIndex = this.groupIndex;
		return copy;
	}
exports.b2FilterData = b2FilterData;
	
	
var b2Shape = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Shape.prototype.__constructor = function (def) {
		
		this.m_userData = def.userData;
		this.m_friction = def.friction;
		this.m_restitution = def.restitution;
		this.m_density = def.density;
		this.m_body = null;
		this.m_sweepRadius = 0.0;
		
		this.m_next = null;
		
		this.m_proxyId = b2Pair.b2_nullProxy;
		
		this.m_filter = def.filter.Copy();
		
		this.m_isSensor = def.isSensor;
		
	}
b2Shape.prototype.__varz = function(){
}
b2Shape.e_unknownShape =  	-1;
b2Shape.e_circleShape =  	0;
b2Shape.e_polygonShape =  	1;
b2Shape.e_shapeTypeCount =  	2;
b2Shape.s_proxyAABB =  new b2AABB();
b2Shape.s_syncAABB =  new b2AABB();
b2Shape.s_resetAABB =  new b2AABB();
b2Shape.Create = function (def, allocator) {
		switch (def.type)
		{
		case b2Shape.e_circleShape:
			{
				
				return new b2CircleShape(def);
			}
		
		case b2Shape.e_polygonShape:
			{
				
				return new b2PolygonShape(def);
			}
		
		default:
			
			return null;
		}
	}
b2Shape.Destroy = function (shape, allocator) {
		
	}
b2Shape.prototype.m_type =  0;
b2Shape.prototype.m_next =  null;
b2Shape.prototype.m_body =  null;
b2Shape.prototype.m_sweepRadius =  null;
b2Shape.prototype.m_density =  null;
b2Shape.prototype.m_friction =  null;
b2Shape.prototype.m_restitution =  null;
b2Shape.prototype.m_proxyId =  0;
b2Shape.prototype.m_filter =  null;
b2Shape.prototype.m_isSensor =  null;
b2Shape.prototype.m_userData =  null;
b2Shape.prototype.GetType = function () {
		return this.m_type;
	}
b2Shape.prototype.IsSensor = function () {
		return this.m_isSensor;
	}
b2Shape.prototype.SetFilterData = function (filter) {
		this.m_filter = filter.Copy();
	}
b2Shape.prototype.GetFilterData = function () {
		return this.m_filter.Copy();
	}
b2Shape.prototype.GetBody = function () {
		return this.m_body;
	}
b2Shape.prototype.GetNext = function () {
		return this.m_next;
	}
b2Shape.prototype.GetUserData = function () {
		return this.m_userData;
	}
b2Shape.prototype.SetUserData = function (data) {
		this.m_userData = data;
	}
b2Shape.prototype.TestPoint = function (xf, p) {return false}
b2Shape.prototype.TestSegment = function (xf,
								lambda, 
								normal, 
								segment,
								maxLambda) {return false}
b2Shape.prototype.ComputeAABB = function (aabb, xf) {}
b2Shape.prototype.ComputeSweptAABB = function (	aabb,
									xf1,
									xf2) {}
b2Shape.prototype.ComputeMass = function (massData) {}
b2Shape.prototype.GetSweepRadius = function () {
		return this.m_sweepRadius;
	}
b2Shape.prototype.GetFriction = function () {
		return this.m_friction;
	}
b2Shape.prototype.GetRestitution = function () {
		return this.m_restitution;
	}
b2Shape.prototype.CreateProxy = function (broadPhase, transform) {
		
		
		
		var aabb = b2Shape.s_proxyAABB;
		this.ComputeAABB(aabb, transform);
		
		var inRange = broadPhase.InRange(aabb);
		
		
		
		
		if (inRange)
		{
			this.m_proxyId = broadPhase.CreateProxy(aabb, this);
		}
		else
		{
			this.m_proxyId = b2Pair.b2_nullProxy;
		}
		
	}
b2Shape.prototype.DestroyProxy = function (broadPhase) {
		
		if (this.m_proxyId != b2Pair.b2_nullProxy)
		{
			broadPhase.DestroyProxy(this.m_proxyId);
			this.m_proxyId = b2Pair.b2_nullProxy;
		}
		
	}
b2Shape.prototype.Synchronize = function (broadPhase, transform1, transform2) {
		
		if (this.m_proxyId == b2Pair.b2_nullProxy)
		{	
			return false;
		}
		
		
		var aabb = b2Shape.s_syncAABB;
		this.ComputeSweptAABB(aabb, transform1, transform2);
		
		if (broadPhase.InRange(aabb))
		{
			broadPhase.MoveProxy(this.m_proxyId, aabb);
			return true;
		}
		else
		{
			return false;
		}
		
	}
b2Shape.prototype.RefilterProxy = function (broadPhase, transform) {
		
		if (this.m_proxyId == b2Pair.b2_nullProxy)
		{
			return;
		}
		
		broadPhase.DestroyProxy(this.m_proxyId);
		
		var aabb = b2Shape.s_resetAABB;
		this.ComputeAABB(aabb, transform);
		
		var inRange = broadPhase.InRange(aabb);
		
		if (inRange)
		{
			this.m_proxyId = broadPhase.CreateProxy(aabb, this);
		}
		else
		{
			this.m_proxyId = b2Pair.b2_nullProxy;
		}
		
	}
b2Shape.prototype.UpdateSweepRadius = function (center) {}
exports.b2Shape = b2Shape;


var b2CircleShape = function() {
b2Shape.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2CircleShape.prototype, b2Shape.prototype)
b2CircleShape.prototype._super = function(){ b2Shape.prototype.__constructor.apply(this, arguments) }
b2CircleShape.prototype.__constructor = function (def) {
		this._super(def);
		
		
		var circleDef = def;
		
		this.m_type = b2Shape.e_circleShape;
		this.m_localPosition.SetV(circleDef.localPosition);
		this.m_radius = circleDef.radius;
		
	}
b2CircleShape.prototype.__varz = function(){
this.m_localPosition =  new b2Vec2();
}
b2CircleShape.prototype.m_localPosition =  new b2Vec2();
b2CircleShape.prototype.m_radius =  null;
b2CircleShape.prototype.TestPoint = function (transform, p) {
		
		var tMat = transform.R;
		var dX = transform.position.x + (tMat.col1.x * this.m_localPosition.x + tMat.col2.x * this.m_localPosition.y);
		var dY = transform.position.y + (tMat.col1.y * this.m_localPosition.x + tMat.col2.y * this.m_localPosition.y);
		
		dX = p.x - dX;
		dY = p.y - dY;
		
		return (dX*dX + dY*dY) <= this.m_radius * this.m_radius;
	}
b2CircleShape.prototype.TestSegment = function (	transform,
						lambda, 
						normal, 
						segment,
						maxLambda) {
		
		var tMat = transform.R;
		var positionX = transform.position.x + (tMat.col1.x * this.m_localPosition.x + tMat.col2.x * this.m_localPosition.y);
		var positionY = transform.position.y + (tMat.col1.y * this.m_localPosition.x + tMat.col2.y * this.m_localPosition.y);
		
		
		var sX = segment.p1.x - positionX;
		var sY = segment.p1.y - positionY;
		
		var b = (sX*sX + sY*sY) - this.m_radius * this.m_radius;
		
		
		if (b < 0.0)
		{
			return false;
		}
		
		
		
		var rX = segment.p2.x - segment.p1.x;
		var rY = segment.p2.y - segment.p1.y;
		
		var c = (sX*rX + sY*rY);
		
		var rr = (rX*rX + rY*rY);
		var sigma = c * c - rr * b;
		
		
		if (sigma < 0.0 || rr < Number.MIN_VALUE)
		{
			return false;
		}
		
		
		var a = -(c + Math.sqrt(sigma));
		
		
		if (0.0 <= a && a <= maxLambda * rr)
		{
			a /= rr;
			
			lambda[0] = a;
			
			normal.x = sX + a * rX;
			normal.y = sY + a * rY;
			normal.Normalize();
			return true;
		}
		
		return false;
	}
b2CircleShape.prototype.ComputeAABB = function (aabb, transform) {
		
		var tMat = transform.R;
		var pX = transform.position.x + (tMat.col1.x * this.m_localPosition.x + tMat.col2.x * this.m_localPosition.y);
		var pY = transform.position.y + (tMat.col1.y * this.m_localPosition.x + tMat.col2.y * this.m_localPosition.y);
		aabb.lowerBound.Set(pX - this.m_radius, pY - this.m_radius);
		aabb.upperBound.Set(pX + this.m_radius, pY + this.m_radius);
	}
b2CircleShape.prototype.ComputeSweptAABB = function (	aabb,
							transform1,
							transform2) {
		var tMat;
		
		tMat = transform1.R;
		var p1X = transform1.position.x + (tMat.col1.x * this.m_localPosition.x + tMat.col2.x * this.m_localPosition.y);
		var p1Y = transform1.position.y + (tMat.col1.y * this.m_localPosition.x + tMat.col2.y * this.m_localPosition.y);
		
		tMat = transform2.R;
		var p2X = transform2.position.x + (tMat.col1.x * this.m_localPosition.x + tMat.col2.x * this.m_localPosition.y);
		var p2Y = transform2.position.y + (tMat.col1.y * this.m_localPosition.x + tMat.col2.y * this.m_localPosition.y);
		
		
		
		
		
		aabb.lowerBound.Set((p1X < p2X ? p1X : p2X) - this.m_radius, (p1Y < p2Y ? p1Y : p2Y) - this.m_radius);
		
		aabb.upperBound.Set((p1X > p2X ? p1X : p2X) + this.m_radius, (p1Y > p2Y ? p1Y : p2Y) + this.m_radius);
	}
b2CircleShape.prototype.ComputeMass = function (massData) {
		massData.mass = this.m_density * b2Settings.b2_pi * this.m_radius * this.m_radius;
		massData.center.SetV(this.m_localPosition);
		
		
		
		massData.I = massData.mass * (0.5 * this.m_radius * this.m_radius + (this.m_localPosition.x*this.m_localPosition.x + this.m_localPosition.y*this.m_localPosition.y));
	}
b2CircleShape.prototype.GetLocalPosition = function () {
		return this.m_localPosition;
	}
b2CircleShape.prototype.GetRadius = function () {
		return this.m_radius;
	}
b2CircleShape.prototype.UpdateSweepRadius = function (center) {
		
		
		
		var dX = this.m_localPosition.x - center.x;
		var dY = this.m_localPosition.y - center.y;
		dX = Math.sqrt(dX*dX + dY*dY); 
		
		this.m_sweepRadius = dX + this.m_radius - b2Settings.b2_toiSlop;
	}
exports.b2CircleShape = b2CircleShape;
	
	
var b2ShapeDef = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ShapeDef.prototype.__constructor = function(){}
b2ShapeDef.prototype.__varz = function(){
this.type =  b2Shape.e_unknownShape;
this.filter =  new b2FilterData();
}
b2ShapeDef.prototype.type =  b2Shape.e_unknownShape;
b2ShapeDef.prototype.userData =  null;
b2ShapeDef.prototype.friction =  0.2;
b2ShapeDef.prototype.restitution =  0.0;
b2ShapeDef.prototype.density =  0.0;
b2ShapeDef.prototype.isSensor =  false;
b2ShapeDef.prototype.filter =  new b2FilterData();
exports.b2ShapeDef = b2ShapeDef;


var b2PolygonDef = function() {
b2ShapeDef.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2PolygonDef.prototype, b2ShapeDef.prototype)
b2PolygonDef.prototype._super = function(){ b2ShapeDef.prototype.__constructor.apply(this, arguments) }
b2PolygonDef.prototype.__constructor = function () {
		this.type = b2Shape.e_polygonShape;
		this.vertexCount = 0;
		
		for (var i = 0; i < b2Settings.b2_maxPolygonVertices; i++){
			this.vertices[i] = new b2Vec2();
		}
	}
b2PolygonDef.prototype.__varz = function(){
this.vertices =  new Array(b2Settings.b2_maxPolygonVertices);
}
b2PolygonDef.s_mat =  new b2Mat22();
b2PolygonDef.prototype.vertices =  new Array(b2Settings.b2_maxPolygonVertices);
b2PolygonDef.prototype.vertexCount =  0;
b2PolygonDef.prototype.SetAsBox = function (hx, hy) {
		this.vertexCount = 4;
		this.vertices[0].Set(-hx, -hy);
		this.vertices[1].Set( hx, -hy);
		this.vertices[2].Set( hx, hy);
		this.vertices[3].Set(-hx, hy);
	}
b2PolygonDef.prototype.SetAsOrientedBox = function (hx, hy, center, angle) {
		
		{
			this.vertexCount = 4;
			this.vertices[0].Set(-hx, -hy);
			this.vertices[1].Set( hx, -hy);
			this.vertices[2].Set( hx, hy);
			this.vertices[3].Set(-hx, hy);
		}
		
		if (center){
			
			
			var xfPosition = center;
			
			var xfR = b2PolygonDef.s_mat;
			xfR.Set(angle);
			
			for (var i = 0; i < this.vertexCount; ++i)
			{
				
				
				center = this.vertices[i];
				hx = xfPosition.x + (xfR.col1.x * center.x + xfR.col2.x * center.y)
				center.y = xfPosition.y + (xfR.col1.y * center.x + xfR.col2.y * center.y)
				center.x = hx;
			}
		}
	}
exports.b2PolygonDef = b2PolygonDef;
	
	
var b2PolygonShape = function() {
b2Shape.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2PolygonShape.prototype, b2Shape.prototype)
b2PolygonShape.prototype._super = function(){ b2Shape.prototype.__constructor.apply(this, arguments) }
b2PolygonShape.prototype.__constructor = function (def) {
		this._super(def);
		
		
		this.m_type = b2Shape.e_polygonShape;
		var poly = def;
		
		
		this.m_vertexCount = poly.vertexCount;
		
		
		var i = 0;
		var i1 = i;
		var i2 = i;
		
		
		for (i = 0; i < this.m_vertexCount; ++i)
		{
			this.m_vertices[i] = poly.vertices[i].Copy();
		}
		
		
		for (i = 0; i < this.m_vertexCount; ++i)
		{
			i1 = i;
			i2 = i + 1 < this.m_vertexCount ? i + 1 : 0;
			
			var edgeX = this.m_vertices[i2].x - this.m_vertices[i1].x;
			var edgeY = this.m_vertices[i2].y - this.m_vertices[i1].y;
			
			
			var len = Math.sqrt(edgeX*edgeX + edgeY*edgeY);
			
			this.m_normals[i] = new b2Vec2(edgeY/len, -edgeX/len);
		}
		
		
		
		
		this.m_centroid = b2PolygonShape.ComputeCentroid(poly.vertices, poly.vertexCount);
		
		
		b2PolygonShape.ComputeOBB(this.m_obb, this.m_vertices, this.m_vertexCount);
		
		
		
		for (i = 0; i < this.m_vertexCount; ++i)
		{
			i1 = i - 1 >= 0 ? i - 1 : this.m_vertexCount - 1;
			i2 = i;
			
			
			var n1X = this.m_normals[i1].x;
			var n1Y = this.m_normals[i1].y;
			
			var n2X = this.m_normals[i2].x;
			var n2Y = this.m_normals[i2].y;
			
			var vX = this.m_vertices[i].x - this.m_centroid.x;
			var vY = this.m_vertices[i].y - this.m_centroid.y;
			
			
			var dX = (n1X*vX + n1Y*vY) - b2Settings.b2_toiSlop;
			var dY = (n2X*vX + n2Y*vY) - b2Settings.b2_toiSlop;
			
			
			
			
			
			
			
			
			
			
			
			
			var det = 1.0/(n1X * n2Y - n1Y * n2X);
			
			this.m_coreVertices[i] = new b2Vec2(	det * (n2Y * dX - n1Y * dY) + this.m_centroid.x, 
											det * (n1X * dY - n2X * dX) + this.m_centroid.y);
		}
	}
b2PolygonShape.prototype.__varz = function(){
this.s_supportVec =  new b2Vec2();
this.m_obb =  new b2OBB();
this.m_vertices =  new Array(b2Settings.b2_maxPolygonVertices);
this.m_normals =  new Array(b2Settings.b2_maxPolygonVertices);
this.m_coreVertices =  new Array(b2Settings.b2_maxPolygonVertices);
}
b2PolygonShape.s_computeMat =  new b2Mat22();
b2PolygonShape.s_sweptAABB1 =  new b2AABB();
b2PolygonShape.s_sweptAABB2 =  new b2AABB();
b2PolygonShape.ComputeCentroid = function (vs, count) {
		
		
		var c = new b2Vec2();
		var area = 0.0;
		
		
		
		
		var p1X = 0.0;
		var p1Y = 0.0;
	
		
		var inv3 = 1.0 / 3.0;
		
		for (var i = 0; i < count; ++i)
		{
			
			
				
			
			var p2 = vs[i];
			
			var p3 = i + 1 < count ? vs[parseInt(i+1)] : vs[0];
			
			
			var e1X = p2.x - p1X;
			var e1Y = p2.y - p1Y;
			
			var e2X = p3.x - p1X;
			var e2Y = p3.y - p1Y;
			
			
			var D = (e1X * e2Y - e1Y * e2X);
			
			
			var triangleArea = 0.5 * D;
			area += triangleArea;
			
			
			
			c.x += triangleArea * inv3 * (p1X + p2.x + p3.x);
			c.y += triangleArea * inv3 * (p1Y + p2.y + p3.y);
		}
		
		
		
		
		c.x *= 1.0 / area;
		c.y *= 1.0 / area;
		return c;
	}
b2PolygonShape.ComputeOBB = function (obb, vs, count) {
		var i = 0;
		
		var p = new Array(b2Settings.b2_maxPolygonVertices + 1);
		for (i = 0; i < count; ++i)
		{
			p[i] = vs[i];
		}
		p[count] = p[0];
		
		var minArea = Number.MAX_VALUE;
		
		for (i = 1; i <= count; ++i)
		{
			var root = p[parseInt(i-1)];
			
			var uxX = p[i].x - root.x;
			var uxY = p[i].y - root.y;
			
			var length = Math.sqrt(uxX*uxX + uxY*uxY);
			uxX /= length;
			uxY /= length;
			
			
			var uyX = -uxY;
			var uyY = uxX;
			
			var lowerX = Number.MAX_VALUE;
			var lowerY = Number.MAX_VALUE;
			
			var upperX = -Number.MAX_VALUE;
			var upperY = -Number.MAX_VALUE;
			
			for (var j = 0; j < count; ++j)
			{
				
				var dX = p[j].x - root.x;
				var dY = p[j].y - root.y;
				
				
				var rX = (uxX*dX + uxY*dY);
				
				var rY = (uyX*dX + uyY*dY);
				
				if (rX < lowerX) lowerX = rX;
				if (rY < lowerY) lowerY = rY;
				
				if (rX > upperX) upperX = rX;
				if (rY > upperY) upperY = rY;
			}
			
			var area = (upperX - lowerX) * (upperY - lowerY);
			if (area < 0.95 * minArea)
			{
				minArea = area;
				
				obb.R.col1.x = uxX;
				obb.R.col1.y = uxY;
				
				obb.R.col2.x = uyX;
				obb.R.col2.y = uyY;
				
				var centerX = 0.5 * (lowerX + upperX);
				var centerY = 0.5 * (lowerY + upperY);
				
				var tMat = obb.R;
				obb.center.x = root.x + (tMat.col1.x * centerX + tMat.col2.x * centerY);
				obb.center.y = root.y + (tMat.col1.y * centerX + tMat.col2.y * centerY);
				
				obb.extents.x = 0.5 * (upperX - lowerX);
				obb.extents.y = 0.5 * (upperY - lowerY);
			}
		}
		
		
	}
b2PolygonShape.prototype.s_supportVec =  new b2Vec2();
b2PolygonShape.prototype.m_centroid =  null;
b2PolygonShape.prototype.m_obb =  new b2OBB();
b2PolygonShape.prototype.m_vertices =  new Array(b2Settings.b2_maxPolygonVertices);
b2PolygonShape.prototype.m_normals =  new Array(b2Settings.b2_maxPolygonVertices);
b2PolygonShape.prototype.m_coreVertices =  new Array(b2Settings.b2_maxPolygonVertices);
b2PolygonShape.prototype.m_vertexCount =  0;
b2PolygonShape.prototype.TestPoint = function (xf, p) {
		var tVec;
		
		
		var tMat = xf.R;
		var tX = p.x - xf.position.x;
		var tY = p.y - xf.position.y;
		var pLocalX = (tX*tMat.col1.x + tY*tMat.col1.y);
		var pLocalY = (tX*tMat.col2.x + tY*tMat.col2.y);
		
		for (var i = 0; i < this.m_vertexCount; ++i)
		{
			
			tVec = this.m_vertices[i];
			tX = pLocalX - tVec.x;
			tY = pLocalY - tVec.y;
			tVec = this.m_normals[i];
			var dot = (tVec.x * tX + tVec.y * tY);
			if (dot > 0.0)
			{
				return false;
			}
		}
		
		return true;
	}
b2PolygonShape.prototype.TestSegment = function ( xf,
		lambda, 
		normal, 
		segment,
		maxLambda) {
		var lower = 0.0;
		var upper = maxLambda;
		
		var tX;
		var tY;
		var tMat;
		var tVec;
		
		
		tX = segment.p1.x - xf.position.x;
		tY = segment.p1.y - xf.position.y;
		tMat = xf.R;
		var p1X = (tX * tMat.col1.x + tY * tMat.col1.y);
		var p1Y = (tX * tMat.col2.x + tY * tMat.col2.y);
		
		tX = segment.p2.x - xf.position.x;
		tY = segment.p2.y - xf.position.y;
		tMat = xf.R;
		var p2X = (tX * tMat.col1.x + tY * tMat.col1.y);
		var p2Y = (tX * tMat.col2.x + tY * tMat.col2.y);
		
		var dX = p2X - p1X;
		var dY = p2Y - p1Y;
		var index = -1;
		
		for (var i = 0; i < this.m_vertexCount; ++i)
		{
			
			
			
			
			
			tVec = this.m_vertices[i];
			tX = tVec.x - p1X;
			tY = tVec.y - p1Y;
			tVec = this.m_normals[i];
			var numerator = (tVec.x*tX + tVec.y*tY);
			
			var denominator = (tVec.x*dX + tVec.y*dY);
			
			
			
			
			
			
			if (denominator < 0.0 && numerator < lower * denominator)
			{
				
				
				lower = numerator / denominator;
				index = i;
			}
			else if (denominator > 0.0 && numerator < upper * denominator)
			{
				
				
				upper = numerator / denominator;
			}
			
			if (upper < lower)
			{
				return false;
			}
		}
		
		
		
		if (index >= 0)
		{
			
			lambda[0] = lower;
			
			tMat = xf.R;
			tVec = this.m_normals[index];
			normal.x = (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
			normal.y = (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
			return true;
		}
		
		return false;
	}
b2PolygonShape.prototype.ComputeAABB = function (aabb, xf) {
		var tMat;
		var tVec;
		
		var R = b2PolygonShape.s_computeMat;
		
		tMat = xf.R;
		tVec = this.m_obb.R.col1;
		
		R.col1.x = (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		R.col1.y = (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		tVec = this.m_obb.R.col2;
		
		R.col2.x = (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		R.col2.y = (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		
		R.Abs();
		var absR = R;
		
		tVec = this.m_obb.extents;
		var hX = (absR.col1.x * tVec.x + absR.col2.x * tVec.y);
		var hY = (absR.col1.y * tVec.x + absR.col2.y * tVec.y);
		
		tMat = xf.R;
		tVec = this.m_obb.center;
		var positionX = xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		var positionY = xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		aabb.lowerBound.Set(positionX - hX, positionY - hY);
		
		aabb.upperBound.Set(positionX + hX, positionY + hY);
	}
b2PolygonShape.prototype.ComputeSweptAABB = function (	aabb,
		transform1,
		transform2) {
		
		var aabb1 = b2PolygonShape.s_sweptAABB1;
		var aabb2 = b2PolygonShape.s_sweptAABB2;
		this.ComputeAABB(aabb1, transform1);
		this.ComputeAABB(aabb2, transform2);
		
		aabb.lowerBound.Set((aabb1.lowerBound.x < aabb2.lowerBound.x ? aabb1.lowerBound.x : aabb2.lowerBound.x),
							(aabb1.lowerBound.y < aabb2.lowerBound.y ? aabb1.lowerBound.y : aabb2.lowerBound.y));
		
		aabb.upperBound.Set((aabb1.upperBound.x > aabb2.upperBound.x ? aabb1.upperBound.x : aabb2.upperBound.x),
							(aabb1.upperBound.y > aabb2.upperBound.y ? aabb1.upperBound.y : aabb2.upperBound.y));
	}
b2PolygonShape.prototype.ComputeMass = function (massData) {
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		var centerX = 0.0;
		var centerY = 0.0;
		var area = 0.0;
		var I = 0.0;
		
		
		
		
		var p1X = 0.0;
		var p1Y = 0.0;
		
		
		var k_inv3 = 1.0 / 3.0;
		
		for (var i = 0; i < this.m_vertexCount; ++i)
		{
			
			
			
			
			var p2 = this.m_vertices[i];
			
			var p3 = i + 1 < this.m_vertexCount ? this.m_vertices[parseInt(i+1)] : this.m_vertices[0];
			
			
			var e1X = p2.x - p1X;
			var e1Y = p2.y - p1Y;
			
			var e2X = p3.x - p1X;
			var e2Y = p3.y - p1Y;
			
			
			var D = e1X * e2Y - e1Y * e2X;
			
			
			var triangleArea = 0.5 * D;
			area += triangleArea;
			
			
			
			centerX += triangleArea * k_inv3 * (p1X + p2.x + p3.x);
			centerY += triangleArea * k_inv3 * (p1Y + p2.y + p3.y);
			
			
			var px = p1X;
			var py = p1Y;
			
			var ex1 = e1X;
			var ey1 = e1Y;
			
			var ex2 = e2X;
			var ey2 = e2Y;
			
			
			var intx2 = k_inv3 * (0.25 * (ex1*ex1 + ex2*ex1 + ex2*ex2) + (px*ex1 + px*ex2)) + 0.5*px*px;
			
			var inty2 = k_inv3 * (0.25 * (ey1*ey1 + ey2*ey1 + ey2*ey2) + (py*ey1 + py*ey2)) + 0.5*py*py;
			
			I += D * (intx2 + inty2);
		}
		
		
		massData.mass = this.m_density * area;
		
		
		
		
		centerX *= 1.0 / area;
		centerY *= 1.0 / area;
		
		massData.center.Set(centerX, centerY);
		
		
		massData.I = this.m_density * I;
	}
b2PolygonShape.prototype.GetOBB = function () {
		return this.m_obb;
	}
b2PolygonShape.prototype.GetCentroid = function () {
		return this.m_centroid;
	}
b2PolygonShape.prototype.GetVertexCount = function () {
		return this.m_vertexCount;
	}
b2PolygonShape.prototype.GetVertices = function () {
		return this.m_vertices;
	}
b2PolygonShape.prototype.GetCoreVertices = function () {
		return this.m_coreVertices;
	}
b2PolygonShape.prototype.GetNormals = function () {
		return this.m_normals;
	}
b2PolygonShape.prototype.GetFirstVertex = function (xf) {
		return b2Math.b2MulX(xf, this.m_coreVertices[0]);
	}
b2PolygonShape.prototype.Centroid = function (xf) {
		return b2Math.b2MulX(xf, this.m_centroid);
	}
b2PolygonShape.prototype.Support = function (xf, dX, dY) {
		var tVec;
		
		var tMat;
		
		tMat = xf.R;
		var dLocalX = (dX * tMat.col1.x + dY * tMat.col1.y);
		var dLocalY = (dX * tMat.col2.x + dY * tMat.col2.y);
		
		var bestIndex = 0;
		
		tVec = this.m_coreVertices[0];
		var bestValue = (tVec.x*dLocalX + tVec.y*dLocalY);
		for (var i = 1; i < this.m_vertexCount; ++i)
		{
			
			tVec = this.m_coreVertices[i];
			var value = (tVec.x*dLocalX + tVec.y*dLocalY);
			if (value > bestValue)
			{
				bestIndex = i;
				bestValue = value;
			}
		}
		
		
		tMat = xf.R;
		tVec = this.m_coreVertices[bestIndex];
		this.s_supportVec.x = xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		this.s_supportVec.y = xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		return this.s_supportVec;
		
	}
b2PolygonShape.prototype.UpdateSweepRadius = function (center) {
		var tVec;
		
		
		
		this.m_sweepRadius = 0.0;
		for (var i = 0; i < this.m_vertexCount; ++i)
		{
			
			tVec = this.m_coreVertices[i];
			var dX = tVec.x - center.x;
			var dY = tVec.y - center.y;
			dX = Math.sqrt(dX*dX + dY*dY);
			
			if (dX > this.m_sweepRadius) this.m_sweepRadius = dX;
		}
	}
exports.b2PolygonShape = b2PolygonShape;


var b2CircleDef = function() {
b2ShapeDef.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2CircleDef.prototype, b2ShapeDef.prototype)
b2CircleDef.prototype._super = function(){ b2ShapeDef.prototype.__constructor.apply(this, arguments) }
b2CircleDef.prototype.__constructor = function () {
		this.type = b2Shape.e_circleShape;
		this.radius = 1.0;
	}
b2CircleDef.prototype.__varz = function(){
this.localPosition =  new b2Vec2(0.0, 0.0);
}
b2CircleDef.prototype.localPosition =  new b2Vec2(0.0, 0.0);
b2CircleDef.prototype.radius =  null;
exports.b2CircleDef = b2CircleDef;


var b2TimeStep = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2TimeStep.prototype.__constructor = function(){}
b2TimeStep.prototype.__varz = function(){
}
b2TimeStep.prototype.dt =  null;
b2TimeStep.prototype.inv_dt =  null;
b2TimeStep.prototype.dtRatio =  null;
b2TimeStep.prototype.maxIterations =  0;
b2TimeStep.prototype.warmStarting =  null;
b2TimeStep.prototype.positionCorrection =  null;
exports.b2TimeStep = b2TimeStep;


var b2BoundaryListener = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2BoundaryListener.prototype.__constructor = function(){}
b2BoundaryListener.prototype.__varz = function(){
}
b2BoundaryListener.prototype.Violation = function (body) {}
exports.b2BoundaryListener = b2BoundaryListener;


var b2ContactListener = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ContactListener.prototype.__constructor = function(){}
b2ContactListener.prototype.__varz = function(){
}
b2ContactListener.prototype.Add = function (point) {}
b2ContactListener.prototype.Persist = function (point) {}
b2ContactListener.prototype.Remove = function (point) {}
b2ContactListener.prototype.Result = function (point) {}
exports.b2ContactListener = b2ContactListener;


var b2DestructionListener = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2DestructionListener.prototype.__constructor = function(){}
b2DestructionListener.prototype.__varz = function(){
}
b2DestructionListener.prototype.SayGoodbyeJoint = function (joint) {}
b2DestructionListener.prototype.SayGoodbyeShape = function (shape) {}
exports.b2DestructionListener = b2DestructionListener;


var b2DebugDraw = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2DebugDraw.prototype.__constructor = function () {
		this.m_drawFlags = 0;
	}
b2DebugDraw.prototype.__varz = function(){
}
b2DebugDraw.e_shapeBit =  0x0001;
b2DebugDraw.e_jointBit =  0x0002;
b2DebugDraw.e_coreShapeBit =  0x0004;
b2DebugDraw.e_aabbBit =  0x0008;
b2DebugDraw.e_obbBit =  0x0010;
b2DebugDraw.e_pairBit =  0x0020;
b2DebugDraw.e_centerOfMassBit =  0x0040;
b2DebugDraw.prototype.m_drawFlags =  0;
b2DebugDraw.prototype.m_sprite =  null;
b2DebugDraw.prototype.m_drawScale =  1.0;
b2DebugDraw.prototype.m_lineThickness =  1.0;
b2DebugDraw.prototype.m_alpha =  1.0;
b2DebugDraw.prototype.m_fillAlpha =  1.0;
b2DebugDraw.prototype.m_xformScale =  1.0;
b2DebugDraw.prototype.SetFlags = function (flags) {
		this.m_drawFlags = flags;
	}
b2DebugDraw.prototype.GetFlags = function () {
		return this.m_drawFlags;
	}
b2DebugDraw.prototype.AppendFlags = function (flags) {
		this.m_drawFlags |= flags;
	}
b2DebugDraw.prototype.ClearFlags = function (flags) {
		this.m_drawFlags &= ~flags;
	}
b2DebugDraw.prototype.DrawPolygon = function (vertices, vertexCount, color) {
		
		this.m_sprite.graphics.lineStyle(this.m_lineThickness, color.color, this.m_alpha);
		this.m_sprite.graphics.moveTo(vertices[0].x * this.m_drawScale, vertices[0].y * this.m_drawScale);
		for (var i = 1; i < vertexCount; i++){
				this.m_sprite.graphics.lineTo(vertices[i].x * this.m_drawScale, vertices[i].y * this.m_drawScale);
		}
		this.m_sprite.graphics.lineTo(vertices[0].x * this.m_drawScale, vertices[0].y * this.m_drawScale);
		
	}
b2DebugDraw.prototype.DrawSolidPolygon = function (vertices, vertexCount, color) {
		
		this.m_sprite.graphics.lineStyle(this.m_lineThickness, color.color, this.m_alpha);
		this.m_sprite.graphics.moveTo(vertices[0].x * this.m_drawScale, vertices[0].y * this.m_drawScale);
		this.m_sprite.graphics.beginFill(color.color, this.m_fillAlpha);
		for (var i = 1; i < vertexCount; i++){
				this.m_sprite.graphics.lineTo(vertices[i].x * this.m_drawScale, vertices[i].y * this.m_drawScale);
		}
		this.m_sprite.graphics.lineTo(vertices[0].x * this.m_drawScale, vertices[0].y * this.m_drawScale);
		this.m_sprite.graphics.endFill();
		
	}
b2DebugDraw.prototype.DrawCircle = function (center, radius, color) {
		
		this.m_sprite.graphics.lineStyle(this.m_lineThickness, color.color, this.m_alpha);
		this.m_sprite.graphics.drawCircle(center.x * this.m_drawScale, center.y * this.m_drawScale, radius * this.m_drawScale);
		
	}
b2DebugDraw.prototype.DrawSolidCircle = function (center, radius, axis, color) {
		
		this.m_sprite.graphics.lineStyle(this.m_lineThickness, color.color, this.m_alpha);
		this.m_sprite.graphics.moveTo(0,0);
		this.m_sprite.graphics.beginFill(color.color, this.m_fillAlpha);
		this.m_sprite.graphics.drawCircle(center.x * this.m_drawScale, center.y * this.m_drawScale, radius * this.m_drawScale);
		this.m_sprite.graphics.endFill();
		this.m_sprite.graphics.moveTo(center.x * this.m_drawScale, center.y * this.m_drawScale);
		this.m_sprite.graphics.lineTo((center.x + axis.x*radius) * this.m_drawScale, (center.y + axis.y*radius) * this.m_drawScale);
		
	}
b2DebugDraw.prototype.DrawSegment = function (p1, p2, color) {
		
		this.m_sprite.graphics.lineStyle(this.m_lineThickness, color.color, this.m_alpha);
		this.m_sprite.graphics.moveTo(p1.x * this.m_drawScale, p1.y * this.m_drawScale);
		this.m_sprite.graphics.lineTo(p2.x * this.m_drawScale, p2.y * this.m_drawScale);
		
	}
b2DebugDraw.prototype.DrawXForm = function (xf) {
		
		this.m_sprite.graphics.lineStyle(this.m_lineThickness, 0xff0000, this.m_alpha);
		this.m_sprite.graphics.moveTo(xf.position.x * this.m_drawScale, xf.position.y * this.m_drawScale);
		this.m_sprite.graphics.lineTo((xf.position.x + this.m_xformScale*xf.R.col1.x) * this.m_drawScale, (xf.position.y + this.m_xformScale*xf.R.col1.y) * this.m_drawScale);
		
		this.m_sprite.graphics.lineStyle(this.m_lineThickness, 0x00ff00, this.m_alpha);
		this.m_sprite.graphics.moveTo(xf.position.x * this.m_drawScale, xf.position.y * this.m_drawScale);
		this.m_sprite.graphics.lineTo((xf.position.x + this.m_xformScale*xf.R.col2.x) * this.m_drawScale, (xf.position.y + this.m_xformScale*xf.R.col2.y) * this.m_drawScale);
		
	}
exports.b2DebugDraw = b2DebugDraw;
	
	
var b2BodyDef = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2BodyDef.prototype.__constructor = function () {
		this.massData.center.SetZero();
		this.massData.mass = 0.0;
		this.massData.I = 0.0;
		this.userData = null;
		this.position.Set(0.0, 0.0);
		this.angle = 0.0;
		this.linearDamping = 0.0;
		this.angularDamping = 0.0;
		this.allowSleep = true;
		this.isSleeping = false;
		this.fixedRotation = false;
		this.isBullet = false;
	}
b2BodyDef.prototype.__varz = function(){
this.massData =  new b2MassData();
this.position =  new b2Vec2();
}
b2BodyDef.prototype.massData =  new b2MassData();
b2BodyDef.prototype.userData =  null;
b2BodyDef.prototype.position =  new b2Vec2();
b2BodyDef.prototype.angle =  null;
b2BodyDef.prototype.linearDamping =  null;
b2BodyDef.prototype.angularDamping =  null;
b2BodyDef.prototype.allowSleep =  null;
b2BodyDef.prototype.isSleeping =  null;
b2BodyDef.prototype.fixedRotation =  null;
b2BodyDef.prototype.isBullet =  null;
exports.b2BodyDef = b2BodyDef;
	
	
var b2Body = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Body.prototype.__constructor = function (bd, world) {
		
		
		this.m_flags = 0;
		
		if (bd.isBullet)
		{
			this.m_flags |= b2Body.e_bulletFlag;
		}
		if (bd.fixedRotation)
		{
			this.m_flags |= b2Body.e_fixedRotationFlag;
		}
		if (bd.allowSleep)
		{
			this.m_flags |= b2Body.e_allowSleepFlag;
		}
		if (bd.isSleeping)
		{
			this.m_flags |= b2Body.e_sleepFlag;
		}
		
		this.m_world = world;
		
		this.m_xf.position.SetV(bd.position);
		this.m_xf.R.Set(bd.angle);
		
		this.m_sweep.localCenter.SetV(bd.massData.center);
		this.m_sweep.t0 = 1.0;
		this.m_sweep.a0 = this.m_sweep.a = bd.angle;
		
		
		
		var tMat = this.m_xf.R;
		var tVec = this.m_sweep.localCenter;
		
		this.m_sweep.c.x = (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		
		this.m_sweep.c.y = (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		this.m_sweep.c.x += this.m_xf.position.x;
		this.m_sweep.c.y += this.m_xf.position.y;
		
		this.m_sweep.c0.SetV(this.m_sweep.c);
		
		this.m_jointList = null;
		this.m_contactList = null;
		this.m_prev = null;
		this.m_next = null;
		
		this.m_linearDamping = bd.linearDamping;
		this.m_angularDamping = bd.angularDamping;
		
		this.m_force.Set(0.0, 0.0);
		this.m_torque = 0.0;
		
		this.m_linearVelocity.SetZero();
		this.m_angularVelocity = 0.0;
		
		this.m_sleepTime = 0.0;
		
		this.m_invMass = 0.0;
		this.m_I = 0.0;
		this.m_invI = 0.0;
		
		this.m_mass = bd.massData.mass;
		
		if (this.m_mass > 0.0)
		{
			this.m_invMass = 1.0 / this.m_mass;
		}
		
		if ((this.m_flags & b2Body.e_fixedRotationFlag) == 0)
		{
			this.m_I = bd.massData.I;
		}
		
		if (this.m_I > 0.0)
		{
			this.m_invI = 1.0 / this.m_I;
		}
		
		if (this.m_invMass == 0.0 && this.m_invI == 0.0)
		{
			this.m_type = b2Body.e_staticType;
		}
		else
		{
			this.m_type = b2Body.e_dynamicType;
		}
	
		this.m_userData = bd.userData;
		
		this.m_shapeList = null;
		this.m_shapeCount = 0;
	}
b2Body.prototype.__varz = function(){
this.m_xf =  new b2XForm();
this.m_sweep =  new b2Sweep();
this.m_linearVelocity =  new b2Vec2();
this.m_force =  new b2Vec2();
}
b2Body.e_frozenFlag =  0x0002;
b2Body.e_islandFlag =  0x0004;
b2Body.e_sleepFlag =  0x0008;
b2Body.e_allowSleepFlag =  0x0010;
b2Body.e_bulletFlag =  0x0020;
b2Body.e_fixedRotationFlag =  0x0040;
b2Body.e_staticType =  1;
b2Body.e_dynamicType =  2;
b2Body.e_maxTypes =  3;
b2Body.s_massData =  new b2MassData();
b2Body.s_xf1 =  new b2XForm();
b2Body.prototype.m_flags =  0;
b2Body.prototype.m_type =  0;
b2Body.prototype.m_xf =  new b2XForm();
b2Body.prototype.m_sweep =  new b2Sweep();
b2Body.prototype.m_linearVelocity =  new b2Vec2();
b2Body.prototype.m_angularVelocity =  null;
b2Body.prototype.m_force =  new b2Vec2();
b2Body.prototype.m_torque =  null;
b2Body.prototype.m_world =  null;
b2Body.prototype.m_prev =  null;
b2Body.prototype.m_next =  null;
b2Body.prototype.m_shapeList =  null;
b2Body.prototype.m_shapeCount =  0;
b2Body.prototype.m_jointList =  null;
b2Body.prototype.m_contactList =  null;
b2Body.prototype.m_mass =  null;
b2Body.prototype.m_invMass =  null;
b2Body.prototype.m_I =  null;
b2Body.prototype.m_invI =  null;
b2Body.prototype.m_linearDamping =  null;
b2Body.prototype.m_angularDamping =  null;
b2Body.prototype.m_sleepTime =  null;
b2Body.prototype.m_userData =  null;
b2Body.prototype.CreateShape = function (def) {
		
		if (this.m_world.m_lock == true)
		{
			return null;
		}
		
		var s = b2Shape.Create(def, this.m_world.m_blockAllocator);
		
		s.m_next = this.m_shapeList;
		this.m_shapeList = s;
		++this.m_shapeCount;
		
		s.m_body = this;
		
		
		s.CreateProxy(this.m_world.m_broadPhase, this.m_xf);
		
		
		s.UpdateSweepRadius(this.m_sweep.localCenter);
		
		return s;
	}
b2Body.prototype.DestroyShape = function (s) {
		
		if (this.m_world.m_lock == true)
		{
			return;
		}
		
		
		s.DestroyProxy(this.m_world.m_broadPhase);
		
		
		
		var node = this.m_shapeList;
		var ppS = null; 
		var found = false;
		while (node != null)
		{
			if (node == s)
			{
				if (ppS)
					ppS.m_next = s.m_next;
				else
					this.m_shapeList = s.m_next;
				
				found = true;
				break;
			}
			
			ppS = node;
			node = node.m_next;
		}
		
		
		
		
		s.m_body = null;
		s.m_next = null;
		
		--this.m_shapeCount;
		
		b2Shape.Destroy(s, this.m_world.m_blockAllocator);
	}
b2Body.prototype.SetMass = function (massData) {
		var s;
		
		
		if (this.m_world.m_lock == true)
		{
			return;
		}
		
		this.m_invMass = 0.0;
		this.m_I = 0.0;
		this.m_invI = 0.0;
		
		this.m_mass = massData.mass;
		
		if (this.m_mass > 0.0)
		{
			this.m_invMass = 1.0 / this.m_mass;
		}
		
		if ((this.m_flags & b2Body.e_fixedRotationFlag) == 0)
		{
			this.m_I = massData.I;
		}
		
		if (this.m_I > 0.0)
		{
			this.m_invI = 1.0 / this.m_I;
		}
		
		
		this.m_sweep.localCenter.SetV(massData.center);
		
		
		var tMat = this.m_xf.R;
		var tVec = this.m_sweep.localCenter;
		
		this.m_sweep.c.x = (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		
		this.m_sweep.c.y = (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		this.m_sweep.c.x += this.m_xf.position.x;
		this.m_sweep.c.y += this.m_xf.position.y;
		
		this.m_sweep.c0.SetV(this.m_sweep.c);
		
		
		for (s = this.m_shapeList; s; s = s.m_next)
		{
			s.UpdateSweepRadius(this.m_sweep.localCenter);
		}

		var oldType = this.m_type;
		if (this.m_invMass == 0.0 && this.m_invI == 0.0)
		{
			this.m_type = b2Body.e_staticType;
		}
		else
		{
			this.m_type = b2Body.e_dynamicType;
		}
	
		
		if (oldType != this.m_type)
		{
			for (s = this.m_shapeList; s; s = s.m_next)
			{
				s.RefilterProxy(this.m_world.m_broadPhase, this.m_xf);
			}
		}
	}
b2Body.prototype.SetMassFromShapes = function () {
		
		var s;
		
		
		if (this.m_world.m_lock == true)
		{
			return;
		}
		
		
		this.m_mass = 0.0;
		this.m_invMass = 0.0;
		this.m_I = 0.0;
		this.m_invI = 0.0;
		
		
		var centerX = 0.0;
		var centerY = 0.0;
		var massData = b2Body.s_massData;
		for (s = this.m_shapeList; s; s = s.m_next)
		{
			s.ComputeMass(massData);
			this.m_mass += massData.mass;
			
			centerX += massData.mass * massData.center.x;
			centerY += massData.mass * massData.center.y;
			this.m_I += massData.I;
		}
		
		
		if (this.m_mass > 0.0)
		{
			this.m_invMass = 1.0 / this.m_mass;
			centerX *= this.m_invMass;
			centerY *= this.m_invMass;
		}
		
		if (this.m_I > 0.0 && (this.m_flags & b2Body.e_fixedRotationFlag) == 0)
		{
			
			
			this.m_I -= this.m_mass * (centerX * centerX + centerY * centerY);
			
			this.m_invI = 1.0 / this.m_I;
		}
		else
		{
			this.m_I = 0.0;
			this.m_invI = 0.0;
		}
		
		
		this.m_sweep.localCenter.Set(centerX, centerY);
		
		
		var tMat = this.m_xf.R;
		var tVec = this.m_sweep.localCenter;
		
		this.m_sweep.c.x = (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		
		this.m_sweep.c.y = (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		this.m_sweep.c.x += this.m_xf.position.x;
		this.m_sweep.c.y += this.m_xf.position.y;
		
		this.m_sweep.c0.SetV(this.m_sweep.c);
		
		
		for (s = this.m_shapeList; s; s = s.m_next)
		{
			s.UpdateSweepRadius(this.m_sweep.localCenter);
		}
		
		var oldType = this.m_type;
		if (this.m_invMass == 0.0 && this.m_invI == 0.0)
		{
			this.m_type = b2Body.e_staticType;
		}
		else
		{
			this.m_type = b2Body.e_dynamicType;
		}
		
		
		if (oldType != this.m_type)
		{
			for (s = this.m_shapeList; s; s = s.m_next)
			{
				s.RefilterProxy(this.m_world.m_broadPhase, this.m_xf);
			}
		}
	}
b2Body.prototype.SetXForm = function (position, angle) {
		
		var s;
		
		
		if (this.m_world.m_lock == true)
		{
			return true;
		}
		
		if (this.IsFrozen())
		{
			return false;
		}
		
		this.m_xf.R.Set(angle);
		this.m_xf.position.SetV(position);
		
		
		
		var tMat = this.m_xf.R;
		var tVec = this.m_sweep.localCenter;
		
		this.m_sweep.c.x = (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		
		this.m_sweep.c.y = (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		this.m_sweep.c.x += this.m_xf.position.x;
		this.m_sweep.c.y += this.m_xf.position.y;
		
		this.m_sweep.c0.SetV(this.m_sweep.c);
		
		this.m_sweep.a0 = this.m_sweep.a = angle;
		
		var freeze = false;
		for (s = this.m_shapeList; s; s = s.m_next)
		{
			var inRange = s.Synchronize(this.m_world.m_broadPhase, this.m_xf, this.m_xf);
			
			if (inRange == false)
			{
				freeze = true;
				break;
			}
		}
		
		if (freeze == true)
		{
			this.m_flags |= b2Body.e_frozenFlag;
			this.m_linearVelocity.SetZero();
			this.m_angularVelocity = 0.0;
			for (s = this.m_shapeList; s; s = s.m_next)
			{
				s.DestroyProxy(this.m_world.m_broadPhase);
			}
			
			
			return false;
		}
		
		
		this.m_world.m_broadPhase.Commit();
		return true;
		
	}
b2Body.prototype.GetXForm = function () {
		return this.m_xf;
	}
b2Body.prototype.GetPosition = function () {
		return this.m_xf.position;
	}
b2Body.prototype.GetAngle = function () {
		return this.m_sweep.a;
	}
b2Body.prototype.GetWorldCenter = function () {
		return this.m_sweep.c;
	}
b2Body.prototype.GetLocalCenter = function () {
		return this.m_sweep.localCenter;
	}
b2Body.prototype.SetLinearVelocity = function (v) {
		this.m_linearVelocity.SetV(v);
	}
b2Body.prototype.GetLinearVelocity = function () {
		return this.m_linearVelocity;
	}
b2Body.prototype.SetAngularVelocity = function (omega) {
		this.m_angularVelocity = omega;
	}
b2Body.prototype.GetAngularVelocity = function () {
		return this.m_angularVelocity;
	}
b2Body.prototype.ApplyForce = function (force, point) {
		if (this.IsSleeping())
		{
			this.WakeUp();
		}
		
		this.m_force.x += force.x;
		this.m_force.y += force.y;
		
		this.m_torque += ((point.x - this.m_sweep.c.x) * force.y - (point.y - this.m_sweep.c.y) * force.x);
	}
b2Body.prototype.ApplyTorque = function (torque) {
		if (this.IsSleeping())
		{
			this.WakeUp();
		}
		this.m_torque += torque;
	}
b2Body.prototype.ApplyImpulse = function (impulse, point) {
		if (this.IsSleeping())
		{
			this.WakeUp();
		}
		
		this.m_linearVelocity.x += this.m_invMass * impulse.x;
		this.m_linearVelocity.y += this.m_invMass * impulse.y;
		
		this.m_angularVelocity += this.m_invI * ((point.x - this.m_sweep.c.x) * impulse.y - (point.y - this.m_sweep.c.y) * impulse.x);
	}
b2Body.prototype.GetMass = function () {
		return this.m_mass;
	}
b2Body.prototype.GetInertia = function () {
		return this.m_I;
	}
b2Body.prototype.GetWorldPoint = function (localPoint) {
		
		var A = this.m_xf.R;
		var u = new b2Vec2(A.col1.x * localPoint.x + A.col2.x * localPoint.y, 
								 A.col1.y * localPoint.x + A.col2.y * localPoint.y);
		u.x += this.m_xf.position.x;
		u.y += this.m_xf.position.y;
		return u;
	}
b2Body.prototype.GetWorldVector = function (localVector) {
		return b2Math.b2MulMV(this.m_xf.R, localVector);
	}
b2Body.prototype.GetLocalPoint = function (worldPoint) {
		return b2Math.b2MulXT(this.m_xf, worldPoint);
	}
b2Body.prototype.GetLocalVector = function (worldVector) {
		return b2Math.b2MulTMV(this.m_xf.R, worldVector);
	}
b2Body.prototype.GetLinearVelocityFromWorldPoint = function (worldPoint) {
		
		return new b2Vec2(	this.m_linearVelocity.x - this.m_angularVelocity * (worldPoint.y - this.m_sweep.c.y), 
							this.m_linearVelocity.y + this.m_angularVelocity * (worldPoint.x - this.m_sweep.c.x));
	}
b2Body.prototype.GetLinearVelocityFromLocalPoint = function (localPoint) {
		
		var A = this.m_xf.R;
		var worldPoint = new b2Vec2(A.col1.x * localPoint.x + A.col2.x * localPoint.y, 
								 A.col1.y * localPoint.x + A.col2.y * localPoint.y);
		worldPoint.x += this.m_xf.position.x;
		worldPoint.y += this.m_xf.position.y;
		return new b2Vec2(this.m_linearVelocity.x + this.m_angularVelocity * (worldPoint.y - this.m_sweep.c.y), 
		 this.m_linearVelocity.x - this.m_angularVelocity * (worldPoint.x - this.m_sweep.c.x));
	}
b2Body.prototype.IsBullet = function () {
		return (this.m_flags & b2Body.e_bulletFlag) == b2Body.e_bulletFlag;
	}
b2Body.prototype.SetBullet = function (flag) {
		if (flag)
		{
			this.m_flags |= b2Body.e_bulletFlag;
		}
		else
		{
			this.m_flags &= ~b2Body.e_bulletFlag;
		}
	}
b2Body.prototype.IsStatic = function () {
		return this.m_type == b2Body.e_staticType;
	}
b2Body.prototype.IsDynamic = function () {
		return this.m_type == b2Body.e_dynamicType;
	}
b2Body.prototype.IsFrozen = function () {
		return (this.m_flags & b2Body.e_frozenFlag) == b2Body.e_frozenFlag;
	}
b2Body.prototype.IsSleeping = function () {
		return (this.m_flags & b2Body.e_sleepFlag) == b2Body.e_sleepFlag;
	}
b2Body.prototype.AllowSleeping = function (flag) {
		if (flag)
		{
			this.m_flags |= b2Body.e_allowSleepFlag;
		}
		else
		{
			this.m_flags &= ~b2Body.e_allowSleepFlag;
			this.WakeUp();
		}
	}
b2Body.prototype.WakeUp = function () {
		this.m_flags &= ~b2Body.e_sleepFlag;
		this.m_sleepTime = 0.0;
	}
b2Body.prototype.PutToSleep = function () {
		this.m_flags |= b2Body.e_sleepFlag;
		this.m_sleepTime = 0.0;
		this.m_linearVelocity.SetZero();
		this.m_angularVelocity = 0.0;
		this.m_force.SetZero();
		this.m_torque = 0.0;
	}
b2Body.prototype.GetShapeList = function () {
		return this.m_shapeList;
	}
b2Body.prototype.GetJointList = function () {
		return this.m_jointList;
	}
b2Body.prototype.GetNext = function () {
		return this.m_next;
	}
b2Body.prototype.GetUserData = function () {
		return this.m_userData;
	}
b2Body.prototype.SetUserData = function (data) {
		this.m_userData = data;
	}
b2Body.prototype.GetWorld = function () {
		return this.m_world;
	}
b2Body.prototype.SynchronizeShapes = function () {
		
		var xf1 = b2Body.s_xf1;
		xf1.R.Set(this.m_sweep.a0);
		
		var tMat = xf1.R;
		var tVec = this.m_sweep.localCenter;
		xf1.position.x = this.m_sweep.c0.x - (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		xf1.position.y = this.m_sweep.c0.y - (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
		
		var s;
		
		var inRange = true;
		for (s = this.m_shapeList; s; s = s.m_next)
		{
			inRange = s.Synchronize(this.m_world.m_broadPhase, xf1, this.m_xf);
			if (inRange == false)
			{
				break;
			}
		}
		
		if (inRange == false)
		{
			this.m_flags |= b2Body.e_frozenFlag;
			this.m_linearVelocity.SetZero();
			this.m_angularVelocity = 0.0;
			for (s = this.m_shapeList; s; s = s.m_next)
			{
				s.DestroyProxy(this.m_world.m_broadPhase);
			}
			
			
			return false;
		}
		
		
		return true;
		
	}
b2Body.prototype.SynchronizeTransform = function () {
		this.m_xf.R.Set(this.m_sweep.a);
		
		var tMat = this.m_xf.R;
		var tVec = this.m_sweep.localCenter;
		this.m_xf.position.x = this.m_sweep.c.x - (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
		this.m_xf.position.y = this.m_sweep.c.y - (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
	}
b2Body.prototype.IsConnected = function (other) {
		for (var jn = this.m_jointList; jn; jn = jn.next)
		{
			if (jn.other == other)
				return jn.joint.m_collideConnected == false;
		}
		
		return false;
	}
b2Body.prototype.Advance = function (t) {
		
		this.m_sweep.Advance(t);
		this.m_sweep.c.SetV(this.m_sweep.c0);
		this.m_sweep.a = this.m_sweep.a0;
		this.SynchronizeTransform();
	}
exports.b2Body = b2Body;
	
	
var b2ContactFilter = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ContactFilter.prototype.__constructor = function(){}
b2ContactFilter.prototype.__varz = function(){
}
b2ContactFilter.b2_defaultFilter =  new b2ContactFilter();
b2ContactFilter.prototype.ShouldCollide = function (shape1, shape2) {
		var filter1 = shape1.GetFilterData();
		var filter2 = shape2.GetFilterData();
		
		if (filter1.groupIndex == filter2.groupIndex && filter1.groupIndex != 0)
		{
			return filter1.groupIndex > 0;
		}
		
		var collide = (filter1.maskBits & filter2.categoryBits) != 0 && (filter1.categoryBits & filter2.maskBits) != 0;
		return collide;
	}
exports.b2ContactFilter = b2ContactFilter;
	
	
var b2ContactResult = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ContactResult.prototype.__constructor = function(){}
b2ContactResult.prototype.__varz = function(){
this.position =  new b2Vec2();
this.normal =  new b2Vec2();
this.id =  new b2ContactID();
}
b2ContactResult.prototype.shape1 =  null;
b2ContactResult.prototype.shape2 =  null;
b2ContactResult.prototype.position =  new b2Vec2();
b2ContactResult.prototype.normal =  new b2Vec2();
b2ContactResult.prototype.normalImpulse =  null;
b2ContactResult.prototype.tangentImpulse =  null;
b2ContactResult.prototype.id =  new b2ContactID();
exports.b2ContactResult = b2ContactResult;
	
	
var b2Island = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Island.prototype.__constructor = function (
	bodyCapacity,
	contactCapacity,
	jointCapacity,
	allocator,
	listener) {
		var i = 0;
		
		this.m_bodyCapacity = bodyCapacity;
		this.m_contactCapacity = contactCapacity;
		this.m_jointCapacity	 = jointCapacity;
		this.m_bodyCount = 0;
		this.m_contactCount = 0;
		this.m_jointCount = 0;
		
		this.m_allocator = allocator;
		this.m_listener = listener;
		
		
		this.m_bodies = new Array(bodyCapacity);
		for (i = 0; i < bodyCapacity; i++)
			this.m_bodies[i] = null;
		
		
		this.m_contacts = new Array(contactCapacity);
		for (i = 0; i < contactCapacity; i++)
			this.m_contacts[i] = null;
		
		
		this.m_joints = new Array(jointCapacity);
		for (i = 0; i < jointCapacity; i++)
			this.m_joints[i] = null;
		
		this.m_positionIterationCount = 0;
		
	}
b2Island.prototype.__varz = function(){
}
b2Island.s_reportCR =  new b2ContactResult();
b2Island.prototype.m_allocator =  null;
b2Island.prototype.m_listener =  null;
b2Island.prototype.m_bodies =  null;
b2Island.prototype.m_contacts =  null;
b2Island.prototype.m_joints =  null;
b2Island.prototype.m_bodyCount =  0;
b2Island.prototype.m_jointCount =  0;
b2Island.prototype.m_contactCount =  0;
b2Island.prototype.m_bodyCapacity =  0;
b2Island.prototype.m_contactCapacity =  0;
b2Island.prototype.m_jointCapacity =  0;
b2Island.prototype.m_positionIterationCount =  0;
b2Island.prototype.Clear = function () {
		this.m_bodyCount = 0;
		this.m_contactCount = 0;
		this.m_jointCount = 0;
	}
b2Island.prototype.Solve = function (step, gravity, correctPositions, allowSleep) {
		var i = 0;
		var b;
		var joint;
		
		
		for (i = 0; i < this.m_bodyCount; ++i)
		{
			b = this.m_bodies[i];
			
			if (b.IsStatic())
				continue;
			
			
			
			b.m_linearVelocity.x += step.dt * (gravity.x + b.m_invMass * b.m_force.x);
			b.m_linearVelocity.y += step.dt * (gravity.y + b.m_invMass * b.m_force.y);
			b.m_angularVelocity += step.dt * b.m_invI * b.m_torque;
			
			
			b.m_force.SetZero();
			b.m_torque = 0.0;
			
			
			
			
			
			
			
			
			b.m_linearVelocity.Multiply( b2Math.b2Clamp(1.0 - step.dt * b.m_linearDamping, 0.0, 1.0) );
			b.m_angularVelocity *= b2Math.b2Clamp(1.0 - step.dt * b.m_angularDamping, 0.0, 1.0);
			
			
			
			if ((b.m_linearVelocity.LengthSquared()) > b2Settings.b2_maxLinearVelocitySquared)
			{
				b.m_linearVelocity.Normalize();
				b.m_linearVelocity.x *= b2Settings.b2_maxLinearVelocity;
				b.m_linearVelocity.y *= b2Settings.b2_maxLinearVelocity;
			}
			
			if (b.m_angularVelocity * b.m_angularVelocity > b2Settings.b2_maxAngularVelocitySquared)
			{
				if (b.m_angularVelocity < 0.0)
				{
					b.m_angularVelocity = -b2Settings.b2_maxAngularVelocity;
				}
				else
				{
					b.m_angularVelocity = b2Settings.b2_maxAngularVelocity;
				}
			}
		}
		
		var contactSolver = new b2ContactSolver(step, this.m_contacts, this.m_contactCount, this.m_allocator);
		
		
		contactSolver.InitVelocityConstraints(step);
		
		for (i = 0; i < this.m_jointCount; ++i)
		{
			joint = this.m_joints[i];
			joint.InitVelocityConstraints(step);
		}
		
		
		for (i = 0; i < step.maxIterations; ++i)
		{
			contactSolver.SolveVelocityConstraints();
			
			for (var j = 0; j < this.m_jointCount; ++j)
			{
				joint = this.m_joints[j];
				joint.SolveVelocityConstraints(step);
			}
		}
		
		
		contactSolver.FinalizeVelocityConstraints();
		
		
		for (i = 0; i < this.m_bodyCount; ++i)
		{
			b = this.m_bodies[i];
			
			if (b.IsStatic())
				continue;
			
			
			b.m_sweep.c0.SetV(b.m_sweep.c);
			b.m_sweep.a0 = b.m_sweep.a;
			
			
			
			b.m_sweep.c.x += step.dt * b.m_linearVelocity.x;
			b.m_sweep.c.y += step.dt * b.m_linearVelocity.y;
			b.m_sweep.a += step.dt * b.m_angularVelocity;
			
			
			b.SynchronizeTransform();
			
			
		}
		
		if (correctPositions)
		{
			
			
			for (i = 0; i < this.m_jointCount; ++i)
			{
				joint = this.m_joints[i];
				joint.InitPositionConstraints();
			}
			
			
			for (this.m_positionIterationCount = 0; this.m_positionIterationCount < step.maxIterations; ++this.m_positionIterationCount)
			{
				var contactsOkay = contactSolver.SolvePositionConstraints(b2Settings.b2_contactBaumgarte);
				
				var jointsOkay = true;
				for (i = 0; i < this.m_jointCount; ++i)
				{
					joint = this.m_joints[i];
					var jointOkay = joint.SolvePositionConstraints();
					jointsOkay = jointsOkay && jointOkay;
				}
				
				if (contactsOkay && jointsOkay)
				{
					break;
				}
			}
		}
		
		this.Report(contactSolver.m_constraints);
		
		if (allowSleep){
			
			var minSleepTime = Number.MAX_VALUE;
			
			var linTolSqr = b2Settings.b2_linearSleepTolerance * b2Settings.b2_linearSleepTolerance;
			var angTolSqr = b2Settings.b2_angularSleepTolerance * b2Settings.b2_angularSleepTolerance;
			
			for (i = 0; i < this.m_bodyCount; ++i)
			{
				b = this.m_bodies[i];
				if (b.m_invMass == 0.0)
				{
					continue;
				}
				
				if ((b.m_flags & b2Body.e_allowSleepFlag) == 0)
				{
					b.m_sleepTime = 0.0;
					minSleepTime = 0.0;
				}
				
				if ((b.m_flags & b2Body.e_allowSleepFlag) == 0 ||
					b.m_angularVelocity * b.m_angularVelocity > angTolSqr ||
					b2Math.b2Dot(b.m_linearVelocity, b.m_linearVelocity) > linTolSqr)
				{
					b.m_sleepTime = 0.0;
					minSleepTime = 0.0;
				}
				else
				{
					b.m_sleepTime += step.dt;
					minSleepTime = b2Math.b2Min(minSleepTime, b.m_sleepTime);
				}
			}
			
			if (minSleepTime >= b2Settings.b2_timeToSleep)
			{
				for (i = 0; i < this.m_bodyCount; ++i)
				{
					b = this.m_bodies[i];
					b.m_flags |= b2Body.e_sleepFlag;
					b.m_linearVelocity.SetZero();
					b.m_angularVelocity = 0.0;
				}
			}
		}
	}
b2Island.prototype.SolveTOI = function (subStep) {
		var i = 0;
		var contactSolver = new b2ContactSolver(subStep, this.m_contacts, this.m_contactCount, this.m_allocator);
		
		
		
		
		for (i = 0; i < subStep.maxIterations; ++i)
		{
			contactSolver.SolveVelocityConstraints();
		}
		
		
		
		
		
		for (i = 0; i < this.m_bodyCount; ++i)
		{
			var b = this.m_bodies[i];
			
			if (b.IsStatic())
				continue;
			
			
			b.m_sweep.c0.SetV(b.m_sweep.c);
			b.m_sweep.a0 = b.m_sweep.a;
			
			
			b.m_sweep.c.x += subStep.dt * b.m_linearVelocity.x;
			b.m_sweep.c.y += subStep.dt * b.m_linearVelocity.y;
			b.m_sweep.a += subStep.dt * b.m_angularVelocity;
			
			
			b.SynchronizeTransform();
			
			
		}
		
		
		var k_toiBaumgarte = 0.75;
		for (i = 0; i < subStep.maxIterations; ++i)
		{
			var contactsOkay = contactSolver.SolvePositionConstraints(k_toiBaumgarte);
			if (contactsOkay)
			{
				break;
			}
		}
		
		this.Report(contactSolver.m_constraints);
	}
b2Island.prototype.Report = function (constraints) {
		var tMat;
		var tVec;
		if (this.m_listener == null)
		{
			return;
		}
		
		for (var i = 0; i < this.m_contactCount; ++i)
		{
			var c = this.m_contacts[i];
			var cc = constraints[ i ];
			var cr = b2Island.s_reportCR;
			cr.shape1 = c.m_shape1;
			cr.shape2 = c.m_shape2;
			var b1 = cr.shape1.m_body;
			var manifoldCount = c.m_manifoldCount;
			var manifolds = c.GetManifolds();
			for (var j = 0; j < manifoldCount; ++j)
			{
				var manifold = manifolds[ j ];
				cr.normal.SetV( manifold.normal );
				for (var k = 0; k < manifold.pointCount; ++k)
				{
					var point = manifold.points[ k ];
					var ccp = cc.points[ k ];
					cr.position = b1.GetWorldPoint(point.localPoint1);
					
					
					
					cr.normalImpulse = ccp.normalImpulse;
					cr.tangentImpulse = ccp.tangentImpulse;
					cr.id.key = point.id.key;
					
					this.m_listener.Result(cr);
				}
			}
		}
	}
b2Island.prototype.AddBody = function (body) {
		
		this.m_bodies[this.m_bodyCount++] = body;
	}
b2Island.prototype.AddContact = function (contact) {
		
		this.m_contacts[this.m_contactCount++] = contact;
	}
b2Island.prototype.AddJoint = function (joint) {
		
		this.m_joints[this.m_jointCount++] = joint;
	}
exports.b2Island = b2Island;
	
	
var b2ContactEdge = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ContactEdge.prototype.__constructor = function(){}
b2ContactEdge.prototype.__varz = function(){
}
b2ContactEdge.prototype.other =  null;
b2ContactEdge.prototype.contact =  null;
b2ContactEdge.prototype.prev =  null;
b2ContactEdge.prototype.next =  null;
exports.b2ContactEdge = b2ContactEdge;
	

var b2Contact = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Contact.prototype.__constructor = function (s1, s2) {
		this.m_flags = 0;
		
		if (!s1 || !s2){
			this.m_shape1 = null;
			this.m_shape2 = null;
			return;
		}
		
		if (s1.IsSensor() || s2.IsSensor())
		{
			this.m_flags |= b2Contact.e_nonSolidFlag;
		}
		
		this.m_shape1 = s1;
		this.m_shape2 = s2;
		
		this.m_manifoldCount = 0;
		
		this.m_friction = Math.sqrt(this.m_shape1.m_friction * this.m_shape2.m_friction);
		this.m_restitution = b2Math.b2Max(this.m_shape1.m_restitution, this.m_shape2.m_restitution);
		
		this.m_prev = null;
		this.m_next = null;
		
		this.m_node1.contact = null;
		this.m_node1.prev = null;
		this.m_node1.next = null;
		this.m_node1.other = null;
		
		this.m_node2.contact = null;
		this.m_node2.prev = null;
		this.m_node2.next = null;
		this.m_node2.other = null;
	}
b2Contact.prototype.__varz = function(){
this.m_node1 =  new b2ContactEdge();
this.m_node2 =  new b2ContactEdge();
}
b2Contact.e_nonSolidFlag =  0x0001;
b2Contact.e_slowFlag =  0x0002;
b2Contact.e_islandFlag =  0x0004;
b2Contact.e_toiFlag =  0x0008;
b2Contact.s_registers =  null;
b2Contact.s_initialized =  false;
b2Contact.AddType = function (createFcn, destroyFcn, type1, type2) {
		
		
		
		b2Contact.s_registers[type1][type2].createFcn = createFcn;
		b2Contact.s_registers[type1][type2].destroyFcn = destroyFcn;
		b2Contact.s_registers[type1][type2].primary = true;
		
		if (type1 != type2)
		{
			b2Contact.s_registers[type2][type1].createFcn = createFcn;
			b2Contact.s_registers[type2][type1].destroyFcn = destroyFcn;
			b2Contact.s_registers[type2][type1].primary = false;
		}
	}
b2Contact.InitializeRegisters = function () {
		b2Contact.s_registers = new Array(b2Shape.e_shapeTypeCount);
		for (var i = 0; i < b2Shape.e_shapeTypeCount; i++){
			b2Contact.s_registers[i] = new Array(b2Shape.e_shapeTypeCount);
			for (var j = 0; j < b2Shape.e_shapeTypeCount; j++){
				b2Contact.s_registers[i][j] = new b2ContactRegister();
			}
		}
		
		b2Contact.AddType(b2CircleContact.Create, b2CircleContact.Destroy, b2Shape.e_circleShape, b2Shape.e_circleShape);
		b2Contact.AddType(b2PolyAndCircleContact.Create, b2PolyAndCircleContact.Destroy, b2Shape.e_polygonShape, b2Shape.e_circleShape);
		b2Contact.AddType(b2PolygonContact.Create, b2PolygonContact.Destroy, b2Shape.e_polygonShape, b2Shape.e_polygonShape);
		
	}
b2Contact.Create = function (shape1, shape2, allocator) {
		if (b2Contact.s_initialized == false)
		{
			b2Contact.InitializeRegisters();
			b2Contact.s_initialized = true;
		}
		
		var type1 = shape1.m_type;
		var type2 = shape2.m_type;
		
		
		
		
		var reg = b2Contact.s_registers[type1][type2];
		var createFcn = reg.createFcn;
		if (createFcn != null)
		{
			if (reg.primary)
			{
				return createFcn(shape1, shape2, allocator);
			}
			else
			{
				var c = createFcn(shape2, shape1, allocator);
				for (var i = 0; i < c.m_manifoldCount; ++i)
				{
					var m = c.GetManifolds()[ i ];
					m.normal = m.normal.Negative();
				}
				return c;
			}
		}
		else
		{
			return null;
		}
	}
b2Contact.Destroy = function (contact, allocator) {
		
		
		if (contact.m_manifoldCount > 0)
		{
			contact.m_shape1.m_body.WakeUp();
			contact.m_shape2.m_body.WakeUp();
		}
		
		var type1 = contact.m_shape1.m_type;
		var type2 = contact.m_shape2.m_type;
		
		
		
		
		var reg = b2Contact.s_registers[type1][type2];
		var destroyFcn = reg.destroyFcn;
		destroyFcn(contact, allocator);
	}
b2Contact.prototype.m_flags =  0;
b2Contact.prototype.m_prev =  null;
b2Contact.prototype.m_next =  null;
b2Contact.prototype.m_node1 =  new b2ContactEdge();
b2Contact.prototype.m_node2 =  new b2ContactEdge();
b2Contact.prototype.m_shape1 =  null;
b2Contact.prototype.m_shape2 =  null;
b2Contact.prototype.m_manifoldCount =  0;
b2Contact.prototype.m_friction =  null;
b2Contact.prototype.m_restitution =  null;
b2Contact.prototype.m_toi =  null;
b2Contact.prototype.GetManifolds = function () {return null}
b2Contact.prototype.GetManifoldCount = function () {
		return this.m_manifoldCount;
	}
b2Contact.prototype.IsSolid = function () {
		return (this.m_flags & b2Contact.e_nonSolidFlag) == 0;
	}
b2Contact.prototype.GetNext = function () {
		return this.m_next;
	}
b2Contact.prototype.GetShape1 = function () {
		return this.m_shape1;
	}
b2Contact.prototype.GetShape2 = function () {
		return this.m_shape2;
	}
b2Contact.prototype.Update = function (listener) {
		var oldCount = this.m_manifoldCount;
		
		this.Evaluate(listener);
		
		var newCount = this.m_manifoldCount;
		
		var body1 = this.m_shape1.m_body;
		var body2 = this.m_shape2.m_body;
		
		if (newCount == 0 && oldCount > 0)
		{
			body1.WakeUp();
			body2.WakeUp();
		}
		
		
		if (body1.IsStatic() || body1.IsBullet() || body2.IsStatic() || body2.IsBullet())
		{
			this.m_flags &= ~b2Contact.e_slowFlag;
		}
		else
		{
			this.m_flags |= b2Contact.e_slowFlag;
		}
	}
b2Contact.prototype.Evaluate = function (listener) {}
exports.b2Contact = b2Contact;
	
	
var b2NullContact = function() {
b2Contact.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2NullContact.prototype, b2Contact.prototype)
b2NullContact.prototype._super = function(){ b2Contact.prototype.__constructor.apply(this, arguments) }
b2NullContact.prototype.__constructor = function () {}
b2NullContact.prototype.__varz = function(){
}
b2NullContact.prototype.Evaluate = function (l) {}
b2NullContact.prototype.GetManifolds = function () { return null; }
exports.b2NullContact = b2NullContact;
	
	
var b2ContactManager = function() {
b2PairCallback.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2ContactManager.prototype, b2PairCallback.prototype)
b2ContactManager.prototype._super = function(){ b2PairCallback.prototype.__constructor.apply(this, arguments) }
b2ContactManager.prototype.__constructor = function () {
		this.m_world = null;
		this.m_destroyImmediate = false;
	}
b2ContactManager.prototype.__varz = function(){
this.m_nullContact =  new b2NullContact();
}
b2ContactManager.s_evalCP =  new b2ContactPoint();
b2ContactManager.prototype.m_world =  null;
b2ContactManager.prototype.m_nullContact =  new b2NullContact();
b2ContactManager.prototype.m_destroyImmediate =  null;
b2ContactManager.prototype.PairAdded = function (proxyUserData1, proxyUserData2) {
		var shape1 = proxyUserData1;
		var shape2 = proxyUserData2;
		
		var body1 = shape1.m_body;
		var body2 = shape2.m_body;
		
		if (body1.IsStatic() && body2.IsStatic())
		{
			return this.m_nullContact;
		}
		
		if (shape1.m_body == shape2.m_body)
		{
			return this.m_nullContact;
		}
		
		if (body2.IsConnected(body1))
		{
			return this.m_nullContact;
		}
		
		if (this.m_world.m_contactFilter != null && this.m_world.m_contactFilter.ShouldCollide(shape1, shape2) == false)
		{
			return this.m_nullContact;
		}
		
		
		var c = b2Contact.Create(shape1, shape2, this.m_world.m_blockAllocator);
		
		if (c == null)
		{
			return this.m_nullContact;
		}
		
		
		shape1 = c.m_shape1;
		shape2 = c.m_shape2;
		body1 = shape1.m_body;
		body2 = shape2.m_body;
		
		
		c.m_prev = null;
		c.m_next = this.m_world.m_contactList;
		if (this.m_world.m_contactList != null)
		{
			this.m_world.m_contactList.m_prev = c;
		}
		this.m_world.m_contactList = c;
		
		
		
		
		
		c.m_node1.contact = c;
		c.m_node1.other = body2;
		
		c.m_node1.prev = null;
		c.m_node1.next = body1.m_contactList;
		if (body1.m_contactList != null)
		{
			body1.m_contactList.prev = c.m_node1;
		}
		body1.m_contactList = c.m_node1;
		
		
		c.m_node2.contact = c;
		c.m_node2.other = body1;
		
		c.m_node2.prev = null;
		c.m_node2.next = body2.m_contactList;
		if (body2.m_contactList != null)
		{
			body2.m_contactList.prev = c.m_node2;
		}
		body2.m_contactList = c.m_node2;
		
		++this.m_world.m_contactCount;
		return c;
		
	}
b2ContactManager.prototype.PairRemoved = function (proxyUserData1, proxyUserData2, pairUserData) {
		
		if (pairUserData == null)
		{
			return;
		}
		
		var c = pairUserData;
		if (c == this.m_nullContact)
		{
			return;
		}
		
		
		
		this.Destroy(c);
	}
b2ContactManager.prototype.Destroy = function (c) {
		
		var shape1 = c.m_shape1;
		var shape2 = c.m_shape2;
		
		
		var manifoldCount = c.m_manifoldCount;
		if (manifoldCount > 0 && this.m_world.m_contactListener)
		{
			var b1 = shape1.m_body;
			var b2 = shape2.m_body;

			var manifolds = c.GetManifolds();
			var cp = b2ContactManager.s_evalCP;
			cp.shape1 = c.m_shape1;
			cp.shape2 = c.m_shape2;
			cp.friction = c.m_friction;
			cp.restitution = c.m_restitution;
			
			for (var i = 0; i < manifoldCount; ++i)
			{
				var manifold = manifolds[ i ];
				cp.normal.SetV(manifold.normal);
				
				for (var j = 0; j < manifold.pointCount; ++j)
				{
					var mp = manifold.points[j];
					cp.position = b1.GetWorldPoint(mp.localPoint1);
					var v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
					var v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
					cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
					cp.separation = mp.separation;
					cp.id.key = mp.id._key;
					this.m_world.m_contactListener.Remove(cp);
				}
			}
		}
		
		
		if (c.m_prev)
		{
			c.m_prev.m_next = c.m_next;
		}
		
		if (c.m_next)
		{
			c.m_next.m_prev = c.m_prev;
		}
		
		if (c == this.m_world.m_contactList)
		{
			this.m_world.m_contactList = c.m_next;
		}
		
		var body1 = shape1.m_body;
		var body2 = shape2.m_body;
		
		
		if (c.m_node1.prev)
		{
			c.m_node1.prev.next = c.m_node1.next;
		}
		
		if (c.m_node1.next)
		{
			c.m_node1.next.prev = c.m_node1.prev;
		}
		
		if (c.m_node1 == body1.m_contactList)
		{
			body1.m_contactList = c.m_node1.next;
		}
		
		
		if (c.m_node2.prev)
		{
			c.m_node2.prev.next = c.m_node2.next;
		}
		
		if (c.m_node2.next)
		{
			c.m_node2.next.prev = c.m_node2.prev;
		}
		
		if (c.m_node2 == body2.m_contactList)
		{
			body2.m_contactList = c.m_node2.next;
		}
		
		
		b2Contact.Destroy(c, this.m_world.m_blockAllocator);
		--this.m_world.m_contactCount;
	}
b2ContactManager.prototype.Collide = function () {
		
		for (var c = this.m_world.m_contactList; c; c = c.m_next)
		{
			var body1 = c.m_shape1.m_body;
			var body2 = c.m_shape2.m_body;
			if (body1.IsSleeping() && body2.IsSleeping())
			{
				continue;
			}
			
			c.Update(this.m_world.m_contactListener);
		}
	}
exports.b2ContactManager = b2ContactManager;


var b2ContactSolver = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ContactSolver.prototype.__constructor = function (step, contacts, contactCount, allocator) {
		var contact;
		
		
		this.m_step.dt = step.dt;
		this.m_step.inv_dt = step.inv_dt;
		this.m_step.maxIterations = step.maxIterations;
		
		this.m_allocator = allocator;
		
		var i = 0;
		var tVec;
		var tMat;
		
		this.m_constraintCount = 0;
		for (i = 0; i < contactCount; ++i)
		{
			
			contact = contacts[i];
			this.m_constraintCount += contact.m_manifoldCount;
		}
		
		
		for (i = 0; i < this.m_constraintCount; i++){
			this.m_constraints[i] = new b2ContactConstraint();
		}
		
		var count = 0;
		for (i = 0; i < contactCount; ++i)
		{
			contact = contacts[i];
			var b1 = contact.m_shape1.m_body;
			var b2 = contact.m_shape2.m_body;
			var manifoldCount = contact.m_manifoldCount;
			var manifolds = contact.GetManifolds();
			var friction = contact.m_friction;
			var restitution = contact.m_restitution;
			
			
			var v1X = b1.m_linearVelocity.x;
			var v1Y = b1.m_linearVelocity.y;
			
			var v2X = b2.m_linearVelocity.x;
			var v2Y = b2.m_linearVelocity.y;
			var w1 = b1.m_angularVelocity;
			var w2 = b2.m_angularVelocity;
			
			for (var j = 0; j < manifoldCount; ++j)
			{
				var manifold = manifolds[ j ];
				
				
				
				
				var normalX = manifold.normal.x;
				var normalY = manifold.normal.y;
				
				
				var c = this.m_constraints[ count ];
				c.body1 = b1; 
				c.body2 = b2; 
				c.manifold = manifold; 
				
				c.normal.x = normalX;
				c.normal.y = normalY;
				c.pointCount = manifold.pointCount;
				c.friction = friction;
				c.restitution = restitution;
				
				for (var k = 0; k < c.pointCount; ++k)
				{
					var cp = manifold.points[ k ];
					var ccp = c.points[ k ];
					
					ccp.normalImpulse = cp.normalImpulse;
					ccp.tangentImpulse = cp.tangentImpulse;
					ccp.separation = cp.separation;
					ccp.positionImpulse = 0.0;
					
					ccp.localAnchor1.SetV(cp.localPoint1);
					ccp.localAnchor2.SetV(cp.localPoint2);
					
					var tX;
					var tY;
					
					
					tMat = b1.m_xf.R;
					var r1X = cp.localPoint1.x - b1.m_sweep.localCenter.x;
					var r1Y = cp.localPoint1.y - b1.m_sweep.localCenter.y;
					tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
					r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
					r1X = tX;
					ccp.r1.Set(r1X,r1Y);
					
					tMat = b2.m_xf.R;
					var r2X = cp.localPoint2.x - b2.m_sweep.localCenter.x;
					var r2Y = cp.localPoint2.y - b2.m_sweep.localCenter.y;
					tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
					r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
					r2X = tX;
					ccp.r2.Set(r2X,r2Y);
					
					var r1Sqr = r1X * r1X + r1Y * r1Y;
					var r2Sqr = r2X * r2X + r2Y * r2Y;
					
					
					var rn1 = r1X*normalX + r1Y*normalY;
					
					var rn2 = r2X*normalX + r2Y*normalY;
					var kNormal = b1.m_invMass + b2.m_invMass;
					kNormal += b1.m_invI * (r1Sqr - rn1 * rn1) + b2.m_invI * (r2Sqr - rn2 * rn2);
					
					ccp.normalMass = 1.0 / kNormal;
					
					var kEqualized = b1.m_mass * b1.m_invMass + b2.m_mass * b2.m_invMass;
					kEqualized += b1.m_mass * b1.m_invI * (r1Sqr - rn1 * rn1) + b2.m_mass * b2.m_invI * (r2Sqr - rn2 * rn2);
					
					ccp.equalizedMass = 1.0 / kEqualized;
					
					
					var tangentX = normalY
					var tangentY = -normalX;
					
					
					var rt1 = r1X*tangentX + r1Y*tangentY;
					
					var rt2 = r2X*tangentX + r2Y*tangentY;
					var kTangent = b1.m_invMass + b2.m_invMass;
					kTangent += b1.m_invI * (r1Sqr - rt1 * rt1) + b2.m_invI * (r2Sqr - rt2 * rt2);
					
					ccp.tangentMass = 1.0 / kTangent;
					
					
					ccp.velocityBias = 0.0;
					if (ccp.separation > 0.0)
					{
						ccp.velocityBias = -60.0 * ccp.separation; 
					}
					
					tX = v2X + (-w2*r2Y) - v1X - (-w1*r1Y);
					tY = v2Y + (w2*r2X) - v1Y - (w1*r1X);
					
					var vRel = c.normal.x*tX + c.normal.y*tY;
					if (vRel < -b2Settings.b2_velocityThreshold)
					{
						ccp.velocityBias += -c.restitution * vRel;
					}
				}
				
				++count;
			}
		}
		
		
	}
b2ContactSolver.prototype.__varz = function(){
this.m_step =  new b2TimeStep();
this.m_constraints =  new Array();
}
b2ContactSolver.prototype.m_step =  new b2TimeStep();
b2ContactSolver.prototype.m_allocator =  null;
b2ContactSolver.prototype.m_constraints =  new Array();
b2ContactSolver.prototype.m_constraintCount =  0;
b2ContactSolver.prototype.InitVelocityConstraints = function (step) {
		var tVec;
		var tVec2;
		var tMat;
		
		
		for (var i = 0; i < this.m_constraintCount; ++i)
		{
			var c = this.m_constraints[ i ];
			
			var b1 = c.body1;
			var b2 = c.body2;
			var invMass1 = b1.m_invMass;
			var invI1 = b1.m_invI;
			var invMass2 = b2.m_invMass;
			var invI2 = b2.m_invI;
			
			var normalX = c.normal.x;
			var normalY = c.normal.y;
			
			var tangentX = normalY;
			var tangentY = -normalX;
			
			var tX;
			
			var j = 0;
			var tCount = 0;
			if (step.warmStarting)
			{
				tCount = c.pointCount;
				for (j = 0; j < tCount; ++j)
				{
					var ccp = c.points[ j ];
					ccp.normalImpulse *= step.dtRatio;
					ccp.tangentImpulse *= step.dtRatio;
					
					var PX = ccp.normalImpulse * normalX + ccp.tangentImpulse * tangentX;
					var PY = ccp.normalImpulse * normalY + ccp.tangentImpulse * tangentY;
					
					
					b1.m_angularVelocity -= invI1 * (ccp.r1.x * PY - ccp.r1.y * PX);
					
					b1.m_linearVelocity.x -= invMass1 * PX;
					b1.m_linearVelocity.y -= invMass1 * PY;
					
					b2.m_angularVelocity += invI2 * (ccp.r2.x * PY - ccp.r2.y * PX);
					
					b2.m_linearVelocity.x += invMass2 * PX;
					b2.m_linearVelocity.y += invMass2 * PY;
				}
			}
			else{
				tCount = c.pointCount;
				for (j = 0; j < tCount; ++j)
				{
					var ccp2 = c.points[ j ];
					ccp2.normalImpulse = 0.0;
					ccp2.tangentImpulse = 0.0;
				}
			}
		}
	}
b2ContactSolver.prototype.SolveVelocityConstraints = function () {
		var j = 0;
		var ccp;
		var r1X;
		var r1Y;
		var r2X;
		var r2Y;
		var dvX;
		var dvY;
		var vn;
		var vt;
		var lambda_n;
		var lambda_t;
		var newImpulse_n;
		var newImpulse_t;
		var PX;
		var PY;
		
		var tMat;
		var tVec;
		
		for (var i = 0; i < this.m_constraintCount; ++i)
		{
			var c = this.m_constraints[ i ];
			var b1 = c.body1;
			var b2 = c.body2;
			var w1 = b1.m_angularVelocity;
			var w2 = b2.m_angularVelocity;
			var v1 = b1.m_linearVelocity;
			var v2 = b2.m_linearVelocity;
			
			var invMass1 = b1.m_invMass;
			var invI1 = b1.m_invI;
			var invMass2 = b2.m_invMass;
			var invI2 = b2.m_invI;
			
			var normalX = c.normal.x;
			var normalY = c.normal.y;
			
			var tangentX = normalY;
			var tangentY = -normalX;
			var friction = c.friction;
			
			var tX;
			
			var tCount = c.pointCount;
			for (j = 0; j < tCount; ++j)
			{
				ccp = c.points[ j ];
				
				
				
				dvX = v2.x + (-w2 * ccp.r2.y) - v1.x - (-w1 * ccp.r1.y);
				dvY = v2.y + (w2 * ccp.r2.x) - v1.y - (w1 * ccp.r1.x);
				
				
				
				vn = dvX * normalX + dvY * normalY;
				lambda_n = -ccp.normalMass * (vn - ccp.velocityBias);
				
				
				vt = dvX*tangentX + dvY*tangentY;
				lambda_t = ccp.tangentMass * (-vt);
				
				
				newImpulse_n = b2Math.b2Max(ccp.normalImpulse + lambda_n, 0.0);
				lambda_n = newImpulse_n - ccp.normalImpulse;
				
				
				var maxFriction = friction * ccp.normalImpulse;
				newImpulse_t = b2Math.b2Clamp(ccp.tangentImpulse + lambda_t, -maxFriction, maxFriction);
				lambda_t = newImpulse_t - ccp.tangentImpulse;
				
				
				
				PX = lambda_n * normalX + lambda_t * tangentX;
				PY = lambda_n * normalY + lambda_t * tangentY;
				
				
				v1.x -= invMass1 * PX;
				v1.y -= invMass1 * PY;
				w1 -= invI1 * (ccp.r1.x * PY - ccp.r1.y * PX);
				
				
				v2.x += invMass2 * PX;
				v2.y += invMass2 * PY;
				w2 += invI2 * (ccp.r2.x * PY - ccp.r2.y * PX);
				
				ccp.normalImpulse = newImpulse_n;
				ccp.tangentImpulse = newImpulse_t;
			}
			
			
			
			
			
			
			b1.m_angularVelocity = w1;
			b2.m_angularVelocity = w2;
		}
	}
b2ContactSolver.prototype.FinalizeVelocityConstraints = function () {
		for (var i = 0; i < this.m_constraintCount; ++i)
		{
			var c = this.m_constraints[ i ];
			var m = c.manifold;
			
			for (var j = 0; j < c.pointCount; ++j)
			{
				var point1 = m.points[j];
				var point2 = c.points[j];
				point1.normalImpulse = point2.normalImpulse;
				point1.tangentImpulse = point2.tangentImpulse;
			}
		}
	}
b2ContactSolver.prototype.SolvePositionConstraints = function (baumgarte) {
		var minSeparation = 0.0;
		
		var tMat;
		var tVec;
		
		for (var i = 0; i < this.m_constraintCount; ++i)
		{
			var c = this.m_constraints[ i ];
			var b1 = c.body1;
			var b2 = c.body2;
			var b1_sweep_c = b1.m_sweep.c;
			var b1_sweep_a = b1.m_sweep.a;
			var b2_sweep_c = b2.m_sweep.c;
			var b2_sweep_a = b2.m_sweep.a;
			
			var invMass1 = b1.m_mass * b1.m_invMass;
			var invI1 = b1.m_mass * b1.m_invI;
			var invMass2 = b2.m_mass * b2.m_invMass;
			var invI2 = b2.m_mass * b2.m_invI;
			
			var normalX = c.normal.x;
			var normalY = c.normal.y;
			
			
			var tCount = c.pointCount;
			for (var j = 0; j < tCount; ++j)
			{
				var ccp = c.points[ j ];
				
				
				tMat = b1.m_xf.R;
				tVec = b1.m_sweep.localCenter;
				var r1X = ccp.localAnchor1.x - tVec.x;
				var r1Y = ccp.localAnchor1.y - tVec.y;
				tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
				r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
				r1X = tX;
				
				
				tMat = b2.m_xf.R;
				tVec = b2.m_sweep.localCenter;
				var r2X = ccp.localAnchor2.x - tVec.x;
				var r2Y = ccp.localAnchor2.y - tVec.y;
				var tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
				r2Y = 			 (tMat.col1.y * r2X + tMat.col2.y * r2Y);
				r2X = tX;
				
				
				var p1X = b1_sweep_c.x + r1X;
				var p1Y = b1_sweep_c.y + r1Y;
				
				
				var p2X = b2_sweep_c.x + r2X;
				var p2Y = b2_sweep_c.y + r2Y;
				
				
				var dpX = p2X - p1X;
				var dpY = p2Y - p1Y;
				
				
				
				var separation = (dpX*normalX + dpY*normalY) + ccp.separation;
				
				
				minSeparation = b2Math.b2Min(minSeparation, separation);
				
				
				var C = baumgarte * b2Math.b2Clamp(separation + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0.0);
				
				
				var dImpulse = -ccp.equalizedMass * C;
				
				
				var impulse0 = ccp.positionImpulse;
				ccp.positionImpulse = b2Math.b2Max(impulse0 + dImpulse, 0.0);
				dImpulse = ccp.positionImpulse - impulse0;
				
				
				var impulseX = dImpulse * normalX;
				var impulseY = dImpulse * normalY;
				
				
				b1_sweep_c.x -= invMass1 * impulseX;
				b1_sweep_c.y -= invMass1 * impulseY;
				b1_sweep_a -= invI1 * (r1X * impulseY - r1Y * impulseX);
				b1.m_sweep.a = b1_sweep_a;
				b1.SynchronizeTransform();
				
				
				b2_sweep_c.x += invMass2 * impulseX;
				b2_sweep_c.y += invMass2 * impulseY;
				b2_sweep_a += invI2 * (r2X * impulseY - r2Y * impulseX);
				b2.m_sweep.a = b2_sweep_a;
				b2.SynchronizeTransform();
			}
			
			
			
		}
		
		
		
		return minSeparation >= -1.5 * b2Settings.b2_linearSlop;
	}
exports.b2ContactSolver = b2ContactSolver;


var b2ContactConstraintPoint = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ContactConstraintPoint.prototype.__constructor = function(){}
b2ContactConstraintPoint.prototype.__varz = function(){
this.localAnchor1 = new b2Vec2();
this.localAnchor2 = new b2Vec2();
this.r1 = new b2Vec2();
this.r2 = new b2Vec2();
}
b2ContactConstraintPoint.prototype.localAnchor1 = new b2Vec2();
b2ContactConstraintPoint.prototype.localAnchor2 = new b2Vec2();
b2ContactConstraintPoint.prototype.r1 = new b2Vec2();
b2ContactConstraintPoint.prototype.r2 = new b2Vec2();
b2ContactConstraintPoint.prototype.normalImpulse =  null;
b2ContactConstraintPoint.prototype.tangentImpulse =  null;
b2ContactConstraintPoint.prototype.positionImpulse =  null;
b2ContactConstraintPoint.prototype.normalMass =  null;
b2ContactConstraintPoint.prototype.tangentMass =  null;
b2ContactConstraintPoint.prototype.equalizedMass =  null;
b2ContactConstraintPoint.prototype.separation =  null;
b2ContactConstraintPoint.prototype.velocityBias =  null;
exports.b2ContactConstraintPoint = b2ContactConstraintPoint;


var b2ContactRegister = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ContactRegister.prototype.__constructor = function(){}
b2ContactRegister.prototype.__varz = function(){
}
b2ContactRegister.prototype.createFcn =  null;
b2ContactRegister.prototype.destroyFcn =  null;
b2ContactRegister.prototype.primary =  null;
exports.b2ContactRegister = b2ContactRegister;


var b2ContactConstraint = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2ContactConstraint.prototype.__constructor = function () {
		this.points = new Array(b2Settings.b2_maxManifoldPoints);
		for (var i = 0; i < b2Settings.b2_maxManifoldPoints; i++){
			this.points[i] = new b2ContactConstraintPoint();
		}
		
		
	}
b2ContactConstraint.prototype.__varz = function(){
this.normal = new b2Vec2();
}
b2ContactConstraint.prototype.points =  null;
b2ContactConstraint.prototype.normal = new b2Vec2();
b2ContactConstraint.prototype.manifold =  null;
b2ContactConstraint.prototype.body1 =  null;
b2ContactConstraint.prototype.body2 =  null;
b2ContactConstraint.prototype.friction =  null;
b2ContactConstraint.prototype.restitution =  null;
b2ContactConstraint.prototype.pointCount =  0;
exports.b2ContactConstraint = b2ContactConstraint;


var b2PolygonContact = function() {
b2Contact.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2PolygonContact.prototype, b2Contact.prototype)
b2PolygonContact.prototype._super = function(){ b2Contact.prototype.__constructor.apply(this, arguments) }
b2PolygonContact.prototype.__constructor = function (shape1, shape2) {
		this._super(shape1, shape2);
		this.m_manifold = this.m_manifolds[0];
		
		
		this.m_manifold.pointCount = 0;
	}
b2PolygonContact.prototype.__varz = function(){
this.m0 =  new b2Manifold();
this.m_manifolds =  [new b2Manifold()];
}
b2PolygonContact.s_evalCP =  new b2ContactPoint();
b2PolygonContact.Create = function (shape1, shape2, allocator) {
		
		return new b2PolygonContact(shape1, shape2);
	}
b2PolygonContact.Destroy = function (contact, allocator) {
		
		
	}
b2PolygonContact.prototype.m0 =  new b2Manifold();
b2PolygonContact.prototype.m_manifolds =  [new b2Manifold()];
b2PolygonContact.prototype.m_manifold =  null;
b2PolygonContact.prototype.Evaluate = function (listener) {
		var v1;
		var v2;
		var mp0;
		
		var b1 = this.m_shape1.m_body;
		var b2 = this.m_shape2.m_body;
		
		var cp;
		var i = 0;
		
		
		
		
		this.m0.Set(this.m_manifold);
		
		b2Collision.b2CollidePolygons(this.m_manifold, this.m_shape1, b1.m_xf, this.m_shape2, b2.m_xf);
		var persisted = [false, false];
		
		cp = b2PolygonContact.s_evalCP;
		cp.shape1 = this.m_shape1;
		cp.shape2 = this.m_shape2;
		cp.friction = this.m_friction;
		cp.restitution = this.m_restitution;
		
		
		if (this.m_manifold.pointCount > 0)
		{
			
			
			
			for (i = 0; i < this.m_manifold.pointCount; ++i)
			{
				var mp = this.m_manifold.points[ i ];
				mp.normalImpulse = 0.0;
				mp.tangentImpulse = 0.0;
				var found = false;
				var idKey = mp.id._key;
				
				for (var j = 0; j < this.m0.pointCount; ++j)
				{
					if (persisted[j] == true)
					{
						continue;
					}
					
					mp0 = this.m0.points[ j ];
					
					if (mp0.id._key == idKey)
					{
						persisted[j] = true;
						mp.normalImpulse = mp0.normalImpulse;
						mp.tangentImpulse = mp0.tangentImpulse;
	
						
						found = true;
	
						
						if (listener != null)
						{
							cp.position = b1.GetWorldPoint(mp.localPoint1);
							v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
							v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
							cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
							cp.normal.SetV(this.m_manifold.normal);
							cp.separation = mp.separation;
							cp.id.key = idKey;
							listener.Persist(cp);
						}
						break;
					}
				}
				
				
				if (found == false && listener != null)
				{
					cp.position = b1.GetWorldPoint(mp.localPoint1);
					v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
					v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
					cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
					cp.normal.SetV(this.m_manifold.normal);
					cp.separation = mp.separation;
					cp.id.key = idKey;
					listener.Add(cp);
				}
			}
			
			this.m_manifoldCount = 1;
		}
		else
		{
			this.m_manifoldCount = 0;
		}
		
		if (listener == null)
		{
			return;
		}
		
		
		for (i = 0; i < this.m0.pointCount; ++i)
		{
			if (persisted[i])
			{
				continue;
			}
	
			mp0 = this.m0.points[ i ];
			cp.position = b1.GetWorldPoint(mp0.localPoint1);
			v1 = b1.GetLinearVelocityFromLocalPoint(mp0.localPoint1);
			v2 = b2.GetLinearVelocityFromLocalPoint(mp0.localPoint2);
			cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
			cp.normal.SetV(this.m0.normal);
			cp.separation = mp0.separation;
			cp.id.key = mp0.id._key;
			listener.Remove(cp);
		}
	}
b2PolygonContact.prototype.GetManifolds = function () {
		return this.m_manifolds;
	}
exports.b2PolygonContact = b2PolygonContact;
	
	
var b2CircleContact = function() {
b2Contact.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2CircleContact.prototype, b2Contact.prototype)
b2CircleContact.prototype._super = function(){ b2Contact.prototype.__constructor.apply(this, arguments) }
b2CircleContact.prototype.__constructor = function (shape1, shape2) {
		this._super(shape1, shape2);
		
		this.m_manifold = this.m_manifolds[0];
		
		
		
		this.m_manifold.pointCount = 0;
		var point = this.m_manifold.points[0];
		point.normalImpulse = 0.0;
		point.tangentImpulse = 0.0;
	}
b2CircleContact.prototype.__varz = function(){
this.m_manifolds =  [new b2Manifold()];
this.m0 =  new b2Manifold();
}
b2CircleContact.s_evalCP =  new b2ContactPoint();
b2CircleContact.Create = function (shape1, shape2, allocator) {
		return new b2CircleContact(shape1, shape2);
	}
b2CircleContact.Destroy = function (contact, allocator) {
		
	}
b2CircleContact.prototype.m_manifolds =  [new b2Manifold()];
b2CircleContact.prototype.m0 =  new b2Manifold();
b2CircleContact.prototype.m_manifold =  null;
b2CircleContact.prototype.Evaluate = function (listener) {
		var v1;
		var v2;
		var mp0;
		
		var b1 = this.m_shape1.m_body;
		var b2 = this.m_shape2.m_body;
		
		
		
		
		this.m0.Set(this.m_manifold);
		
		b2Collision.b2CollideCircles(this.m_manifold, this.m_shape1, b1.m_xf, this.m_shape2, b2.m_xf);
		
		var cp = b2CircleContact.s_evalCP;
		cp.shape1 = this.m_shape1;
		cp.shape2 = this.m_shape2;
		cp.friction = this.m_friction;
		cp.restitution = this.m_restitution;
		
		if (this.m_manifold.pointCount > 0)
		{
			this.m_manifoldCount = 1;
			var mp = this.m_manifold.points[ 0 ];
			
			if (this.m0.pointCount == 0)
			{
				mp.normalImpulse = 0.0;
				mp.tangentImpulse = 0.0;
	
				if (listener)
				{
					cp.position = b1.GetWorldPoint(mp.localPoint1);
					v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
					v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
					cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
					cp.normal.SetV(this.m_manifold.normal);
					cp.separation = mp.separation;
					cp.id.key = mp.id._key;
					listener.Add(cp);
				}
			} else
			{
				mp0 = this.m0.points[ 0 ];
				mp.normalImpulse = mp0.normalImpulse;
				mp.tangentImpulse = mp0.tangentImpulse;
				
				if (listener)
				{
					cp.position = b1.GetWorldPoint(mp.localPoint1);
					v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
					v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
					cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
					cp.normal.SetV(this.m_manifold.normal);
					cp.separation = mp.separation;
					cp.id.key = mp.id._key;
					listener.Persist(cp);
				}
			}
		}
		else
		{
			this.m_manifoldCount = 0;
			if (this.m0.pointCount > 0 && listener)
			{
				mp0 = this.m0.points[ 0 ];
				cp.position = b1.GetWorldPoint(mp0.localPoint1);
				v1 = b1.GetLinearVelocityFromLocalPoint(mp0.localPoint1);
				v2 = b2.GetLinearVelocityFromLocalPoint(mp0.localPoint2);
				cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
				cp.normal.SetV(this.m0.normal);
				cp.separation = mp0.separation;
				cp.id.key = mp0.id._key;
				listener.Remove(cp);
			}
		}
	}
b2CircleContact.prototype.GetManifolds = function () {
		return this.m_manifolds;
	}
exports.b2CircleContact = b2CircleContact;

	
var b2PolyAndCircleContact = function() {
b2Contact.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2PolyAndCircleContact.prototype, b2Contact.prototype)
b2PolyAndCircleContact.prototype._super = function(){ b2Contact.prototype.__constructor.apply(this, arguments) }
b2PolyAndCircleContact.prototype.__constructor = function (shape1, shape2) {
		this._super(shape1, shape2);
		
		this.m_manifold = this.m_manifolds[0];
		
		b2Settings.b2Assert(this.m_shape1.m_type == b2Shape.e_polygonShape);
		b2Settings.b2Assert(this.m_shape2.m_type == b2Shape.e_circleShape);
		this.m_manifold.pointCount = 0;
		var point = this.m_manifold.points[0];
		point.normalImpulse = 0.0;
		point.tangentImpulse = 0.0;
	}
b2PolyAndCircleContact.prototype.__varz = function(){
this.m_manifolds =  [new b2Manifold()];
this.m0 =  new b2Manifold();
}
b2PolyAndCircleContact.s_evalCP =  new b2ContactPoint();
b2PolyAndCircleContact.Create = function (shape1, shape2, allocator) {
		return new b2PolyAndCircleContact(shape1, shape2);
	}
b2PolyAndCircleContact.Destroy = function (contact, allocator) {
	}
b2PolyAndCircleContact.prototype.m_manifolds =  [new b2Manifold()];
b2PolyAndCircleContact.prototype.m0 =  new b2Manifold();
b2PolyAndCircleContact.prototype.m_manifold =  null;
b2PolyAndCircleContact.prototype.Evaluate = function (listener) {
		var i = 0;
		var v1;
		var v2;
		var mp0;
		
		var b1 = this.m_shape1.m_body;
		var b2 = this.m_shape2.m_body;
		
		
		
		
		this.m0.Set(this.m_manifold);
		
		b2Collision.b2CollidePolygonAndCircle(this.m_manifold, this.m_shape1, b1.m_xf, this.m_shape2, b2.m_xf);
		
		var persisted = [false, false];
		
		var cp = b2PolyAndCircleContact.s_evalCP;
		cp.shape1 = this.m_shape1;
		cp.shape2 = this.m_shape2;
		cp.friction = this.m_friction;
		cp.restitution = this.m_restitution;
		
		
		if (this.m_manifold.pointCount > 0)
		{
			
			
			for (i = 0; i < this.m_manifold.pointCount; ++i)
			{
				var mp = this.m_manifold.points[ i ];
				mp.normalImpulse = 0.0;
				mp.tangentImpulse = 0.0;
				var found = false;
				var idKey = mp.id._key;
	
				for (var j = 0; j < this.m0.pointCount; ++j)
				{
					if (persisted[j] == true)
					{
						continue;
					}
	
					mp0 = this.m0.points[ j ];
	
					if (mp0.id._key == idKey)
					{
						persisted[j] = true;
						mp.normalImpulse = mp0.normalImpulse;
						mp.tangentImpulse = mp0.tangentImpulse;
	
						
						found = true;
	
						
						if (listener != null)
						{
							cp.position = b1.GetWorldPoint(mp.localPoint1);
							v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
							v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
							cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
							cp.normal.SetV(this.m_manifold.normal);
							cp.separation = mp.separation;
							cp.id.key = idKey;
							listener.Persist(cp);
						}
						break;
					}
				}
	
				
				if (found == false && listener != null)
				{
					cp.position = b1.GetWorldPoint(mp.localPoint1);
					v1 = b1.GetLinearVelocityFromLocalPoint(mp.localPoint1);
					v2 = b2.GetLinearVelocityFromLocalPoint(mp.localPoint2);
					cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
					cp.normal.SetV(this.m_manifold.normal);
					cp.separation = mp.separation;
					cp.id.key = idKey;
					listener.Add(cp);
				}
			}
	
			this.m_manifoldCount = 1;
		}
		else
		{
			this.m_manifoldCount = 0;
		}
		
		if (listener == null)
		{
			return;
		}
		
		
		for (i = 0; i < this.m0.pointCount; ++i)
		{
			if (persisted[i])
			{
				continue;
			}
			
			mp0 = this.m0.points[ i ];
			cp.position = b1.GetWorldPoint(mp0.localPoint1);
			v1 = b1.GetLinearVelocityFromLocalPoint(mp0.localPoint1);
			v2 = b2.GetLinearVelocityFromLocalPoint(mp0.localPoint2);
			cp.velocity.Set(v2.x - v1.x, v2.y - v1.y);
			cp.normal.SetV(this.m0.normal);
			cp.separation = mp0.separation;
			cp.id.key = mp0.id._key;
			listener.Remove(cp);
		}
	}
b2PolyAndCircleContact.prototype.GetManifolds = function () {
		return this.m_manifolds;
	}
exports.b2PolyAndCircleContact = b2PolyAndCircleContact;
	
	
var b2JointEdge = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2JointEdge.prototype.__constructor = function(){}
b2JointEdge.prototype.__varz = function(){
}
b2JointEdge.prototype.other =  null;
b2JointEdge.prototype.joint =  null;
b2JointEdge.prototype.prev =  null;
b2JointEdge.prototype.next =  null;
exports.b2JointEdge = b2JointEdge;


var b2JointDef = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2JointDef.prototype.__constructor = function () {
		this.type = b2Joint.e_unknownJoint;
		this.userData = null;
		this.body1 = null;
		this.body2 = null;
		this.collideConnected = false;
	}
b2JointDef.prototype.__varz = function(){
}
b2JointDef.prototype.type =  0;
b2JointDef.prototype.userData =  null;
b2JointDef.prototype.body1 =  null;
b2JointDef.prototype.body2 =  null;
b2JointDef.prototype.collideConnected =  null;
exports.b2JointDef = b2JointDef;


var b2MouseJointDef = function() {
b2JointDef.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2MouseJointDef.prototype, b2JointDef.prototype)
b2MouseJointDef.prototype._super = function(){ b2JointDef.prototype.__constructor.apply(this, arguments) }
b2MouseJointDef.prototype.__constructor = function () {
		this.type = b2Joint.e_mouseJoint;
		this.maxForce = 0.0;
		this.frequencyHz = 5.0;
		this.dampingRatio = 0.7;
		this.timeStep = 1.0 / 60.0;
	}
b2MouseJointDef.prototype.__varz = function(){
this.target =  new b2Vec2();
}
b2MouseJointDef.prototype.target =  new b2Vec2();
b2MouseJointDef.prototype.maxForce =  null;
b2MouseJointDef.prototype.frequencyHz =  null;
b2MouseJointDef.prototype.dampingRatio =  null;
b2MouseJointDef.prototype.timeStep =  null;
exports.b2MouseJointDef = b2MouseJointDef;


var b2PulleyJointDef = function() {
b2JointDef.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2PulleyJointDef.prototype, b2JointDef.prototype)
b2PulleyJointDef.prototype._super = function(){ b2JointDef.prototype.__constructor.apply(this, arguments) }
b2PulleyJointDef.prototype.__constructor = function () {
		this.type = b2Joint.e_pulleyJoint;
		this.groundAnchor1.Set(-1.0, 1.0);
		this.groundAnchor2.Set(1.0, 1.0);
		this.localAnchor1.Set(-1.0, 0.0);
		this.localAnchor2.Set(1.0, 0.0);
		this.length1 = 0.0;
		this.maxLength1 = 0.0;
		this.length2 = 0.0;
		this.maxLength2 = 0.0;
		this.ratio = 1.0;
		this.collideConnected = true;
	}
b2PulleyJointDef.prototype.__varz = function(){
this.groundAnchor1 =  new b2Vec2();
this.groundAnchor2 =  new b2Vec2();
this.localAnchor1 =  new b2Vec2();
this.localAnchor2 =  new b2Vec2();
}
b2PulleyJointDef.prototype.groundAnchor1 =  new b2Vec2();
b2PulleyJointDef.prototype.groundAnchor2 =  new b2Vec2();
b2PulleyJointDef.prototype.localAnchor1 =  new b2Vec2();
b2PulleyJointDef.prototype.localAnchor2 =  new b2Vec2();
b2PulleyJointDef.prototype.length1 =  null;
b2PulleyJointDef.prototype.maxLength1 =  null;
b2PulleyJointDef.prototype.length2 =  null;
b2PulleyJointDef.prototype.maxLength2 =  null;
b2PulleyJointDef.prototype.ratio =  null;
b2PulleyJointDef.prototype.Initialize = function (b1, b2,
				ga1, ga2,
				anchor1, anchor2,
				r) {
		this.body1 = b1;
		this.body2 = b2;
		this.groundAnchor1.SetV( ga1 );
		this.groundAnchor2.SetV( ga2 );
		this.localAnchor1 = this.body1.GetLocalPoint(anchor1);
		this.localAnchor2 = this.body2.GetLocalPoint(anchor2);
		
		var d1X = anchor1.x - ga1.x;
		var d1Y = anchor1.y - ga1.y;
		
		this.length1 = Math.sqrt(d1X*d1X + d1Y*d1Y);
		
		
		var d2X = anchor2.x - ga2.x;
		var d2Y = anchor2.y - ga2.y;
		
		this.length2 = Math.sqrt(d2X*d2X + d2Y*d2Y);
		
		this.ratio = r;
		
		var C = this.length1 + this.ratio * this.length2;
		this.maxLength1 = C - this.ratio * b2PulleyJoint.b2_minPulleyLength;
		this.maxLength2 = (C - b2PulleyJoint.b2_minPulleyLength) / this.ratio;
	}
exports.b2PulleyJointDef = b2PulleyJointDef;
	
	
var b2Jacobian = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Jacobian.prototype.__constructor = function(){}
b2Jacobian.prototype.__varz = function(){
this.linear1 =  new b2Vec2();
this.linear2 =  new b2Vec2();
}
b2Jacobian.prototype.linear1 =  new b2Vec2();
b2Jacobian.prototype.angular1 =  null;
b2Jacobian.prototype.linear2 =  new b2Vec2();
b2Jacobian.prototype.angular2 =  null;
b2Jacobian.prototype.SetZero = function () {
		this.linear1.SetZero(); this.angular1 = 0.0;
		this.linear2.SetZero(); this.angular2 = 0.0;
	}
b2Jacobian.prototype.Set = function (x1, a1, x2, a2) {
		this.linear1.SetV(x1); this.angular1 = a1;
		this.linear2.SetV(x2); this.angular2 = a2;
	}
b2Jacobian.prototype.Compute = function (x1, a1, x2, a2) {
		
		
		return (this.linear1.x*x1.x + this.linear1.y*x1.y) + this.angular1 * a1 + (this.linear2.x*x2.x + this.linear2.y*x2.y) + this.angular2 * a2;
	}
exports.b2Jacobian = b2Jacobian;
	
	
var b2DistanceJointDef = function() {
b2JointDef.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2DistanceJointDef.prototype, b2JointDef.prototype)
b2DistanceJointDef.prototype._super = function(){ b2JointDef.prototype.__constructor.apply(this, arguments) }
b2DistanceJointDef.prototype.__constructor = function () {
		this.type = b2Joint.e_distanceJoint;
		
		
		this.length = 1.0;
		this.frequencyHz = 0.0;
		this.dampingRatio = 0.0;
	}
b2DistanceJointDef.prototype.__varz = function(){
this.localAnchor1 =  new b2Vec2();
this.localAnchor2 =  new b2Vec2();
}
b2DistanceJointDef.prototype.localAnchor1 =  new b2Vec2();
b2DistanceJointDef.prototype.localAnchor2 =  new b2Vec2();
b2DistanceJointDef.prototype.length =  null;
b2DistanceJointDef.prototype.frequencyHz =  null;
b2DistanceJointDef.prototype.dampingRatio =  null;
b2DistanceJointDef.prototype.Initialize = function (b1, b2,
								anchor1, anchor2) {
		this.body1 = b1;
		this.body2 = b2;
		this.localAnchor1.SetV( this.body1.GetLocalPoint(anchor1));
		this.localAnchor2.SetV( this.body2.GetLocalPoint(anchor2));
		var dX = anchor2.x - anchor1.x;
		var dY = anchor2.y - anchor1.y;
		this.length = Math.sqrt(dX*dX + dY*dY);
		this.frequencyHz = 0.0;
		this.dampingRatio = 0.0;
	}
exports.b2DistanceJointDef = b2DistanceJointDef;
	
	
var b2PrismaticJointDef = function() {
b2JointDef.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2PrismaticJointDef.prototype, b2JointDef.prototype)
b2PrismaticJointDef.prototype._super = function(){ b2JointDef.prototype.__constructor.apply(this, arguments) }
b2PrismaticJointDef.prototype.__constructor = function () {
		this.type = b2Joint.e_prismaticJoint;
		
		
		this.localAxis1.Set(1.0, 0.0);
		this.referenceAngle = 0.0;
		this.enableLimit = false;
		this.lowerTranslation = 0.0;
		this.upperTranslation = 0.0;
		this.enableMotor = false;
		this.maxMotorForce = 0.0;
		this.motorSpeed = 0.0;
	}
b2PrismaticJointDef.prototype.__varz = function(){
this.localAnchor1 =  new b2Vec2();
this.localAnchor2 =  new b2Vec2();
this.localAxis1 =  new b2Vec2();
}
b2PrismaticJointDef.prototype.localAnchor1 =  new b2Vec2();
b2PrismaticJointDef.prototype.localAnchor2 =  new b2Vec2();
b2PrismaticJointDef.prototype.localAxis1 =  new b2Vec2();
b2PrismaticJointDef.prototype.referenceAngle =  null;
b2PrismaticJointDef.prototype.enableLimit =  null;
b2PrismaticJointDef.prototype.lowerTranslation =  null;
b2PrismaticJointDef.prototype.upperTranslation =  null;
b2PrismaticJointDef.prototype.enableMotor =  null;
b2PrismaticJointDef.prototype.maxMotorForce =  null;
b2PrismaticJointDef.prototype.motorSpeed =  null;
b2PrismaticJointDef.prototype.Initialize = function (b1, b2, anchor, axis) {
		this.body1 = b1;
		this.body2 = b2;
		this.localAnchor1 = this.body1.GetLocalPoint(anchor);
		this.localAnchor2 = this.body2.GetLocalPoint(anchor);
		this.localAxis1 = this.body1.GetLocalVector(axis);
		this.referenceAngle = this.body2.GetAngle() - this.body1.GetAngle();
	}
exports.b2PrismaticJointDef = b2PrismaticJointDef;
	
	
var b2RevoluteJointDef = function() {
b2JointDef.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2RevoluteJointDef.prototype, b2JointDef.prototype)
b2RevoluteJointDef.prototype._super = function(){ b2JointDef.prototype.__constructor.apply(this, arguments) }
b2RevoluteJointDef.prototype.__constructor = function () {
		this.type = b2Joint.e_revoluteJoint;
		this.localAnchor1.Set(0.0, 0.0);
		this.localAnchor2.Set(0.0, 0.0);
		this.referenceAngle = 0.0;
		this.lowerAngle = 0.0;
		this.upperAngle = 0.0;
		this.maxMotorTorque = 0.0;
		this.motorSpeed = 0.0;
		this.enableLimit = false;
		this.enableMotor = false;
	}
b2RevoluteJointDef.prototype.__varz = function(){
this.localAnchor1 =  new b2Vec2();
this.localAnchor2 =  new b2Vec2();
}
b2RevoluteJointDef.prototype.localAnchor1 =  new b2Vec2();
b2RevoluteJointDef.prototype.localAnchor2 =  new b2Vec2();
b2RevoluteJointDef.prototype.referenceAngle =  null;
b2RevoluteJointDef.prototype.enableLimit =  null;
b2RevoluteJointDef.prototype.lowerAngle =  null;
b2RevoluteJointDef.prototype.upperAngle =  null;
b2RevoluteJointDef.prototype.enableMotor =  null;
b2RevoluteJointDef.prototype.motorSpeed =  null;
b2RevoluteJointDef.prototype.maxMotorTorque =  null;
b2RevoluteJointDef.prototype.Initialize = function (b1, b2, anchor) {
		this.body1 = b1;
		this.body2 = b2;
		this.localAnchor1 = this.body1.GetLocalPoint(anchor);
		this.localAnchor2 = this.body2.GetLocalPoint(anchor);
		this.referenceAngle = this.body2.GetAngle() - this.body1.GetAngle();
	}
exports.b2RevoluteJointDef = b2RevoluteJointDef;
	
	
var b2Joint = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2Joint.prototype.__constructor = function (def) {
		this.m_type = def.type;
		this.m_prev = null;
		this.m_next = null;
		this.m_body1 = def.body1;
		this.m_body2 = def.body2;
		this.m_collideConnected = def.collideConnected;
		this.m_islandFlag = false;
		this.m_userData = def.userData;
	}
b2Joint.prototype.__varz = function(){
this.m_node1 =  new b2JointEdge();
this.m_node2 =  new b2JointEdge();
}
b2Joint.e_unknownJoint =  0;
b2Joint.e_revoluteJoint =  1;
b2Joint.e_prismaticJoint =  2;
b2Joint.e_distanceJoint =  3;
b2Joint.e_pulleyJoint =  4;
b2Joint.e_mouseJoint =  5;
b2Joint.e_gearJoint =  6;
b2Joint.e_inactiveLimit =  0;
b2Joint.e_atLowerLimit =  1;
b2Joint.e_atUpperLimit =  2;
b2Joint.e_equalLimits =  3;
b2Joint.Create = function (def, allocator) {
		var joint = null;
		
		switch (def.type)
		{
		case b2Joint.e_distanceJoint:
			{
				
				joint = new b2DistanceJoint(def);
			}
			break;
		
		case b2Joint.e_mouseJoint:
			{
				
				joint = new b2MouseJoint(def);
			}
			break;
		
		case b2Joint.e_prismaticJoint:
			{
				
				joint = new b2PrismaticJoint(def);
			}
			break;
		
		case b2Joint.e_revoluteJoint:
			{
				
				joint = new b2RevoluteJoint(def);
			}
			break;
		
		case b2Joint.e_pulleyJoint:
			{
				
				joint = new b2PulleyJoint(def);
			}
			break;
		
		case b2Joint.e_gearJoint:
			{
				
				joint = new b2GearJoint(def);
			}
			break;
		
		default:
			
			break;
		}
		
		return joint;
	}
b2Joint.Destroy = function (joint, allocator) {
		
	}
b2Joint.prototype.m_type =  0;
b2Joint.prototype.m_prev =  null;
b2Joint.prototype.m_next =  null;
b2Joint.prototype.m_node1 =  new b2JointEdge();
b2Joint.prototype.m_node2 =  new b2JointEdge();
b2Joint.prototype.m_body1 =  null;
b2Joint.prototype.m_body2 =  null;
b2Joint.prototype.m_inv_dt =  null;
b2Joint.prototype.m_islandFlag =  null;
b2Joint.prototype.m_collideConnected =  null;
b2Joint.prototype.m_userData =  null;
b2Joint.prototype.GetType = function () {
		return this.m_type;
	}
b2Joint.prototype.GetAnchor1 = function () {return null}
b2Joint.prototype.GetAnchor2 = function () {return null}
b2Joint.prototype.GetReactionForce = function () {return null}
b2Joint.prototype.GetReactionTorque = function () {return 0.0}
b2Joint.prototype.GetBody1 = function () {
		return this.m_body1;
	}
b2Joint.prototype.GetBody2 = function () {
		return this.m_body2;
	}
b2Joint.prototype.GetNext = function () {
		return this.m_next;
	}
b2Joint.prototype.GetUserData = function () {
		return this.m_userData;
	}
b2Joint.prototype.SetUserData = function (data) {
		this.m_userData = data;
	}
b2Joint.prototype.InitVelocityConstraints = function (step) {}
b2Joint.prototype.SolveVelocityConstraints = function (step) {}
b2Joint.prototype.InitPositionConstraints = function () {}
b2Joint.prototype.SolvePositionConstraints = function () {return false}
exports.b2Joint = b2Joint;


var b2GearJoint = function() {
b2Joint.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2GearJoint.prototype, b2Joint.prototype)
b2GearJoint.prototype._super = function(){ b2Joint.prototype.__constructor.apply(this, arguments) }
b2GearJoint.prototype.__constructor = function (def) {
		
		this._super(def);
		
		var type1 = def.joint1.m_type;
		var type2 = def.joint2.m_type;
		
		
		
		
		
		
		this.m_revolute1 = null;
		this.m_prismatic1 = null;
		this.m_revolute2 = null;
		this.m_prismatic2 = null;
		
		var coordinate1;
		var coordinate2;
		
		this.m_ground1 = def.joint1.m_body1;
		this.m_body1 = def.joint1.m_body2;
		if (type1 == b2Joint.e_revoluteJoint)
		{
			this.m_revolute1 = def.joint1;
			this.m_groundAnchor1.SetV( this.m_revolute1.m_localAnchor1 );
			this.m_localAnchor1.SetV( this.m_revolute1.m_localAnchor2 );
			coordinate1 = this.m_revolute1.GetJointAngle();
		}
		else
		{
			this.m_prismatic1 = def.joint1;
			this.m_groundAnchor1.SetV( this.m_prismatic1.m_localAnchor1 );
			this.m_localAnchor1.SetV( this.m_prismatic1.m_localAnchor2 );
			coordinate1 = this.m_prismatic1.GetJointTranslation();
		}
		
		this.m_ground2 = def.joint2.m_body1;
		this.m_body2 = def.joint2.m_body2;
		if (type2 == b2Joint.e_revoluteJoint)
		{
			this.m_revolute2 = def.joint2;
			this.m_groundAnchor2.SetV( this.m_revolute2.m_localAnchor1 );
			this.m_localAnchor2.SetV( this.m_revolute2.m_localAnchor2 );
			coordinate2 = this.m_revolute2.GetJointAngle();
		}
		else
		{
			this.m_prismatic2 = def.joint2;
			this.m_groundAnchor2.SetV( this.m_prismatic2.m_localAnchor1 );
			this.m_localAnchor2.SetV( this.m_prismatic2.m_localAnchor2 );
			coordinate2 = this.m_prismatic2.GetJointTranslation();
		}
		
		this.m_ratio = def.ratio;
		
		this.m_constant = coordinate1 + this.m_ratio * coordinate2;
		
		this.m_force = 0.0;
		
	}
b2GearJoint.prototype.__varz = function(){
this.m_groundAnchor1 =  new b2Vec2();
this.m_groundAnchor2 =  new b2Vec2();
this.m_localAnchor1 =  new b2Vec2();
this.m_localAnchor2 =  new b2Vec2();
this.m_J =  new b2Jacobian();
}
b2GearJoint.prototype.m_ground1 =  null;
b2GearJoint.prototype.m_ground2 =  null;
b2GearJoint.prototype.m_revolute1 =  null;
b2GearJoint.prototype.m_prismatic1 =  null;
b2GearJoint.prototype.m_revolute2 =  null;
b2GearJoint.prototype.m_prismatic2 =  null;
b2GearJoint.prototype.m_groundAnchor1 =  new b2Vec2();
b2GearJoint.prototype.m_groundAnchor2 =  new b2Vec2();
b2GearJoint.prototype.m_localAnchor1 =  new b2Vec2();
b2GearJoint.prototype.m_localAnchor2 =  new b2Vec2();
b2GearJoint.prototype.m_J =  new b2Jacobian();
b2GearJoint.prototype.m_constant =  null;
b2GearJoint.prototype.m_ratio =  null;
b2GearJoint.prototype.m_mass =  null;
b2GearJoint.prototype.m_force =  null;
b2GearJoint.prototype.GetAnchor1 = function () {
		
		return this.m_body1.GetWorldPoint(this.m_localAnchor1);
	}
b2GearJoint.prototype.GetAnchor2 = function () {
		
		return this.m_body2.GetWorldPoint(this.m_localAnchor2);
	}
b2GearJoint.prototype.GetReactionForce = function () {
		
		var F = new b2Vec2(this.m_force * this.m_J.linear2.x, this.m_force * this.m_J.linear2.y);
		return F;
	}
b2GearJoint.prototype.GetReactionTorque = function () {
		
		
		var tMat = this.m_body2.m_xf.R;
		var rX = this.m_localAnchor1.x - this.m_body2.m_sweep.localCenter.x;
		var rY = this.m_localAnchor1.y - this.m_body2.m_sweep.localCenter.y;
		var tX = tMat.col1.x * rX + tMat.col2.x * rY;
		rY = tMat.col1.y * rX + tMat.col2.y * rY;
		rX = tX;
		
		
		tX = this.m_force * this.m_J.angular2 - (rX * (this.m_force * this.m_J.linear2.y) - rY * (this.m_force * this.m_J.linear2.x));
		return tX;
	}
b2GearJoint.prototype.GetRatio = function () {
		return this.m_ratio;
	}
b2GearJoint.prototype.InitVelocityConstraints = function (step) {
		var g1 = this.m_ground1;
		var g2 = this.m_ground2;
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		
		var ugX;
		var ugY;
		var rX;
		var rY;
		var tMat;
		var tVec;
		var crug;
		var tX;
		
		var K = 0.0;
		this.m_J.SetZero();
		
		if (this.m_revolute1)
		{
			this.m_J.angular1 = -1.0;
			K += b1.m_invI;
		}
		else
		{
			
			tMat = g1.m_xf.R;
			tVec = this.m_prismatic1.m_localXAxis1;
			ugX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
			ugY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
			
			tMat = b1.m_xf.R;
			rX = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
			rY = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
			tX = tMat.col1.x * rX + tMat.col2.x * rY;
			rY = tMat.col1.y * rX + tMat.col2.y * rY;
			rX = tX;
			
			
			crug = rX * ugY - rY * ugX;
			
			this.m_J.linear1.Set(-ugX, -ugY);
			this.m_J.angular1 = -crug;
			K += b1.m_invMass + b1.m_invI * crug * crug;
		}
		
		if (this.m_revolute2)
		{
			this.m_J.angular2 = -this.m_ratio;
			K += this.m_ratio * this.m_ratio * b2.m_invI;
		}
		else
		{
			
			tMat = g2.m_xf.R;
			tVec = this.m_prismatic2.m_localXAxis1;
			ugX = tMat.col1.x * tVec.x + tMat.col2.x * tVec.y;
			ugY = tMat.col1.y * tVec.x + tMat.col2.y * tVec.y;
			
			tMat = b2.m_xf.R;
			rX = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
			rY = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
			tX = tMat.col1.x * rX + tMat.col2.x * rY;
			rY = tMat.col1.y * rX + tMat.col2.y * rY;
			rX = tX;
			
			
			crug = rX * ugY - rY * ugX;
			
			this.m_J.linear2.Set(-this.m_ratio*ugX, -this.m_ratio*ugY);
			this.m_J.angular2 = -this.m_ratio * crug;
			K += this.m_ratio * this.m_ratio * (b2.m_invMass + b2.m_invI * crug * crug);
		}
		
		
		
		this.m_mass = 1.0 / K;
		
		if (step.warmStarting)
		{
			
			var P = step.dt * this.m_force;
			
			b1.m_linearVelocity.x += b1.m_invMass * P * this.m_J.linear1.x;
			b1.m_linearVelocity.y += b1.m_invMass * P * this.m_J.linear1.y;
			b1.m_angularVelocity += b1.m_invI * P * this.m_J.angular1;
			
			b2.m_linearVelocity.x += b2.m_invMass * P * this.m_J.linear2.x;
			b2.m_linearVelocity.y += b2.m_invMass * P * this.m_J.linear2.y;
			b2.m_angularVelocity += b2.m_invI * P * this.m_J.angular2;
		}
		else
		{
			this.m_force = 0.0;
		}
	}
b2GearJoint.prototype.SolveVelocityConstraints = function (step) {
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var Cdot = this.m_J.Compute(	b1.m_linearVelocity, b1.m_angularVelocity,
										b2.m_linearVelocity, b2.m_angularVelocity);
		
		var force = -step.inv_dt * this.m_mass * Cdot;
		this.m_force += force;
		
		var P = step.dt * force;
		b1.m_linearVelocity.x += b1.m_invMass * P * this.m_J.linear1.x;
		b1.m_linearVelocity.y += b1.m_invMass * P * this.m_J.linear1.y;
		b1.m_angularVelocity += b1.m_invI * P * this.m_J.angular1;
		b2.m_linearVelocity.x += b2.m_invMass * P * this.m_J.linear2.x;
		b2.m_linearVelocity.y += b2.m_invMass * P * this.m_J.linear2.y;
		b2.m_angularVelocity += b2.m_invI * P * this.m_J.angular2;
	}
b2GearJoint.prototype.SolvePositionConstraints = function () {
		var linearError = 0.0;
		
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var coordinate1;
		var coordinate2;
		if (this.m_revolute1)
		{
			coordinate1 = this.m_revolute1.GetJointAngle();
		}
		else
		{
			coordinate1 = this.m_prismatic1.GetJointTranslation();
		}
		
		if (this.m_revolute2)
		{
			coordinate2 = this.m_revolute2.GetJointAngle();
		}
		else
		{
			coordinate2 = this.m_prismatic2.GetJointTranslation();
		}
		
		var C = this.m_constant - (coordinate1 + this.m_ratio * coordinate2);
		
		var impulse = -this.m_mass * C;
		
		b1.m_sweep.c.x += b1.m_invMass * impulse * this.m_J.linear1.x;
		b1.m_sweep.c.y += b1.m_invMass * impulse * this.m_J.linear1.y;
		b1.m_sweep.a += b1.m_invI * impulse * this.m_J.angular1;
		b2.m_sweep.c.x += b2.m_invMass * impulse * this.m_J.linear2.x;
		b2.m_sweep.c.y += b2.m_invMass * impulse * this.m_J.linear2.y;
		b2.m_sweep.a += b2.m_invI * impulse * this.m_J.angular2;
		
		b1.SynchronizeTransform();
		b2.SynchronizeTransform();
		
		return linearError < b2Settings.b2_linearSlop;
	}
exports.b2GearJoint = b2GearJoint;
	
	
var b2GearJointDef = function() {
b2JointDef.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2GearJointDef.prototype, b2JointDef.prototype)
b2GearJointDef.prototype._super = function(){ b2JointDef.prototype.__constructor.apply(this, arguments) }
b2GearJointDef.prototype.__constructor = function () {
		this.type = b2Joint.e_gearJoint;
		this.joint1 = null;
		this.joint2 = null;
		this.ratio = 1.0;
	}
b2GearJointDef.prototype.__varz = function(){
}
b2GearJointDef.prototype.joint1 =  null;
b2GearJointDef.prototype.joint2 =  null;
b2GearJointDef.prototype.ratio =  null;
exports.b2GearJointDef = b2GearJointDef;


var b2DistanceJoint = function() {
b2Joint.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2DistanceJoint.prototype, b2Joint.prototype)
b2DistanceJoint.prototype._super = function(){ b2Joint.prototype.__constructor.apply(this, arguments) }
b2DistanceJoint.prototype.__constructor = function (def) {
		this._super(def);
		
		var tMat;
		var tX;
		var tY;
		
		this.m_localAnchor1.SetV(def.localAnchor1);
		
		this.m_localAnchor2.SetV(def.localAnchor2);
		
		this.m_length = def.length;
		this.m_frequencyHz = def.frequencyHz;
		this.m_dampingRatio = def.dampingRatio;
		this.m_impulse = 0.0;
		this.m_gamma = 0.0;
		this.m_bias = 0.0;
		this.m_inv_dt = 0.0;
	}
b2DistanceJoint.prototype.__varz = function(){
this.m_localAnchor1 =  new b2Vec2();
this.m_localAnchor2 =  new b2Vec2();
this.m_u =  new b2Vec2();
}
b2DistanceJoint.prototype.m_localAnchor1 =  new b2Vec2();
b2DistanceJoint.prototype.m_localAnchor2 =  new b2Vec2();
b2DistanceJoint.prototype.m_u =  new b2Vec2();
b2DistanceJoint.prototype.m_frequencyHz =  null;
b2DistanceJoint.prototype.m_dampingRatio =  null;
b2DistanceJoint.prototype.m_gamma =  null;
b2DistanceJoint.prototype.m_bias =  null;
b2DistanceJoint.prototype.m_impulse =  null;
b2DistanceJoint.prototype.m_mass =  null;
b2DistanceJoint.prototype.m_length =  null;
b2DistanceJoint.prototype.InitVelocityConstraints = function (step) {
		
		var tMat;
		var tX;
		
		this.m_inv_dt = step.inv_dt;

		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		
		this.m_u.x = b2.m_sweep.c.x + r2X - b1.m_sweep.c.x - r1X;
		this.m_u.y = b2.m_sweep.c.y + r2Y - b1.m_sweep.c.y - r1Y;
		
		
		
		var length = Math.sqrt(this.m_u.x*this.m_u.x + this.m_u.y*this.m_u.y);
		if (length > b2Settings.b2_linearSlop)
		{
			
			this.m_u.Multiply( 1.0 / length );
		}
		else
		{
			this.m_u.SetZero();
		}
		
		
		var cr1u = (r1X * this.m_u.y - r1Y * this.m_u.x);
		
		var cr2u = (r2X * this.m_u.y - r2Y * this.m_u.x);
		
		var invMass = b1.m_invMass + b1.m_invI * cr1u * cr1u + b2.m_invMass + b2.m_invI * cr2u * cr2u;
		
		this.m_mass = 1.0 / invMass;
		
		if (this.m_frequencyHz > 0.0)
		{
			var C = length - this.m_length;
	
			
			var omega = 2.0 * Math.PI * this.m_frequencyHz;
	
			
			var d = 2.0 * this.m_mass * this.m_dampingRatio * omega;
	
			
			var k = this.m_mass * omega * omega;
	
			
			this.m_gamma = 1.0 / (step.dt * (d + step.dt * k));
			this.m_bias = C * step.dt * k * this.m_gamma;
	
			this.m_mass = 1.0 / (invMass + this.m_gamma);
		}
		
		if (step.warmStarting)
		{
			this.m_impulse *= step.dtRatio;
			
			var PX = this.m_impulse * this.m_u.x;
			var PY = this.m_impulse * this.m_u.y;
			
			b1.m_linearVelocity.x -= b1.m_invMass * PX;
			b1.m_linearVelocity.y -= b1.m_invMass * PY;
			
			b1.m_angularVelocity -= b1.m_invI * (r1X * PY - r1Y * PX);
			
			b2.m_linearVelocity.x += b2.m_invMass * PX;
			b2.m_linearVelocity.y += b2.m_invMass * PY;
			
			b2.m_angularVelocity += b2.m_invI * (r2X * PY - r2Y * PX);
		}
		else
		{
			this.m_impulse = 0.0;
		}
	}
b2DistanceJoint.prototype.SolveVelocityConstraints = function (step) {
		
		var tMat;
		
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		var tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		
		
		var v1X = b1.m_linearVelocity.x + (-b1.m_angularVelocity * r1Y);
		var v1Y = b1.m_linearVelocity.y + (b1.m_angularVelocity * r1X);
		
		var v2X = b2.m_linearVelocity.x + (-b2.m_angularVelocity * r2Y);
		var v2Y = b2.m_linearVelocity.y + (b2.m_angularVelocity * r2X);
		
		var Cdot = (this.m_u.x * (v2X - v1X) + this.m_u.y * (v2Y - v1Y));
		
		var impulse = -this.m_mass * (Cdot + this.m_bias + this.m_gamma * this.m_impulse);
		this.m_impulse += impulse;
		
		
		var PX = impulse * this.m_u.x;
		var PY = impulse * this.m_u.y;
		
		b1.m_linearVelocity.x -= b1.m_invMass * PX;
		b1.m_linearVelocity.y -= b1.m_invMass * PY;
		
		b1.m_angularVelocity -= b1.m_invI * (r1X * PY - r1Y * PX);
		
		b2.m_linearVelocity.x += b2.m_invMass * PX;
		b2.m_linearVelocity.y += b2.m_invMass * PY;
		
		b2.m_angularVelocity += b2.m_invI * (r2X * PY - r2Y * PX);
	}
b2DistanceJoint.prototype.SolvePositionConstraints = function () {
		
		var tMat;
		
		if (this.m_frequencyHz > 0.0)
		{
			return true;
		}
		
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		var tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		
		var dX = b2.m_sweep.c.x + r2X - b1.m_sweep.c.x - r1X;
		var dY = b2.m_sweep.c.y + r2Y - b1.m_sweep.c.y - r1Y;
		
		
		var length = Math.sqrt(dX*dX + dY*dY);
		dX /= length;
		dY /= length;
		
		var C = length - this.m_length;
		C = b2Math.b2Clamp(C, -b2Settings.b2_maxLinearCorrection, b2Settings.b2_maxLinearCorrection);
		
		var impulse = -this.m_mass * C;
		
		this.m_u.Set(dX, dY);
		
		var PX = impulse * this.m_u.x;
		var PY = impulse * this.m_u.y;
		
		
		b1.m_sweep.c.x -= b1.m_invMass * PX;
		b1.m_sweep.c.y -= b1.m_invMass * PY;
		
		b1.m_sweep.a -= b1.m_invI * (r1X * PY - r1Y * PX);
		
		b2.m_sweep.c.x += b2.m_invMass * PX;
		b2.m_sweep.c.y += b2.m_invMass * PY;
		
		b2.m_sweep.a += b2.m_invI * (r2X * PY - r2Y * PX);
		
		b1.SynchronizeTransform();
		b2.SynchronizeTransform();
		
		return b2Math.b2Abs(C) < b2Settings.b2_linearSlop;
		
	}
b2DistanceJoint.prototype.GetAnchor1 = function () {
		return this.m_body1.GetWorldPoint(this.m_localAnchor1);
	}
b2DistanceJoint.prototype.GetAnchor2 = function () {
		return this.m_body2.GetWorldPoint(this.m_localAnchor2);
	}
b2DistanceJoint.prototype.GetReactionForce = function () {
		
		var F = new b2Vec2();
		F.SetV(this.m_u);
		F.Multiply(this.m_inv_dt * this.m_impulse);
		return F;
	}
b2DistanceJoint.prototype.GetReactionTorque = function () {
		
		return 0.0;
	}
exports.b2DistanceJoint = b2DistanceJoint;
	
	
var b2MouseJoint = function() {
b2Joint.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2MouseJoint.prototype, b2Joint.prototype)
b2MouseJoint.prototype._super = function(){ b2Joint.prototype.__constructor.apply(this, arguments) }
b2MouseJoint.prototype.__constructor = function (def) {
		this._super(def);
		
		this.m_target.SetV(def.target);
		
		var tX = this.m_target.x - this.m_body2.m_xf.position.x;
		var tY = this.m_target.y - this.m_body2.m_xf.position.y;
		var tMat = this.m_body2.m_xf.R;
		this.m_localAnchor.x = (tX * tMat.col1.x + tY * tMat.col1.y);
		this.m_localAnchor.y = (tX * tMat.col2.x + tY * tMat.col2.y);
		
		this.m_maxForce = def.maxForce;
		this.m_impulse.SetZero();
		
		var mass = this.m_body2.m_mass;
		
		
		var omega = 2.0 * b2Settings.b2_pi * def.frequencyHz;
		
		
		var d = 2.0 * mass * def.dampingRatio * omega;
		
		
		var k = (def.timeStep * mass) * (omega * omega);
		
		
		
		this.m_gamma = 1.0 / (d + k);
		this.m_beta = k / (d + k);
	}
b2MouseJoint.prototype.__varz = function(){
this.K =  new b2Mat22();
this.K1 =  new b2Mat22();
this.K2 =  new b2Mat22();
this.m_localAnchor =  new b2Vec2();
this.m_target =  new b2Vec2();
this.m_impulse =  new b2Vec2();
this.m_mass =  new b2Mat22();
this.m_C =  new b2Vec2();
}
b2MouseJoint.prototype.K =  new b2Mat22();
b2MouseJoint.prototype.K1 =  new b2Mat22();
b2MouseJoint.prototype.K2 =  new b2Mat22();
b2MouseJoint.prototype.m_localAnchor =  new b2Vec2();
b2MouseJoint.prototype.m_target =  new b2Vec2();
b2MouseJoint.prototype.m_impulse =  new b2Vec2();
b2MouseJoint.prototype.m_mass =  new b2Mat22();
b2MouseJoint.prototype.m_C =  new b2Vec2();
b2MouseJoint.prototype.m_maxForce =  null;
b2MouseJoint.prototype.m_beta =  null;
b2MouseJoint.prototype.m_gamma =  null;
b2MouseJoint.prototype.GetAnchor1 = function () {
		return this.m_target;
	}
b2MouseJoint.prototype.GetAnchor2 = function () {
		return this.m_body2.GetWorldPoint(this.m_localAnchor);
	}
b2MouseJoint.prototype.GetReactionForce = function () {
		return this.m_impulse;
	}
b2MouseJoint.prototype.GetReactionTorque = function () {
		return 0.0;
	}
b2MouseJoint.prototype.SetTarget = function (target) {
		if (this.m_body2.IsSleeping()){
			this.m_body2.WakeUp();
		}
		this.m_target = target;
	}
b2MouseJoint.prototype.InitVelocityConstraints = function (step) {
		var b = this.m_body2;
		
		var tMat;
		
		
		
		tMat = b.m_xf.R;
		var rX = this.m_localAnchor.x - b.m_sweep.localCenter.x;
		var rY = this.m_localAnchor.y - b.m_sweep.localCenter.y;
		var tX = (tMat.col1.x * rX + tMat.col2.x * rY);
		rY = (tMat.col1.y * rX + tMat.col2.y * rY);
		rX = tX;
		
		
		
		
		var invMass = b.m_invMass;
		var invI = b.m_invI;
		
		
		this.K1.col1.x = invMass;	this.K1.col2.x = 0.0;
		this.K1.col1.y = 0.0;		this.K1.col2.y = invMass;
		
		
		this.K2.col1.x = invI * rY * rY;	this.K2.col2.x = -invI * rX * rY;
		this.K2.col1.y = -invI * rX * rY;	this.K2.col2.y = invI * rX * rX;
		
		
		this.K.SetM(this.K1);
		this.K.AddM(this.K2);
		this.K.col1.x += this.m_gamma;
		this.K.col2.y += this.m_gamma;
		
		
		this.K.Invert(this.m_mass);
		
		
		this.m_C.x = b.m_sweep.c.x + rX - this.m_target.x;
		this.m_C.y = b.m_sweep.c.y + rY - this.m_target.y;
		
		
		b.m_angularVelocity *= 0.98;
		
		
		
		var PX = step.dt * this.m_impulse.x;
		var PY = step.dt * this.m_impulse.y;
		
		b.m_linearVelocity.x += invMass * PX;
		b.m_linearVelocity.y += invMass * PY;
		
		b.m_angularVelocity += invI * (rX * PY - rY * PX);
	}
b2MouseJoint.prototype.SolveVelocityConstraints = function (step) {
		var b = this.m_body2;
		
		var tMat;
		var tX;
		var tY;
		
		
		
		tMat = b.m_xf.R;
		var rX = this.m_localAnchor.x - b.m_sweep.localCenter.x;
		var rY = this.m_localAnchor.y - b.m_sweep.localCenter.y;
		tX = (tMat.col1.x * rX + tMat.col2.x * rY);
		rY = (tMat.col1.y * rX + tMat.col2.y * rY);
		rX = tX;
		
		
		
		var CdotX = b.m_linearVelocity.x + (-b.m_angularVelocity * rY);
		var CdotY = b.m_linearVelocity.y + (b.m_angularVelocity * rX);
		
		tMat = this.m_mass;
		tX = CdotX + (this.m_beta * step.inv_dt) * this.m_C.x + this.m_gamma * step.dt * this.m_impulse.x;
		tY = CdotY + (this.m_beta * step.inv_dt) * this.m_C.y + this.m_gamma * step.dt * this.m_impulse.y;
		var forceX = -step.inv_dt * (tMat.col1.x * tX + tMat.col2.x * tY);
		var forceY = -step.inv_dt * (tMat.col1.y * tX + tMat.col2.y * tY);
		
		var oldForceX = this.m_impulse.x;
		var oldForceY = this.m_impulse.y;
		
		this.m_impulse.x += forceX;
		this.m_impulse.y += forceY;
		var forceMagnitude = this.m_impulse.Length();
		if (forceMagnitude > this.m_maxForce)
		{
			
			this.m_impulse.Multiply(this.m_maxForce / forceMagnitude);
		}
		
		forceX = this.m_impulse.x - oldForceX;
		forceY = this.m_impulse.y - oldForceY;
		
		
		var PX = step.dt * forceX;
		var PY = step.dt * forceY;
		
		b.m_linearVelocity.x += b.m_invMass * PX;
		b.m_linearVelocity.y += b.m_invMass * PY;
		
		b.m_angularVelocity += b.m_invI * (rX * PY - rY * PX);
	}
b2MouseJoint.prototype.SolvePositionConstraints = function () { 
		return true; 
	}
exports.b2MouseJoint = b2MouseJoint;


var b2PulleyJoint = function() {
b2Joint.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2PulleyJoint.prototype, b2Joint.prototype)
b2PulleyJoint.prototype._super = function(){ b2Joint.prototype.__constructor.apply(this, arguments) }
b2PulleyJoint.prototype.__constructor = function (def) {
		
		
		this._super(def);
		
		var tMat;
		var tX;
		var tY;
		
		this.m_ground = this.m_body1.m_world.m_groundBody;
		
		this.m_groundAnchor1.x = def.groundAnchor1.x - this.m_ground.m_xf.position.x;
		this.m_groundAnchor1.y = def.groundAnchor1.y - this.m_ground.m_xf.position.y;
		
		this.m_groundAnchor2.x = def.groundAnchor2.x - this.m_ground.m_xf.position.x;
		this.m_groundAnchor2.y = def.groundAnchor2.y - this.m_ground.m_xf.position.y;
		
		this.m_localAnchor1.SetV(def.localAnchor1);
		
		this.m_localAnchor2.SetV(def.localAnchor2);
		
		
		this.m_ratio = def.ratio;
		
		this.m_constant = def.length1 + this.m_ratio * def.length2;
		
		this.m_maxLength1 = b2Math.b2Min(def.maxLength1, this.m_constant - this.m_ratio * b2PulleyJoint.b2_minPulleyLength);
		this.m_maxLength2 = b2Math.b2Min(def.maxLength2, (this.m_constant - b2PulleyJoint.b2_minPulleyLength) / this.m_ratio);
		
		this.m_force = 0.0;
		this.m_limitForce1 = 0.0;
		this.m_limitForce2 = 0.0;
		
	}
b2PulleyJoint.prototype.__varz = function(){
this.m_groundAnchor1 =  new b2Vec2();
this.m_groundAnchor2 =  new b2Vec2();
this.m_localAnchor1 =  new b2Vec2();
this.m_localAnchor2 =  new b2Vec2();
this.m_u1 =  new b2Vec2();
this.m_u2 =  new b2Vec2();
}
b2PulleyJoint.b2_minPulleyLength =  2.0;
b2PulleyJoint.prototype.m_ground =  null;
b2PulleyJoint.prototype.m_groundAnchor1 =  new b2Vec2();
b2PulleyJoint.prototype.m_groundAnchor2 =  new b2Vec2();
b2PulleyJoint.prototype.m_localAnchor1 =  new b2Vec2();
b2PulleyJoint.prototype.m_localAnchor2 =  new b2Vec2();
b2PulleyJoint.prototype.m_u1 =  new b2Vec2();
b2PulleyJoint.prototype.m_u2 =  new b2Vec2();
b2PulleyJoint.prototype.m_constant =  null;
b2PulleyJoint.prototype.m_ratio =  null;
b2PulleyJoint.prototype.m_maxLength1 =  null;
b2PulleyJoint.prototype.m_maxLength2 =  null;
b2PulleyJoint.prototype.m_pulleyMass =  null;
b2PulleyJoint.prototype.m_limitMass1 =  null;
b2PulleyJoint.prototype.m_limitMass2 =  null;
b2PulleyJoint.prototype.m_force =  null;
b2PulleyJoint.prototype.m_limitForce1 =  null;
b2PulleyJoint.prototype.m_limitForce2 =  null;
b2PulleyJoint.prototype.m_positionImpulse =  null;
b2PulleyJoint.prototype.m_limitPositionImpulse1 =  null;
b2PulleyJoint.prototype.m_limitPositionImpulse2 =  null;
b2PulleyJoint.prototype.m_state =  0;
b2PulleyJoint.prototype.m_limitState1 =  0;
b2PulleyJoint.prototype.m_limitState2 =  0;
b2PulleyJoint.prototype.GetAnchor1 = function () {
		return this.m_body1.GetWorldPoint(this.m_localAnchor1);
	}
b2PulleyJoint.prototype.GetAnchor2 = function () {
		return this.m_body2.GetWorldPoint(this.m_localAnchor2);
	}
b2PulleyJoint.prototype.GetReactionForce = function () {
		
		var F = this.m_u2.Copy();
		F.Multiply(this.m_force);
		return F;
	}
b2PulleyJoint.prototype.GetReactionTorque = function () {
		return 0.0;
	}
b2PulleyJoint.prototype.GetGroundAnchor1 = function () {
		
		var a = this.m_ground.m_xf.position.Copy();
		a.Add(this.m_groundAnchor1);
		return a;
	}
b2PulleyJoint.prototype.GetGroundAnchor2 = function () {
		
		var a = this.m_ground.m_xf.position.Copy();
		a.Add(this.m_groundAnchor2);
		return a;
	}
b2PulleyJoint.prototype.GetLength1 = function () {
		var p = this.m_body1.GetWorldPoint(this.m_localAnchor1);
		
		var sX = this.m_ground.m_xf.position.x + this.m_groundAnchor1.x;
		var sY = this.m_ground.m_xf.position.y + this.m_groundAnchor1.y;
		
		var dX = p.x - sX;
		var dY = p.y - sY;
		
		return Math.sqrt(dX*dX + dY*dY);
	}
b2PulleyJoint.prototype.GetLength2 = function () {
		var p = this.m_body2.GetWorldPoint(this.m_localAnchor2);
		
		var sX = this.m_ground.m_xf.position.x + this.m_groundAnchor2.x;
		var sY = this.m_ground.m_xf.position.y + this.m_groundAnchor2.y;
		
		var dX = p.x - sX;
		var dY = p.y - sY;
		
		return Math.sqrt(dX*dX + dY*dY);
	}
b2PulleyJoint.prototype.GetRatio = function () {
		return this.m_ratio;
	}
b2PulleyJoint.prototype.InitVelocityConstraints = function (step) {
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var tMat;
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		var tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		
		var p1X = b1.m_sweep.c.x + r1X;
		var p1Y = b1.m_sweep.c.y + r1Y;
		
		var p2X = b2.m_sweep.c.x + r2X;
		var p2Y = b2.m_sweep.c.y + r2Y;
		
		
		var s1X = this.m_ground.m_xf.position.x + this.m_groundAnchor1.x;
		var s1Y = this.m_ground.m_xf.position.y + this.m_groundAnchor1.y;
		
		var s2X = this.m_ground.m_xf.position.x + this.m_groundAnchor2.x;
		var s2Y = this.m_ground.m_xf.position.y + this.m_groundAnchor2.y;
		
		
		
		this.m_u1.Set(p1X - s1X, p1Y - s1Y);
		
		this.m_u2.Set(p2X - s2X, p2Y - s2Y);
		
		var length1 = this.m_u1.Length();
		var length2 = this.m_u2.Length();
		
		if (length1 > b2Settings.b2_linearSlop)
		{
			
			this.m_u1.Multiply(1.0 / length1);
		}
		else
		{
			this.m_u1.SetZero();
		}
		
		if (length2 > b2Settings.b2_linearSlop)
		{
			
			this.m_u2.Multiply(1.0 / length2);
		}
		else
		{
			this.m_u2.SetZero();
		}
		
		var C = this.m_constant - length1 - this.m_ratio * length2;
		if (C > 0.0)
		{
			this.m_state = b2Joint.e_inactiveLimit;
			this.m_force = 0.0;
		}
		else
		{
			this.m_state = b2Joint.e_atUpperLimit;
			this.m_positionImpulse = 0.0;
		}
		
		if (length1 < this.m_maxLength1)
		{
			this.m_limitState1 = b2Joint.e_inactiveLimit;
			this.m_limitForce1 = 0.0;
		}
		else
		{
			this.m_limitState1 = b2Joint.e_atUpperLimit;
			this.m_limitPositionImpulse1 = 0.0;
		}
		
		if (length2 < this.m_maxLength2)
		{
			this.m_limitState2 = b2Joint.e_inactiveLimit;
			this.m_limitForce2 = 0.0;
		}
		else
		{
			this.m_limitState2 = b2Joint.e_atUpperLimit;
			this.m_limitPositionImpulse2 = 0.0;
		}
		
		
		
		var cr1u1 = r1X * this.m_u1.y - r1Y * this.m_u1.x;
		
		var cr2u2 = r2X * this.m_u2.y - r2Y * this.m_u2.x;
		
		this.m_limitMass1 = b1.m_invMass + b1.m_invI * cr1u1 * cr1u1;
		this.m_limitMass2 = b2.m_invMass + b2.m_invI * cr2u2 * cr2u2;
		this.m_pulleyMass = this.m_limitMass1 + this.m_ratio * this.m_ratio * this.m_limitMass2;
		
		
		
		this.m_limitMass1 = 1.0 / this.m_limitMass1;
		this.m_limitMass2 = 1.0 / this.m_limitMass2;
		this.m_pulleyMass = 1.0 / this.m_pulleyMass;
		
		if (step.warmStarting)
		{
			
			
			
			var P1X = step.dt * (-this.m_force - this.m_limitForce1) * this.m_u1.x;
			var P1Y = step.dt * (-this.m_force - this.m_limitForce1) * this.m_u1.y;
			
			
			var P2X = step.dt * (-this.m_ratio * this.m_force - this.m_limitForce2) * this.m_u2.x;
			var P2Y = step.dt * (-this.m_ratio * this.m_force - this.m_limitForce2) * this.m_u2.y;
			
			b1.m_linearVelocity.x += b1.m_invMass * P1X;
			b1.m_linearVelocity.y += b1.m_invMass * P1Y;
			
			b1.m_angularVelocity += b1.m_invI * (r1X * P1Y - r1Y * P1X);
			
			b2.m_linearVelocity.x += b2.m_invMass * P2X;
			b2.m_linearVelocity.y += b2.m_invMass * P2Y;
			
			b2.m_angularVelocity += b2.m_invI * (r2X * P2Y - r2Y * P2X);
		}
		else
		{
			this.m_force = 0.0;
			this.m_limitForce1 = 0.0;
			this.m_limitForce2 = 0.0;
		}
	}
b2PulleyJoint.prototype.SolveVelocityConstraints = function (step) {
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var tMat;
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		var tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		
		var v1X;
		var v1Y;
		var v2X;
		var v2Y;
		var P1X;
		var P1Y;
		var P2X;
		var P2Y;
		var Cdot;
		var force;
		var oldForce;
		
		if (this.m_state == b2Joint.e_atUpperLimit)
		{
			
			v1X = b1.m_linearVelocity.x + (-b1.m_angularVelocity * r1Y);
			v1Y = b1.m_linearVelocity.y + (b1.m_angularVelocity * r1X);
			
			v2X = b2.m_linearVelocity.x + (-b2.m_angularVelocity * r2Y);
			v2Y = b2.m_linearVelocity.y + (b2.m_angularVelocity * r2X);
			
			
			Cdot = -(this.m_u1.x * v1X + this.m_u1.y * v1Y) - this.m_ratio * (this.m_u2.x * v2X + this.m_u2.y * v2Y);
			force = -step.inv_dt * this.m_pulleyMass * Cdot;
			oldForce = this.m_force;
			this.m_force = b2Math.b2Max(0.0, this.m_force + force);
			force = this.m_force - oldForce;
			
			
			P1X = -step.dt * force * this.m_u1.x;
			P1Y = -step.dt * force * this.m_u1.y;
			
			P2X = -step.dt * this.m_ratio * force * this.m_u2.x;
			P2Y = -step.dt * this.m_ratio * force * this.m_u2.y;
			
			b1.m_linearVelocity.x += b1.m_invMass * P1X;
			b1.m_linearVelocity.y += b1.m_invMass * P1Y;
			
			b1.m_angularVelocity += b1.m_invI * (r1X * P1Y - r1Y * P1X);
			
			b2.m_linearVelocity.x += b2.m_invMass * P2X;
			b2.m_linearVelocity.y += b2.m_invMass * P2Y;
			
			b2.m_angularVelocity += b2.m_invI * (r2X * P2Y - r2Y * P2X);
		}
		
		if (this.m_limitState1 == b2Joint.e_atUpperLimit)
		{
			
			v1X = b1.m_linearVelocity.x + (-b1.m_angularVelocity * r1Y);
			v1Y = b1.m_linearVelocity.y + (b1.m_angularVelocity * r1X);
			
			
			Cdot = -(this.m_u1.x * v1X + this.m_u1.y * v1Y);
			force = -step.inv_dt * this.m_limitMass1 * Cdot;
			oldForce = this.m_limitForce1;
			this.m_limitForce1 = b2Math.b2Max(0.0, this.m_limitForce1 + force);
			force = this.m_limitForce1 - oldForce;
			
			
			P1X = -step.dt * force * this.m_u1.x;
			P1Y = -step.dt * force * this.m_u1.y;
			
			b1.m_linearVelocity.x += b1.m_invMass * P1X;
			b1.m_linearVelocity.y += b1.m_invMass * P1Y;
			
			b1.m_angularVelocity += b1.m_invI * (r1X * P1Y - r1Y * P1X);
		}
		
		if (this.m_limitState2 == b2Joint.e_atUpperLimit)
		{
			
			v2X = b2.m_linearVelocity.x + (-b2.m_angularVelocity * r2Y);
			v2Y = b2.m_linearVelocity.y + (b2.m_angularVelocity * r2X);
			
			
			Cdot = -(this.m_u2.x * v2X + this.m_u2.y * v2Y);
			force = -step.inv_dt * this.m_limitMass2 * Cdot;
			oldForce = this.m_limitForce2;
			this.m_limitForce2 = b2Math.b2Max(0.0, this.m_limitForce2 + force);
			force = this.m_limitForce2 - oldForce;
			
			
			P2X = -step.dt * force * this.m_u2.x;
			P2Y = -step.dt * force * this.m_u2.y;
			
			b2.m_linearVelocity.x += b2.m_invMass * P2X;
			b2.m_linearVelocity.y += b2.m_invMass * P2Y;
			
			b2.m_angularVelocity += b2.m_invI * (r2X * P2Y - r2Y * P2X);
		}
	}
b2PulleyJoint.prototype.SolvePositionConstraints = function () {
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var tMat;
		
		
		var s1X = this.m_ground.m_xf.position.x + this.m_groundAnchor1.x;
		var s1Y = this.m_ground.m_xf.position.y + this.m_groundAnchor1.y;
		
		var s2X = this.m_ground.m_xf.position.x + this.m_groundAnchor2.x;
		var s2Y = this.m_ground.m_xf.position.y + this.m_groundAnchor2.y;
		
		
		var r1X;
		var r1Y;
		var r2X;
		var r2Y;
		var p1X;
		var p1Y;
		var p2X;
		var p2Y;
		var length1;
		var length2;
		var C;
		var impulse;
		var oldImpulse;
		var oldLimitPositionImpulse;
		
		var tX;
		
		var linearError = 0.0;
		
		if (this.m_state == b2Joint.e_atUpperLimit)
		{
			
			tMat = b1.m_xf.R;
			r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
			r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
			tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
			r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
			r1X = tX;
			
			tMat = b2.m_xf.R;
			r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
			r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
			tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
			r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
			r2X = tX;
			
			
			p1X = b1.m_sweep.c.x + r1X;
			p1Y = b1.m_sweep.c.y + r1Y;
			
			p2X = b2.m_sweep.c.x + r2X;
			p2Y = b2.m_sweep.c.y + r2Y;
			
			
			
			this.m_u1.Set(p1X - s1X, p1Y - s1Y);
			
			this.m_u2.Set(p2X - s2X, p2Y - s2Y);
			
			length1 = this.m_u1.Length();
			length2 = this.m_u2.Length();
			
			if (length1 > b2Settings.b2_linearSlop)
			{
				
				this.m_u1.Multiply( 1.0 / length1 );
			}
			else
			{
				this.m_u1.SetZero();
			}
			
			if (length2 > b2Settings.b2_linearSlop)
			{
				
				this.m_u2.Multiply( 1.0 / length2 );
			}
			else
			{
				this.m_u2.SetZero();
			}
			
			C = this.m_constant - length1 - this.m_ratio * length2;
			linearError = b2Math.b2Max(linearError, -C);
			C = b2Math.b2Clamp(C + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0.0);
			impulse = -this.m_pulleyMass * C;
			
			oldImpulse = this.m_positionImpulse;
			this.m_positionImpulse = b2Math.b2Max(0.0, this.m_positionImpulse + impulse);
			impulse = this.m_positionImpulse - oldImpulse;
			
			p1X = -impulse * this.m_u1.x;
			p1Y = -impulse * this.m_u1.y;
			p2X = -this.m_ratio * impulse * this.m_u2.x;
			p2Y = -this.m_ratio * impulse * this.m_u2.y;
			
			b1.m_sweep.c.x += b1.m_invMass * p1X;
			b1.m_sweep.c.y += b1.m_invMass * p1Y;
			b1.m_sweep.a += b1.m_invI * (r1X * p1Y - r1Y * p1X);
			b2.m_sweep.c.x += b2.m_invMass * p2X;
			b2.m_sweep.c.y += b2.m_invMass * p2Y;
			b2.m_sweep.a += b2.m_invI * (r2X * p2Y - r2Y * p2X);
			
			b1.SynchronizeTransform();
			b2.SynchronizeTransform();
		}
		
		if (this.m_limitState1 == b2Joint.e_atUpperLimit)
		{
			
			tMat = b1.m_xf.R;
			r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
			r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
			tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
			r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
			r1X = tX;
			
			p1X = b1.m_sweep.c.x + r1X;
			p1Y = b1.m_sweep.c.y + r1Y;
			
			
			this.m_u1.Set(p1X - s1X, p1Y - s1Y);
			
			length1 = this.m_u1.Length();
			
			if (length1 > b2Settings.b2_linearSlop)
			{
				
				this.m_u1.x *= 1.0 / length1;
				this.m_u1.y *= 1.0 / length1;
			}
			else
			{
				this.m_u1.SetZero();
			}
			
			C = this.m_maxLength1 - length1;
			linearError = b2Math.b2Max(linearError, -C);
			C = b2Math.b2Clamp(C + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0.0);
			impulse = -this.m_limitMass1 * C;
			oldLimitPositionImpulse = this.m_limitPositionImpulse1;
			this.m_limitPositionImpulse1 = b2Math.b2Max(0.0, this.m_limitPositionImpulse1 + impulse);
			impulse = this.m_limitPositionImpulse1 - oldLimitPositionImpulse;
			
			
			p1X = -impulse * this.m_u1.x;
			p1Y = -impulse * this.m_u1.y;
			
			b1.m_sweep.c.x += b1.m_invMass * p1X;
			b1.m_sweep.c.y += b1.m_invMass * p1Y;
			
			b1.m_sweep.a += b1.m_invI * (r1X * p1Y - r1Y * p1X);
			
			b1.SynchronizeTransform();
		}
		
		if (this.m_limitState2 == b2Joint.e_atUpperLimit)
		{
			
			tMat = b2.m_xf.R;
			r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
			r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
			tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
			r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
			r2X = tX;
			
			p2X = b2.m_sweep.c.x + r2X;
			p2Y = b2.m_sweep.c.y + r2Y;
			
			
			this.m_u2.Set(p2X - s2X, p2Y - s2Y);
			
			length2 = this.m_u2.Length();
			
			if (length2 > b2Settings.b2_linearSlop)
			{
				
				this.m_u2.x *= 1.0 / length2;
				this.m_u2.y *= 1.0 / length2;
			}
			else
			{
				this.m_u2.SetZero();
			}
			
			C = this.m_maxLength2 - length2;
			linearError = b2Math.b2Max(linearError, -C);
			C = b2Math.b2Clamp(C + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0.0);
			impulse = -this.m_limitMass2 * C;
			oldLimitPositionImpulse = this.m_limitPositionImpulse2;
			this.m_limitPositionImpulse2 = b2Math.b2Max(0.0, this.m_limitPositionImpulse2 + impulse);
			impulse = this.m_limitPositionImpulse2 - oldLimitPositionImpulse;
			
			
			p2X = -impulse * this.m_u2.x;
			p2Y = -impulse * this.m_u2.y;
			
			
			b2.m_sweep.c.x += b2.m_invMass * p2X;
			b2.m_sweep.c.y += b2.m_invMass * p2Y;
			
			b2.m_sweep.a += b2.m_invI * (r2X * p2Y - r2Y * p2X);
			
			b2.SynchronizeTransform();
		}
		
		return linearError < b2Settings.b2_linearSlop;
	}
exports.b2PulleyJoint = b2PulleyJoint;


var b2RevoluteJoint = function() {
b2Joint.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2RevoluteJoint.prototype, b2Joint.prototype)
b2RevoluteJoint.prototype._super = function(){ b2Joint.prototype.__constructor.apply(this, arguments) }
b2RevoluteJoint.prototype.__constructor = function (def) {
		this._super(def);
		
		
		this.m_localAnchor1.SetV(def.localAnchor1);
		
		this.m_localAnchor2.SetV(def.localAnchor2);
		
		this.m_referenceAngle = def.referenceAngle;
		
		this.m_pivotForce.Set(0.0, 0.0);
		this.m_motorForce = 0.0;
		this.m_limitForce = 0.0;
		this.m_limitPositionImpulse = 0.0;
		
		this.m_lowerAngle = def.lowerAngle;
		this.m_upperAngle = def.upperAngle;
		this.m_maxMotorTorque = def.maxMotorTorque;
		this.m_motorSpeed = def.motorSpeed;
		this.m_enableLimit = def.enableLimit;
		this.m_enableMotor = def.enableMotor;
	}
b2RevoluteJoint.prototype.__varz = function(){
this.K =  new b2Mat22();
this.K1 =  new b2Mat22();
this.K2 =  new b2Mat22();
this.K3 =  new b2Mat22();
this.m_localAnchor1 =  new b2Vec2();
this.m_localAnchor2 =  new b2Vec2();
this.m_pivotForce =  new b2Vec2();
this.m_pivotMass =  new b2Mat22();
}
b2RevoluteJoint.tImpulse =  new b2Vec2();
b2RevoluteJoint.prototype.K =  new b2Mat22();
b2RevoluteJoint.prototype.K1 =  new b2Mat22();
b2RevoluteJoint.prototype.K2 =  new b2Mat22();
b2RevoluteJoint.prototype.K3 =  new b2Mat22();
b2RevoluteJoint.prototype.m_localAnchor1 =  new b2Vec2();
b2RevoluteJoint.prototype.m_localAnchor2 =  new b2Vec2();
b2RevoluteJoint.prototype.m_pivotForce =  new b2Vec2();
b2RevoluteJoint.prototype.m_motorForce =  null;
b2RevoluteJoint.prototype.m_limitForce =  null;
b2RevoluteJoint.prototype.m_limitPositionImpulse =  null;
b2RevoluteJoint.prototype.m_pivotMass =  new b2Mat22();
b2RevoluteJoint.prototype.m_motorMass =  null;
b2RevoluteJoint.prototype.m_enableMotor =  null;
b2RevoluteJoint.prototype.m_maxMotorTorque =  null;
b2RevoluteJoint.prototype.m_motorSpeed =  null;
b2RevoluteJoint.prototype.m_enableLimit =  null;
b2RevoluteJoint.prototype.m_referenceAngle =  null;
b2RevoluteJoint.prototype.m_lowerAngle =  null;
b2RevoluteJoint.prototype.m_upperAngle =  null;
b2RevoluteJoint.prototype.m_limitState =  0;
b2RevoluteJoint.prototype.GetAnchor1 = function () {
		return this.m_body1.GetWorldPoint(this.m_localAnchor1);
	}
b2RevoluteJoint.prototype.GetAnchor2 = function () {
		return this.m_body2.GetWorldPoint(this.m_localAnchor2);
	}
b2RevoluteJoint.prototype.GetReactionForce = function () {
		return this.m_pivotForce;
	}
b2RevoluteJoint.prototype.GetReactionTorque = function () {
		return this.m_limitForce;
	}
b2RevoluteJoint.prototype.GetJointAngle = function () {
		
		
		return this.m_body2.m_sweep.a - this.m_body1.m_sweep.a - this.m_referenceAngle;
	}
b2RevoluteJoint.prototype.GetJointSpeed = function () {
		
		
		return this.m_body2.m_angularVelocity - this.m_body1.m_angularVelocity;
	}
b2RevoluteJoint.prototype.IsLimitEnabled = function () {
		return this.m_enableLimit;
	}
b2RevoluteJoint.prototype.EnableLimit = function (flag) {
		this.m_enableLimit = flag;
	}
b2RevoluteJoint.prototype.GetLowerLimit = function () {
		return this.m_lowerAngle;
	}
b2RevoluteJoint.prototype.GetUpperLimit = function () {
		return this.m_upperAngle;
	}
b2RevoluteJoint.prototype.SetLimits = function (lower, upper) {
		
		this.m_lowerAngle = lower;
		this.m_upperAngle = upper;
	}
b2RevoluteJoint.prototype.IsMotorEnabled = function () {
		return this.m_enableMotor;
	}
b2RevoluteJoint.prototype.EnableMotor = function (flag) {
		this.m_enableMotor = flag;
	}
b2RevoluteJoint.prototype.SetMotorSpeed = function (speed) {
		this.m_motorSpeed = speed;
	}
b2RevoluteJoint.prototype.GetMotorSpeed = function () {
		return this.m_motorSpeed;
	}
b2RevoluteJoint.prototype.SetMaxMotorTorque = function (torque) {
		this.m_maxMotorTorque = torque;
	}
b2RevoluteJoint.prototype.GetMotorTorque = function () {
		return this.m_motorForce;
	}
b2RevoluteJoint.prototype.InitVelocityConstraints = function (step) {
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var tMat;
		var tX;
		
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		
		
		
		var invMass1 = b1.m_invMass;
		var invMass2 = b2.m_invMass;
		var invI1 = b1.m_invI;
		var invI2 = b2.m_invI;
		
		
		this.K1.col1.x = invMass1 + invMass2;	this.K1.col2.x = 0.0;
		this.K1.col1.y = 0.0;					this.K1.col2.y = invMass1 + invMass2;
		
		
		this.K2.col1.x = invI1 * r1Y * r1Y;	this.K2.col2.x = -invI1 * r1X * r1Y;
		this.K2.col1.y = -invI1 * r1X * r1Y;	this.K2.col2.y = invI1 * r1X * r1X;
		
		
		this.K3.col1.x = invI2 * r2Y * r2Y;	this.K3.col2.x = -invI2 * r2X * r2Y;
		this.K3.col1.y = -invI2 * r2X * r2Y;	this.K3.col2.y = invI2 * r2X * r2X;
		
		
		this.K.SetM(this.K1);
		this.K.AddM(this.K2);
		this.K.AddM(this.K3);
		
		
		this.K.Invert(this.m_pivotMass);
		
		this.m_motorMass = 1.0 / (invI1 + invI2);
		
		if (this.m_enableMotor == false)
		{
			this.m_motorForce = 0.0;
		}
		
		if (this.m_enableLimit)
		{
			
			var jointAngle = b2.m_sweep.a - b1.m_sweep.a - this.m_referenceAngle;
			if (b2Math.b2Abs(this.m_upperAngle - this.m_lowerAngle) < 2.0 * b2Settings.b2_angularSlop)
			{
				this.m_limitState = b2Joint.e_equalLimits;
			}
			else if (jointAngle <= this.m_lowerAngle)
			{
				if (this.m_limitState != b2Joint.e_atLowerLimit)
				{
					this.m_limitForce = 0.0;
				}
				this.m_limitState = b2Joint.e_atLowerLimit;
			}
			else if (jointAngle >= this.m_upperAngle)
			{
				if (this.m_limitState != b2Joint.e_atUpperLimit)
				{
					this.m_limitForce = 0.0;
				}
				this.m_limitState = b2Joint.e_atUpperLimit;
			}
			else
			{
				this.m_limitState = b2Joint.e_inactiveLimit;
				this.m_limitForce = 0.0;
			}
		}
		else
		{
			this.m_limitForce = 0.0;
		}
		
		
		if (step.warmStarting)
		{
			
			b1.m_linearVelocity.x -= step.dt * invMass1 * this.m_pivotForce.x;
			b1.m_linearVelocity.y -= step.dt * invMass1 * this.m_pivotForce.y;
			
			b1.m_angularVelocity -= step.dt * invI1 * ((r1X * this.m_pivotForce.y - r1Y * this.m_pivotForce.x) + this.m_motorForce + this.m_limitForce);
			
			
			b2.m_linearVelocity.x += step.dt * invMass2 * this.m_pivotForce.x;
			b2.m_linearVelocity.y += step.dt * invMass2 * this.m_pivotForce.y;
			
			b2.m_angularVelocity += step.dt * invI2 * ((r2X * this.m_pivotForce.y - r2Y * this.m_pivotForce.x) + this.m_motorForce + this.m_limitForce);
		}
		else{
			this.m_pivotForce.SetZero();
			this.m_motorForce = 0.0;
			this.m_limitForce = 0.0;
		}
		
		this.m_limitPositionImpulse = 0.0;
	}
b2RevoluteJoint.prototype.SolveVelocityConstraints = function (step) {
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var tMat;
		var tX;
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		var oldLimitForce;
		
		
		
		var pivotCdotX = b2.m_linearVelocity.x + (-b2.m_angularVelocity * r2Y) - b1.m_linearVelocity.x - (-b1.m_angularVelocity * r1Y);
		var pivotCdotY = b2.m_linearVelocity.y + (b2.m_angularVelocity * r2X) - b1.m_linearVelocity.y - (b1.m_angularVelocity * r1X);
		
		
		var pivotForceX = -step.inv_dt * (this.m_pivotMass.col1.x * pivotCdotX + this.m_pivotMass.col2.x * pivotCdotY);
		var pivotForceY = -step.inv_dt * (this.m_pivotMass.col1.y * pivotCdotX + this.m_pivotMass.col2.y * pivotCdotY);
		this.m_pivotForce.x += pivotForceX;
		this.m_pivotForce.y += pivotForceY;
		
		
		var PX = step.dt * pivotForceX;
		var PY = step.dt * pivotForceY;
		
		
		b1.m_linearVelocity.x -= b1.m_invMass * PX;
		b1.m_linearVelocity.y -= b1.m_invMass * PY;
		
		b1.m_angularVelocity -= b1.m_invI * (r1X * PY - r1Y * PX);
		
		
		b2.m_linearVelocity.x += b2.m_invMass * PX;
		b2.m_linearVelocity.y += b2.m_invMass * PY;
		
		b2.m_angularVelocity += b2.m_invI * (r2X * PY - r2Y * PX);
		
		if (this.m_enableMotor && this.m_limitState != b2Joint.e_equalLimits)
		{
			var motorCdot = b2.m_angularVelocity - b1.m_angularVelocity - this.m_motorSpeed;
			var motorForce = -step.inv_dt * this.m_motorMass * motorCdot;
			var oldMotorForce = this.m_motorForce;
			this.m_motorForce = b2Math.b2Clamp(this.m_motorForce + motorForce, -this.m_maxMotorTorque, this.m_maxMotorTorque);
			motorForce = this.m_motorForce - oldMotorForce;
			
			b1.m_angularVelocity -= b1.m_invI * step.dt * motorForce;
			b2.m_angularVelocity += b2.m_invI * step.dt * motorForce;
		}
		
		if (this.m_enableLimit && this.m_limitState != b2Joint.e_inactiveLimit)
		{
			var limitCdot = b2.m_angularVelocity - b1.m_angularVelocity;
			var limitForce = -step.inv_dt * this.m_motorMass * limitCdot;
			
			if (this.m_limitState == b2Joint.e_equalLimits)
			{
				this.m_limitForce += limitForce;
			}
			else if (this.m_limitState == b2Joint.e_atLowerLimit)
			{
				oldLimitForce = this.m_limitForce;
				this.m_limitForce = b2Math.b2Max(this.m_limitForce + limitForce, 0.0);
				limitForce = this.m_limitForce - oldLimitForce;
			}
			else if (this.m_limitState == b2Joint.e_atUpperLimit)
			{
				oldLimitForce = this.m_limitForce;
				this.m_limitForce = b2Math.b2Min(this.m_limitForce + limitForce, 0.0);
				limitForce = this.m_limitForce - oldLimitForce;
			}
			
			b1.m_angularVelocity -= b1.m_invI * step.dt * limitForce;
			b2.m_angularVelocity += b2.m_invI * step.dt * limitForce;
		}
	}
b2RevoluteJoint.prototype.SolvePositionConstraints = function () {
		
		var oldLimitImpulse;
		var limitC;
		
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var positionError = 0.0;
		
		var tMat;
		
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		var tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		
		var p1X = b1.m_sweep.c.x + r1X;
		var p1Y = b1.m_sweep.c.y + r1Y;
		
		var p2X = b2.m_sweep.c.x + r2X;
		var p2Y = b2.m_sweep.c.y + r2Y;
		
		
		var ptpCX = p2X - p1X;
		var ptpCY = p2Y - p1Y;
		
		
		positionError = Math.sqrt(ptpCX*ptpCX + ptpCY*ptpCY);
		
		
		
		
		
		
		var invMass1 = b1.m_invMass;
		var invMass2 = b2.m_invMass;
		
		var invI1 = b1.m_invI;
		var invI2 = b2.m_invI;
		
		
		this.K1.col1.x = invMass1 + invMass2;	this.K1.col2.x = 0.0;
		this.K1.col1.y = 0.0;					this.K1.col2.y = invMass1 + invMass2;
		
		
		this.K2.col1.x = invI1 * r1Y * r1Y;	this.K2.col2.x = -invI1 * r1X * r1Y;
		this.K2.col1.y = -invI1 * r1X * r1Y;	this.K2.col2.y = invI1 * r1X * r1X;
		
		
		this.K3.col1.x = invI2 * r2Y * r2Y;		this.K3.col2.x = -invI2 * r2X * r2Y;
		this.K3.col1.y = -invI2 * r2X * r2Y;		this.K3.col2.y = invI2 * r2X * r2X;
		
		
		this.K.SetM(this.K1);
		this.K.AddM(this.K2);
		this.K.AddM(this.K3);
		
		this.K.Solve(b2RevoluteJoint.tImpulse, -ptpCX, -ptpCY);
		var impulseX = b2RevoluteJoint.tImpulse.x;
		var impulseY = b2RevoluteJoint.tImpulse.y;
		
		
		b1.m_sweep.c.x -= b1.m_invMass * impulseX;
		b1.m_sweep.c.y -= b1.m_invMass * impulseY;
		
		b1.m_sweep.a -= b1.m_invI * (r1X * impulseY - r1Y * impulseX);
		
		
		b2.m_sweep.c.x += b2.m_invMass * impulseX;
		b2.m_sweep.c.y += b2.m_invMass * impulseY;
		
		b2.m_sweep.a += b2.m_invI * (r2X * impulseY - r2Y * impulseX);
		
		b1.SynchronizeTransform();
		b2.SynchronizeTransform();
		
		
		
		var angularError = 0.0;
		
		if (this.m_enableLimit && this.m_limitState != b2Joint.e_inactiveLimit)
		{
			var angle = b2.m_sweep.a - b1.m_sweep.a - this.m_referenceAngle;
			var limitImpulse = 0.0;
			
			if (this.m_limitState == b2Joint.e_equalLimits)
			{
				
				limitC = b2Math.b2Clamp(angle, -b2Settings.b2_maxAngularCorrection, b2Settings.b2_maxAngularCorrection);
				limitImpulse = -this.m_motorMass * limitC;
				angularError = b2Math.b2Abs(limitC);
			}
			else if (this.m_limitState == b2Joint.e_atLowerLimit)
			{
				limitC = angle - this.m_lowerAngle;
				angularError = b2Math.b2Max(0.0, -limitC);
				
				
				limitC = b2Math.b2Clamp(limitC + b2Settings.b2_angularSlop, -b2Settings.b2_maxAngularCorrection, 0.0);
				limitImpulse = -this.m_motorMass * limitC;
				oldLimitImpulse = this.m_limitPositionImpulse;
				this.m_limitPositionImpulse = b2Math.b2Max(this.m_limitPositionImpulse + limitImpulse, 0.0);
				limitImpulse = this.m_limitPositionImpulse - oldLimitImpulse;
			}
			else if (this.m_limitState == b2Joint.e_atUpperLimit)
			{
				limitC = angle - this.m_upperAngle;
				angularError = b2Math.b2Max(0.0, limitC);
				
				
				limitC = b2Math.b2Clamp(limitC - b2Settings.b2_angularSlop, 0.0, b2Settings.b2_maxAngularCorrection);
				limitImpulse = -this.m_motorMass * limitC;
				oldLimitImpulse = this.m_limitPositionImpulse;
				this.m_limitPositionImpulse = b2Math.b2Min(this.m_limitPositionImpulse + limitImpulse, 0.0);
				limitImpulse = this.m_limitPositionImpulse - oldLimitImpulse;
			}
			
			b1.m_sweep.a -= b1.m_invI * limitImpulse;
			b2.m_sweep.a += b2.m_invI * limitImpulse;
			
			b1.SynchronizeTransform();
			b2.SynchronizeTransform();
		}
		
		return positionError <= b2Settings.b2_linearSlop && angularError <= b2Settings.b2_angularSlop;
	}
exports.b2RevoluteJoint = b2RevoluteJoint;
	
	
var b2PrismaticJoint = function() {
b2Joint.prototype.__varz.call(this)
this.__varz();
this.__constructor.apply(this, arguments);
}
extend(b2PrismaticJoint.prototype, b2Joint.prototype)
b2PrismaticJoint.prototype._super = function(){ b2Joint.prototype.__constructor.apply(this, arguments) }
b2PrismaticJoint.prototype.__constructor = function (def) {
		this._super(def);
		
		var tMat;
		var tX;
		var tY;
		
		this.m_localAnchor1.SetV(def.localAnchor1);
		this.m_localAnchor2.SetV(def.localAnchor2);
		this.m_localXAxis1.SetV(def.localAxis1);
		
		
		this.m_localYAxis1.x = -this.m_localXAxis1.y;
		this.m_localYAxis1.y = this.m_localXAxis1.x;
		
		this.m_refAngle = def.referenceAngle;
		
		this.m_linearJacobian.SetZero();
		this.m_linearMass = 0.0;
		this.m_force = 0.0;
		
		this.m_angularMass = 0.0;
		this.m_torque = 0.0;
		
		this.m_motorJacobian.SetZero();
		this.m_motorMass = 0.0;
		this.m_motorForce = 0.0;
		this.m_limitForce = 0.0;
		this.m_limitPositionImpulse = 0.0;
		
		this.m_lowerTranslation = def.lowerTranslation;
		this.m_upperTranslation = def.upperTranslation;
		this.m_maxMotorForce = def.maxMotorForce;
		this.m_motorSpeed = def.motorSpeed;
		this.m_enableLimit = def.enableLimit;
		this.m_enableMotor = def.enableMotor;
	}
b2PrismaticJoint.prototype.__varz = function(){
this.m_localAnchor1 =  new b2Vec2();
this.m_localAnchor2 =  new b2Vec2();
this.m_localXAxis1 =  new b2Vec2();
this.m_localYAxis1 =  new b2Vec2();
this.m_linearJacobian =  new b2Jacobian();
this.m_motorJacobian =  new b2Jacobian();
}
b2PrismaticJoint.prototype.m_localAnchor1 =  new b2Vec2();
b2PrismaticJoint.prototype.m_localAnchor2 =  new b2Vec2();
b2PrismaticJoint.prototype.m_localXAxis1 =  new b2Vec2();
b2PrismaticJoint.prototype.m_localYAxis1 =  new b2Vec2();
b2PrismaticJoint.prototype.m_refAngle =  null;
b2PrismaticJoint.prototype.m_linearJacobian =  new b2Jacobian();
b2PrismaticJoint.prototype.m_linearMass =  null;
b2PrismaticJoint.prototype.m_force =  null;
b2PrismaticJoint.prototype.m_angularMass =  null;
b2PrismaticJoint.prototype.m_torque =  null;
b2PrismaticJoint.prototype.m_motorJacobian =  new b2Jacobian();
b2PrismaticJoint.prototype.m_motorMass =  null;
b2PrismaticJoint.prototype.m_motorForce =  null;
b2PrismaticJoint.prototype.m_limitForce =  null;
b2PrismaticJoint.prototype.m_limitPositionImpulse =  null;
b2PrismaticJoint.prototype.m_lowerTranslation =  null;
b2PrismaticJoint.prototype.m_upperTranslation =  null;
b2PrismaticJoint.prototype.m_maxMotorForce =  null;
b2PrismaticJoint.prototype.m_motorSpeed =  null;
b2PrismaticJoint.prototype.m_enableLimit =  null;
b2PrismaticJoint.prototype.m_enableMotor =  null;
b2PrismaticJoint.prototype.m_limitState =  0;
b2PrismaticJoint.prototype.GetAnchor1 = function () {
		return this.m_body1.GetWorldPoint(this.m_localAnchor1);
	}
b2PrismaticJoint.prototype.GetAnchor2 = function () {
		return this.m_body2.GetWorldPoint(this.m_localAnchor2);
	}
b2PrismaticJoint.prototype.GetReactionForce = function () {
		var tMat = this.m_body1.m_xf.R;
		
		var ax1X = this.m_limitForce* (tMat.col1.x * this.m_localXAxis1.x + tMat.col2.x * this.m_localXAxis1.y);
		var ax1Y = this.m_limitForce* (tMat.col1.y * this.m_localXAxis1.x + tMat.col2.y * this.m_localXAxis1.y);
		
		var ay1X = this.m_force* (tMat.col1.x * this.m_localYAxis1.x + tMat.col2.x * this.m_localYAxis1.y);
		var ay1Y = this.m_force* (tMat.col1.y * this.m_localYAxis1.x + tMat.col2.y * this.m_localYAxis1.y);
		
		
		return new b2Vec2( this.m_limitForce*ax1X + this.m_force*ay1X, this.m_limitForce*ax1Y + this.m_force*ay1Y);
	}
b2PrismaticJoint.prototype.GetReactionTorque = function () {
		return this.m_torque;
	}
b2PrismaticJoint.prototype.GetJointTranslation = function () {
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var tMat;
		
		var p1 = b1.GetWorldPoint(this.m_localAnchor1);
		var p2 = b2.GetWorldPoint(this.m_localAnchor2);
		
		var dX = p2.x - p1.x;
		var dY = p2.y - p1.y;
		
		var axis = b1.GetWorldVector(this.m_localXAxis1);
		
		
		var translation = axis.x*dX + axis.y*dY;
		return translation;
	}
b2PrismaticJoint.prototype.GetJointSpeed = function () {
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var tMat;
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		var tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		
		var p1X = b1.m_sweep.c.x + r1X;
		var p1Y = b1.m_sweep.c.y + r1Y;
		
		var p2X = b2.m_sweep.c.x + r2X;
		var p2Y = b2.m_sweep.c.y + r2Y;
		
		var dX = p2X - p1X;
		var dY = p2Y - p1Y;
		
		var axis = b1.GetWorldVector(this.m_localXAxis1);
		
		var v1 = b1.m_linearVelocity;
		var v2 = b2.m_linearVelocity;
		var w1 = b1.m_angularVelocity;
		var w2 = b2.m_angularVelocity;
		
		
		
		
		var speed = (dX*(-w1 * axis.y) + dY*(w1 * axis.x)) + (axis.x * ((( v2.x + (-w2 * r2Y)) - v1.x) - (-w1 * r1Y)) + axis.y * ((( v2.y + (w2 * r2X)) - v1.y) - (w1 * r1X)));
		
		return speed;
	}
b2PrismaticJoint.prototype.IsLimitEnabled = function () {
		return this.m_enableLimit;
	}
b2PrismaticJoint.prototype.EnableLimit = function (flag) {
		this.m_enableLimit = flag;
	}
b2PrismaticJoint.prototype.GetLowerLimit = function () {
		return this.m_lowerTranslation;
	}
b2PrismaticJoint.prototype.GetUpperLimit = function () {
		return this.m_upperTranslation;
	}
b2PrismaticJoint.prototype.SetLimits = function (lower, upper) {
		
		this.m_lowerTranslation = lower;
		this.m_upperTranslation = upper;
	}
b2PrismaticJoint.prototype.IsMotorEnabled = function () {
		return this.m_enableMotor;
	}
b2PrismaticJoint.prototype.EnableMotor = function (flag) {
		this.m_enableMotor = flag;
	}
b2PrismaticJoint.prototype.SetMotorSpeed = function (speed) {
		this.m_motorSpeed = speed;
	}
b2PrismaticJoint.prototype.GetMotorSpeed = function () {
		return this.m_motorSpeed;
	}
b2PrismaticJoint.prototype.SetMaxMotorForce = function (force) {
		this.m_maxMotorForce = force;
	}
b2PrismaticJoint.prototype.GetMotorForce = function () {
		return this.m_motorForce;
	}
b2PrismaticJoint.prototype.InitVelocityConstraints = function (step) {
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var tMat;
		var tX;
		
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		
		var invMass1 = b1.m_invMass;
		var invMass2 = b2.m_invMass;
		
		var invI1 = b1.m_invI;
		var invI2 = b2.m_invI;
		
		
		
		
		tMat = b1.m_xf.R;
		var ay1X = tMat.col1.x * this.m_localYAxis1.x + tMat.col2.x * this.m_localYAxis1.y;
		var ay1Y = tMat.col1.y * this.m_localYAxis1.x + tMat.col2.y * this.m_localYAxis1.y;
		
		var eX = b2.m_sweep.c.x + r2X - b1.m_sweep.c.x;
		var eY = b2.m_sweep.c.y + r2Y - b1.m_sweep.c.y;
		
		
		this.m_linearJacobian.linear1.x = -ay1X; 
		this.m_linearJacobian.linear1.y = -ay1Y;
		this.m_linearJacobian.linear2.x = ay1X; 
		this.m_linearJacobian.linear2.y = ay1Y;
		this.m_linearJacobian.angular1 = -(eX * ay1Y - eY * ay1X); 
		this.m_linearJacobian.angular2 = r2X * ay1Y - r2Y * ay1X; 
		
		this.m_linearMass =	invMass1 + invI1 * this.m_linearJacobian.angular1 * this.m_linearJacobian.angular1 +
						invMass2 + invI2 * this.m_linearJacobian.angular2 * this.m_linearJacobian.angular2;
		
		this.m_linearMass = 1.0 / this.m_linearMass;
		
		
		this.m_angularMass = invI1 + invI2;
		if (this.m_angularMass > Number.MIN_VALUE)
		{
			this.m_angularMass = 1.0 / this.m_angularMass;
		}
		
		
		if (this.m_enableLimit || this.m_enableMotor)
		{
			
			
			tMat = b1.m_xf.R;
			var ax1X = tMat.col1.x * this.m_localXAxis1.x + tMat.col2.x * this.m_localXAxis1.y;
			var ax1Y = tMat.col1.y * this.m_localXAxis1.x + tMat.col2.y * this.m_localXAxis1.y;
			
			this.m_motorJacobian.linear1.x = -ax1X; this.m_motorJacobian.linear1.y = -ax1Y;
			this.m_motorJacobian.linear2.x = ax1X; this.m_motorJacobian.linear2.y = ax1Y;
			this.m_motorJacobian.angular1 = -(eX * ax1Y - eY * ax1X); 
			this.m_motorJacobian.angular2 = r2X * ax1Y - r2Y * ax1X; 
			
			this.m_motorMass =	invMass1 + invI1 * this.m_motorJacobian.angular1 * this.m_motorJacobian.angular1 +
							invMass2 + invI2 * this.m_motorJacobian.angular2 * this.m_motorJacobian.angular2;
			
			this.m_motorMass = 1.0 / this.m_motorMass;
			
			if (this.m_enableLimit)
			{
				
				var dX = eX - r1X;
				var dY = eY - r1Y;
				
				var jointTranslation = ax1X * dX + ax1Y * dY;
				if (b2Math.b2Abs(this.m_upperTranslation - this.m_lowerTranslation) < 2.0 * b2Settings.b2_linearSlop)
				{
					this.m_limitState = b2Joint.e_equalLimits;
				}
				else if (jointTranslation <= this.m_lowerTranslation)
				{
					if (this.m_limitState != b2Joint.e_atLowerLimit)
					{
						this.m_limitForce = 0.0;
					}
					this.m_limitState = b2Joint.e_atLowerLimit;
				}
				else if (jointTranslation >= this.m_upperTranslation)
				{
					if (this.m_limitState != b2Joint.e_atUpperLimit)
					{
						this.m_limitForce = 0.0;
					}
					this.m_limitState = b2Joint.e_atUpperLimit;
				}
				else
				{
					this.m_limitState = b2Joint.e_inactiveLimit;
					this.m_limitForce = 0.0;
				}
			}
		}
		
		if (this.m_enableMotor == false)
		{
			this.m_motorForce = 0.0;
		}
		
		if (this.m_enableLimit == false)
		{
			this.m_limitForce = 0.0;
		}
		
		if (step.warmStarting)
		{
			
			var P1X = step.dt * (this.m_force * this.m_linearJacobian.linear1.x + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.linear1.x);
			var P1Y = step.dt * (this.m_force * this.m_linearJacobian.linear1.y + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.linear1.y);
			
			var P2X = step.dt * (this.m_force * this.m_linearJacobian.linear2.x + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.linear2.x);
			var P2Y = step.dt * (this.m_force * this.m_linearJacobian.linear2.y + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.linear2.y);
			
			var L1 = step.dt * (this.m_force * this.m_linearJacobian.angular1 - this.m_torque + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.angular1);
			
			var L2 = step.dt * (this.m_force * this.m_linearJacobian.angular2 + this.m_torque + (this.m_motorForce + this.m_limitForce) * this.m_motorJacobian.angular2);
			
			
			b1.m_linearVelocity.x += invMass1 * P1X;
			b1.m_linearVelocity.y += invMass1 * P1Y;
			
			b1.m_angularVelocity += invI1 * L1;
			
			
			b2.m_linearVelocity.x += invMass2 * P2X;
			b2.m_linearVelocity.y += invMass2 * P2Y;
			
			b2.m_angularVelocity += invI2 * L2;
		}
		else
		{
			this.m_force = 0.0;
			this.m_torque = 0.0;
			this.m_limitForce = 0.0;
			this.m_motorForce = 0.0;
		}
		
		this.m_limitPositionImpulse = 0.0;
		
	}
b2PrismaticJoint.prototype.SolveVelocityConstraints = function (step) {
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var invMass1 = b1.m_invMass;
		var invMass2 = b2.m_invMass;
		var invI1 = b1.m_invI;
		var invI2 = b2.m_invI;
		
		var oldLimitForce;
		
		
		var linearCdot = this.m_linearJacobian.Compute(b1.m_linearVelocity, b1.m_angularVelocity, b2.m_linearVelocity, b2.m_angularVelocity);
		var force = -step.inv_dt * this.m_linearMass * linearCdot;
		this.m_force += force;
		
		var P = step.dt * force;
		
		b1.m_linearVelocity.x += (invMass1 * P) * this.m_linearJacobian.linear1.x;
		b1.m_linearVelocity.y += (invMass1 * P) * this.m_linearJacobian.linear1.y;
		
		b1.m_angularVelocity += invI1 * P * this.m_linearJacobian.angular1;
		
		
		b2.m_linearVelocity.x += (invMass2 * P) * this.m_linearJacobian.linear2.x;
		b2.m_linearVelocity.y += (invMass2 * P) * this.m_linearJacobian.linear2.y;
		
		b2.m_angularVelocity += invI2 * P * this.m_linearJacobian.angular2;
		
		
		var angularCdot = b2.m_angularVelocity - b1.m_angularVelocity;
		var torque = -step.inv_dt * this.m_angularMass * angularCdot;
		this.m_torque += torque;
		
		var L = step.dt * torque;
		b1.m_angularVelocity -= invI1 * L;
		b2.m_angularVelocity += invI2 * L;
		
		
		if (this.m_enableMotor && this.m_limitState != b2Joint.e_equalLimits)
		{
			var motorCdot = this.m_motorJacobian.Compute(b1.m_linearVelocity, b1.m_angularVelocity, b2.m_linearVelocity, b2.m_angularVelocity) - this.m_motorSpeed;
			var motorForce = -step.inv_dt * this.m_motorMass * motorCdot;
			var oldMotorForce = this.m_motorForce;
			this.m_motorForce = b2Math.b2Clamp(this.m_motorForce + motorForce, -this.m_maxMotorForce, this.m_maxMotorForce);
			motorForce = this.m_motorForce - oldMotorForce;
			
			P = step.dt * motorForce;
			
			b1.m_linearVelocity.x += (invMass1 * P) * this.m_motorJacobian.linear1.x;
			b1.m_linearVelocity.y += (invMass1 * P) * this.m_motorJacobian.linear1.y;
			
			b1.m_angularVelocity += invI1 * P * this.m_motorJacobian.angular1;
			
			
			b2.m_linearVelocity.x += (invMass2 * P) * this.m_motorJacobian.linear2.x;
			b2.m_linearVelocity.y += (invMass2 * P) * this.m_motorJacobian.linear2.y;
			
			b2.m_angularVelocity += invI2 * P * this.m_motorJacobian.angular2;
		}
		
		
		if (this.m_enableLimit && this.m_limitState != b2Joint.e_inactiveLimit)
		{
			var limitCdot = this.m_motorJacobian.Compute(b1.m_linearVelocity, b1.m_angularVelocity, b2.m_linearVelocity, b2.m_angularVelocity);
			var limitForce = -step.inv_dt * this.m_motorMass * limitCdot;
			
			if (this.m_limitState == b2Joint.e_equalLimits)
			{
				this.m_limitForce += limitForce;
			}
			else if (this.m_limitState == b2Joint.e_atLowerLimit)
			{
				oldLimitForce = this.m_limitForce;
				this.m_limitForce = b2Math.b2Max(this.m_limitForce + limitForce, 0.0);
				limitForce = this.m_limitForce - oldLimitForce;
			}
			else if (this.m_limitState == b2Joint.e_atUpperLimit)
			{
				oldLimitForce = this.m_limitForce;
				this.m_limitForce = b2Math.b2Min(this.m_limitForce + limitForce, 0.0);
				limitForce = this.m_limitForce - oldLimitForce;
			}
			
			P = step.dt * limitForce;
			
			b1.m_linearVelocity.x += (invMass1 * P) * this.m_motorJacobian.linear1.x;
			b1.m_linearVelocity.y += (invMass1 * P) * this.m_motorJacobian.linear1.y;
			
			b1.m_angularVelocity += invI1 * P * this.m_motorJacobian.angular1;
			
			
			b2.m_linearVelocity.x += (invMass2 * P) * this.m_motorJacobian.linear2.x;
			b2.m_linearVelocity.y += (invMass2 * P) * this.m_motorJacobian.linear2.y;
			
			b2.m_angularVelocity += invI2 * P * this.m_motorJacobian.angular2;
		}
	}
b2PrismaticJoint.prototype.SolvePositionConstraints = function () {
		
		var limitC;
		var oldLimitImpulse;
		
		var b1 = this.m_body1;
		var b2 = this.m_body2;
		
		var invMass1 = b1.m_invMass;
		var invMass2 = b2.m_invMass;
		var invI1 = b1.m_invI;
		var invI2 = b2.m_invI;
		
		var tMat;
		var tX;
		
		
		tMat = b1.m_xf.R;
		var r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
		var r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
		r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
		r1X = tX;
		
		tMat = b2.m_xf.R;
		var r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
		var r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
		tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
		r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
		r2X = tX;
		
		
		var p1X = b1.m_sweep.c.x + r1X;
		var p1Y = b1.m_sweep.c.y + r1Y;
		
		var p2X = b2.m_sweep.c.x + r2X;
		var p2Y = b2.m_sweep.c.y + r2Y;
		
		var dX = p2X - p1X;
		var dY = p2Y - p1Y;
		
		tMat = b1.m_xf.R;
		var ay1X = tMat.col1.x * this.m_localYAxis1.x + tMat.col2.x * this.m_localYAxis1.y;
		var ay1Y = tMat.col1.y * this.m_localYAxis1.x + tMat.col2.y * this.m_localYAxis1.y;
		
		
		
		var linearC = ay1X*dX + ay1Y*dY;
		
		linearC = b2Math.b2Clamp(linearC, -b2Settings.b2_maxLinearCorrection, b2Settings.b2_maxLinearCorrection);
		var linearImpulse = -this.m_linearMass * linearC;
		
		
		b1.m_sweep.c.x += (invMass1 * linearImpulse) * this.m_linearJacobian.linear1.x;
		b1.m_sweep.c.y += (invMass1 * linearImpulse) * this.m_linearJacobian.linear1.y;
		
		b1.m_sweep.a += invI1 * linearImpulse * this.m_linearJacobian.angular1;
		
		
		
		b2.m_sweep.c.x += (invMass2 * linearImpulse) * this.m_linearJacobian.linear2.x;
		b2.m_sweep.c.y += (invMass2 * linearImpulse) * this.m_linearJacobian.linear2.y;
		
		b2.m_sweep.a += invI2 * linearImpulse * this.m_linearJacobian.angular2;
		
		
		var positionError = b2Math.b2Abs(linearC);
		
		
		var angularC = b2.m_sweep.a - b1.m_sweep.a - this.m_refAngle;
		
		angularC = b2Math.b2Clamp(angularC, -b2Settings.b2_maxAngularCorrection, b2Settings.b2_maxAngularCorrection);
		var angularImpulse = -this.m_angularMass * angularC;
		
		b1.m_sweep.a -= b1.m_invI * angularImpulse;
		b2.m_sweep.a += b2.m_invI * angularImpulse;
		b1.SynchronizeTransform();
		b2.SynchronizeTransform();
		
		var angularError = b2Math.b2Abs(angularC);
		
		
		if (this.m_enableLimit && this.m_limitState != b2Joint.e_inactiveLimit)
		{
			
			
			tMat = b1.m_xf.R;
			r1X = this.m_localAnchor1.x - b1.m_sweep.localCenter.x;
			r1Y = this.m_localAnchor1.y - b1.m_sweep.localCenter.y;
			tX = (tMat.col1.x * r1X + tMat.col2.x * r1Y);
			r1Y = (tMat.col1.y * r1X + tMat.col2.y * r1Y);
			r1X = tX;
			
			tMat = b2.m_xf.R;
			r2X = this.m_localAnchor2.x - b2.m_sweep.localCenter.x;
			r2Y = this.m_localAnchor2.y - b2.m_sweep.localCenter.y;
			tX = (tMat.col1.x * r2X + tMat.col2.x * r2Y);
			r2Y = (tMat.col1.y * r2X + tMat.col2.y * r2Y);
			r2X = tX;
			
			
			p1X = b1.m_sweep.c.x + r1X;
			p1Y = b1.m_sweep.c.y + r1Y;
			
			p2X = b2.m_sweep.c.x + r2X;
			p2Y = b2.m_sweep.c.y + r2Y;
			
			dX = p2X - p1X;
			dY = p2Y - p1Y;
			
			tMat = b1.m_xf.R;
			var ax1X = tMat.col1.x * this.m_localXAxis1.x + tMat.col2.x * this.m_localXAxis1.y;
			var ax1Y = tMat.col1.y * this.m_localXAxis1.x + tMat.col2.y * this.m_localXAxis1.y;
			
			
			var translation = (ax1X*dX + ax1Y*dY);
			var limitImpulse = 0.0;
			
			if (this.m_limitState == b2Joint.e_equalLimits)
			{
				
				limitC = b2Math.b2Clamp(translation, -b2Settings.b2_maxLinearCorrection, b2Settings.b2_maxLinearCorrection);
				limitImpulse = -this.m_motorMass * limitC;
				positionError = b2Math.b2Max(positionError, b2Math.b2Abs(angularC));
			}
			else if (this.m_limitState == b2Joint.e_atLowerLimit)
			{
				limitC = translation - this.m_lowerTranslation;
				positionError = b2Math.b2Max(positionError, -limitC);
				
				
				limitC = b2Math.b2Clamp(limitC + b2Settings.b2_linearSlop, -b2Settings.b2_maxLinearCorrection, 0.0);
				limitImpulse = -this.m_motorMass * limitC;
				oldLimitImpulse = this.m_limitPositionImpulse;
				this.m_limitPositionImpulse = b2Math.b2Max(this.m_limitPositionImpulse + limitImpulse, 0.0);
				limitImpulse = this.m_limitPositionImpulse - oldLimitImpulse;
			}
			else if (this.m_limitState == b2Joint.e_atUpperLimit)
			{
				limitC = translation - this.m_upperTranslation;
				positionError = b2Math.b2Max(positionError, limitC);
				
				
				limitC = b2Math.b2Clamp(limitC - b2Settings.b2_linearSlop, 0.0, b2Settings.b2_maxLinearCorrection);
				limitImpulse = -this.m_motorMass * limitC;
				oldLimitImpulse = this.m_limitPositionImpulse;
				this.m_limitPositionImpulse = b2Math.b2Min(this.m_limitPositionImpulse + limitImpulse, 0.0);
				limitImpulse = this.m_limitPositionImpulse - oldLimitImpulse;
			}
			
			
			b1.m_sweep.c.x += (invMass1 * limitImpulse) * this.m_motorJacobian.linear1.x;
			b1.m_sweep.c.y += (invMass1 * limitImpulse) * this.m_motorJacobian.linear1.y;
			
			b1.m_sweep.a += invI1 * limitImpulse * this.m_motorJacobian.angular1;
			
			
			b2.m_sweep.c.x += (invMass2 * limitImpulse) * this.m_motorJacobian.linear2.x;
			b2.m_sweep.c.y += (invMass2 * limitImpulse) * this.m_motorJacobian.linear2.y;
			
			b2.m_sweep.a += invI2 * limitImpulse * this.m_motorJacobian.angular2;
			
			b1.SynchronizeTransform();
			b2.SynchronizeTransform();
			
		}
		
		return positionError <= b2Settings.b2_linearSlop && angularError <= b2Settings.b2_angularSlop;
		
	}	
exports.b2PrismaticJoint = b2PrismaticJoint;


var b2World = function() {
this.__varz();
this.__constructor.apply(this, arguments);
}
b2World.prototype.__constructor = function (worldAABB, gravity, doSleep) {
		
		this.m_destructionListener = null;
		this.m_boundaryListener = null;
		this.m_contactFilter = b2ContactFilter.b2_defaultFilter;
		this.m_contactListener = null;
		this.m_debugDraw = null;
		
		this.m_bodyList = null;
		this.m_contactList = null;
		this.m_jointList = null;
		
		this.m_bodyCount = 0;
		this.m_contactCount = 0;
		this.m_jointCount = 0;
		
		b2World.m_positionCorrection = true;
		b2World.m_warmStarting = true;
		b2World.m_continuousPhysics = true;
		
		this.m_allowSleep = doSleep;
		this.m_gravity = gravity;
		
		this.m_lock = false;
		
		this.m_inv_dt0 = 0.0;
		
		this.m_contactManager.m_world = this;
		
		this.m_broadPhase = new b2BroadPhase(worldAABB, this.m_contactManager);
		
		var bd = new b2BodyDef();
		this.m_groundBody = this.CreateBody(bd);
	}
b2World.prototype.__varz = function(){
this.m_contactManager =  new b2ContactManager();
}
// static attributes
b2World.m_positionCorrection =  null;
b2World.m_warmStarting =  null;
b2World.m_continuousPhysics =  null;
b2World.s_jointColor =  new b2Color(0.5, 0.8, 0.8);
b2World.s_coreColor =  new b2Color(0.9, 0.6, 0.6);
b2World.s_xf =  new b2XForm();
// static methods
// attributes
b2World.prototype.m_blockAllocator =  null;
b2World.prototype.m_stackAllocator =  null;
b2World.prototype.m_lock =  null;
b2World.prototype.m_broadPhase =  null;
b2World.prototype.m_contactManager =  new b2ContactManager();
b2World.prototype.m_bodyList =  null;
b2World.prototype.m_jointList =  null;
b2World.prototype.m_contactList =  null;
b2World.prototype.m_bodyCount =  0;
b2World.prototype.m_contactCount =  0;
b2World.prototype.m_jointCount =  0;
b2World.prototype.m_gravity =  null;
b2World.prototype.m_allowSleep =  null;
b2World.prototype.m_groundBody =  null;
b2World.prototype.m_destructionListener =  null;
b2World.prototype.m_boundaryListener =  null;
b2World.prototype.m_contactFilter =  null;
b2World.prototype.m_contactListener =  null;
b2World.prototype.m_debugDraw =  null;
b2World.prototype.m_inv_dt0 =  null;
b2World.prototype.m_positionIterationCount =  0;
// methods
b2World.prototype.SetDestructionListener = function (listener) {
		this.m_destructionListener = listener;
	}
b2World.prototype.SetBoundaryListener = function (listener) {
		this.m_boundaryListener = listener;
	}
b2World.prototype.SetContactFilter = function (filter) {
		this.m_contactFilter = filter;
	}
b2World.prototype.SetContactListener = function (listener) {
		this.m_contactListener = listener;
	}
b2World.prototype.SetDebugDraw = function (debugDraw) {
		this.m_debugDraw = debugDraw;
	}
b2World.prototype.Validate = function () {
		this.m_broadPhase.Validate();
	}
b2World.prototype.GetProxyCount = function () {
		return this.m_broadPhase.m_proxyCount;
	}
b2World.prototype.GetPairCount = function () {
		return this.m_broadPhase.m_pairManager.m_pairCount;
	}
b2World.prototype.CreateBody = function (def) {
		
		
		if (this.m_lock == true)
		{
			return null;
		}
		
		
		var b = new b2Body(def, this);
		
		
		b.m_prev = null;
		b.m_next = this.m_bodyList;
		if (this.m_bodyList)
		{
			this.m_bodyList.m_prev = b;
		}
		this.m_bodyList = b;
		++this.m_bodyCount;
		
		return b;
		
	}
b2World.prototype.DestroyBody = function (b) {
		
		
		
		if (this.m_lock == true)
		{
			return;
		}
		
		
		var jn = b.m_jointList;
		while (jn)
		{
			var jn0 = jn;
			jn = jn.next;
			
			if (this.m_destructionListener)
			{
				this.m_destructionListener.SayGoodbyeJoint(jn0.joint);
			}
			
			this.DestroyJoint(jn0.joint);
		}
		
		
		
		var s = b.m_shapeList;
		while (s)
		{
			var s0 = s;
			s = s.m_next;
			
			if (this.m_destructionListener)
			{
				this.m_destructionListener.SayGoodbyeShape(s0);
			}
			
			s0.DestroyProxy(this.m_broadPhase);
			b2Shape.Destroy(s0, this.m_blockAllocator);
		}
		
		
		if (b.m_prev)
		{
			b.m_prev.m_next = b.m_next;
		}
		
		if (b.m_next)
		{
			b.m_next.m_prev = b.m_prev;
		}
		
		if (b == this.m_bodyList)
		{
			this.m_bodyList = b.m_next;
		}
		
		--this.m_bodyCount;
		
		
		
	}
b2World.prototype.CreateJoint = function (def) {
		
		
		
		var j = b2Joint.Create(def, this.m_blockAllocator);
		
		
		j.m_prev = null;
		j.m_next = this.m_jointList;
		if (this.m_jointList)
		{
			this.m_jointList.m_prev = j;
		}
		this.m_jointList = j;
		++this.m_jointCount;
		
		
		j.m_node1.joint = j;
		j.m_node1.other = j.m_body2;
		j.m_node1.prev = null;
		j.m_node1.next = j.m_body1.m_jointList;
		if (j.m_body1.m_jointList) j.m_body1.m_jointList.prev = j.m_node1;
		j.m_body1.m_jointList = j.m_node1;
		
		j.m_node2.joint = j;
		j.m_node2.other = j.m_body1;
		j.m_node2.prev = null;
		j.m_node2.next = j.m_body2.m_jointList;
		if (j.m_body2.m_jointList) j.m_body2.m_jointList.prev = j.m_node2;
		j.m_body2.m_jointList = j.m_node2;
		
		
		if (def.collideConnected == false)
		{
			
			var b = def.body1.m_shapeCount < def.body2.m_shapeCount ? def.body1 : def.body2;
			for (var s = b.m_shapeList; s; s = s.m_next)
			{
				s.RefilterProxy(this.m_broadPhase, b.m_xf);
			}
		}
		
		return j;
		
	}
b2World.prototype.DestroyJoint = function (j) {
		
		
		
		var collideConnected = j.m_collideConnected;
		
		
		if (j.m_prev)
		{
			j.m_prev.m_next = j.m_next;
		}
		
		if (j.m_next)
		{
			j.m_next.m_prev = j.m_prev;
		}
		
		if (j == this.m_jointList)
		{
			this.m_jointList = j.m_next;
		}
		
		
		var body1 = j.m_body1;
		var body2 = j.m_body2;
		
		
		body1.WakeUp();
		body2.WakeUp();
		
		
		if (j.m_node1.prev)
		{
			j.m_node1.prev.next = j.m_node1.next;
		}
		
		if (j.m_node1.next)
		{
			j.m_node1.next.prev = j.m_node1.prev;
		}
		
		if (j.m_node1 == body1.m_jointList)
		{
			body1.m_jointList = j.m_node1.next;
		}
		
		j.m_node1.prev = null;
		j.m_node1.next = null;
		
		
		if (j.m_node2.prev)
		{
			j.m_node2.prev.next = j.m_node2.next;
		}
		
		if (j.m_node2.next)
		{
			j.m_node2.next.prev = j.m_node2.prev;
		}
		
		if (j.m_node2 == body2.m_jointList)
		{
			body2.m_jointList = j.m_node2.next;
		}
		
		j.m_node2.prev = null;
		j.m_node2.next = null;
		
		b2Joint.Destroy(j, this.m_blockAllocator);
		
		
		--this.m_jointCount;
		
		
		if (collideConnected == false)
		{
			
			var b = body1.m_shapeCount < body2.m_shapeCount ? body1 : body2;
			for (var s = b.m_shapeList; s; s = s.m_next)
			{
				s.RefilterProxy(this.m_broadPhase, b.m_xf);
			}
		}
		
	}
b2World.prototype.Refilter = function (shape) {
		shape.RefilterProxy(this.m_broadPhase, shape.m_body.m_xf);
	}
b2World.prototype.SetWarmStarting = function (flag) { b2World.m_warmStarting = flag; }
b2World.prototype.SetPositionCorrection = function (flag) { b2World.m_positionCorrection = flag; }
b2World.prototype.SetContinuousPhysics = function (flag) { b2World.m_continuousPhysics = flag; }
b2World.prototype.GetBodyCount = function () {
		return this.m_bodyCount;
	}
b2World.prototype.GetJointCount = function () {
		return this.m_jointCount;
	}
b2World.prototype.GetContactCount = function () {
		return this.m_contactCount;
	}
b2World.prototype.SetGravity = function (gravity) {
		this.m_gravity = gravity;
	}
b2World.prototype.GetGroundBody = function () {
		return this.m_groundBody;
	}
b2World.prototype.Step = function (dt, iterations) {
		
		this.m_lock = true;
		
		var step = new b2TimeStep();
		step.dt = dt;
		step.maxIterations	= iterations;
		if (dt > 0.0)
		{
			step.inv_dt = 1.0 / dt;
		}
		else
		{
			step.inv_dt = 0.0;
		}
		
		step.dtRatio = this.m_inv_dt0 * dt;
		
		step.positionCorrection = b2World.m_positionCorrection;
		step.warmStarting = b2World.m_warmStarting;
		
		
		this.m_contactManager.Collide();
		
		
		if (step.dt > 0.0)
		{
			this.Solve(step);
		}
		
		
		if (b2World.m_continuousPhysics && step.dt > 0.0)
		{
			this.SolveTOI(step);
		}
		
		
		this.DrawDebugData();
		
		this.m_inv_dt0 = step.inv_dt;
		this.m_lock = false;
	}
b2World.prototype.Query = function (aabb, shapes, maxCount) {
		
		
		var results = new Array(maxCount);
		
		var count = this.m_broadPhase.QueryAABB(aabb, results, maxCount);
		
		for (var i = 0; i < count; ++i)
		{
			shapes[i] = results[i];
		}
		
		
		return count;
		
	}
b2World.prototype.GetBodyList = function () {
		return this.m_bodyList;
	}
b2World.prototype.GetJointList = function () {
		return this.m_jointList;
	}
b2World.prototype.Solve = function (step) {
		
		var b;
		
		this.m_positionIterationCount = 0;
		
		
		var island = new b2Island(this.m_bodyCount, this.m_contactCount, this.m_jointCount, this.m_stackAllocator, this.m_contactListener);
		
		
		for (b = this.m_bodyList; b; b = b.m_next)
		{
			b.m_flags &= ~b2Body.e_islandFlag;
		}
		for (var c = this.m_contactList; c; c = c.m_next)
		{
			c.m_flags &= ~b2Contact.e_islandFlag;
		}
		for (var j = this.m_jointList; j; j = j.m_next)
		{
			j.m_islandFlag = false;
		}
		
		
		var stackSize = this.m_bodyCount;
		
		var stack = new Array(stackSize);
		for (var seed = this.m_bodyList; seed; seed = seed.m_next)
		{
			if (seed.m_flags & (b2Body.e_islandFlag | b2Body.e_sleepFlag | b2Body.e_frozenFlag))
			{
				continue;
			}
			
			if (seed.IsStatic())
			{
				continue;
			}
			
			
			island.Clear();
			var stackCount = 0;
			stack[stackCount++] = seed;
			seed.m_flags |= b2Body.e_islandFlag;
			
			
			while (stackCount > 0)
			{
				
				b = stack[--stackCount];
				island.AddBody(b);
				
				
				b.m_flags &= ~b2Body.e_sleepFlag;
				
				
				
				if (b.IsStatic())
				{
					continue;
				}
				
				var other;
				
				for (var cn = b.m_contactList; cn; cn = cn.next)
				{
					
					if (cn.contact.m_flags & (b2Contact.e_islandFlag | b2Contact.e_nonSolidFlag))
					{
						continue;
					}
					
					
					if (cn.contact.m_manifoldCount == 0)
					{
						continue;
					}
					
					island.AddContact(cn.contact);
					cn.contact.m_flags |= b2Contact.e_islandFlag;
					
					
					other = cn.other;
					
					
					if (other.m_flags & b2Body.e_islandFlag)
					{
						continue;
					}
					
					
					stack[stackCount++] = other;
					other.m_flags |= b2Body.e_islandFlag;
				}
				
				
				for (var jn = b.m_jointList; jn; jn = jn.next)
				{
					if (jn.joint.m_islandFlag == true)
					{
						continue;
					}
					
					island.AddJoint(jn.joint);
					jn.joint.m_islandFlag = true;
					
					
					other = jn.other;
					if (other.m_flags & b2Body.e_islandFlag)
					{
						continue;
					}
					
					
					stack[stackCount++] = other;
					other.m_flags |= b2Body.e_islandFlag;
				}
			}
			
			island.Solve(step, this.m_gravity, b2World.m_positionCorrection, this.m_allowSleep);
			
			if (island.m_positionIterationCount > this.m_positionIterationCount) {
				this.m_positionIterationCount = island.m_positionIterationCount;
			}
			
			
			for (var i = 0; i < island.m_bodyCount; ++i)
			{
				
				b = island.m_bodies[i];
				if (b.IsStatic())
				{
					b.m_flags &= ~b2Body.e_islandFlag;
				}
			}
		}
		
		
		
		
		for (b = this.m_bodyList; b; b = b.m_next)
		{
			if (b.m_flags & (b2Body.e_sleepFlag | b2Body.e_frozenFlag))
			{
				continue;
			}
			
			if (b.IsStatic())
			{
				continue;
			}
			
			
			
			
			var inRange = b.SynchronizeShapes();
			
			
			if (inRange == false && this.m_boundaryListener != null)
			{
				this.m_boundaryListener.Violation(b);
			}
		}
		
		
		
		this.m_broadPhase.Commit();
		
	}
b2World.prototype.SolveTOI = function (step) {
		
		var b;
		var s1;
		var s2;
		var b1;
		var b2;
		var cn;
		
		
		var island = new b2Island(this.m_bodyCount, b2Settings.b2_maxTOIContactsPerIsland, 0, this.m_stackAllocator, this.m_contactListener);
		var stackSize = this.m_bodyCount;
		
		
		var stack = new Array(stackSize);
		
		for (b = this.m_bodyList; b; b = b.m_next)
		{
			b.m_flags &= ~b2Body.e_islandFlag;
			b.m_sweep.t0 = 0.0;
		}
		
		var c;
		for (c = this.m_contactList; c; c = c.m_next)
		{
			
			c.m_flags &= ~(b2Contact.e_toiFlag | b2Contact.e_islandFlag);
		}
		
		
		for (;;)
		{
			
			var minContact = null;
			var minTOI = 1.0;
			
			for (c = this.m_contactList; c; c = c.m_next)
			{
				if (c.m_flags & (b2Contact.e_slowFlag | b2Contact.e_nonSolidFlag))
				{
					continue;
				}
				
				
				
				var toi = 1.0;
				if (c.m_flags & b2Contact.e_toiFlag)
				{
					
					toi = c.m_toi;
				}
				else
				{
					
					s1 = c.m_shape1;
					s2 = c.m_shape2;
					b1 = s1.m_body;
					b2 = s2.m_body;
					
					if ((b1.IsStatic() || b1.IsSleeping()) && (b2.IsStatic() || b2.IsSleeping()))
					{
						continue;
					}
					
					
					var t0 = b1.m_sweep.t0;
					
					if (b1.m_sweep.t0 < b2.m_sweep.t0)
					{
						t0 = b2.m_sweep.t0;
						b1.m_sweep.Advance(t0);
					}
					else if (b2.m_sweep.t0 < b1.m_sweep.t0)
					{
						t0 = b1.m_sweep.t0;
						b2.m_sweep.Advance(t0);
					}
					
					
					
					
					toi = b2TimeOfImpact.TimeOfImpact(c.m_shape1, b1.m_sweep, c.m_shape2, b2.m_sweep);
					
					
					if (toi > 0.0 && toi < 1.0)
					{
						
						toi = (1.0 - toi) * t0 + toi;
						if (toi > 1) toi = 1;
					}
					
					
					c.m_toi = toi;
					c.m_flags |= b2Contact.e_toiFlag;
				}
				
				if (Number.MIN_VALUE < toi && toi < minTOI)
				{
					
					minContact = c;
					minTOI = toi;
				}
			}
			
			if (minContact == null || 1.0 - 100.0 * Number.MIN_VALUE < minTOI)
			{
				
				break;
			}
			
			
			s1 = minContact.m_shape1;
			s2 = minContact.m_shape2;
			b1 = s1.m_body;
			b2 = s2.m_body;
			b1.Advance(minTOI);
			b2.Advance(minTOI);
			
			
			minContact.Update(this.m_contactListener);
			minContact.m_flags &= ~b2Contact.e_toiFlag;
			
			if (minContact.m_manifoldCount == 0)
			{
				
				
				continue;
			}
			
			
			var seed = b1;
			if (seed.IsStatic())
			{
				seed = b2;
			}
			
			
			island.Clear();
			var stackCount = 0;
			stack[stackCount++] = seed;
			seed.m_flags |= b2Body.e_islandFlag;
			
			
			while (stackCount > 0)
			{
				
				b = stack[--stackCount];
				island.AddBody(b);
				
				
				b.m_flags &= ~b2Body.e_sleepFlag;
				
				
				
				if (b.IsStatic())
				{
					continue;
				}
				
				
				for (cn = b.m_contactList; cn; cn = cn.next)
				{
					
					if (island.m_contactCount == island.m_contactCapacity)
					{
						continue;
					}
					
					
					if (cn.contact.m_flags & (b2Contact.e_islandFlag | b2Contact.e_slowFlag | b2Contact.e_nonSolidFlag))
					{
						continue;
					}
					
					
					if (cn.contact.m_manifoldCount == 0)
					{
						continue;
					}
					
					island.AddContact(cn.contact);
					cn.contact.m_flags |= b2Contact.e_islandFlag;
					
					
					var other = cn.other;
					
					
					if (other.m_flags & b2Body.e_islandFlag)
					{
						continue;
					}
					
					
					if (other.IsStatic() == false)
					{
						other.Advance(minTOI);
						other.WakeUp();
					}
					
					
					stack[stackCount++] = other;
					other.m_flags |= b2Body.e_islandFlag;
				}
			}
			
			var subStep = new b2TimeStep();
			subStep.dt = (1.0 - minTOI) * step.dt;
			
			subStep.inv_dt = 1.0 / subStep.dt;
			subStep.maxIterations = step.maxIterations;
			
			island.SolveTOI(subStep);
			
			var i = 0;
			
			for (i = 0; i < island.m_bodyCount; ++i)
			{
				
				b = island.m_bodies[i];
				b.m_flags &= ~b2Body.e_islandFlag;
				
				if (b.m_flags & (b2Body.e_sleepFlag | b2Body.e_frozenFlag))
				{
					continue;
				}
				
				if (b.IsStatic())
				{
					continue;
				}
				
				
				
				
				var inRange = b.SynchronizeShapes();
				
				
				if (inRange == false && this.m_boundaryListener != null)
				{
					this.m_boundaryListener.Violation(b);
				}
				
				
				
				for (cn = b.m_contactList; cn; cn = cn.next)
				{
					cn.contact.m_flags &= ~b2Contact.e_toiFlag;
				}
			}
			
			for (i = 0; i < island.m_contactCount; ++i)
			{
				
				c = island.m_contacts[i];
				c.m_flags &= ~(b2Contact.e_toiFlag | b2Contact.e_islandFlag);
			}
			
			
			
			this.m_broadPhase.Commit();
		}
		
		
		
	}
b2World.prototype.DrawJoint = function (joint) {
		
		var b1 = joint.m_body1;
		var b2 = joint.m_body2;
		var xf1 = b1.m_xf;
		var xf2 = b2.m_xf;
		var x1 = xf1.position;
		var x2 = xf2.position;
		var p1 = joint.GetAnchor1();
		var p2 = joint.GetAnchor2();
		
		
		var color = b2World.s_jointColor;
		
		switch (joint.m_type)
		{
		case b2Joint.e_distanceJoint:
			this.m_debugDraw.DrawSegment(p1, p2, color);
			break;
		
		case b2Joint.e_pulleyJoint:
			{
				var pulley = (joint);
				var s1 = pulley.GetGroundAnchor1();
				var s2 = pulley.GetGroundAnchor2();
				this.m_debugDraw.DrawSegment(s1, p1, color);
				this.m_debugDraw.DrawSegment(s2, p2, color);
				this.m_debugDraw.DrawSegment(s1, s2, color);
			}
			break;
		
		case b2Joint.e_mouseJoint:
			this.m_debugDraw.DrawSegment(p1, p2, color);
			break;
		
		default:
			if (b1 != this.m_groundBody)
				this.m_debugDraw.DrawSegment(x1, p1, color);
			this.m_debugDraw.DrawSegment(p1, p2, color);
			if (b2 != this.m_groundBody)
				this.m_debugDraw.DrawSegment(x2, p2, color);
		}
	}
b2World.prototype.DrawShape = function (shape, xf, color, core) {
		
		var coreColor = b2World.s_coreColor;
		
		switch (shape.m_type)
		{
		case b2Shape.e_circleShape:
			{
				var circle = (shape);
				
				var center = b2Math.b2MulX(xf, circle.m_localPosition);
				var radius = circle.m_radius;
				var axis = xf.R.col1;
				
				this.m_debugDraw.DrawSolidCircle(center, radius, axis, color);
				
				if (core)
				{
					this.m_debugDraw.DrawCircle(center, radius - b2Settings.b2_toiSlop, coreColor);
				}
			}
			break;
		
		case b2Shape.e_polygonShape:
			{
				var i = 0;
				var poly = (shape);
				var vertexCount = poly.GetVertexCount();
				var localVertices = poly.GetVertices();
				
				
				var vertices = new Array(b2Settings.b2_maxPolygonVertices);
				
				for (i = 0; i < vertexCount; ++i)
				{
					vertices[i] = b2Math.b2MulX(xf, localVertices[i]);
				}
				
				this.m_debugDraw.DrawSolidPolygon(vertices, vertexCount, color);
				
				if (core)
				{
					var localCoreVertices = poly.GetCoreVertices();
					for (i = 0; i < vertexCount; ++i)
					{
						vertices[i] = b2Math.b2MulX(xf, localCoreVertices[i]);
					}
					this.m_debugDraw.DrawPolygon(vertices, vertexCount, coreColor);
				}
			}
			break;
		}
	}
b2World.prototype.DrawDebugData = function () {
		
		if (this.m_debugDraw == null)
		{
			return;
		}
		
		this.m_debugDraw.m_sprite.graphics.clear();
		
		var flags = this.m_debugDraw.GetFlags();
		
		var i = 0;
		var b;
		var s;
		var j;
		var bp;
		var invQ = new b2Vec2;
		var x1 = new b2Vec2;
		var x2 = new b2Vec2;
		var color = new b2Color(0,0,0);
		var xf;
		var b1 = new b2AABB();
		var b2 = new b2AABB();
		var vs = [new b2Vec2(), new b2Vec2(), new b2Vec2(), new b2Vec2()];
		
		if (flags & b2DebugDraw.e_shapeBit)
		{
			var core = (flags & b2DebugDraw.e_coreShapeBit) == b2DebugDraw.e_coreShapeBit;
			
			for (b = this.m_bodyList; b; b = b.m_next)
			{
				xf = b.m_xf;
				for (s = b.GetShapeList(); s; s = s.m_next)
				{
					if (b.IsStatic())
					{
						this.DrawShape(s, xf, new b2Color(0.5, 0.9, 0.5), core);
					}
					else if (b.IsSleeping())
					{
						this.DrawShape(s, xf, new b2Color(0.5, 0.5, 0.9), core);
					}
					else
					{
						this.DrawShape(s, xf, new b2Color(0.9, 0.9, 0.9), core);
					}
				}
			}
		}
		
		if (flags & b2DebugDraw.e_jointBit)
		{
			for (j = this.m_jointList; j; j = j.m_next)
			{
				
				
					this.DrawJoint(j);
				
			}
		}
		
		if (flags & b2DebugDraw.e_pairBit)
		{
			bp = this.m_broadPhase;
			
			invQ.Set(1.0 / bp.m_quantizationFactor.x, 1.0 / bp.m_quantizationFactor.y);
			
			color.Set(0.9, 0.9, 0.3);
			
			for (i = 0; i < b2Pair.b2_tableCapacity; ++i)
			{
				var index = bp.m_pairManager.m_hashTable[i];
				while (index != b2Pair.b2_nullPair)
				{
					var pair = bp.m_pairManager.m_pairs[ index ];
					var p1 = bp.m_proxyPool[ pair.proxyId1 ];
					var p2 = bp.m_proxyPool[ pair.proxyId2 ];
					
					
					b1.lowerBound.x = bp.m_worldAABB.lowerBound.x + invQ.x * bp.m_bounds[0][p1.lowerBounds[0]].value;
					b1.lowerBound.y = bp.m_worldAABB.lowerBound.y + invQ.y * bp.m_bounds[1][p1.lowerBounds[1]].value;
					b1.upperBound.x = bp.m_worldAABB.lowerBound.x + invQ.x * bp.m_bounds[0][p1.upperBounds[0]].value;
					b1.upperBound.y = bp.m_worldAABB.lowerBound.y + invQ.y * bp.m_bounds[1][p1.upperBounds[1]].value;
					b2.lowerBound.x = bp.m_worldAABB.lowerBound.x + invQ.x * bp.m_bounds[0][p2.lowerBounds[0]].value;
					b2.lowerBound.y = bp.m_worldAABB.lowerBound.y + invQ.y * bp.m_bounds[1][p2.lowerBounds[1]].value;
					b2.upperBound.x = bp.m_worldAABB.lowerBound.x + invQ.x * bp.m_bounds[0][p2.upperBounds[0]].value;
					b2.upperBound.y = bp.m_worldAABB.lowerBound.y + invQ.y * bp.m_bounds[1][p2.upperBounds[1]].value;
					
					
					x1.x = 0.5 * (b1.lowerBound.x + b1.upperBound.x);
					x1.y = 0.5 * (b1.lowerBound.y + b1.upperBound.y);
					
					x2.x = 0.5 * (b2.lowerBound.x + b2.upperBound.x);
					x2.y = 0.5 * (b2.lowerBound.y + b2.upperBound.y);
					
					this.m_debugDraw.DrawSegment(x1, x2, color);
					
					index = pair.next;
				}
			}
		}
		
		if (flags & b2DebugDraw.e_aabbBit)
		{
			bp = this.m_broadPhase;
			var worldLower = bp.m_worldAABB.lowerBound;
			var worldUpper = bp.m_worldAABB.upperBound;
			
			
			invQ.Set(1.0 / bp.m_quantizationFactor.x, 1.0 / bp.m_quantizationFactor.y);
			
			color.Set(0.9, 0.3, 0.9);
			for (i = 0; i < b2Settings.b2_maxProxies; ++i)
			{
				var p = bp.m_proxyPool[ i];
				if (p.IsValid() == false)
				{
					continue;
				}
				
				
				b1.lowerBound.x = worldLower.x + invQ.x * bp.m_bounds[0][p.lowerBounds[0]].value;
				b1.lowerBound.y = worldLower.y + invQ.y * bp.m_bounds[1][p.lowerBounds[1]].value;
				b1.upperBound.x = worldLower.x + invQ.x * bp.m_bounds[0][p.upperBounds[0]].value;
				b1.upperBound.y = worldLower.y + invQ.y * bp.m_bounds[1][p.upperBounds[1]].value;
				
				
				vs[0].Set(b1.lowerBound.x, b1.lowerBound.y);
				vs[1].Set(b1.upperBound.x, b1.lowerBound.y);
				vs[2].Set(b1.upperBound.x, b1.upperBound.y);
				vs[3].Set(b1.lowerBound.x, b1.upperBound.y);
				
				this.m_debugDraw.DrawPolygon(vs, 4, color);
			}
			
			
			vs[0].Set(worldLower.x, worldLower.y);
			vs[1].Set(worldUpper.x, worldLower.y);
			vs[2].Set(worldUpper.x, worldUpper.y);
			vs[3].Set(worldLower.x, worldUpper.y);
			this.m_debugDraw.DrawPolygon(vs, 4, new b2Color(0.3, 0.9, 0.9));
		}
		
		if (flags & b2DebugDraw.e_obbBit)
		{
			
			color.Set(0.5, 0.3, 0.5);
			
			for (b = this.m_bodyList; b; b = b.m_next)
			{
				xf = b.m_xf;
				for (s = b.GetShapeList(); s; s = s.m_next)
				{
					if (s.m_type != b2Shape.e_polygonShape)
					{
						continue;
					}
					
					var poly = (s);
					var obb = poly.GetOBB();
					var h = obb.extents;
					
					vs[0].Set(-h.x, -h.y);
					vs[1].Set( h.x, -h.y);
					vs[2].Set( h.x, h.y);
					vs[3].Set(-h.x, h.y);
					
					for (i = 0; i < 4; ++i)
					{
						
						var tMat = obb.R;
						var tVec = vs[i];
						var tX;
						tX = obb.center.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
						vs[i].y = obb.center.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
						vs[i].x = tX;
						
						tMat = xf.R;
						tX = xf.position.x + (tMat.col1.x * tVec.x + tMat.col2.x * tVec.y);
						vs[i].y = xf.position.y + (tMat.col1.y * tVec.x + tMat.col2.y * tVec.y);
						vs[i].x = tX;
					}
					
					this.m_debugDraw.DrawPolygon(vs, 4, color);
				}
			}
		}
		
		if (flags & b2DebugDraw.e_centerOfMassBit)
		{
			for (b = this.m_bodyList; b; b = b.m_next)
			{
				xf = b2World.s_xf;
				xf.R = b.m_xf.R;
				xf.position = b.GetWorldCenter();
				this.m_debugDraw.DrawXForm(xf);
			}
		}
	}
exports.b2World = b2World;

},{}],5:[function(require,module,exports){
// Uses Node, AMD or browser globals to create a module.

// If you want something that will work in other stricter CommonJS environments,
// or if you need to create a circular dependency, see commonJsStrict.js

// Defines a module "returnExports" that depends another module called "b".
// Note that the name of the module is implied by the file name. It is best
// if the file name and the exported global have matching names.

// If the 'b' module also uses this type of boilerplate, then
// in the browser, it will create a global .b that is used below.

// If you do not want to support the browser global path, then you
// can remove the `root` use and the passing `this` as the first arg to
// the top function.

(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else {
        // Browser globals
        root.returnExports = factory();
    }
}(this, function () {/*!
 * jQuery JavaScript Library v1.8.1
 * http://jquery.com/
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: Thu Aug 30 2012 17:17:22 GMT-0400 (Eastern Daylight Time)
 */
return (function( window, undefined ) {
var
	// A central reference to the root jQuery(document)
	rootjQuery,

	// The deferred used on DOM ready
	readyList,

	// Use the correct document accordingly with window argument (sandbox)
	document = window.document,
	location = window.location,
	navigator = window.navigator,

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$,

	// Save a reference to some core methods
	core_push = Array.prototype.push,
	core_slice = Array.prototype.slice,
	core_indexOf = Array.prototype.indexOf,
	core_toString = Object.prototype.toString,
	core_hasOwn = Object.prototype.hasOwnProperty,
	core_trim = String.prototype.trim,

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		return new jQuery.fn.init( selector, context, rootjQuery );
	},

	// Used for matching numbers
	core_pnum = /[\-+]?(?:\d*\.|)\d+(?:[eE][\-+]?\d+|)/.source,

	// Used for detecting and trimming whitespace
	core_rnotwhite = /\S/,
	core_rspace = /\s+/,

	// Make sure we trim BOM and NBSP (here's looking at you, Safari 5.0 and IE)
	rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	rquickExpr = /^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,

	// Match a standalone tag
	rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>|)$/,

	// JSON RegExp
	rvalidchars = /^[\],:{}\s]*$/,
	rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
	rvalidescape = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,
	rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d\d*\.|)\d+(?:[eE][\-+]?\d+|)/g,

	// Matches dashed string for camelizing
	rmsPrefix = /^-ms-/,
	rdashAlpha = /-([\da-z])/gi,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return ( letter + "" ).toUpperCase();
	},

	// The ready event handler and self cleanup method
	DOMContentLoaded = function() {
		if ( document.addEventListener ) {
			document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
			jQuery.ready();
		} else if ( document.readyState === "complete" ) {
			// we're here because readyState === "complete" in oldIE
			// which is good enough for us to call the dom ready!
			document.detachEvent( "onreadystatechange", DOMContentLoaded );
			jQuery.ready();
		}
	},

	// [[Class]] -> type pairs
	class2type = {};

jQuery.fn = jQuery.prototype = {
	constructor: jQuery,
	init: function( selector, context, rootjQuery ) {
		var match, elem, ret, doc;

		// Handle $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Handle $(DOMElement)
		if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;
					doc = ( context && context.nodeType ? context.ownerDocument || context : document );

					// scripts is true for back-compat
					selector = jQuery.parseHTML( match[1], doc, true );
					if ( rsingleTag.test( match[1] ) && jQuery.isPlainObject( context ) ) {
						this.attr.call( selector, context, true );
					}

					return jQuery.merge( this, selector );

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE and Opera return items
						// by name instead of ID
						if ( elem.id !== match[2] ) {
							return rootjQuery.find( selector );
						}

						// Otherwise, we inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return rootjQuery.ready( selector );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	},

	// Start with an empty selector
	selector: "",

	// The current version of jQuery being used
	jquery: "1.8.1",

	// The default length of a jQuery object is 0
	length: 0,

	// The number of elements contained in the matched element set
	size: function() {
		return this.length;
	},

	toArray: function() {
		return core_slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num == null ?

			// Return a 'clean' array
			this.toArray() :

			// Return just the object
			( num < 0 ? this[ this.length + num ] : this[ num ] );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems, name, selector ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		ret.context = this.context;

		if ( name === "find" ) {
			ret.selector = this.selector + ( this.selector ? " " : "" ) + selector;
		} else if ( name ) {
			ret.selector = this.selector + "." + name + "(" + selector + ")";
		}

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	ready: function( fn ) {
		// Add the callback
		jQuery.ready.promise().done( fn );

		return this;
	},

	eq: function( i ) {
		i = +i;
		return i === -1 ?
			this.slice( i ) :
			this.slice( i, i + 1 );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	slice: function() {
		return this.pushStack( core_slice.apply( this, arguments ),
			"slice", core_slice.call(arguments).join(",") );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: core_push,
	sort: [].sort,
	splice: [].splice
};

// Give the init function the jQuery prototype for later instantiation
jQuery.fn.init.prototype = jQuery.fn;

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( length === i ) {
		target = this;
		--i;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	noConflict: function( deep ) {
		if ( window.$ === jQuery ) {
			window.$ = _$;
		}

		if ( deep && window.jQuery === jQuery ) {
			window.jQuery = _jQuery;
		}

		return jQuery;
	},

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
		if ( !document.body ) {
			return setTimeout( jQuery.ready, 1 );
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );

		// Trigger any bound ready events
		if ( jQuery.fn.trigger ) {
			jQuery( document ).trigger("ready").off("ready");
		}
	},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray || function( obj ) {
		return jQuery.type(obj) === "array";
	},

	isWindow: function( obj ) {
		return obj != null && obj == obj.window;
	},

	isNumeric: function( obj ) {
		return !isNaN( parseFloat(obj) ) && isFinite( obj );
	},

	type: function( obj ) {
		return obj == null ?
			String( obj ) :
			class2type[ core_toString.call(obj) ] || "object";
	},

	isPlainObject: function( obj ) {
		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		try {
			// Not own constructor property must be Object
			if ( obj.constructor &&
				!core_hasOwn.call(obj, "constructor") &&
				!core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}
		} catch ( e ) {
			// IE8,9 Will throw exceptions on certain host objects #9897
			return false;
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.

		var key;
		for ( key in obj ) {}

		return key === undefined || core_hasOwn.call( obj, key );
	},

	isEmptyObject: function( obj ) {
		var name;
		for ( name in obj ) {
			return false;
		}
		return true;
	},

	error: function( msg ) {
		throw new Error( msg );
	},

	// data: string of html
	// context (optional): If specified, the fragment will be created in this context, defaults to document
	// scripts (optional): If true, will include scripts passed in the html string
	parseHTML: function( data, context, scripts ) {
		var parsed;
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		if ( typeof context === "boolean" ) {
			scripts = context;
			context = 0;
		}
		context = context || document;

		// Single tag
		if ( (parsed = rsingleTag.exec( data )) ) {
			return [ context.createElement( parsed[1] ) ];
		}

		parsed = jQuery.buildFragment( [ data ], context, scripts ? null : [] );
		return jQuery.merge( [],
			(parsed.cacheable ? jQuery.clone( parsed.fragment ) : parsed.fragment).childNodes );
	},

	parseJSON: function( data ) {
		if ( !data || typeof data !== "string") {
			return null;
		}

		// Make sure leading/trailing whitespace is removed (IE can't handle it)
		data = jQuery.trim( data );

		// Attempt to parse using the native JSON parser first
		if ( window.JSON && window.JSON.parse ) {
			return window.JSON.parse( data );
		}

		// Make sure the incoming data is actual JSON
		// Logic borrowed from http://json.org/json2.js
		if ( rvalidchars.test( data.replace( rvalidescape, "@" )
			.replace( rvalidtokens, "]" )
			.replace( rvalidbraces, "")) ) {

			return ( new Function( "return " + data ) )();

		}
		jQuery.error( "Invalid JSON: " + data );
	},

	// Cross-browser xml parsing
	parseXML: function( data ) {
		var xml, tmp;
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		try {
			if ( window.DOMParser ) { // Standard
				tmp = new DOMParser();
				xml = tmp.parseFromString( data , "text/xml" );
			} else { // IE
				xml = new ActiveXObject( "Microsoft.XMLDOM" );
				xml.async = "false";
				xml.loadXML( data );
			}
		} catch( e ) {
			xml = undefined;
		}
		if ( !xml || !xml.documentElement || xml.getElementsByTagName( "parsererror" ).length ) {
			jQuery.error( "Invalid XML: " + data );
		}
		return xml;
	},

	noop: function() {},

	// Evaluates a script in a global context
	// Workarounds based on findings by Jim Driscoll
	// http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
	globalEval: function( data ) {
		if ( data && core_rnotwhite.test( data ) ) {
			// We use execScript on Internet Explorer
			// We use an anonymous function so that context is window
			// rather than jQuery in Firefox
			( window.execScript || function( data ) {
				window[ "eval" ].call( window, data );
			} )( data );
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toUpperCase() === name.toUpperCase();
	},

	// args is for internal usage only
	each: function( obj, callback, args ) {
		var name,
			i = 0,
			length = obj.length,
			isObj = length === undefined || jQuery.isFunction( obj );

		if ( args ) {
			if ( isObj ) {
				for ( name in obj ) {
					if ( callback.apply( obj[ name ], args ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.apply( obj[ i++ ], args ) === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isObj ) {
				for ( name in obj ) {
					if ( callback.call( obj[ name ], name, obj[ name ] ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.call( obj[ i ], i, obj[ i++ ] ) === false ) {
						break;
					}
				}
			}
		}

		return obj;
	},

	// Use native String.trim function wherever possible
	trim: core_trim && !core_trim.call("\uFEFF\xA0") ?
		function( text ) {
			return text == null ?
				"" :
				core_trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				text.toString().replace( rtrim, "" );
		},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var type,
			ret = results || [];

		if ( arr != null ) {
			// The window, strings (and functions) also have 'length'
			// Tweaked logic slightly to handle Blackberry 4.7 RegExp issues #6930
			type = jQuery.type( arr );

			if ( arr.length == null || type === "string" || type === "function" || type === "regexp" || jQuery.isWindow( arr ) ) {
				core_push.call( ret, arr );
			} else {
				jQuery.merge( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		var len;

		if ( arr ) {
			if ( core_indexOf ) {
				return core_indexOf.call( arr, elem, i );
			}

			len = arr.length;
			i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

			for ( ; i < len; i++ ) {
				// Skip accessing in sparse arrays
				if ( i in arr && arr[ i ] === elem ) {
					return i;
				}
			}
		}

		return -1;
	},

	merge: function( first, second ) {
		var l = second.length,
			i = first.length,
			j = 0;

		if ( typeof l === "number" ) {
			for ( ; j < l; j++ ) {
				first[ i++ ] = second[ j ];
			}

		} else {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, inv ) {
		var retVal,
			ret = [],
			i = 0,
			length = elems.length;
		inv = !!inv;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			retVal = !!callback( elems[ i ], i );
			if ( inv !== retVal ) {
				ret.push( elems[ i ] );
			}
		}

		return ret;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value, key,
			ret = [],
			i = 0,
			length = elems.length,
			// jquery objects are treated as arrays
			isArray = elems instanceof jQuery || length !== undefined && typeof length === "number" && ( ( length > 0 && elems[ 0 ] && elems[ length -1 ] ) || length === 0 || jQuery.isArray( elems ) ) ;

		// Go through the array, translating each of the items to their
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}

		// Go through every key on the object,
		} else {
			for ( key in elems ) {
				value = callback( elems[ key ], key, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}
		}

		// Flatten any nested arrays
		return ret.concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		var tmp, args, proxy;

		if ( typeof context === "string" ) {
			tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		args = core_slice.call( arguments, 2 );
		proxy = function() {
			return fn.apply( context, args.concat( core_slice.call( arguments ) ) );
		};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || proxy.guid || jQuery.guid++;

		return proxy;
	},

	// Multifunctional method to get and set values of a collection
	// The value/s can optionally be executed if it's a function
	access: function( elems, fn, key, value, chainable, emptyGet, pass ) {
		var exec,
			bulk = key == null,
			i = 0,
			length = elems.length;

		// Sets many values
		if ( key && typeof key === "object" ) {
			for ( i in key ) {
				jQuery.access( elems, fn, i, key[i], 1, emptyGet, value );
			}
			chainable = 1;

		// Sets one value
		} else if ( value !== undefined ) {
			// Optionally, function values get executed if exec is true
			exec = pass === undefined && jQuery.isFunction( value );

			if ( bulk ) {
				// Bulk operations only iterate when executing function values
				if ( exec ) {
					exec = fn;
					fn = function( elem, key, value ) {
						return exec.call( jQuery( elem ), value );
					};

				// Otherwise they run against the entire set
				} else {
					fn.call( elems, value );
					fn = null;
				}
			}

			if ( fn ) {
				for (; i < length; i++ ) {
					fn( elems[i], key, exec ? value.call( elems[i], i, fn( elems[i], key ) ) : value, pass );
				}
			}

			chainable = 1;
		}

		return chainable ?
			elems :

			// Gets
			bulk ?
				fn.call( elems ) :
				length ? fn( elems[0], key ) : emptyGet;
	},

	now: function() {
		return ( new Date() ).getTime();
	}
});

jQuery.ready.promise = function( obj ) {
	if ( !readyList ) {

		readyList = jQuery.Deferred();

		// Catch cases where $(document).ready() is called after the browser event has already occurred.
		// we once tried to use readyState "interactive" here, but it caused issues like the one
		// discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			setTimeout( jQuery.ready, 1 );

		// Standards-based browsers support DOMContentLoaded
		} else if ( document.addEventListener ) {
			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", jQuery.ready, false );

		// If IE event model is used
		} else {
			// Ensure firing before onload, maybe late but safe also for iframes
			document.attachEvent( "onreadystatechange", DOMContentLoaded );

			// A fallback to window.onload, that will always work
			window.attachEvent( "onload", jQuery.ready );

			// If IE and not a frame
			// continually check to see if the document is ready
			var top = false;

			try {
				top = window.frameElement == null && document.documentElement;
			} catch(e) {}

			if ( top && top.doScroll ) {
				(function doScrollCheck() {
					if ( !jQuery.isReady ) {

						try {
							// Use the trick by Diego Perini
							// http://javascript.nwbox.com/IEContentLoaded/
							top.doScroll("left");
						} catch(e) {
							return setTimeout( doScrollCheck, 50 );
						}

						// and execute any waiting functions
						jQuery.ready();
					}
				})();
			}
		}
	}
	return readyList.promise( obj );
};

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

// All jQuery objects should point back to these
rootjQuery = jQuery(document);
// String to Object options format cache
var optionsCache = {};

// Convert String-formatted options into Object-formatted ones and store in cache
function createOptions( options ) {
	var object = optionsCache[ options ] = {};
	jQuery.each( options.split( core_rspace ), function( _, flag ) {
		object[ flag ] = true;
	});
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		( optionsCache[ options ] || createOptions( options ) ) :
		jQuery.extend( {}, options );

	var // Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = !options.once && [],
		// Fire callbacks
		fire = function( data ) {
			memory = options.memory && data;
			fired = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			firing = true;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
					memory = false; // To prevent further calls using add
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( stack ) {
					if ( stack.length ) {
						fire( stack.shift() );
					}
				} else if ( memory ) {
					list = [];
				} else {
					self.disable();
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					// First, we save the current length
					var start = list.length;
					(function add( args ) {
						jQuery.each( args, function( _, arg ) {
							var type = jQuery.type( arg );
							if ( type === "function" && ( !options.unique || !self.has( arg ) ) ) {
								list.push( arg );
							} else if ( arg && arg.length && type !== "string" ) {
								// Inspect recursively
								add( arg );
							}
						});
					})( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away
					} else if ( memory ) {
						firingStart = start;
						fire( memory );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );
							// Handle firing indexes
							if ( firing ) {
								if ( index <= firingLength ) {
									firingLength--;
								}
								if ( index <= firingIndex ) {
									firingIndex--;
								}
							}
						}
					});
				}
				return this;
			},
			// Control if a given callback is in the list
			has: function( fn ) {
				return jQuery.inArray( fn, list ) > -1;
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				args = args || [];
				args = [ context, args.slice ? args.slice() : args ];
				if ( list && ( !fired || stack ) ) {
					if ( firing ) {
						stack.push( args );
					} else {
						fire( args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};
jQuery.extend({

	Deferred: function( func ) {
		var tuples = [
				// action, add listener, listener list, final state
				[ "resolve", "done", jQuery.Callbacks("once memory"), "resolved" ],
				[ "reject", "fail", jQuery.Callbacks("once memory"), "rejected" ],
				[ "notify", "progress", jQuery.Callbacks("memory") ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				then: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( tuples, function( i, tuple ) {
							var action = tuple[ 0 ],
								fn = fns[ i ];
							// deferred[ done | fail | progress ] for forwarding actions to newDefer
							deferred[ tuple[1] ]( jQuery.isFunction( fn ) ?
								function() {
									var returned = fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise()
											.done( newDefer.resolve )
											.fail( newDefer.reject )
											.progress( newDefer.notify );
									} else {
										newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
									}
								} :
								newDefer[ action ]
							);
						});
						fns = null;
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return typeof obj === "object" ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Keep pipe for back-compat
		promise.pipe = promise.then;

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 3 ];

			// promise[ done | fail | progress ] = list.add
			promise[ tuple[1] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(function() {
					// state = [ resolved | rejected ]
					state = stateString;

				// [ reject_list | resolve_list ].disable; progress_list.lock
				}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
			}

			// deferred[ resolve | reject | notify ] = list.fire
			deferred[ tuple[0] ] = list.fire;
			deferred[ tuple[0] + "With" ] = list.fireWith;
		});

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( subordinate /* , ..., subordinateN */ ) {
		var i = 0,
			resolveValues = core_slice.call( arguments ),
			length = resolveValues.length,

			// the count of uncompleted subordinates
			remaining = length !== 1 || ( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

			// the master Deferred. If resolveValues consist of only a single Deferred, just use that.
			deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

			// Update function for both resolve and progress values
			updateFunc = function( i, contexts, values ) {
				return function( value ) {
					contexts[ i ] = this;
					values[ i ] = arguments.length > 1 ? core_slice.call( arguments ) : value;
					if( values === progressValues ) {
						deferred.notifyWith( contexts, values );
					} else if ( !( --remaining ) ) {
						deferred.resolveWith( contexts, values );
					}
				};
			},

			progressValues, progressContexts, resolveContexts;

		// add listeners to Deferred subordinates; treat others as resolved
		if ( length > 1 ) {
			progressValues = new Array( length );
			progressContexts = new Array( length );
			resolveContexts = new Array( length );
			for ( ; i < length; i++ ) {
				if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
					resolveValues[ i ].promise()
						.done( updateFunc( i, resolveContexts, resolveValues ) )
						.fail( deferred.reject )
						.progress( updateFunc( i, progressContexts, progressValues ) );
				} else {
					--remaining;
				}
			}
		}

		// if we're not waiting on anything, resolve the master
		if ( !remaining ) {
			deferred.resolveWith( resolveContexts, resolveValues );
		}

		return deferred.promise();
	}
});
jQuery.support = (function() {

	var support,
		all,
		a,
		select,
		opt,
		input,
		fragment,
		eventName,
		i,
		isSupported,
		clickFn,
		div = document.createElement("div");

	// Preliminary tests
	div.setAttribute( "className", "t" );
	div.innerHTML = "  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>";

	all = div.getElementsByTagName("*");
	a = div.getElementsByTagName("a")[ 0 ];
	a.style.cssText = "top:1px;float:left;opacity:.5";

	// Can't get basic test support
	if ( !all || !all.length || !a ) {
		return {};
	}

	// First batch of supports tests
	select = document.createElement("select");
	opt = select.appendChild( document.createElement("option") );
	input = div.getElementsByTagName("input")[ 0 ];

	support = {
		// IE strips leading whitespace when .innerHTML is used
		leadingWhitespace: ( div.firstChild.nodeType === 3 ),

		// Make sure that tbody elements aren't automatically inserted
		// IE will insert them into empty tables
		tbody: !div.getElementsByTagName("tbody").length,

		// Make sure that link elements get serialized correctly by innerHTML
		// This requires a wrapper element in IE
		htmlSerialize: !!div.getElementsByTagName("link").length,

		// Get the style information from getAttribute
		// (IE uses .cssText instead)
		style: /top/.test( a.getAttribute("style") ),

		// Make sure that URLs aren't manipulated
		// (IE normalizes it by default)
		hrefNormalized: ( a.getAttribute("href") === "/a" ),

		// Make sure that element opacity exists
		// (IE uses filter instead)
		// Use a regex to work around a WebKit issue. See #5145
		opacity: /^0.5/.test( a.style.opacity ),

		// Verify style float existence
		// (IE uses styleFloat instead of cssFloat)
		cssFloat: !!a.style.cssFloat,

		// Make sure that if no value is specified for a checkbox
		// that it defaults to "on".
		// (WebKit defaults to "" instead)
		checkOn: ( input.value === "on" ),

		// Make sure that a selected-by-default option has a working selected property.
		// (WebKit defaults to false instead of true, IE too, if it's in an optgroup)
		optSelected: opt.selected,

		// Test setAttribute on camelCase class. If it works, we need attrFixes when doing get/setAttribute (ie6/7)
		getSetAttribute: div.className !== "t",

		// Tests for enctype support on a form(#6743)
		enctype: !!document.createElement("form").enctype,

		// Makes sure cloning an html5 element does not cause problems
		// Where outerHTML is undefined, this still works
		html5Clone: document.createElement("nav").cloneNode( true ).outerHTML !== "<:nav></:nav>",

		// jQuery.support.boxModel DEPRECATED in 1.8 since we don't support Quirks Mode
		boxModel: ( document.compatMode === "CSS1Compat" ),

		// Will be defined later
		submitBubbles: true,
		changeBubbles: true,
		focusinBubbles: false,
		deleteExpando: true,
		noCloneEvent: true,
		inlineBlockNeedsLayout: false,
		shrinkWrapBlocks: false,
		reliableMarginRight: true,
		boxSizingReliable: true,
		pixelPosition: false
	};

	// Make sure checked status is properly cloned
	input.checked = true;
	support.noCloneChecked = input.cloneNode( true ).checked;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Test to see if it's possible to delete an expando from an element
	// Fails in Internet Explorer
	try {
		delete div.test;
	} catch( e ) {
		support.deleteExpando = false;
	}

	if ( !div.addEventListener && div.attachEvent && div.fireEvent ) {
		div.attachEvent( "onclick", clickFn = function() {
			// Cloning a node shouldn't copy over any
			// bound event handlers (IE does this)
			support.noCloneEvent = false;
		});
		div.cloneNode( true ).fireEvent("onclick");
		div.detachEvent( "onclick", clickFn );
	}

	// Check if a radio maintains its value
	// after being appended to the DOM
	input = document.createElement("input");
	input.value = "t";
	input.setAttribute( "type", "radio" );
	support.radioValue = input.value === "t";

	input.setAttribute( "checked", "checked" );

	// #11217 - WebKit loses check when the name is after the checked attribute
	input.setAttribute( "name", "t" );

	div.appendChild( input );
	fragment = document.createDocumentFragment();
	fragment.appendChild( div.lastChild );

	// WebKit doesn't clone checked state correctly in fragments
	support.checkClone = fragment.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Check if a disconnected checkbox will retain its checked
	// value of true after appended to the DOM (IE6/7)
	support.appendChecked = input.checked;

	fragment.removeChild( input );
	fragment.appendChild( div );

	// Technique from Juriy Zaytsev
	// http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
	// We only care about the case where non-standard event systems
	// are used, namely in IE. Short-circuiting here helps us to
	// avoid an eval call (in setAttribute) which can cause CSP
	// to go haywire. See: https://developer.mozilla.org/en/Security/CSP
	if ( div.attachEvent ) {
		for ( i in {
			submit: true,
			change: true,
			focusin: true
		}) {
			eventName = "on" + i;
			isSupported = ( eventName in div );
			if ( !isSupported ) {
				div.setAttribute( eventName, "return;" );
				isSupported = ( typeof div[ eventName ] === "function" );
			}
			support[ i + "Bubbles" ] = isSupported;
		}
	}

	// Run tests that need a body at doc ready
	jQuery(function() {
		var container, div, tds, marginDiv,
			divReset = "padding:0;margin:0;border:0;display:block;overflow:hidden;",
			body = document.getElementsByTagName("body")[0];

		if ( !body ) {
			// Return for frameset docs that don't have a body
			return;
		}

		container = document.createElement("div");
		container.style.cssText = "visibility:hidden;border:0;width:0;height:0;position:static;top:0;margin-top:1px";
		body.insertBefore( container, body.firstChild );

		// Construct the test element
		div = document.createElement("div");
		container.appendChild( div );

		// Check if table cells still have offsetWidth/Height when they are set
		// to display:none and there are still other visible table cells in a
		// table row; if so, offsetWidth/Height are not reliable for use when
		// determining if an element has been hidden directly using
		// display:none (it is still safe to use offsets if a parent element is
		// hidden; don safety goggles and see bug #4512 for more information).
		// (only IE 8 fails this test)
		div.innerHTML = "<table><tr><td></td><td>t</td></tr></table>";
		tds = div.getElementsByTagName("td");
		tds[ 0 ].style.cssText = "padding:0;margin:0;border:0;display:none";
		isSupported = ( tds[ 0 ].offsetHeight === 0 );

		tds[ 0 ].style.display = "";
		tds[ 1 ].style.display = "none";

		// Check if empty table cells still have offsetWidth/Height
		// (IE <= 8 fail this test)
		support.reliableHiddenOffsets = isSupported && ( tds[ 0 ].offsetHeight === 0 );

		// Check box-sizing and margin behavior
		div.innerHTML = "";
		div.style.cssText = "box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;";
		support.boxSizing = ( div.offsetWidth === 4 );
		support.doesNotIncludeMarginInBodyOffset = ( body.offsetTop !== 1 );

		// NOTE: To any future maintainer, we've window.getComputedStyle
		// because jsdom on node.js will break without it.
		if ( window.getComputedStyle ) {
			support.pixelPosition = ( window.getComputedStyle( div, null ) || {} ).top !== "1%";
			support.boxSizingReliable = ( window.getComputedStyle( div, null ) || { width: "4px" } ).width === "4px";

			// Check if div with explicit width and no margin-right incorrectly
			// gets computed margin-right based on width of container. For more
			// info see bug #3333
			// Fails in WebKit before Feb 2011 nightlies
			// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
			marginDiv = document.createElement("div");
			marginDiv.style.cssText = div.style.cssText = divReset;
			marginDiv.style.marginRight = marginDiv.style.width = "0";
			div.style.width = "1px";
			div.appendChild( marginDiv );
			support.reliableMarginRight =
				!parseFloat( ( window.getComputedStyle( marginDiv, null ) || {} ).marginRight );
		}

		if ( typeof div.style.zoom !== "undefined" ) {
			// Check if natively block-level elements act like inline-block
			// elements when setting their display to 'inline' and giving
			// them layout
			// (IE < 8 does this)
			div.innerHTML = "";
			div.style.cssText = divReset + "width:1px;padding:1px;display:inline;zoom:1";
			support.inlineBlockNeedsLayout = ( div.offsetWidth === 3 );

			// Check if elements with layout shrink-wrap their children
			// (IE 6 does this)
			div.style.display = "block";
			div.style.overflow = "visible";
			div.innerHTML = "<div></div>";
			div.firstChild.style.width = "5px";
			support.shrinkWrapBlocks = ( div.offsetWidth !== 3 );

			container.style.zoom = 1;
		}

		// Null elements to avoid leaks in IE
		body.removeChild( container );
		container = div = tds = marginDiv = null;
	});

	// Null elements to avoid leaks in IE
	fragment.removeChild( div );
	all = a = select = opt = input = fragment = div = null;

	return support;
})();
var rbrace = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/,
	rmultiDash = /([A-Z])/g;

jQuery.extend({
	cache: {},

	deletedIds: [],

	// Please use with caution
	uuid: 0,

	// Unique for each copy of jQuery on the page
	// Non-digits removed to match rinlinejQuery
	expando: "jQuery" + ( jQuery.fn.jquery + Math.random() ).replace( /\D/g, "" ),

	// The following elements throw uncatchable exceptions if you
	// attempt to add expando properties to them.
	noData: {
		"embed": true,
		// Ban all objects except for Flash (which handle expandos)
		"object": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",
		"applet": true
	},

	hasData: function( elem ) {
		elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];
		return !!elem && !isEmptyDataObject( elem );
	},

	data: function( elem, name, data, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var thisCache, ret,
			internalKey = jQuery.expando,
			getByName = typeof name === "string",

			// We have to handle DOM nodes and JS objects differently because IE6-7
			// can't GC object references properly across the DOM-JS boundary
			isNode = elem.nodeType,

			// Only DOM nodes need the global jQuery cache; JS object data is
			// attached directly to the object so GC can occur automatically
			cache = isNode ? jQuery.cache : elem,

			// Only defining an ID for JS objects if its cache already exists allows
			// the code to shortcut on the same path as a DOM node with no cache
			id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey;

		// Avoid doing any more work than we need to when trying to get data on an
		// object that has no data at all
		if ( (!id || !cache[id] || (!pvt && !cache[id].data)) && getByName && data === undefined ) {
			return;
		}

		if ( !id ) {
			// Only DOM nodes need a new unique ID for each element since their data
			// ends up in the global cache
			if ( isNode ) {
				elem[ internalKey ] = id = jQuery.deletedIds.pop() || ++jQuery.uuid;
			} else {
				id = internalKey;
			}
		}

		if ( !cache[ id ] ) {
			cache[ id ] = {};

			// Avoids exposing jQuery metadata on plain JS objects when the object
			// is serialized using JSON.stringify
			if ( !isNode ) {
				cache[ id ].toJSON = jQuery.noop;
			}
		}

		// An object can be passed to jQuery.data instead of a key/value pair; this gets
		// shallow copied over onto the existing cache
		if ( typeof name === "object" || typeof name === "function" ) {
			if ( pvt ) {
				cache[ id ] = jQuery.extend( cache[ id ], name );
			} else {
				cache[ id ].data = jQuery.extend( cache[ id ].data, name );
			}
		}

		thisCache = cache[ id ];

		// jQuery data() is stored in a separate object inside the object's internal data
		// cache in order to avoid key collisions between internal data and user-defined
		// data.
		if ( !pvt ) {
			if ( !thisCache.data ) {
				thisCache.data = {};
			}

			thisCache = thisCache.data;
		}

		if ( data !== undefined ) {
			thisCache[ jQuery.camelCase( name ) ] = data;
		}

		// Check for both converted-to-camel and non-converted data property names
		// If a data property was specified
		if ( getByName ) {

			// First Try to find as-is property data
			ret = thisCache[ name ];

			// Test for null|undefined property data
			if ( ret == null ) {

				// Try to find the camelCased property
				ret = thisCache[ jQuery.camelCase( name ) ];
			}
		} else {
			ret = thisCache;
		}

		return ret;
	},

	removeData: function( elem, name, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var thisCache, i, l,

			isNode = elem.nodeType,

			// See jQuery.data for more information
			cache = isNode ? jQuery.cache : elem,
			id = isNode ? elem[ jQuery.expando ] : jQuery.expando;

		// If there is already no cache entry for this object, there is no
		// purpose in continuing
		if ( !cache[ id ] ) {
			return;
		}

		if ( name ) {

			thisCache = pvt ? cache[ id ] : cache[ id ].data;

			if ( thisCache ) {

				// Support array or space separated string names for data keys
				if ( !jQuery.isArray( name ) ) {

					// try the string as a key before any manipulation
					if ( name in thisCache ) {
						name = [ name ];
					} else {

						// split the camel cased version by spaces unless a key with the spaces exists
						name = jQuery.camelCase( name );
						if ( name in thisCache ) {
							name = [ name ];
						} else {
							name = name.split(" ");
						}
					}
				}

				for ( i = 0, l = name.length; i < l; i++ ) {
					delete thisCache[ name[i] ];
				}

				// If there is no data left in the cache, we want to continue
				// and let the cache object itself get destroyed
				if ( !( pvt ? isEmptyDataObject : jQuery.isEmptyObject )( thisCache ) ) {
					return;
				}
			}
		}

		// See jQuery.data for more information
		if ( !pvt ) {
			delete cache[ id ].data;

			// Don't destroy the parent cache unless the internal data object
			// had been the only thing left in it
			if ( !isEmptyDataObject( cache[ id ] ) ) {
				return;
			}
		}

		// Destroy the cache
		if ( isNode ) {
			jQuery.cleanData( [ elem ], true );

		// Use delete when supported for expandos or `cache` is not a window per isWindow (#10080)
		} else if ( jQuery.support.deleteExpando || cache != cache.window ) {
			delete cache[ id ];

		// When all else fails, null
		} else {
			cache[ id ] = null;
		}
	},

	// For internal use only.
	_data: function( elem, name, data ) {
		return jQuery.data( elem, name, data, true );
	},

	// A method for determining if a DOM node can handle the data expando
	acceptData: function( elem ) {
		var noData = elem.nodeName && jQuery.noData[ elem.nodeName.toLowerCase() ];

		// nodes accept data unless otherwise specified; rejection can be conditional
		return !noData || noData !== true && elem.getAttribute("classid") === noData;
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var parts, part, attr, name, l,
			elem = this[0],
			i = 0,
			data = null;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = jQuery.data( elem );

				if ( elem.nodeType === 1 && !jQuery._data( elem, "parsedAttrs" ) ) {
					attr = elem.attributes;
					for ( l = attr.length; i < l; i++ ) {
						name = attr[i].name;

						if ( name.indexOf( "data-" ) === 0 ) {
							name = jQuery.camelCase( name.substring(5) );

							dataAttr( elem, name, data[ name ] );
						}
					}
					jQuery._data( elem, "parsedAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				jQuery.data( this, key );
			});
		}

		parts = key.split( ".", 2 );
		parts[1] = parts[1] ? "." + parts[1] : "";
		part = parts[1] + "!";

		return jQuery.access( this, function( value ) {

			if ( value === undefined ) {
				data = this.triggerHandler( "getData" + part, [ parts[0] ] );

				// Try to fetch any internally stored data first
				if ( data === undefined && elem ) {
					data = jQuery.data( elem, key );
					data = dataAttr( elem, key, data );
				}

				return data === undefined && parts[1] ?
					this.data( parts[0] ) :
					data;
			}

			parts[1] = value;
			this.each(function() {
				var self = jQuery( this );

				self.triggerHandler( "setData" + part, parts );
				jQuery.data( this, key, value );
				self.triggerHandler( "changeData" + part, parts );
			});
		}, null, value, arguments.length > 1, null, false );
	},

	removeData: function( key ) {
		return this.each(function() {
			jQuery.removeData( this, key );
		});
	}
});

function dataAttr( elem, key, data ) {
	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {

		var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
				data === "false" ? false :
				data === "null" ? null :
				// Only convert to a number if it doesn't change the string
				+data + "" === data ? +data :
				rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			jQuery.data( elem, key, data );

		} else {
			data = undefined;
		}
	}

	return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
	var name;
	for ( name in obj ) {

		// if the public data object is empty, the private is still empty
		if ( name === "data" && jQuery.isEmptyObject( obj[name] ) ) {
			continue;
		}
		if ( name !== "toJSON" ) {
			return false;
		}
	}

	return true;
}
jQuery.extend({
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = jQuery._data( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || jQuery.isArray(data) ) {
					queue = jQuery._data( elem, type, jQuery.makeArray(data) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// not intended for public consumption - generates a queueHooks object, or returns the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return jQuery._data( elem, key ) || jQuery._data( elem, key, {
			empty: jQuery.Callbacks("once memory").add(function() {
				jQuery.removeData( elem, type + "queue", true );
				jQuery.removeData( elem, key, true );
			})
		});
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				// ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	// Based off of the plugin by Clint Helfers, with permission.
	// http://blindsignals.com/index.php/2009/07/jquery-delay/
	delay: function( time, type ) {
		time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
		type = type || "fx";

		return this.queue( type, function( next, hooks ) {
			var timeout = setTimeout( next, time );
			hooks.stop = function() {
				clearTimeout( timeout );
			};
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while( i-- ) {
			tmp = jQuery._data( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
});
var nodeHook, boolHook, fixSpecified,
	rclass = /[\t\r\n]/g,
	rreturn = /\r/g,
	rtype = /^(?:button|input)$/i,
	rfocusable = /^(?:button|input|object|select|textarea)$/i,
	rclickable = /^a(?:rea|)$/i,
	rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,
	getSetAttribute = jQuery.support.getSetAttribute;

jQuery.fn.extend({
	attr: function( name, value ) {
		return jQuery.access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	},

	prop: function( name, value ) {
		return jQuery.access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		name = jQuery.propFix[ name ] || name;
		return this.each(function() {
			// try/catch handles cases where IE balks (such as removing a property on window)
			try {
				this[ name ] = undefined;
				delete this[ name ];
			} catch( e ) {}
		});
	},

	addClass: function( value ) {
		var classNames, i, l, elem,
			setClass, c, cl;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call(this, j, this.className) );
			});
		}

		if ( value && typeof value === "string" ) {
			classNames = value.split( core_rspace );

			for ( i = 0, l = this.length; i < l; i++ ) {
				elem = this[ i ];

				if ( elem.nodeType === 1 ) {
					if ( !elem.className && classNames.length === 1 ) {
						elem.className = value;

					} else {
						setClass = " " + elem.className + " ";

						for ( c = 0, cl = classNames.length; c < cl; c++ ) {
							if ( !~setClass.indexOf( " " + classNames[ c ] + " " ) ) {
								setClass += classNames[ c ] + " ";
							}
						}
						elem.className = jQuery.trim( setClass );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var removes, className, elem, c, cl, i, l;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call(this, j, this.className) );
			});
		}
		if ( (value && typeof value === "string") || value === undefined ) {
			removes = ( value || "" ).split( core_rspace );

			for ( i = 0, l = this.length; i < l; i++ ) {
				elem = this[ i ];
				if ( elem.nodeType === 1 && elem.className ) {

					className = (" " + elem.className + " ").replace( rclass, " " );

					// loop over each item in the removal list
					for ( c = 0, cl = removes.length; c < cl; c++ ) {
						// Remove until there is nothing to remove,
						while ( className.indexOf(" " + removes[ c ] + " ") > -1 ) {
							className = className.replace( " " + removes[ c ] + " " , " " );
						}
					}
					elem.className = value ? jQuery.trim( className ) : "";
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isBool = typeof stateVal === "boolean";

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					state = stateVal,
					classNames = value.split( core_rspace );

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space separated list
					state = isBool ? state : !self.hasClass( className );
					self[ state ? "addClass" : "removeClass" ]( className );
				}

			} else if ( type === "undefined" || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					jQuery._data( this, "__className__", this.className );
				}

				// toggle whole className
				this.className = this.className || value === false ? "" : jQuery._data( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) > -1 ) {
				return true;
			}
		}

		return false;
	},

	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var val,
				self = jQuery(this);

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, self.val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";
			} else if ( typeof val === "number" ) {
				val += "";
			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map(val, function ( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				// attributes.value is undefined in Blackberry 4.7 but
				// uses .value. See #6932
				var val = elem.attributes.value;
				return !val || val.specified ? elem.value : elem.text;
			}
		},
		select: {
			get: function( elem ) {
				var value, i, max, option,
					index = elem.selectedIndex,
					values = [],
					options = elem.options,
					one = elem.type === "select-one";

				// Nothing was selected
				if ( index < 0 ) {
					return null;
				}

				// Loop through all the selected options
				i = one ? index : 0;
				max = one ? index + 1 : options.length;
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Don't return options that are disabled or in a disabled optgroup
					if ( option.selected && (jQuery.support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) &&
							(!option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" )) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				// Fixes Bug #2551 -- select.val() broken in IE after form.reset()
				if ( one && !values.length && options.length ) {
					return jQuery( options[ index ] ).val();
				}

				return values;
			},

			set: function( elem, value ) {
				var values = jQuery.makeArray( value );

				jQuery(elem).find("option").each(function() {
					this.selected = jQuery.inArray( jQuery(this).val(), values ) >= 0;
				});

				if ( !values.length ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	},

	// Unused in 1.8, left in so attrFn-stabbers won't die; remove in 1.9
	attrFn: {},

	attr: function( elem, name, value, pass ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( pass && jQuery.isFunction( jQuery.fn[ name ] ) ) {
			return jQuery( elem )[ name ]( value );
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( notxml ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] || ( rboolean.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;

			} else if ( hooks && "set" in hooks && notxml && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, "" + value );
				return value;
			}

		} else if ( hooks && "get" in hooks && notxml && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {

			ret = elem.getAttribute( name );

			// Non-existent attributes return null, we normalize to undefined
			return ret === null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var propName, attrNames, name, isBool,
			i = 0;

		if ( value && elem.nodeType === 1 ) {

			attrNames = value.split( core_rspace );

			for ( ; i < attrNames.length; i++ ) {
				name = attrNames[ i ];

				if ( name ) {
					propName = jQuery.propFix[ name ] || name;
					isBool = rboolean.test( name );

					// See #9699 for explanation of this approach (setting first, then removal)
					// Do not do this for boolean attributes (see #10870)
					if ( !isBool ) {
						jQuery.attr( elem, name, "" );
					}
					elem.removeAttribute( getSetAttribute ? name : propName );

					// Set corresponding property to false for boolean attributes
					if ( isBool && propName in elem ) {
						elem[ propName ] = false;
					}
				}
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				// We can't allow the type property to be changed (since it causes problems in IE)
				if ( rtype.test( elem.nodeName ) && elem.parentNode ) {
					jQuery.error( "type property can't be changed" );
				} else if ( !jQuery.support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to it's default in case type is set after value
					// This is for element creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		},
		// Use the value property for back compat
		// Use the nodeHook for button elements in IE6/7 (#1954)
		value: {
			get: function( elem, name ) {
				if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
					return nodeHook.get( elem, name );
				}
				return name in elem ?
					elem.value :
					null;
			},
			set: function( elem, value, name ) {
				if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
					return nodeHook.set( elem, value, name );
				}
				// Does not return so that setAttribute is also used
				elem.value = value;
			}
		}
	},

	propFix: {
		tabindex: "tabIndex",
		readonly: "readOnly",
		"for": "htmlFor",
		"class": "className",
		maxlength: "maxLength",
		cellspacing: "cellSpacing",
		cellpadding: "cellPadding",
		rowspan: "rowSpan",
		colspan: "colSpan",
		usemap: "useMap",
		frameborder: "frameBorder",
		contenteditable: "contentEditable"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				return ( elem[ name ] = value );
			}

		} else {
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
				return ret;

			} else {
				return elem[ name ];
			}
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				// elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
				// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				var attributeNode = elem.getAttributeNode("tabindex");

				return attributeNode && attributeNode.specified ?
					parseInt( attributeNode.value, 10 ) :
					rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
						0 :
						undefined;
			}
		}
	}
});

// Hook for boolean attributes
boolHook = {
	get: function( elem, name ) {
		// Align boolean attributes with corresponding properties
		// Fall back to attribute presence where some booleans are not supported
		var attrNode,
			property = jQuery.prop( elem, name );
		return property === true || typeof property !== "boolean" && ( attrNode = elem.getAttributeNode(name) ) && attrNode.nodeValue !== false ?
			name.toLowerCase() :
			undefined;
	},
	set: function( elem, value, name ) {
		var propName;
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			// value is true since we know at this point it's type boolean and not false
			// Set boolean attributes to the same name and set the DOM property
			propName = jQuery.propFix[ name ] || name;
			if ( propName in elem ) {
				// Only set the IDL specifically if it already exists on the element
				elem[ propName ] = true;
			}

			elem.setAttribute( name, name.toLowerCase() );
		}
		return name;
	}
};

// IE6/7 do not support getting/setting some attributes with get/setAttribute
if ( !getSetAttribute ) {

	fixSpecified = {
		name: true,
		id: true,
		coords: true
	};

	// Use this for any attribute in IE6/7
	// This fixes almost every IE6/7 issue
	nodeHook = jQuery.valHooks.button = {
		get: function( elem, name ) {
			var ret;
			ret = elem.getAttributeNode( name );
			return ret && ( fixSpecified[ name ] ? ret.value !== "" : ret.specified ) ?
				ret.value :
				undefined;
		},
		set: function( elem, value, name ) {
			// Set the existing or create a new attribute node
			var ret = elem.getAttributeNode( name );
			if ( !ret ) {
				ret = document.createAttribute( name );
				elem.setAttributeNode( ret );
			}
			return ( ret.value = value + "" );
		}
	};

	// Set width and height to auto instead of 0 on empty string( Bug #8150 )
	// This is for removals
	jQuery.each([ "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
			set: function( elem, value ) {
				if ( value === "" ) {
					elem.setAttribute( name, "auto" );
					return value;
				}
			}
		});
	});

	// Set contenteditable to false on removals(#10429)
	// Setting to empty string throws an error as an invalid value
	jQuery.attrHooks.contenteditable = {
		get: nodeHook.get,
		set: function( elem, value, name ) {
			if ( value === "" ) {
				value = "false";
			}
			nodeHook.set( elem, value, name );
		}
	};
}


// Some attributes require a special call on IE
if ( !jQuery.support.hrefNormalized ) {
	jQuery.each([ "href", "src", "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
			get: function( elem ) {
				var ret = elem.getAttribute( name, 2 );
				return ret === null ? undefined : ret;
			}
		});
	});
}

if ( !jQuery.support.style ) {
	jQuery.attrHooks.style = {
		get: function( elem ) {
			// Return undefined in the case of empty string
			// Normalize to lowercase since IE uppercases css property names
			return elem.style.cssText.toLowerCase() || undefined;
		},
		set: function( elem, value ) {
			return ( elem.style.cssText = "" + value );
		}
	};
}

// Safari mis-reports the default selected property of an option
// Accessing the parent's selectedIndex property fixes it
if ( !jQuery.support.optSelected ) {
	jQuery.propHooks.selected = jQuery.extend( jQuery.propHooks.selected, {
		get: function( elem ) {
			var parent = elem.parentNode;

			if ( parent ) {
				parent.selectedIndex;

				// Make sure that it also works with optgroups, see #5701
				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
			return null;
		}
	});
}

// IE6/7 call enctype encoding
if ( !jQuery.support.enctype ) {
	jQuery.propFix.enctype = "encoding";
}

// Radios and checkboxes getter/setter
if ( !jQuery.support.checkOn ) {
	jQuery.each([ "radio", "checkbox" ], function() {
		jQuery.valHooks[ this ] = {
			get: function( elem ) {
				// Handle the case where in Webkit "" is returned instead of "on" if a value isn't specified
				return elem.getAttribute("value") === null ? "on" : elem.value;
			}
		};
	});
}
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = jQuery.extend( jQuery.valHooks[ this ], {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	});
});
var rformElems = /^(?:textarea|input|select)$/i,
	rtypenamespace = /^([^\.]*|)(?:\.(.+)|)$/,
	rhoverHack = /(?:^|\s)hover(\.\S+|)\b/,
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	hoverHack = function( events ) {
		return jQuery.event.special.hover ? events : events.replace( rhoverHack, "mouseenter$1 mouseleave$1" );
	};

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	add: function( elem, types, handler, data, selector ) {

		var elemData, eventHandle, events,
			t, tns, type, namespaces, handleObj,
			handleObjIn, handlers, special;

		// Don't attach events to noData or text/comment nodes (allow plain objects tho)
		if ( elem.nodeType === 3 || elem.nodeType === 8 || !types || !handler || !(elemData = jQuery._data( elem )) ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		events = elemData.events;
		if ( !events ) {
			elemData.events = events = {};
		}
		eventHandle = elemData.handle;
		if ( !eventHandle ) {
			elemData.handle = eventHandle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && (!e || jQuery.event.triggered !== e.type) ?
					jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
					undefined;
			};
			// Add elem as a property of the handle fn to prevent a memory leak with IE non-native events
			eventHandle.elem = elem;
		}

		// Handle multiple events separated by a space
		// jQuery(...).bind("mouseover mouseout", fn);
		types = jQuery.trim( hoverHack(types) ).split( " " );
		for ( t = 0; t < types.length; t++ ) {

			tns = rtypenamespace.exec( types[t] ) || [];
			type = tns[1];
			namespaces = ( tns[2] || "" ).split( "." ).sort();

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: tns[1],
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			handlers = events[ type ];
			if ( !handlers ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener/attachEvent if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					// Bind the global event handler to the element
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );

					} else if ( elem.attachEvent ) {
						elem.attachEvent( "on" + type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

		// Nullify elem to prevent memory leaks in IE
		elem = null;
	},

	global: {},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var t, tns, type, origType, namespaces, origCount,
			j, events, special, eventType, handleObj,
			elemData = jQuery.hasData( elem ) && jQuery._data( elem );

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = jQuery.trim( hoverHack( types || "" ) ).split(" ");
		for ( t = 0; t < types.length; t++ ) {
			tns = rtypenamespace.exec( types[t] ) || [];
			type = origType = tns[1];
			namespaces = tns[2];

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector? special.delegateType : special.bindType ) || type;
			eventType = events[ type ] || [];
			origCount = eventType.length;
			namespaces = namespaces ? new RegExp("(^|\\.)" + namespaces.split(".").sort().join("\\.(?:.*\\.|)") + "(\\.|$)") : null;

			// Remove matching events
			for ( j = 0; j < eventType.length; j++ ) {
				handleObj = eventType[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					 ( !handler || handler.guid === handleObj.guid ) &&
					 ( !namespaces || namespaces.test( handleObj.namespace ) ) &&
					 ( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					eventType.splice( j--, 1 );

					if ( handleObj.selector ) {
						eventType.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( eventType.length === 0 && origCount !== eventType.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces, elemData.handle ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			delete elemData.handle;

			// removeData also checks for emptiness and clears the expando if empty
			// so use it instead of delete
			jQuery.removeData( elem, "events", true );
		}
	},

	// Events that are safe to short-circuit if no handlers are attached.
	// Native DOM events should not be added, they may have inline handlers.
	customEvent: {
		"getData": true,
		"setData": true,
		"changeData": true
	},

	trigger: function( event, data, elem, onlyHandlers ) {
		// Don't do events on text and comment nodes
		if ( elem && (elem.nodeType === 3 || elem.nodeType === 8) ) {
			return;
		}

		// Event object or event type
		var cache, exclusive, i, cur, old, ontype, special, handle, eventPath, bubbleType,
			type = event.type || event,
			namespaces = [];

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "!" ) >= 0 ) {
			// Exclusive events trigger only for the exact event (no namespaces)
			type = type.slice(0, -1);
			exclusive = true;
		}

		if ( type.indexOf( "." ) >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}

		if ( (!elem || jQuery.event.customEvent[ type ]) && !jQuery.event.global[ type ] ) {
			// No jQuery handlers for this event type, and it can't have inline handlers
			return;
		}

		// Caller can pass in an Event, Object, or just an event type string
		event = typeof event === "object" ?
			// jQuery.Event object
			event[ jQuery.expando ] ? event :
			// Object literal
			new jQuery.Event( type, event ) :
			// Just the event type (string)
			new jQuery.Event( type );

		event.type = type;
		event.isTrigger = true;
		event.exclusive = exclusive;
		event.namespace = namespaces.join( "." );
		event.namespace_re = event.namespace? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;
		ontype = type.indexOf( ":" ) < 0 ? "on" + type : "";

		// Handle a global trigger
		if ( !elem ) {

			// TODO: Stop taunting the data cache; remove global events and always attach to document
			cache = jQuery.cache;
			for ( i in cache ) {
				if ( cache[ i ].events && cache[ i ].events[ type ] ) {
					jQuery.event.trigger( event, data, cache[ i ].handle.elem, true );
				}
			}
			return;
		}

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data != null ? jQuery.makeArray( data ) : [];
		data.unshift( event );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		eventPath = [[ elem, special.bindType || type ]];
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			cur = rfocusMorph.test( bubbleType + type ) ? elem : elem.parentNode;
			for ( old = elem; cur; cur = cur.parentNode ) {
				eventPath.push([ cur, bubbleType ]);
				old = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( old === (elem.ownerDocument || document) ) {
				eventPath.push([ old.defaultView || old.parentWindow || window, bubbleType ]);
			}
		}

		// Fire handlers on the event path
		for ( i = 0; i < eventPath.length && !event.isPropagationStopped(); i++ ) {

			cur = eventPath[i][0];
			event.type = eventPath[i][1];

			handle = ( jQuery._data( cur, "events" ) || {} )[ event.type ] && jQuery._data( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}
			// Note that this is a bare JS function and not a jQuery handler
			handle = ontype && cur[ ontype ];
			if ( handle && jQuery.acceptData( cur ) && handle.apply( cur, data ) === false ) {
				event.preventDefault();
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( elem.ownerDocument, data ) === false) &&
				!(type === "click" && jQuery.nodeName( elem, "a" )) && jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Can't use an .isFunction() check here because IE6/7 fails that test.
				// Don't do default actions on window, that's where global variables be (#6170)
				// IE<9 dies on focus/blur to hidden element (#1486)
				if ( ontype && elem[ type ] && ((type !== "focus" && type !== "blur") || event.target.offsetWidth !== 0) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					old = elem[ ontype ];

					if ( old ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( old ) {
						elem[ ontype ] = old;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event || window.event );

		var i, j, cur, ret, selMatch, matched, matches, handleObj, sel, related,
			handlers = ( (jQuery._data( this, "events" ) || {} )[ event.type ] || []),
			delegateCount = handlers.delegateCount,
			args = [].slice.call( arguments ),
			run_all = !event.exclusive && !event.namespace,
			special = jQuery.event.special[ event.type ] || {},
			handlerQueue = [];

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers that should run if there are delegated events
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && !(event.button && event.type === "click") ) {

			for ( cur = event.target; cur != this; cur = cur.parentNode || this ) {

				// Don't process clicks (ONLY) on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.disabled !== true || event.type !== "click" ) {
					selMatch = {};
					matches = [];
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];
						sel = handleObj.selector;

						if ( selMatch[ sel ] === undefined ) {
							selMatch[ sel ] = jQuery( sel, this ).index( cur ) >= 0;
						}
						if ( selMatch[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, matches: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( handlers.length > delegateCount ) {
			handlerQueue.push({ elem: this, matches: handlers.slice( delegateCount ) });
		}

		// Run delegates first; they may want to stop propagation beneath us
		for ( i = 0; i < handlerQueue.length && !event.isPropagationStopped(); i++ ) {
			matched = handlerQueue[ i ];
			event.currentTarget = matched.elem;

			for ( j = 0; j < matched.matches.length && !event.isImmediatePropagationStopped(); j++ ) {
				handleObj = matched.matches[ j ];

				// Triggered event must either 1) be non-exclusive and have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( run_all || (!event.namespace && !handleObj.namespace) || event.namespace_re && event.namespace_re.test( handleObj.namespace ) ) {

					event.data = handleObj.data;
					event.handleObj = handleObj;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						event.result = ret;
						if ( ret === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	// *** attrChange attrName relatedNode srcElement  are not normalized, non-W3C, deprecated, will be removed in 1.8 ***
	props: "attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button,
				fromElement = original.fromElement;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add relatedTarget, if necessary
			if ( !event.relatedTarget && fromElement ) {
				event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop,
			originalEvent = event,
			fixHook = jQuery.event.fixHooks[ event.type ] || {},
			copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = jQuery.Event( originalEvent );

		for ( i = copy.length; i; ) {
			prop = copy[ --i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Fix target property, if necessary (#1925, IE 6/7/8 & Safari2)
		if ( !event.target ) {
			event.target = originalEvent.srcElement || document;
		}

		// Target should not be a text node (#504, Safari)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		// For mouse/key events, metaKey==false if it's undefined (#3368, #11328; IE6/7/8)
		event.metaKey = !!event.metaKey;

		return fixHook.filter? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},

		focus: {
			delegateType: "focusin"
		},
		blur: {
			delegateType: "focusout"
		},

		beforeunload: {
			setup: function( data, namespaces, eventHandle ) {
				// We only want to do this special case on windows
				if ( jQuery.isWindow( this ) ) {
					this.onbeforeunload = eventHandle;
				}
			},

			teardown: function( namespaces, eventHandle ) {
				if ( this.onbeforeunload === eventHandle ) {
					this.onbeforeunload = null;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{ type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

// Some plugins are using, but it's undocumented/deprecated and will be removed.
// The 1.7 special event interface should provide all the hooks needed now.
jQuery.event.handle = jQuery.event.dispatch;

jQuery.removeEvent = document.removeEventListener ?
	function( elem, type, handle ) {
		if ( elem.removeEventListener ) {
			elem.removeEventListener( type, handle, false );
		}
	} :
	function( elem, type, handle ) {
		var name = "on" + type;

		if ( elem.detachEvent ) {

			// #8545, #7054, preventing memory leaks for custom events in IE6-8 –
			// detachEvent needed property on element, by name of that event, to properly expose it to GC
			if ( typeof elem[ name ] === "undefined" ) {
				elem[ name ] = null;
			}

			elem.detachEvent( name, handle );
		}
	};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = ( src.defaultPrevented || src.returnValue === false ||
			src.getPreventDefault && src.getPreventDefault() ) ? returnTrue : returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

function returnFalse() {
	return false;
}
function returnTrue() {
	return true;
}

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	preventDefault: function() {
		this.isDefaultPrevented = returnTrue;

		var e = this.originalEvent;
		if ( !e ) {
			return;
		}

		// if preventDefault exists run it on the original event
		if ( e.preventDefault ) {
			e.preventDefault();

		// otherwise set the returnValue property of the original event to false (IE)
		} else {
			e.returnValue = false;
		}
	},
	stopPropagation: function() {
		this.isPropagationStopped = returnTrue;

		var e = this.originalEvent;
		if ( !e ) {
			return;
		}
		// if stopPropagation exists run it on the original event
		if ( e.stopPropagation ) {
			e.stopPropagation();
		}
		// otherwise set the cancelBubble property of the original event to true (IE)
		e.cancelBubble = true;
	},
	stopImmediatePropagation: function() {
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	},
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse
};

// Create mouseenter/leave events using mouseover/out and event-time checks
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj,
				selector = handleObj.selector;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// IE submit delegation
if ( !jQuery.support.submitBubbles ) {

	jQuery.event.special.submit = {
		setup: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Lazy-add a submit handler when a descendant form may potentially be submitted
			jQuery.event.add( this, "click._submit keypress._submit", function( e ) {
				// Node name check avoids a VML-related crash in IE (#9807)
				var elem = e.target,
					form = jQuery.nodeName( elem, "input" ) || jQuery.nodeName( elem, "button" ) ? elem.form : undefined;
				if ( form && !jQuery._data( form, "_submit_attached" ) ) {
					jQuery.event.add( form, "submit._submit", function( event ) {
						event._submit_bubble = true;
					});
					jQuery._data( form, "_submit_attached", true );
				}
			});
			// return undefined since we don't need an event listener
		},

		postDispatch: function( event ) {
			// If form was submitted by the user, bubble the event up the tree
			if ( event._submit_bubble ) {
				delete event._submit_bubble;
				if ( this.parentNode && !event.isTrigger ) {
					jQuery.event.simulate( "submit", this.parentNode, event, true );
				}
			}
		},

		teardown: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Remove delegated handlers; cleanData eventually reaps submit handlers attached above
			jQuery.event.remove( this, "._submit" );
		}
	};
}

// IE change delegation and checkbox/radio fix
if ( !jQuery.support.changeBubbles ) {

	jQuery.event.special.change = {

		setup: function() {

			if ( rformElems.test( this.nodeName ) ) {
				// IE doesn't fire change on a check/radio until blur; trigger it on click
				// after a propertychange. Eat the blur-change in special.change.handle.
				// This still fires onchange a second time for check/radio after blur.
				if ( this.type === "checkbox" || this.type === "radio" ) {
					jQuery.event.add( this, "propertychange._change", function( event ) {
						if ( event.originalEvent.propertyName === "checked" ) {
							this._just_changed = true;
						}
					});
					jQuery.event.add( this, "click._change", function( event ) {
						if ( this._just_changed && !event.isTrigger ) {
							this._just_changed = false;
						}
						// Allow triggered, simulated change events (#11500)
						jQuery.event.simulate( "change", this, event, true );
					});
				}
				return false;
			}
			// Delegated event; lazy-add a change handler on descendant inputs
			jQuery.event.add( this, "beforeactivate._change", function( e ) {
				var elem = e.target;

				if ( rformElems.test( elem.nodeName ) && !jQuery._data( elem, "_change_attached" ) ) {
					jQuery.event.add( elem, "change._change", function( event ) {
						if ( this.parentNode && !event.isSimulated && !event.isTrigger ) {
							jQuery.event.simulate( "change", this.parentNode, event, true );
						}
					});
					jQuery._data( elem, "_change_attached", true );
				}
			});
		},

		handle: function( event ) {
			var elem = event.target;

			// Swallow native change events from checkbox/radio, we already triggered them above
			if ( this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox") ) {
				return event.handleObj.handler.apply( this, arguments );
			}
		},

		teardown: function() {
			jQuery.event.remove( this, "._change" );

			return !rformElems.test( this.nodeName );
		}
	};
}

// Create "bubbling" focus and blur events
if ( !jQuery.support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler while someone wants focusin/focusout
		var attaches = 0,
			handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				if ( attaches++ === 0 ) {
					document.addEventListener( orig, handler, true );
				}
			},
			teardown: function() {
				if ( --attaches === 0 ) {
					document.removeEventListener( orig, handler, true );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) { // && selector != null
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	live: function( types, data, fn ) {
		jQuery( this.context ).on( types, this.selector, data, fn );
		return this;
	},
	die: function( types, fn ) {
		jQuery( this.context ).off( types, this.selector || "**", fn );
		return this;
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length == 1? this.off( selector, "**" ) : this.off( types, selector || "**", fn );
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		if ( this[0] ) {
			return jQuery.event.trigger( type, data, this[0], true );
		}
	},

	toggle: function( fn ) {
		// Save reference to arguments for access in closure
		var args = arguments,
			guid = fn.guid || jQuery.guid++,
			i = 0,
			toggler = function( event ) {
				// Figure out which function to execute
				var lastToggle = ( jQuery._data( this, "lastToggle" + fn.guid ) || 0 ) % i;
				jQuery._data( this, "lastToggle" + fn.guid, lastToggle + 1 );

				// Make sure that clicks stop
				event.preventDefault();

				// and execute the function
				return args[ lastToggle ].apply( this, arguments ) || false;
			};

		// link all the functions, so any of them can unbind this click handler
		toggler.guid = guid;
		while ( i < args.length ) {
			args[ i++ ].guid = guid;
		}

		return this.click( toggler );
	},

	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
});

jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		if ( fn == null ) {
			fn = data;
			data = null;
		}

		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};

	if ( rkeyEvent.test( name ) ) {
		jQuery.event.fixHooks[ name ] = jQuery.event.keyHooks;
	}

	if ( rmouseEvent.test( name ) ) {
		jQuery.event.fixHooks[ name ] = jQuery.event.mouseHooks;
	}
});
/*!
 * Sizzle CSS Selector Engine
 *  Copyright 2012 jQuery Foundation and other contributors
 *  Released under the MIT license
 *  http://sizzlejs.com/
 */
(function( window, undefined ) {

var dirruns,
	cachedruns,
	assertGetIdNotName,
	Expr,
	getText,
	isXML,
	contains,
	compile,
	sortOrder,
	hasDuplicate,

	baseHasDuplicate = true,
	strundefined = "undefined",

	expando = ( "sizcache" + Math.random() ).replace( ".", "" ),

	document = window.document,
	docElem = document.documentElement,
	done = 0,
	slice = [].slice,
	push = [].push,

	// Augment a function for special use by Sizzle
	markFunction = function( fn, value ) {
		fn[ expando ] = value || true;
		return fn;
	},

	createCache = function() {
		var cache = {},
			keys = [];

		return markFunction(function( key, value ) {
			// Only keep the most recent entries
			if ( keys.push( key ) > Expr.cacheLength ) {
				delete cache[ keys.shift() ];
			}

			return (cache[ key ] = value);
		}, cache );
	},

	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),

	// Regex

	// Whitespace characters http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",
	// http://www.w3.org/TR/css3-syntax/#characters
	characterEncoding = "(?:\\\\.|[-\\w]|[^\\x00-\\xa0])+",

	// Loosely modeled on CSS identifier characters
	// An unquoted value should be a CSS identifier (http://www.w3.org/TR/css3-selectors/#attribute-selectors)
	// Proper syntax: http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
	identifier = characterEncoding.replace( "w", "w#" ),

	// Acceptable operators http://www.w3.org/TR/selectors/#attribute-selectors
	operators = "([*^$|!~]?=)",
	attributes = "\\[" + whitespace + "*(" + characterEncoding + ")" + whitespace +
		"*(?:" + operators + whitespace + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + identifier + ")|)|)" + whitespace + "*\\]",

	// Prefer arguments not in parens/brackets,
	//   then attribute selectors and non-pseudos (denoted by :),
	//   then anything else
	// These preferences are here to reduce the number of selectors
	//   needing tokenize in the PSEUDO preFilter
	pseudos = ":(" + characterEncoding + ")(?:\\((?:(['\"])((?:\\\\.|[^\\\\])*?)\\2|([^()[\\]]*|(?:(?:" + attributes + ")|[^:]|\\\\.)*|.*))\\)|)",

	// For matchExpr.POS and matchExpr.needsContext
	pos = ":(nth|eq|gt|lt|first|last|even|odd)(?:\\(((?:-\\d)?\\d*)\\)|)(?=[^-]|$)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([\\x20\\t\\r\\n\\f>+~])" + whitespace + "*" ),
	rpseudo = new RegExp( pseudos ),

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w\-]+)|(\w+)|\.([\w\-]+))$/,

	rnot = /^:not/,
	rsibling = /[\x20\t\r\n\f]*[+~]/,
	rendsWithNot = /:not\($/,

	rheader = /h\d/i,
	rinputs = /input|select|textarea|button/i,

	rbackslash = /\\(?!\\)/g,

	matchExpr = {
		"ID": new RegExp( "^#(" + characterEncoding + ")" ),
		"CLASS": new RegExp( "^\\.(" + characterEncoding + ")" ),
		"NAME": new RegExp( "^\\[name=['\"]?(" + characterEncoding + ")['\"]?\\]" ),
		"TAG": new RegExp( "^(" + characterEncoding.replace( "w", "w*" ) + ")" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|nth|last|first)-child(?:\\(" + whitespace +
			"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
			"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"POS": new RegExp( pos, "ig" ),
		// For use in libraries implementing .is()
		"needsContext": new RegExp( "^" + whitespace + "*[>+~]|" + pos, "i" )
	},

	// Support

	// Used for testing something on an element
	assert = function( fn ) {
		var div = document.createElement("div");

		try {
			return fn( div );
		} catch (e) {
			return false;
		} finally {
			// release memory in IE
			div = null;
		}
	},

	// Check if getElementsByTagName("*") returns only elements
	assertTagNameNoComments = assert(function( div ) {
		div.appendChild( document.createComment("") );
		return !div.getElementsByTagName("*").length;
	}),

	// Check if getAttribute returns normalized href attributes
	assertHrefNotNormalized = assert(function( div ) {
		div.innerHTML = "<a href='#'></a>";
		return div.firstChild && typeof div.firstChild.getAttribute !== strundefined &&
			div.firstChild.getAttribute("href") === "#";
	}),

	// Check if attributes should be retrieved by attribute nodes
	assertAttributes = assert(function( div ) {
		div.innerHTML = "<select></select>";
		var type = typeof div.lastChild.getAttribute("multiple");
		// IE8 returns a string for some attributes even when not present
		return type !== "boolean" && type !== "string";
	}),

	// Check if getElementsByClassName can be trusted
	assertUsableClassName = assert(function( div ) {
		// Opera can't find a second classname (in 9.6)
		div.innerHTML = "<div class='hidden e'></div><div class='hidden'></div>";
		if ( !div.getElementsByClassName || !div.getElementsByClassName("e").length ) {
			return false;
		}

		// Safari 3.2 caches class attributes and doesn't catch changes
		div.lastChild.className = "e";
		return div.getElementsByClassName("e").length === 2;
	}),

	// Check if getElementById returns elements by name
	// Check if getElementsByName privileges form controls or returns elements by ID
	assertUsableName = assert(function( div ) {
		// Inject content
		div.id = expando + 0;
		div.innerHTML = "<a name='" + expando + "'></a><div name='" + expando + "'></div>";
		docElem.insertBefore( div, docElem.firstChild );

		// Test
		var pass = document.getElementsByName &&
			// buggy browsers will return fewer than the correct 2
			document.getElementsByName( expando ).length === 2 +
			// buggy browsers will return more than the correct 0
			document.getElementsByName( expando + 0 ).length;
		assertGetIdNotName = !document.getElementById( expando );

		// Cleanup
		docElem.removeChild( div );

		return pass;
	});

// If slice is not available, provide a backup
try {
	slice.call( docElem.childNodes, 0 )[0].nodeType;
} catch ( e ) {
	slice = function( i ) {
		var elem, results = [];
		for ( ; (elem = this[i]); i++ ) {
			results.push( elem );
		}
		return results;
	};
}

function Sizzle( selector, context, results, seed ) {
	results = results || [];
	context = context || document;
	var match, elem, xml, m,
		nodeType = context.nodeType;

	if ( nodeType !== 1 && nodeType !== 9 ) {
		return [];
	}

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	xml = isXML( context );

	if ( !xml && !seed ) {
		if ( (match = rquickExpr.exec( selector )) ) {
			// Speed-up: Sizzle("#ID")
			if ( (m = match[1]) ) {
				if ( nodeType === 9 ) {
					elem = context.getElementById( m );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE, Opera, and Webkit return items
						// by name instead of ID
						if ( elem.id === m ) {
							results.push( elem );
							return results;
						}
					} else {
						return results;
					}
				} else {
					// Context is not a document
					if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
						contains( context, elem ) && elem.id === m ) {
						results.push( elem );
						return results;
					}
				}

			// Speed-up: Sizzle("TAG")
			} else if ( match[2] ) {
				push.apply( results, slice.call(context.getElementsByTagName( selector ), 0) );
				return results;

			// Speed-up: Sizzle(".CLASS")
			} else if ( (m = match[3]) && assertUsableClassName && context.getElementsByClassName ) {
				push.apply( results, slice.call(context.getElementsByClassName( m ), 0) );
				return results;
			}
		}
	}

	// All others
	return select( selector, context, results, seed, xml );
}

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	return Sizzle( expr, null, null, [ elem ] ).length > 0;
};

// Returns a function to use in pseudos for input types
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

// Returns a function to use in pseudos for buttons
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return (name === "input" || name === "button") && elem.type === type;
	};
}

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( nodeType ) {
		if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
			// Use textContent for elements
			// innerText usage removed for consistency of new lines (see #11153)
			if ( typeof elem.textContent === "string" ) {
				return elem.textContent;
			} else {
				// Traverse its children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
					ret += getText( elem );
				}
			}
		} else if ( nodeType === 3 || nodeType === 4 ) {
			return elem.nodeValue;
		}
		// Do not include comment or processing instruction nodes
	} else {

		// If no nodeType, this is expected to be an array
		for ( ; (node = elem[i]); i++ ) {
			// Do not traverse comment nodes
			ret += getText( node );
		}
	}
	return ret;
};

isXML = Sizzle.isXML = function isXML( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = elem && (elem.ownerDocument || elem).documentElement;
	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

// Element contains another
contains = Sizzle.contains = docElem.contains ?
	function( a, b ) {
		var adown = a.nodeType === 9 ? a.documentElement : a,
			bup = b && b.parentNode;
		return a === bup || !!( bup && bup.nodeType === 1 && adown.contains && adown.contains(bup) );
	} :
	docElem.compareDocumentPosition ?
	function( a, b ) {
		return b && !!( a.compareDocumentPosition( b ) & 16 );
	} :
	function( a, b ) {
		while ( (b = b.parentNode) ) {
			if ( b === a ) {
				return true;
			}
		}
		return false;
	};

Sizzle.attr = function( elem, name ) {
	var attr,
		xml = isXML( elem );

	if ( !xml ) {
		name = name.toLowerCase();
	}
	if ( Expr.attrHandle[ name ] ) {
		return Expr.attrHandle[ name ]( elem );
	}
	if ( assertAttributes || xml ) {
		return elem.getAttribute( name );
	}
	attr = elem.getAttributeNode( name );
	return attr ?
		typeof elem[ name ] === "boolean" ?
			elem[ name ] ? name : null :
			attr.specified ? attr.value : null :
		null;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	order: new RegExp( "ID|TAG" +
		(assertUsableName ? "|NAME" : "") +
		(assertUsableClassName ? "|CLASS" : "")
	),

	// IE6/7 return a modified href
	attrHandle: assertHrefNotNormalized ?
		{} :
		{
			"href": function( elem ) {
				return elem.getAttribute( "href", 2 );
			},
			"type": function( elem ) {
				return elem.getAttribute("type");
			}
		},

	find: {
		"ID": assertGetIdNotName ?
			function( id, context, xml ) {
				if ( typeof context.getElementById !== strundefined && !xml ) {
					var m = context.getElementById( id );
					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					return m && m.parentNode ? [m] : [];
				}
			} :
			function( id, context, xml ) {
				if ( typeof context.getElementById !== strundefined && !xml ) {
					var m = context.getElementById( id );

					return m ?
						m.id === id || typeof m.getAttributeNode !== strundefined && m.getAttributeNode("id").value === id ?
							[m] :
							undefined :
						[];
				}
			},

		"TAG": assertTagNameNoComments ?
			function( tag, context ) {
				if ( typeof context.getElementsByTagName !== strundefined ) {
					return context.getElementsByTagName( tag );
				}
			} :
			function( tag, context ) {
				var results = context.getElementsByTagName( tag );

				// Filter out possible comments
				if ( tag === "*" ) {
					var elem,
						tmp = [],
						i = 0;

					for ( ; (elem = results[i]); i++ ) {
						if ( elem.nodeType === 1 ) {
							tmp.push( elem );
						}
					}

					return tmp;
				}
				return results;
			},

		"NAME": function( tag, context ) {
			if ( typeof context.getElementsByName !== strundefined ) {
				return context.getElementsByName( name );
			}
		},

		"CLASS": function( className, context, xml ) {
			if ( typeof context.getElementsByClassName !== strundefined && !xml ) {
				return context.getElementsByClassName( className );
			}
		}
	},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[1] = match[1].replace( rbackslash, "" );

			// Move the given value to match[3] whether quoted or unquoted
			match[3] = ( match[4] || match[5] || "" ).replace( rbackslash, "" );

			if ( match[2] === "~=" ) {
				match[3] = " " + match[3] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {
			/* matches from matchExpr.CHILD
				1 type (only|nth|...)
				2 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				3 xn-component of xn+y argument ([+-]?\d*n|)
				4 sign of xn-component
				5 x of xn-component
				6 sign of y-component
				7 y of y-component
			*/
			match[1] = match[1].toLowerCase();

			if ( match[1] === "nth" ) {
				// nth-child requires argument
				if ( !match[2] ) {
					Sizzle.error( match[0] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[3] = +( match[3] ? match[4] + (match[5] || 1) : 2 * ( match[2] === "even" || match[2] === "odd" ) );
				match[4] = +( ( match[6] + match[7] ) || match[2] === "odd" );

			// other types prohibit arguments
			} else if ( match[2] ) {
				Sizzle.error( match[0] );
			}

			return match;
		},

		"PSEUDO": function( match, context, xml ) {
			var unquoted, excess;
			if ( matchExpr["CHILD"].test( match[0] ) ) {
				return null;
			}

			if ( match[3] ) {
				match[2] = match[3];
			} else if ( (unquoted = match[4]) ) {
				// Only check arguments that contain a pseudo
				if ( rpseudo.test(unquoted) &&
					// Get excess from tokenize (recursively)
					(excess = tokenize( unquoted, context, xml, true )) &&
					// advance to the next closing parenthesis
					(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

					// excess is a negative index
					unquoted = unquoted.slice( 0, excess );
					match[0] = match[0].slice( 0, excess );
				}
				match[2] = unquoted;
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {
		"ID": assertGetIdNotName ?
			function( id ) {
				id = id.replace( rbackslash, "" );
				return function( elem ) {
					return elem.getAttribute("id") === id;
				};
			} :
			function( id ) {
				id = id.replace( rbackslash, "" );
				return function( elem ) {
					var node = typeof elem.getAttributeNode !== strundefined && elem.getAttributeNode("id");
					return node && node.value === id;
				};
			},

		"TAG": function( nodeName ) {
			if ( nodeName === "*" ) {
				return function() { return true; };
			}
			nodeName = nodeName.replace( rbackslash, "" ).toLowerCase();

			return function( elem ) {
				return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
			};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ expando ][ className ];
			if ( !pattern ) {
				pattern = classCache( className, new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)") );
			}
			return function( elem ) {
				return pattern.test( elem.className || (typeof elem.getAttribute !== strundefined && elem.getAttribute("class")) || "" );
			};
		},

		"ATTR": function( name, operator, check ) {
			if ( !operator ) {
				return function( elem ) {
					return Sizzle.attr( elem, name ) != null;
				};
			}

			return function( elem ) {
				var result = Sizzle.attr( elem, name ),
					value = result + "";

				if ( result == null ) {
					return operator === "!=";
				}

				switch ( operator ) {
					case "=":
						return value === check;
					case "!=":
						return value !== check;
					case "^=":
						return check && value.indexOf( check ) === 0;
					case "*=":
						return check && value.indexOf( check ) > -1;
					case "$=":
						return check && value.substr( value.length - check.length ) === check;
					case "~=":
						return ( " " + value + " " ).indexOf( check ) > -1;
					case "|=":
						return value === check || value.substr( 0, check.length + 1 ) === check + "-";
				}
			};
		},

		"CHILD": function( type, argument, first, last ) {

			if ( type === "nth" ) {
				var doneName = done++;

				return function( elem ) {
					var parent, diff,
						count = 0,
						node = elem;

					if ( first === 1 && last === 0 ) {
						return true;
					}

					parent = elem.parentNode;

					if ( parent && (parent[ expando ] !== doneName || !elem.sizset) ) {
						for ( node = parent.firstChild; node; node = node.nextSibling ) {
							if ( node.nodeType === 1 ) {
								node.sizset = ++count;
								if ( node === elem ) {
									break;
								}
							}
						}

						parent[ expando ] = doneName;
					}

					diff = elem.sizset - last;

					if ( first === 0 ) {
						return diff === 0;

					} else {
						return ( diff % first === 0 && diff / first >= 0 );
					}
				};
			}

			return function( elem ) {
				var node = elem;

				switch ( type ) {
					case "only":
					case "first":
						while ( (node = node.previousSibling) ) {
							if ( node.nodeType === 1 ) {
								return false;
							}
						}

						if ( type === "first" ) {
							return true;
						}

						node = elem;

						/* falls through */
					case "last":
						while ( (node = node.nextSibling) ) {
							if ( node.nodeType === 1 ) {
								return false;
							}
						}

						return true;
				}
			};
		},

		"PSEUDO": function( pseudo, argument, context, xml ) {
			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.pseudos[ pseudo.toLowerCase() ];

			if ( !fn ) {
				Sizzle.error( "unsupported pseudo: " + pseudo );
			}

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( !fn[ expando ] ) {
				if ( fn.length > 1 ) {
					args = [ pseudo, pseudo, "", argument ];
					return function( elem ) {
						return fn( elem, 0, args );
					};
				}
				return fn;
			}

			return fn( argument, context, xml );
		}
	},

	pseudos: {
		"not": markFunction(function( selector, context, xml ) {
			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var matcher = compile( selector.replace( rtrim, "$1" ), context, xml );
			return function( elem ) {
				return !matcher( elem );
			};
		}),

		"enabled": function( elem ) {
			return elem.disabled === false;
		},

		"disabled": function( elem ) {
			return elem.disabled === true;
		},

		"checked": function( elem ) {
			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
		},

		"selected": function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos["empty"]( elem );
		},

		"empty": function( elem ) {
			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is only affected by element nodes and content nodes(including text(3), cdata(4)),
			//   not comment, processing instructions, or others
			// Thanks to Diego Perini for the nodeName shortcut
			//   Greater than "@" means alpha characters (specifically not starting with "#" or "?")
			var nodeType;
			elem = elem.firstChild;
			while ( elem ) {
				if ( elem.nodeName > "@" || (nodeType = elem.nodeType) === 3 || nodeType === 4 ) {
					return false;
				}
				elem = elem.nextSibling;
			}
			return true;
		},

		"contains": markFunction(function( text ) {
			return function( elem ) {
				return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
			};
		}),

		"has": markFunction(function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		}),

		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"text": function( elem ) {
			var type, attr;
			// IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc)
			// use getAttribute instead to test this case
			return elem.nodeName.toLowerCase() === "input" &&
				(type = elem.type) === "text" &&
				( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === type );
		},

		// Input types
		"radio": createInputPseudo("radio"),
		"checkbox": createInputPseudo("checkbox"),
		"file": createInputPseudo("file"),
		"password": createInputPseudo("password"),
		"image": createInputPseudo("image"),

		"submit": createButtonPseudo("submit"),
		"reset": createButtonPseudo("reset"),

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"focus": function( elem ) {
			var doc = elem.ownerDocument;
			return elem === doc.activeElement && (!doc.hasFocus || doc.hasFocus()) && !!(elem.type || elem.href);
		},

		"active": function( elem ) {
			return elem === elem.ownerDocument.activeElement;
		}
	},

	setFilters: {
		"first": function( elements, argument, not ) {
			return not ? elements.slice( 1 ) : [ elements[0] ];
		},

		"last": function( elements, argument, not ) {
			var elem = elements.pop();
			return not ? elements : [ elem ];
		},

		"even": function( elements, argument, not ) {
			var results = [],
				i = not ? 1 : 0,
				len = elements.length;
			for ( ; i < len; i = i + 2 ) {
				results.push( elements[i] );
			}
			return results;
		},

		"odd": function( elements, argument, not ) {
			var results = [],
				i = not ? 0 : 1,
				len = elements.length;
			for ( ; i < len; i = i + 2 ) {
				results.push( elements[i] );
			}
			return results;
		},

		"lt": function( elements, argument, not ) {
			return not ? elements.slice( +argument ) : elements.slice( 0, +argument );
		},

		"gt": function( elements, argument, not ) {
			return not ? elements.slice( 0, +argument + 1 ) : elements.slice( +argument + 1 );
		},

		"eq": function( elements, argument, not ) {
			var elem = elements.splice( +argument, 1 );
			return not ? elements : elem;
		}
	}
};

function siblingCheck( a, b, ret ) {
	if ( a === b ) {
		return ret;
	}

	var cur = a.nextSibling;

	while ( cur ) {
		if ( cur === b ) {
			return -1;
		}

		cur = cur.nextSibling;
	}

	return 1;
}

sortOrder = docElem.compareDocumentPosition ?
	function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		return ( !a.compareDocumentPosition || !b.compareDocumentPosition ?
			a.compareDocumentPosition :
			a.compareDocumentPosition(b) & 4
		) ? -1 : 1;
	} :
	function( a, b ) {
		// The nodes are identical, we can exit early
		if ( a === b ) {
			hasDuplicate = true;
			return 0;

		// Fallback to using sourceIndex (in IE) if it's available on both nodes
		} else if ( a.sourceIndex && b.sourceIndex ) {
			return a.sourceIndex - b.sourceIndex;
		}

		var al, bl,
			ap = [],
			bp = [],
			aup = a.parentNode,
			bup = b.parentNode,
			cur = aup;

		// If the nodes are siblings (or identical) we can do a quick check
		if ( aup === bup ) {
			return siblingCheck( a, b );

		// If no parents were found then the nodes are disconnected
		} else if ( !aup ) {
			return -1;

		} else if ( !bup ) {
			return 1;
		}

		// Otherwise they're somewhere else in the tree so we need
		// to build up a full list of the parentNodes for comparison
		while ( cur ) {
			ap.unshift( cur );
			cur = cur.parentNode;
		}

		cur = bup;

		while ( cur ) {
			bp.unshift( cur );
			cur = cur.parentNode;
		}

		al = ap.length;
		bl = bp.length;

		// Start walking down the tree looking for a discrepancy
		for ( var i = 0; i < al && i < bl; i++ ) {
			if ( ap[i] !== bp[i] ) {
				return siblingCheck( ap[i], bp[i] );
			}
		}

		// We ended someplace up the tree so do a sibling check
		return i === al ?
			siblingCheck( a, bp[i], -1 ) :
			siblingCheck( ap[i], b, 1 );
	};

// Always assume the presence of duplicates if sort doesn't
// pass them to our comparison function (as in Google Chrome).
[0, 0].sort( sortOrder );
baseHasDuplicate = !hasDuplicate;

// Document sorting and removing duplicates
Sizzle.uniqueSort = function( results ) {
	var elem,
		i = 1;

	hasDuplicate = baseHasDuplicate;
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		for ( ; (elem = results[i]); i++ ) {
			if ( elem === results[ i - 1 ] ) {
				results.splice( i--, 1 );
			}
		}
	}

	return results;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

function tokenize( selector, context, xml, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, group, i,
		preFilters, filters,
		checkContext = !xml && context !== document,
		// Token cache should maintain spaces
		key = ( checkContext ? "<s>" : "" ) + selector.replace( rtrim, "$1<s>" ),
		cached = tokenCache[ expando ][ key ];

	if ( cached ) {
		return parseOnly ? 0 : slice.call( cached, 0 );
	}

	soFar = selector;
	groups = [];
	i = 0;
	preFilters = Expr.preFilter;
	filters = Expr.filter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || (match = rcomma.exec( soFar )) ) {
			if ( match ) {
				soFar = soFar.slice( match[0].length );
				tokens.selector = group;
			}
			groups.push( tokens = [] );
			group = "";

			// Need to make sure we're within a narrower context if necessary
			// Adding a descendant combinator will generate what is needed
			if ( checkContext ) {
				soFar = " " + soFar;
			}
		}

		matched = false;

		// Combinators
		if ( (match = rcombinators.exec( soFar )) ) {
			group += match[0];
			soFar = soFar.slice( match[0].length );

			// Cast descendant combinators to space
			matched = tokens.push({
				part: match.pop().replace( rtrim, " " ),
				string: match[0],
				captures: match
			});
		}

		// Filters
		for ( type in filters ) {
			if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
				( match = preFilters[ type ](match, context, xml) )) ) {

				group += match[0];
				soFar = soFar.slice( match[0].length );
				matched = tokens.push({
					part: type,
					string: match.shift(),
					captures: match
				});
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Attach the full group as a selector
	if ( group ) {
		tokens.selector = group;
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :
			// Cache the tokens
			slice.call( tokenCache(key, groups), 0 );
}

function addCombinator( matcher, combinator, context, xml ) {
	var dir = combinator.dir,
		doneName = done++;

	if ( !matcher ) {
		// If there is no matcher to check, check against the context
		matcher = function( elem ) {
			return elem === context;
		};
	}
	return combinator.first ?
		function( elem ) {
			while ( (elem = elem[ dir ]) ) {
				if ( elem.nodeType === 1 ) {
					return matcher( elem ) && elem;
				}
			}
		} :
		xml ?
			function( elem ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 ) {
						if ( matcher( elem ) ) {
							return elem;
						}
					}
				}
			} :
			function( elem ) {
				var cache,
					dirkey = doneName + "." + dirruns,
					cachedkey = dirkey + "." + cachedruns;
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 ) {
						if ( (cache = elem[ expando ]) === cachedkey ) {
							return elem.sizset;
						} else if ( typeof cache === "string" && cache.indexOf(dirkey) === 0 ) {
							if ( elem.sizset ) {
								return elem;
							}
						} else {
							elem[ expando ] = cachedkey;
							if ( matcher( elem ) ) {
								elem.sizset = true;
								return elem;
							}
							elem.sizset = false;
						}
					}
				}
			};
}

function addMatcher( higher, deeper ) {
	return higher ?
		function( elem ) {
			var result = deeper( elem );
			return result && higher( result === true ? elem : result );
		} :
		deeper;
}

// ["TAG", ">", "ID", " ", "CLASS"]
function matcherFromTokens( tokens, context, xml ) {
	var token, matcher,
		i = 0;

	for ( ; (token = tokens[i]); i++ ) {
		if ( Expr.relative[ token.part ] ) {
			matcher = addCombinator( matcher, Expr.relative[ token.part ], context, xml );
		} else {
			matcher = addMatcher( matcher, Expr.filter[ token.part ].apply(null, token.captures.concat( context, xml )) );
		}
	}

	return matcher;
}

function matcherFromGroupMatchers( matchers ) {
	return function( elem ) {
		var matcher,
			j = 0;
		for ( ; (matcher = matchers[j]); j++ ) {
			if ( matcher(elem) ) {
				return true;
			}
		}
		return false;
	};
}

compile = Sizzle.compile = function( selector, context, xml ) {
	var group, i, len,
		cached = compilerCache[ expando ][ selector ];

	// Return a cached group function if already generated (context dependent)
	if ( cached && cached.context === context ) {
		return cached;
	}

	// Generate a function of recursive functions that can be used to check each element
	group = tokenize( selector, context, xml );
	for ( i = 0, len = group.length; i < len; i++ ) {
		group[i] = matcherFromTokens(group[i], context, xml);
	}

	// Cache the compiled function
	cached = compilerCache( selector, matcherFromGroupMatchers(group) );
	cached.context = context;
	cached.runs = cached.dirruns = 0;
	return cached;
};

function multipleContexts( selector, contexts, results, seed ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[i], results, seed );
	}
}

function handlePOSGroup( selector, posfilter, argument, contexts, seed, not ) {
	var results,
		fn = Expr.setFilters[ posfilter.toLowerCase() ];

	if ( !fn ) {
		Sizzle.error( posfilter );
	}

	if ( selector || !(results = seed) ) {
		multipleContexts( selector || "*", contexts, (results = []), seed );
	}

	return results.length > 0 ? fn( results, argument, not ) : [];
}

function handlePOS( groups, context, results, seed ) {
	var group, part, j, groupLen, token, selector,
		anchor, elements, match, matched,
		lastIndex, currentContexts, not,
		i = 0,
		len = groups.length,
		rpos = matchExpr["POS"],
		// This is generated here in case matchExpr["POS"] is extended
		rposgroups = new RegExp( "^" + rpos.source + "(?!" + whitespace + ")", "i" ),
		// This is for making sure non-participating
		// matching groups are represented cross-browser (IE6-8)
		setUndefined = function() {
			var i = 1,
				len = arguments.length - 2;
			for ( ; i < len; i++ ) {
				if ( arguments[i] === undefined ) {
					match[i] = undefined;
				}
			}
		};

	for ( ; i < len; i++ ) {
		group = groups[i];
		part = "";
		elements = seed;
		for ( j = 0, groupLen = group.length; j < groupLen; j++ ) {
			token = group[j];
			selector = token.string;
			if ( token.part === "PSEUDO" ) {
				// Reset regex index to 0
				rpos.exec("");
				anchor = 0;
				while ( (match = rpos.exec( selector )) ) {
					matched = true;
					lastIndex = rpos.lastIndex = match.index + match[0].length;
					if ( lastIndex > anchor ) {
						part += selector.slice( anchor, match.index );
						anchor = lastIndex;
						currentContexts = [ context ];

						if ( rcombinators.test(part) ) {
							if ( elements ) {
								currentContexts = elements;
							}
							elements = seed;
						}

						if ( (not = rendsWithNot.test( part )) ) {
							part = part.slice( 0, -5 ).replace( rcombinators, "$&*" );
							anchor++;
						}

						if ( match.length > 1 ) {
							match[0].replace( rposgroups, setUndefined );
						}
						elements = handlePOSGroup( part, match[1], match[2], currentContexts, elements, not );
					}
					part = "";
				}

			}

			if ( !matched ) {
				part += selector;
			}
			matched = false;
		}

		if ( part ) {
			if ( rcombinators.test(part) ) {
				multipleContexts( part, elements || [ context ], results, seed );
			} else {
				Sizzle( part, context, results, seed ? seed.concat(elements) : elements );
			}
		} else {
			push.apply( results, elements );
		}
	}

	// Do not sort if this is a single filter
	return len === 1 ? results : Sizzle.uniqueSort( results );
}

function select( selector, context, results, seed, xml ) {
	// Remove excessive whitespace
	selector = selector.replace( rtrim, "$1" );
	var elements, matcher, cached, elem,
		i, tokens, token, lastToken, findContext, type,
		match = tokenize( selector, context, xml ),
		contextNodeType = context.nodeType;

	// POS handling
	if ( matchExpr["POS"].test(selector) ) {
		return handlePOS( match, context, results, seed );
	}

	if ( seed ) {
		elements = slice.call( seed, 0 );

	// To maintain document order, only narrow the
	// set if there is one group
	} else if ( match.length === 1 ) {

		// Take a shortcut and set the context if the root selector is an ID
		if ( (tokens = slice.call( match[0], 0 )).length > 2 &&
				(token = tokens[0]).part === "ID" &&
				contextNodeType === 9 && !xml &&
				Expr.relative[ tokens[1].part ] ) {

			context = Expr.find["ID"]( token.captures[0].replace( rbackslash, "" ), context, xml )[0];
			if ( !context ) {
				return results;
			}

			selector = selector.slice( tokens.shift().string.length );
		}

		findContext = ( (match = rsibling.exec( tokens[0].string )) && !match.index && context.parentNode ) || context;

		// Reduce the set if possible
		lastToken = "";
		for ( i = tokens.length - 1; i >= 0; i-- ) {
			token = tokens[i];
			type = token.part;
			lastToken = token.string + lastToken;
			if ( Expr.relative[ type ] ) {
				break;
			}
			if ( Expr.order.test(type) ) {
				elements = Expr.find[ type ]( token.captures[0].replace( rbackslash, "" ), findContext, xml );
				if ( elements == null ) {
					continue;
				} else {
					selector = selector.slice( 0, selector.length - lastToken.length ) +
						lastToken.replace( matchExpr[ type ], "" );

					if ( !selector ) {
						push.apply( results, slice.call(elements, 0) );
					}

					break;
				}
			}
		}
	}

	// Only loop over the given elements once
	if ( selector ) {
		matcher = compile( selector, context, xml );
		dirruns = matcher.dirruns++;
		if ( elements == null ) {
			elements = Expr.find["TAG"]( "*", (rsibling.test( selector ) && context.parentNode) || context );
		}

		for ( i = 0; (elem = elements[i]); i++ ) {
			cachedruns = matcher.runs++;
			if ( matcher(elem) ) {
				results.push( elem );
			}
		}
	}

	return results;
}

if ( document.querySelectorAll ) {
	(function() {
		var disconnectedMatch,
			oldSelect = select,
			rescape = /'|\\/g,
			rattributeQuotes = /\=[\x20\t\r\n\f]*([^'"\]]*)[\x20\t\r\n\f]*\]/g,
			rbuggyQSA = [],
			// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
			// A support test would require too much code (would include document ready)
			// just skip matchesSelector for :active
			rbuggyMatches = [":active"],
			matches = docElem.matchesSelector ||
				docElem.mozMatchesSelector ||
				docElem.webkitMatchesSelector ||
				docElem.oMatchesSelector ||
				docElem.msMatchesSelector;

		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert(function( div ) {
			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explictly
			// setting a boolean content attribute,
			// since its presence should be enough
			// http://bugs.jquery.com/ticket/12359
			div.innerHTML = "<select><option selected=''></option></select>";

			// IE8 - Some boolean attributes are not treated correctly
			if ( !div.querySelectorAll("[selected]").length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:checked|disabled|ismap|multiple|readonly|selected|value)" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here (do not put tests after this one)
			if ( !div.querySelectorAll(":checked").length ) {
				rbuggyQSA.push(":checked");
			}
		});

		assert(function( div ) {

			// Opera 10-12/IE9 - ^= $= *= and empty values
			// Should not select anything
			div.innerHTML = "<p test=''></p>";
			if ( div.querySelectorAll("[test^='']").length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:\"\"|'')" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here (do not put tests after this one)
			div.innerHTML = "<input type='hidden'/>";
			if ( !div.querySelectorAll(":enabled").length ) {
				rbuggyQSA.push(":enabled", ":disabled");
			}
		});

		rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );

		select = function( selector, context, results, seed, xml ) {
			// Only use querySelectorAll when not filtering,
			// when this is not xml,
			// and when no QSA bugs apply
			if ( !seed && !xml && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
				if ( context.nodeType === 9 ) {
					try {
						push.apply( results, slice.call(context.querySelectorAll( selector ), 0) );
						return results;
					} catch(qsaError) {}
				// qSA works strangely on Element-rooted queries
				// We can work around this by specifying an extra ID on the root
				// and working up from there (Thanks to Andrew Dupont for the technique)
				// IE 8 doesn't work on object elements
				} else if ( context.nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
					var groups, i, len,
						old = context.getAttribute("id"),
						nid = old || expando,
						newContext = rsibling.test( selector ) && context.parentNode || context;

					if ( old ) {
						nid = nid.replace( rescape, "\\$&" );
					} else {
						context.setAttribute( "id", nid );
					}

					groups = tokenize(selector, context, xml);
					// Trailing space is unnecessary
					// There is always a context check
					nid = "[id='" + nid + "']";
					for ( i = 0, len = groups.length; i < len; i++ ) {
						groups[i] = nid + groups[i].selector;
					}
					try {
						push.apply( results, slice.call( newContext.querySelectorAll(
							groups.join(",")
						), 0 ) );
						return results;
					} catch(qsaError) {
					} finally {
						if ( !old ) {
							context.removeAttribute("id");
						}
					}
				}
			}

			return oldSelect( selector, context, results, seed, xml );
		};

		if ( matches ) {
			assert(function( div ) {
				// Check to see if it's possible to do matchesSelector
				// on a disconnected node (IE 9)
				disconnectedMatch = matches.call( div, "div" );

				// This should fail with an exception
				// Gecko does not error, returns false instead
				try {
					matches.call( div, "[test!='']:sizzle" );
					rbuggyMatches.push( matchExpr["PSEUDO"].source, matchExpr["POS"].source, "!=" );
				} catch ( e ) {}
			});

			// rbuggyMatches always contains :active, so no need for a length check
			rbuggyMatches = /* rbuggyMatches.length && */ new RegExp( rbuggyMatches.join("|") );

			Sizzle.matchesSelector = function( elem, expr ) {
				// Make sure that attribute selectors are quoted
				expr = expr.replace( rattributeQuotes, "='$1']" );

				// rbuggyMatches always contains :active, so no need for an existence check
				if ( !isXML( elem ) && !rbuggyMatches.test( expr ) && (!rbuggyQSA || !rbuggyQSA.test( expr )) ) {
					try {
						var ret = matches.call( elem, expr );

						// IE 9's matchesSelector returns false on disconnected nodes
						if ( ret || disconnectedMatch ||
								// As well, disconnected nodes are said to be in a document
								// fragment in IE 9
								elem.document && elem.document.nodeType !== 11 ) {
							return ret;
						}
					} catch(e) {}
				}

				return Sizzle( expr, null, null, [ elem ] ).length > 0;
			};
		}
	})();
}

// Deprecated
Expr.setFilters["nth"] = Expr.setFilters["eq"];

// Back-compat
Expr.filters = Expr.pseudos;

// Override sizzle attribute retrieval
Sizzle.attr = jQuery.attr;
jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.pseudos;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;


})( window );
var runtil = /Until$/,
	rparentsprev = /^(?:parents|prev(?:Until|All))/,
	isSimple = /^.[^:#\[\.,]*$/,
	rneedsContext = jQuery.expr.match.needsContext,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend({
	find: function( selector ) {
		var i, l, length, n, r, ret,
			self = this;

		if ( typeof selector !== "string" ) {
			return jQuery( selector ).filter(function() {
				for ( i = 0, l = self.length; i < l; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			});
		}

		ret = this.pushStack( "", "find", selector );

		for ( i = 0, l = this.length; i < l; i++ ) {
			length = ret.length;
			jQuery.find( selector, this[i], ret );

			if ( i > 0 ) {
				// Make sure that the results are unique
				for ( n = length; n < ret.length; n++ ) {
					for ( r = 0; r < length; r++ ) {
						if ( ret[r] === ret[n] ) {
							ret.splice(n--, 1);
							break;
						}
					}
				}
			}
		}

		return ret;
	},

	has: function( target ) {
		var i,
			targets = jQuery( target, this ),
			len = targets.length;

		return this.filter(function() {
			for ( i = 0; i < len; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	not: function( selector ) {
		return this.pushStack( winnow(this, selector, false), "not", selector);
	},

	filter: function( selector ) {
		return this.pushStack( winnow(this, selector, true), "filter", selector );
	},

	is: function( selector ) {
		return !!selector && (
			typeof selector === "string" ?
				// If this is a positional/relative selector, check membership in the returned set
				// so $("p:first").is("p:last") won't return true for a doc with two "p".
				rneedsContext.test( selector ) ?
					jQuery( selector, this.context ).index( this[0] ) >= 0 :
					jQuery.filter( selector, this ).length > 0 :
				this.filter( selector ).length > 0 );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			ret = [],
			pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( ; i < l; i++ ) {
			cur = this[i];

			while ( cur && cur.ownerDocument && cur !== context && cur.nodeType !== 11 ) {
				if ( pos ? pos.index(cur) > -1 : jQuery.find.matchesSelector(cur, selectors) ) {
					ret.push( cur );
					break;
				}
				cur = cur.parentNode;
			}
		}

		ret = ret.length > 1 ? jQuery.unique( ret ) : ret;

		return this.pushStack( ret, "closest", selectors );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[0] && this[0].parentNode ) ? this.prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return jQuery.inArray( this[0], jQuery( elem ) );
		}

		// Locate the position of the desired element
		return jQuery.inArray(
			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[0] : elem, this );
	},

	add: function( selector, context ) {
		var set = typeof selector === "string" ?
				jQuery( selector, context ) :
				jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
			all = jQuery.merge( this.get(), set );

		return this.pushStack( isDisconnected( set[0] ) || isDisconnected( all[0] ) ?
			all :
			jQuery.unique( all ) );
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter(selector)
		);
	}
});

jQuery.fn.andSelf = jQuery.fn.addBack;

// A painfully simple check to see if an element is disconnected
// from a document (should be improved, where feasible).
function isDisconnected( node ) {
	return !node || !node.parentNode || node.parentNode.nodeType === 11;
}

function sibling( cur, dir ) {
	do {
		cur = cur[ dir ];
	} while ( cur && cur.nodeType !== 1 );

	return cur;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return jQuery.nodeName( elem, "iframe" ) ?
			elem.contentDocument || elem.contentWindow.document :
			jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var ret = jQuery.map( this, fn, until );

		if ( !runtil.test( name ) ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		ret = this.length > 1 && !guaranteedUnique[ name ] ? jQuery.unique( ret ) : ret;

		if ( this.length > 1 && rparentsprev.test( name ) ) {
			ret = ret.reverse();
		}

		return this.pushStack( ret, name, core_slice.call( arguments ).join(",") );
	};
});

jQuery.extend({
	filter: function( expr, elems, not ) {
		if ( not ) {
			expr = ":not(" + expr + ")";
		}

		return elems.length === 1 ?
			jQuery.find.matchesSelector(elems[0], expr) ? [ elems[0] ] : [] :
			jQuery.find.matches(expr, elems);
	},

	dir: function( elem, dir, until ) {
		var matched = [],
			cur = elem[ dir ];

		while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
			if ( cur.nodeType === 1 ) {
				matched.push( cur );
			}
			cur = cur[dir];
		}
		return matched;
	},

	sibling: function( n, elem ) {
		var r = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				r.push( n );
			}
		}

		return r;
	}
});

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, keep ) {

	// Can't pass null or undefined to indexOf in Firefox 4
	// Set to 0 to skip string check
	qualifier = qualifier || 0;

	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep(elements, function( elem, i ) {
			var retVal = !!qualifier.call( elem, i, elem );
			return retVal === keep;
		});

	} else if ( qualifier.nodeType ) {
		return jQuery.grep(elements, function( elem, i ) {
			return ( elem === qualifier ) === keep;
		});

	} else if ( typeof qualifier === "string" ) {
		var filtered = jQuery.grep(elements, function( elem ) {
			return elem.nodeType === 1;
		});

		if ( isSimple.test( qualifier ) ) {
			return jQuery.filter(qualifier, filtered, !keep);
		} else {
			qualifier = jQuery.filter( qualifier, filtered );
		}
	}

	return jQuery.grep(elements, function( elem, i ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) === keep;
	});
}
function createSafeFragment( document ) {
	var list = nodeNames.split( "|" ),
	safeFrag = document.createDocumentFragment();

	if ( safeFrag.createElement ) {
		while ( list.length ) {
			safeFrag.createElement(
				list.pop()
			);
		}
	}
	return safeFrag;
}

var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" +
		"header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
	rinlinejQuery = / jQuery\d+="(?:null|\d+)"/g,
	rleadingWhitespace = /^\s+/,
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
	rtagName = /<([\w:]+)/,
	rtbody = /<tbody/i,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style|link)/i,
	rnocache = /<(?:script|object|embed|option|style)/i,
	rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
	rcheckableType = /^(?:checkbox|radio)$/,
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /\/(java|ecma)script/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|\-\-)|[\]\-]{2}>\s*$/g,
	wrapMap = {
		option: [ 1, "<select multiple='multiple'>", "</select>" ],
		legend: [ 1, "<fieldset>", "</fieldset>" ],
		thead: [ 1, "<table>", "</table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
		col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
		area: [ 1, "<map>", "</map>" ],
		_default: [ 0, "", "" ]
	},
	safeFragment = createSafeFragment( document ),
	fragmentDiv = safeFragment.appendChild( document.createElement("div") );

wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
// unless wrapped in a div with non-breaking characters in front of it.
if ( !jQuery.support.htmlSerialize ) {
	wrapMap._default = [ 1, "X<div>", "</div>" ];
}

jQuery.fn.extend({
	text: function( value ) {
		return jQuery.access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().append( ( this[0] && this[0].ownerDocument || document ).createTextNode( value ) );
		}, null, value, arguments.length );
	},

	wrapAll: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapAll( html.call(this, i) );
			});
		}

		if ( this[0] ) {
			// The elements to wrap the target around
			var wrap = jQuery( html, this[0].ownerDocument ).eq(0).clone(true);

			if ( this[0].parentNode ) {
				wrap.insertBefore( this[0] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstChild && elem.firstChild.nodeType === 1 ) {
					elem = elem.firstChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function(i) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	},

	append: function() {
		return this.domManip(arguments, true, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 ) {
				this.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip(arguments, true, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 ) {
				this.insertBefore( elem, this.firstChild );
			}
		});
	},

	before: function() {
		if ( !isDisconnected( this[0] ) ) {
			return this.domManip(arguments, false, function( elem ) {
				this.parentNode.insertBefore( elem, this );
			});
		}

		if ( arguments.length ) {
			var set = jQuery.clean( arguments );
			return this.pushStack( jQuery.merge( set, this ), "before", this.selector );
		}
	},

	after: function() {
		if ( !isDisconnected( this[0] ) ) {
			return this.domManip(arguments, false, function( elem ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			});
		}

		if ( arguments.length ) {
			var set = jQuery.clean( arguments );
			return this.pushStack( jQuery.merge( this, set ), "after", this.selector );
		}
	},

	// keepData is for internal use only--do not document
	remove: function( selector, keepData ) {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			if ( !selector || jQuery.filter( selector, [ elem ] ).length ) {
				if ( !keepData && elem.nodeType === 1 ) {
					jQuery.cleanData( elem.getElementsByTagName("*") );
					jQuery.cleanData( [ elem ] );
				}

				if ( elem.parentNode ) {
					elem.parentNode.removeChild( elem );
				}
			}
		}

		return this;
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; (elem = this[i]) != null; i++ ) {
			// Remove element nodes and prevent memory leaks
			if ( elem.nodeType === 1 ) {
				jQuery.cleanData( elem.getElementsByTagName("*") );
			}

			// Remove any remaining nodes
			while ( elem.firstChild ) {
				elem.removeChild( elem.firstChild );
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function () {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return jQuery.access( this, function( value ) {
			var elem = this[0] || {},
				i = 0,
				l = this.length;

			if ( value === undefined ) {
				return elem.nodeType === 1 ?
					elem.innerHTML.replace( rinlinejQuery, "" ) :
					undefined;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				( jQuery.support.htmlSerialize || !rnoshimcache.test( value )  ) &&
				( jQuery.support.leadingWhitespace || !rleadingWhitespace.test( value ) ) &&
				!wrapMap[ ( rtagName.exec( value ) || ["", ""] )[1].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for (; i < l; i++ ) {
						// Remove element nodes and prevent memory leaks
						elem = this[i] || {};
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( elem.getElementsByTagName( "*" ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch(e) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function( value ) {
		if ( !isDisconnected( this[0] ) ) {
			// Make sure that the elements are removed from the DOM before they are inserted
			// this can help fix replacing a parent with child elements
			if ( jQuery.isFunction( value ) ) {
				return this.each(function(i) {
					var self = jQuery(this), old = self.html();
					self.replaceWith( value.call( this, i, old ) );
				});
			}

			if ( typeof value !== "string" ) {
				value = jQuery( value ).detach();
			}

			return this.each(function() {
				var next = this.nextSibling,
					parent = this.parentNode;

				jQuery( this ).remove();

				if ( next ) {
					jQuery(next).before( value );
				} else {
					jQuery(parent).append( value );
				}
			});
		}

		return this.length ?
			this.pushStack( jQuery(jQuery.isFunction(value) ? value() : value), "replaceWith", value ) :
			this;
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, table, callback ) {

		// Flatten any nested arrays
		args = [].concat.apply( [], args );

		var results, first, fragment, iNoClone,
			i = 0,
			value = args[0],
			scripts = [],
			l = this.length;

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( !jQuery.support.checkClone && l > 1 && typeof value === "string" && rchecked.test( value ) ) {
			return this.each(function() {
				jQuery(this).domManip( args, table, callback );
			});
		}

		if ( jQuery.isFunction(value) ) {
			return this.each(function(i) {
				var self = jQuery(this);
				args[0] = value.call( this, i, table ? self.html() : undefined );
				self.domManip( args, table, callback );
			});
		}

		if ( this[0] ) {
			results = jQuery.buildFragment( args, this, scripts );
			fragment = results.fragment;
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			if ( first ) {
				table = table && jQuery.nodeName( first, "tr" );

				// Use the original fragment for the last item instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				// Fragments from the fragment cache must always be cloned and never used in place.
				for ( iNoClone = results.cacheable || l - 1; i < l; i++ ) {
					callback.call(
						table && jQuery.nodeName( this[i], "table" ) ?
							findOrAppend( this[i], "tbody" ) :
							this[i],
						i === iNoClone ?
							fragment :
							jQuery.clone( fragment, true, true )
					);
				}
			}

			// Fix #11809: Avoid leaking memory
			fragment = first = null;

			if ( scripts.length ) {
				jQuery.each( scripts, function( i, elem ) {
					if ( elem.src ) {
						if ( jQuery.ajax ) {
							jQuery.ajax({
								url: elem.src,
								type: "GET",
								dataType: "script",
								async: false,
								global: false,
								"throws": true
							});
						} else {
							jQuery.error("no ajax");
						}
					} else {
						jQuery.globalEval( ( elem.text || elem.textContent || elem.innerHTML || "" ).replace( rcleanScript, "" ) );
					}

					if ( elem.parentNode ) {
						elem.parentNode.removeChild( elem );
					}
				});
			}
		}

		return this;
	}
});

function findOrAppend( elem, tag ) {
	return elem.getElementsByTagName( tag )[0] || elem.appendChild( elem.ownerDocument.createElement( tag ) );
}

function cloneCopyEvent( src, dest ) {

	if ( dest.nodeType !== 1 || !jQuery.hasData( src ) ) {
		return;
	}

	var type, i, l,
		oldData = jQuery._data( src ),
		curData = jQuery._data( dest, oldData ),
		events = oldData.events;

	if ( events ) {
		delete curData.handle;
		curData.events = {};

		for ( type in events ) {
			for ( i = 0, l = events[ type ].length; i < l; i++ ) {
				jQuery.event.add( dest, type, events[ type ][ i ] );
			}
		}
	}

	// make the cloned public data object a copy from the original
	if ( curData.data ) {
		curData.data = jQuery.extend( {}, curData.data );
	}
}

function cloneFixAttributes( src, dest ) {
	var nodeName;

	// We do not need to do anything for non-Elements
	if ( dest.nodeType !== 1 ) {
		return;
	}

	// clearAttributes removes the attributes, which we don't want,
	// but also removes the attachEvent events, which we *do* want
	if ( dest.clearAttributes ) {
		dest.clearAttributes();
	}

	// mergeAttributes, in contrast, only merges back on the
	// original attributes, not the events
	if ( dest.mergeAttributes ) {
		dest.mergeAttributes( src );
	}

	nodeName = dest.nodeName.toLowerCase();

	if ( nodeName === "object" ) {
		// IE6-10 improperly clones children of object elements using classid.
		// IE10 throws NoModificationAllowedError if parent is null, #12132.
		if ( dest.parentNode ) {
			dest.outerHTML = src.outerHTML;
		}

		// This path appears unavoidable for IE9. When cloning an object
		// element in IE9, the outerHTML strategy above is not sufficient.
		// If the src has innerHTML and the destination does not,
		// copy the src.innerHTML into the dest.innerHTML. #10324
		if ( jQuery.support.html5Clone && (src.innerHTML && !jQuery.trim(dest.innerHTML)) ) {
			dest.innerHTML = src.innerHTML;
		}

	} else if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		// IE6-8 fails to persist the checked state of a cloned checkbox
		// or radio button. Worse, IE6-7 fail to give the cloned element
		// a checked appearance if the defaultChecked value isn't also set

		dest.defaultChecked = dest.checked = src.checked;

		// IE6-7 get confused and end up setting the value of a cloned
		// checkbox/radio button to an empty string instead of "on"
		if ( dest.value !== src.value ) {
			dest.value = src.value;
		}

	// IE6-8 fails to return the selected option to the default selected
	// state when cloning options
	} else if ( nodeName === "option" ) {
		dest.selected = src.defaultSelected;

	// IE6-8 fails to set the defaultValue to the correct value when
	// cloning other types of input fields
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;

	// IE blanks contents when cloning scripts
	} else if ( nodeName === "script" && dest.text !== src.text ) {
		dest.text = src.text;
	}

	// Event data gets referenced instead of copied if the expando
	// gets copied too
	dest.removeAttribute( jQuery.expando );
}

jQuery.buildFragment = function( args, context, scripts ) {
	var fragment, cacheable, cachehit,
		first = args[ 0 ];

	// Set context from what may come in as undefined or a jQuery collection or a node
	// Updated to fix #12266 where accessing context[0] could throw an exception in IE9/10 &
	// also doubles as fix for #8950 where plain objects caused createDocumentFragment exception
	context = context || document;
	context = !context.nodeType && context[0] || context;
	context = context.ownerDocument || context;

	// Only cache "small" (1/2 KB) HTML strings that are associated with the main document
	// Cloning options loses the selected state, so don't cache them
	// IE 6 doesn't like it when you put <object> or <embed> elements in a fragment
	// Also, WebKit does not clone 'checked' attributes on cloneNode, so don't cache
	// Lastly, IE6,7,8 will not correctly reuse cached fragments that were created from unknown elems #10501
	if ( args.length === 1 && typeof first === "string" && first.length < 512 && context === document &&
		first.charAt(0) === "<" && !rnocache.test( first ) &&
		(jQuery.support.checkClone || !rchecked.test( first )) &&
		(jQuery.support.html5Clone || !rnoshimcache.test( first )) ) {

		// Mark cacheable and look for a hit
		cacheable = true;
		fragment = jQuery.fragments[ first ];
		cachehit = fragment !== undefined;
	}

	if ( !fragment ) {
		fragment = context.createDocumentFragment();
		jQuery.clean( args, context, fragment, scripts );

		// Update the cache, but only store false
		// unless this is a second parsing of the same content
		if ( cacheable ) {
			jQuery.fragments[ first ] = cachehit && fragment;
		}
	}

	return { fragment: fragment, cacheable: cacheable };
};

jQuery.fragments = {};

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			i = 0,
			ret = [],
			insert = jQuery( selector ),
			l = insert.length,
			parent = this.length === 1 && this[0].parentNode;

		if ( (parent == null || parent && parent.nodeType === 11 && parent.childNodes.length === 1) && l === 1 ) {
			insert[ original ]( this[0] );
			return this;
		} else {
			for ( ; i < l; i++ ) {
				elems = ( i > 0 ? this.clone(true) : this ).get();
				jQuery( insert[i] )[ original ]( elems );
				ret = ret.concat( elems );
			}

			return this.pushStack( ret, name, insert.selector );
		}
	};
});

function getAll( elem ) {
	if ( typeof elem.getElementsByTagName !== "undefined" ) {
		return elem.getElementsByTagName( "*" );

	} else if ( typeof elem.querySelectorAll !== "undefined" ) {
		return elem.querySelectorAll( "*" );

	} else {
		return [];
	}
}

// Used in clean, fixes the defaultChecked property
function fixDefaultChecked( elem ) {
	if ( rcheckableType.test( elem.type ) ) {
		elem.defaultChecked = elem.checked;
	}
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var srcElements,
			destElements,
			i,
			clone;

		if ( jQuery.support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test( "<" + elem.nodeName + ">" ) ) {
			clone = elem.cloneNode( true );

		// IE<=8 does not properly clone detached, unknown element nodes
		} else {
			fragmentDiv.innerHTML = elem.outerHTML;
			fragmentDiv.removeChild( clone = fragmentDiv.firstChild );
		}

		if ( (!jQuery.support.noCloneEvent || !jQuery.support.noCloneChecked) &&
				(elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem) ) {
			// IE copies events bound via attachEvent when using cloneNode.
			// Calling detachEvent on the clone will also remove the events
			// from the original. In order to get around this, we use some
			// proprietary methods to clear the events. Thanks to MooTools
			// guys for this hotness.

			cloneFixAttributes( elem, clone );

			// Using Sizzle here is crazy slow, so we use getElementsByTagName instead
			srcElements = getAll( elem );
			destElements = getAll( clone );

			// Weird iteration because IE will replace the length property
			// with an element if you are cloning the body and one of the
			// elements on the page has a name or id of "length"
			for ( i = 0; srcElements[i]; ++i ) {
				// Ensure that the destination node is not null; Fixes #9587
				if ( destElements[i] ) {
					cloneFixAttributes( srcElements[i], destElements[i] );
				}
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			cloneCopyEvent( elem, clone );

			if ( deepDataAndEvents ) {
				srcElements = getAll( elem );
				destElements = getAll( clone );

				for ( i = 0; srcElements[i]; ++i ) {
					cloneCopyEvent( srcElements[i], destElements[i] );
				}
			}
		}

		srcElements = destElements = null;

		// Return the cloned set
		return clone;
	},

	clean: function( elems, context, fragment, scripts ) {
		var i, j, elem, tag, wrap, depth, div, hasBody, tbody, len, handleScript, jsTags,
			safe = context === document && safeFragment,
			ret = [];

		// Ensure that context is a document
		if ( !context || typeof context.createDocumentFragment === "undefined" ) {
			context = document;
		}

		// Use the already-created safe fragment if context permits
		for ( i = 0; (elem = elems[i]) != null; i++ ) {
			if ( typeof elem === "number" ) {
				elem += "";
			}

			if ( !elem ) {
				continue;
			}

			// Convert html string into DOM nodes
			if ( typeof elem === "string" ) {
				if ( !rhtml.test( elem ) ) {
					elem = context.createTextNode( elem );
				} else {
					// Ensure a safe container in which to render the html
					safe = safe || createSafeFragment( context );
					div = context.createElement("div");
					safe.appendChild( div );

					// Fix "XHTML"-style tags in all browsers
					elem = elem.replace(rxhtmlTag, "<$1></$2>");

					// Go to html and back, then peel off extra wrappers
					tag = ( rtagName.exec( elem ) || ["", ""] )[1].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;
					depth = wrap[0];
					div.innerHTML = wrap[1] + elem + wrap[2];

					// Move to the right depth
					while ( depth-- ) {
						div = div.lastChild;
					}

					// Remove IE's autoinserted <tbody> from table fragments
					if ( !jQuery.support.tbody ) {

						// String was a <table>, *may* have spurious <tbody>
						hasBody = rtbody.test(elem);
							tbody = tag === "table" && !hasBody ?
								div.firstChild && div.firstChild.childNodes :

								// String was a bare <thead> or <tfoot>
								wrap[1] === "<table>" && !hasBody ?
									div.childNodes :
									[];

						for ( j = tbody.length - 1; j >= 0 ; --j ) {
							if ( jQuery.nodeName( tbody[ j ], "tbody" ) && !tbody[ j ].childNodes.length ) {
								tbody[ j ].parentNode.removeChild( tbody[ j ] );
							}
						}
					}

					// IE completely kills leading whitespace when innerHTML is used
					if ( !jQuery.support.leadingWhitespace && rleadingWhitespace.test( elem ) ) {
						div.insertBefore( context.createTextNode( rleadingWhitespace.exec(elem)[0] ), div.firstChild );
					}

					elem = div.childNodes;

					// Take out of fragment container (we need a fresh div each time)
					div.parentNode.removeChild( div );
				}
			}

			if ( elem.nodeType ) {
				ret.push( elem );
			} else {
				jQuery.merge( ret, elem );
			}
		}

		// Fix #11356: Clear elements from safeFragment
		if ( div ) {
			elem = div = safe = null;
		}

		// Reset defaultChecked for any radios and checkboxes
		// about to be appended to the DOM in IE 6/7 (#8060)
		if ( !jQuery.support.appendChecked ) {
			for ( i = 0; (elem = ret[i]) != null; i++ ) {
				if ( jQuery.nodeName( elem, "input" ) ) {
					fixDefaultChecked( elem );
				} else if ( typeof elem.getElementsByTagName !== "undefined" ) {
					jQuery.grep( elem.getElementsByTagName("input"), fixDefaultChecked );
				}
			}
		}

		// Append elements to a provided document fragment
		if ( fragment ) {
			// Special handling of each script element
			handleScript = function( elem ) {
				// Check if we consider it executable
				if ( !elem.type || rscriptType.test( elem.type ) ) {
					// Detach the script and store it in the scripts array (if provided) or the fragment
					// Return truthy to indicate that it has been handled
					return scripts ?
						scripts.push( elem.parentNode ? elem.parentNode.removeChild( elem ) : elem ) :
						fragment.appendChild( elem );
				}
			};

			for ( i = 0; (elem = ret[i]) != null; i++ ) {
				// Check if we're done after handling an executable script
				if ( !( jQuery.nodeName( elem, "script" ) && handleScript( elem ) ) ) {
					// Append to fragment and handle embedded scripts
					fragment.appendChild( elem );
					if ( typeof elem.getElementsByTagName !== "undefined" ) {
						// handleScript alters the DOM, so use jQuery.merge to ensure snapshot iteration
						jsTags = jQuery.grep( jQuery.merge( [], elem.getElementsByTagName("script") ), handleScript );

						// Splice the scripts into ret after their former ancestor and advance our index beyond them
						ret.splice.apply( ret, [i + 1, 0].concat( jsTags ) );
						i += jsTags.length;
					}
				}
			}
		}

		return ret;
	},

	cleanData: function( elems, /* internal */ acceptData ) {
		var data, id, elem, type,
			i = 0,
			internalKey = jQuery.expando,
			cache = jQuery.cache,
			deleteExpando = jQuery.support.deleteExpando,
			special = jQuery.event.special;

		for ( ; (elem = elems[i]) != null; i++ ) {

			if ( acceptData || jQuery.acceptData( elem ) ) {

				id = elem[ internalKey ];
				data = id && cache[ id ];

				if ( data ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Remove cache only if it was not already removed by jQuery.event.remove
					if ( cache[ id ] ) {

						delete cache[ id ];

						// IE does not allow us to delete expando properties from nodes,
						// nor does it have a removeAttribute function on Document nodes;
						// we must handle all of these cases
						if ( deleteExpando ) {
							delete elem[ internalKey ];

						} else if ( elem.removeAttribute ) {
							elem.removeAttribute( internalKey );

						} else {
							elem[ internalKey ] = null;
						}

						jQuery.deletedIds.push( id );
					}
				}
			}
		}
	}
});
// Limit scope pollution from any deprecated API
(function() {

var matched, browser;

// Use of jQuery.browser is frowned upon.
// More details: http://api.jquery.com/jQuery.browser
// jQuery.uaMatch maintained for back-compat
jQuery.uaMatch = function( ua ) {
	ua = ua.toLowerCase();

	var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
		/(webkit)[ \/]([\w.]+)/.exec( ua ) ||
		/(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
		/(msie) ([\w.]+)/.exec( ua ) ||
		ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
		[];

	return {
		browser: match[ 1 ] || "",
		version: match[ 2 ] || "0"
	};
};

matched = jQuery.uaMatch( navigator.userAgent );
browser = {};

if ( matched.browser ) {
	browser[ matched.browser ] = true;
	browser.version = matched.version;
}

// Chrome is Webkit, but Webkit is also Safari.
if ( browser.chrome ) {
	browser.webkit = true;
} else if ( browser.webkit ) {
	browser.safari = true;
}

jQuery.browser = browser;

jQuery.sub = function() {
	function jQuerySub( selector, context ) {
		return new jQuerySub.fn.init( selector, context );
	}
	jQuery.extend( true, jQuerySub, this );
	jQuerySub.superclass = this;
	jQuerySub.fn = jQuerySub.prototype = this();
	jQuerySub.fn.constructor = jQuerySub;
	jQuerySub.sub = this.sub;
	jQuerySub.fn.init = function init( selector, context ) {
		if ( context && context instanceof jQuery && !(context instanceof jQuerySub) ) {
			context = jQuerySub( context );
		}

		return jQuery.fn.init.call( this, selector, context, rootjQuerySub );
	};
	jQuerySub.fn.init.prototype = jQuerySub.fn;
	var rootjQuerySub = jQuerySub(document);
	return jQuerySub;
};

})();
var curCSS, iframe, iframeDoc,
	ralpha = /alpha\([^)]*\)/i,
	ropacity = /opacity=([^)]*)/,
	rposition = /^(top|right|bottom|left)$/,
	// swappable if display is none or starts with table except "table", "table-cell", or "table-caption"
	// see here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rmargin = /^margin/,
	rnumsplit = new RegExp( "^(" + core_pnum + ")(.*)$", "i" ),
	rnumnonpx = new RegExp( "^(" + core_pnum + ")(?!px)[a-z%]+$", "i" ),
	rrelNum = new RegExp( "^([-+])=(" + core_pnum + ")", "i" ),
	elemdisplay = {},

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: 0,
		fontWeight: 400
	},

	cssExpand = [ "Top", "Right", "Bottom", "Left" ],
	cssPrefixes = [ "Webkit", "O", "Moz", "ms" ],

	eventsToggle = jQuery.fn.toggle;

// return a css property mapped to a potentially vendor prefixed property
function vendorPropName( style, name ) {

	// shortcut for names that are not vendor prefixed
	if ( name in style ) {
		return name;
	}

	// check for vendor prefixed names
	var capName = name.charAt(0).toUpperCase() + name.slice(1),
		origName = name,
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in style ) {
			return name;
		}
	}

	return origName;
}

function isHidden( elem, el ) {
	elem = el || elem;
	return jQuery.css( elem, "display" ) === "none" || !jQuery.contains( elem.ownerDocument, elem );
}

function showHide( elements, show ) {
	var elem, display,
		values = [],
		index = 0,
		length = elements.length;

	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		values[ index ] = jQuery._data( elem, "olddisplay" );
		if ( show ) {
			// Reset the inline display of this element to learn if it is
			// being hidden by cascaded rules or not
			if ( !values[ index ] && elem.style.display === "none" ) {
				elem.style.display = "";
			}

			// Set elements which have been overridden with display: none
			// in a stylesheet to whatever the default browser style is
			// for such an element
			if ( elem.style.display === "" && isHidden( elem ) ) {
				values[ index ] = jQuery._data( elem, "olddisplay", css_defaultDisplay(elem.nodeName) );
			}
		} else {
			display = curCSS( elem, "display" );

			if ( !values[ index ] && display !== "none" ) {
				jQuery._data( elem, "olddisplay", display );
			}
		}
	}

	// Set the display of most of the elements in a second loop
	// to avoid the constant reflow
	for ( index = 0; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}
		if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
			elem.style.display = show ? values[ index ] || "" : "none";
		}
	}

	return elements;
}

jQuery.fn.extend({
	css: function( name, value ) {
		return jQuery.access( this, function( elem, name, value ) {
			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	},
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state, fn2 ) {
		var bool = typeof state === "boolean";

		if ( jQuery.isFunction( state ) && jQuery.isFunction( fn2 ) ) {
			return eventsToggle.apply( this, arguments );
		}

		return this.each(function() {
			if ( bool ? state : isHidden( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		});
	}
});

jQuery.extend({
	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {
					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;

				}
			}
		}
	},

	// Exclude the following css properties to add px
	cssNumber: {
		"fillOpacity": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		// normalize float css property
		"float": jQuery.support.cssFloat ? "cssFloat" : "styleFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {
		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = jQuery.camelCase( name ),
			style = elem.style;

		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// convert relative number strings (+= or -=) to relative numbers. #7345
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( ret[1] + 1 ) * ret[2] + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that NaN and null values aren't set. See: #7116
			if ( value == null || type === "number" && isNaN( value ) ) {
				return;
			}

			// If a number was passed in, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value, extra )) !== undefined ) {
				// Wrapped to prevent IE from throwing errors when 'invalid' values are provided
				// Fixes bug #5509
				try {
					style[ name ] = value;
				} catch(e) {}
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, numeric, extra ) {
		var val, num, hooks,
			origName = jQuery.camelCase( name );

		// Make sure that we're working with the right name
		name = jQuery.cssProps[ origName ] || ( jQuery.cssProps[ origName ] = vendorPropName( elem.style, origName ) );

		// gets hook for the prefixed version
		// followed by the unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name );
		}

		//convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Return, converting to number if forced or a qualifier was provided and val looks numeric
		if ( numeric || extra !== undefined ) {
			num = parseFloat( val );
			return numeric || jQuery.isNumeric( num ) ? num || 0 : val;
		}
		return val;
	},

	// A method for quickly swapping in/out CSS properties to get correct calculations
	swap: function( elem, options, callback ) {
		var ret, name,
			old = {};

		// Remember the old values, and insert the new ones
		for ( name in options ) {
			old[ name ] = elem.style[ name ];
			elem.style[ name ] = options[ name ];
		}

		ret = callback.call( elem );

		// Revert the old values
		for ( name in options ) {
			elem.style[ name ] = old[ name ];
		}

		return ret;
	}
});

// NOTE: To any future maintainer, we've window.getComputedStyle
// because jsdom on node.js will break without it.
if ( window.getComputedStyle ) {
	curCSS = function( elem, name ) {
		var ret, width, minWidth, maxWidth,
			computed = window.getComputedStyle( elem, null ),
			style = elem.style;

		if ( computed ) {

			ret = computed[ name ];
			if ( ret === "" && !jQuery.contains( elem.ownerDocument, elem ) ) {
				ret = jQuery.style( elem, name );
			}

			// A tribute to the "awesome hack by Dean Edwards"
			// Chrome < 17 and Safari 5.0 uses "computed value" instead of "used value" for margin-right
			// Safari 5.1.7 (at least) returns percentage for a larger set of values, but width seems to be reliably pixels
			// this is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
			if ( rnumnonpx.test( ret ) && rmargin.test( name ) ) {
				width = style.width;
				minWidth = style.minWidth;
				maxWidth = style.maxWidth;

				style.minWidth = style.maxWidth = style.width = ret;
				ret = computed.width;

				style.width = width;
				style.minWidth = minWidth;
				style.maxWidth = maxWidth;
			}
		}

		return ret;
	};
} else if ( document.documentElement.currentStyle ) {
	curCSS = function( elem, name ) {
		var left, rsLeft,
			ret = elem.currentStyle && elem.currentStyle[ name ],
			style = elem.style;

		// Avoid setting ret to empty string here
		// so we don't default to auto
		if ( ret == null && style && style[ name ] ) {
			ret = style[ name ];
		}

		// From the awesome hack by Dean Edwards
		// http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

		// If we're not dealing with a regular pixel number
		// but a number that has a weird ending, we need to convert it to pixels
		// but not position css attributes, as those are proportional to the parent element instead
		// and we can't measure the parent instead because it might trigger a "stacking dolls" problem
		if ( rnumnonpx.test( ret ) && !rposition.test( name ) ) {

			// Remember the original values
			left = style.left;
			rsLeft = elem.runtimeStyle && elem.runtimeStyle.left;

			// Put in the new values to get a computed value out
			if ( rsLeft ) {
				elem.runtimeStyle.left = elem.currentStyle.left;
			}
			style.left = name === "fontSize" ? "1em" : ret;
			ret = style.pixelLeft + "px";

			// Revert the changed values
			style.left = left;
			if ( rsLeft ) {
				elem.runtimeStyle.left = rsLeft;
			}
		}

		return ret === "" ? "auto" : ret;
	};
}

function setPositiveNumber( elem, value, subtract ) {
	var matches = rnumsplit.exec( value );
	return matches ?
			Math.max( 0, matches[ 1 ] - ( subtract || 0 ) ) + ( matches[ 2 ] || "px" ) :
			value;
}

function augmentWidthOrHeight( elem, name, extra, isBorderBox ) {
	var i = extra === ( isBorderBox ? "border" : "content" ) ?
		// If we already have the right measurement, avoid augmentation
		4 :
		// Otherwise initialize for horizontal or vertical properties
		name === "width" ? 1 : 0,

		val = 0;

	for ( ; i < 4; i += 2 ) {
		// both box models exclude margin, so add it if we want it
		if ( extra === "margin" ) {
			// we use jQuery.css instead of curCSS here
			// because of the reliableMarginRight CSS hook!
			val += jQuery.css( elem, extra + cssExpand[ i ], true );
		}

		// From this point on we use curCSS for maximum performance (relevant in animations)
		if ( isBorderBox ) {
			// border-box includes padding, so remove it if we want content
			if ( extra === "content" ) {
				val -= parseFloat( curCSS( elem, "padding" + cssExpand[ i ] ) ) || 0;
			}

			// at this point, extra isn't border nor margin, so remove border
			if ( extra !== "margin" ) {
				val -= parseFloat( curCSS( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
			}
		} else {
			// at this point, extra isn't content, so add padding
			val += parseFloat( curCSS( elem, "padding" + cssExpand[ i ] ) ) || 0;

			// at this point, extra isn't content nor padding, so add border
			if ( extra !== "padding" ) {
				val += parseFloat( curCSS( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
			}
		}
	}

	return val;
}

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property, which is equivalent to the border-box value
	var val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		valueIsBorderBox = true,
		isBorderBox = jQuery.support.boxSizing && jQuery.css( elem, "boxSizing" ) === "border-box";

	// some non-html elements return undefined for offsetWidth, so check for null/undefined
	// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
	// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
	if ( val <= 0 || val == null ) {
		// Fall back to computed then uncomputed css if necessary
		val = curCSS( elem, name );
		if ( val < 0 || val == null ) {
			val = elem.style[ name ];
		}

		// Computed unit is not pixels. Stop here and return.
		if ( rnumnonpx.test(val) ) {
			return val;
		}

		// we need the check for style in case a browser which returns unreliable values
		// for getComputedStyle silently falls back to the reliable elem.style
		valueIsBorderBox = isBorderBox && ( jQuery.support.boxSizingReliable || val === elem.style[ name ] );

		// Normalize "", auto, and prepare for extra
		val = parseFloat( val ) || 0;
	}

	// use the active box-sizing model to add/subtract irrelevant styles
	return ( val +
		augmentWidthOrHeight(
			elem,
			name,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox
		)
	) + "px";
}


// Try to determine the default display value of an element
function css_defaultDisplay( nodeName ) {
	if ( elemdisplay[ nodeName ] ) {
		return elemdisplay[ nodeName ];
	}

	var elem = jQuery( "<" + nodeName + ">" ).appendTo( document.body ),
		display = elem.css("display");
	elem.remove();

	// If the simple way fails,
	// get element's real default display by attaching it to a temp iframe
	if ( display === "none" || display === "" ) {
		// Use the already-created iframe if possible
		iframe = document.body.appendChild(
			iframe || jQuery.extend( document.createElement("iframe"), {
				frameBorder: 0,
				width: 0,
				height: 0
			})
		);

		// Create a cacheable copy of the iframe document on first call.
		// IE and Opera will allow us to reuse the iframeDoc without re-writing the fake HTML
		// document to it; WebKit & Firefox won't allow reusing the iframe document.
		if ( !iframeDoc || !iframe.createElement ) {
			iframeDoc = ( iframe.contentWindow || iframe.contentDocument ).document;
			iframeDoc.write("<!doctype html><html><body>");
			iframeDoc.close();
		}

		elem = iframeDoc.body.appendChild( iframeDoc.createElement(nodeName) );

		display = curCSS( elem, "display" );
		document.body.removeChild( iframe );
	}

	// Store the correct default display
	elemdisplay[ nodeName ] = display;

	return display;
}

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {
				// certain elements can have dimension info if we invisibly show them
				// however, it must have a current display style that would benefit from this
				if ( elem.offsetWidth === 0 && rdisplayswap.test( curCSS( elem, "display" ) ) ) {
					return jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					});
				} else {
					return getWidthOrHeight( elem, name, extra );
				}
			}
		},

		set: function( elem, value, extra ) {
			return setPositiveNumber( elem, value, extra ?
				augmentWidthOrHeight(
					elem,
					name,
					extra,
					jQuery.support.boxSizing && jQuery.css( elem, "boxSizing" ) === "border-box"
				) : 0
			);
		}
	};
});

if ( !jQuery.support.opacity ) {
	jQuery.cssHooks.opacity = {
		get: function( elem, computed ) {
			// IE uses filters for opacity
			return ropacity.test( (computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "" ) ?
				( 0.01 * parseFloat( RegExp.$1 ) ) + "" :
				computed ? "1" : "";
		},

		set: function( elem, value ) {
			var style = elem.style,
				currentStyle = elem.currentStyle,
				opacity = jQuery.isNumeric( value ) ? "alpha(opacity=" + value * 100 + ")" : "",
				filter = currentStyle && currentStyle.filter || style.filter || "";

			// IE has trouble with opacity if it does not have layout
			// Force it by setting the zoom level
			style.zoom = 1;

			// if setting opacity to 1, and no other filters exist - attempt to remove filter attribute #6652
			if ( value >= 1 && jQuery.trim( filter.replace( ralpha, "" ) ) === "" &&
				style.removeAttribute ) {

				// Setting style.filter to null, "" & " " still leave "filter:" in the cssText
				// if "filter:" is present at all, clearType is disabled, we want to avoid this
				// style.removeAttribute is IE Only, but so apparently is this code path...
				style.removeAttribute( "filter" );

				// if there there is no filter style applied in a css rule, we are done
				if ( currentStyle && !currentStyle.filter ) {
					return;
				}
			}

			// otherwise, set new filter values
			style.filter = ralpha.test( filter ) ?
				filter.replace( ralpha, opacity ) :
				filter + " " + opacity;
		}
	};
}

// These hooks cannot be added until DOM ready because the support test
// for it is not run until after DOM ready
jQuery(function() {
	if ( !jQuery.support.reliableMarginRight ) {
		jQuery.cssHooks.marginRight = {
			get: function( elem, computed ) {
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// Work around by temporarily setting element display to inline-block
				return jQuery.swap( elem, { "display": "inline-block" }, function() {
					if ( computed ) {
						return curCSS( elem, "marginRight" );
					}
				});
			}
		};
	}

	// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
	// getComputedStyle returns percent when specified for top/left/bottom/right
	// rather than make the css module depend on the offset module, we just check for it here
	if ( !jQuery.support.pixelPosition && jQuery.fn.position ) {
		jQuery.each( [ "top", "left" ], function( i, prop ) {
			jQuery.cssHooks[ prop ] = {
				get: function( elem, computed ) {
					if ( computed ) {
						var ret = curCSS( elem, prop );
						// if curCSS returns percentage, fallback to offset
						return rnumnonpx.test( ret ) ? jQuery( elem ).position()[ prop ] + "px" : ret;
					}
				}
			};
		});
	}

});

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.hidden = function( elem ) {
		return ( elem.offsetWidth === 0 && elem.offsetHeight === 0 ) || (!jQuery.support.reliableHiddenOffsets && ((elem.style && elem.style.display) || curCSS( elem, "display" )) === "none");
	};

	jQuery.expr.filters.visible = function( elem ) {
		return !jQuery.expr.filters.hidden( elem );
	};
}

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i,

				// assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ],
				expanded = {};

			for ( i = 0; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( !rmargin.test( prefix ) ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
});
var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rinput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,
	rselectTextarea = /^(?:select|textarea)/i;

jQuery.fn.extend({
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map(function(){
			return this.elements ? jQuery.makeArray( this.elements ) : this;
		})
		.filter(function(){
			return this.name && !this.disabled &&
				( this.checked || rselectTextarea.test( this.nodeName ) ||
					rinput.test( this.type ) );
		})
		.map(function( i, elem ){
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val, i ){
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});

//Serialize an array of form elements or a set of
//key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, value ) {
			// If value is a function, invoke it and return its value
			value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
			s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
		};

	// Set traditional to true for jQuery <= 1.3.2 behavior.
	if ( traditional === undefined ) {
		traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		});

	} else {
		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" ).replace( r20, "+" );
};

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// If array item is non-scalar (array or object), encode its
				// numeric index to resolve deserialization ambiguity issues.
				// Note that rack (as of 1.0.0) can't currently deserialize
				// nested arrays properly, and attempting to do so may cause
				// a server error. Possible fixes are to modify rack's
				// deserialization algorithm or to provide an option or flag
				// to force array serialization to be shallow.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}
var // Document location
	ajaxLocation,
	// Document location segments
	ajaxLocParts,

	rhash = /#.*$/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rquery = /\?/,
	rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
	rts = /([?&])_=[^&]*/,
	rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,

	// Keep a copy of the old load method
	_load = jQuery.fn.load,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = ["*/"] + ["*"];

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType, list, placeBefore,
			dataTypes = dataTypeExpression.toLowerCase().split( core_rspace ),
			i = 0,
			length = dataTypes.length;

		if ( jQuery.isFunction( func ) ) {
			// For each dataType in the dataTypeExpression
			for ( ; i < length; i++ ) {
				dataType = dataTypes[ i ];
				// We control if we're asked to add before
				// any existing element
				placeBefore = /^\+/.test( dataType );
				if ( placeBefore ) {
					dataType = dataType.substr( 1 ) || "*";
				}
				list = structure[ dataType ] = structure[ dataType ] || [];
				// then we add to the structure accordingly
				list[ placeBefore ? "unshift" : "push" ]( func );
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR,
		dataType /* internal */, inspected /* internal */ ) {

	dataType = dataType || options.dataTypes[ 0 ];
	inspected = inspected || {};

	inspected[ dataType ] = true;

	var selection,
		list = structure[ dataType ],
		i = 0,
		length = list ? list.length : 0,
		executeOnly = ( structure === prefilters );

	for ( ; i < length && ( executeOnly || !selection ); i++ ) {
		selection = list[ i ]( options, originalOptions, jqXHR );
		// If we got redirected to another dataType
		// we try there if executing only and not done already
		if ( typeof selection === "string" ) {
			if ( !executeOnly || inspected[ selection ] ) {
				selection = undefined;
			} else {
				options.dataTypes.unshift( selection );
				selection = inspectPrefiltersOrTransports(
						structure, options, originalOptions, jqXHR, selection, inspected );
			}
		}
	}
	// If we're only executing or nothing was selected
	// we try the catchall dataType if not done already
	if ( ( executeOnly || !selection ) && !inspected[ "*" ] ) {
		selection = inspectPrefiltersOrTransports(
				structure, options, originalOptions, jqXHR, "*", inspected );
	}
	// unnecessary when only executing (prefilters)
	// but it'll be ignored by the caller in that case
	return selection;
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};
	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}
}

jQuery.fn.load = function( url, params, callback ) {
	if ( typeof url !== "string" && _load ) {
		return _load.apply( this, arguments );
	}

	// Don't do a request if no elements are being requested
	if ( !this.length ) {
		return this;
	}

	var selector, type, response,
		self = this,
		off = url.indexOf(" ");

	if ( off >= 0 ) {
		selector = url.slice( off, url.length );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( jQuery.isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// Request the remote document
	jQuery.ajax({
		url: url,

		// if "type" variable is undefined, then "GET" method will be used
		type: type,
		dataType: "html",
		data: params,
		complete: function( jqXHR, status ) {
			if ( callback ) {
				self.each( callback, response || [ jqXHR.responseText, status, jqXHR ] );
			}
		}
	}).done(function( responseText ) {

		// Save response for use in complete callback
		response = arguments;

		// See if a selector was specified
		self.html( selector ?

			// Create a dummy div to hold the results
			jQuery("<div>")

				// inject the contents of the document in, removing the scripts
				// to avoid any 'Permission Denied' errors in IE
				.append( responseText.replace( rscript, "" ) )

				// Locate the specified elements
				.find( selector ) :

			// If not, just inject the full result
			responseText );

	});

	return this;
};

// Attach a bunch of functions for handling common AJAX events
jQuery.each( "ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split( " " ), function( i, o ){
	jQuery.fn[ o ] = function( f ){
		return this.on( o, f );
	};
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			type: method,
			url: url,
			data: data,
			success: callback,
			dataType: type
		});
	};
});

jQuery.extend({

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		if ( settings ) {
			// Building a settings object
			ajaxExtend( target, jQuery.ajaxSettings );
		} else {
			// Extending ajaxSettings
			settings = target;
			target = jQuery.ajaxSettings;
		}
		ajaxExtend( target, settings );
		return target;
	},

	ajaxSettings: {
		url: ajaxLocation,
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		type: "GET",
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		processData: true,
		async: true,
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			xml: "application/xml, text/xml",
			html: "text/html",
			text: "text/plain",
			json: "application/json, text/javascript",
			"*": allTypes
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText"
		},

		// List of data converters
		// 1) key format is "source_type destination_type" (a single space in-between)
		// 2) the catchall symbol "*" can be used for source_type
		converters: {

			// Convert anything to text
			"* text": window.String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			context: true,
			url: true
		}
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var // ifModified key
			ifModifiedKey,
			// Response headers
			responseHeadersString,
			responseHeaders,
			// transport
			transport,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
			parts,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events
			// It's the callbackContext if one was provided in the options
			// and if it's a DOM node or a jQuery collection
			globalEventContext = callbackContext !== s &&
				( callbackContext.nodeType || callbackContext instanceof jQuery ) ?
						jQuery( callbackContext ) : jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// The jqXHR state
			state = 0,
			// Default abort message
			strAbort = "canceled",
			// Fake xhr
			jqXHR = {

				readyState: 0,

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( !state ) {
						var lname = name.toLowerCase();
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match === undefined ? null : match;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					statusText = statusText || strAbort;
					if ( transport ) {
						transport.abort( statusText );
					}
					done( 0, statusText );
					return this;
				}
			};

		// Callback for when everything is done
		// It is defined here because jslint complains if it is declared
		// at the end of the function (which would be more logical and readable)
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// If successful, handle type chaining
			if ( status >= 200 && status < 300 || status === 304 ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {

					modified = jqXHR.getResponseHeader("Last-Modified");
					if ( modified ) {
						jQuery.lastModified[ ifModifiedKey ] = modified;
					}
					modified = jqXHR.getResponseHeader("Etag");
					if ( modified ) {
						jQuery.etag[ ifModifiedKey ] = modified;
					}
				}

				// If not modified
				if ( status === 304 ) {

					statusText = "notmodified";
					isSuccess = true;

				// If we have data
				} else {

					isSuccess = ajaxConvert( s, response );
					statusText = isSuccess.state;
					success = isSuccess.data;
					error = isSuccess.error;
					isSuccess = !error;
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( !statusText || status ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = "" + ( nativeStatusText || statusText );

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajax" + ( isSuccess ? "Success" : "Error" ),
						[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		// Attach deferreds
		deferred.promise( jqXHR );
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;
		jqXHR.complete = completeDeferred.add;

		// Status-dependent callbacks
		jqXHR.statusCode = function( map ) {
			if ( map ) {
				var tmp;
				if ( state < 2 ) {
					for ( tmp in map ) {
						statusCode[ tmp ] = [ statusCode[tmp], map[tmp] ];
					}
				} else {
					tmp = map[ jqXHR.status ];
					jqXHR.always( tmp );
				}
			}
			return this;
		};

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
		// We also use the url parameter if available
		s.url = ( ( url || s.url ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().split( core_rspace );

		// Determine if a cross-domain request is in order
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] != ajaxLocParts[ 1 ] || parts[ 2 ] != ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? 80 : 443 ) ) !=
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? 80 : 443 ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.data;
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Get ifModifiedKey before adding the anti-cache parameter
			ifModifiedKey = s.url;

			// Add anti-cache in url if needed
			if ( s.cache === false ) {

				var ts = jQuery.now(),
					// try replacing _= if it is there
					ret = s.url.replace( rts, "$1_=" + ts );

				// if nothing was replaced, add timestamp to the end
				s.url = ret + ( ( ret === s.url ) ? ( rquery.test( s.url ) ? "&" : "?" ) + "_=" + ts : "" );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			ifModifiedKey = ifModifiedKey || s.url;
			if ( jQuery.lastModified[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ ifModifiedKey ] );
			}
			if ( jQuery.etag[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ ifModifiedKey ] );
			}
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
				// Abort if not done already and return
				return jqXHR.abort();

		}

		// aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;
			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout( function(){
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch (e) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		return jqXHR;
	},

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {}

});

/* Handles responses to an ajax request:
 * - sets all responseXXX fields accordingly
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes,
		responseFields = s.responseFields;

	// Fill responseXXX fields
	for ( type in responseFields ) {
		if ( type in responses ) {
			jqXHR[ responseFields[type] ] = responses[ type ];
		}
	}

	// Remove auto dataType and get content-type in the process
	while( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "content-type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

// Chain conversions given the request and the original response
function ajaxConvert( s, response ) {

	var conv, conv2, current, tmp,
		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice(),
		prev = dataTypes[ 0 ],
		converters = {},
		i = 0;

	// Apply the dataFilter if provided
	if ( s.dataFilter ) {
		response = s.dataFilter( response, s.dataType );
	}

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	// Convert to each sequential dataType, tolerating list modification
	for ( ; (current = dataTypes[++i]); ) {

		// There's only work to do if current dataType is non-auto
		if ( current !== "*" ) {

			// Convert response if prev dataType is non-auto and differs from current
			if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split(" ");
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {
								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.splice( i--, 0, current );
								}

								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s["throws"] ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return { state: "parsererror", error: conv ? e : "No conversion from " + prev + " to " + current };
						}
					}
				}
			}

			// Update prev for next iteration
			prev = current;
		}
	}

	return { state: "success", data: response };
}
var oldCallbacks = [],
	rquestion = /\?/,
	rjsonp = /(=)\?(?=&|$)|\?\?/,
	nonce = jQuery.now();

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
		this[ callback ] = true;
		return callback;
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		data = s.data,
		url = s.url,
		hasCallback = s.jsonp !== false,
		replaceInUrl = hasCallback && rjsonp.test( url ),
		replaceInData = hasCallback && !replaceInUrl && typeof data === "string" &&
			!( s.contentType || "" ).indexOf("application/x-www-form-urlencoded") &&
			rjsonp.test( data );

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( s.dataTypes[ 0 ] === "jsonp" || replaceInUrl || replaceInData ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;
		overwritten = window[ callbackName ];

		// Insert callback into url or form data
		if ( replaceInUrl ) {
			s.url = url.replace( rjsonp, "$1" + callbackName );
		} else if ( replaceInData ) {
			s.data = data.replace( rjsonp, "$1" + callbackName );
		} else if ( hasCallback ) {
			s.url += ( rquestion.test( url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always(function() {
			// Restore preexisting value
			window[ callbackName ] = overwritten;

			// Save back as free
			if ( s[ callbackName ] ) {
				// make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		});

		// Delegate to script
		return "script";
	}
});
// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /javascript|ecmascript/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and global
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
		s.global = false;
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function(s) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {

		var script,
			head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;

		return {

			send: function( _, callback ) {

				script = document.createElement( "script" );

				script.async = "async";

				if ( s.scriptCharset ) {
					script.charset = s.scriptCharset;
				}

				script.src = s.url;

				// Attach handlers for all browsers
				script.onload = script.onreadystatechange = function( _, isAbort ) {

					if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

						// Handle memory leak in IE
						script.onload = script.onreadystatechange = null;

						// Remove the script
						if ( head && script.parentNode ) {
							head.removeChild( script );
						}

						// Dereference the script
						script = undefined;

						// Callback if not abort
						if ( !isAbort ) {
							callback( 200, "success" );
						}
					}
				};
				// Use insertBefore instead of appendChild  to circumvent an IE6 bug.
				// This arises when a base node is used (#2709 and #4378).
				head.insertBefore( script, head.firstChild );
			},

			abort: function() {
				if ( script ) {
					script.onload( 0, 1 );
				}
			}
		};
	}
});
var xhrCallbacks,
	// #5280: Internet Explorer will keep connections alive if we don't abort on unload
	xhrOnUnloadAbort = window.ActiveXObject ? function() {
		// Abort all pending requests
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]( 0, 1 );
		}
	} : false,
	xhrId = 0;

// Functions to create xhrs
function createStandardXHR() {
	try {
		return new window.XMLHttpRequest();
	} catch( e ) {}
}

function createActiveXHR() {
	try {
		return new window.ActiveXObject( "Microsoft.XMLHTTP" );
	} catch( e ) {}
}

// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
jQuery.ajaxSettings.xhr = window.ActiveXObject ?
	/* Microsoft failed to properly
	 * implement the XMLHttpRequest in IE7 (can't request local files),
	 * so we use the ActiveXObject when it is available
	 * Additionally XMLHttpRequest can be disabled in IE7/IE8 so
	 * we need a fallback.
	 */
	function() {
		return !this.isLocal && createStandardXHR() || createActiveXHR();
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	createStandardXHR;

// Determine support properties
(function( xhr ) {
	jQuery.extend( jQuery.support, {
		ajax: !!xhr,
		cors: !!xhr && ( "withCredentials" in xhr )
	});
})( jQuery.ajaxSettings.xhr() );

// Create transport if the browser can provide an xhr
if ( jQuery.support.ajax ) {

	jQuery.ajaxTransport(function( s ) {
		// Cross domain only allowed if supported through XMLHttpRequest
		if ( !s.crossDomain || jQuery.support.cors ) {

			var callback;

			return {
				send: function( headers, complete ) {

					// Get a new xhr
					var handle, i,
						xhr = s.xhr();

					// Open the socket
					// Passing null username, generates a login popup on Opera (#2865)
					if ( s.username ) {
						xhr.open( s.type, s.url, s.async, s.username, s.password );
					} else {
						xhr.open( s.type, s.url, s.async );
					}

					// Apply custom fields if provided
					if ( s.xhrFields ) {
						for ( i in s.xhrFields ) {
							xhr[ i ] = s.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( s.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( s.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !s.crossDomain && !headers["X-Requested-With"] ) {
						headers[ "X-Requested-With" ] = "XMLHttpRequest";
					}

					// Need an extra try/catch for cross domain requests in Firefox 3
					try {
						for ( i in headers ) {
							xhr.setRequestHeader( i, headers[ i ] );
						}
					} catch( _ ) {}

					// Do send the request
					// This may raise an exception which is actually
					// handled in jQuery.ajax (so no try/catch here)
					xhr.send( ( s.hasContent && s.data ) || null );

					// Listener
					callback = function( _, isAbort ) {

						var status,
							statusText,
							responseHeaders,
							responses,
							xml;

						// Firefox throws exceptions when accessing properties
						// of an xhr when a network error occurred
						// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
						try {

							// Was never called and is aborted or complete
							if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

								// Only called once
								callback = undefined;

								// Do not keep as active anymore
								if ( handle ) {
									xhr.onreadystatechange = jQuery.noop;
									if ( xhrOnUnloadAbort ) {
										delete xhrCallbacks[ handle ];
									}
								}

								// If it's an abort
								if ( isAbort ) {
									// Abort it manually if needed
									if ( xhr.readyState !== 4 ) {
										xhr.abort();
									}
								} else {
									status = xhr.status;
									responseHeaders = xhr.getAllResponseHeaders();
									responses = {};
									xml = xhr.responseXML;

									// Construct response list
									if ( xml && xml.documentElement /* #4958 */ ) {
										responses.xml = xml;
									}

									// When requesting binary data, IE6-9 will throw an exception
									// on any attempt to access responseText (#11426)
									try {
										responses.text = xhr.responseText;
									} catch( _ ) {
									}

									// Firefox throws an exception when accessing
									// statusText for faulty cross-domain requests
									try {
										statusText = xhr.statusText;
									} catch( e ) {
										// We normalize with Webkit giving an empty statusText
										statusText = "";
									}

									// Filter status for non standard behaviors

									// If the request is local and we have data: assume a success
									// (success with no data won't get notified, that's the best we
									// can do given current implementations)
									if ( !status && s.isLocal && !s.crossDomain ) {
										status = responses.text ? 200 : 404;
									// IE - #1450: sometimes returns 1223 when it should be 204
									} else if ( status === 1223 ) {
										status = 204;
									}
								}
							}
						} catch( firefoxAccessException ) {
							if ( !isAbort ) {
								complete( -1, firefoxAccessException );
							}
						}

						// Call complete if needed
						if ( responses ) {
							complete( status, statusText, responses, responseHeaders );
						}
					};

					if ( !s.async ) {
						// if we're in sync mode we fire the callback
						callback();
					} else if ( xhr.readyState === 4 ) {
						// (IE6 & IE7) if it's in cache and has been
						// retrieved directly we need to fire the callback
						setTimeout( callback, 0 );
					} else {
						handle = ++xhrId;
						if ( xhrOnUnloadAbort ) {
							// Create the active xhrs callbacks list if needed
							// and attach the unload handler
							if ( !xhrCallbacks ) {
								xhrCallbacks = {};
								jQuery( window ).unload( xhrOnUnloadAbort );
							}
							// Add to list of active xhrs callbacks
							xhrCallbacks[ handle ] = callback;
						}
						xhr.onreadystatechange = callback;
					}
				},

				abort: function() {
					if ( callback ) {
						callback(0,1);
					}
				}
			};
		}
	});
}
var fxNow, timerId,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = new RegExp( "^(?:([-+])=|)(" + core_pnum + ")([a-z%]*)$", "i" ),
	rrun = /queueHooks$/,
	animationPrefilters = [ defaultPrefilter ],
	tweeners = {
		"*": [function( prop, value ) {
			var end, unit, prevScale,
				tween = this.createTween( prop, value ),
				parts = rfxnum.exec( value ),
				target = tween.cur(),
				start = +target || 0,
				scale = 1;

			if ( parts ) {
				end = +parts[2];
				unit = parts[3] || ( jQuery.cssNumber[ prop ] ? "" : "px" );

				// We need to compute starting value
				if ( unit !== "px" && start ) {
					// Iteratively approximate from a nonzero starting point
					// Prefer the current property, because this process will be trivial if it uses the same units
					// Fallback to end or a simple constant
					start = jQuery.css( tween.elem, prop, true ) || end || 1;

					do {
						// If previous iteration zeroed out, double until we get *something*
						// Use a string for doubling factor so we don't accidentally see scale as unchanged below
						prevScale = scale = scale || ".5";

						// Adjust and apply
						start = start / scale;
						jQuery.style( tween.elem, prop, start + unit );

						// Update scale, tolerating zeroes from tween.cur()
						scale = tween.cur() / target;

					// Stop looping if we've hit the mark or scale is unchanged
					} while ( scale !== 1 && scale !== prevScale );
				}

				tween.unit = unit;
				tween.start = start;
				// If a +=/-= token was provided, we're doing a relative animation
				tween.end = parts[1] ? start + ( parts[1] + 1 ) * end : end;
			}
			return tween;
		}]
	};

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout(function() {
		fxNow = undefined;
	}, 0 );
	return ( fxNow = jQuery.now() );
}

function createTweens( animation, props ) {
	jQuery.each( props, function( prop, value ) {
		var collection = ( tweeners[ prop ] || [] ).concat( tweeners[ "*" ] ),
			index = 0,
			length = collection.length;
		for ( ; index < length; index++ ) {
			if ( collection[ index ].call( animation, prop, value ) ) {

				// we're done with this property
				return;
			}
		}
	});
}

function Animation( elem, properties, options ) {
	var result,
		index = 0,
		tweenerIndex = 0,
		length = animationPrefilters.length,
		deferred = jQuery.Deferred().always( function() {
			// don't match elem in the :animated selector
			delete tick.elem;
		}),
		tick = function() {
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),
				percent = 1 - ( remaining / animation.duration || 0 ),
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length ; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ]);

			if ( percent < 1 && length ) {
				return remaining;
			} else {
				deferred.resolveWith( elem, [ animation ] );
				return false;
			}
		},
		animation = deferred.promise({
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, { specialEasing: {} }, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end, easing ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
						animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,
					// if we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;

				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// resolve when we played the last frame
				// otherwise, reject
				if ( gotoEnd ) {
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		}),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length ; index++ ) {
		result = animationPrefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			return result;
		}
	}

	createTweens( animation, props );

	if ( jQuery.isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	jQuery.fx.timer(
		jQuery.extend( tick, {
			anim: animation,
			queue: animation.opts.queue,
			elem: elem
		})
	);

	// attach callbacks from options
	return animation.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = jQuery.camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( jQuery.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// not quite $.extend, this wont overwrite keys already present.
			// also - reusing 'index' from above because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

jQuery.Animation = jQuery.extend( Animation, {

	tweener: function( props, callback ) {
		if ( jQuery.isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.split(" ");
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length ; index++ ) {
			prop = props[ index ];
			tweeners[ prop ] = tweeners[ prop ] || [];
			tweeners[ prop ].unshift( callback );
		}
	},

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			animationPrefilters.unshift( callback );
		} else {
			animationPrefilters.push( callback );
		}
	}
});

function defaultPrefilter( elem, props, opts ) {
	var index, prop, value, length, dataShow, tween, hooks, oldfire,
		anim = this,
		style = elem.style,
		orig = {},
		handled = [],
		hidden = elem.nodeType && isHidden( elem );

	// handle queue: false promises
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always(function() {
			// doing this makes sure that the complete handler will be called
			// before this completes
			anim.always(function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			});
		});
	}

	// height/width overflow pass
	if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {
		// Make sure that nothing sneaks out
		// Record all 3 overflow attributes because IE does not
		// change the overflow attribute when overflowX and
		// overflowY are set to the same value
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Set display property to inline-block for height/width
		// animations on inline elements that are having width/height animated
		if ( jQuery.css( elem, "display" ) === "inline" &&
				jQuery.css( elem, "float" ) === "none" ) {

			// inline-level elements accept inline-block;
			// block-level elements need to be inline with layout
			if ( !jQuery.support.inlineBlockNeedsLayout || css_defaultDisplay( elem.nodeName ) === "inline" ) {
				style.display = "inline-block";

			} else {
				style.zoom = 1;
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		if ( !jQuery.support.shrinkWrapBlocks ) {
			anim.done(function() {
				style.overflow = opts.overflow[ 0 ];
				style.overflowX = opts.overflow[ 1 ];
				style.overflowY = opts.overflow[ 2 ];
			});
		}
	}


	// show/hide pass
	for ( index in props ) {
		value = props[ index ];
		if ( rfxtypes.exec( value ) ) {
			delete props[ index ];
			if ( value === ( hidden ? "hide" : "show" ) ) {
				continue;
			}
			handled.push( index );
		}
	}

	length = handled.length;
	if ( length ) {
		dataShow = jQuery._data( elem, "fxshow" ) || jQuery._data( elem, "fxshow", {} );
		if ( hidden ) {
			jQuery( elem ).show();
		} else {
			anim.done(function() {
				jQuery( elem ).hide();
			});
		}
		anim.done(function() {
			var prop;
			jQuery.removeData( elem, "fxshow", true );
			for ( prop in orig ) {
				jQuery.style( elem, prop, orig[ prop ] );
			}
		});
		for ( index = 0 ; index < length ; index++ ) {
			prop = handled[ index ];
			tween = anim.createTween( prop, hidden ? dataShow[ prop ] : 0 );
			orig[ prop ] = dataShow[ prop ] || jQuery.style( elem, prop );

			if ( !( prop in dataShow ) ) {
				dataShow[ prop ] = tween.start;
				if ( hidden ) {
					tween.end = tween.start;
					tween.start = prop === "width" || prop === "height" ? 1 : 0;
				}
			}
		}
	}
}

function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || "swing";
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			if ( tween.elem[ tween.prop ] != null &&
				(!tween.elem.style || tween.elem.style[ tween.prop ] == null) ) {
				return tween.elem[ tween.prop ];
			}

			// passing any value as a 4th parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails
			// so, simple values such as "10px" are parsed to Float.
			// complex values such as "rotate(1rad)" are returned as is.
			result = jQuery.css( tween.elem, tween.prop, false, "" );
			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {
			// use step hook for back compat - use cssHook if its there - use .style if its
			// available and use plain properties where available
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.style && ( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null || jQuery.cssHooks[ tween.prop ] ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Remove in 2.0 - this supports IE8's panic based approach
// to setting things on disconnected nodes

Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.each([ "toggle", "show", "hide" ], function( i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ||
			// special check for .toggle( handler, handler, ... )
			( !i && jQuery.isFunction( speed ) && jQuery.isFunction( easing ) ) ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
});

jQuery.fn.extend({
	fadeTo: function( speed, to, easing, callback ) {

		// show any hidden elements after setting opacity to 0
		return this.filter( isHidden ).css( "opacity", 0 ).show()

			// animate to the value specified
			.end().animate({ opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {
				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations resolve immediately
				if ( empty ) {
					anim.stop( true );
				}
			};

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = jQuery._data( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		});
	}
});

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		attrs = { height: type },
		i = 0;

	// if we include width, step value is 1 to do all cssExpand values,
	// if we don't include width, step value is 2 to skip over Left and Right
	includeWidth = includeWidth? 1 : 0;
	for( ; i < 4 ; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx("show"),
	slideUp: genFx("hide"),
	slideToggle: genFx("toggle"),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			jQuery.isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
	};

	opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
		opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

	// normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( jQuery.isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p*Math.PI ) / 2;
	}
};

jQuery.timers = [];
jQuery.fx = Tween.prototype.init;
jQuery.fx.tick = function() {
	var timer,
		timers = jQuery.timers,
		i = 0;

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];
		// Checks the timer has not already been removed
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
};

jQuery.fx.timer = function( timer ) {
	if ( timer() && jQuery.timers.push( timer ) && !timerId ) {
		timerId = setInterval( jQuery.fx.tick, jQuery.fx.interval );
	}
};

jQuery.fx.interval = 13;

jQuery.fx.stop = function() {
	clearInterval( timerId );
	timerId = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,
	// Default speed
	_default: 400
};

// Back Compat <1.8 extension point
jQuery.fx.step = {};

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.animated = function( elem ) {
		return jQuery.grep(jQuery.timers, function( fn ) {
			return elem === fn.elem;
		}).length;
	};
}
var rroot = /^(?:body|html)$/i;

jQuery.fn.offset = function( options ) {
	if ( arguments.length ) {
		return options === undefined ?
			this :
			this.each(function( i ) {
				jQuery.offset.setOffset( this, options, i );
			});
	}

	var box, docElem, body, win, clientTop, clientLeft, scrollTop, scrollLeft, top, left,
		elem = this[ 0 ],
		doc = elem && elem.ownerDocument;

	if ( !doc ) {
		return;
	}

	if ( (body = doc.body) === elem ) {
		return jQuery.offset.bodyOffset( elem );
	}

	docElem = doc.documentElement;

	// Make sure we're not dealing with a disconnected DOM node
	if ( !jQuery.contains( docElem, elem ) ) {
		return { top: 0, left: 0 };
	}

	box = elem.getBoundingClientRect();
	win = getWindow( doc );
	clientTop  = docElem.clientTop  || body.clientTop  || 0;
	clientLeft = docElem.clientLeft || body.clientLeft || 0;
	scrollTop  = win.pageYOffset || docElem.scrollTop;
	scrollLeft = win.pageXOffset || docElem.scrollLeft;
	top  = box.top  + scrollTop  - clientTop;
	left = box.left + scrollLeft - clientLeft;

	return { top: top, left: left };
};

jQuery.offset = {

	bodyOffset: function( body ) {
		var top = body.offsetTop,
			left = body.offsetLeft;

		if ( jQuery.support.doesNotIncludeMarginInBodyOffset ) {
			top  += parseFloat( jQuery.css(body, "marginTop") ) || 0;
			left += parseFloat( jQuery.css(body, "marginLeft") ) || 0;
		}

		return { top: top, left: left };
	},

	setOffset: function( elem, options, i ) {
		var position = jQuery.css( elem, "position" );

		// set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		var curElem = jQuery( elem ),
			curOffset = curElem.offset(),
			curCSSTop = jQuery.css( elem, "top" ),
			curCSSLeft = jQuery.css( elem, "left" ),
			calculatePosition = ( position === "absolute" || position === "fixed" ) && jQuery.inArray("auto", [curCSSTop, curCSSLeft]) > -1,
			props = {}, curPosition = {}, curTop, curLeft;

		// need to be able to calculate position if either top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;
		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );
		} else {
			curElem.css( props );
		}
	}
};


jQuery.fn.extend({

	position: function() {
		if ( !this[0] ) {
			return;
		}

		var elem = this[0],

		// Get *real* offsetParent
		offsetParent = this.offsetParent(),

		// Get correct offsets
		offset       = this.offset(),
		parentOffset = rroot.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset();

		// Subtract element margins
		// note: when an element has margin: auto the offsetLeft and marginLeft
		// are the same in Safari causing offset.left to incorrectly be 0
		offset.top  -= parseFloat( jQuery.css(elem, "marginTop") ) || 0;
		offset.left -= parseFloat( jQuery.css(elem, "marginLeft") ) || 0;

		// Add offsetParent borders
		parentOffset.top  += parseFloat( jQuery.css(offsetParent[0], "borderTopWidth") ) || 0;
		parentOffset.left += parseFloat( jQuery.css(offsetParent[0], "borderLeftWidth") ) || 0;

		// Subtract the two offsets
		return {
			top:  offset.top  - parentOffset.top,
			left: offset.left - parentOffset.left
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || document.body;
			while ( offsetParent && (!rroot.test(offsetParent.nodeName) && jQuery.css(offsetParent, "position") === "static") ) {
				offsetParent = offsetParent.offsetParent;
			}
			return offsetParent || document.body;
		});
	}
});


// Create scrollLeft and scrollTop methods
jQuery.each( {scrollLeft: "pageXOffset", scrollTop: "pageYOffset"}, function( method, prop ) {
	var top = /Y/.test( prop );

	jQuery.fn[ method ] = function( val ) {
		return jQuery.access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? (prop in win) ? win[ prop ] :
					win.document.documentElement[ method ] :
					elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : jQuery( win ).scrollLeft(),
					 top ? val : jQuery( win ).scrollTop()
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

function getWindow( elem ) {
	return jQuery.isWindow( elem ) ?
		elem :
		elem.nodeType === 9 ?
			elem.defaultView || elem.parentWindow :
			false;
}
// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name }, function( defaultExtra, funcName ) {
		// margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return jQuery.access( this, function( elem, type, value ) {
				var doc;

				if ( jQuery.isWindow( elem ) ) {
					// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
					// isn't a whole lot we can do. See pull request at this URL for discussion:
					// https://github.com/jquery/jquery/pull/764
					return elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height], whichever is greatest
					// unfortunately, this causes bug #3838 in IE6/8 only, but there is currently no good, small way to fix it.
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?
					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, value, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable, null );
		};
	});
});
// Expose jQuery to the global object
window.jQuery = window.$ = jQuery;

// Expose jQuery as an AMD module, but only for AMD loaders that
// understand the issues with loading multiple versions of jQuery
// in a page that all might call define(). The loader will indicate
// they have special allowances for multiple jQuery versions by
// specifying define.amd.jQuery = true. Register as a named module,
// since jQuery can be concatenated with other files that may use define,
// but not use a proper concatenation script that understands anonymous
// AMD modules. A named AMD is safest and most robust way to register.
// Lowercase jquery is used because AMD module names are derived from
// file names, and jQuery is normally delivered in a lowercase file name.
// Do this after creating the global so that if an AMD module wants to call
// noConflict to hide this version of jQuery, it will work.
if ( typeof define === "function" && define.amd && define.amd.jQuery ) {
	define( "jquery", [], function () { return jQuery; } );
}

return jQuery;

})( window ); }));

},{}]},{},[3])
;