;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Vector = require('./Vector');

module.exports = AABB;

function AABB(minx, miny, maxx, maxy) {
    this.min = new Vector(minx, miny);
    this.max = new Vector(maxx, maxy);
}

AABB.prototype.translate = function(vec) {
    this.min.add(vec);
    this.max.add(vec);
}

AABB.prototype.intersects = function(aabb) {
    if(this.max.x < aabb.min.x ||
       this.max.y < aabb.min.y ||
       this.min.x > aabb.max.x ||
       this.min.y > aabb.max.y) {
           return false;
       } else {
           var vec = new Vector(0, 0);

           var left = (aabb.min.x - this.max.x),
               right = (aabb.max.x - this.min.x),
               top = (aabb.min.y - this.max.y),
               bottom = (aabb.max.y - this.min.y);

           if(Math.abs(left) < right) {
               vec.x = -left;
           } else {
               vec.x = -right;
           }

           if(Math.abs(top) < bottom) {
               vec.y = -top;
           } else {
               vec.y = -bottom;
           }

           if(Math.abs(vec.x) < Math.abs(vec.y)) {
               vec.y = 0;
           } else {
               vec.x = 0;
           }

           return vec;
       }
}

},{"./Vector":6}],2:[function(require,module,exports){
module.exports = Client;

function Client(ip, type) {
    var self = this;

    this.type = type || "spectator";
    this.ip = ip;
};

},{}],3:[function(require,module,exports){
var $ = require('jquery-browserify'),
    Vector = require('./Vector'),
    AABB = require('./AABB'),
    Solid = require('./Solid'),
    fs = require('fs'),
    vertShader = "precision highp float;\n\nattribute vec2 position;\nattribute float aColor;\n\nuniform mat3 modelViewProjectionMatrix;\n\nvarying vec3 vColor;\n\n// Credit to 'AHM' on StackOverflow\nvec3 unpackColor(float f) {\n    vec3 color;\n\n    color.b = floor(f / (256.0 * 256.0));\n    color.g = floor((f - color.b * 256.0 * 256.0) / 256.0);\n    color.r = floor(mod(f, 256.0));\n\n    return color / 10.0;\n}\n\nvoid main() {\n    vColor = unpackColor(aColor);\n\n    gl_Position = vec4(modelViewProjectionMatrix * vec3(position, 1.0), 1.0);\n}\n\n",
    fragShader = "precision highp float;\n\nvarying vec3 vColor;\n\nvoid main() {\n    gl_FragColor = vec4(vColor.rgb, 1.0);\n}\n";

module.exports = Dust;

function Dust() {
    var self = this;

    this.WIDTH  = $('#canvainer').width();
    this.HEIGHT = $('#canvainer').height();
    this.MAX_DUST = 80000;

    this.gl = this.getGL();
    this.shaderProgram = this.getShaderProgram(vertShader, fragShader);
    this.gl.useProgram(this.shaderProgram);

    this.projectionMatrix = makeProjectionMatrix(this.WIDTH, this.HEIGHT);
    this.modelViewMatrix = [];
    
    this.uProjectionMatrix = null;
    this.uModelViewMatrix = null;
    this.setUniforms();

    this.sandVertexArray = new Float32Array(this.MAX_DUST * 3 * 6);
    this.dustBuffer = this.gl.createBuffer();
    
    this.positionAttribute = this.gl.getAttribLocation(this.shaderProgram, "position");
    this.colorAttribute = this.gl.getAttribLocation(this.shaderProgram, "aColor");

    this.gl.enableVertexAttribArray(this.positionAttribute);
    this.gl.enableVertexAttribArray(this.colorAttribute);
    
    this.loadIdentity();

    this.grid = new Array2D(this.WIDTH, this.HEIGHT);
    this.sands = [];
    this.solids = [];

    this.materials = {
        sand: {
            color: [9, 7, 2, 1.0]
        },
        oil: {
            color: [5, 4, 1, 1.0]
        },
        fire: {
            color: [10, 5, 0, 1.0]
        },
        solid: {
            color: [0, 0, 0, 1]
        }
    };

    this.selectionBox = null;

    this.spawnSolid(250, 200, 100, 10);

    // Walls

    var width = 1;
    this.spawnSolid(0, 0, this.WIDTH, width);
    this.spawnSolid(0, 0, width, this.HEIGHT);
    this.spawnSolid(0, this.HEIGHT, this.WIDTH, width);
    this.spawnSolid(this.WIDTH, 0, width, this.HEIGHT);
}

Dust.prototype.getGL = function() {
    htmlCanvas = "<canvas width=" + "\"" + this.WIDTH + "\"" + "height=" + "\"" + this.HEIGHT + "\"" + "></canvas>";

    $('#canvainer').append(htmlCanvas);

    return $('canvas').get(0).getContext('webgl');
};

Dust.prototype.update = function(dt) {
    for (i = 0; i < this.sands.length; i++) {
        var sand = this.sands[i];

        if(this.grid[sand.x][sand.y + 1] === 0) { 
            sand.add(new Vector(0, 1));

            if(!this.sandCollides(sand)) {
                this.grid[sand.x][sand.y - 1] = 0;

                this.grid[sand.x][sand.y] = sand.type;
            } else {
                sand.add(new Vector(0, -1));
            }
        } else if(this.grid[sand.x - 1][sand.y + 1] === 0) {
            sand.add(new Vector(-1, 1));

            if(!this.sandCollides(sand)) {
                this.grid[sand.x + 1][sand.y - 1] = 0;

                this.grid[sand.x][sand.y] = sand.type;
            } else {
                sand.add(new Vector(1, -1));
            }
        } else if(this.grid[sand.x + 1][sand.y + 1] === 0) {
            sand.add(new Vector(1, 1));

            if(!this.sandCollides(sand)) {
                this.grid[sand.x - 1][sand.y - 1] = 0;
                this.grid[sand.x][sand.y] = sand.type;
            } else {
                sand.add(new Vector(-1, -1));
            }
        }
    }

};


Dust.prototype.draw = function() {
    var self = this;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    var material,
        mvpMatrix,
        vertexCount = 0;

    for(var i = 0; i < this.solids.length; i++) {
        var solid = this.solids[i];

        solid.setBuffers(this.gl);
        this.gl.vertexAttribPointer(this.positionAttribute, 2, this.gl.FLOAT, false, 12, 0);
        this.gl.vertexAttribPointer(this.colorAttribute, 1, this.gl.FLOAT, false, 12, 8);

        this.mvTranslate(solid.pos.x, solid.pos.y);

        mvpMatrix = matrixMultiply(this.modelViewMatrix, this.projectionMatrix);

        this.gl.uniformMatrix3fv(this.uModelViewProjectionMatrix, false, mvpMatrix);

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    this.setSandBuffers();
    this.loadIdentity();

    for (i = 0; i < this.sands.length; i++) {
        var s = this.sands[i];

        switch(s.type) {
            case 1:
                material = this.materials.sand;
                break;
            case 2:
                material = this.materials.oil;
                break;
            case 3:
                material = this.materials.fire;
                break;
            default:
                break;
        }

        var x = s.x,
            y = s.y;

        var offset = vertexCount * 3 * 6;

        if(vertexCount < this.MAX_DUST) {
            this.sandVertexArray[offset]     = x;
            this.sandVertexArray[offset + 1] = y;
            this.sandVertexArray[offset + 2] = packColor(material.color);

            this.sandVertexArray[offset + 3] = x + 1;
            this.sandVertexArray[offset + 4] = y;
            this.sandVertexArray[offset + 5] = packColor(material.color);

            this.sandVertexArray[offset + 6] = x;
            this.sandVertexArray[offset + 7] = y + 1;
            this.sandVertexArray[offset + 8] = packColor(material.color);


            this.sandVertexArray[offset + 9]= x;
            this.sandVertexArray[offset + 10] = y + 1;
            this.sandVertexArray[offset + 11] = packColor(material.color);

            this.sandVertexArray[offset + 12] = x + 1;
            this.sandVertexArray[offset + 13] = y;
            this.sandVertexArray[offset + 14] = packColor(material.color);

            this.sandVertexArray[offset + 15] = x + 1;
            this.sandVertexArray[offset + 16] = y + 1;
            this.sandVertexArray[offset + 17] = packColor(material.color);

            vertexCount++;
        }
    }

    this.gl.vertexAttribPointer(this.positionAttribute, 2, this.gl.FLOAT, false, 12, 0);
    this.gl.vertexAttribPointer(this.colorAttribute, 1, this.gl.FLOAT, false, 12, 8);
    mvpMatrix = matrixMultiply(this.modelViewMatrix, this.projectionMatrix);

    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.sandVertexArray, this.gl.STATIC_DRAW);
    this.gl.uniformMatrix3fv(this.uModelViewProjectionMatrix, false, mvpMatrix);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, vertexCount * 6);
};

Dust.prototype.sandCollides = function(s) {
    for (var i = 0; i < this.solids.length; i++) {
        if(s.within(this.solids[i].aabb)) {
            return true;
        } else if(s.x < 0 || s.y < 0 || s.x > this.WIDTH || s.y > this.HEIGHT) {
            return true;
        }
    }

    return false;
};

Dust.prototype.resizeSelection = function(w, h) {
    this.selectionBox.resize(w, h);
};

Dust.prototype.moveSelection = function(vec) {
    this.selectionBox.move(vec);
};

Dust.prototype.drawSelection = function(x, y, w, h) {
    this.selectionBox = new Solid(x, y, w, h);
};

Dust.prototype.spawnSolid = function(x, y, w, h) {
    var s = new Solid(x, y, w, h);
    s.bufferUp(this.gl);

    this.solids.push(s);
};

Dust.prototype.spawnDust = function(x, y, type) {
    if(this.sands.length >= this.MAX_DUST) {
        return;
    }

    var n = 50,
        area = 20;

    x -= area / 2;
    y -= area / 2;

    for (var i = 0; i < n; i++) {
        var spawnX = Math.round(x + area*Math.random()),
            spawnY = Math.round(y + area*Math.random());
        
        var s = new Vector(spawnX, spawnY);
        
        s.type = this.getType(type);

        if(!this.sandCollides(s)) {
            this.sands.push(s);
        }
    }
};

// Returns numerical code for material type
Dust.prototype.getType = function(typeString) {
    switch(typeString) {
        case 'sand':
            return 1;
        case 'oil':
            return 2;
        case 'fire':
            return 3;
        default:
            return 0;
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

// Compiles a shader program from given sources
Dust.prototype.getShaderProgram = function(vert, frag) {
    var vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER),
        fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);

    this.gl.shaderSource(vertexShader, vert);
    this.gl.shaderSource(fragmentShader, frag);

    this.gl.compileShader(vertexShader);
    this.gl.compileShader(fragmentShader);

    if(!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
        console.error("Vertex shader won't compile mate: ", this.gl.getShaderInfoLog(vertexShader));
    }
    
    if(!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
        console.error("Fragment shader won't compile mate: ", this.gl.getShaderInfoLog(fragmentShader));
    }

    var program = this.gl.createProgram();

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    return program;
};

Dust.prototype.setUniforms = function() {
    this.uModelViewProjectionMatrix = this.gl.getUniformLocation(this.shaderProgram, 'modelViewProjectionMatrix');
};

Dust.prototype.setSandBuffers = function() {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.dustBuffer);
};

Dust.prototype.loadIdentity = function() {
    this.modelViewMatrix = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
};

Dust.prototype.mvTranslate = function(x, y) {
    this.modelViewMatrix[6] = x;
    this.modelViewMatrix[7] = y;
};

Dust.prototype.mvScale = function(xs, ys) {
    this.modelViewMatrix[0] = xs;
    this.modelViewMatrix[4] = ys;
};

// Assorted functions
function Array2D(w, h) {
    var array = [];

    for (var x = 0; x < w; x++) {
        array[x] = [];
        for (var y = 0; y < h; y++) {
            array[x][y] = 0;
        }
    }

    return array;
}

function makeProjectionMatrix(width, height) {
    return [
        2 / width, 0,          0,
        0,        -2 / height, 0,
       -1,         1,          1
    ];
}


// Yeah I did steal this one. How did you know?
function matrixMultiply(a, b) {
  var a00 = a[0*3+0];
  var a01 = a[0*3+1];
  var a02 = a[0*3+2];
  var a10 = a[1*3+0];
  var a11 = a[1*3+1];
  var a12 = a[1*3+2];
  var a20 = a[2*3+0];
  var a21 = a[2*3+1];
  var a22 = a[2*3+2];
  var b00 = b[0*3+0];
  var b01 = b[0*3+1];
  var b02 = b[0*3+2];
  var b10 = b[1*3+0];
  var b11 = b[1*3+1];
  var b12 = b[1*3+2];
  var b20 = b[2*3+0];
  var b21 = b[2*3+1];
  var b22 = b[2*3+2];
  return [a00 * b00 + a01 * b10 + a02 * b20,
          a00 * b01 + a01 * b11 + a02 * b21,
          a00 * b02 + a01 * b12 + a02 * b22,
          a10 * b00 + a11 * b10 + a12 * b20,
          a10 * b01 + a11 * b11 + a12 * b21,
          a10 * b02 + a11 * b12 + a12 * b22,
          a20 * b00 + a21 * b10 + a22 * b20,
          a20 * b01 + a21 * b11 + a22 * b21,
          a20 * b02 + a21 * b12 + a22 * b22];
}

// Credit to 'AHM' on StackOverflow
function packColor(color) {
    return color[0] + color[1] * 256 + color[2] * 256 * 256;
}

},{"./AABB":1,"./Solid":4,"./Vector":6,"fs":9,"jquery-browserify":8}],4:[function(require,module,exports){
var Vector = require('./Vector'),
    AABB = require('./AABB');

module.exports = Solid;

function Solid(x, y, w, h) {
    this.w = w;
    this.h = h;
    
    this.pos = new Vector(x, y);

    this.aabb = new AABB(x - this.w, y - this.h, (x + this.w), (y + this.h));

    this.color = 0;
}

Solid.prototype.bufferUp = function(gl) {
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    var floatArray = new Float32Array([
            -this.w,  -this.h, this.color,
            -this.w,   this.h, this.color,
             this.w,  -this.h, this.color,
             this.w,   this.h, this.color]);


    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, floatArray, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};

Solid.prototype.setBuffers = function(gl) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
};

Solid.prototype.move = function(dVec) {
    dVec.round();
    this.pos.add(vec);
    this.aabb.translate(vec);
};

Solid.prototype.resize = function(w, h) {
    this.w = w;
    this.h = h;
    this.aabb.max.x = this.pos.x + w;
    this.aabb.max.y = this.pos.y + h;
};

},{"./AABB":1,"./Vector":6}],5:[function(require,module,exports){
module.exports = Timer;

function Timer() {
    this.start = new Date().getTime();
}

Timer.prototype.getTime = function() {
    var currentTime = new Date().getTime();

    return currentTime - this.start;
}

Timer.prototype.reset = function() {
    this.start = new Date().getTime();
}

},{}],6:[function(require,module,exports){
module.exports = Vector;

function Vector(x, y) {
    this.x = x;
    this.y = y;
};

Vector.prototype.add = function(vec) {
    this.x += vec.x;
    this.y += vec.y;
    return this;
}

Vector.prototype.within = function(aabb) {
    if(this.x < aabb.min.x ||
       this.x > aabb.max.x ||
       this.y < aabb.min.y ||
       this.y > aabb.max.y) {
           return false;
       } else {
           return true;
       }
}

Vector.prototype.round = function() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
}

},{}],7:[function(require,module,exports){
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

                var type = $('input[name=dustType]:checked', '#menu').val();
                DUST.spawnDust(x, y, type);

                $('canvas').mousemove(function(e) {
                    x = Math.round(e.pageX - offset.left);
                    y = Math.round(e.pageY - offset.top);

                    DUST.spawnDust(x, y, type);
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
            case 3:
                x = Math.round(e.pageX - offset.left);
                y = Math.round(e.pageY - offset.top);

                DUST.sandifySolid(new Vector(x, y));
        }
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

        DUST.update(timer.getTime() / 1000);

        DUST.draw();

        timer.reset();
    }
}

},{"./Client":2,"./Dust":3,"./Timer":5,"./Vector":6,"jquery-browserify":8}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){

// not implemented
// The reason for having an empty file and not throwing is to allow
// untraditional implementation of this module.

},{}]},{},[7])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvaG9tZS9taWxvL1Byb2plY3RzL0R1c3QvY2xpZW50L0FBQkIuanMiLCIvaG9tZS9taWxvL1Byb2plY3RzL0R1c3QvY2xpZW50L0NsaWVudC5qcyIsIi9ob21lL21pbG8vUHJvamVjdHMvRHVzdC9jbGllbnQvRHVzdC5qcyIsIi9ob21lL21pbG8vUHJvamVjdHMvRHVzdC9jbGllbnQvU29saWQuanMiLCIvaG9tZS9taWxvL1Byb2plY3RzL0R1c3QvY2xpZW50L1RpbWVyLmpzIiwiL2hvbWUvbWlsby9Qcm9qZWN0cy9EdXN0L2NsaWVudC9WZWN0b3IuanMiLCIvaG9tZS9taWxvL1Byb2plY3RzL0R1c3QvY2xpZW50L21haW4uanMiLCIvaG9tZS9taWxvL1Byb2plY3RzL0R1c3Qvbm9kZV9tb2R1bGVzL2pxdWVyeS1icm93c2VyaWZ5L2xpYi9qcXVlcnkuanMiLCIvdXNyL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL2ZzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwblNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgVmVjdG9yID0gcmVxdWlyZSgnLi9WZWN0b3InKTtcblxubW9kdWxlLmV4cG9ydHMgPSBBQUJCO1xuXG5mdW5jdGlvbiBBQUJCKG1pbngsIG1pbnksIG1heHgsIG1heHkpIHtcbiAgICB0aGlzLm1pbiA9IG5ldyBWZWN0b3IobWlueCwgbWlueSk7XG4gICAgdGhpcy5tYXggPSBuZXcgVmVjdG9yKG1heHgsIG1heHkpO1xufVxuXG5BQUJCLnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbih2ZWMpIHtcbiAgICB0aGlzLm1pbi5hZGQodmVjKTtcbiAgICB0aGlzLm1heC5hZGQodmVjKTtcbn1cblxuQUFCQi5wcm90b3R5cGUuaW50ZXJzZWN0cyA9IGZ1bmN0aW9uKGFhYmIpIHtcbiAgICBpZih0aGlzLm1heC54IDwgYWFiYi5taW4ueCB8fFxuICAgICAgIHRoaXMubWF4LnkgPCBhYWJiLm1pbi55IHx8XG4gICAgICAgdGhpcy5taW4ueCA+IGFhYmIubWF4LnggfHxcbiAgICAgICB0aGlzLm1pbi55ID4gYWFiYi5tYXgueSkge1xuICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgdmFyIHZlYyA9IG5ldyBWZWN0b3IoMCwgMCk7XG5cbiAgICAgICAgICAgdmFyIGxlZnQgPSAoYWFiYi5taW4ueCAtIHRoaXMubWF4LngpLFxuICAgICAgICAgICAgICAgcmlnaHQgPSAoYWFiYi5tYXgueCAtIHRoaXMubWluLngpLFxuICAgICAgICAgICAgICAgdG9wID0gKGFhYmIubWluLnkgLSB0aGlzLm1heC55KSxcbiAgICAgICAgICAgICAgIGJvdHRvbSA9IChhYWJiLm1heC55IC0gdGhpcy5taW4ueSk7XG5cbiAgICAgICAgICAgaWYoTWF0aC5hYnMobGVmdCkgPCByaWdodCkge1xuICAgICAgICAgICAgICAgdmVjLnggPSAtbGVmdDtcbiAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgIHZlYy54ID0gLXJpZ2h0O1xuICAgICAgICAgICB9XG5cbiAgICAgICAgICAgaWYoTWF0aC5hYnModG9wKSA8IGJvdHRvbSkge1xuICAgICAgICAgICAgICAgdmVjLnkgPSAtdG9wO1xuICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgdmVjLnkgPSAtYm90dG9tO1xuICAgICAgICAgICB9XG5cbiAgICAgICAgICAgaWYoTWF0aC5hYnModmVjLngpIDwgTWF0aC5hYnModmVjLnkpKSB7XG4gICAgICAgICAgICAgICB2ZWMueSA9IDA7XG4gICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICB2ZWMueCA9IDA7XG4gICAgICAgICAgIH1cblxuICAgICAgICAgICByZXR1cm4gdmVjO1xuICAgICAgIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gQ2xpZW50O1xuXG5mdW5jdGlvbiBDbGllbnQoaXAsIHR5cGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB0aGlzLnR5cGUgPSB0eXBlIHx8IFwic3BlY3RhdG9yXCI7XG4gICAgdGhpcy5pcCA9IGlwO1xufTtcbiIsInZhciAkID0gcmVxdWlyZSgnanF1ZXJ5LWJyb3dzZXJpZnknKSxcbiAgICBWZWN0b3IgPSByZXF1aXJlKCcuL1ZlY3RvcicpLFxuICAgIEFBQkIgPSByZXF1aXJlKCcuL0FBQkInKSxcbiAgICBTb2xpZCA9IHJlcXVpcmUoJy4vU29saWQnKSxcbiAgICBmcyA9IHJlcXVpcmUoJ2ZzJyksXG4gICAgdmVydFNoYWRlciA9IFwicHJlY2lzaW9uIGhpZ2hwIGZsb2F0O1xcblxcbmF0dHJpYnV0ZSB2ZWMyIHBvc2l0aW9uO1xcbmF0dHJpYnV0ZSBmbG9hdCBhQ29sb3I7XFxuXFxudW5pZm9ybSBtYXQzIG1vZGVsVmlld1Byb2plY3Rpb25NYXRyaXg7XFxuXFxudmFyeWluZyB2ZWMzIHZDb2xvcjtcXG5cXG4vLyBDcmVkaXQgdG8gJ0FITScgb24gU3RhY2tPdmVyZmxvd1xcbnZlYzMgdW5wYWNrQ29sb3IoZmxvYXQgZikge1xcbiAgICB2ZWMzIGNvbG9yO1xcblxcbiAgICBjb2xvci5iID0gZmxvb3IoZiAvICgyNTYuMCAqIDI1Ni4wKSk7XFxuICAgIGNvbG9yLmcgPSBmbG9vcigoZiAtIGNvbG9yLmIgKiAyNTYuMCAqIDI1Ni4wKSAvIDI1Ni4wKTtcXG4gICAgY29sb3IuciA9IGZsb29yKG1vZChmLCAyNTYuMCkpO1xcblxcbiAgICByZXR1cm4gY29sb3IgLyAxMC4wO1xcbn1cXG5cXG52b2lkIG1haW4oKSB7XFxuICAgIHZDb2xvciA9IHVucGFja0NvbG9yKGFDb2xvcik7XFxuXFxuICAgIGdsX1Bvc2l0aW9uID0gdmVjNChtb2RlbFZpZXdQcm9qZWN0aW9uTWF0cml4ICogdmVjMyhwb3NpdGlvbiwgMS4wKSwgMS4wKTtcXG59XFxuXFxuXCIsXG4gICAgZnJhZ1NoYWRlciA9IFwicHJlY2lzaW9uIGhpZ2hwIGZsb2F0O1xcblxcbnZhcnlpbmcgdmVjMyB2Q29sb3I7XFxuXFxudm9pZCBtYWluKCkge1xcbiAgICBnbF9GcmFnQ29sb3IgPSB2ZWM0KHZDb2xvci5yZ2IsIDEuMCk7XFxufVxcblwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IER1c3Q7XG5cbmZ1bmN0aW9uIER1c3QoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdGhpcy5zb2NrZXQgPSBpby5jb25uZWN0KCdodHRwOi8vMTkyLjE2OC4xLjc3Ojk5NjYnKTtcblxuICAgIHRoaXMuV0lEVEggID0gJCgnI2NhbnZhaW5lcicpLndpZHRoKCk7XG4gICAgdGhpcy5IRUlHSFQgPSAkKCcjY2FudmFpbmVyJykuaGVpZ2h0KCk7XG4gICAgdGhpcy5NQVhfRFVTVCA9IDgwMDAwO1xuXG4gICAgdGhpcy5nbCA9IHRoaXMuZ2V0R0woKTtcbiAgICB0aGlzLnNoYWRlclByb2dyYW0gPSB0aGlzLmdldFNoYWRlclByb2dyYW0odmVydFNoYWRlciwgZnJhZ1NoYWRlcik7XG4gICAgdGhpcy5nbC51c2VQcm9ncmFtKHRoaXMuc2hhZGVyUHJvZ3JhbSk7XG5cbiAgICB0aGlzLnByb2plY3Rpb25NYXRyaXggPSBtYWtlUHJvamVjdGlvbk1hdHJpeCh0aGlzLldJRFRILCB0aGlzLkhFSUdIVCk7XG4gICAgdGhpcy5tb2RlbFZpZXdNYXRyaXggPSBbXTtcbiAgICBcbiAgICB0aGlzLnVQcm9qZWN0aW9uTWF0cml4ID0gbnVsbDtcbiAgICB0aGlzLnVNb2RlbFZpZXdNYXRyaXggPSBudWxsO1xuICAgIHRoaXMuc2V0VW5pZm9ybXMoKTtcblxuICAgIHRoaXMuc2FuZFZlcnRleEFycmF5ID0gbmV3IEZsb2F0MzJBcnJheSh0aGlzLk1BWF9EVVNUICogMyAqIDYpO1xuICAgIHRoaXMuZHVzdEJ1ZmZlciA9IHRoaXMuZ2wuY3JlYXRlQnVmZmVyKCk7XG4gICAgXG4gICAgdGhpcy5wb3NpdGlvbkF0dHJpYnV0ZSA9IHRoaXMuZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5zaGFkZXJQcm9ncmFtLCBcInBvc2l0aW9uXCIpO1xuICAgIHRoaXMuY29sb3JBdHRyaWJ1dGUgPSB0aGlzLmdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMuc2hhZGVyUHJvZ3JhbSwgXCJhQ29sb3JcIik7XG5cbiAgICB0aGlzLmdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KHRoaXMucG9zaXRpb25BdHRyaWJ1dGUpO1xuICAgIHRoaXMuZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkodGhpcy5jb2xvckF0dHJpYnV0ZSk7XG4gICAgXG4gICAgdGhpcy5sb2FkSWRlbnRpdHkoKTtcblxuICAgIHRoaXMuZ3JpZCA9IG5ldyBBcnJheTJEKHRoaXMuV0lEVEgsIHRoaXMuSEVJR0hUKTtcbiAgICB0aGlzLnNhbmRzID0gW107XG4gICAgdGhpcy5zb2xpZHMgPSBbXTtcblxuICAgIHRoaXMubWF0ZXJpYWxzID0ge1xuICAgICAgICBzYW5kOiB7XG4gICAgICAgICAgICBjb2xvcjogWzksIDcsIDIsIDEuMF1cbiAgICAgICAgfSxcbiAgICAgICAgb2lsOiB7XG4gICAgICAgICAgICBjb2xvcjogWzUsIDQsIDEsIDEuMF1cbiAgICAgICAgfSxcbiAgICAgICAgZmlyZToge1xuICAgICAgICAgICAgY29sb3I6IFsxMCwgNSwgMCwgMS4wXVxuICAgICAgICB9LFxuICAgICAgICBzb2xpZDoge1xuICAgICAgICAgICAgY29sb3I6IFswLCAwLCAwLCAxXVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuc2VsZWN0aW9uQm94ID0gbnVsbDtcblxuICAgIHRoaXMuc3Bhd25Tb2xpZCgyNTAsIDIwMCwgMTAwLCAxMCk7XG5cbiAgICAvLyBXYWxsc1xuXG4gICAgdmFyIHdpZHRoID0gMTtcbiAgICB0aGlzLnNwYXduU29saWQoMCwgMCwgdGhpcy5XSURUSCwgd2lkdGgpO1xuICAgIHRoaXMuc3Bhd25Tb2xpZCgwLCAwLCB3aWR0aCwgdGhpcy5IRUlHSFQpO1xuICAgIHRoaXMuc3Bhd25Tb2xpZCgwLCB0aGlzLkhFSUdIVCwgdGhpcy5XSURUSCwgd2lkdGgpO1xuICAgIHRoaXMuc3Bhd25Tb2xpZCh0aGlzLldJRFRILCAwLCB3aWR0aCwgdGhpcy5IRUlHSFQpO1xufVxuXG5EdXN0LnByb3RvdHlwZS5nZXRHTCA9IGZ1bmN0aW9uKCkge1xuICAgIGh0bWxDYW52YXMgPSBcIjxjYW52YXMgd2lkdGg9XCIgKyBcIlxcXCJcIiArIHRoaXMuV0lEVEggKyBcIlxcXCJcIiArIFwiaGVpZ2h0PVwiICsgXCJcXFwiXCIgKyB0aGlzLkhFSUdIVCArIFwiXFxcIlwiICsgXCI+PC9jYW52YXM+XCI7XG5cbiAgICAkKCcjY2FudmFpbmVyJykuYXBwZW5kKGh0bWxDYW52YXMpO1xuXG4gICAgcmV0dXJuICQoJ2NhbnZhcycpLmdldCgwKS5nZXRDb250ZXh0KCd3ZWJnbCcpO1xufTtcblxuRHVzdC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oZHQpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5zYW5kcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc2FuZCA9IHRoaXMuc2FuZHNbaV07XG5cbiAgICAgICAgaWYodGhpcy5ncmlkW3NhbmQueF1bc2FuZC55ICsgMV0gPT09IDApIHsgXG4gICAgICAgICAgICBzYW5kLmFkZChuZXcgVmVjdG9yKDAsIDEpKTtcblxuICAgICAgICAgICAgaWYoIXRoaXMuc2FuZENvbGxpZGVzKHNhbmQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkW3NhbmQueF1bc2FuZC55IC0gMV0gPSAwO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkW3NhbmQueF1bc2FuZC55XSA9IHNhbmQudHlwZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2FuZC5hZGQobmV3IFZlY3RvcigwLCAtMSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYodGhpcy5ncmlkW3NhbmQueCAtIDFdW3NhbmQueSArIDFdID09PSAwKSB7XG4gICAgICAgICAgICBzYW5kLmFkZChuZXcgVmVjdG9yKC0xLCAxKSk7XG5cbiAgICAgICAgICAgIGlmKCF0aGlzLnNhbmRDb2xsaWRlcyhzYW5kKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZFtzYW5kLnggKyAxXVtzYW5kLnkgLSAxXSA9IDA7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRbc2FuZC54XVtzYW5kLnldID0gc2FuZC50eXBlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzYW5kLmFkZChuZXcgVmVjdG9yKDEsIC0xKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZih0aGlzLmdyaWRbc2FuZC54ICsgMV1bc2FuZC55ICsgMV0gPT09IDApIHtcbiAgICAgICAgICAgIHNhbmQuYWRkKG5ldyBWZWN0b3IoMSwgMSkpO1xuXG4gICAgICAgICAgICBpZighdGhpcy5zYW5kQ29sbGlkZXMoc2FuZCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRbc2FuZC54IC0gMV1bc2FuZC55IC0gMV0gPSAwO1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZFtzYW5kLnhdW3NhbmQueV0gPSBzYW5kLnR5cGU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNhbmQuYWRkKG5ldyBWZWN0b3IoLTEsIC0xKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbn07XG5cblxuRHVzdC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHRoaXMuZ2wuY2xlYXIodGhpcy5nbC5DT0xPUl9CVUZGRVJfQklUKTtcblxuICAgIHZhciBtYXRlcmlhbCxcbiAgICAgICAgbXZwTWF0cml4LFxuICAgICAgICB2ZXJ0ZXhDb3VudCA9IDA7XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5zb2xpZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvbGlkID0gdGhpcy5zb2xpZHNbaV07XG5cbiAgICAgICAgc29saWQuc2V0QnVmZmVycyh0aGlzLmdsKTtcbiAgICAgICAgdGhpcy5nbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKHRoaXMucG9zaXRpb25BdHRyaWJ1dGUsIDIsIHRoaXMuZ2wuRkxPQVQsIGZhbHNlLCAxMiwgMCk7XG4gICAgICAgIHRoaXMuZ2wudmVydGV4QXR0cmliUG9pbnRlcih0aGlzLmNvbG9yQXR0cmlidXRlLCAxLCB0aGlzLmdsLkZMT0FULCBmYWxzZSwgMTIsIDgpO1xuXG4gICAgICAgIHRoaXMubXZUcmFuc2xhdGUoc29saWQucG9zLngsIHNvbGlkLnBvcy55KTtcblxuICAgICAgICBtdnBNYXRyaXggPSBtYXRyaXhNdWx0aXBseSh0aGlzLm1vZGVsVmlld01hdHJpeCwgdGhpcy5wcm9qZWN0aW9uTWF0cml4KTtcblxuICAgICAgICB0aGlzLmdsLnVuaWZvcm1NYXRyaXgzZnYodGhpcy51TW9kZWxWaWV3UHJvamVjdGlvbk1hdHJpeCwgZmFsc2UsIG12cE1hdHJpeCk7XG5cbiAgICAgICAgdGhpcy5nbC5kcmF3QXJyYXlzKHRoaXMuZ2wuVFJJQU5HTEVfU1RSSVAsIDAsIDQpO1xuICAgIH1cblxuICAgIHRoaXMuc2V0U2FuZEJ1ZmZlcnMoKTtcbiAgICB0aGlzLmxvYWRJZGVudGl0eSgpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMuc2FuZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHMgPSB0aGlzLnNhbmRzW2ldO1xuXG4gICAgICAgIHN3aXRjaChzLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICBtYXRlcmlhbCA9IHRoaXMubWF0ZXJpYWxzLnNhbmQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFscy5vaWw7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgbWF0ZXJpYWwgPSB0aGlzLm1hdGVyaWFscy5maXJlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB4ID0gcy54LFxuICAgICAgICAgICAgeSA9IHMueTtcblxuICAgICAgICB2YXIgb2Zmc2V0ID0gdmVydGV4Q291bnQgKiAzICogNjtcblxuICAgICAgICBpZih2ZXJ0ZXhDb3VudCA8IHRoaXMuTUFYX0RVU1QpIHtcbiAgICAgICAgICAgIHRoaXMuc2FuZFZlcnRleEFycmF5W29mZnNldF0gICAgID0geDtcbiAgICAgICAgICAgIHRoaXMuc2FuZFZlcnRleEFycmF5W29mZnNldCArIDFdID0geTtcbiAgICAgICAgICAgIHRoaXMuc2FuZFZlcnRleEFycmF5W29mZnNldCArIDJdID0gcGFja0NvbG9yKG1hdGVyaWFsLmNvbG9yKTtcblxuICAgICAgICAgICAgdGhpcy5zYW5kVmVydGV4QXJyYXlbb2Zmc2V0ICsgM10gPSB4ICsgMTtcbiAgICAgICAgICAgIHRoaXMuc2FuZFZlcnRleEFycmF5W29mZnNldCArIDRdID0geTtcbiAgICAgICAgICAgIHRoaXMuc2FuZFZlcnRleEFycmF5W29mZnNldCArIDVdID0gcGFja0NvbG9yKG1hdGVyaWFsLmNvbG9yKTtcblxuICAgICAgICAgICAgdGhpcy5zYW5kVmVydGV4QXJyYXlbb2Zmc2V0ICsgNl0gPSB4O1xuICAgICAgICAgICAgdGhpcy5zYW5kVmVydGV4QXJyYXlbb2Zmc2V0ICsgN10gPSB5ICsgMTtcbiAgICAgICAgICAgIHRoaXMuc2FuZFZlcnRleEFycmF5W29mZnNldCArIDhdID0gcGFja0NvbG9yKG1hdGVyaWFsLmNvbG9yKTtcblxuXG4gICAgICAgICAgICB0aGlzLnNhbmRWZXJ0ZXhBcnJheVtvZmZzZXQgKyA5XT0geDtcbiAgICAgICAgICAgIHRoaXMuc2FuZFZlcnRleEFycmF5W29mZnNldCArIDEwXSA9IHkgKyAxO1xuICAgICAgICAgICAgdGhpcy5zYW5kVmVydGV4QXJyYXlbb2Zmc2V0ICsgMTFdID0gcGFja0NvbG9yKG1hdGVyaWFsLmNvbG9yKTtcblxuICAgICAgICAgICAgdGhpcy5zYW5kVmVydGV4QXJyYXlbb2Zmc2V0ICsgMTJdID0geCArIDE7XG4gICAgICAgICAgICB0aGlzLnNhbmRWZXJ0ZXhBcnJheVtvZmZzZXQgKyAxM10gPSB5O1xuICAgICAgICAgICAgdGhpcy5zYW5kVmVydGV4QXJyYXlbb2Zmc2V0ICsgMTRdID0gcGFja0NvbG9yKG1hdGVyaWFsLmNvbG9yKTtcblxuICAgICAgICAgICAgdGhpcy5zYW5kVmVydGV4QXJyYXlbb2Zmc2V0ICsgMTVdID0geCArIDE7XG4gICAgICAgICAgICB0aGlzLnNhbmRWZXJ0ZXhBcnJheVtvZmZzZXQgKyAxNl0gPSB5ICsgMTtcbiAgICAgICAgICAgIHRoaXMuc2FuZFZlcnRleEFycmF5W29mZnNldCArIDE3XSA9IHBhY2tDb2xvcihtYXRlcmlhbC5jb2xvcik7XG5cbiAgICAgICAgICAgIHZlcnRleENvdW50Kys7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmdsLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5wb3NpdGlvbkF0dHJpYnV0ZSwgMiwgdGhpcy5nbC5GTE9BVCwgZmFsc2UsIDEyLCAwKTtcbiAgICB0aGlzLmdsLnZlcnRleEF0dHJpYlBvaW50ZXIodGhpcy5jb2xvckF0dHJpYnV0ZSwgMSwgdGhpcy5nbC5GTE9BVCwgZmFsc2UsIDEyLCA4KTtcbiAgICBtdnBNYXRyaXggPSBtYXRyaXhNdWx0aXBseSh0aGlzLm1vZGVsVmlld01hdHJpeCwgdGhpcy5wcm9qZWN0aW9uTWF0cml4KTtcblxuICAgIHRoaXMuZ2wuYnVmZmVyRGF0YSh0aGlzLmdsLkFSUkFZX0JVRkZFUiwgdGhpcy5zYW5kVmVydGV4QXJyYXksIHRoaXMuZ2wuU1RBVElDX0RSQVcpO1xuICAgIHRoaXMuZ2wudW5pZm9ybU1hdHJpeDNmdih0aGlzLnVNb2RlbFZpZXdQcm9qZWN0aW9uTWF0cml4LCBmYWxzZSwgbXZwTWF0cml4KTtcbiAgICB0aGlzLmdsLmRyYXdBcnJheXModGhpcy5nbC5UUklBTkdMRVMsIDAsIHZlcnRleENvdW50ICogNik7XG59O1xuXG5EdXN0LnByb3RvdHlwZS5zYW5kQ29sbGlkZXMgPSBmdW5jdGlvbihzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNvbGlkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZihzLndpdGhpbih0aGlzLnNvbGlkc1tpXS5hYWJiKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSBpZihzLnggPCAwIHx8IHMueSA8IDAgfHwgcy54ID4gdGhpcy5XSURUSCB8fCBzLnkgPiB0aGlzLkhFSUdIVCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG5EdXN0LnByb3RvdHlwZS5yZXNpemVTZWxlY3Rpb24gPSBmdW5jdGlvbih3LCBoKSB7XG4gICAgdGhpcy5zZWxlY3Rpb25Cb3gucmVzaXplKHcsIGgpO1xufTtcblxuRHVzdC5wcm90b3R5cGUubW92ZVNlbGVjdGlvbiA9IGZ1bmN0aW9uKHZlYykge1xuICAgIHRoaXMuc2VsZWN0aW9uQm94Lm1vdmUodmVjKTtcbn07XG5cbkR1c3QucHJvdG90eXBlLmRyYXdTZWxlY3Rpb24gPSBmdW5jdGlvbih4LCB5LCB3LCBoKSB7XG4gICAgdGhpcy5zZWxlY3Rpb25Cb3ggPSBuZXcgU29saWQoeCwgeSwgdywgaCk7XG59O1xuXG5EdXN0LnByb3RvdHlwZS5zcGF3blNvbGlkID0gZnVuY3Rpb24oeCwgeSwgdywgaCkge1xuICAgIHZhciBzID0gbmV3IFNvbGlkKHgsIHksIHcsIGgpO1xuICAgIHMuYnVmZmVyVXAodGhpcy5nbCk7XG5cbiAgICB0aGlzLnNvbGlkcy5wdXNoKHMpO1xufTtcblxuRHVzdC5wcm90b3R5cGUuc3Bhd25EdXN0ID0gZnVuY3Rpb24oeCwgeSwgdHlwZSkge1xuICAgIGlmKHRoaXMuc2FuZHMubGVuZ3RoID49IHRoaXMuTUFYX0RVU1QpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBuID0gNTAsXG4gICAgICAgIGFyZWEgPSAyMDtcblxuICAgIHggLT0gYXJlYSAvIDI7XG4gICAgeSAtPSBhcmVhIC8gMjtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIHZhciBzcGF3blggPSBNYXRoLnJvdW5kKHggKyBhcmVhKk1hdGgucmFuZG9tKCkpLFxuICAgICAgICAgICAgc3Bhd25ZID0gTWF0aC5yb3VuZCh5ICsgYXJlYSpNYXRoLnJhbmRvbSgpKTtcbiAgICAgICAgXG4gICAgICAgIHZhciBzID0gbmV3IFZlY3RvcihzcGF3blgsIHNwYXduWSk7XG4gICAgICAgIFxuICAgICAgICBzLnR5cGUgPSB0aGlzLmdldFR5cGUodHlwZSk7XG5cbiAgICAgICAgaWYoIXRoaXMuc2FuZENvbGxpZGVzKHMpKSB7XG4gICAgICAgICAgICB0aGlzLnNhbmRzLnB1c2gocyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBSZXR1cm5zIG51bWVyaWNhbCBjb2RlIGZvciBtYXRlcmlhbCB0eXBlXG5EdXN0LnByb3RvdHlwZS5nZXRUeXBlID0gZnVuY3Rpb24odHlwZVN0cmluZykge1xuICAgIHN3aXRjaCh0eXBlU3RyaW5nKSB7XG4gICAgICAgIGNhc2UgJ3NhbmQnOlxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIGNhc2UgJ29pbCc6XG4gICAgICAgICAgICByZXR1cm4gMjtcbiAgICAgICAgY2FzZSAnZmlyZSc6XG4gICAgICAgICAgICByZXR1cm4gMztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgIH1cbn07XG5cbi8vIElmIGEgc29saWQgZXhpc3RzIGhlcmUsIGl0IHdpbGwgYmUgc2FuZGlmaWVkXG5EdXN0LnByb3RvdHlwZS5zYW5kaWZ5U29saWQgPSBmdW5jdGlvbih2ZWMpIHtcbiAgICB2YXIgcyA9IHRoaXMud29ybGQuY29sbGlkZXModmVjKTtcbiAgICBpZihzKSB7XG4gICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgcy53OyB4KyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgcy5oOyB5KyspIHtcbiAgICAgICAgICAgICAgICB2YXIgc2FuZCA9IG5ldyBWZWN0b3IoeCArIHMucG9zLngsIHkgKyBzLnBvcy55KTtcbiAgICAgICAgICAgICAgICB0aGlzLndvcmxkLnB1c2hTYW5kKHNhbmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMud29ybGQuc29saWRzLmluZGV4T2Yocyk7XG4gICAgICAgIHRoaXMud29ybGQuc29saWRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxufTtcblxuLy8gQ29tcGlsZXMgYSBzaGFkZXIgcHJvZ3JhbSBmcm9tIGdpdmVuIHNvdXJjZXNcbkR1c3QucHJvdG90eXBlLmdldFNoYWRlclByb2dyYW0gPSBmdW5jdGlvbih2ZXJ0LCBmcmFnKSB7XG4gICAgdmFyIHZlcnRleFNoYWRlciA9IHRoaXMuZ2wuY3JlYXRlU2hhZGVyKHRoaXMuZ2wuVkVSVEVYX1NIQURFUiksXG4gICAgICAgIGZyYWdtZW50U2hhZGVyID0gdGhpcy5nbC5jcmVhdGVTaGFkZXIodGhpcy5nbC5GUkFHTUVOVF9TSEFERVIpO1xuXG4gICAgdGhpcy5nbC5zaGFkZXJTb3VyY2UodmVydGV4U2hhZGVyLCB2ZXJ0KTtcbiAgICB0aGlzLmdsLnNoYWRlclNvdXJjZShmcmFnbWVudFNoYWRlciwgZnJhZyk7XG5cbiAgICB0aGlzLmdsLmNvbXBpbGVTaGFkZXIodmVydGV4U2hhZGVyKTtcbiAgICB0aGlzLmdsLmNvbXBpbGVTaGFkZXIoZnJhZ21lbnRTaGFkZXIpO1xuXG4gICAgaWYoIXRoaXMuZ2wuZ2V0U2hhZGVyUGFyYW1ldGVyKHZlcnRleFNoYWRlciwgdGhpcy5nbC5DT01QSUxFX1NUQVRVUykpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlZlcnRleCBzaGFkZXIgd29uJ3QgY29tcGlsZSBtYXRlOiBcIiwgdGhpcy5nbC5nZXRTaGFkZXJJbmZvTG9nKHZlcnRleFNoYWRlcikpO1xuICAgIH1cbiAgICBcbiAgICBpZighdGhpcy5nbC5nZXRTaGFkZXJQYXJhbWV0ZXIoZnJhZ21lbnRTaGFkZXIsIHRoaXMuZ2wuQ09NUElMRV9TVEFUVVMpKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGcmFnbWVudCBzaGFkZXIgd29uJ3QgY29tcGlsZSBtYXRlOiBcIiwgdGhpcy5nbC5nZXRTaGFkZXJJbmZvTG9nKGZyYWdtZW50U2hhZGVyKSk7XG4gICAgfVxuXG4gICAgdmFyIHByb2dyYW0gPSB0aGlzLmdsLmNyZWF0ZVByb2dyYW0oKTtcblxuICAgIHRoaXMuZ2wuYXR0YWNoU2hhZGVyKHByb2dyYW0sIHZlcnRleFNoYWRlcik7XG4gICAgdGhpcy5nbC5hdHRhY2hTaGFkZXIocHJvZ3JhbSwgZnJhZ21lbnRTaGFkZXIpO1xuICAgIHRoaXMuZ2wubGlua1Byb2dyYW0ocHJvZ3JhbSk7XG5cbiAgICByZXR1cm4gcHJvZ3JhbTtcbn07XG5cbkR1c3QucHJvdG90eXBlLnNldFVuaWZvcm1zID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy51TW9kZWxWaWV3UHJvamVjdGlvbk1hdHJpeCA9IHRoaXMuZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMuc2hhZGVyUHJvZ3JhbSwgJ21vZGVsVmlld1Byb2plY3Rpb25NYXRyaXgnKTtcbn07XG5cbkR1c3QucHJvdG90eXBlLnNldFNhbmRCdWZmZXJzID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5nbC5iaW5kQnVmZmVyKHRoaXMuZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLmR1c3RCdWZmZXIpO1xufTtcblxuRHVzdC5wcm90b3R5cGUubG9hZElkZW50aXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tb2RlbFZpZXdNYXRyaXggPSBbXG4gICAgICAgICAgICAxLCAwLCAwLFxuICAgICAgICAgICAgMCwgMSwgMCxcbiAgICAgICAgICAgIDAsIDAsIDFcbiAgICAgICAgXTtcbn07XG5cbkR1c3QucHJvdG90eXBlLm12VHJhbnNsYXRlID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMubW9kZWxWaWV3TWF0cml4WzZdID0geDtcbiAgICB0aGlzLm1vZGVsVmlld01hdHJpeFs3XSA9IHk7XG59O1xuXG5EdXN0LnByb3RvdHlwZS5tdlNjYWxlID0gZnVuY3Rpb24oeHMsIHlzKSB7XG4gICAgdGhpcy5tb2RlbFZpZXdNYXRyaXhbMF0gPSB4cztcbiAgICB0aGlzLm1vZGVsVmlld01hdHJpeFs0XSA9IHlzO1xufTtcblxuLy8gQXNzb3J0ZWQgZnVuY3Rpb25zXG5mdW5jdGlvbiBBcnJheTJEKHcsIGgpIHtcbiAgICB2YXIgYXJyYXkgPSBbXTtcblxuICAgIGZvciAodmFyIHggPSAwOyB4IDwgdzsgeCsrKSB7XG4gICAgICAgIGFycmF5W3hdID0gW107XG4gICAgICAgIGZvciAodmFyIHkgPSAwOyB5IDwgaDsgeSsrKSB7XG4gICAgICAgICAgICBhcnJheVt4XVt5XSA9IDA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYXJyYXk7XG59XG5cbmZ1bmN0aW9uIG1ha2VQcm9qZWN0aW9uTWF0cml4KHdpZHRoLCBoZWlnaHQpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAyIC8gd2lkdGgsIDAsICAgICAgICAgIDAsXG4gICAgICAgIDAsICAgICAgICAtMiAvIGhlaWdodCwgMCxcbiAgICAgICAtMSwgICAgICAgICAxLCAgICAgICAgICAxXG4gICAgXTtcbn1cblxuXG4vLyBZZWFoIEkgZGlkIHN0ZWFsIHRoaXMgb25lLiBIb3cgZGlkIHlvdSBrbm93P1xuZnVuY3Rpb24gbWF0cml4TXVsdGlwbHkoYSwgYikge1xuICB2YXIgYTAwID0gYVswKjMrMF07XG4gIHZhciBhMDEgPSBhWzAqMysxXTtcbiAgdmFyIGEwMiA9IGFbMCozKzJdO1xuICB2YXIgYTEwID0gYVsxKjMrMF07XG4gIHZhciBhMTEgPSBhWzEqMysxXTtcbiAgdmFyIGExMiA9IGFbMSozKzJdO1xuICB2YXIgYTIwID0gYVsyKjMrMF07XG4gIHZhciBhMjEgPSBhWzIqMysxXTtcbiAgdmFyIGEyMiA9IGFbMiozKzJdO1xuICB2YXIgYjAwID0gYlswKjMrMF07XG4gIHZhciBiMDEgPSBiWzAqMysxXTtcbiAgdmFyIGIwMiA9IGJbMCozKzJdO1xuICB2YXIgYjEwID0gYlsxKjMrMF07XG4gIHZhciBiMTEgPSBiWzEqMysxXTtcbiAgdmFyIGIxMiA9IGJbMSozKzJdO1xuICB2YXIgYjIwID0gYlsyKjMrMF07XG4gIHZhciBiMjEgPSBiWzIqMysxXTtcbiAgdmFyIGIyMiA9IGJbMiozKzJdO1xuICByZXR1cm4gW2EwMCAqIGIwMCArIGEwMSAqIGIxMCArIGEwMiAqIGIyMCxcbiAgICAgICAgICBhMDAgKiBiMDEgKyBhMDEgKiBiMTEgKyBhMDIgKiBiMjEsXG4gICAgICAgICAgYTAwICogYjAyICsgYTAxICogYjEyICsgYTAyICogYjIyLFxuICAgICAgICAgIGExMCAqIGIwMCArIGExMSAqIGIxMCArIGExMiAqIGIyMCxcbiAgICAgICAgICBhMTAgKiBiMDEgKyBhMTEgKiBiMTEgKyBhMTIgKiBiMjEsXG4gICAgICAgICAgYTEwICogYjAyICsgYTExICogYjEyICsgYTEyICogYjIyLFxuICAgICAgICAgIGEyMCAqIGIwMCArIGEyMSAqIGIxMCArIGEyMiAqIGIyMCxcbiAgICAgICAgICBhMjAgKiBiMDEgKyBhMjEgKiBiMTEgKyBhMjIgKiBiMjEsXG4gICAgICAgICAgYTIwICogYjAyICsgYTIxICogYjEyICsgYTIyICogYjIyXTtcbn1cblxuLy8gQ3JlZGl0IHRvICdBSE0nIG9uIFN0YWNrT3ZlcmZsb3dcbmZ1bmN0aW9uIHBhY2tDb2xvcihjb2xvcikge1xuICAgIHJldHVybiBjb2xvclswXSArIGNvbG9yWzFdICogMjU2ICsgY29sb3JbMl0gKiAyNTYgKiAyNTY7XG59XG4iLCJ2YXIgVmVjdG9yID0gcmVxdWlyZSgnLi9WZWN0b3InKSxcbiAgICBBQUJCID0gcmVxdWlyZSgnLi9BQUJCJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gU29saWQ7XG5cbmZ1bmN0aW9uIFNvbGlkKHgsIHksIHcsIGgpIHtcbiAgICB0aGlzLncgPSB3O1xuICAgIHRoaXMuaCA9IGg7XG4gICAgXG4gICAgdGhpcy5wb3MgPSBuZXcgVmVjdG9yKHgsIHkpO1xuXG4gICAgdGhpcy5hYWJiID0gbmV3IEFBQkIoeCAtIHRoaXMudywgeSAtIHRoaXMuaCwgKHggKyB0aGlzLncpLCAoeSArIHRoaXMuaCkpO1xuXG4gICAgdGhpcy5jb2xvciA9IDA7XG59XG5cblNvbGlkLnByb3RvdHlwZS5idWZmZXJVcCA9IGZ1bmN0aW9uKGdsKSB7XG4gICAgdGhpcy52ZXJ0ZXhCdWZmZXIgPSBnbC5jcmVhdGVCdWZmZXIoKTtcbiAgICB0aGlzLmluZGV4QnVmZmVyID0gZ2wuY3JlYXRlQnVmZmVyKCk7XG5cbiAgICB2YXIgZmxvYXRBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoW1xuICAgICAgICAgICAgLXRoaXMudywgIC10aGlzLmgsIHRoaXMuY29sb3IsXG4gICAgICAgICAgICAtdGhpcy53LCAgIHRoaXMuaCwgdGhpcy5jb2xvcixcbiAgICAgICAgICAgICB0aGlzLncsICAtdGhpcy5oLCB0aGlzLmNvbG9yLFxuICAgICAgICAgICAgIHRoaXMudywgICB0aGlzLmgsIHRoaXMuY29sb3JdKTtcblxuXG4gICAgZ2wuYmluZEJ1ZmZlcihnbC5BUlJBWV9CVUZGRVIsIHRoaXMudmVydGV4QnVmZmVyKTtcbiAgICBnbC5idWZmZXJEYXRhKGdsLkFSUkFZX0JVRkZFUiwgZmxvYXRBcnJheSwgZ2wuU1RBVElDX0RSQVcpO1xuICAgIFxuICAgIGdsLmJpbmRCdWZmZXIoZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIsIG51bGwpO1xufTtcblxuU29saWQucHJvdG90eXBlLnNldEJ1ZmZlcnMgPSBmdW5jdGlvbihnbCkge1xuICAgIGdsLmJpbmRCdWZmZXIoZ2wuQVJSQVlfQlVGRkVSLCB0aGlzLnZlcnRleEJ1ZmZlcik7XG59O1xuXG5Tb2xpZC5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKGRWZWMpIHtcbiAgICBkVmVjLnJvdW5kKCk7XG4gICAgdGhpcy5wb3MuYWRkKHZlYyk7XG4gICAgdGhpcy5hYWJiLnRyYW5zbGF0ZSh2ZWMpO1xufTtcblxuU29saWQucHJvdG90eXBlLnJlc2l6ZSA9IGZ1bmN0aW9uKHcsIGgpIHtcbiAgICB0aGlzLncgPSB3O1xuICAgIHRoaXMuaCA9IGg7XG4gICAgdGhpcy5hYWJiLm1heC54ID0gdGhpcy5wb3MueCArIHc7XG4gICAgdGhpcy5hYWJiLm1heC55ID0gdGhpcy5wb3MueSArIGg7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBUaW1lcjtcblxuZnVuY3Rpb24gVGltZXIoKSB7XG4gICAgdGhpcy5zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xufVxuXG5UaW1lci5wcm90b3R5cGUuZ2V0VGltZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdXJyZW50VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gICAgcmV0dXJuIGN1cnJlbnRUaW1lIC0gdGhpcy5zdGFydDtcbn1cblxuVGltZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdGFydCA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBWZWN0b3I7XG5cbmZ1bmN0aW9uIFZlY3Rvcih4LCB5KSB7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xufTtcblxuVmVjdG9yLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih2ZWMpIHtcbiAgICB0aGlzLnggKz0gdmVjLng7XG4gICAgdGhpcy55ICs9IHZlYy55O1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5WZWN0b3IucHJvdG90eXBlLndpdGhpbiA9IGZ1bmN0aW9uKGFhYmIpIHtcbiAgICBpZih0aGlzLnggPCBhYWJiLm1pbi54IHx8XG4gICAgICAgdGhpcy54ID4gYWFiYi5tYXgueCB8fFxuICAgICAgIHRoaXMueSA8IGFhYmIubWluLnkgfHxcbiAgICAgICB0aGlzLnkgPiBhYWJiLm1heC55KSB7XG4gICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICB9XG59XG5cblZlY3Rvci5wcm90b3R5cGUucm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnggPSBNYXRoLnJvdW5kKHRoaXMueCk7XG4gICAgdGhpcy55ID0gTWF0aC5yb3VuZCh0aGlzLnkpO1xuICAgIHJldHVybiB0aGlzO1xufVxuIiwidmFyIENsaWVudCA9IHJlcXVpcmUoJy4vQ2xpZW50JyksXG4gICAgRHVzdCA9IHJlcXVpcmUoJy4vRHVzdCcpLFxuICAgICQgPSByZXF1aXJlKCdqcXVlcnktYnJvd3NlcmlmeScpLFxuICAgIFRpbWVyID0gcmVxdWlyZSgnLi9UaW1lcicpLFxuICAgIFZlY3RvciA9IHJlcXVpcmUoJy4vVmVjdG9yJyk7XG5cbiQoZG9jdW1lbnQpLnJlYWR5KG1haW4pO1xuXG5mdW5jdGlvbiBtYWluKCkge1xuICAgIHZhciBEVVNUID0gbmV3IER1c3QoKSxcbiAgICAgICAgdGltZXIgPSBuZXcgVGltZXIoKSxcbiAgICAgICAgZnJhbWUgPSAwLFxuICAgICAgICBmcHNUaW1lciA9IG5ldyBUaW1lcigpO1xuXG4gICAgXG4gICAgJCgnI2ZwcycpLmh0bWwoMCArICdmcHMnKTtcbiAgICB2YXIgb2Zmc2V0ID0gJCgnY2FudmFzJykub2Zmc2V0KCk7XG5cbiAgICAkKCdjYW52YXMnKS5tb3VzZWRvd24oZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICQoJ2NhbnZhcycpLnVuYmluZCgnbW91c2V1cCcpO1xuICAgICAgICBzd2l0Y2goZS53aGljaCkge1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgIHZhciB4ID0gTWF0aC5yb3VuZChlLnBhZ2VYIC0gb2Zmc2V0LmxlZnQpO1xuICAgICAgICAgICAgICAgICAgICB5ID0gTWF0aC5yb3VuZChlLnBhZ2VZIC0gb2Zmc2V0LnRvcCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9ICQoJ2lucHV0W25hbWU9ZHVzdFR5cGVdOmNoZWNrZWQnLCAnI21lbnUnKS52YWwoKTtcbiAgICAgICAgICAgICAgICBEVVNULnNwYXduRHVzdCh4LCB5LCB0eXBlKTtcblxuICAgICAgICAgICAgICAgICQoJ2NhbnZhcycpLm1vdXNlbW92ZShmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIHggPSBNYXRoLnJvdW5kKGUucGFnZVggLSBvZmZzZXQubGVmdCk7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBNYXRoLnJvdW5kKGUucGFnZVkgLSBvZmZzZXQudG9wKTtcblxuICAgICAgICAgICAgICAgICAgICBEVVNULnNwYXduRHVzdCh4LCB5LCB0eXBlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAkKCdjYW52YXMnKS5tb3VzZXVwKGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnY2FudmFzJykudW5iaW5kKCdtb3VzZW1vdmUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICB2YXIgeE9yaWcgPSBNYXRoLnJvdW5kKGUucGFnZVggLSBvZmZzZXQubGVmdCksXG4gICAgICAgICAgICAgICAgICAgIHlPcmlnID0gTWF0aC5yb3VuZChlLnBhZ2VZIC0gb2Zmc2V0LnRvcCksXG4gICAgICAgICAgICAgICAgICAgIHcgPSAwLFxuICAgICAgICAgICAgICAgICAgICBoID0gMDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgRFVTVC5kcmF3U2VsZWN0aW9uKHhPcmlnLCB5T3JpZywgMCwgMCk7XG5cbiAgICAgICAgICAgICAgICAkKCdjYW52YXMnKS5tb3VzZW1vdmUoZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICB3ID0gTWF0aC5hYnMoeE9yaWcgLSBNYXRoLnJvdW5kKGUucGFnZVggLSBvZmZzZXQubGVmdCkpO1xuICAgICAgICAgICAgICAgICAgICBoID0gTWF0aC5hYnMoeU9yaWcgLSBNYXRoLnJvdW5kKGUucGFnZVkgLSBvZmZzZXQudG9wIC0gMjApKTsgLy9ObyBJJ20gbm90IGVudGlyZWx5IGNsZWFyIHdoeSB0aGF0IC0yMCBoYXMgdG8gYmUgdGhlcmVcblxuICAgICAgICAgICAgICAgICAgICBEVVNULnJlc2l6ZVNlbGVjdGlvbih3LCBoKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICQoJ2NhbnZhcycpLm1vdXNldXAoZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICAkKCdjYW52YXMnKS51bmJpbmQoJ21vdXNlbW92ZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIERVU1Quc2VsZWN0aW9uQm94ID0gbnVsbDtcblxuICAgICAgICAgICAgICAgICAgICBEVVNULnNwYXduU29saWQoeE9yaWcsIHlPcmlnLCB3LCBoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICB4ID0gTWF0aC5yb3VuZChlLnBhZ2VYIC0gb2Zmc2V0LmxlZnQpO1xuICAgICAgICAgICAgICAgIHkgPSBNYXRoLnJvdW5kKGUucGFnZVkgLSBvZmZzZXQudG9wKTtcblxuICAgICAgICAgICAgICAgIERVU1Quc2FuZGlmeVNvbGlkKG5ldyBWZWN0b3IoeCwgeSkpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgXG4gICAgdGljaygpO1xuXG4gICAgZnVuY3Rpb24gdGljaygpIHtcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRpY2spO1xuXG4gICAgICAgIGZyYW1lKys7XG4gICAgICAgIGlmKGZwc1RpbWVyLmdldFRpbWUoKSA+IDEwMDApIHtcbiAgICAgICAgICAgICQoJyNmcHMnKS5odG1sKGZyYW1lICsgJ2ZwcycpO1xuICAgICAgICAgICAgZnBzVGltZXIucmVzZXQoKTtcbiAgICAgICAgICAgIGZyYW1lID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIERVU1QudXBkYXRlKHRpbWVyLmdldFRpbWUoKSAvIDEwMDApO1xuXG4gICAgICAgIERVU1QuZHJhdygpO1xuXG4gICAgICAgIHRpbWVyLnJlc2V0KCk7XG4gICAgfVxuICAgIFxuICAgIERVU1Quc29ja2V0Lm9uKCdjbGllbnQgY29ubmVjdGVkJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICB2YXIgaXAgPSBcIjE5Mi4xNjguMS43N1wiO1xuXG4gICAgICAgIGlmKGRhdGEgPT09IDEpIHtcbiAgICAgICAgICAgIERVU1QuY2xpZW50ID0gbmV3IENsaWVudChpcCwgXCJyZWRcIik7XG4gICAgICAgICAgICBEVVNULmNsaWVudC50dXJuID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmKGRhdGEgPT09IDIpIHtcbiAgICAgICAgICAgIERVU1QuY2xpZW50ID0gbmV3IENsaWVudChpcCwgXCJibHVlXCIpO1xuICAgICAgICB9IGVsc2UgaWYoZGF0YSA+IDIpIHtcbiAgICAgICAgICAgIERVU1QuY2xpZW50ID0gbmV3IENsaWVudChpcCk7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG59XG4iLCIvLyBVc2VzIE5vZGUsIEFNRCBvciBicm93c2VyIGdsb2JhbHMgdG8gY3JlYXRlIGEgbW9kdWxlLlxuXG4vLyBJZiB5b3Ugd2FudCBzb21ldGhpbmcgdGhhdCB3aWxsIHdvcmsgaW4gb3RoZXIgc3RyaWN0ZXIgQ29tbW9uSlMgZW52aXJvbm1lbnRzLFxuLy8gb3IgaWYgeW91IG5lZWQgdG8gY3JlYXRlIGEgY2lyY3VsYXIgZGVwZW5kZW5jeSwgc2VlIGNvbW1vbkpzU3RyaWN0LmpzXG5cbi8vIERlZmluZXMgYSBtb2R1bGUgXCJyZXR1cm5FeHBvcnRzXCIgdGhhdCBkZXBlbmRzIGFub3RoZXIgbW9kdWxlIGNhbGxlZCBcImJcIi5cbi8vIE5vdGUgdGhhdCB0aGUgbmFtZSBvZiB0aGUgbW9kdWxlIGlzIGltcGxpZWQgYnkgdGhlIGZpbGUgbmFtZS4gSXQgaXMgYmVzdFxuLy8gaWYgdGhlIGZpbGUgbmFtZSBhbmQgdGhlIGV4cG9ydGVkIGdsb2JhbCBoYXZlIG1hdGNoaW5nIG5hbWVzLlxuXG4vLyBJZiB0aGUgJ2InIG1vZHVsZSBhbHNvIHVzZXMgdGhpcyB0eXBlIG9mIGJvaWxlcnBsYXRlLCB0aGVuXG4vLyBpbiB0aGUgYnJvd3NlciwgaXQgd2lsbCBjcmVhdGUgYSBnbG9iYWwgLmIgdGhhdCBpcyB1c2VkIGJlbG93LlxuXG4vLyBJZiB5b3UgZG8gbm90IHdhbnQgdG8gc3VwcG9ydCB0aGUgYnJvd3NlciBnbG9iYWwgcGF0aCwgdGhlbiB5b3Vcbi8vIGNhbiByZW1vdmUgdGhlIGByb290YCB1c2UgYW5kIHRoZSBwYXNzaW5nIGB0aGlzYCBhcyB0aGUgZmlyc3QgYXJnIHRvXG4vLyB0aGUgdG9wIGZ1bmN0aW9uLlxuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIC8vIE5vZGUuIERvZXMgbm90IHdvcmsgd2l0aCBzdHJpY3QgQ29tbW9uSlMsIGJ1dFxuICAgICAgICAvLyBvbmx5IENvbW1vbkpTLWxpa2UgZW52aXJvbWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLFxuICAgICAgICAvLyBsaWtlIE5vZGUuXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICAgICAgZGVmaW5lKFtdLCBmYWN0b3J5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCcm93c2VyIGdsb2JhbHNcbiAgICAgICAgcm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKCkgey8qIVxuICogalF1ZXJ5IEphdmFTY3JpcHQgTGlicmFyeSB2MS44LjFcbiAqIGh0dHA6Ly9qcXVlcnkuY29tL1xuICpcbiAqIEluY2x1ZGVzIFNpenpsZS5qc1xuICogaHR0cDovL3NpenpsZWpzLmNvbS9cbiAqXG4gKiBDb3B5cmlnaHQgMjAxMiBqUXVlcnkgRm91bmRhdGlvbiBhbmQgb3RoZXIgY29udHJpYnV0b3JzXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqIGh0dHA6Ly9qcXVlcnkub3JnL2xpY2Vuc2VcbiAqXG4gKiBEYXRlOiBUaHUgQXVnIDMwIDIwMTIgMTc6MTc6MjIgR01ULTA0MDAgKEVhc3Rlcm4gRGF5bGlnaHQgVGltZSlcbiAqL1xucmV0dXJuIChmdW5jdGlvbiggd2luZG93LCB1bmRlZmluZWQgKSB7XG52YXJcblx0Ly8gQSBjZW50cmFsIHJlZmVyZW5jZSB0byB0aGUgcm9vdCBqUXVlcnkoZG9jdW1lbnQpXG5cdHJvb3RqUXVlcnksXG5cblx0Ly8gVGhlIGRlZmVycmVkIHVzZWQgb24gRE9NIHJlYWR5XG5cdHJlYWR5TGlzdCxcblxuXHQvLyBVc2UgdGhlIGNvcnJlY3QgZG9jdW1lbnQgYWNjb3JkaW5nbHkgd2l0aCB3aW5kb3cgYXJndW1lbnQgKHNhbmRib3gpXG5cdGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50LFxuXHRsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbixcblx0bmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcixcblxuXHQvLyBNYXAgb3ZlciBqUXVlcnkgaW4gY2FzZSBvZiBvdmVyd3JpdGVcblx0X2pRdWVyeSA9IHdpbmRvdy5qUXVlcnksXG5cblx0Ly8gTWFwIG92ZXIgdGhlICQgaW4gY2FzZSBvZiBvdmVyd3JpdGVcblx0XyQgPSB3aW5kb3cuJCxcblxuXHQvLyBTYXZlIGEgcmVmZXJlbmNlIHRvIHNvbWUgY29yZSBtZXRob2RzXG5cdGNvcmVfcHVzaCA9IEFycmF5LnByb3RvdHlwZS5wdXNoLFxuXHRjb3JlX3NsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLFxuXHRjb3JlX2luZGV4T2YgPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZixcblx0Y29yZV90b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdGNvcmVfaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcblx0Y29yZV90cmltID0gU3RyaW5nLnByb3RvdHlwZS50cmltLFxuXG5cdC8vIERlZmluZSBhIGxvY2FsIGNvcHkgb2YgalF1ZXJ5XG5cdGpRdWVyeSA9IGZ1bmN0aW9uKCBzZWxlY3RvciwgY29udGV4dCApIHtcblx0XHQvLyBUaGUgalF1ZXJ5IG9iamVjdCBpcyBhY3R1YWxseSBqdXN0IHRoZSBpbml0IGNvbnN0cnVjdG9yICdlbmhhbmNlZCdcblx0XHRyZXR1cm4gbmV3IGpRdWVyeS5mbi5pbml0KCBzZWxlY3RvciwgY29udGV4dCwgcm9vdGpRdWVyeSApO1xuXHR9LFxuXG5cdC8vIFVzZWQgZm9yIG1hdGNoaW5nIG51bWJlcnNcblx0Y29yZV9wbnVtID0gL1tcXC0rXT8oPzpcXGQqXFwufClcXGQrKD86W2VFXVtcXC0rXT9cXGQrfCkvLnNvdXJjZSxcblxuXHQvLyBVc2VkIGZvciBkZXRlY3RpbmcgYW5kIHRyaW1taW5nIHdoaXRlc3BhY2Vcblx0Y29yZV9ybm90d2hpdGUgPSAvXFxTLyxcblx0Y29yZV9yc3BhY2UgPSAvXFxzKy8sXG5cblx0Ly8gTWFrZSBzdXJlIHdlIHRyaW0gQk9NIGFuZCBOQlNQIChoZXJlJ3MgbG9va2luZyBhdCB5b3UsIFNhZmFyaSA1LjAgYW5kIElFKVxuXHRydHJpbSA9IC9eW1xcc1xcdUZFRkZcXHhBMF0rfFtcXHNcXHVGRUZGXFx4QTBdKyQvZyxcblxuXHQvLyBBIHNpbXBsZSB3YXkgdG8gY2hlY2sgZm9yIEhUTUwgc3RyaW5nc1xuXHQvLyBQcmlvcml0aXplICNpZCBvdmVyIDx0YWc+IHRvIGF2b2lkIFhTUyB2aWEgbG9jYXRpb24uaGFzaCAoIzk1MjEpXG5cdHJxdWlja0V4cHIgPSAvXig/OlteIzxdKig8W1xcd1xcV10rPilbXj5dKiR8IyhbXFx3XFwtXSopJCkvLFxuXG5cdC8vIE1hdGNoIGEgc3RhbmRhbG9uZSB0YWdcblx0cnNpbmdsZVRhZyA9IC9ePChcXHcrKVxccypcXC8/Pig/OjxcXC9cXDE+fCkkLyxcblxuXHQvLyBKU09OIFJlZ0V4cFxuXHRydmFsaWRjaGFycyA9IC9eW1xcXSw6e31cXHNdKiQvLFxuXHRydmFsaWRicmFjZXMgPSAvKD86Xnw6fCwpKD86XFxzKlxcWykrL2csXG5cdHJ2YWxpZGVzY2FwZSA9IC9cXFxcKD86W1wiXFxcXFxcL2JmbnJ0XXx1W1xcZGEtZkEtRl17NH0pL2csXG5cdHJ2YWxpZHRva2VucyA9IC9cIlteXCJcXFxcXFxyXFxuXSpcInx0cnVlfGZhbHNlfG51bGx8LT8oPzpcXGRcXGQqXFwufClcXGQrKD86W2VFXVtcXC0rXT9cXGQrfCkvZyxcblxuXHQvLyBNYXRjaGVzIGRhc2hlZCBzdHJpbmcgZm9yIGNhbWVsaXppbmdcblx0cm1zUHJlZml4ID0gL14tbXMtLyxcblx0cmRhc2hBbHBoYSA9IC8tKFtcXGRhLXpdKS9naSxcblxuXHQvLyBVc2VkIGJ5IGpRdWVyeS5jYW1lbENhc2UgYXMgY2FsbGJhY2sgdG8gcmVwbGFjZSgpXG5cdGZjYW1lbENhc2UgPSBmdW5jdGlvbiggYWxsLCBsZXR0ZXIgKSB7XG5cdFx0cmV0dXJuICggbGV0dGVyICsgXCJcIiApLnRvVXBwZXJDYXNlKCk7XG5cdH0sXG5cblx0Ly8gVGhlIHJlYWR5IGV2ZW50IGhhbmRsZXIgYW5kIHNlbGYgY2xlYW51cCBtZXRob2Rcblx0RE9NQ29udGVudExvYWRlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmICggZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciApIHtcblx0XHRcdGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoIFwiRE9NQ29udGVudExvYWRlZFwiLCBET01Db250ZW50TG9hZGVkLCBmYWxzZSApO1xuXHRcdFx0alF1ZXJ5LnJlYWR5KCk7XG5cdFx0fSBlbHNlIGlmICggZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gXCJjb21wbGV0ZVwiICkge1xuXHRcdFx0Ly8gd2UncmUgaGVyZSBiZWNhdXNlIHJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIiBpbiBvbGRJRVxuXHRcdFx0Ly8gd2hpY2ggaXMgZ29vZCBlbm91Z2ggZm9yIHVzIHRvIGNhbGwgdGhlIGRvbSByZWFkeSFcblx0XHRcdGRvY3VtZW50LmRldGFjaEV2ZW50KCBcIm9ucmVhZHlzdGF0ZWNoYW5nZVwiLCBET01Db250ZW50TG9hZGVkICk7XG5cdFx0XHRqUXVlcnkucmVhZHkoKTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gW1tDbGFzc11dIC0+IHR5cGUgcGFpcnNcblx0Y2xhc3MydHlwZSA9IHt9O1xuXG5qUXVlcnkuZm4gPSBqUXVlcnkucHJvdG90eXBlID0ge1xuXHRjb25zdHJ1Y3RvcjogalF1ZXJ5LFxuXHRpbml0OiBmdW5jdGlvbiggc2VsZWN0b3IsIGNvbnRleHQsIHJvb3RqUXVlcnkgKSB7XG5cdFx0dmFyIG1hdGNoLCBlbGVtLCByZXQsIGRvYztcblxuXHRcdC8vIEhhbmRsZSAkKFwiXCIpLCAkKG51bGwpLCAkKHVuZGVmaW5lZCksICQoZmFsc2UpXG5cdFx0aWYgKCAhc2VsZWN0b3IgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cblx0XHQvLyBIYW5kbGUgJChET01FbGVtZW50KVxuXHRcdGlmICggc2VsZWN0b3Iubm9kZVR5cGUgKSB7XG5cdFx0XHR0aGlzLmNvbnRleHQgPSB0aGlzWzBdID0gc2VsZWN0b3I7XG5cdFx0XHR0aGlzLmxlbmd0aCA9IDE7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cblx0XHQvLyBIYW5kbGUgSFRNTCBzdHJpbmdzXG5cdFx0aWYgKCB0eXBlb2Ygc2VsZWN0b3IgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRpZiAoIHNlbGVjdG9yLmNoYXJBdCgwKSA9PT0gXCI8XCIgJiYgc2VsZWN0b3IuY2hhckF0KCBzZWxlY3Rvci5sZW5ndGggLSAxICkgPT09IFwiPlwiICYmIHNlbGVjdG9yLmxlbmd0aCA+PSAzICkge1xuXHRcdFx0XHQvLyBBc3N1bWUgdGhhdCBzdHJpbmdzIHRoYXQgc3RhcnQgYW5kIGVuZCB3aXRoIDw+IGFyZSBIVE1MIGFuZCBza2lwIHRoZSByZWdleCBjaGVja1xuXHRcdFx0XHRtYXRjaCA9IFsgbnVsbCwgc2VsZWN0b3IsIG51bGwgXTtcblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bWF0Y2ggPSBycXVpY2tFeHByLmV4ZWMoIHNlbGVjdG9yICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIE1hdGNoIGh0bWwgb3IgbWFrZSBzdXJlIG5vIGNvbnRleHQgaXMgc3BlY2lmaWVkIGZvciAjaWRcblx0XHRcdGlmICggbWF0Y2ggJiYgKG1hdGNoWzFdIHx8ICFjb250ZXh0KSApIHtcblxuXHRcdFx0XHQvLyBIQU5ETEU6ICQoaHRtbCkgLT4gJChhcnJheSlcblx0XHRcdFx0aWYgKCBtYXRjaFsxXSApIHtcblx0XHRcdFx0XHRjb250ZXh0ID0gY29udGV4dCBpbnN0YW5jZW9mIGpRdWVyeSA/IGNvbnRleHRbMF0gOiBjb250ZXh0O1xuXHRcdFx0XHRcdGRvYyA9ICggY29udGV4dCAmJiBjb250ZXh0Lm5vZGVUeXBlID8gY29udGV4dC5vd25lckRvY3VtZW50IHx8IGNvbnRleHQgOiBkb2N1bWVudCApO1xuXG5cdFx0XHRcdFx0Ly8gc2NyaXB0cyBpcyB0cnVlIGZvciBiYWNrLWNvbXBhdFxuXHRcdFx0XHRcdHNlbGVjdG9yID0galF1ZXJ5LnBhcnNlSFRNTCggbWF0Y2hbMV0sIGRvYywgdHJ1ZSApO1xuXHRcdFx0XHRcdGlmICggcnNpbmdsZVRhZy50ZXN0KCBtYXRjaFsxXSApICYmIGpRdWVyeS5pc1BsYWluT2JqZWN0KCBjb250ZXh0ICkgKSB7XG5cdFx0XHRcdFx0XHR0aGlzLmF0dHIuY2FsbCggc2VsZWN0b3IsIGNvbnRleHQsIHRydWUgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRyZXR1cm4galF1ZXJ5Lm1lcmdlKCB0aGlzLCBzZWxlY3RvciApO1xuXG5cdFx0XHRcdC8vIEhBTkRMRTogJCgjaWQpXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZWxlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBtYXRjaFsyXSApO1xuXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgcGFyZW50Tm9kZSB0byBjYXRjaCB3aGVuIEJsYWNrYmVycnkgNC42IHJldHVybnNcblx0XHRcdFx0XHQvLyBub2RlcyB0aGF0IGFyZSBubyBsb25nZXIgaW4gdGhlIGRvY3VtZW50ICM2OTYzXG5cdFx0XHRcdFx0aWYgKCBlbGVtICYmIGVsZW0ucGFyZW50Tm9kZSApIHtcblx0XHRcdFx0XHRcdC8vIEhhbmRsZSB0aGUgY2FzZSB3aGVyZSBJRSBhbmQgT3BlcmEgcmV0dXJuIGl0ZW1zXG5cdFx0XHRcdFx0XHQvLyBieSBuYW1lIGluc3RlYWQgb2YgSURcblx0XHRcdFx0XHRcdGlmICggZWxlbS5pZCAhPT0gbWF0Y2hbMl0gKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiByb290alF1ZXJ5LmZpbmQoIHNlbGVjdG9yICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vIE90aGVyd2lzZSwgd2UgaW5qZWN0IHRoZSBlbGVtZW50IGRpcmVjdGx5IGludG8gdGhlIGpRdWVyeSBvYmplY3Rcblx0XHRcdFx0XHRcdHRoaXMubGVuZ3RoID0gMTtcblx0XHRcdFx0XHRcdHRoaXNbMF0gPSBlbGVtO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoaXMuY29udGV4dCA9IGRvY3VtZW50O1xuXHRcdFx0XHRcdHRoaXMuc2VsZWN0b3IgPSBzZWxlY3Rvcjtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fVxuXG5cdFx0XHQvLyBIQU5ETEU6ICQoZXhwciwgJCguLi4pKVxuXHRcdFx0fSBlbHNlIGlmICggIWNvbnRleHQgfHwgY29udGV4dC5qcXVlcnkgKSB7XG5cdFx0XHRcdHJldHVybiAoIGNvbnRleHQgfHwgcm9vdGpRdWVyeSApLmZpbmQoIHNlbGVjdG9yICk7XG5cblx0XHRcdC8vIEhBTkRMRTogJChleHByLCBjb250ZXh0KVxuXHRcdFx0Ly8gKHdoaWNoIGlzIGp1c3QgZXF1aXZhbGVudCB0bzogJChjb250ZXh0KS5maW5kKGV4cHIpXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5jb25zdHJ1Y3RvciggY29udGV4dCApLmZpbmQoIHNlbGVjdG9yICk7XG5cdFx0XHR9XG5cblx0XHQvLyBIQU5ETEU6ICQoZnVuY3Rpb24pXG5cdFx0Ly8gU2hvcnRjdXQgZm9yIGRvY3VtZW50IHJlYWR5XG5cdFx0fSBlbHNlIGlmICggalF1ZXJ5LmlzRnVuY3Rpb24oIHNlbGVjdG9yICkgKSB7XG5cdFx0XHRyZXR1cm4gcm9vdGpRdWVyeS5yZWFkeSggc2VsZWN0b3IgKTtcblx0XHR9XG5cblx0XHRpZiAoIHNlbGVjdG9yLnNlbGVjdG9yICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHR0aGlzLnNlbGVjdG9yID0gc2VsZWN0b3Iuc2VsZWN0b3I7XG5cdFx0XHR0aGlzLmNvbnRleHQgPSBzZWxlY3Rvci5jb250ZXh0O1xuXHRcdH1cblxuXHRcdHJldHVybiBqUXVlcnkubWFrZUFycmF5KCBzZWxlY3RvciwgdGhpcyApO1xuXHR9LFxuXG5cdC8vIFN0YXJ0IHdpdGggYW4gZW1wdHkgc2VsZWN0b3Jcblx0c2VsZWN0b3I6IFwiXCIsXG5cblx0Ly8gVGhlIGN1cnJlbnQgdmVyc2lvbiBvZiBqUXVlcnkgYmVpbmcgdXNlZFxuXHRqcXVlcnk6IFwiMS44LjFcIixcblxuXHQvLyBUaGUgZGVmYXVsdCBsZW5ndGggb2YgYSBqUXVlcnkgb2JqZWN0IGlzIDBcblx0bGVuZ3RoOiAwLFxuXG5cdC8vIFRoZSBudW1iZXIgb2YgZWxlbWVudHMgY29udGFpbmVkIGluIHRoZSBtYXRjaGVkIGVsZW1lbnQgc2V0XG5cdHNpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmxlbmd0aDtcblx0fSxcblxuXHR0b0FycmF5OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gY29yZV9zbGljZS5jYWxsKCB0aGlzICk7XG5cdH0sXG5cblx0Ly8gR2V0IHRoZSBOdGggZWxlbWVudCBpbiB0aGUgbWF0Y2hlZCBlbGVtZW50IHNldCBPUlxuXHQvLyBHZXQgdGhlIHdob2xlIG1hdGNoZWQgZWxlbWVudCBzZXQgYXMgYSBjbGVhbiBhcnJheVxuXHRnZXQ6IGZ1bmN0aW9uKCBudW0gKSB7XG5cdFx0cmV0dXJuIG51bSA9PSBudWxsID9cblxuXHRcdFx0Ly8gUmV0dXJuIGEgJ2NsZWFuJyBhcnJheVxuXHRcdFx0dGhpcy50b0FycmF5KCkgOlxuXG5cdFx0XHQvLyBSZXR1cm4ganVzdCB0aGUgb2JqZWN0XG5cdFx0XHQoIG51bSA8IDAgPyB0aGlzWyB0aGlzLmxlbmd0aCArIG51bSBdIDogdGhpc1sgbnVtIF0gKTtcblx0fSxcblxuXHQvLyBUYWtlIGFuIGFycmF5IG9mIGVsZW1lbnRzIGFuZCBwdXNoIGl0IG9udG8gdGhlIHN0YWNrXG5cdC8vIChyZXR1cm5pbmcgdGhlIG5ldyBtYXRjaGVkIGVsZW1lbnQgc2V0KVxuXHRwdXNoU3RhY2s6IGZ1bmN0aW9uKCBlbGVtcywgbmFtZSwgc2VsZWN0b3IgKSB7XG5cblx0XHQvLyBCdWlsZCBhIG5ldyBqUXVlcnkgbWF0Y2hlZCBlbGVtZW50IHNldFxuXHRcdHZhciByZXQgPSBqUXVlcnkubWVyZ2UoIHRoaXMuY29uc3RydWN0b3IoKSwgZWxlbXMgKTtcblxuXHRcdC8vIEFkZCB0aGUgb2xkIG9iamVjdCBvbnRvIHRoZSBzdGFjayAoYXMgYSByZWZlcmVuY2UpXG5cdFx0cmV0LnByZXZPYmplY3QgPSB0aGlzO1xuXG5cdFx0cmV0LmNvbnRleHQgPSB0aGlzLmNvbnRleHQ7XG5cblx0XHRpZiAoIG5hbWUgPT09IFwiZmluZFwiICkge1xuXHRcdFx0cmV0LnNlbGVjdG9yID0gdGhpcy5zZWxlY3RvciArICggdGhpcy5zZWxlY3RvciA/IFwiIFwiIDogXCJcIiApICsgc2VsZWN0b3I7XG5cdFx0fSBlbHNlIGlmICggbmFtZSApIHtcblx0XHRcdHJldC5zZWxlY3RvciA9IHRoaXMuc2VsZWN0b3IgKyBcIi5cIiArIG5hbWUgKyBcIihcIiArIHNlbGVjdG9yICsgXCIpXCI7XG5cdFx0fVxuXG5cdFx0Ly8gUmV0dXJuIHRoZSBuZXdseS1mb3JtZWQgZWxlbWVudCBzZXRcblx0XHRyZXR1cm4gcmV0O1xuXHR9LFxuXG5cdC8vIEV4ZWN1dGUgYSBjYWxsYmFjayBmb3IgZXZlcnkgZWxlbWVudCBpbiB0aGUgbWF0Y2hlZCBzZXQuXG5cdC8vIChZb3UgY2FuIHNlZWQgdGhlIGFyZ3VtZW50cyB3aXRoIGFuIGFycmF5IG9mIGFyZ3MsIGJ1dCB0aGlzIGlzXG5cdC8vIG9ubHkgdXNlZCBpbnRlcm5hbGx5Lilcblx0ZWFjaDogZnVuY3Rpb24oIGNhbGxiYWNrLCBhcmdzICkge1xuXHRcdHJldHVybiBqUXVlcnkuZWFjaCggdGhpcywgY2FsbGJhY2ssIGFyZ3MgKTtcblx0fSxcblxuXHRyZWFkeTogZnVuY3Rpb24oIGZuICkge1xuXHRcdC8vIEFkZCB0aGUgY2FsbGJhY2tcblx0XHRqUXVlcnkucmVhZHkucHJvbWlzZSgpLmRvbmUoIGZuICk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRlcTogZnVuY3Rpb24oIGkgKSB7XG5cdFx0aSA9ICtpO1xuXHRcdHJldHVybiBpID09PSAtMSA/XG5cdFx0XHR0aGlzLnNsaWNlKCBpICkgOlxuXHRcdFx0dGhpcy5zbGljZSggaSwgaSArIDEgKTtcblx0fSxcblxuXHRmaXJzdDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXEoIDAgKTtcblx0fSxcblxuXHRsYXN0OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5lcSggLTEgKTtcblx0fSxcblxuXHRzbGljZTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMucHVzaFN0YWNrKCBjb3JlX3NsaWNlLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKSxcblx0XHRcdFwic2xpY2VcIiwgY29yZV9zbGljZS5jYWxsKGFyZ3VtZW50cykuam9pbihcIixcIikgKTtcblx0fSxcblxuXHRtYXA6IGZ1bmN0aW9uKCBjYWxsYmFjayApIHtcblx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIGpRdWVyeS5tYXAodGhpcywgZnVuY3Rpb24oIGVsZW0sIGkgKSB7XG5cdFx0XHRyZXR1cm4gY2FsbGJhY2suY2FsbCggZWxlbSwgaSwgZWxlbSApO1xuXHRcdH0pKTtcblx0fSxcblxuXHRlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLnByZXZPYmplY3QgfHwgdGhpcy5jb25zdHJ1Y3RvcihudWxsKTtcblx0fSxcblxuXHQvLyBGb3IgaW50ZXJuYWwgdXNlIG9ubHkuXG5cdC8vIEJlaGF2ZXMgbGlrZSBhbiBBcnJheSdzIG1ldGhvZCwgbm90IGxpa2UgYSBqUXVlcnkgbWV0aG9kLlxuXHRwdXNoOiBjb3JlX3B1c2gsXG5cdHNvcnQ6IFtdLnNvcnQsXG5cdHNwbGljZTogW10uc3BsaWNlXG59O1xuXG4vLyBHaXZlIHRoZSBpbml0IGZ1bmN0aW9uIHRoZSBqUXVlcnkgcHJvdG90eXBlIGZvciBsYXRlciBpbnN0YW50aWF0aW9uXG5qUXVlcnkuZm4uaW5pdC5wcm90b3R5cGUgPSBqUXVlcnkuZm47XG5cbmpRdWVyeS5leHRlbmQgPSBqUXVlcnkuZm4uZXh0ZW5kID0gZnVuY3Rpb24oKSB7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0gfHwge30sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAoIHR5cGVvZiB0YXJnZXQgPT09IFwiYm9vbGVhblwiICkge1xuXHRcdGRlZXAgPSB0YXJnZXQ7XG5cdFx0dGFyZ2V0ID0gYXJndW1lbnRzWzFdIHx8IHt9O1xuXHRcdC8vIHNraXAgdGhlIGJvb2xlYW4gYW5kIHRoZSB0YXJnZXRcblx0XHRpID0gMjtcblx0fVxuXG5cdC8vIEhhbmRsZSBjYXNlIHdoZW4gdGFyZ2V0IGlzIGEgc3RyaW5nIG9yIHNvbWV0aGluZyAocG9zc2libGUgaW4gZGVlcCBjb3B5KVxuXHRpZiAoIHR5cGVvZiB0YXJnZXQgIT09IFwib2JqZWN0XCIgJiYgIWpRdWVyeS5pc0Z1bmN0aW9uKHRhcmdldCkgKSB7XG5cdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHQvLyBleHRlbmQgalF1ZXJ5IGl0c2VsZiBpZiBvbmx5IG9uZSBhcmd1bWVudCBpcyBwYXNzZWRcblx0aWYgKCBsZW5ndGggPT09IGkgKSB7XG5cdFx0dGFyZ2V0ID0gdGhpcztcblx0XHQtLWk7XG5cdH1cblxuXHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHQvLyBPbmx5IGRlYWwgd2l0aCBub24tbnVsbC91bmRlZmluZWQgdmFsdWVzXG5cdFx0aWYgKCAob3B0aW9ucyA9IGFyZ3VtZW50c1sgaSBdKSAhPSBudWxsICkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yICggbmFtZSBpbiBvcHRpb25zICkge1xuXHRcdFx0XHRzcmMgPSB0YXJnZXRbIG5hbWUgXTtcblx0XHRcdFx0Y29weSA9IG9wdGlvbnNbIG5hbWUgXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICggdGFyZ2V0ID09PSBjb3B5ICkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUmVjdXJzZSBpZiB3ZSdyZSBtZXJnaW5nIHBsYWluIG9iamVjdHMgb3IgYXJyYXlzXG5cdFx0XHRcdGlmICggZGVlcCAmJiBjb3B5ICYmICggalF1ZXJ5LmlzUGxhaW5PYmplY3QoY29weSkgfHwgKGNvcHlJc0FycmF5ID0galF1ZXJ5LmlzQXJyYXkoY29weSkpICkgKSB7XG5cdFx0XHRcdFx0aWYgKCBjb3B5SXNBcnJheSApIHtcblx0XHRcdFx0XHRcdGNvcHlJc0FycmF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBqUXVlcnkuaXNBcnJheShzcmMpID8gc3JjIDogW107XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2xvbmUgPSBzcmMgJiYgalF1ZXJ5LmlzUGxhaW5PYmplY3Qoc3JjKSA/IHNyYyA6IHt9O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5ldmVyIG1vdmUgb3JpZ2luYWwgb2JqZWN0cywgY2xvbmUgdGhlbVxuXHRcdFx0XHRcdHRhcmdldFsgbmFtZSBdID0galF1ZXJ5LmV4dGVuZCggZGVlcCwgY2xvbmUsIGNvcHkgKTtcblxuXHRcdFx0XHQvLyBEb24ndCBicmluZyBpbiB1bmRlZmluZWQgdmFsdWVzXG5cdFx0XHRcdH0gZWxzZSBpZiAoIGNvcHkgIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHR0YXJnZXRbIG5hbWUgXSA9IGNvcHk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBSZXR1cm4gdGhlIG1vZGlmaWVkIG9iamVjdFxuXHRyZXR1cm4gdGFyZ2V0O1xufTtcblxualF1ZXJ5LmV4dGVuZCh7XG5cdG5vQ29uZmxpY3Q6IGZ1bmN0aW9uKCBkZWVwICkge1xuXHRcdGlmICggd2luZG93LiQgPT09IGpRdWVyeSApIHtcblx0XHRcdHdpbmRvdy4kID0gXyQ7XG5cdFx0fVxuXG5cdFx0aWYgKCBkZWVwICYmIHdpbmRvdy5qUXVlcnkgPT09IGpRdWVyeSApIHtcblx0XHRcdHdpbmRvdy5qUXVlcnkgPSBfalF1ZXJ5O1xuXHRcdH1cblxuXHRcdHJldHVybiBqUXVlcnk7XG5cdH0sXG5cblx0Ly8gSXMgdGhlIERPTSByZWFkeSB0byBiZSB1c2VkPyBTZXQgdG8gdHJ1ZSBvbmNlIGl0IG9jY3Vycy5cblx0aXNSZWFkeTogZmFsc2UsXG5cblx0Ly8gQSBjb3VudGVyIHRvIHRyYWNrIGhvdyBtYW55IGl0ZW1zIHRvIHdhaXQgZm9yIGJlZm9yZVxuXHQvLyB0aGUgcmVhZHkgZXZlbnQgZmlyZXMuIFNlZSAjNjc4MVxuXHRyZWFkeVdhaXQ6IDEsXG5cblx0Ly8gSG9sZCAob3IgcmVsZWFzZSkgdGhlIHJlYWR5IGV2ZW50XG5cdGhvbGRSZWFkeTogZnVuY3Rpb24oIGhvbGQgKSB7XG5cdFx0aWYgKCBob2xkICkge1xuXHRcdFx0alF1ZXJ5LnJlYWR5V2FpdCsrO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRqUXVlcnkucmVhZHkoIHRydWUgKTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gSGFuZGxlIHdoZW4gdGhlIERPTSBpcyByZWFkeVxuXHRyZWFkeTogZnVuY3Rpb24oIHdhaXQgKSB7XG5cblx0XHQvLyBBYm9ydCBpZiB0aGVyZSBhcmUgcGVuZGluZyBob2xkcyBvciB3ZSdyZSBhbHJlYWR5IHJlYWR5XG5cdFx0aWYgKCB3YWl0ID09PSB0cnVlID8gLS1qUXVlcnkucmVhZHlXYWl0IDogalF1ZXJ5LmlzUmVhZHkgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gTWFrZSBzdXJlIGJvZHkgZXhpc3RzLCBhdCBsZWFzdCwgaW4gY2FzZSBJRSBnZXRzIGEgbGl0dGxlIG92ZXJ6ZWFsb3VzICh0aWNrZXQgIzU0NDMpLlxuXHRcdGlmICggIWRvY3VtZW50LmJvZHkgKSB7XG5cdFx0XHRyZXR1cm4gc2V0VGltZW91dCggalF1ZXJ5LnJlYWR5LCAxICk7XG5cdFx0fVxuXG5cdFx0Ly8gUmVtZW1iZXIgdGhhdCB0aGUgRE9NIGlzIHJlYWR5XG5cdFx0alF1ZXJ5LmlzUmVhZHkgPSB0cnVlO1xuXG5cdFx0Ly8gSWYgYSBub3JtYWwgRE9NIFJlYWR5IGV2ZW50IGZpcmVkLCBkZWNyZW1lbnQsIGFuZCB3YWl0IGlmIG5lZWQgYmVcblx0XHRpZiAoIHdhaXQgIT09IHRydWUgJiYgLS1qUXVlcnkucmVhZHlXYWl0ID4gMCApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBJZiB0aGVyZSBhcmUgZnVuY3Rpb25zIGJvdW5kLCB0byBleGVjdXRlXG5cdFx0cmVhZHlMaXN0LnJlc29sdmVXaXRoKCBkb2N1bWVudCwgWyBqUXVlcnkgXSApO1xuXG5cdFx0Ly8gVHJpZ2dlciBhbnkgYm91bmQgcmVhZHkgZXZlbnRzXG5cdFx0aWYgKCBqUXVlcnkuZm4udHJpZ2dlciApIHtcblx0XHRcdGpRdWVyeSggZG9jdW1lbnQgKS50cmlnZ2VyKFwicmVhZHlcIikub2ZmKFwicmVhZHlcIik7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIFNlZSB0ZXN0L3VuaXQvY29yZS5qcyBmb3IgZGV0YWlscyBjb25jZXJuaW5nIGlzRnVuY3Rpb24uXG5cdC8vIFNpbmNlIHZlcnNpb24gMS4zLCBET00gbWV0aG9kcyBhbmQgZnVuY3Rpb25zIGxpa2UgYWxlcnRcblx0Ly8gYXJlbid0IHN1cHBvcnRlZC4gVGhleSByZXR1cm4gZmFsc2Ugb24gSUUgKCMyOTY4KS5cblx0aXNGdW5jdGlvbjogZnVuY3Rpb24oIG9iaiApIHtcblx0XHRyZXR1cm4galF1ZXJ5LnR5cGUob2JqKSA9PT0gXCJmdW5jdGlvblwiO1xuXHR9LFxuXG5cdGlzQXJyYXk6IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24oIG9iaiApIHtcblx0XHRyZXR1cm4galF1ZXJ5LnR5cGUob2JqKSA9PT0gXCJhcnJheVwiO1xuXHR9LFxuXG5cdGlzV2luZG93OiBmdW5jdGlvbiggb2JqICkge1xuXHRcdHJldHVybiBvYmogIT0gbnVsbCAmJiBvYmogPT0gb2JqLndpbmRvdztcblx0fSxcblxuXHRpc051bWVyaWM6IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0cmV0dXJuICFpc05hTiggcGFyc2VGbG9hdChvYmopICkgJiYgaXNGaW5pdGUoIG9iaiApO1xuXHR9LFxuXG5cdHR5cGU6IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0cmV0dXJuIG9iaiA9PSBudWxsID9cblx0XHRcdFN0cmluZyggb2JqICkgOlxuXHRcdFx0Y2xhc3MydHlwZVsgY29yZV90b1N0cmluZy5jYWxsKG9iaikgXSB8fCBcIm9iamVjdFwiO1xuXHR9LFxuXG5cdGlzUGxhaW5PYmplY3Q6IGZ1bmN0aW9uKCBvYmogKSB7XG5cdFx0Ly8gTXVzdCBiZSBhbiBPYmplY3QuXG5cdFx0Ly8gQmVjYXVzZSBvZiBJRSwgd2UgYWxzbyBoYXZlIHRvIGNoZWNrIHRoZSBwcmVzZW5jZSBvZiB0aGUgY29uc3RydWN0b3IgcHJvcGVydHkuXG5cdFx0Ly8gTWFrZSBzdXJlIHRoYXQgRE9NIG5vZGVzIGFuZCB3aW5kb3cgb2JqZWN0cyBkb24ndCBwYXNzIHRocm91Z2gsIGFzIHdlbGxcblx0XHRpZiAoICFvYmogfHwgalF1ZXJ5LnR5cGUob2JqKSAhPT0gXCJvYmplY3RcIiB8fCBvYmoubm9kZVR5cGUgfHwgalF1ZXJ5LmlzV2luZG93KCBvYmogKSApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0Ly8gTm90IG93biBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBtdXN0IGJlIE9iamVjdFxuXHRcdFx0aWYgKCBvYmouY29uc3RydWN0b3IgJiZcblx0XHRcdFx0IWNvcmVfaGFzT3duLmNhbGwob2JqLCBcImNvbnN0cnVjdG9yXCIpICYmXG5cdFx0XHRcdCFjb3JlX2hhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsIFwiaXNQcm90b3R5cGVPZlwiKSApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKCBlICkge1xuXHRcdFx0Ly8gSUU4LDkgV2lsbCB0aHJvdyBleGNlcHRpb25zIG9uIGNlcnRhaW4gaG9zdCBvYmplY3RzICM5ODk3XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gT3duIHByb3BlcnRpZXMgYXJlIGVudW1lcmF0ZWQgZmlyc3RseSwgc28gdG8gc3BlZWQgdXAsXG5cdFx0Ly8gaWYgbGFzdCBvbmUgaXMgb3duLCB0aGVuIGFsbCBwcm9wZXJ0aWVzIGFyZSBvd24uXG5cblx0XHR2YXIga2V5O1xuXHRcdGZvciAoIGtleSBpbiBvYmogKSB7fVxuXG5cdFx0cmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkIHx8IGNvcmVfaGFzT3duLmNhbGwoIG9iaiwga2V5ICk7XG5cdH0sXG5cblx0aXNFbXB0eU9iamVjdDogZnVuY3Rpb24oIG9iaiApIHtcblx0XHR2YXIgbmFtZTtcblx0XHRmb3IgKCBuYW1lIGluIG9iaiApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRydWU7XG5cdH0sXG5cblx0ZXJyb3I6IGZ1bmN0aW9uKCBtc2cgKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCBtc2cgKTtcblx0fSxcblxuXHQvLyBkYXRhOiBzdHJpbmcgb2YgaHRtbFxuXHQvLyBjb250ZXh0IChvcHRpb25hbCk6IElmIHNwZWNpZmllZCwgdGhlIGZyYWdtZW50IHdpbGwgYmUgY3JlYXRlZCBpbiB0aGlzIGNvbnRleHQsIGRlZmF1bHRzIHRvIGRvY3VtZW50XG5cdC8vIHNjcmlwdHMgKG9wdGlvbmFsKTogSWYgdHJ1ZSwgd2lsbCBpbmNsdWRlIHNjcmlwdHMgcGFzc2VkIGluIHRoZSBodG1sIHN0cmluZ1xuXHRwYXJzZUhUTUw6IGZ1bmN0aW9uKCBkYXRhLCBjb250ZXh0LCBzY3JpcHRzICkge1xuXHRcdHZhciBwYXJzZWQ7XG5cdFx0aWYgKCAhZGF0YSB8fCB0eXBlb2YgZGF0YSAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH1cblx0XHRpZiAoIHR5cGVvZiBjb250ZXh0ID09PSBcImJvb2xlYW5cIiApIHtcblx0XHRcdHNjcmlwdHMgPSBjb250ZXh0O1xuXHRcdFx0Y29udGV4dCA9IDA7XG5cdFx0fVxuXHRcdGNvbnRleHQgPSBjb250ZXh0IHx8IGRvY3VtZW50O1xuXG5cdFx0Ly8gU2luZ2xlIHRhZ1xuXHRcdGlmICggKHBhcnNlZCA9IHJzaW5nbGVUYWcuZXhlYyggZGF0YSApKSApIHtcblx0XHRcdHJldHVybiBbIGNvbnRleHQuY3JlYXRlRWxlbWVudCggcGFyc2VkWzFdICkgXTtcblx0XHR9XG5cblx0XHRwYXJzZWQgPSBqUXVlcnkuYnVpbGRGcmFnbWVudCggWyBkYXRhIF0sIGNvbnRleHQsIHNjcmlwdHMgPyBudWxsIDogW10gKTtcblx0XHRyZXR1cm4galF1ZXJ5Lm1lcmdlKCBbXSxcblx0XHRcdChwYXJzZWQuY2FjaGVhYmxlID8galF1ZXJ5LmNsb25lKCBwYXJzZWQuZnJhZ21lbnQgKSA6IHBhcnNlZC5mcmFnbWVudCkuY2hpbGROb2RlcyApO1xuXHR9LFxuXG5cdHBhcnNlSlNPTjogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0aWYgKCAhZGF0YSB8fCB0eXBlb2YgZGF0YSAhPT0gXCJzdHJpbmdcIikge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXG5cdFx0Ly8gTWFrZSBzdXJlIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZSBpcyByZW1vdmVkIChJRSBjYW4ndCBoYW5kbGUgaXQpXG5cdFx0ZGF0YSA9IGpRdWVyeS50cmltKCBkYXRhICk7XG5cblx0XHQvLyBBdHRlbXB0IHRvIHBhcnNlIHVzaW5nIHRoZSBuYXRpdmUgSlNPTiBwYXJzZXIgZmlyc3Rcblx0XHRpZiAoIHdpbmRvdy5KU09OICYmIHdpbmRvdy5KU09OLnBhcnNlICkge1xuXHRcdFx0cmV0dXJuIHdpbmRvdy5KU09OLnBhcnNlKCBkYXRhICk7XG5cdFx0fVxuXG5cdFx0Ly8gTWFrZSBzdXJlIHRoZSBpbmNvbWluZyBkYXRhIGlzIGFjdHVhbCBKU09OXG5cdFx0Ly8gTG9naWMgYm9ycm93ZWQgZnJvbSBodHRwOi8vanNvbi5vcmcvanNvbjIuanNcblx0XHRpZiAoIHJ2YWxpZGNoYXJzLnRlc3QoIGRhdGEucmVwbGFjZSggcnZhbGlkZXNjYXBlLCBcIkBcIiApXG5cdFx0XHQucmVwbGFjZSggcnZhbGlkdG9rZW5zLCBcIl1cIiApXG5cdFx0XHQucmVwbGFjZSggcnZhbGlkYnJhY2VzLCBcIlwiKSkgKSB7XG5cblx0XHRcdHJldHVybiAoIG5ldyBGdW5jdGlvbiggXCJyZXR1cm4gXCIgKyBkYXRhICkgKSgpO1xuXG5cdFx0fVxuXHRcdGpRdWVyeS5lcnJvciggXCJJbnZhbGlkIEpTT046IFwiICsgZGF0YSApO1xuXHR9LFxuXG5cdC8vIENyb3NzLWJyb3dzZXIgeG1sIHBhcnNpbmdcblx0cGFyc2VYTUw6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdHZhciB4bWwsIHRtcDtcblx0XHRpZiAoICFkYXRhIHx8IHR5cGVvZiBkYXRhICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRpZiAoIHdpbmRvdy5ET01QYXJzZXIgKSB7IC8vIFN0YW5kYXJkXG5cdFx0XHRcdHRtcCA9IG5ldyBET01QYXJzZXIoKTtcblx0XHRcdFx0eG1sID0gdG1wLnBhcnNlRnJvbVN0cmluZyggZGF0YSAsIFwidGV4dC94bWxcIiApO1xuXHRcdFx0fSBlbHNlIHsgLy8gSUVcblx0XHRcdFx0eG1sID0gbmV3IEFjdGl2ZVhPYmplY3QoIFwiTWljcm9zb2Z0LlhNTERPTVwiICk7XG5cdFx0XHRcdHhtbC5hc3luYyA9IFwiZmFsc2VcIjtcblx0XHRcdFx0eG1sLmxvYWRYTUwoIGRhdGEgKTtcblx0XHRcdH1cblx0XHR9IGNhdGNoKCBlICkge1xuXHRcdFx0eG1sID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHRpZiAoICF4bWwgfHwgIXhtbC5kb2N1bWVudEVsZW1lbnQgfHwgeG1sLmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcInBhcnNlcmVycm9yXCIgKS5sZW5ndGggKSB7XG5cdFx0XHRqUXVlcnkuZXJyb3IoIFwiSW52YWxpZCBYTUw6IFwiICsgZGF0YSApO1xuXHRcdH1cblx0XHRyZXR1cm4geG1sO1xuXHR9LFxuXG5cdG5vb3A6IGZ1bmN0aW9uKCkge30sXG5cblx0Ly8gRXZhbHVhdGVzIGEgc2NyaXB0IGluIGEgZ2xvYmFsIGNvbnRleHRcblx0Ly8gV29ya2Fyb3VuZHMgYmFzZWQgb24gZmluZGluZ3MgYnkgSmltIERyaXNjb2xsXG5cdC8vIGh0dHA6Ly93ZWJsb2dzLmphdmEubmV0L2Jsb2cvZHJpc2NvbGwvYXJjaGl2ZS8yMDA5LzA5LzA4L2V2YWwtamF2YXNjcmlwdC1nbG9iYWwtY29udGV4dFxuXHRnbG9iYWxFdmFsOiBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRpZiAoIGRhdGEgJiYgY29yZV9ybm90d2hpdGUudGVzdCggZGF0YSApICkge1xuXHRcdFx0Ly8gV2UgdXNlIGV4ZWNTY3JpcHQgb24gSW50ZXJuZXQgRXhwbG9yZXJcblx0XHRcdC8vIFdlIHVzZSBhbiBhbm9ueW1vdXMgZnVuY3Rpb24gc28gdGhhdCBjb250ZXh0IGlzIHdpbmRvd1xuXHRcdFx0Ly8gcmF0aGVyIHRoYW4galF1ZXJ5IGluIEZpcmVmb3hcblx0XHRcdCggd2luZG93LmV4ZWNTY3JpcHQgfHwgZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdHdpbmRvd1sgXCJldmFsXCIgXS5jYWxsKCB3aW5kb3csIGRhdGEgKTtcblx0XHRcdH0gKSggZGF0YSApO1xuXHRcdH1cblx0fSxcblxuXHQvLyBDb252ZXJ0IGRhc2hlZCB0byBjYW1lbENhc2U7IHVzZWQgYnkgdGhlIGNzcyBhbmQgZGF0YSBtb2R1bGVzXG5cdC8vIE1pY3Jvc29mdCBmb3Jnb3QgdG8gaHVtcCB0aGVpciB2ZW5kb3IgcHJlZml4ICgjOTU3Milcblx0Y2FtZWxDYXNlOiBmdW5jdGlvbiggc3RyaW5nICkge1xuXHRcdHJldHVybiBzdHJpbmcucmVwbGFjZSggcm1zUHJlZml4LCBcIm1zLVwiICkucmVwbGFjZSggcmRhc2hBbHBoYSwgZmNhbWVsQ2FzZSApO1xuXHR9LFxuXG5cdG5vZGVOYW1lOiBmdW5jdGlvbiggZWxlbSwgbmFtZSApIHtcblx0XHRyZXR1cm4gZWxlbS5ub2RlTmFtZSAmJiBlbGVtLm5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgPT09IG5hbWUudG9VcHBlckNhc2UoKTtcblx0fSxcblxuXHQvLyBhcmdzIGlzIGZvciBpbnRlcm5hbCB1c2FnZSBvbmx5XG5cdGVhY2g6IGZ1bmN0aW9uKCBvYmosIGNhbGxiYWNrLCBhcmdzICkge1xuXHRcdHZhciBuYW1lLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRsZW5ndGggPSBvYmoubGVuZ3RoLFxuXHRcdFx0aXNPYmogPSBsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBqUXVlcnkuaXNGdW5jdGlvbiggb2JqICk7XG5cblx0XHRpZiAoIGFyZ3MgKSB7XG5cdFx0XHRpZiAoIGlzT2JqICkge1xuXHRcdFx0XHRmb3IgKCBuYW1lIGluIG9iaiApIHtcblx0XHRcdFx0XHRpZiAoIGNhbGxiYWNrLmFwcGx5KCBvYmpbIG5hbWUgXSwgYXJncyApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyApIHtcblx0XHRcdFx0XHRpZiAoIGNhbGxiYWNrLmFwcGx5KCBvYmpbIGkrKyBdLCBhcmdzICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHQvLyBBIHNwZWNpYWwsIGZhc3QsIGNhc2UgZm9yIHRoZSBtb3N0IGNvbW1vbiB1c2Ugb2YgZWFjaFxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoIGlzT2JqICkge1xuXHRcdFx0XHRmb3IgKCBuYW1lIGluIG9iaiApIHtcblx0XHRcdFx0XHRpZiAoIGNhbGxiYWNrLmNhbGwoIG9ialsgbmFtZSBdLCBuYW1lLCBvYmpbIG5hbWUgXSApID09PSBmYWxzZSApIHtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9yICggOyBpIDwgbGVuZ3RoOyApIHtcblx0XHRcdFx0XHRpZiAoIGNhbGxiYWNrLmNhbGwoIG9ialsgaSBdLCBpLCBvYmpbIGkrKyBdICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG9iajtcblx0fSxcblxuXHQvLyBVc2UgbmF0aXZlIFN0cmluZy50cmltIGZ1bmN0aW9uIHdoZXJldmVyIHBvc3NpYmxlXG5cdHRyaW06IGNvcmVfdHJpbSAmJiAhY29yZV90cmltLmNhbGwoXCJcXHVGRUZGXFx4QTBcIikgP1xuXHRcdGZ1bmN0aW9uKCB0ZXh0ICkge1xuXHRcdFx0cmV0dXJuIHRleHQgPT0gbnVsbCA/XG5cdFx0XHRcdFwiXCIgOlxuXHRcdFx0XHRjb3JlX3RyaW0uY2FsbCggdGV4dCApO1xuXHRcdH0gOlxuXG5cdFx0Ly8gT3RoZXJ3aXNlIHVzZSBvdXIgb3duIHRyaW1taW5nIGZ1bmN0aW9uYWxpdHlcblx0XHRmdW5jdGlvbiggdGV4dCApIHtcblx0XHRcdHJldHVybiB0ZXh0ID09IG51bGwgP1xuXHRcdFx0XHRcIlwiIDpcblx0XHRcdFx0dGV4dC50b1N0cmluZygpLnJlcGxhY2UoIHJ0cmltLCBcIlwiICk7XG5cdFx0fSxcblxuXHQvLyByZXN1bHRzIGlzIGZvciBpbnRlcm5hbCB1c2FnZSBvbmx5XG5cdG1ha2VBcnJheTogZnVuY3Rpb24oIGFyciwgcmVzdWx0cyApIHtcblx0XHR2YXIgdHlwZSxcblx0XHRcdHJldCA9IHJlc3VsdHMgfHwgW107XG5cblx0XHRpZiAoIGFyciAhPSBudWxsICkge1xuXHRcdFx0Ly8gVGhlIHdpbmRvdywgc3RyaW5ncyAoYW5kIGZ1bmN0aW9ucykgYWxzbyBoYXZlICdsZW5ndGgnXG5cdFx0XHQvLyBUd2Vha2VkIGxvZ2ljIHNsaWdodGx5IHRvIGhhbmRsZSBCbGFja2JlcnJ5IDQuNyBSZWdFeHAgaXNzdWVzICM2OTMwXG5cdFx0XHR0eXBlID0galF1ZXJ5LnR5cGUoIGFyciApO1xuXG5cdFx0XHRpZiAoIGFyci5sZW5ndGggPT0gbnVsbCB8fCB0eXBlID09PSBcInN0cmluZ1wiIHx8IHR5cGUgPT09IFwiZnVuY3Rpb25cIiB8fCB0eXBlID09PSBcInJlZ2V4cFwiIHx8IGpRdWVyeS5pc1dpbmRvdyggYXJyICkgKSB7XG5cdFx0XHRcdGNvcmVfcHVzaC5jYWxsKCByZXQsIGFyciApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0alF1ZXJ5Lm1lcmdlKCByZXQsIGFyciApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByZXQ7XG5cdH0sXG5cblx0aW5BcnJheTogZnVuY3Rpb24oIGVsZW0sIGFyciwgaSApIHtcblx0XHR2YXIgbGVuO1xuXG5cdFx0aWYgKCBhcnIgKSB7XG5cdFx0XHRpZiAoIGNvcmVfaW5kZXhPZiApIHtcblx0XHRcdFx0cmV0dXJuIGNvcmVfaW5kZXhPZi5jYWxsKCBhcnIsIGVsZW0sIGkgKTtcblx0XHRcdH1cblxuXHRcdFx0bGVuID0gYXJyLmxlbmd0aDtcblx0XHRcdGkgPSBpID8gaSA8IDAgPyBNYXRoLm1heCggMCwgbGVuICsgaSApIDogaSA6IDA7XG5cblx0XHRcdGZvciAoIDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdFx0XHQvLyBTa2lwIGFjY2Vzc2luZyBpbiBzcGFyc2UgYXJyYXlzXG5cdFx0XHRcdGlmICggaSBpbiBhcnIgJiYgYXJyWyBpIF0gPT09IGVsZW0gKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gLTE7XG5cdH0sXG5cblx0bWVyZ2U6IGZ1bmN0aW9uKCBmaXJzdCwgc2Vjb25kICkge1xuXHRcdHZhciBsID0gc2Vjb25kLmxlbmd0aCxcblx0XHRcdGkgPSBmaXJzdC5sZW5ndGgsXG5cdFx0XHRqID0gMDtcblxuXHRcdGlmICggdHlwZW9mIGwgPT09IFwibnVtYmVyXCIgKSB7XG5cdFx0XHRmb3IgKCA7IGogPCBsOyBqKysgKSB7XG5cdFx0XHRcdGZpcnN0WyBpKysgXSA9IHNlY29uZFsgaiBdO1xuXHRcdFx0fVxuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHdoaWxlICggc2Vjb25kW2pdICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdGZpcnN0WyBpKysgXSA9IHNlY29uZFsgaisrIF07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Zmlyc3QubGVuZ3RoID0gaTtcblxuXHRcdHJldHVybiBmaXJzdDtcblx0fSxcblxuXHRncmVwOiBmdW5jdGlvbiggZWxlbXMsIGNhbGxiYWNrLCBpbnYgKSB7XG5cdFx0dmFyIHJldFZhbCxcblx0XHRcdHJldCA9IFtdLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRsZW5ndGggPSBlbGVtcy5sZW5ndGg7XG5cdFx0aW52ID0gISFpbnY7XG5cblx0XHQvLyBHbyB0aHJvdWdoIHRoZSBhcnJheSwgb25seSBzYXZpbmcgdGhlIGl0ZW1zXG5cdFx0Ly8gdGhhdCBwYXNzIHRoZSB2YWxpZGF0b3IgZnVuY3Rpb25cblx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdHJldFZhbCA9ICEhY2FsbGJhY2soIGVsZW1zWyBpIF0sIGkgKTtcblx0XHRcdGlmICggaW52ICE9PSByZXRWYWwgKSB7XG5cdFx0XHRcdHJldC5wdXNoKCBlbGVtc1sgaSBdICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJldDtcblx0fSxcblxuXHQvLyBhcmcgaXMgZm9yIGludGVybmFsIHVzYWdlIG9ubHlcblx0bWFwOiBmdW5jdGlvbiggZWxlbXMsIGNhbGxiYWNrLCBhcmcgKSB7XG5cdFx0dmFyIHZhbHVlLCBrZXksXG5cdFx0XHRyZXQgPSBbXSxcblx0XHRcdGkgPSAwLFxuXHRcdFx0bGVuZ3RoID0gZWxlbXMubGVuZ3RoLFxuXHRcdFx0Ly8ganF1ZXJ5IG9iamVjdHMgYXJlIHRyZWF0ZWQgYXMgYXJyYXlzXG5cdFx0XHRpc0FycmF5ID0gZWxlbXMgaW5zdGFuY2VvZiBqUXVlcnkgfHwgbGVuZ3RoICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGxlbmd0aCA9PT0gXCJudW1iZXJcIiAmJiAoICggbGVuZ3RoID4gMCAmJiBlbGVtc1sgMCBdICYmIGVsZW1zWyBsZW5ndGggLTEgXSApIHx8IGxlbmd0aCA9PT0gMCB8fCBqUXVlcnkuaXNBcnJheSggZWxlbXMgKSApIDtcblxuXHRcdC8vIEdvIHRocm91Z2ggdGhlIGFycmF5LCB0cmFuc2xhdGluZyBlYWNoIG9mIHRoZSBpdGVtcyB0byB0aGVpclxuXHRcdGlmICggaXNBcnJheSApIHtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHR2YWx1ZSA9IGNhbGxiYWNrKCBlbGVtc1sgaSBdLCBpLCBhcmcgKTtcblxuXHRcdFx0XHRpZiAoIHZhbHVlICE9IG51bGwgKSB7XG5cdFx0XHRcdFx0cmV0WyByZXQubGVuZ3RoIF0gPSB2YWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0Ly8gR28gdGhyb3VnaCBldmVyeSBrZXkgb24gdGhlIG9iamVjdCxcblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yICgga2V5IGluIGVsZW1zICkge1xuXHRcdFx0XHR2YWx1ZSA9IGNhbGxiYWNrKCBlbGVtc1sga2V5IF0sIGtleSwgYXJnICk7XG5cblx0XHRcdFx0aWYgKCB2YWx1ZSAhPSBudWxsICkge1xuXHRcdFx0XHRcdHJldFsgcmV0Lmxlbmd0aCBdID0gdmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBGbGF0dGVuIGFueSBuZXN0ZWQgYXJyYXlzXG5cdFx0cmV0dXJuIHJldC5jb25jYXQuYXBwbHkoIFtdLCByZXQgKTtcblx0fSxcblxuXHQvLyBBIGdsb2JhbCBHVUlEIGNvdW50ZXIgZm9yIG9iamVjdHNcblx0Z3VpZDogMSxcblxuXHQvLyBCaW5kIGEgZnVuY3Rpb24gdG8gYSBjb250ZXh0LCBvcHRpb25hbGx5IHBhcnRpYWxseSBhcHBseWluZyBhbnlcblx0Ly8gYXJndW1lbnRzLlxuXHRwcm94eTogZnVuY3Rpb24oIGZuLCBjb250ZXh0ICkge1xuXHRcdHZhciB0bXAsIGFyZ3MsIHByb3h5O1xuXG5cdFx0aWYgKCB0eXBlb2YgY29udGV4dCA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHRtcCA9IGZuWyBjb250ZXh0IF07XG5cdFx0XHRjb250ZXh0ID0gZm47XG5cdFx0XHRmbiA9IHRtcDtcblx0XHR9XG5cblx0XHQvLyBRdWljayBjaGVjayB0byBkZXRlcm1pbmUgaWYgdGFyZ2V0IGlzIGNhbGxhYmxlLCBpbiB0aGUgc3BlY1xuXHRcdC8vIHRoaXMgdGhyb3dzIGEgVHlwZUVycm9yLCBidXQgd2Ugd2lsbCBqdXN0IHJldHVybiB1bmRlZmluZWQuXG5cdFx0aWYgKCAhalF1ZXJ5LmlzRnVuY3Rpb24oIGZuICkgKSB7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdC8vIFNpbXVsYXRlZCBiaW5kXG5cdFx0YXJncyA9IGNvcmVfc2xpY2UuY2FsbCggYXJndW1lbnRzLCAyICk7XG5cdFx0cHJveHkgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBmbi5hcHBseSggY29udGV4dCwgYXJncy5jb25jYXQoIGNvcmVfc2xpY2UuY2FsbCggYXJndW1lbnRzICkgKSApO1xuXHRcdH07XG5cblx0XHQvLyBTZXQgdGhlIGd1aWQgb2YgdW5pcXVlIGhhbmRsZXIgdG8gdGhlIHNhbWUgb2Ygb3JpZ2luYWwgaGFuZGxlciwgc28gaXQgY2FuIGJlIHJlbW92ZWRcblx0XHRwcm94eS5ndWlkID0gZm4uZ3VpZCA9IGZuLmd1aWQgfHwgcHJveHkuZ3VpZCB8fCBqUXVlcnkuZ3VpZCsrO1xuXG5cdFx0cmV0dXJuIHByb3h5O1xuXHR9LFxuXG5cdC8vIE11bHRpZnVuY3Rpb25hbCBtZXRob2QgdG8gZ2V0IGFuZCBzZXQgdmFsdWVzIG9mIGEgY29sbGVjdGlvblxuXHQvLyBUaGUgdmFsdWUvcyBjYW4gb3B0aW9uYWxseSBiZSBleGVjdXRlZCBpZiBpdCdzIGEgZnVuY3Rpb25cblx0YWNjZXNzOiBmdW5jdGlvbiggZWxlbXMsIGZuLCBrZXksIHZhbHVlLCBjaGFpbmFibGUsIGVtcHR5R2V0LCBwYXNzICkge1xuXHRcdHZhciBleGVjLFxuXHRcdFx0YnVsayA9IGtleSA9PSBudWxsLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRsZW5ndGggPSBlbGVtcy5sZW5ndGg7XG5cblx0XHQvLyBTZXRzIG1hbnkgdmFsdWVzXG5cdFx0aWYgKCBrZXkgJiYgdHlwZW9mIGtleSA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdGZvciAoIGkgaW4ga2V5ICkge1xuXHRcdFx0XHRqUXVlcnkuYWNjZXNzKCBlbGVtcywgZm4sIGksIGtleVtpXSwgMSwgZW1wdHlHZXQsIHZhbHVlICk7XG5cdFx0XHR9XG5cdFx0XHRjaGFpbmFibGUgPSAxO1xuXG5cdFx0Ly8gU2V0cyBvbmUgdmFsdWVcblx0XHR9IGVsc2UgaWYgKCB2YWx1ZSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0Ly8gT3B0aW9uYWxseSwgZnVuY3Rpb24gdmFsdWVzIGdldCBleGVjdXRlZCBpZiBleGVjIGlzIHRydWVcblx0XHRcdGV4ZWMgPSBwYXNzID09PSB1bmRlZmluZWQgJiYgalF1ZXJ5LmlzRnVuY3Rpb24oIHZhbHVlICk7XG5cblx0XHRcdGlmICggYnVsayApIHtcblx0XHRcdFx0Ly8gQnVsayBvcGVyYXRpb25zIG9ubHkgaXRlcmF0ZSB3aGVuIGV4ZWN1dGluZyBmdW5jdGlvbiB2YWx1ZXNcblx0XHRcdFx0aWYgKCBleGVjICkge1xuXHRcdFx0XHRcdGV4ZWMgPSBmbjtcblx0XHRcdFx0XHRmbiA9IGZ1bmN0aW9uKCBlbGVtLCBrZXksIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGV4ZWMuY2FsbCggalF1ZXJ5KCBlbGVtICksIHZhbHVlICk7XG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHQvLyBPdGhlcndpc2UgdGhleSBydW4gYWdhaW5zdCB0aGUgZW50aXJlIHNldFxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZuLmNhbGwoIGVsZW1zLCB2YWx1ZSApO1xuXHRcdFx0XHRcdGZuID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGZuICkge1xuXHRcdFx0XHRmb3IgKDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRcdGZuKCBlbGVtc1tpXSwga2V5LCBleGVjID8gdmFsdWUuY2FsbCggZWxlbXNbaV0sIGksIGZuKCBlbGVtc1tpXSwga2V5ICkgKSA6IHZhbHVlLCBwYXNzICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Y2hhaW5hYmxlID0gMTtcblx0XHR9XG5cblx0XHRyZXR1cm4gY2hhaW5hYmxlID9cblx0XHRcdGVsZW1zIDpcblxuXHRcdFx0Ly8gR2V0c1xuXHRcdFx0YnVsayA/XG5cdFx0XHRcdGZuLmNhbGwoIGVsZW1zICkgOlxuXHRcdFx0XHRsZW5ndGggPyBmbiggZWxlbXNbMF0sIGtleSApIDogZW1wdHlHZXQ7XG5cdH0sXG5cblx0bm93OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpO1xuXHR9XG59KTtcblxualF1ZXJ5LnJlYWR5LnByb21pc2UgPSBmdW5jdGlvbiggb2JqICkge1xuXHRpZiAoICFyZWFkeUxpc3QgKSB7XG5cblx0XHRyZWFkeUxpc3QgPSBqUXVlcnkuRGVmZXJyZWQoKTtcblxuXHRcdC8vIENhdGNoIGNhc2VzIHdoZXJlICQoZG9jdW1lbnQpLnJlYWR5KCkgaXMgY2FsbGVkIGFmdGVyIHRoZSBicm93c2VyIGV2ZW50IGhhcyBhbHJlYWR5IG9jY3VycmVkLlxuXHRcdC8vIHdlIG9uY2UgdHJpZWQgdG8gdXNlIHJlYWR5U3RhdGUgXCJpbnRlcmFjdGl2ZVwiIGhlcmUsIGJ1dCBpdCBjYXVzZWQgaXNzdWVzIGxpa2UgdGhlIG9uZVxuXHRcdC8vIGRpc2NvdmVyZWQgYnkgQ2hyaXNTIGhlcmU6IGh0dHA6Ly9idWdzLmpxdWVyeS5jb20vdGlja2V0LzEyMjgyI2NvbW1lbnQ6MTVcblx0XHRpZiAoIGRvY3VtZW50LnJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIiApIHtcblx0XHRcdC8vIEhhbmRsZSBpdCBhc3luY2hyb25vdXNseSB0byBhbGxvdyBzY3JpcHRzIHRoZSBvcHBvcnR1bml0eSB0byBkZWxheSByZWFkeVxuXHRcdFx0c2V0VGltZW91dCggalF1ZXJ5LnJlYWR5LCAxICk7XG5cblx0XHQvLyBTdGFuZGFyZHMtYmFzZWQgYnJvd3NlcnMgc3VwcG9ydCBET01Db250ZW50TG9hZGVkXG5cdFx0fSBlbHNlIGlmICggZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciApIHtcblx0XHRcdC8vIFVzZSB0aGUgaGFuZHkgZXZlbnQgY2FsbGJhY2tcblx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoIFwiRE9NQ29udGVudExvYWRlZFwiLCBET01Db250ZW50TG9hZGVkLCBmYWxzZSApO1xuXG5cdFx0XHQvLyBBIGZhbGxiYWNrIHRvIHdpbmRvdy5vbmxvYWQsIHRoYXQgd2lsbCBhbHdheXMgd29ya1xuXHRcdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoIFwibG9hZFwiLCBqUXVlcnkucmVhZHksIGZhbHNlICk7XG5cblx0XHQvLyBJZiBJRSBldmVudCBtb2RlbCBpcyB1c2VkXG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIEVuc3VyZSBmaXJpbmcgYmVmb3JlIG9ubG9hZCwgbWF5YmUgbGF0ZSBidXQgc2FmZSBhbHNvIGZvciBpZnJhbWVzXG5cdFx0XHRkb2N1bWVudC5hdHRhY2hFdmVudCggXCJvbnJlYWR5c3RhdGVjaGFuZ2VcIiwgRE9NQ29udGVudExvYWRlZCApO1xuXG5cdFx0XHQvLyBBIGZhbGxiYWNrIHRvIHdpbmRvdy5vbmxvYWQsIHRoYXQgd2lsbCBhbHdheXMgd29ya1xuXHRcdFx0d2luZG93LmF0dGFjaEV2ZW50KCBcIm9ubG9hZFwiLCBqUXVlcnkucmVhZHkgKTtcblxuXHRcdFx0Ly8gSWYgSUUgYW5kIG5vdCBhIGZyYW1lXG5cdFx0XHQvLyBjb250aW51YWxseSBjaGVjayB0byBzZWUgaWYgdGhlIGRvY3VtZW50IGlzIHJlYWR5XG5cdFx0XHR2YXIgdG9wID0gZmFsc2U7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdHRvcCA9IHdpbmRvdy5mcmFtZUVsZW1lbnQgPT0gbnVsbCAmJiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cdFx0XHR9IGNhdGNoKGUpIHt9XG5cblx0XHRcdGlmICggdG9wICYmIHRvcC5kb1Njcm9sbCApIHtcblx0XHRcdFx0KGZ1bmN0aW9uIGRvU2Nyb2xsQ2hlY2soKSB7XG5cdFx0XHRcdFx0aWYgKCAhalF1ZXJ5LmlzUmVhZHkgKSB7XG5cblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdC8vIFVzZSB0aGUgdHJpY2sgYnkgRGllZ28gUGVyaW5pXG5cdFx0XHRcdFx0XHRcdC8vIGh0dHA6Ly9qYXZhc2NyaXB0Lm53Ym94LmNvbS9JRUNvbnRlbnRMb2FkZWQvXG5cdFx0XHRcdFx0XHRcdHRvcC5kb1Njcm9sbChcImxlZnRcIik7XG5cdFx0XHRcdFx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHNldFRpbWVvdXQoIGRvU2Nyb2xsQ2hlY2ssIDUwICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vIGFuZCBleGVjdXRlIGFueSB3YWl0aW5nIGZ1bmN0aW9uc1xuXHRcdFx0XHRcdFx0alF1ZXJ5LnJlYWR5KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRyZXR1cm4gcmVhZHlMaXN0LnByb21pc2UoIG9iaiApO1xufTtcblxuLy8gUG9wdWxhdGUgdGhlIGNsYXNzMnR5cGUgbWFwXG5qUXVlcnkuZWFjaChcIkJvb2xlYW4gTnVtYmVyIFN0cmluZyBGdW5jdGlvbiBBcnJheSBEYXRlIFJlZ0V4cCBPYmplY3RcIi5zcGxpdChcIiBcIiksIGZ1bmN0aW9uKGksIG5hbWUpIHtcblx0Y2xhc3MydHlwZVsgXCJbb2JqZWN0IFwiICsgbmFtZSArIFwiXVwiIF0gPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG59KTtcblxuLy8gQWxsIGpRdWVyeSBvYmplY3RzIHNob3VsZCBwb2ludCBiYWNrIHRvIHRoZXNlXG5yb290alF1ZXJ5ID0galF1ZXJ5KGRvY3VtZW50KTtcbi8vIFN0cmluZyB0byBPYmplY3Qgb3B0aW9ucyBmb3JtYXQgY2FjaGVcbnZhciBvcHRpb25zQ2FjaGUgPSB7fTtcblxuLy8gQ29udmVydCBTdHJpbmctZm9ybWF0dGVkIG9wdGlvbnMgaW50byBPYmplY3QtZm9ybWF0dGVkIG9uZXMgYW5kIHN0b3JlIGluIGNhY2hlXG5mdW5jdGlvbiBjcmVhdGVPcHRpb25zKCBvcHRpb25zICkge1xuXHR2YXIgb2JqZWN0ID0gb3B0aW9uc0NhY2hlWyBvcHRpb25zIF0gPSB7fTtcblx0alF1ZXJ5LmVhY2goIG9wdGlvbnMuc3BsaXQoIGNvcmVfcnNwYWNlICksIGZ1bmN0aW9uKCBfLCBmbGFnICkge1xuXHRcdG9iamVjdFsgZmxhZyBdID0gdHJ1ZTtcblx0fSk7XG5cdHJldHVybiBvYmplY3Q7XG59XG5cbi8qXG4gKiBDcmVhdGUgYSBjYWxsYmFjayBsaXN0IHVzaW5nIHRoZSBmb2xsb3dpbmcgcGFyYW1ldGVyczpcbiAqXG4gKlx0b3B0aW9uczogYW4gb3B0aW9uYWwgbGlzdCBvZiBzcGFjZS1zZXBhcmF0ZWQgb3B0aW9ucyB0aGF0IHdpbGwgY2hhbmdlIGhvd1xuICpcdFx0XHR0aGUgY2FsbGJhY2sgbGlzdCBiZWhhdmVzIG9yIGEgbW9yZSB0cmFkaXRpb25hbCBvcHRpb24gb2JqZWN0XG4gKlxuICogQnkgZGVmYXVsdCBhIGNhbGxiYWNrIGxpc3Qgd2lsbCBhY3QgbGlrZSBhbiBldmVudCBjYWxsYmFjayBsaXN0IGFuZCBjYW4gYmVcbiAqIFwiZmlyZWRcIiBtdWx0aXBsZSB0aW1lcy5cbiAqXG4gKiBQb3NzaWJsZSBvcHRpb25zOlxuICpcbiAqXHRvbmNlOlx0XHRcdHdpbGwgZW5zdXJlIHRoZSBjYWxsYmFjayBsaXN0IGNhbiBvbmx5IGJlIGZpcmVkIG9uY2UgKGxpa2UgYSBEZWZlcnJlZClcbiAqXG4gKlx0bWVtb3J5Olx0XHRcdHdpbGwga2VlcCB0cmFjayBvZiBwcmV2aW91cyB2YWx1ZXMgYW5kIHdpbGwgY2FsbCBhbnkgY2FsbGJhY2sgYWRkZWRcbiAqXHRcdFx0XHRcdGFmdGVyIHRoZSBsaXN0IGhhcyBiZWVuIGZpcmVkIHJpZ2h0IGF3YXkgd2l0aCB0aGUgbGF0ZXN0IFwibWVtb3JpemVkXCJcbiAqXHRcdFx0XHRcdHZhbHVlcyAobGlrZSBhIERlZmVycmVkKVxuICpcbiAqXHR1bmlxdWU6XHRcdFx0d2lsbCBlbnN1cmUgYSBjYWxsYmFjayBjYW4gb25seSBiZSBhZGRlZCBvbmNlIChubyBkdXBsaWNhdGUgaW4gdGhlIGxpc3QpXG4gKlxuICpcdHN0b3BPbkZhbHNlOlx0aW50ZXJydXB0IGNhbGxpbmdzIHdoZW4gYSBjYWxsYmFjayByZXR1cm5zIGZhbHNlXG4gKlxuICovXG5qUXVlcnkuQ2FsbGJhY2tzID0gZnVuY3Rpb24oIG9wdGlvbnMgKSB7XG5cblx0Ly8gQ29udmVydCBvcHRpb25zIGZyb20gU3RyaW5nLWZvcm1hdHRlZCB0byBPYmplY3QtZm9ybWF0dGVkIGlmIG5lZWRlZFxuXHQvLyAod2UgY2hlY2sgaW4gY2FjaGUgZmlyc3QpXG5cdG9wdGlvbnMgPSB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIiA/XG5cdFx0KCBvcHRpb25zQ2FjaGVbIG9wdGlvbnMgXSB8fCBjcmVhdGVPcHRpb25zKCBvcHRpb25zICkgKSA6XG5cdFx0alF1ZXJ5LmV4dGVuZCgge30sIG9wdGlvbnMgKTtcblxuXHR2YXIgLy8gTGFzdCBmaXJlIHZhbHVlIChmb3Igbm9uLWZvcmdldHRhYmxlIGxpc3RzKVxuXHRcdG1lbW9yeSxcblx0XHQvLyBGbGFnIHRvIGtub3cgaWYgbGlzdCB3YXMgYWxyZWFkeSBmaXJlZFxuXHRcdGZpcmVkLFxuXHRcdC8vIEZsYWcgdG8ga25vdyBpZiBsaXN0IGlzIGN1cnJlbnRseSBmaXJpbmdcblx0XHRmaXJpbmcsXG5cdFx0Ly8gRmlyc3QgY2FsbGJhY2sgdG8gZmlyZSAodXNlZCBpbnRlcm5hbGx5IGJ5IGFkZCBhbmQgZmlyZVdpdGgpXG5cdFx0ZmlyaW5nU3RhcnQsXG5cdFx0Ly8gRW5kIG9mIHRoZSBsb29wIHdoZW4gZmlyaW5nXG5cdFx0ZmlyaW5nTGVuZ3RoLFxuXHRcdC8vIEluZGV4IG9mIGN1cnJlbnRseSBmaXJpbmcgY2FsbGJhY2sgKG1vZGlmaWVkIGJ5IHJlbW92ZSBpZiBuZWVkZWQpXG5cdFx0ZmlyaW5nSW5kZXgsXG5cdFx0Ly8gQWN0dWFsIGNhbGxiYWNrIGxpc3Rcblx0XHRsaXN0ID0gW10sXG5cdFx0Ly8gU3RhY2sgb2YgZmlyZSBjYWxscyBmb3IgcmVwZWF0YWJsZSBsaXN0c1xuXHRcdHN0YWNrID0gIW9wdGlvbnMub25jZSAmJiBbXSxcblx0XHQvLyBGaXJlIGNhbGxiYWNrc1xuXHRcdGZpcmUgPSBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdG1lbW9yeSA9IG9wdGlvbnMubWVtb3J5ICYmIGRhdGE7XG5cdFx0XHRmaXJlZCA9IHRydWU7XG5cdFx0XHRmaXJpbmdJbmRleCA9IGZpcmluZ1N0YXJ0IHx8IDA7XG5cdFx0XHRmaXJpbmdTdGFydCA9IDA7XG5cdFx0XHRmaXJpbmdMZW5ndGggPSBsaXN0Lmxlbmd0aDtcblx0XHRcdGZpcmluZyA9IHRydWU7XG5cdFx0XHRmb3IgKCA7IGxpc3QgJiYgZmlyaW5nSW5kZXggPCBmaXJpbmdMZW5ndGg7IGZpcmluZ0luZGV4KysgKSB7XG5cdFx0XHRcdGlmICggbGlzdFsgZmlyaW5nSW5kZXggXS5hcHBseSggZGF0YVsgMCBdLCBkYXRhWyAxIF0gKSA9PT0gZmFsc2UgJiYgb3B0aW9ucy5zdG9wT25GYWxzZSApIHtcblx0XHRcdFx0XHRtZW1vcnkgPSBmYWxzZTsgLy8gVG8gcHJldmVudCBmdXJ0aGVyIGNhbGxzIHVzaW5nIGFkZFxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRmaXJpbmcgPSBmYWxzZTtcblx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0aWYgKCBzdGFjayApIHtcblx0XHRcdFx0XHRpZiAoIHN0YWNrLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdGZpcmUoIHN0YWNrLnNoaWZ0KCkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoIG1lbW9yeSApIHtcblx0XHRcdFx0XHRsaXN0ID0gW107XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c2VsZi5kaXNhYmxlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdC8vIEFjdHVhbCBDYWxsYmFja3Mgb2JqZWN0XG5cdFx0c2VsZiA9IHtcblx0XHRcdC8vIEFkZCBhIGNhbGxiYWNrIG9yIGEgY29sbGVjdGlvbiBvZiBjYWxsYmFja3MgdG8gdGhlIGxpc3Rcblx0XHRcdGFkZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggbGlzdCApIHtcblx0XHRcdFx0XHQvLyBGaXJzdCwgd2Ugc2F2ZSB0aGUgY3VycmVudCBsZW5ndGhcblx0XHRcdFx0XHR2YXIgc3RhcnQgPSBsaXN0Lmxlbmd0aDtcblx0XHRcdFx0XHQoZnVuY3Rpb24gYWRkKCBhcmdzICkge1xuXHRcdFx0XHRcdFx0alF1ZXJ5LmVhY2goIGFyZ3MsIGZ1bmN0aW9uKCBfLCBhcmcgKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB0eXBlID0galF1ZXJ5LnR5cGUoIGFyZyApO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGUgPT09IFwiZnVuY3Rpb25cIiAmJiAoICFvcHRpb25zLnVuaXF1ZSB8fCAhc2VsZi5oYXMoIGFyZyApICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0bGlzdC5wdXNoKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICggYXJnICYmIGFyZy5sZW5ndGggJiYgdHlwZSAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBJbnNwZWN0IHJlY3Vyc2l2ZWx5XG5cdFx0XHRcdFx0XHRcdFx0YWRkKCBhcmcgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSkoIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdC8vIERvIHdlIG5lZWQgdG8gYWRkIHRoZSBjYWxsYmFja3MgdG8gdGhlXG5cdFx0XHRcdFx0Ly8gY3VycmVudCBmaXJpbmcgYmF0Y2g/XG5cdFx0XHRcdFx0aWYgKCBmaXJpbmcgKSB7XG5cdFx0XHRcdFx0XHRmaXJpbmdMZW5ndGggPSBsaXN0Lmxlbmd0aDtcblx0XHRcdFx0XHQvLyBXaXRoIG1lbW9yeSwgaWYgd2UncmUgbm90IGZpcmluZyB0aGVuXG5cdFx0XHRcdFx0Ly8gd2Ugc2hvdWxkIGNhbGwgcmlnaHQgYXdheVxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIG1lbW9yeSApIHtcblx0XHRcdFx0XHRcdGZpcmluZ1N0YXJ0ID0gc3RhcnQ7XG5cdFx0XHRcdFx0XHRmaXJlKCBtZW1vcnkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gUmVtb3ZlIGEgY2FsbGJhY2sgZnJvbSB0aGUgbGlzdFxuXHRcdFx0cmVtb3ZlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCBsaXN0ICkge1xuXHRcdFx0XHRcdGpRdWVyeS5lYWNoKCBhcmd1bWVudHMsIGZ1bmN0aW9uKCBfLCBhcmcgKSB7XG5cdFx0XHRcdFx0XHR2YXIgaW5kZXg7XG5cdFx0XHRcdFx0XHR3aGlsZSggKCBpbmRleCA9IGpRdWVyeS5pbkFycmF5KCBhcmcsIGxpc3QsIGluZGV4ICkgKSA+IC0xICkge1xuXHRcdFx0XHRcdFx0XHRsaXN0LnNwbGljZSggaW5kZXgsIDEgKTtcblx0XHRcdFx0XHRcdFx0Ly8gSGFuZGxlIGZpcmluZyBpbmRleGVzXG5cdFx0XHRcdFx0XHRcdGlmICggZmlyaW5nICkge1xuXHRcdFx0XHRcdFx0XHRcdGlmICggaW5kZXggPD0gZmlyaW5nTGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0ZmlyaW5nTGVuZ3RoLS07XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGlmICggaW5kZXggPD0gZmlyaW5nSW5kZXggKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRmaXJpbmdJbmRleC0tO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIENvbnRyb2wgaWYgYSBnaXZlbiBjYWxsYmFjayBpcyBpbiB0aGUgbGlzdFxuXHRcdFx0aGFzOiBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRcdHJldHVybiBqUXVlcnkuaW5BcnJheSggZm4sIGxpc3QgKSA+IC0xO1xuXHRcdFx0fSxcblx0XHRcdC8vIFJlbW92ZSBhbGwgY2FsbGJhY2tzIGZyb20gdGhlIGxpc3Rcblx0XHRcdGVtcHR5OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bGlzdCA9IFtdO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBIYXZlIHRoZSBsaXN0IGRvIG5vdGhpbmcgYW55bW9yZVxuXHRcdFx0ZGlzYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGxpc3QgPSBzdGFjayA9IG1lbW9yeSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9LFxuXHRcdFx0Ly8gSXMgaXQgZGlzYWJsZWQ/XG5cdFx0XHRkaXNhYmxlZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiAhbGlzdDtcblx0XHRcdH0sXG5cdFx0XHQvLyBMb2NrIHRoZSBsaXN0IGluIGl0cyBjdXJyZW50IHN0YXRlXG5cdFx0XHRsb2NrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0c3RhY2sgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGlmICggIW1lbW9yeSApIHtcblx0XHRcdFx0XHRzZWxmLmRpc2FibGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0sXG5cdFx0XHQvLyBJcyBpdCBsb2NrZWQ/XG5cdFx0XHRsb2NrZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gIXN0YWNrO1xuXHRcdFx0fSxcblx0XHRcdC8vIENhbGwgYWxsIGNhbGxiYWNrcyB3aXRoIHRoZSBnaXZlbiBjb250ZXh0IGFuZCBhcmd1bWVudHNcblx0XHRcdGZpcmVXaXRoOiBmdW5jdGlvbiggY29udGV4dCwgYXJncyApIHtcblx0XHRcdFx0YXJncyA9IGFyZ3MgfHwgW107XG5cdFx0XHRcdGFyZ3MgPSBbIGNvbnRleHQsIGFyZ3Muc2xpY2UgPyBhcmdzLnNsaWNlKCkgOiBhcmdzIF07XG5cdFx0XHRcdGlmICggbGlzdCAmJiAoICFmaXJlZCB8fCBzdGFjayApICkge1xuXHRcdFx0XHRcdGlmICggZmlyaW5nICkge1xuXHRcdFx0XHRcdFx0c3RhY2sucHVzaCggYXJncyApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRmaXJlKCBhcmdzICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIENhbGwgYWxsIHRoZSBjYWxsYmFja3Mgd2l0aCB0aGUgZ2l2ZW4gYXJndW1lbnRzXG5cdFx0XHRmaXJlOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5maXJlV2l0aCggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSxcblx0XHRcdC8vIFRvIGtub3cgaWYgdGhlIGNhbGxiYWNrcyBoYXZlIGFscmVhZHkgYmVlbiBjYWxsZWQgYXQgbGVhc3Qgb25jZVxuXHRcdFx0ZmlyZWQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gISFmaXJlZDtcblx0XHRcdH1cblx0XHR9O1xuXG5cdHJldHVybiBzZWxmO1xufTtcbmpRdWVyeS5leHRlbmQoe1xuXG5cdERlZmVycmVkOiBmdW5jdGlvbiggZnVuYyApIHtcblx0XHR2YXIgdHVwbGVzID0gW1xuXHRcdFx0XHQvLyBhY3Rpb24sIGFkZCBsaXN0ZW5lciwgbGlzdGVuZXIgbGlzdCwgZmluYWwgc3RhdGVcblx0XHRcdFx0WyBcInJlc29sdmVcIiwgXCJkb25lXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSwgXCJyZXNvbHZlZFwiIF0sXG5cdFx0XHRcdFsgXCJyZWplY3RcIiwgXCJmYWlsXCIsIGpRdWVyeS5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSwgXCJyZWplY3RlZFwiIF0sXG5cdFx0XHRcdFsgXCJub3RpZnlcIiwgXCJwcm9ncmVzc1wiLCBqUXVlcnkuQ2FsbGJhY2tzKFwibWVtb3J5XCIpIF1cblx0XHRcdF0sXG5cdFx0XHRzdGF0ZSA9IFwicGVuZGluZ1wiLFxuXHRcdFx0cHJvbWlzZSA9IHtcblx0XHRcdFx0c3RhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBzdGF0ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0YWx3YXlzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkZWZlcnJlZC5kb25lKCBhcmd1bWVudHMgKS5mYWlsKCBhcmd1bWVudHMgKTtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdFx0fSxcblx0XHRcdFx0dGhlbjogZnVuY3Rpb24oIC8qIGZuRG9uZSwgZm5GYWlsLCBmblByb2dyZXNzICovICkge1xuXHRcdFx0XHRcdHZhciBmbnMgPSBhcmd1bWVudHM7XG5cdFx0XHRcdFx0cmV0dXJuIGpRdWVyeS5EZWZlcnJlZChmdW5jdGlvbiggbmV3RGVmZXIgKSB7XG5cdFx0XHRcdFx0XHRqUXVlcnkuZWFjaCggdHVwbGVzLCBmdW5jdGlvbiggaSwgdHVwbGUgKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBhY3Rpb24gPSB0dXBsZVsgMCBdLFxuXHRcdFx0XHRcdFx0XHRcdGZuID0gZm5zWyBpIF07XG5cdFx0XHRcdFx0XHRcdC8vIGRlZmVycmVkWyBkb25lIHwgZmFpbCB8IHByb2dyZXNzIF0gZm9yIGZvcndhcmRpbmcgYWN0aW9ucyB0byBuZXdEZWZlclxuXHRcdFx0XHRcdFx0XHRkZWZlcnJlZFsgdHVwbGVbMV0gXSggalF1ZXJ5LmlzRnVuY3Rpb24oIGZuICkgP1xuXHRcdFx0XHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dmFyIHJldHVybmVkID0gZm4uYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCByZXR1cm5lZCAmJiBqUXVlcnkuaXNGdW5jdGlvbiggcmV0dXJuZWQucHJvbWlzZSApICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm5lZC5wcm9taXNlKClcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQuZG9uZSggbmV3RGVmZXIucmVzb2x2ZSApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LmZhaWwoIG5ld0RlZmVyLnJlamVjdCApXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0LnByb2dyZXNzKCBuZXdEZWZlci5ub3RpZnkgKTtcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5ld0RlZmVyWyBhY3Rpb24gKyBcIldpdGhcIiBdKCB0aGlzID09PSBkZWZlcnJlZCA/IG5ld0RlZmVyIDogdGhpcywgWyByZXR1cm5lZCBdICk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSA6XG5cdFx0XHRcdFx0XHRcdFx0bmV3RGVmZXJbIGFjdGlvbiBdXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGZucyA9IG51bGw7XG5cdFx0XHRcdFx0fSkucHJvbWlzZSgpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQvLyBHZXQgYSBwcm9taXNlIGZvciB0aGlzIGRlZmVycmVkXG5cdFx0XHRcdC8vIElmIG9iaiBpcyBwcm92aWRlZCwgdGhlIHByb21pc2UgYXNwZWN0IGlzIGFkZGVkIHRvIHRoZSBvYmplY3Rcblx0XHRcdFx0cHJvbWlzZTogZnVuY3Rpb24oIG9iaiApIHtcblx0XHRcdFx0XHRyZXR1cm4gdHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIiA/IGpRdWVyeS5leHRlbmQoIG9iaiwgcHJvbWlzZSApIDogcHJvbWlzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGRlZmVycmVkID0ge307XG5cblx0XHQvLyBLZWVwIHBpcGUgZm9yIGJhY2stY29tcGF0XG5cdFx0cHJvbWlzZS5waXBlID0gcHJvbWlzZS50aGVuO1xuXG5cdFx0Ly8gQWRkIGxpc3Qtc3BlY2lmaWMgbWV0aG9kc1xuXHRcdGpRdWVyeS5lYWNoKCB0dXBsZXMsIGZ1bmN0aW9uKCBpLCB0dXBsZSApIHtcblx0XHRcdHZhciBsaXN0ID0gdHVwbGVbIDIgXSxcblx0XHRcdFx0c3RhdGVTdHJpbmcgPSB0dXBsZVsgMyBdO1xuXG5cdFx0XHQvLyBwcm9taXNlWyBkb25lIHwgZmFpbCB8IHByb2dyZXNzIF0gPSBsaXN0LmFkZFxuXHRcdFx0cHJvbWlzZVsgdHVwbGVbMV0gXSA9IGxpc3QuYWRkO1xuXG5cdFx0XHQvLyBIYW5kbGUgc3RhdGVcblx0XHRcdGlmICggc3RhdGVTdHJpbmcgKSB7XG5cdFx0XHRcdGxpc3QuYWRkKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIHN0YXRlID0gWyByZXNvbHZlZCB8IHJlamVjdGVkIF1cblx0XHRcdFx0XHRzdGF0ZSA9IHN0YXRlU3RyaW5nO1xuXG5cdFx0XHRcdC8vIFsgcmVqZWN0X2xpc3QgfCByZXNvbHZlX2xpc3QgXS5kaXNhYmxlOyBwcm9ncmVzc19saXN0LmxvY2tcblx0XHRcdFx0fSwgdHVwbGVzWyBpIF4gMSBdWyAyIF0uZGlzYWJsZSwgdHVwbGVzWyAyIF1bIDIgXS5sb2NrICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGRlZmVycmVkWyByZXNvbHZlIHwgcmVqZWN0IHwgbm90aWZ5IF0gPSBsaXN0LmZpcmVcblx0XHRcdGRlZmVycmVkWyB0dXBsZVswXSBdID0gbGlzdC5maXJlO1xuXHRcdFx0ZGVmZXJyZWRbIHR1cGxlWzBdICsgXCJXaXRoXCIgXSA9IGxpc3QuZmlyZVdpdGg7XG5cdFx0fSk7XG5cblx0XHQvLyBNYWtlIHRoZSBkZWZlcnJlZCBhIHByb21pc2Vcblx0XHRwcm9taXNlLnByb21pc2UoIGRlZmVycmVkICk7XG5cblx0XHQvLyBDYWxsIGdpdmVuIGZ1bmMgaWYgYW55XG5cdFx0aWYgKCBmdW5jICkge1xuXHRcdFx0ZnVuYy5jYWxsKCBkZWZlcnJlZCwgZGVmZXJyZWQgKTtcblx0XHR9XG5cblx0XHQvLyBBbGwgZG9uZSFcblx0XHRyZXR1cm4gZGVmZXJyZWQ7XG5cdH0sXG5cblx0Ly8gRGVmZXJyZWQgaGVscGVyXG5cdHdoZW46IGZ1bmN0aW9uKCBzdWJvcmRpbmF0ZSAvKiAsIC4uLiwgc3Vib3JkaW5hdGVOICovICkge1xuXHRcdHZhciBpID0gMCxcblx0XHRcdHJlc29sdmVWYWx1ZXMgPSBjb3JlX3NsaWNlLmNhbGwoIGFyZ3VtZW50cyApLFxuXHRcdFx0bGVuZ3RoID0gcmVzb2x2ZVZhbHVlcy5sZW5ndGgsXG5cblx0XHRcdC8vIHRoZSBjb3VudCBvZiB1bmNvbXBsZXRlZCBzdWJvcmRpbmF0ZXNcblx0XHRcdHJlbWFpbmluZyA9IGxlbmd0aCAhPT0gMSB8fCAoIHN1Ym9yZGluYXRlICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCBzdWJvcmRpbmF0ZS5wcm9taXNlICkgKSA/IGxlbmd0aCA6IDAsXG5cblx0XHRcdC8vIHRoZSBtYXN0ZXIgRGVmZXJyZWQuIElmIHJlc29sdmVWYWx1ZXMgY29uc2lzdCBvZiBvbmx5IGEgc2luZ2xlIERlZmVycmVkLCBqdXN0IHVzZSB0aGF0LlxuXHRcdFx0ZGVmZXJyZWQgPSByZW1haW5pbmcgPT09IDEgPyBzdWJvcmRpbmF0ZSA6IGpRdWVyeS5EZWZlcnJlZCgpLFxuXG5cdFx0XHQvLyBVcGRhdGUgZnVuY3Rpb24gZm9yIGJvdGggcmVzb2x2ZSBhbmQgcHJvZ3Jlc3MgdmFsdWVzXG5cdFx0XHR1cGRhdGVGdW5jID0gZnVuY3Rpb24oIGksIGNvbnRleHRzLCB2YWx1ZXMgKSB7XG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbiggdmFsdWUgKSB7XG5cdFx0XHRcdFx0Y29udGV4dHNbIGkgXSA9IHRoaXM7XG5cdFx0XHRcdFx0dmFsdWVzWyBpIF0gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGNvcmVfc2xpY2UuY2FsbCggYXJndW1lbnRzICkgOiB2YWx1ZTtcblx0XHRcdFx0XHRpZiggdmFsdWVzID09PSBwcm9ncmVzc1ZhbHVlcyApIHtcblx0XHRcdFx0XHRcdGRlZmVycmVkLm5vdGlmeVdpdGgoIGNvbnRleHRzLCB2YWx1ZXMgKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAhKCAtLXJlbWFpbmluZyApICkge1xuXHRcdFx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZVdpdGgoIGNvbnRleHRzLCB2YWx1ZXMgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHR9LFxuXG5cdFx0XHRwcm9ncmVzc1ZhbHVlcywgcHJvZ3Jlc3NDb250ZXh0cywgcmVzb2x2ZUNvbnRleHRzO1xuXG5cdFx0Ly8gYWRkIGxpc3RlbmVycyB0byBEZWZlcnJlZCBzdWJvcmRpbmF0ZXM7IHRyZWF0IG90aGVycyBhcyByZXNvbHZlZFxuXHRcdGlmICggbGVuZ3RoID4gMSApIHtcblx0XHRcdHByb2dyZXNzVmFsdWVzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdHByb2dyZXNzQ29udGV4dHMgPSBuZXcgQXJyYXkoIGxlbmd0aCApO1xuXHRcdFx0cmVzb2x2ZUNvbnRleHRzID0gbmV3IEFycmF5KCBsZW5ndGggKTtcblx0XHRcdGZvciAoIDsgaSA8IGxlbmd0aDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIHJlc29sdmVWYWx1ZXNbIGkgXSAmJiBqUXVlcnkuaXNGdW5jdGlvbiggcmVzb2x2ZVZhbHVlc1sgaSBdLnByb21pc2UgKSApIHtcblx0XHRcdFx0XHRyZXNvbHZlVmFsdWVzWyBpIF0ucHJvbWlzZSgpXG5cdFx0XHRcdFx0XHQuZG9uZSggdXBkYXRlRnVuYyggaSwgcmVzb2x2ZUNvbnRleHRzLCByZXNvbHZlVmFsdWVzICkgKVxuXHRcdFx0XHRcdFx0LmZhaWwoIGRlZmVycmVkLnJlamVjdCApXG5cdFx0XHRcdFx0XHQucHJvZ3Jlc3MoIHVwZGF0ZUZ1bmMoIGksIHByb2dyZXNzQ29udGV4dHMsIHByb2dyZXNzVmFsdWVzICkgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQtLXJlbWFpbmluZztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIGlmIHdlJ3JlIG5vdCB3YWl0aW5nIG9uIGFueXRoaW5nLCByZXNvbHZlIHRoZSBtYXN0ZXJcblx0XHRpZiAoICFyZW1haW5pbmcgKSB7XG5cdFx0XHRkZWZlcnJlZC5yZXNvbHZlV2l0aCggcmVzb2x2ZUNvbnRleHRzLCByZXNvbHZlVmFsdWVzICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcblx0fVxufSk7XG5qUXVlcnkuc3VwcG9ydCA9IChmdW5jdGlvbigpIHtcblxuXHR2YXIgc3VwcG9ydCxcblx0XHRhbGwsXG5cdFx0YSxcblx0XHRzZWxlY3QsXG5cdFx0b3B0LFxuXHRcdGlucHV0LFxuXHRcdGZyYWdtZW50LFxuXHRcdGV2ZW50TmFtZSxcblx0XHRpLFxuXHRcdGlzU3VwcG9ydGVkLFxuXHRcdGNsaWNrRm4sXG5cdFx0ZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblxuXHQvLyBQcmVsaW1pbmFyeSB0ZXN0c1xuXHRkaXYuc2V0QXR0cmlidXRlKCBcImNsYXNzTmFtZVwiLCBcInRcIiApO1xuXHRkaXYuaW5uZXJIVE1MID0gXCIgIDxsaW5rLz48dGFibGU+PC90YWJsZT48YSBocmVmPScvYSc+YTwvYT48aW5wdXQgdHlwZT0nY2hlY2tib3gnLz5cIjtcblxuXHRhbGwgPSBkaXYuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCIqXCIpO1xuXHRhID0gZGl2LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYVwiKVsgMCBdO1xuXHRhLnN0eWxlLmNzc1RleHQgPSBcInRvcDoxcHg7ZmxvYXQ6bGVmdDtvcGFjaXR5Oi41XCI7XG5cblx0Ly8gQ2FuJ3QgZ2V0IGJhc2ljIHRlc3Qgc3VwcG9ydFxuXHRpZiAoICFhbGwgfHwgIWFsbC5sZW5ndGggfHwgIWEgKSB7XG5cdFx0cmV0dXJuIHt9O1xuXHR9XG5cblx0Ly8gRmlyc3QgYmF0Y2ggb2Ygc3VwcG9ydHMgdGVzdHNcblx0c2VsZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNlbGVjdFwiKTtcblx0b3B0ID0gc2VsZWN0LmFwcGVuZENoaWxkKCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwib3B0aW9uXCIpICk7XG5cdGlucHV0ID0gZGl2LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW5wdXRcIilbIDAgXTtcblxuXHRzdXBwb3J0ID0ge1xuXHRcdC8vIElFIHN0cmlwcyBsZWFkaW5nIHdoaXRlc3BhY2Ugd2hlbiAuaW5uZXJIVE1MIGlzIHVzZWRcblx0XHRsZWFkaW5nV2hpdGVzcGFjZTogKCBkaXYuZmlyc3RDaGlsZC5ub2RlVHlwZSA9PT0gMyApLFxuXG5cdFx0Ly8gTWFrZSBzdXJlIHRoYXQgdGJvZHkgZWxlbWVudHMgYXJlbid0IGF1dG9tYXRpY2FsbHkgaW5zZXJ0ZWRcblx0XHQvLyBJRSB3aWxsIGluc2VydCB0aGVtIGludG8gZW1wdHkgdGFibGVzXG5cdFx0dGJvZHk6ICFkaXYuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ0Ym9keVwiKS5sZW5ndGgsXG5cblx0XHQvLyBNYWtlIHN1cmUgdGhhdCBsaW5rIGVsZW1lbnRzIGdldCBzZXJpYWxpemVkIGNvcnJlY3RseSBieSBpbm5lckhUTUxcblx0XHQvLyBUaGlzIHJlcXVpcmVzIGEgd3JhcHBlciBlbGVtZW50IGluIElFXG5cdFx0aHRtbFNlcmlhbGl6ZTogISFkaXYuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJsaW5rXCIpLmxlbmd0aCxcblxuXHRcdC8vIEdldCB0aGUgc3R5bGUgaW5mb3JtYXRpb24gZnJvbSBnZXRBdHRyaWJ1dGVcblx0XHQvLyAoSUUgdXNlcyAuY3NzVGV4dCBpbnN0ZWFkKVxuXHRcdHN0eWxlOiAvdG9wLy50ZXN0KCBhLmdldEF0dHJpYnV0ZShcInN0eWxlXCIpICksXG5cblx0XHQvLyBNYWtlIHN1cmUgdGhhdCBVUkxzIGFyZW4ndCBtYW5pcHVsYXRlZFxuXHRcdC8vIChJRSBub3JtYWxpemVzIGl0IGJ5IGRlZmF1bHQpXG5cdFx0aHJlZk5vcm1hbGl6ZWQ6ICggYS5nZXRBdHRyaWJ1dGUoXCJocmVmXCIpID09PSBcIi9hXCIgKSxcblxuXHRcdC8vIE1ha2Ugc3VyZSB0aGF0IGVsZW1lbnQgb3BhY2l0eSBleGlzdHNcblx0XHQvLyAoSUUgdXNlcyBmaWx0ZXIgaW5zdGVhZClcblx0XHQvLyBVc2UgYSByZWdleCB0byB3b3JrIGFyb3VuZCBhIFdlYktpdCBpc3N1ZS4gU2VlICM1MTQ1XG5cdFx0b3BhY2l0eTogL14wLjUvLnRlc3QoIGEuc3R5bGUub3BhY2l0eSApLFxuXG5cdFx0Ly8gVmVyaWZ5IHN0eWxlIGZsb2F0IGV4aXN0ZW5jZVxuXHRcdC8vIChJRSB1c2VzIHN0eWxlRmxvYXQgaW5zdGVhZCBvZiBjc3NGbG9hdClcblx0XHRjc3NGbG9hdDogISFhLnN0eWxlLmNzc0Zsb2F0LFxuXG5cdFx0Ly8gTWFrZSBzdXJlIHRoYXQgaWYgbm8gdmFsdWUgaXMgc3BlY2lmaWVkIGZvciBhIGNoZWNrYm94XG5cdFx0Ly8gdGhhdCBpdCBkZWZhdWx0cyB0byBcIm9uXCIuXG5cdFx0Ly8gKFdlYktpdCBkZWZhdWx0cyB0byBcIlwiIGluc3RlYWQpXG5cdFx0Y2hlY2tPbjogKCBpbnB1dC52YWx1ZSA9PT0gXCJvblwiICksXG5cblx0XHQvLyBNYWtlIHN1cmUgdGhhdCBhIHNlbGVjdGVkLWJ5LWRlZmF1bHQgb3B0aW9uIGhhcyBhIHdvcmtpbmcgc2VsZWN0ZWQgcHJvcGVydHkuXG5cdFx0Ly8gKFdlYktpdCBkZWZhdWx0cyB0byBmYWxzZSBpbnN0ZWFkIG9mIHRydWUsIElFIHRvbywgaWYgaXQncyBpbiBhbiBvcHRncm91cClcblx0XHRvcHRTZWxlY3RlZDogb3B0LnNlbGVjdGVkLFxuXG5cdFx0Ly8gVGVzdCBzZXRBdHRyaWJ1dGUgb24gY2FtZWxDYXNlIGNsYXNzLiBJZiBpdCB3b3Jrcywgd2UgbmVlZCBhdHRyRml4ZXMgd2hlbiBkb2luZyBnZXQvc2V0QXR0cmlidXRlIChpZTYvNylcblx0XHRnZXRTZXRBdHRyaWJ1dGU6IGRpdi5jbGFzc05hbWUgIT09IFwidFwiLFxuXG5cdFx0Ly8gVGVzdHMgZm9yIGVuY3R5cGUgc3VwcG9ydCBvbiBhIGZvcm0oIzY3NDMpXG5cdFx0ZW5jdHlwZTogISFkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZm9ybVwiKS5lbmN0eXBlLFxuXG5cdFx0Ly8gTWFrZXMgc3VyZSBjbG9uaW5nIGFuIGh0bWw1IGVsZW1lbnQgZG9lcyBub3QgY2F1c2UgcHJvYmxlbXNcblx0XHQvLyBXaGVyZSBvdXRlckhUTUwgaXMgdW5kZWZpbmVkLCB0aGlzIHN0aWxsIHdvcmtzXG5cdFx0aHRtbDVDbG9uZTogZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcIm5hdlwiKS5jbG9uZU5vZGUoIHRydWUgKS5vdXRlckhUTUwgIT09IFwiPDpuYXY+PC86bmF2PlwiLFxuXG5cdFx0Ly8galF1ZXJ5LnN1cHBvcnQuYm94TW9kZWwgREVQUkVDQVRFRCBpbiAxLjggc2luY2Ugd2UgZG9uJ3Qgc3VwcG9ydCBRdWlya3MgTW9kZVxuXHRcdGJveE1vZGVsOiAoIGRvY3VtZW50LmNvbXBhdE1vZGUgPT09IFwiQ1NTMUNvbXBhdFwiICksXG5cblx0XHQvLyBXaWxsIGJlIGRlZmluZWQgbGF0ZXJcblx0XHRzdWJtaXRCdWJibGVzOiB0cnVlLFxuXHRcdGNoYW5nZUJ1YmJsZXM6IHRydWUsXG5cdFx0Zm9jdXNpbkJ1YmJsZXM6IGZhbHNlLFxuXHRcdGRlbGV0ZUV4cGFuZG86IHRydWUsXG5cdFx0bm9DbG9uZUV2ZW50OiB0cnVlLFxuXHRcdGlubGluZUJsb2NrTmVlZHNMYXlvdXQ6IGZhbHNlLFxuXHRcdHNocmlua1dyYXBCbG9ja3M6IGZhbHNlLFxuXHRcdHJlbGlhYmxlTWFyZ2luUmlnaHQ6IHRydWUsXG5cdFx0Ym94U2l6aW5nUmVsaWFibGU6IHRydWUsXG5cdFx0cGl4ZWxQb3NpdGlvbjogZmFsc2Vcblx0fTtcblxuXHQvLyBNYWtlIHN1cmUgY2hlY2tlZCBzdGF0dXMgaXMgcHJvcGVybHkgY2xvbmVkXG5cdGlucHV0LmNoZWNrZWQgPSB0cnVlO1xuXHRzdXBwb3J0Lm5vQ2xvbmVDaGVja2VkID0gaW5wdXQuY2xvbmVOb2RlKCB0cnVlICkuY2hlY2tlZDtcblxuXHQvLyBNYWtlIHN1cmUgdGhhdCB0aGUgb3B0aW9ucyBpbnNpZGUgZGlzYWJsZWQgc2VsZWN0cyBhcmVuJ3QgbWFya2VkIGFzIGRpc2FibGVkXG5cdC8vIChXZWJLaXQgbWFya3MgdGhlbSBhcyBkaXNhYmxlZClcblx0c2VsZWN0LmRpc2FibGVkID0gdHJ1ZTtcblx0c3VwcG9ydC5vcHREaXNhYmxlZCA9ICFvcHQuZGlzYWJsZWQ7XG5cblx0Ly8gVGVzdCB0byBzZWUgaWYgaXQncyBwb3NzaWJsZSB0byBkZWxldGUgYW4gZXhwYW5kbyBmcm9tIGFuIGVsZW1lbnRcblx0Ly8gRmFpbHMgaW4gSW50ZXJuZXQgRXhwbG9yZXJcblx0dHJ5IHtcblx0XHRkZWxldGUgZGl2LnRlc3Q7XG5cdH0gY2F0Y2goIGUgKSB7XG5cdFx0c3VwcG9ydC5kZWxldGVFeHBhbmRvID0gZmFsc2U7XG5cdH1cblxuXHRpZiAoICFkaXYuYWRkRXZlbnRMaXN0ZW5lciAmJiBkaXYuYXR0YWNoRXZlbnQgJiYgZGl2LmZpcmVFdmVudCApIHtcblx0XHRkaXYuYXR0YWNoRXZlbnQoIFwib25jbGlja1wiLCBjbGlja0ZuID0gZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBDbG9uaW5nIGEgbm9kZSBzaG91bGRuJ3QgY29weSBvdmVyIGFueVxuXHRcdFx0Ly8gYm91bmQgZXZlbnQgaGFuZGxlcnMgKElFIGRvZXMgdGhpcylcblx0XHRcdHN1cHBvcnQubm9DbG9uZUV2ZW50ID0gZmFsc2U7XG5cdFx0fSk7XG5cdFx0ZGl2LmNsb25lTm9kZSggdHJ1ZSApLmZpcmVFdmVudChcIm9uY2xpY2tcIik7XG5cdFx0ZGl2LmRldGFjaEV2ZW50KCBcIm9uY2xpY2tcIiwgY2xpY2tGbiApO1xuXHR9XG5cblx0Ly8gQ2hlY2sgaWYgYSByYWRpbyBtYWludGFpbnMgaXRzIHZhbHVlXG5cdC8vIGFmdGVyIGJlaW5nIGFwcGVuZGVkIHRvIHRoZSBET01cblx0aW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XG5cdGlucHV0LnZhbHVlID0gXCJ0XCI7XG5cdGlucHV0LnNldEF0dHJpYnV0ZSggXCJ0eXBlXCIsIFwicmFkaW9cIiApO1xuXHRzdXBwb3J0LnJhZGlvVmFsdWUgPSBpbnB1dC52YWx1ZSA9PT0gXCJ0XCI7XG5cblx0aW5wdXQuc2V0QXR0cmlidXRlKCBcImNoZWNrZWRcIiwgXCJjaGVja2VkXCIgKTtcblxuXHQvLyAjMTEyMTcgLSBXZWJLaXQgbG9zZXMgY2hlY2sgd2hlbiB0aGUgbmFtZSBpcyBhZnRlciB0aGUgY2hlY2tlZCBhdHRyaWJ1dGVcblx0aW5wdXQuc2V0QXR0cmlidXRlKCBcIm5hbWVcIiwgXCJ0XCIgKTtcblxuXHRkaXYuYXBwZW5kQ2hpbGQoIGlucHV0ICk7XG5cdGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXHRmcmFnbWVudC5hcHBlbmRDaGlsZCggZGl2Lmxhc3RDaGlsZCApO1xuXG5cdC8vIFdlYktpdCBkb2Vzbid0IGNsb25lIGNoZWNrZWQgc3RhdGUgY29ycmVjdGx5IGluIGZyYWdtZW50c1xuXHRzdXBwb3J0LmNoZWNrQ2xvbmUgPSBmcmFnbWVudC5jbG9uZU5vZGUoIHRydWUgKS5jbG9uZU5vZGUoIHRydWUgKS5sYXN0Q2hpbGQuY2hlY2tlZDtcblxuXHQvLyBDaGVjayBpZiBhIGRpc2Nvbm5lY3RlZCBjaGVja2JveCB3aWxsIHJldGFpbiBpdHMgY2hlY2tlZFxuXHQvLyB2YWx1ZSBvZiB0cnVlIGFmdGVyIGFwcGVuZGVkIHRvIHRoZSBET00gKElFNi83KVxuXHRzdXBwb3J0LmFwcGVuZENoZWNrZWQgPSBpbnB1dC5jaGVja2VkO1xuXG5cdGZyYWdtZW50LnJlbW92ZUNoaWxkKCBpbnB1dCApO1xuXHRmcmFnbWVudC5hcHBlbmRDaGlsZCggZGl2ICk7XG5cblx0Ly8gVGVjaG5pcXVlIGZyb20gSnVyaXkgWmF5dHNldlxuXHQvLyBodHRwOi8vcGVyZmVjdGlvbmtpbGxzLmNvbS9kZXRlY3RpbmctZXZlbnQtc3VwcG9ydC13aXRob3V0LWJyb3dzZXItc25pZmZpbmcvXG5cdC8vIFdlIG9ubHkgY2FyZSBhYm91dCB0aGUgY2FzZSB3aGVyZSBub24tc3RhbmRhcmQgZXZlbnQgc3lzdGVtc1xuXHQvLyBhcmUgdXNlZCwgbmFtZWx5IGluIElFLiBTaG9ydC1jaXJjdWl0aW5nIGhlcmUgaGVscHMgdXMgdG9cblx0Ly8gYXZvaWQgYW4gZXZhbCBjYWxsIChpbiBzZXRBdHRyaWJ1dGUpIHdoaWNoIGNhbiBjYXVzZSBDU1Bcblx0Ly8gdG8gZ28gaGF5d2lyZS4gU2VlOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi9TZWN1cml0eS9DU1Bcblx0aWYgKCBkaXYuYXR0YWNoRXZlbnQgKSB7XG5cdFx0Zm9yICggaSBpbiB7XG5cdFx0XHRzdWJtaXQ6IHRydWUsXG5cdFx0XHRjaGFuZ2U6IHRydWUsXG5cdFx0XHRmb2N1c2luOiB0cnVlXG5cdFx0fSkge1xuXHRcdFx0ZXZlbnROYW1lID0gXCJvblwiICsgaTtcblx0XHRcdGlzU3VwcG9ydGVkID0gKCBldmVudE5hbWUgaW4gZGl2ICk7XG5cdFx0XHRpZiAoICFpc1N1cHBvcnRlZCApIHtcblx0XHRcdFx0ZGl2LnNldEF0dHJpYnV0ZSggZXZlbnROYW1lLCBcInJldHVybjtcIiApO1xuXHRcdFx0XHRpc1N1cHBvcnRlZCA9ICggdHlwZW9mIGRpdlsgZXZlbnROYW1lIF0gPT09IFwiZnVuY3Rpb25cIiApO1xuXHRcdFx0fVxuXHRcdFx0c3VwcG9ydFsgaSArIFwiQnViYmxlc1wiIF0gPSBpc1N1cHBvcnRlZDtcblx0XHR9XG5cdH1cblxuXHQvLyBSdW4gdGVzdHMgdGhhdCBuZWVkIGEgYm9keSBhdCBkb2MgcmVhZHlcblx0alF1ZXJ5KGZ1bmN0aW9uKCkge1xuXHRcdHZhciBjb250YWluZXIsIGRpdiwgdGRzLCBtYXJnaW5EaXYsXG5cdFx0XHRkaXZSZXNldCA9IFwicGFkZGluZzowO21hcmdpbjowO2JvcmRlcjowO2Rpc3BsYXk6YmxvY2s7b3ZlcmZsb3c6aGlkZGVuO1wiLFxuXHRcdFx0Ym9keSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiYm9keVwiKVswXTtcblxuXHRcdGlmICggIWJvZHkgKSB7XG5cdFx0XHQvLyBSZXR1cm4gZm9yIGZyYW1lc2V0IGRvY3MgdGhhdCBkb24ndCBoYXZlIGEgYm9keVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0Y29udGFpbmVyLnN0eWxlLmNzc1RleHQgPSBcInZpc2liaWxpdHk6aGlkZGVuO2JvcmRlcjowO3dpZHRoOjA7aGVpZ2h0OjA7cG9zaXRpb246c3RhdGljO3RvcDowO21hcmdpbi10b3A6MXB4XCI7XG5cdFx0Ym9keS5pbnNlcnRCZWZvcmUoIGNvbnRhaW5lciwgYm9keS5maXJzdENoaWxkICk7XG5cblx0XHQvLyBDb25zdHJ1Y3QgdGhlIHRlc3QgZWxlbWVudFxuXHRcdGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKCBkaXYgKTtcblxuXHRcdC8vIENoZWNrIGlmIHRhYmxlIGNlbGxzIHN0aWxsIGhhdmUgb2Zmc2V0V2lkdGgvSGVpZ2h0IHdoZW4gdGhleSBhcmUgc2V0XG5cdFx0Ly8gdG8gZGlzcGxheTpub25lIGFuZCB0aGVyZSBhcmUgc3RpbGwgb3RoZXIgdmlzaWJsZSB0YWJsZSBjZWxscyBpbiBhXG5cdFx0Ly8gdGFibGUgcm93OyBpZiBzbywgb2Zmc2V0V2lkdGgvSGVpZ2h0IGFyZSBub3QgcmVsaWFibGUgZm9yIHVzZSB3aGVuXG5cdFx0Ly8gZGV0ZXJtaW5pbmcgaWYgYW4gZWxlbWVudCBoYXMgYmVlbiBoaWRkZW4gZGlyZWN0bHkgdXNpbmdcblx0XHQvLyBkaXNwbGF5Om5vbmUgKGl0IGlzIHN0aWxsIHNhZmUgdG8gdXNlIG9mZnNldHMgaWYgYSBwYXJlbnQgZWxlbWVudCBpc1xuXHRcdC8vIGhpZGRlbjsgZG9uIHNhZmV0eSBnb2dnbGVzIGFuZCBzZWUgYnVnICM0NTEyIGZvciBtb3JlIGluZm9ybWF0aW9uKS5cblx0XHQvLyAob25seSBJRSA4IGZhaWxzIHRoaXMgdGVzdClcblx0XHRkaXYuaW5uZXJIVE1MID0gXCI8dGFibGU+PHRyPjx0ZD48L3RkPjx0ZD50PC90ZD48L3RyPjwvdGFibGU+XCI7XG5cdFx0dGRzID0gZGl2LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidGRcIik7XG5cdFx0dGRzWyAwIF0uc3R5bGUuY3NzVGV4dCA9IFwicGFkZGluZzowO21hcmdpbjowO2JvcmRlcjowO2Rpc3BsYXk6bm9uZVwiO1xuXHRcdGlzU3VwcG9ydGVkID0gKCB0ZHNbIDAgXS5vZmZzZXRIZWlnaHQgPT09IDAgKTtcblxuXHRcdHRkc1sgMCBdLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xuXHRcdHRkc1sgMSBdLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcblxuXHRcdC8vIENoZWNrIGlmIGVtcHR5IHRhYmxlIGNlbGxzIHN0aWxsIGhhdmUgb2Zmc2V0V2lkdGgvSGVpZ2h0XG5cdFx0Ly8gKElFIDw9IDggZmFpbCB0aGlzIHRlc3QpXG5cdFx0c3VwcG9ydC5yZWxpYWJsZUhpZGRlbk9mZnNldHMgPSBpc1N1cHBvcnRlZCAmJiAoIHRkc1sgMCBdLm9mZnNldEhlaWdodCA9PT0gMCApO1xuXG5cdFx0Ly8gQ2hlY2sgYm94LXNpemluZyBhbmQgbWFyZ2luIGJlaGF2aW9yXG5cdFx0ZGl2LmlubmVySFRNTCA9IFwiXCI7XG5cdFx0ZGl2LnN0eWxlLmNzc1RleHQgPSBcImJveC1zaXppbmc6Ym9yZGVyLWJveDstbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDstd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDtwYWRkaW5nOjFweDtib3JkZXI6MXB4O2Rpc3BsYXk6YmxvY2s7d2lkdGg6NHB4O21hcmdpbi10b3A6MSU7cG9zaXRpb246YWJzb2x1dGU7dG9wOjElO1wiO1xuXHRcdHN1cHBvcnQuYm94U2l6aW5nID0gKCBkaXYub2Zmc2V0V2lkdGggPT09IDQgKTtcblx0XHRzdXBwb3J0LmRvZXNOb3RJbmNsdWRlTWFyZ2luSW5Cb2R5T2Zmc2V0ID0gKCBib2R5Lm9mZnNldFRvcCAhPT0gMSApO1xuXG5cdFx0Ly8gTk9URTogVG8gYW55IGZ1dHVyZSBtYWludGFpbmVyLCB3ZSd2ZSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZVxuXHRcdC8vIGJlY2F1c2UganNkb20gb24gbm9kZS5qcyB3aWxsIGJyZWFrIHdpdGhvdXQgaXQuXG5cdFx0aWYgKCB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSApIHtcblx0XHRcdHN1cHBvcnQucGl4ZWxQb3NpdGlvbiA9ICggd2luZG93LmdldENvbXB1dGVkU3R5bGUoIGRpdiwgbnVsbCApIHx8IHt9ICkudG9wICE9PSBcIjElXCI7XG5cdFx0XHRzdXBwb3J0LmJveFNpemluZ1JlbGlhYmxlID0gKCB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSggZGl2LCBudWxsICkgfHwgeyB3aWR0aDogXCI0cHhcIiB9ICkud2lkdGggPT09IFwiNHB4XCI7XG5cblx0XHRcdC8vIENoZWNrIGlmIGRpdiB3aXRoIGV4cGxpY2l0IHdpZHRoIGFuZCBubyBtYXJnaW4tcmlnaHQgaW5jb3JyZWN0bHlcblx0XHRcdC8vIGdldHMgY29tcHV0ZWQgbWFyZ2luLXJpZ2h0IGJhc2VkIG9uIHdpZHRoIG9mIGNvbnRhaW5lci4gRm9yIG1vcmVcblx0XHRcdC8vIGluZm8gc2VlIGJ1ZyAjMzMzM1xuXHRcdFx0Ly8gRmFpbHMgaW4gV2ViS2l0IGJlZm9yZSBGZWIgMjAxMSBuaWdodGxpZXNcblx0XHRcdC8vIFdlYktpdCBCdWcgMTMzNDMgLSBnZXRDb21wdXRlZFN0eWxlIHJldHVybnMgd3JvbmcgdmFsdWUgZm9yIG1hcmdpbi1yaWdodFxuXHRcdFx0bWFyZ2luRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0XHRcdG1hcmdpbkRpdi5zdHlsZS5jc3NUZXh0ID0gZGl2LnN0eWxlLmNzc1RleHQgPSBkaXZSZXNldDtcblx0XHRcdG1hcmdpbkRpdi5zdHlsZS5tYXJnaW5SaWdodCA9IG1hcmdpbkRpdi5zdHlsZS53aWR0aCA9IFwiMFwiO1xuXHRcdFx0ZGl2LnN0eWxlLndpZHRoID0gXCIxcHhcIjtcblx0XHRcdGRpdi5hcHBlbmRDaGlsZCggbWFyZ2luRGl2ICk7XG5cdFx0XHRzdXBwb3J0LnJlbGlhYmxlTWFyZ2luUmlnaHQgPVxuXHRcdFx0XHQhcGFyc2VGbG9hdCggKCB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSggbWFyZ2luRGl2LCBudWxsICkgfHwge30gKS5tYXJnaW5SaWdodCApO1xuXHRcdH1cblxuXHRcdGlmICggdHlwZW9mIGRpdi5zdHlsZS56b29tICE9PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0Ly8gQ2hlY2sgaWYgbmF0aXZlbHkgYmxvY2stbGV2ZWwgZWxlbWVudHMgYWN0IGxpa2UgaW5saW5lLWJsb2NrXG5cdFx0XHQvLyBlbGVtZW50cyB3aGVuIHNldHRpbmcgdGhlaXIgZGlzcGxheSB0byAnaW5saW5lJyBhbmQgZ2l2aW5nXG5cdFx0XHQvLyB0aGVtIGxheW91dFxuXHRcdFx0Ly8gKElFIDwgOCBkb2VzIHRoaXMpXG5cdFx0XHRkaXYuaW5uZXJIVE1MID0gXCJcIjtcblx0XHRcdGRpdi5zdHlsZS5jc3NUZXh0ID0gZGl2UmVzZXQgKyBcIndpZHRoOjFweDtwYWRkaW5nOjFweDtkaXNwbGF5OmlubGluZTt6b29tOjFcIjtcblx0XHRcdHN1cHBvcnQuaW5saW5lQmxvY2tOZWVkc0xheW91dCA9ICggZGl2Lm9mZnNldFdpZHRoID09PSAzICk7XG5cblx0XHRcdC8vIENoZWNrIGlmIGVsZW1lbnRzIHdpdGggbGF5b3V0IHNocmluay13cmFwIHRoZWlyIGNoaWxkcmVuXG5cdFx0XHQvLyAoSUUgNiBkb2VzIHRoaXMpXG5cdFx0XHRkaXYuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcblx0XHRcdGRpdi5zdHlsZS5vdmVyZmxvdyA9IFwidmlzaWJsZVwiO1xuXHRcdFx0ZGl2LmlubmVySFRNTCA9IFwiPGRpdj48L2Rpdj5cIjtcblx0XHRcdGRpdi5maXJzdENoaWxkLnN0eWxlLndpZHRoID0gXCI1cHhcIjtcblx0XHRcdHN1cHBvcnQuc2hyaW5rV3JhcEJsb2NrcyA9ICggZGl2Lm9mZnNldFdpZHRoICE9PSAzICk7XG5cblx0XHRcdGNvbnRhaW5lci5zdHlsZS56b29tID0gMTtcblx0XHR9XG5cblx0XHQvLyBOdWxsIGVsZW1lbnRzIHRvIGF2b2lkIGxlYWtzIGluIElFXG5cdFx0Ym9keS5yZW1vdmVDaGlsZCggY29udGFpbmVyICk7XG5cdFx0Y29udGFpbmVyID0gZGl2ID0gdGRzID0gbWFyZ2luRGl2ID0gbnVsbDtcblx0fSk7XG5cblx0Ly8gTnVsbCBlbGVtZW50cyB0byBhdm9pZCBsZWFrcyBpbiBJRVxuXHRmcmFnbWVudC5yZW1vdmVDaGlsZCggZGl2ICk7XG5cdGFsbCA9IGEgPSBzZWxlY3QgPSBvcHQgPSBpbnB1dCA9IGZyYWdtZW50ID0gZGl2ID0gbnVsbDtcblxuXHRyZXR1cm4gc3VwcG9ydDtcbn0pKCk7XG52YXIgcmJyYWNlID0gLyg/Olxce1tcXHNcXFNdKlxcfXxcXFtbXFxzXFxTXSpcXF0pJC8sXG5cdHJtdWx0aURhc2ggPSAvKFtBLVpdKS9nO1xuXG5qUXVlcnkuZXh0ZW5kKHtcblx0Y2FjaGU6IHt9LFxuXG5cdGRlbGV0ZWRJZHM6IFtdLFxuXG5cdC8vIFBsZWFzZSB1c2Ugd2l0aCBjYXV0aW9uXG5cdHV1aWQ6IDAsXG5cblx0Ly8gVW5pcXVlIGZvciBlYWNoIGNvcHkgb2YgalF1ZXJ5IG9uIHRoZSBwYWdlXG5cdC8vIE5vbi1kaWdpdHMgcmVtb3ZlZCB0byBtYXRjaCByaW5saW5lalF1ZXJ5XG5cdGV4cGFuZG86IFwialF1ZXJ5XCIgKyAoIGpRdWVyeS5mbi5qcXVlcnkgKyBNYXRoLnJhbmRvbSgpICkucmVwbGFjZSggL1xcRC9nLCBcIlwiICksXG5cblx0Ly8gVGhlIGZvbGxvd2luZyBlbGVtZW50cyB0aHJvdyB1bmNhdGNoYWJsZSBleGNlcHRpb25zIGlmIHlvdVxuXHQvLyBhdHRlbXB0IHRvIGFkZCBleHBhbmRvIHByb3BlcnRpZXMgdG8gdGhlbS5cblx0bm9EYXRhOiB7XG5cdFx0XCJlbWJlZFwiOiB0cnVlLFxuXHRcdC8vIEJhbiBhbGwgb2JqZWN0cyBleGNlcHQgZm9yIEZsYXNoICh3aGljaCBoYW5kbGUgZXhwYW5kb3MpXG5cdFx0XCJvYmplY3RcIjogXCJjbHNpZDpEMjdDREI2RS1BRTZELTExY2YtOTZCOC00NDQ1NTM1NDAwMDBcIixcblx0XHRcImFwcGxldFwiOiB0cnVlXG5cdH0sXG5cblx0aGFzRGF0YTogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0ZWxlbSA9IGVsZW0ubm9kZVR5cGUgPyBqUXVlcnkuY2FjaGVbIGVsZW1balF1ZXJ5LmV4cGFuZG9dIF0gOiBlbGVtWyBqUXVlcnkuZXhwYW5kbyBdO1xuXHRcdHJldHVybiAhIWVsZW0gJiYgIWlzRW1wdHlEYXRhT2JqZWN0KCBlbGVtICk7XG5cdH0sXG5cblx0ZGF0YTogZnVuY3Rpb24oIGVsZW0sIG5hbWUsIGRhdGEsIHB2dCAvKiBJbnRlcm5hbCBVc2UgT25seSAqLyApIHtcblx0XHRpZiAoICFqUXVlcnkuYWNjZXB0RGF0YSggZWxlbSApICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciB0aGlzQ2FjaGUsIHJldCxcblx0XHRcdGludGVybmFsS2V5ID0galF1ZXJ5LmV4cGFuZG8sXG5cdFx0XHRnZXRCeU5hbWUgPSB0eXBlb2YgbmFtZSA9PT0gXCJzdHJpbmdcIixcblxuXHRcdFx0Ly8gV2UgaGF2ZSB0byBoYW5kbGUgRE9NIG5vZGVzIGFuZCBKUyBvYmplY3RzIGRpZmZlcmVudGx5IGJlY2F1c2UgSUU2LTdcblx0XHRcdC8vIGNhbid0IEdDIG9iamVjdCByZWZlcmVuY2VzIHByb3Blcmx5IGFjcm9zcyB0aGUgRE9NLUpTIGJvdW5kYXJ5XG5cdFx0XHRpc05vZGUgPSBlbGVtLm5vZGVUeXBlLFxuXG5cdFx0XHQvLyBPbmx5IERPTSBub2RlcyBuZWVkIHRoZSBnbG9iYWwgalF1ZXJ5IGNhY2hlOyBKUyBvYmplY3QgZGF0YSBpc1xuXHRcdFx0Ly8gYXR0YWNoZWQgZGlyZWN0bHkgdG8gdGhlIG9iamVjdCBzbyBHQyBjYW4gb2NjdXIgYXV0b21hdGljYWxseVxuXHRcdFx0Y2FjaGUgPSBpc05vZGUgPyBqUXVlcnkuY2FjaGUgOiBlbGVtLFxuXG5cdFx0XHQvLyBPbmx5IGRlZmluaW5nIGFuIElEIGZvciBKUyBvYmplY3RzIGlmIGl0cyBjYWNoZSBhbHJlYWR5IGV4aXN0cyBhbGxvd3Ncblx0XHRcdC8vIHRoZSBjb2RlIHRvIHNob3J0Y3V0IG9uIHRoZSBzYW1lIHBhdGggYXMgYSBET00gbm9kZSB3aXRoIG5vIGNhY2hlXG5cdFx0XHRpZCA9IGlzTm9kZSA/IGVsZW1bIGludGVybmFsS2V5IF0gOiBlbGVtWyBpbnRlcm5hbEtleSBdICYmIGludGVybmFsS2V5O1xuXG5cdFx0Ly8gQXZvaWQgZG9pbmcgYW55IG1vcmUgd29yayB0aGFuIHdlIG5lZWQgdG8gd2hlbiB0cnlpbmcgdG8gZ2V0IGRhdGEgb24gYW5cblx0XHQvLyBvYmplY3QgdGhhdCBoYXMgbm8gZGF0YSBhdCBhbGxcblx0XHRpZiAoICghaWQgfHwgIWNhY2hlW2lkXSB8fCAoIXB2dCAmJiAhY2FjaGVbaWRdLmRhdGEpKSAmJiBnZXRCeU5hbWUgJiYgZGF0YSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICggIWlkICkge1xuXHRcdFx0Ly8gT25seSBET00gbm9kZXMgbmVlZCBhIG5ldyB1bmlxdWUgSUQgZm9yIGVhY2ggZWxlbWVudCBzaW5jZSB0aGVpciBkYXRhXG5cdFx0XHQvLyBlbmRzIHVwIGluIHRoZSBnbG9iYWwgY2FjaGVcblx0XHRcdGlmICggaXNOb2RlICkge1xuXHRcdFx0XHRlbGVtWyBpbnRlcm5hbEtleSBdID0gaWQgPSBqUXVlcnkuZGVsZXRlZElkcy5wb3AoKSB8fCArK2pRdWVyeS51dWlkO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWQgPSBpbnRlcm5hbEtleTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoICFjYWNoZVsgaWQgXSApIHtcblx0XHRcdGNhY2hlWyBpZCBdID0ge307XG5cblx0XHRcdC8vIEF2b2lkcyBleHBvc2luZyBqUXVlcnkgbWV0YWRhdGEgb24gcGxhaW4gSlMgb2JqZWN0cyB3aGVuIHRoZSBvYmplY3Rcblx0XHRcdC8vIGlzIHNlcmlhbGl6ZWQgdXNpbmcgSlNPTi5zdHJpbmdpZnlcblx0XHRcdGlmICggIWlzTm9kZSApIHtcblx0XHRcdFx0Y2FjaGVbIGlkIF0udG9KU09OID0galF1ZXJ5Lm5vb3A7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gQW4gb2JqZWN0IGNhbiBiZSBwYXNzZWQgdG8galF1ZXJ5LmRhdGEgaW5zdGVhZCBvZiBhIGtleS92YWx1ZSBwYWlyOyB0aGlzIGdldHNcblx0XHQvLyBzaGFsbG93IGNvcGllZCBvdmVyIG9udG8gdGhlIGV4aXN0aW5nIGNhY2hlXG5cdFx0aWYgKCB0eXBlb2YgbmFtZSA9PT0gXCJvYmplY3RcIiB8fCB0eXBlb2YgbmFtZSA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0aWYgKCBwdnQgKSB7XG5cdFx0XHRcdGNhY2hlWyBpZCBdID0galF1ZXJ5LmV4dGVuZCggY2FjaGVbIGlkIF0sIG5hbWUgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNhY2hlWyBpZCBdLmRhdGEgPSBqUXVlcnkuZXh0ZW5kKCBjYWNoZVsgaWQgXS5kYXRhLCBuYW1lICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpc0NhY2hlID0gY2FjaGVbIGlkIF07XG5cblx0XHQvLyBqUXVlcnkgZGF0YSgpIGlzIHN0b3JlZCBpbiBhIHNlcGFyYXRlIG9iamVjdCBpbnNpZGUgdGhlIG9iamVjdCdzIGludGVybmFsIGRhdGFcblx0XHQvLyBjYWNoZSBpbiBvcmRlciB0byBhdm9pZCBrZXkgY29sbGlzaW9ucyBiZXR3ZWVuIGludGVybmFsIGRhdGEgYW5kIHVzZXItZGVmaW5lZFxuXHRcdC8vIGRhdGEuXG5cdFx0aWYgKCAhcHZ0ICkge1xuXHRcdFx0aWYgKCAhdGhpc0NhY2hlLmRhdGEgKSB7XG5cdFx0XHRcdHRoaXNDYWNoZS5kYXRhID0ge307XG5cdFx0XHR9XG5cblx0XHRcdHRoaXNDYWNoZSA9IHRoaXNDYWNoZS5kYXRhO1xuXHRcdH1cblxuXHRcdGlmICggZGF0YSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0dGhpc0NhY2hlWyBqUXVlcnkuY2FtZWxDYXNlKCBuYW1lICkgXSA9IGRhdGE7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgZm9yIGJvdGggY29udmVydGVkLXRvLWNhbWVsIGFuZCBub24tY29udmVydGVkIGRhdGEgcHJvcGVydHkgbmFtZXNcblx0XHQvLyBJZiBhIGRhdGEgcHJvcGVydHkgd2FzIHNwZWNpZmllZFxuXHRcdGlmICggZ2V0QnlOYW1lICkge1xuXG5cdFx0XHQvLyBGaXJzdCBUcnkgdG8gZmluZCBhcy1pcyBwcm9wZXJ0eSBkYXRhXG5cdFx0XHRyZXQgPSB0aGlzQ2FjaGVbIG5hbWUgXTtcblxuXHRcdFx0Ly8gVGVzdCBmb3IgbnVsbHx1bmRlZmluZWQgcHJvcGVydHkgZGF0YVxuXHRcdFx0aWYgKCByZXQgPT0gbnVsbCApIHtcblxuXHRcdFx0XHQvLyBUcnkgdG8gZmluZCB0aGUgY2FtZWxDYXNlZCBwcm9wZXJ0eVxuXHRcdFx0XHRyZXQgPSB0aGlzQ2FjaGVbIGpRdWVyeS5jYW1lbENhc2UoIG5hbWUgKSBdO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXQgPSB0aGlzQ2FjaGU7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJldDtcblx0fSxcblxuXHRyZW1vdmVEYXRhOiBmdW5jdGlvbiggZWxlbSwgbmFtZSwgcHZ0IC8qIEludGVybmFsIFVzZSBPbmx5ICovICkge1xuXHRcdGlmICggIWpRdWVyeS5hY2NlcHREYXRhKCBlbGVtICkgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIHRoaXNDYWNoZSwgaSwgbCxcblxuXHRcdFx0aXNOb2RlID0gZWxlbS5ub2RlVHlwZSxcblxuXHRcdFx0Ly8gU2VlIGpRdWVyeS5kYXRhIGZvciBtb3JlIGluZm9ybWF0aW9uXG5cdFx0XHRjYWNoZSA9IGlzTm9kZSA/IGpRdWVyeS5jYWNoZSA6IGVsZW0sXG5cdFx0XHRpZCA9IGlzTm9kZSA/IGVsZW1bIGpRdWVyeS5leHBhbmRvIF0gOiBqUXVlcnkuZXhwYW5kbztcblxuXHRcdC8vIElmIHRoZXJlIGlzIGFscmVhZHkgbm8gY2FjaGUgZW50cnkgZm9yIHRoaXMgb2JqZWN0LCB0aGVyZSBpcyBub1xuXHRcdC8vIHB1cnBvc2UgaW4gY29udGludWluZ1xuXHRcdGlmICggIWNhY2hlWyBpZCBdICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICggbmFtZSApIHtcblxuXHRcdFx0dGhpc0NhY2hlID0gcHZ0ID8gY2FjaGVbIGlkIF0gOiBjYWNoZVsgaWQgXS5kYXRhO1xuXG5cdFx0XHRpZiAoIHRoaXNDYWNoZSApIHtcblxuXHRcdFx0XHQvLyBTdXBwb3J0IGFycmF5IG9yIHNwYWNlIHNlcGFyYXRlZCBzdHJpbmcgbmFtZXMgZm9yIGRhdGEga2V5c1xuXHRcdFx0XHRpZiAoICFqUXVlcnkuaXNBcnJheSggbmFtZSApICkge1xuXG5cdFx0XHRcdFx0Ly8gdHJ5IHRoZSBzdHJpbmcgYXMgYSBrZXkgYmVmb3JlIGFueSBtYW5pcHVsYXRpb25cblx0XHRcdFx0XHRpZiAoIG5hbWUgaW4gdGhpc0NhY2hlICkge1xuXHRcdFx0XHRcdFx0bmFtZSA9IFsgbmFtZSBdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0XHRcdC8vIHNwbGl0IHRoZSBjYW1lbCBjYXNlZCB2ZXJzaW9uIGJ5IHNwYWNlcyB1bmxlc3MgYSBrZXkgd2l0aCB0aGUgc3BhY2VzIGV4aXN0c1xuXHRcdFx0XHRcdFx0bmFtZSA9IGpRdWVyeS5jYW1lbENhc2UoIG5hbWUgKTtcblx0XHRcdFx0XHRcdGlmICggbmFtZSBpbiB0aGlzQ2FjaGUgKSB7XG5cdFx0XHRcdFx0XHRcdG5hbWUgPSBbIG5hbWUgXTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdG5hbWUgPSBuYW1lLnNwbGl0KFwiIFwiKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IgKCBpID0gMCwgbCA9IG5hbWUubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0XHRcdGRlbGV0ZSB0aGlzQ2FjaGVbIG5hbWVbaV0gXTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIElmIHRoZXJlIGlzIG5vIGRhdGEgbGVmdCBpbiB0aGUgY2FjaGUsIHdlIHdhbnQgdG8gY29udGludWVcblx0XHRcdFx0Ly8gYW5kIGxldCB0aGUgY2FjaGUgb2JqZWN0IGl0c2VsZiBnZXQgZGVzdHJveWVkXG5cdFx0XHRcdGlmICggISggcHZ0ID8gaXNFbXB0eURhdGFPYmplY3QgOiBqUXVlcnkuaXNFbXB0eU9iamVjdCApKCB0aGlzQ2FjaGUgKSApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTZWUgalF1ZXJ5LmRhdGEgZm9yIG1vcmUgaW5mb3JtYXRpb25cblx0XHRpZiAoICFwdnQgKSB7XG5cdFx0XHRkZWxldGUgY2FjaGVbIGlkIF0uZGF0YTtcblxuXHRcdFx0Ly8gRG9uJ3QgZGVzdHJveSB0aGUgcGFyZW50IGNhY2hlIHVubGVzcyB0aGUgaW50ZXJuYWwgZGF0YSBvYmplY3Rcblx0XHRcdC8vIGhhZCBiZWVuIHRoZSBvbmx5IHRoaW5nIGxlZnQgaW4gaXRcblx0XHRcdGlmICggIWlzRW1wdHlEYXRhT2JqZWN0KCBjYWNoZVsgaWQgXSApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gRGVzdHJveSB0aGUgY2FjaGVcblx0XHRpZiAoIGlzTm9kZSApIHtcblx0XHRcdGpRdWVyeS5jbGVhbkRhdGEoIFsgZWxlbSBdLCB0cnVlICk7XG5cblx0XHQvLyBVc2UgZGVsZXRlIHdoZW4gc3VwcG9ydGVkIGZvciBleHBhbmRvcyBvciBgY2FjaGVgIGlzIG5vdCBhIHdpbmRvdyBwZXIgaXNXaW5kb3cgKCMxMDA4MClcblx0XHR9IGVsc2UgaWYgKCBqUXVlcnkuc3VwcG9ydC5kZWxldGVFeHBhbmRvIHx8IGNhY2hlICE9IGNhY2hlLndpbmRvdyApIHtcblx0XHRcdGRlbGV0ZSBjYWNoZVsgaWQgXTtcblxuXHRcdC8vIFdoZW4gYWxsIGVsc2UgZmFpbHMsIG51bGxcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y2FjaGVbIGlkIF0gPSBudWxsO1xuXHRcdH1cblx0fSxcblxuXHQvLyBGb3IgaW50ZXJuYWwgdXNlIG9ubHkuXG5cdF9kYXRhOiBmdW5jdGlvbiggZWxlbSwgbmFtZSwgZGF0YSApIHtcblx0XHRyZXR1cm4galF1ZXJ5LmRhdGEoIGVsZW0sIG5hbWUsIGRhdGEsIHRydWUgKTtcblx0fSxcblxuXHQvLyBBIG1ldGhvZCBmb3IgZGV0ZXJtaW5pbmcgaWYgYSBET00gbm9kZSBjYW4gaGFuZGxlIHRoZSBkYXRhIGV4cGFuZG9cblx0YWNjZXB0RGF0YTogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0dmFyIG5vRGF0YSA9IGVsZW0ubm9kZU5hbWUgJiYgalF1ZXJ5Lm5vRGF0YVsgZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpIF07XG5cblx0XHQvLyBub2RlcyBhY2NlcHQgZGF0YSB1bmxlc3Mgb3RoZXJ3aXNlIHNwZWNpZmllZDsgcmVqZWN0aW9uIGNhbiBiZSBjb25kaXRpb25hbFxuXHRcdHJldHVybiAhbm9EYXRhIHx8IG5vRGF0YSAhPT0gdHJ1ZSAmJiBlbGVtLmdldEF0dHJpYnV0ZShcImNsYXNzaWRcIikgPT09IG5vRGF0YTtcblx0fVxufSk7XG5cbmpRdWVyeS5mbi5leHRlbmQoe1xuXHRkYXRhOiBmdW5jdGlvbigga2V5LCB2YWx1ZSApIHtcblx0XHR2YXIgcGFydHMsIHBhcnQsIGF0dHIsIG5hbWUsIGwsXG5cdFx0XHRlbGVtID0gdGhpc1swXSxcblx0XHRcdGkgPSAwLFxuXHRcdFx0ZGF0YSA9IG51bGw7XG5cblx0XHQvLyBHZXRzIGFsbCB2YWx1ZXNcblx0XHRpZiAoIGtleSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0aWYgKCB0aGlzLmxlbmd0aCApIHtcblx0XHRcdFx0ZGF0YSA9IGpRdWVyeS5kYXRhKCBlbGVtICk7XG5cblx0XHRcdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAxICYmICFqUXVlcnkuX2RhdGEoIGVsZW0sIFwicGFyc2VkQXR0cnNcIiApICkge1xuXHRcdFx0XHRcdGF0dHIgPSBlbGVtLmF0dHJpYnV0ZXM7XG5cdFx0XHRcdFx0Zm9yICggbCA9IGF0dHIubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0XHRcdFx0bmFtZSA9IGF0dHJbaV0ubmFtZTtcblxuXHRcdFx0XHRcdFx0aWYgKCBuYW1lLmluZGV4T2YoIFwiZGF0YS1cIiApID09PSAwICkge1xuXHRcdFx0XHRcdFx0XHRuYW1lID0galF1ZXJ5LmNhbWVsQ2FzZSggbmFtZS5zdWJzdHJpbmcoNSkgKTtcblxuXHRcdFx0XHRcdFx0XHRkYXRhQXR0ciggZWxlbSwgbmFtZSwgZGF0YVsgbmFtZSBdICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGpRdWVyeS5fZGF0YSggZWxlbSwgXCJwYXJzZWRBdHRyc1wiLCB0cnVlICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fVxuXG5cdFx0Ly8gU2V0cyBtdWx0aXBsZSB2YWx1ZXNcblx0XHRpZiAoIHR5cGVvZiBrZXkgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRqUXVlcnkuZGF0YSggdGhpcywga2V5ICk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRwYXJ0cyA9IGtleS5zcGxpdCggXCIuXCIsIDIgKTtcblx0XHRwYXJ0c1sxXSA9IHBhcnRzWzFdID8gXCIuXCIgKyBwYXJ0c1sxXSA6IFwiXCI7XG5cdFx0cGFydCA9IHBhcnRzWzFdICsgXCIhXCI7XG5cblx0XHRyZXR1cm4galF1ZXJ5LmFjY2VzcyggdGhpcywgZnVuY3Rpb24oIHZhbHVlICkge1xuXG5cdFx0XHRpZiAoIHZhbHVlID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdGRhdGEgPSB0aGlzLnRyaWdnZXJIYW5kbGVyKCBcImdldERhdGFcIiArIHBhcnQsIFsgcGFydHNbMF0gXSApO1xuXG5cdFx0XHRcdC8vIFRyeSB0byBmZXRjaCBhbnkgaW50ZXJuYWxseSBzdG9yZWQgZGF0YSBmaXJzdFxuXHRcdFx0XHRpZiAoIGRhdGEgPT09IHVuZGVmaW5lZCAmJiBlbGVtICkge1xuXHRcdFx0XHRcdGRhdGEgPSBqUXVlcnkuZGF0YSggZWxlbSwga2V5ICk7XG5cdFx0XHRcdFx0ZGF0YSA9IGRhdGFBdHRyKCBlbGVtLCBrZXksIGRhdGEgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBkYXRhID09PSB1bmRlZmluZWQgJiYgcGFydHNbMV0gP1xuXHRcdFx0XHRcdHRoaXMuZGF0YSggcGFydHNbMF0gKSA6XG5cdFx0XHRcdFx0ZGF0YTtcblx0XHRcdH1cblxuXHRcdFx0cGFydHNbMV0gPSB2YWx1ZTtcblx0XHRcdHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHNlbGYgPSBqUXVlcnkoIHRoaXMgKTtcblxuXHRcdFx0XHRzZWxmLnRyaWdnZXJIYW5kbGVyKCBcInNldERhdGFcIiArIHBhcnQsIHBhcnRzICk7XG5cdFx0XHRcdGpRdWVyeS5kYXRhKCB0aGlzLCBrZXksIHZhbHVlICk7XG5cdFx0XHRcdHNlbGYudHJpZ2dlckhhbmRsZXIoIFwiY2hhbmdlRGF0YVwiICsgcGFydCwgcGFydHMgKTtcblx0XHRcdH0pO1xuXHRcdH0sIG51bGwsIHZhbHVlLCBhcmd1bWVudHMubGVuZ3RoID4gMSwgbnVsbCwgZmFsc2UgKTtcblx0fSxcblxuXHRyZW1vdmVEYXRhOiBmdW5jdGlvbigga2V5ICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRqUXVlcnkucmVtb3ZlRGF0YSggdGhpcywga2V5ICk7XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5mdW5jdGlvbiBkYXRhQXR0ciggZWxlbSwga2V5LCBkYXRhICkge1xuXHQvLyBJZiBub3RoaW5nIHdhcyBmb3VuZCBpbnRlcm5hbGx5LCB0cnkgdG8gZmV0Y2ggYW55XG5cdC8vIGRhdGEgZnJvbSB0aGUgSFRNTDUgZGF0YS0qIGF0dHJpYnV0ZVxuXHRpZiAoIGRhdGEgPT09IHVuZGVmaW5lZCAmJiBlbGVtLm5vZGVUeXBlID09PSAxICkge1xuXG5cdFx0dmFyIG5hbWUgPSBcImRhdGEtXCIgKyBrZXkucmVwbGFjZSggcm11bHRpRGFzaCwgXCItJDFcIiApLnRvTG93ZXJDYXNlKCk7XG5cblx0XHRkYXRhID0gZWxlbS5nZXRBdHRyaWJ1dGUoIG5hbWUgKTtcblxuXHRcdGlmICggdHlwZW9mIGRhdGEgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRkYXRhID0gZGF0YSA9PT0gXCJ0cnVlXCIgPyB0cnVlIDpcblx0XHRcdFx0ZGF0YSA9PT0gXCJmYWxzZVwiID8gZmFsc2UgOlxuXHRcdFx0XHRkYXRhID09PSBcIm51bGxcIiA/IG51bGwgOlxuXHRcdFx0XHQvLyBPbmx5IGNvbnZlcnQgdG8gYSBudW1iZXIgaWYgaXQgZG9lc24ndCBjaGFuZ2UgdGhlIHN0cmluZ1xuXHRcdFx0XHQrZGF0YSArIFwiXCIgPT09IGRhdGEgPyArZGF0YSA6XG5cdFx0XHRcdHJicmFjZS50ZXN0KCBkYXRhICkgPyBqUXVlcnkucGFyc2VKU09OKCBkYXRhICkgOlxuXHRcdFx0XHRcdGRhdGE7XG5cdFx0XHR9IGNhdGNoKCBlICkge31cblxuXHRcdFx0Ly8gTWFrZSBzdXJlIHdlIHNldCB0aGUgZGF0YSBzbyBpdCBpc24ndCBjaGFuZ2VkIGxhdGVyXG5cdFx0XHRqUXVlcnkuZGF0YSggZWxlbSwga2V5LCBkYXRhICk7XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0ZGF0YSA9IHVuZGVmaW5lZDtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZGF0YTtcbn1cblxuLy8gY2hlY2tzIGEgY2FjaGUgb2JqZWN0IGZvciBlbXB0aW5lc3NcbmZ1bmN0aW9uIGlzRW1wdHlEYXRhT2JqZWN0KCBvYmogKSB7XG5cdHZhciBuYW1lO1xuXHRmb3IgKCBuYW1lIGluIG9iaiApIHtcblxuXHRcdC8vIGlmIHRoZSBwdWJsaWMgZGF0YSBvYmplY3QgaXMgZW1wdHksIHRoZSBwcml2YXRlIGlzIHN0aWxsIGVtcHR5XG5cdFx0aWYgKCBuYW1lID09PSBcImRhdGFcIiAmJiBqUXVlcnkuaXNFbXB0eU9iamVjdCggb2JqW25hbWVdICkgKSB7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cdFx0aWYgKCBuYW1lICE9PSBcInRvSlNPTlwiICkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0cnVlO1xufVxualF1ZXJ5LmV4dGVuZCh7XG5cdHF1ZXVlOiBmdW5jdGlvbiggZWxlbSwgdHlwZSwgZGF0YSApIHtcblx0XHR2YXIgcXVldWU7XG5cblx0XHRpZiAoIGVsZW0gKSB7XG5cdFx0XHR0eXBlID0gKCB0eXBlIHx8IFwiZnhcIiApICsgXCJxdWV1ZVwiO1xuXHRcdFx0cXVldWUgPSBqUXVlcnkuX2RhdGEoIGVsZW0sIHR5cGUgKTtcblxuXHRcdFx0Ly8gU3BlZWQgdXAgZGVxdWV1ZSBieSBnZXR0aW5nIG91dCBxdWlja2x5IGlmIHRoaXMgaXMganVzdCBhIGxvb2t1cFxuXHRcdFx0aWYgKCBkYXRhICkge1xuXHRcdFx0XHRpZiAoICFxdWV1ZSB8fCBqUXVlcnkuaXNBcnJheShkYXRhKSApIHtcblx0XHRcdFx0XHRxdWV1ZSA9IGpRdWVyeS5fZGF0YSggZWxlbSwgdHlwZSwgalF1ZXJ5Lm1ha2VBcnJheShkYXRhKSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHF1ZXVlLnB1c2goIGRhdGEgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHF1ZXVlIHx8IFtdO1xuXHRcdH1cblx0fSxcblxuXHRkZXF1ZXVlOiBmdW5jdGlvbiggZWxlbSwgdHlwZSApIHtcblx0XHR0eXBlID0gdHlwZSB8fCBcImZ4XCI7XG5cblx0XHR2YXIgcXVldWUgPSBqUXVlcnkucXVldWUoIGVsZW0sIHR5cGUgKSxcblx0XHRcdHN0YXJ0TGVuZ3RoID0gcXVldWUubGVuZ3RoLFxuXHRcdFx0Zm4gPSBxdWV1ZS5zaGlmdCgpLFxuXHRcdFx0aG9va3MgPSBqUXVlcnkuX3F1ZXVlSG9va3MoIGVsZW0sIHR5cGUgKSxcblx0XHRcdG5leHQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0alF1ZXJ5LmRlcXVldWUoIGVsZW0sIHR5cGUgKTtcblx0XHRcdH07XG5cblx0XHQvLyBJZiB0aGUgZnggcXVldWUgaXMgZGVxdWV1ZWQsIGFsd2F5cyByZW1vdmUgdGhlIHByb2dyZXNzIHNlbnRpbmVsXG5cdFx0aWYgKCBmbiA9PT0gXCJpbnByb2dyZXNzXCIgKSB7XG5cdFx0XHRmbiA9IHF1ZXVlLnNoaWZ0KCk7XG5cdFx0XHRzdGFydExlbmd0aC0tO1xuXHRcdH1cblxuXHRcdGlmICggZm4gKSB7XG5cblx0XHRcdC8vIEFkZCBhIHByb2dyZXNzIHNlbnRpbmVsIHRvIHByZXZlbnQgdGhlIGZ4IHF1ZXVlIGZyb20gYmVpbmdcblx0XHRcdC8vIGF1dG9tYXRpY2FsbHkgZGVxdWV1ZWRcblx0XHRcdGlmICggdHlwZSA9PT0gXCJmeFwiICkge1xuXHRcdFx0XHRxdWV1ZS51bnNoaWZ0KCBcImlucHJvZ3Jlc3NcIiApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBjbGVhciB1cCB0aGUgbGFzdCBxdWV1ZSBzdG9wIGZ1bmN0aW9uXG5cdFx0XHRkZWxldGUgaG9va3Muc3RvcDtcblx0XHRcdGZuLmNhbGwoIGVsZW0sIG5leHQsIGhvb2tzICk7XG5cdFx0fVxuXG5cdFx0aWYgKCAhc3RhcnRMZW5ndGggJiYgaG9va3MgKSB7XG5cdFx0XHRob29rcy5lbXB0eS5maXJlKCk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIG5vdCBpbnRlbmRlZCBmb3IgcHVibGljIGNvbnN1bXB0aW9uIC0gZ2VuZXJhdGVzIGEgcXVldWVIb29rcyBvYmplY3QsIG9yIHJldHVybnMgdGhlIGN1cnJlbnQgb25lXG5cdF9xdWV1ZUhvb2tzOiBmdW5jdGlvbiggZWxlbSwgdHlwZSApIHtcblx0XHR2YXIga2V5ID0gdHlwZSArIFwicXVldWVIb29rc1wiO1xuXHRcdHJldHVybiBqUXVlcnkuX2RhdGEoIGVsZW0sIGtleSApIHx8IGpRdWVyeS5fZGF0YSggZWxlbSwga2V5LCB7XG5cdFx0XHRlbXB0eTogalF1ZXJ5LkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLmFkZChmdW5jdGlvbigpIHtcblx0XHRcdFx0alF1ZXJ5LnJlbW92ZURhdGEoIGVsZW0sIHR5cGUgKyBcInF1ZXVlXCIsIHRydWUgKTtcblx0XHRcdFx0alF1ZXJ5LnJlbW92ZURhdGEoIGVsZW0sIGtleSwgdHJ1ZSApO1xuXHRcdFx0fSlcblx0XHR9KTtcblx0fVxufSk7XG5cbmpRdWVyeS5mbi5leHRlbmQoe1xuXHRxdWV1ZTogZnVuY3Rpb24oIHR5cGUsIGRhdGEgKSB7XG5cdFx0dmFyIHNldHRlciA9IDI7XG5cblx0XHRpZiAoIHR5cGVvZiB0eXBlICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0ZGF0YSA9IHR5cGU7XG5cdFx0XHR0eXBlID0gXCJmeFwiO1xuXHRcdFx0c2V0dGVyLS07XG5cdFx0fVxuXG5cdFx0aWYgKCBhcmd1bWVudHMubGVuZ3RoIDwgc2V0dGVyICkge1xuXHRcdFx0cmV0dXJuIGpRdWVyeS5xdWV1ZSggdGhpc1swXSwgdHlwZSApO1xuXHRcdH1cblxuXHRcdHJldHVybiBkYXRhID09PSB1bmRlZmluZWQgP1xuXHRcdFx0dGhpcyA6XG5cdFx0XHR0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBxdWV1ZSA9IGpRdWVyeS5xdWV1ZSggdGhpcywgdHlwZSwgZGF0YSApO1xuXG5cdFx0XHRcdC8vIGVuc3VyZSBhIGhvb2tzIGZvciB0aGlzIHF1ZXVlXG5cdFx0XHRcdGpRdWVyeS5fcXVldWVIb29rcyggdGhpcywgdHlwZSApO1xuXG5cdFx0XHRcdGlmICggdHlwZSA9PT0gXCJmeFwiICYmIHF1ZXVlWzBdICE9PSBcImlucHJvZ3Jlc3NcIiApIHtcblx0XHRcdFx0XHRqUXVlcnkuZGVxdWV1ZSggdGhpcywgdHlwZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0fSxcblx0ZGVxdWV1ZTogZnVuY3Rpb24oIHR5cGUgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdGpRdWVyeS5kZXF1ZXVlKCB0aGlzLCB0eXBlICk7XG5cdFx0fSk7XG5cdH0sXG5cdC8vIEJhc2VkIG9mZiBvZiB0aGUgcGx1Z2luIGJ5IENsaW50IEhlbGZlcnMsIHdpdGggcGVybWlzc2lvbi5cblx0Ly8gaHR0cDovL2JsaW5kc2lnbmFscy5jb20vaW5kZXgucGhwLzIwMDkvMDcvanF1ZXJ5LWRlbGF5L1xuXHRkZWxheTogZnVuY3Rpb24oIHRpbWUsIHR5cGUgKSB7XG5cdFx0dGltZSA9IGpRdWVyeS5meCA/IGpRdWVyeS5meC5zcGVlZHNbIHRpbWUgXSB8fCB0aW1lIDogdGltZTtcblx0XHR0eXBlID0gdHlwZSB8fCBcImZ4XCI7XG5cblx0XHRyZXR1cm4gdGhpcy5xdWV1ZSggdHlwZSwgZnVuY3Rpb24oIG5leHQsIGhvb2tzICkge1xuXHRcdFx0dmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KCBuZXh0LCB0aW1lICk7XG5cdFx0XHRob29rcy5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNsZWFyVGltZW91dCggdGltZW91dCApO1xuXHRcdFx0fTtcblx0XHR9KTtcblx0fSxcblx0Y2xlYXJRdWV1ZTogZnVuY3Rpb24oIHR5cGUgKSB7XG5cdFx0cmV0dXJuIHRoaXMucXVldWUoIHR5cGUgfHwgXCJmeFwiLCBbXSApO1xuXHR9LFxuXHQvLyBHZXQgYSBwcm9taXNlIHJlc29sdmVkIHdoZW4gcXVldWVzIG9mIGEgY2VydGFpbiB0eXBlXG5cdC8vIGFyZSBlbXB0aWVkIChmeCBpcyB0aGUgdHlwZSBieSBkZWZhdWx0KVxuXHRwcm9taXNlOiBmdW5jdGlvbiggdHlwZSwgb2JqICkge1xuXHRcdHZhciB0bXAsXG5cdFx0XHRjb3VudCA9IDEsXG5cdFx0XHRkZWZlciA9IGpRdWVyeS5EZWZlcnJlZCgpLFxuXHRcdFx0ZWxlbWVudHMgPSB0aGlzLFxuXHRcdFx0aSA9IHRoaXMubGVuZ3RoLFxuXHRcdFx0cmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoICEoIC0tY291bnQgKSApIHtcblx0XHRcdFx0XHRkZWZlci5yZXNvbHZlV2l0aCggZWxlbWVudHMsIFsgZWxlbWVudHMgXSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0aWYgKCB0eXBlb2YgdHlwZSAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdG9iaiA9IHR5cGU7XG5cdFx0XHR0eXBlID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHR0eXBlID0gdHlwZSB8fCBcImZ4XCI7XG5cblx0XHR3aGlsZSggaS0tICkge1xuXHRcdFx0dG1wID0galF1ZXJ5Ll9kYXRhKCBlbGVtZW50c1sgaSBdLCB0eXBlICsgXCJxdWV1ZUhvb2tzXCIgKTtcblx0XHRcdGlmICggdG1wICYmIHRtcC5lbXB0eSApIHtcblx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0dG1wLmVtcHR5LmFkZCggcmVzb2x2ZSApO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXNvbHZlKCk7XG5cdFx0cmV0dXJuIGRlZmVyLnByb21pc2UoIG9iaiApO1xuXHR9XG59KTtcbnZhciBub2RlSG9vaywgYm9vbEhvb2ssIGZpeFNwZWNpZmllZCxcblx0cmNsYXNzID0gL1tcXHRcXHJcXG5dL2csXG5cdHJyZXR1cm4gPSAvXFxyL2csXG5cdHJ0eXBlID0gL14oPzpidXR0b258aW5wdXQpJC9pLFxuXHRyZm9jdXNhYmxlID0gL14oPzpidXR0b258aW5wdXR8b2JqZWN0fHNlbGVjdHx0ZXh0YXJlYSkkL2ksXG5cdHJjbGlja2FibGUgPSAvXmEoPzpyZWF8KSQvaSxcblx0cmJvb2xlYW4gPSAvXig/OmF1dG9mb2N1c3xhdXRvcGxheXxhc3luY3xjaGVja2VkfGNvbnRyb2xzfGRlZmVyfGRpc2FibGVkfGhpZGRlbnxsb29wfG11bHRpcGxlfG9wZW58cmVhZG9ubHl8cmVxdWlyZWR8c2NvcGVkfHNlbGVjdGVkKSQvaSxcblx0Z2V0U2V0QXR0cmlidXRlID0galF1ZXJ5LnN1cHBvcnQuZ2V0U2V0QXR0cmlidXRlO1xuXG5qUXVlcnkuZm4uZXh0ZW5kKHtcblx0YXR0cjogZnVuY3Rpb24oIG5hbWUsIHZhbHVlICkge1xuXHRcdHJldHVybiBqUXVlcnkuYWNjZXNzKCB0aGlzLCBqUXVlcnkuYXR0ciwgbmFtZSwgdmFsdWUsIGFyZ3VtZW50cy5sZW5ndGggPiAxICk7XG5cdH0sXG5cblx0cmVtb3ZlQXR0cjogZnVuY3Rpb24oIG5hbWUgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdGpRdWVyeS5yZW1vdmVBdHRyKCB0aGlzLCBuYW1lICk7XG5cdFx0fSk7XG5cdH0sXG5cblx0cHJvcDogZnVuY3Rpb24oIG5hbWUsIHZhbHVlICkge1xuXHRcdHJldHVybiBqUXVlcnkuYWNjZXNzKCB0aGlzLCBqUXVlcnkucHJvcCwgbmFtZSwgdmFsdWUsIGFyZ3VtZW50cy5sZW5ndGggPiAxICk7XG5cdH0sXG5cblx0cmVtb3ZlUHJvcDogZnVuY3Rpb24oIG5hbWUgKSB7XG5cdFx0bmFtZSA9IGpRdWVyeS5wcm9wRml4WyBuYW1lIF0gfHwgbmFtZTtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdHJ5L2NhdGNoIGhhbmRsZXMgY2FzZXMgd2hlcmUgSUUgYmFsa3MgKHN1Y2ggYXMgcmVtb3ZpbmcgYSBwcm9wZXJ0eSBvbiB3aW5kb3cpXG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0aGlzWyBuYW1lIF0gPSB1bmRlZmluZWQ7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzWyBuYW1lIF07XG5cdFx0XHR9IGNhdGNoKCBlICkge31cblx0XHR9KTtcblx0fSxcblxuXHRhZGRDbGFzczogZnVuY3Rpb24oIHZhbHVlICkge1xuXHRcdHZhciBjbGFzc05hbWVzLCBpLCBsLCBlbGVtLFxuXHRcdFx0c2V0Q2xhc3MsIGMsIGNsO1xuXG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggdmFsdWUgKSApIHtcblx0XHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oIGogKSB7XG5cdFx0XHRcdGpRdWVyeSggdGhpcyApLmFkZENsYXNzKCB2YWx1ZS5jYWxsKHRoaXMsIGosIHRoaXMuY2xhc3NOYW1lKSApO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRjbGFzc05hbWVzID0gdmFsdWUuc3BsaXQoIGNvcmVfcnNwYWNlICk7XG5cblx0XHRcdGZvciAoIGkgPSAwLCBsID0gdGhpcy5sZW5ndGg7IGkgPCBsOyBpKysgKSB7XG5cdFx0XHRcdGVsZW0gPSB0aGlzWyBpIF07XG5cblx0XHRcdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAxICkge1xuXHRcdFx0XHRcdGlmICggIWVsZW0uY2xhc3NOYW1lICYmIGNsYXNzTmFtZXMubGVuZ3RoID09PSAxICkge1xuXHRcdFx0XHRcdFx0ZWxlbS5jbGFzc05hbWUgPSB2YWx1ZTtcblxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRzZXRDbGFzcyA9IFwiIFwiICsgZWxlbS5jbGFzc05hbWUgKyBcIiBcIjtcblxuXHRcdFx0XHRcdFx0Zm9yICggYyA9IDAsIGNsID0gY2xhc3NOYW1lcy5sZW5ndGg7IGMgPCBjbDsgYysrICkge1xuXHRcdFx0XHRcdFx0XHRpZiAoICF+c2V0Q2xhc3MuaW5kZXhPZiggXCIgXCIgKyBjbGFzc05hbWVzWyBjIF0gKyBcIiBcIiApICkge1xuXHRcdFx0XHRcdFx0XHRcdHNldENsYXNzICs9IGNsYXNzTmFtZXNbIGMgXSArIFwiIFwiO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbGVtLmNsYXNzTmFtZSA9IGpRdWVyeS50cmltKCBzZXRDbGFzcyApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdHJlbW92ZUNsYXNzOiBmdW5jdGlvbiggdmFsdWUgKSB7XG5cdFx0dmFyIHJlbW92ZXMsIGNsYXNzTmFtZSwgZWxlbSwgYywgY2wsIGksIGw7XG5cblx0XHRpZiAoIGpRdWVyeS5pc0Z1bmN0aW9uKCB2YWx1ZSApICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiggaiApIHtcblx0XHRcdFx0alF1ZXJ5KCB0aGlzICkucmVtb3ZlQ2xhc3MoIHZhbHVlLmNhbGwodGhpcywgaiwgdGhpcy5jbGFzc05hbWUpICk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0aWYgKCAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0cmVtb3ZlcyA9ICggdmFsdWUgfHwgXCJcIiApLnNwbGl0KCBjb3JlX3JzcGFjZSApO1xuXG5cdFx0XHRmb3IgKCBpID0gMCwgbCA9IHRoaXMubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0XHRlbGVtID0gdGhpc1sgaSBdO1xuXHRcdFx0XHRpZiAoIGVsZW0ubm9kZVR5cGUgPT09IDEgJiYgZWxlbS5jbGFzc05hbWUgKSB7XG5cblx0XHRcdFx0XHRjbGFzc05hbWUgPSAoXCIgXCIgKyBlbGVtLmNsYXNzTmFtZSArIFwiIFwiKS5yZXBsYWNlKCByY2xhc3MsIFwiIFwiICk7XG5cblx0XHRcdFx0XHQvLyBsb29wIG92ZXIgZWFjaCBpdGVtIGluIHRoZSByZW1vdmFsIGxpc3Rcblx0XHRcdFx0XHRmb3IgKCBjID0gMCwgY2wgPSByZW1vdmVzLmxlbmd0aDsgYyA8IGNsOyBjKysgKSB7XG5cdFx0XHRcdFx0XHQvLyBSZW1vdmUgdW50aWwgdGhlcmUgaXMgbm90aGluZyB0byByZW1vdmUsXG5cdFx0XHRcdFx0XHR3aGlsZSAoIGNsYXNzTmFtZS5pbmRleE9mKFwiIFwiICsgcmVtb3Zlc1sgYyBdICsgXCIgXCIpID4gLTEgKSB7XG5cdFx0XHRcdFx0XHRcdGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5yZXBsYWNlKCBcIiBcIiArIHJlbW92ZXNbIGMgXSArIFwiIFwiICwgXCIgXCIgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxlbS5jbGFzc05hbWUgPSB2YWx1ZSA/IGpRdWVyeS50cmltKCBjbGFzc05hbWUgKSA6IFwiXCI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHR0b2dnbGVDbGFzczogZnVuY3Rpb24oIHZhbHVlLCBzdGF0ZVZhbCApIHtcblx0XHR2YXIgdHlwZSA9IHR5cGVvZiB2YWx1ZSxcblx0XHRcdGlzQm9vbCA9IHR5cGVvZiBzdGF0ZVZhbCA9PT0gXCJib29sZWFuXCI7XG5cblx0XHRpZiAoIGpRdWVyeS5pc0Z1bmN0aW9uKCB2YWx1ZSApICkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0alF1ZXJ5KCB0aGlzICkudG9nZ2xlQ2xhc3MoIHZhbHVlLmNhbGwodGhpcywgaSwgdGhpcy5jbGFzc05hbWUsIHN0YXRlVmFsKSwgc3RhdGVWYWwgKTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIHR5cGUgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdC8vIHRvZ2dsZSBpbmRpdmlkdWFsIGNsYXNzIG5hbWVzXG5cdFx0XHRcdHZhciBjbGFzc05hbWUsXG5cdFx0XHRcdFx0aSA9IDAsXG5cdFx0XHRcdFx0c2VsZiA9IGpRdWVyeSggdGhpcyApLFxuXHRcdFx0XHRcdHN0YXRlID0gc3RhdGVWYWwsXG5cdFx0XHRcdFx0Y2xhc3NOYW1lcyA9IHZhbHVlLnNwbGl0KCBjb3JlX3JzcGFjZSApO1xuXG5cdFx0XHRcdHdoaWxlICggKGNsYXNzTmFtZSA9IGNsYXNzTmFtZXNbIGkrKyBdKSApIHtcblx0XHRcdFx0XHQvLyBjaGVjayBlYWNoIGNsYXNzTmFtZSBnaXZlbiwgc3BhY2Ugc2VwYXJhdGVkIGxpc3Rcblx0XHRcdFx0XHRzdGF0ZSA9IGlzQm9vbCA/IHN0YXRlIDogIXNlbGYuaGFzQ2xhc3MoIGNsYXNzTmFtZSApO1xuXHRcdFx0XHRcdHNlbGZbIHN0YXRlID8gXCJhZGRDbGFzc1wiIDogXCJyZW1vdmVDbGFzc1wiIF0oIGNsYXNzTmFtZSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0gZWxzZSBpZiAoIHR5cGUgPT09IFwidW5kZWZpbmVkXCIgfHwgdHlwZSA9PT0gXCJib29sZWFuXCIgKSB7XG5cdFx0XHRcdGlmICggdGhpcy5jbGFzc05hbWUgKSB7XG5cdFx0XHRcdFx0Ly8gc3RvcmUgY2xhc3NOYW1lIGlmIHNldFxuXHRcdFx0XHRcdGpRdWVyeS5fZGF0YSggdGhpcywgXCJfX2NsYXNzTmFtZV9fXCIsIHRoaXMuY2xhc3NOYW1lICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyB0b2dnbGUgd2hvbGUgY2xhc3NOYW1lXG5cdFx0XHRcdHRoaXMuY2xhc3NOYW1lID0gdGhpcy5jbGFzc05hbWUgfHwgdmFsdWUgPT09IGZhbHNlID8gXCJcIiA6IGpRdWVyeS5fZGF0YSggdGhpcywgXCJfX2NsYXNzTmFtZV9fXCIgKSB8fCBcIlwiO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdGhhc0NsYXNzOiBmdW5jdGlvbiggc2VsZWN0b3IgKSB7XG5cdFx0dmFyIGNsYXNzTmFtZSA9IFwiIFwiICsgc2VsZWN0b3IgKyBcIiBcIixcblx0XHRcdGkgPSAwLFxuXHRcdFx0bCA9IHRoaXMubGVuZ3RoO1xuXHRcdGZvciAoIDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdGlmICggdGhpc1tpXS5ub2RlVHlwZSA9PT0gMSAmJiAoXCIgXCIgKyB0aGlzW2ldLmNsYXNzTmFtZSArIFwiIFwiKS5yZXBsYWNlKHJjbGFzcywgXCIgXCIpLmluZGV4T2YoIGNsYXNzTmFtZSApID4gLTEgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblxuXHR2YWw6IGZ1bmN0aW9uKCB2YWx1ZSApIHtcblx0XHR2YXIgaG9va3MsIHJldCwgaXNGdW5jdGlvbixcblx0XHRcdGVsZW0gPSB0aGlzWzBdO1xuXG5cdFx0aWYgKCAhYXJndW1lbnRzLmxlbmd0aCApIHtcblx0XHRcdGlmICggZWxlbSApIHtcblx0XHRcdFx0aG9va3MgPSBqUXVlcnkudmFsSG9va3NbIGVsZW0udHlwZSBdIHx8IGpRdWVyeS52YWxIb29rc1sgZWxlbS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpIF07XG5cblx0XHRcdFx0aWYgKCBob29rcyAmJiBcImdldFwiIGluIGhvb2tzICYmIChyZXQgPSBob29rcy5nZXQoIGVsZW0sIFwidmFsdWVcIiApKSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRcdHJldHVybiByZXQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXQgPSBlbGVtLnZhbHVlO1xuXG5cdFx0XHRcdHJldHVybiB0eXBlb2YgcmV0ID09PSBcInN0cmluZ1wiID9cblx0XHRcdFx0XHQvLyBoYW5kbGUgbW9zdCBjb21tb24gc3RyaW5nIGNhc2VzXG5cdFx0XHRcdFx0cmV0LnJlcGxhY2UocnJldHVybiwgXCJcIikgOlxuXHRcdFx0XHRcdC8vIGhhbmRsZSBjYXNlcyB3aGVyZSB2YWx1ZSBpcyBudWxsL3VuZGVmIG9yIG51bWJlclxuXHRcdFx0XHRcdHJldCA9PSBudWxsID8gXCJcIiA6IHJldDtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlzRnVuY3Rpb24gPSBqUXVlcnkuaXNGdW5jdGlvbiggdmFsdWUgKTtcblxuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHR2YXIgdmFsLFxuXHRcdFx0XHRzZWxmID0galF1ZXJ5KHRoaXMpO1xuXG5cdFx0XHRpZiAoIHRoaXMubm9kZVR5cGUgIT09IDEgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCBpc0Z1bmN0aW9uICkge1xuXHRcdFx0XHR2YWwgPSB2YWx1ZS5jYWxsKCB0aGlzLCBpLCBzZWxmLnZhbCgpICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR2YWwgPSB2YWx1ZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVHJlYXQgbnVsbC91bmRlZmluZWQgYXMgXCJcIjsgY29udmVydCBudW1iZXJzIHRvIHN0cmluZ1xuXHRcdFx0aWYgKCB2YWwgPT0gbnVsbCApIHtcblx0XHRcdFx0dmFsID0gXCJcIjtcblx0XHRcdH0gZWxzZSBpZiAoIHR5cGVvZiB2YWwgPT09IFwibnVtYmVyXCIgKSB7XG5cdFx0XHRcdHZhbCArPSBcIlwiO1xuXHRcdFx0fSBlbHNlIGlmICggalF1ZXJ5LmlzQXJyYXkoIHZhbCApICkge1xuXHRcdFx0XHR2YWwgPSBqUXVlcnkubWFwKHZhbCwgZnVuY3Rpb24gKCB2YWx1ZSApIHtcblx0XHRcdFx0XHRyZXR1cm4gdmFsdWUgPT0gbnVsbCA/IFwiXCIgOiB2YWx1ZSArIFwiXCI7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXG5cdFx0XHRob29rcyA9IGpRdWVyeS52YWxIb29rc1sgdGhpcy50eXBlIF0gfHwgalF1ZXJ5LnZhbEhvb2tzWyB0aGlzLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgXTtcblxuXHRcdFx0Ly8gSWYgc2V0IHJldHVybnMgdW5kZWZpbmVkLCBmYWxsIGJhY2sgdG8gbm9ybWFsIHNldHRpbmdcblx0XHRcdGlmICggIWhvb2tzIHx8ICEoXCJzZXRcIiBpbiBob29rcykgfHwgaG9va3Muc2V0KCB0aGlzLCB2YWwsIFwidmFsdWVcIiApID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdHRoaXMudmFsdWUgPSB2YWw7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5qUXVlcnkuZXh0ZW5kKHtcblx0dmFsSG9va3M6IHtcblx0XHRvcHRpb246IHtcblx0XHRcdGdldDogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRcdC8vIGF0dHJpYnV0ZXMudmFsdWUgaXMgdW5kZWZpbmVkIGluIEJsYWNrYmVycnkgNC43IGJ1dFxuXHRcdFx0XHQvLyB1c2VzIC52YWx1ZS4gU2VlICM2OTMyXG5cdFx0XHRcdHZhciB2YWwgPSBlbGVtLmF0dHJpYnV0ZXMudmFsdWU7XG5cdFx0XHRcdHJldHVybiAhdmFsIHx8IHZhbC5zcGVjaWZpZWQgPyBlbGVtLnZhbHVlIDogZWxlbS50ZXh0O1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0c2VsZWN0OiB7XG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0XHR2YXIgdmFsdWUsIGksIG1heCwgb3B0aW9uLFxuXHRcdFx0XHRcdGluZGV4ID0gZWxlbS5zZWxlY3RlZEluZGV4LFxuXHRcdFx0XHRcdHZhbHVlcyA9IFtdLFxuXHRcdFx0XHRcdG9wdGlvbnMgPSBlbGVtLm9wdGlvbnMsXG5cdFx0XHRcdFx0b25lID0gZWxlbS50eXBlID09PSBcInNlbGVjdC1vbmVcIjtcblxuXHRcdFx0XHQvLyBOb3RoaW5nIHdhcyBzZWxlY3RlZFxuXHRcdFx0XHRpZiAoIGluZGV4IDwgMCApIHtcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIExvb3AgdGhyb3VnaCBhbGwgdGhlIHNlbGVjdGVkIG9wdGlvbnNcblx0XHRcdFx0aSA9IG9uZSA/IGluZGV4IDogMDtcblx0XHRcdFx0bWF4ID0gb25lID8gaW5kZXggKyAxIDogb3B0aW9ucy5sZW5ndGg7XG5cdFx0XHRcdGZvciAoIDsgaSA8IG1heDsgaSsrICkge1xuXHRcdFx0XHRcdG9wdGlvbiA9IG9wdGlvbnNbIGkgXTtcblxuXHRcdFx0XHRcdC8vIERvbid0IHJldHVybiBvcHRpb25zIHRoYXQgYXJlIGRpc2FibGVkIG9yIGluIGEgZGlzYWJsZWQgb3B0Z3JvdXBcblx0XHRcdFx0XHRpZiAoIG9wdGlvbi5zZWxlY3RlZCAmJiAoalF1ZXJ5LnN1cHBvcnQub3B0RGlzYWJsZWQgPyAhb3B0aW9uLmRpc2FibGVkIDogb3B0aW9uLmdldEF0dHJpYnV0ZShcImRpc2FibGVkXCIpID09PSBudWxsKSAmJlxuXHRcdFx0XHRcdFx0XHQoIW9wdGlvbi5wYXJlbnROb2RlLmRpc2FibGVkIHx8ICFqUXVlcnkubm9kZU5hbWUoIG9wdGlvbi5wYXJlbnROb2RlLCBcIm9wdGdyb3VwXCIgKSkgKSB7XG5cblx0XHRcdFx0XHRcdC8vIEdldCB0aGUgc3BlY2lmaWMgdmFsdWUgZm9yIHRoZSBvcHRpb25cblx0XHRcdFx0XHRcdHZhbHVlID0galF1ZXJ5KCBvcHRpb24gKS52YWwoKTtcblxuXHRcdFx0XHRcdFx0Ly8gV2UgZG9uJ3QgbmVlZCBhbiBhcnJheSBmb3Igb25lIHNlbGVjdHNcblx0XHRcdFx0XHRcdGlmICggb25lICkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vIE11bHRpLVNlbGVjdHMgcmV0dXJuIGFuIGFycmF5XG5cdFx0XHRcdFx0XHR2YWx1ZXMucHVzaCggdmFsdWUgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBGaXhlcyBCdWcgIzI1NTEgLS0gc2VsZWN0LnZhbCgpIGJyb2tlbiBpbiBJRSBhZnRlciBmb3JtLnJlc2V0KClcblx0XHRcdFx0aWYgKCBvbmUgJiYgIXZhbHVlcy5sZW5ndGggJiYgb3B0aW9ucy5sZW5ndGggKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGpRdWVyeSggb3B0aW9uc1sgaW5kZXggXSApLnZhbCgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHZhbHVlcztcblx0XHRcdH0sXG5cblx0XHRcdHNldDogZnVuY3Rpb24oIGVsZW0sIHZhbHVlICkge1xuXHRcdFx0XHR2YXIgdmFsdWVzID0galF1ZXJ5Lm1ha2VBcnJheSggdmFsdWUgKTtcblxuXHRcdFx0XHRqUXVlcnkoZWxlbSkuZmluZChcIm9wdGlvblwiKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHRoaXMuc2VsZWN0ZWQgPSBqUXVlcnkuaW5BcnJheSggalF1ZXJ5KHRoaXMpLnZhbCgpLCB2YWx1ZXMgKSA+PSAwO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRpZiAoICF2YWx1ZXMubGVuZ3RoICkge1xuXHRcdFx0XHRcdGVsZW0uc2VsZWN0ZWRJbmRleCA9IC0xO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB2YWx1ZXM7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdC8vIFVudXNlZCBpbiAxLjgsIGxlZnQgaW4gc28gYXR0ckZuLXN0YWJiZXJzIHdvbid0IGRpZTsgcmVtb3ZlIGluIDEuOVxuXHRhdHRyRm46IHt9LFxuXG5cdGF0dHI6IGZ1bmN0aW9uKCBlbGVtLCBuYW1lLCB2YWx1ZSwgcGFzcyApIHtcblx0XHR2YXIgcmV0LCBob29rcywgbm90eG1sLFxuXHRcdFx0blR5cGUgPSBlbGVtLm5vZGVUeXBlO1xuXG5cdFx0Ly8gZG9uJ3QgZ2V0L3NldCBhdHRyaWJ1dGVzIG9uIHRleHQsIGNvbW1lbnQgYW5kIGF0dHJpYnV0ZSBub2Rlc1xuXHRcdGlmICggIWVsZW0gfHwgblR5cGUgPT09IDMgfHwgblR5cGUgPT09IDggfHwgblR5cGUgPT09IDIgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKCBwYXNzICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCBqUXVlcnkuZm5bIG5hbWUgXSApICkge1xuXHRcdFx0cmV0dXJuIGpRdWVyeSggZWxlbSApWyBuYW1lIF0oIHZhbHVlICk7XG5cdFx0fVxuXG5cdFx0Ly8gRmFsbGJhY2sgdG8gcHJvcCB3aGVuIGF0dHJpYnV0ZXMgYXJlIG5vdCBzdXBwb3J0ZWRcblx0XHRpZiAoIHR5cGVvZiBlbGVtLmdldEF0dHJpYnV0ZSA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdHJldHVybiBqUXVlcnkucHJvcCggZWxlbSwgbmFtZSwgdmFsdWUgKTtcblx0XHR9XG5cblx0XHRub3R4bWwgPSBuVHlwZSAhPT0gMSB8fCAhalF1ZXJ5LmlzWE1MRG9jKCBlbGVtICk7XG5cblx0XHQvLyBBbGwgYXR0cmlidXRlcyBhcmUgbG93ZXJjYXNlXG5cdFx0Ly8gR3JhYiBuZWNlc3NhcnkgaG9vayBpZiBvbmUgaXMgZGVmaW5lZFxuXHRcdGlmICggbm90eG1sICkge1xuXHRcdFx0bmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKTtcblx0XHRcdGhvb2tzID0galF1ZXJ5LmF0dHJIb29rc1sgbmFtZSBdIHx8ICggcmJvb2xlYW4udGVzdCggbmFtZSApID8gYm9vbEhvb2sgOiBub2RlSG9vayApO1xuXHRcdH1cblxuXHRcdGlmICggdmFsdWUgIT09IHVuZGVmaW5lZCApIHtcblxuXHRcdFx0aWYgKCB2YWx1ZSA9PT0gbnVsbCApIHtcblx0XHRcdFx0alF1ZXJ5LnJlbW92ZUF0dHIoIGVsZW0sIG5hbWUgKTtcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHR9IGVsc2UgaWYgKCBob29rcyAmJiBcInNldFwiIGluIGhvb2tzICYmIG5vdHhtbCAmJiAocmV0ID0gaG9va3Muc2V0KCBlbGVtLCB2YWx1ZSwgbmFtZSApKSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRyZXR1cm4gcmV0O1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRlbGVtLnNldEF0dHJpYnV0ZSggbmFtZSwgXCJcIiArIHZhbHVlICk7XG5cdFx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHRcdH1cblxuXHRcdH0gZWxzZSBpZiAoIGhvb2tzICYmIFwiZ2V0XCIgaW4gaG9va3MgJiYgbm90eG1sICYmIChyZXQgPSBob29rcy5nZXQoIGVsZW0sIG5hbWUgKSkgIT09IG51bGwgKSB7XG5cdFx0XHRyZXR1cm4gcmV0O1xuXG5cdFx0fSBlbHNlIHtcblxuXHRcdFx0cmV0ID0gZWxlbS5nZXRBdHRyaWJ1dGUoIG5hbWUgKTtcblxuXHRcdFx0Ly8gTm9uLWV4aXN0ZW50IGF0dHJpYnV0ZXMgcmV0dXJuIG51bGwsIHdlIG5vcm1hbGl6ZSB0byB1bmRlZmluZWRcblx0XHRcdHJldHVybiByZXQgPT09IG51bGwgP1xuXHRcdFx0XHR1bmRlZmluZWQgOlxuXHRcdFx0XHRyZXQ7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbW92ZUF0dHI6IGZ1bmN0aW9uKCBlbGVtLCB2YWx1ZSApIHtcblx0XHR2YXIgcHJvcE5hbWUsIGF0dHJOYW1lcywgbmFtZSwgaXNCb29sLFxuXHRcdFx0aSA9IDA7XG5cblx0XHRpZiAoIHZhbHVlICYmIGVsZW0ubm9kZVR5cGUgPT09IDEgKSB7XG5cblx0XHRcdGF0dHJOYW1lcyA9IHZhbHVlLnNwbGl0KCBjb3JlX3JzcGFjZSApO1xuXG5cdFx0XHRmb3IgKCA7IGkgPCBhdHRyTmFtZXMubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRcdG5hbWUgPSBhdHRyTmFtZXNbIGkgXTtcblxuXHRcdFx0XHRpZiAoIG5hbWUgKSB7XG5cdFx0XHRcdFx0cHJvcE5hbWUgPSBqUXVlcnkucHJvcEZpeFsgbmFtZSBdIHx8IG5hbWU7XG5cdFx0XHRcdFx0aXNCb29sID0gcmJvb2xlYW4udGVzdCggbmFtZSApO1xuXG5cdFx0XHRcdFx0Ly8gU2VlICM5Njk5IGZvciBleHBsYW5hdGlvbiBvZiB0aGlzIGFwcHJvYWNoIChzZXR0aW5nIGZpcnN0LCB0aGVuIHJlbW92YWwpXG5cdFx0XHRcdFx0Ly8gRG8gbm90IGRvIHRoaXMgZm9yIGJvb2xlYW4gYXR0cmlidXRlcyAoc2VlICMxMDg3MClcblx0XHRcdFx0XHRpZiAoICFpc0Jvb2wgKSB7XG5cdFx0XHRcdFx0XHRqUXVlcnkuYXR0ciggZWxlbSwgbmFtZSwgXCJcIiApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbGVtLnJlbW92ZUF0dHJpYnV0ZSggZ2V0U2V0QXR0cmlidXRlID8gbmFtZSA6IHByb3BOYW1lICk7XG5cblx0XHRcdFx0XHQvLyBTZXQgY29ycmVzcG9uZGluZyBwcm9wZXJ0eSB0byBmYWxzZSBmb3IgYm9vbGVhbiBhdHRyaWJ1dGVzXG5cdFx0XHRcdFx0aWYgKCBpc0Jvb2wgJiYgcHJvcE5hbWUgaW4gZWxlbSApIHtcblx0XHRcdFx0XHRcdGVsZW1bIHByb3BOYW1lIF0gPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cblx0YXR0ckhvb2tzOiB7XG5cdFx0dHlwZToge1xuXHRcdFx0c2V0OiBmdW5jdGlvbiggZWxlbSwgdmFsdWUgKSB7XG5cdFx0XHRcdC8vIFdlIGNhbid0IGFsbG93IHRoZSB0eXBlIHByb3BlcnR5IHRvIGJlIGNoYW5nZWQgKHNpbmNlIGl0IGNhdXNlcyBwcm9ibGVtcyBpbiBJRSlcblx0XHRcdFx0aWYgKCBydHlwZS50ZXN0KCBlbGVtLm5vZGVOYW1lICkgJiYgZWxlbS5wYXJlbnROb2RlICkge1xuXHRcdFx0XHRcdGpRdWVyeS5lcnJvciggXCJ0eXBlIHByb3BlcnR5IGNhbid0IGJlIGNoYW5nZWRcIiApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAhalF1ZXJ5LnN1cHBvcnQucmFkaW9WYWx1ZSAmJiB2YWx1ZSA9PT0gXCJyYWRpb1wiICYmIGpRdWVyeS5ub2RlTmFtZShlbGVtLCBcImlucHV0XCIpICkge1xuXHRcdFx0XHRcdC8vIFNldHRpbmcgdGhlIHR5cGUgb24gYSByYWRpbyBidXR0b24gYWZ0ZXIgdGhlIHZhbHVlIHJlc2V0cyB0aGUgdmFsdWUgaW4gSUU2LTlcblx0XHRcdFx0XHQvLyBSZXNldCB2YWx1ZSB0byBpdCdzIGRlZmF1bHQgaW4gY2FzZSB0eXBlIGlzIHNldCBhZnRlciB2YWx1ZVxuXHRcdFx0XHRcdC8vIFRoaXMgaXMgZm9yIGVsZW1lbnQgY3JlYXRpb25cblx0XHRcdFx0XHR2YXIgdmFsID0gZWxlbS52YWx1ZTtcblx0XHRcdFx0XHRlbGVtLnNldEF0dHJpYnV0ZSggXCJ0eXBlXCIsIHZhbHVlICk7XG5cdFx0XHRcdFx0aWYgKCB2YWwgKSB7XG5cdFx0XHRcdFx0XHRlbGVtLnZhbHVlID0gdmFsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdC8vIFVzZSB0aGUgdmFsdWUgcHJvcGVydHkgZm9yIGJhY2sgY29tcGF0XG5cdFx0Ly8gVXNlIHRoZSBub2RlSG9vayBmb3IgYnV0dG9uIGVsZW1lbnRzIGluIElFNi83ICgjMTk1NClcblx0XHR2YWx1ZToge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbiggZWxlbSwgbmFtZSApIHtcblx0XHRcdFx0aWYgKCBub2RlSG9vayAmJiBqUXVlcnkubm9kZU5hbWUoIGVsZW0sIFwiYnV0dG9uXCIgKSApIHtcblx0XHRcdFx0XHRyZXR1cm4gbm9kZUhvb2suZ2V0KCBlbGVtLCBuYW1lICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIG5hbWUgaW4gZWxlbSA/XG5cdFx0XHRcdFx0ZWxlbS52YWx1ZSA6XG5cdFx0XHRcdFx0bnVsbDtcblx0XHRcdH0sXG5cdFx0XHRzZXQ6IGZ1bmN0aW9uKCBlbGVtLCB2YWx1ZSwgbmFtZSApIHtcblx0XHRcdFx0aWYgKCBub2RlSG9vayAmJiBqUXVlcnkubm9kZU5hbWUoIGVsZW0sIFwiYnV0dG9uXCIgKSApIHtcblx0XHRcdFx0XHRyZXR1cm4gbm9kZUhvb2suc2V0KCBlbGVtLCB2YWx1ZSwgbmFtZSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIERvZXMgbm90IHJldHVybiBzbyB0aGF0IHNldEF0dHJpYnV0ZSBpcyBhbHNvIHVzZWRcblx0XHRcdFx0ZWxlbS52YWx1ZSA9IHZhbHVlO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRwcm9wRml4OiB7XG5cdFx0dGFiaW5kZXg6IFwidGFiSW5kZXhcIixcblx0XHRyZWFkb25seTogXCJyZWFkT25seVwiLFxuXHRcdFwiZm9yXCI6IFwiaHRtbEZvclwiLFxuXHRcdFwiY2xhc3NcIjogXCJjbGFzc05hbWVcIixcblx0XHRtYXhsZW5ndGg6IFwibWF4TGVuZ3RoXCIsXG5cdFx0Y2VsbHNwYWNpbmc6IFwiY2VsbFNwYWNpbmdcIixcblx0XHRjZWxscGFkZGluZzogXCJjZWxsUGFkZGluZ1wiLFxuXHRcdHJvd3NwYW46IFwicm93U3BhblwiLFxuXHRcdGNvbHNwYW46IFwiY29sU3BhblwiLFxuXHRcdHVzZW1hcDogXCJ1c2VNYXBcIixcblx0XHRmcmFtZWJvcmRlcjogXCJmcmFtZUJvcmRlclwiLFxuXHRcdGNvbnRlbnRlZGl0YWJsZTogXCJjb250ZW50RWRpdGFibGVcIlxuXHR9LFxuXG5cdHByb3A6IGZ1bmN0aW9uKCBlbGVtLCBuYW1lLCB2YWx1ZSApIHtcblx0XHR2YXIgcmV0LCBob29rcywgbm90eG1sLFxuXHRcdFx0blR5cGUgPSBlbGVtLm5vZGVUeXBlO1xuXG5cdFx0Ly8gZG9uJ3QgZ2V0L3NldCBwcm9wZXJ0aWVzIG9uIHRleHQsIGNvbW1lbnQgYW5kIGF0dHJpYnV0ZSBub2Rlc1xuXHRcdGlmICggIWVsZW0gfHwgblR5cGUgPT09IDMgfHwgblR5cGUgPT09IDggfHwgblR5cGUgPT09IDIgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0bm90eG1sID0gblR5cGUgIT09IDEgfHwgIWpRdWVyeS5pc1hNTERvYyggZWxlbSApO1xuXG5cdFx0aWYgKCBub3R4bWwgKSB7XG5cdFx0XHQvLyBGaXggbmFtZSBhbmQgYXR0YWNoIGhvb2tzXG5cdFx0XHRuYW1lID0galF1ZXJ5LnByb3BGaXhbIG5hbWUgXSB8fCBuYW1lO1xuXHRcdFx0aG9va3MgPSBqUXVlcnkucHJvcEhvb2tzWyBuYW1lIF07XG5cdFx0fVxuXG5cdFx0aWYgKCB2YWx1ZSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0aWYgKCBob29rcyAmJiBcInNldFwiIGluIGhvb2tzICYmIChyZXQgPSBob29rcy5zZXQoIGVsZW0sIHZhbHVlLCBuYW1lICkpICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdHJldHVybiByZXQ7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiAoIGVsZW1bIG5hbWUgXSA9IHZhbHVlICk7XG5cdFx0XHR9XG5cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKCBob29rcyAmJiBcImdldFwiIGluIGhvb2tzICYmIChyZXQgPSBob29rcy5nZXQoIGVsZW0sIG5hbWUgKSkgIT09IG51bGwgKSB7XG5cdFx0XHRcdHJldHVybiByZXQ7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBlbGVtWyBuYW1lIF07XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXG5cdHByb3BIb29rczoge1xuXHRcdHRhYkluZGV4OiB7XG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdFx0XHQvLyBlbGVtLnRhYkluZGV4IGRvZXNuJ3QgYWx3YXlzIHJldHVybiB0aGUgY29ycmVjdCB2YWx1ZSB3aGVuIGl0IGhhc24ndCBiZWVuIGV4cGxpY2l0bHkgc2V0XG5cdFx0XHRcdC8vIGh0dHA6Ly9mbHVpZHByb2plY3Qub3JnL2Jsb2cvMjAwOC8wMS8wOS9nZXR0aW5nLXNldHRpbmctYW5kLXJlbW92aW5nLXRhYmluZGV4LXZhbHVlcy13aXRoLWphdmFzY3JpcHQvXG5cdFx0XHRcdHZhciBhdHRyaWJ1dGVOb2RlID0gZWxlbS5nZXRBdHRyaWJ1dGVOb2RlKFwidGFiaW5kZXhcIik7XG5cblx0XHRcdFx0cmV0dXJuIGF0dHJpYnV0ZU5vZGUgJiYgYXR0cmlidXRlTm9kZS5zcGVjaWZpZWQgP1xuXHRcdFx0XHRcdHBhcnNlSW50KCBhdHRyaWJ1dGVOb2RlLnZhbHVlLCAxMCApIDpcblx0XHRcdFx0XHRyZm9jdXNhYmxlLnRlc3QoIGVsZW0ubm9kZU5hbWUgKSB8fCByY2xpY2thYmxlLnRlc3QoIGVsZW0ubm9kZU5hbWUgKSAmJiBlbGVtLmhyZWYgP1xuXHRcdFx0XHRcdFx0MCA6XG5cdFx0XHRcdFx0XHR1bmRlZmluZWQ7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59KTtcblxuLy8gSG9vayBmb3IgYm9vbGVhbiBhdHRyaWJ1dGVzXG5ib29sSG9vayA9IHtcblx0Z2V0OiBmdW5jdGlvbiggZWxlbSwgbmFtZSApIHtcblx0XHQvLyBBbGlnbiBib29sZWFuIGF0dHJpYnV0ZXMgd2l0aCBjb3JyZXNwb25kaW5nIHByb3BlcnRpZXNcblx0XHQvLyBGYWxsIGJhY2sgdG8gYXR0cmlidXRlIHByZXNlbmNlIHdoZXJlIHNvbWUgYm9vbGVhbnMgYXJlIG5vdCBzdXBwb3J0ZWRcblx0XHR2YXIgYXR0ck5vZGUsXG5cdFx0XHRwcm9wZXJ0eSA9IGpRdWVyeS5wcm9wKCBlbGVtLCBuYW1lICk7XG5cdFx0cmV0dXJuIHByb3BlcnR5ID09PSB0cnVlIHx8IHR5cGVvZiBwcm9wZXJ0eSAhPT0gXCJib29sZWFuXCIgJiYgKCBhdHRyTm9kZSA9IGVsZW0uZ2V0QXR0cmlidXRlTm9kZShuYW1lKSApICYmIGF0dHJOb2RlLm5vZGVWYWx1ZSAhPT0gZmFsc2UgP1xuXHRcdFx0bmFtZS50b0xvd2VyQ2FzZSgpIDpcblx0XHRcdHVuZGVmaW5lZDtcblx0fSxcblx0c2V0OiBmdW5jdGlvbiggZWxlbSwgdmFsdWUsIG5hbWUgKSB7XG5cdFx0dmFyIHByb3BOYW1lO1xuXHRcdGlmICggdmFsdWUgPT09IGZhbHNlICkge1xuXHRcdFx0Ly8gUmVtb3ZlIGJvb2xlYW4gYXR0cmlidXRlcyB3aGVuIHNldCB0byBmYWxzZVxuXHRcdFx0alF1ZXJ5LnJlbW92ZUF0dHIoIGVsZW0sIG5hbWUgKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gdmFsdWUgaXMgdHJ1ZSBzaW5jZSB3ZSBrbm93IGF0IHRoaXMgcG9pbnQgaXQncyB0eXBlIGJvb2xlYW4gYW5kIG5vdCBmYWxzZVxuXHRcdFx0Ly8gU2V0IGJvb2xlYW4gYXR0cmlidXRlcyB0byB0aGUgc2FtZSBuYW1lIGFuZCBzZXQgdGhlIERPTSBwcm9wZXJ0eVxuXHRcdFx0cHJvcE5hbWUgPSBqUXVlcnkucHJvcEZpeFsgbmFtZSBdIHx8IG5hbWU7XG5cdFx0XHRpZiAoIHByb3BOYW1lIGluIGVsZW0gKSB7XG5cdFx0XHRcdC8vIE9ubHkgc2V0IHRoZSBJREwgc3BlY2lmaWNhbGx5IGlmIGl0IGFscmVhZHkgZXhpc3RzIG9uIHRoZSBlbGVtZW50XG5cdFx0XHRcdGVsZW1bIHByb3BOYW1lIF0gPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRlbGVtLnNldEF0dHJpYnV0ZSggbmFtZSwgbmFtZS50b0xvd2VyQ2FzZSgpICk7XG5cdFx0fVxuXHRcdHJldHVybiBuYW1lO1xuXHR9XG59O1xuXG4vLyBJRTYvNyBkbyBub3Qgc3VwcG9ydCBnZXR0aW5nL3NldHRpbmcgc29tZSBhdHRyaWJ1dGVzIHdpdGggZ2V0L3NldEF0dHJpYnV0ZVxuaWYgKCAhZ2V0U2V0QXR0cmlidXRlICkge1xuXG5cdGZpeFNwZWNpZmllZCA9IHtcblx0XHRuYW1lOiB0cnVlLFxuXHRcdGlkOiB0cnVlLFxuXHRcdGNvb3JkczogdHJ1ZVxuXHR9O1xuXG5cdC8vIFVzZSB0aGlzIGZvciBhbnkgYXR0cmlidXRlIGluIElFNi83XG5cdC8vIFRoaXMgZml4ZXMgYWxtb3N0IGV2ZXJ5IElFNi83IGlzc3VlXG5cdG5vZGVIb29rID0galF1ZXJ5LnZhbEhvb2tzLmJ1dHRvbiA9IHtcblx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtLCBuYW1lICkge1xuXHRcdFx0dmFyIHJldDtcblx0XHRcdHJldCA9IGVsZW0uZ2V0QXR0cmlidXRlTm9kZSggbmFtZSApO1xuXHRcdFx0cmV0dXJuIHJldCAmJiAoIGZpeFNwZWNpZmllZFsgbmFtZSBdID8gcmV0LnZhbHVlICE9PSBcIlwiIDogcmV0LnNwZWNpZmllZCApID9cblx0XHRcdFx0cmV0LnZhbHVlIDpcblx0XHRcdFx0dW5kZWZpbmVkO1xuXHRcdH0sXG5cdFx0c2V0OiBmdW5jdGlvbiggZWxlbSwgdmFsdWUsIG5hbWUgKSB7XG5cdFx0XHQvLyBTZXQgdGhlIGV4aXN0aW5nIG9yIGNyZWF0ZSBhIG5ldyBhdHRyaWJ1dGUgbm9kZVxuXHRcdFx0dmFyIHJldCA9IGVsZW0uZ2V0QXR0cmlidXRlTm9kZSggbmFtZSApO1xuXHRcdFx0aWYgKCAhcmV0ICkge1xuXHRcdFx0XHRyZXQgPSBkb2N1bWVudC5jcmVhdGVBdHRyaWJ1dGUoIG5hbWUgKTtcblx0XHRcdFx0ZWxlbS5zZXRBdHRyaWJ1dGVOb2RlKCByZXQgKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiAoIHJldC52YWx1ZSA9IHZhbHVlICsgXCJcIiApO1xuXHRcdH1cblx0fTtcblxuXHQvLyBTZXQgd2lkdGggYW5kIGhlaWdodCB0byBhdXRvIGluc3RlYWQgb2YgMCBvbiBlbXB0eSBzdHJpbmcoIEJ1ZyAjODE1MCApXG5cdC8vIFRoaXMgaXMgZm9yIHJlbW92YWxzXG5cdGpRdWVyeS5lYWNoKFsgXCJ3aWR0aFwiLCBcImhlaWdodFwiIF0sIGZ1bmN0aW9uKCBpLCBuYW1lICkge1xuXHRcdGpRdWVyeS5hdHRySG9va3NbIG5hbWUgXSA9IGpRdWVyeS5leHRlbmQoIGpRdWVyeS5hdHRySG9va3NbIG5hbWUgXSwge1xuXHRcdFx0c2V0OiBmdW5jdGlvbiggZWxlbSwgdmFsdWUgKSB7XG5cdFx0XHRcdGlmICggdmFsdWUgPT09IFwiXCIgKSB7XG5cdFx0XHRcdFx0ZWxlbS5zZXRBdHRyaWJ1dGUoIG5hbWUsIFwiYXV0b1wiICk7XG5cdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0pO1xuXG5cdC8vIFNldCBjb250ZW50ZWRpdGFibGUgdG8gZmFsc2Ugb24gcmVtb3ZhbHMoIzEwNDI5KVxuXHQvLyBTZXR0aW5nIHRvIGVtcHR5IHN0cmluZyB0aHJvd3MgYW4gZXJyb3IgYXMgYW4gaW52YWxpZCB2YWx1ZVxuXHRqUXVlcnkuYXR0ckhvb2tzLmNvbnRlbnRlZGl0YWJsZSA9IHtcblx0XHRnZXQ6IG5vZGVIb29rLmdldCxcblx0XHRzZXQ6IGZ1bmN0aW9uKCBlbGVtLCB2YWx1ZSwgbmFtZSApIHtcblx0XHRcdGlmICggdmFsdWUgPT09IFwiXCIgKSB7XG5cdFx0XHRcdHZhbHVlID0gXCJmYWxzZVwiO1xuXHRcdFx0fVxuXHRcdFx0bm9kZUhvb2suc2V0KCBlbGVtLCB2YWx1ZSwgbmFtZSApO1xuXHRcdH1cblx0fTtcbn1cblxuXG4vLyBTb21lIGF0dHJpYnV0ZXMgcmVxdWlyZSBhIHNwZWNpYWwgY2FsbCBvbiBJRVxuaWYgKCAhalF1ZXJ5LnN1cHBvcnQuaHJlZk5vcm1hbGl6ZWQgKSB7XG5cdGpRdWVyeS5lYWNoKFsgXCJocmVmXCIsIFwic3JjXCIsIFwid2lkdGhcIiwgXCJoZWlnaHRcIiBdLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblx0XHRqUXVlcnkuYXR0ckhvb2tzWyBuYW1lIF0gPSBqUXVlcnkuZXh0ZW5kKCBqUXVlcnkuYXR0ckhvb2tzWyBuYW1lIF0sIHtcblx0XHRcdGdldDogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRcdHZhciByZXQgPSBlbGVtLmdldEF0dHJpYnV0ZSggbmFtZSwgMiApO1xuXHRcdFx0XHRyZXR1cm4gcmV0ID09PSBudWxsID8gdW5kZWZpbmVkIDogcmV0O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9KTtcbn1cblxuaWYgKCAhalF1ZXJ5LnN1cHBvcnQuc3R5bGUgKSB7XG5cdGpRdWVyeS5hdHRySG9va3Muc3R5bGUgPSB7XG5cdFx0Z2V0OiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdC8vIFJldHVybiB1bmRlZmluZWQgaW4gdGhlIGNhc2Ugb2YgZW1wdHkgc3RyaW5nXG5cdFx0XHQvLyBOb3JtYWxpemUgdG8gbG93ZXJjYXNlIHNpbmNlIElFIHVwcGVyY2FzZXMgY3NzIHByb3BlcnR5IG5hbWVzXG5cdFx0XHRyZXR1cm4gZWxlbS5zdHlsZS5jc3NUZXh0LnRvTG93ZXJDYXNlKCkgfHwgdW5kZWZpbmVkO1xuXHRcdH0sXG5cdFx0c2V0OiBmdW5jdGlvbiggZWxlbSwgdmFsdWUgKSB7XG5cdFx0XHRyZXR1cm4gKCBlbGVtLnN0eWxlLmNzc1RleHQgPSBcIlwiICsgdmFsdWUgKTtcblx0XHR9XG5cdH07XG59XG5cbi8vIFNhZmFyaSBtaXMtcmVwb3J0cyB0aGUgZGVmYXVsdCBzZWxlY3RlZCBwcm9wZXJ0eSBvZiBhbiBvcHRpb25cbi8vIEFjY2Vzc2luZyB0aGUgcGFyZW50J3Mgc2VsZWN0ZWRJbmRleCBwcm9wZXJ0eSBmaXhlcyBpdFxuaWYgKCAhalF1ZXJ5LnN1cHBvcnQub3B0U2VsZWN0ZWQgKSB7XG5cdGpRdWVyeS5wcm9wSG9va3Muc2VsZWN0ZWQgPSBqUXVlcnkuZXh0ZW5kKCBqUXVlcnkucHJvcEhvb2tzLnNlbGVjdGVkLCB7XG5cdFx0Z2V0OiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdHZhciBwYXJlbnQgPSBlbGVtLnBhcmVudE5vZGU7XG5cblx0XHRcdGlmICggcGFyZW50ICkge1xuXHRcdFx0XHRwYXJlbnQuc2VsZWN0ZWRJbmRleDtcblxuXHRcdFx0XHQvLyBNYWtlIHN1cmUgdGhhdCBpdCBhbHNvIHdvcmtzIHdpdGggb3B0Z3JvdXBzLCBzZWUgIzU3MDFcblx0XHRcdFx0aWYgKCBwYXJlbnQucGFyZW50Tm9kZSApIHtcblx0XHRcdFx0XHRwYXJlbnQucGFyZW50Tm9kZS5zZWxlY3RlZEluZGV4O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdH0pO1xufVxuXG4vLyBJRTYvNyBjYWxsIGVuY3R5cGUgZW5jb2RpbmdcbmlmICggIWpRdWVyeS5zdXBwb3J0LmVuY3R5cGUgKSB7XG5cdGpRdWVyeS5wcm9wRml4LmVuY3R5cGUgPSBcImVuY29kaW5nXCI7XG59XG5cbi8vIFJhZGlvcyBhbmQgY2hlY2tib3hlcyBnZXR0ZXIvc2V0dGVyXG5pZiAoICFqUXVlcnkuc3VwcG9ydC5jaGVja09uICkge1xuXHRqUXVlcnkuZWFjaChbIFwicmFkaW9cIiwgXCJjaGVja2JveFwiIF0sIGZ1bmN0aW9uKCkge1xuXHRcdGpRdWVyeS52YWxIb29rc1sgdGhpcyBdID0ge1xuXHRcdFx0Z2V0OiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdFx0Ly8gSGFuZGxlIHRoZSBjYXNlIHdoZXJlIGluIFdlYmtpdCBcIlwiIGlzIHJldHVybmVkIGluc3RlYWQgb2YgXCJvblwiIGlmIGEgdmFsdWUgaXNuJ3Qgc3BlY2lmaWVkXG5cdFx0XHRcdHJldHVybiBlbGVtLmdldEF0dHJpYnV0ZShcInZhbHVlXCIpID09PSBudWxsID8gXCJvblwiIDogZWxlbS52YWx1ZTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbn1cbmpRdWVyeS5lYWNoKFsgXCJyYWRpb1wiLCBcImNoZWNrYm94XCIgXSwgZnVuY3Rpb24oKSB7XG5cdGpRdWVyeS52YWxIb29rc1sgdGhpcyBdID0galF1ZXJ5LmV4dGVuZCggalF1ZXJ5LnZhbEhvb2tzWyB0aGlzIF0sIHtcblx0XHRzZXQ6IGZ1bmN0aW9uKCBlbGVtLCB2YWx1ZSApIHtcblx0XHRcdGlmICggalF1ZXJ5LmlzQXJyYXkoIHZhbHVlICkgKSB7XG5cdFx0XHRcdHJldHVybiAoIGVsZW0uY2hlY2tlZCA9IGpRdWVyeS5pbkFycmF5KCBqUXVlcnkoZWxlbSkudmFsKCksIHZhbHVlICkgPj0gMCApO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59KTtcbnZhciByZm9ybUVsZW1zID0gL14oPzp0ZXh0YXJlYXxpbnB1dHxzZWxlY3QpJC9pLFxuXHRydHlwZW5hbWVzcGFjZSA9IC9eKFteXFwuXSp8KSg/OlxcLiguKyl8KSQvLFxuXHRyaG92ZXJIYWNrID0gLyg/Ol58XFxzKWhvdmVyKFxcLlxcUyt8KVxcYi8sXG5cdHJrZXlFdmVudCA9IC9ea2V5Lyxcblx0cm1vdXNlRXZlbnQgPSAvXig/Om1vdXNlfGNvbnRleHRtZW51KXxjbGljay8sXG5cdHJmb2N1c01vcnBoID0gL14oPzpmb2N1c2luZm9jdXN8Zm9jdXNvdXRibHVyKSQvLFxuXHRob3ZlckhhY2sgPSBmdW5jdGlvbiggZXZlbnRzICkge1xuXHRcdHJldHVybiBqUXVlcnkuZXZlbnQuc3BlY2lhbC5ob3ZlciA/IGV2ZW50cyA6IGV2ZW50cy5yZXBsYWNlKCByaG92ZXJIYWNrLCBcIm1vdXNlZW50ZXIkMSBtb3VzZWxlYXZlJDFcIiApO1xuXHR9O1xuXG4vKlxuICogSGVscGVyIGZ1bmN0aW9ucyBmb3IgbWFuYWdpbmcgZXZlbnRzIC0tIG5vdCBwYXJ0IG9mIHRoZSBwdWJsaWMgaW50ZXJmYWNlLlxuICogUHJvcHMgdG8gRGVhbiBFZHdhcmRzJyBhZGRFdmVudCBsaWJyYXJ5IGZvciBtYW55IG9mIHRoZSBpZGVhcy5cbiAqL1xualF1ZXJ5LmV2ZW50ID0ge1xuXG5cdGFkZDogZnVuY3Rpb24oIGVsZW0sIHR5cGVzLCBoYW5kbGVyLCBkYXRhLCBzZWxlY3RvciApIHtcblxuXHRcdHZhciBlbGVtRGF0YSwgZXZlbnRIYW5kbGUsIGV2ZW50cyxcblx0XHRcdHQsIHRucywgdHlwZSwgbmFtZXNwYWNlcywgaGFuZGxlT2JqLFxuXHRcdFx0aGFuZGxlT2JqSW4sIGhhbmRsZXJzLCBzcGVjaWFsO1xuXG5cdFx0Ly8gRG9uJ3QgYXR0YWNoIGV2ZW50cyB0byBub0RhdGEgb3IgdGV4dC9jb21tZW50IG5vZGVzIChhbGxvdyBwbGFpbiBvYmplY3RzIHRobylcblx0XHRpZiAoIGVsZW0ubm9kZVR5cGUgPT09IDMgfHwgZWxlbS5ub2RlVHlwZSA9PT0gOCB8fCAhdHlwZXMgfHwgIWhhbmRsZXIgfHwgIShlbGVtRGF0YSA9IGpRdWVyeS5fZGF0YSggZWxlbSApKSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBDYWxsZXIgY2FuIHBhc3MgaW4gYW4gb2JqZWN0IG9mIGN1c3RvbSBkYXRhIGluIGxpZXUgb2YgdGhlIGhhbmRsZXJcblx0XHRpZiAoIGhhbmRsZXIuaGFuZGxlciApIHtcblx0XHRcdGhhbmRsZU9iakluID0gaGFuZGxlcjtcblx0XHRcdGhhbmRsZXIgPSBoYW5kbGVPYmpJbi5oYW5kbGVyO1xuXHRcdFx0c2VsZWN0b3IgPSBoYW5kbGVPYmpJbi5zZWxlY3Rvcjtcblx0XHR9XG5cblx0XHQvLyBNYWtlIHN1cmUgdGhhdCB0aGUgaGFuZGxlciBoYXMgYSB1bmlxdWUgSUQsIHVzZWQgdG8gZmluZC9yZW1vdmUgaXQgbGF0ZXJcblx0XHRpZiAoICFoYW5kbGVyLmd1aWQgKSB7XG5cdFx0XHRoYW5kbGVyLmd1aWQgPSBqUXVlcnkuZ3VpZCsrO1xuXHRcdH1cblxuXHRcdC8vIEluaXQgdGhlIGVsZW1lbnQncyBldmVudCBzdHJ1Y3R1cmUgYW5kIG1haW4gaGFuZGxlciwgaWYgdGhpcyBpcyB0aGUgZmlyc3Rcblx0XHRldmVudHMgPSBlbGVtRGF0YS5ldmVudHM7XG5cdFx0aWYgKCAhZXZlbnRzICkge1xuXHRcdFx0ZWxlbURhdGEuZXZlbnRzID0gZXZlbnRzID0ge307XG5cdFx0fVxuXHRcdGV2ZW50SGFuZGxlID0gZWxlbURhdGEuaGFuZGxlO1xuXHRcdGlmICggIWV2ZW50SGFuZGxlICkge1xuXHRcdFx0ZWxlbURhdGEuaGFuZGxlID0gZXZlbnRIYW5kbGUgPSBmdW5jdGlvbiggZSApIHtcblx0XHRcdFx0Ly8gRGlzY2FyZCB0aGUgc2Vjb25kIGV2ZW50IG9mIGEgalF1ZXJ5LmV2ZW50LnRyaWdnZXIoKSBhbmRcblx0XHRcdFx0Ly8gd2hlbiBhbiBldmVudCBpcyBjYWxsZWQgYWZ0ZXIgYSBwYWdlIGhhcyB1bmxvYWRlZFxuXHRcdFx0XHRyZXR1cm4gdHlwZW9mIGpRdWVyeSAhPT0gXCJ1bmRlZmluZWRcIiAmJiAoIWUgfHwgalF1ZXJ5LmV2ZW50LnRyaWdnZXJlZCAhPT0gZS50eXBlKSA/XG5cdFx0XHRcdFx0alF1ZXJ5LmV2ZW50LmRpc3BhdGNoLmFwcGx5KCBldmVudEhhbmRsZS5lbGVtLCBhcmd1bWVudHMgKSA6XG5cdFx0XHRcdFx0dW5kZWZpbmVkO1xuXHRcdFx0fTtcblx0XHRcdC8vIEFkZCBlbGVtIGFzIGEgcHJvcGVydHkgb2YgdGhlIGhhbmRsZSBmbiB0byBwcmV2ZW50IGEgbWVtb3J5IGxlYWsgd2l0aCBJRSBub24tbmF0aXZlIGV2ZW50c1xuXHRcdFx0ZXZlbnRIYW5kbGUuZWxlbSA9IGVsZW07XG5cdFx0fVxuXG5cdFx0Ly8gSGFuZGxlIG11bHRpcGxlIGV2ZW50cyBzZXBhcmF0ZWQgYnkgYSBzcGFjZVxuXHRcdC8vIGpRdWVyeSguLi4pLmJpbmQoXCJtb3VzZW92ZXIgbW91c2VvdXRcIiwgZm4pO1xuXHRcdHR5cGVzID0galF1ZXJ5LnRyaW0oIGhvdmVySGFjayh0eXBlcykgKS5zcGxpdCggXCIgXCIgKTtcblx0XHRmb3IgKCB0ID0gMDsgdCA8IHR5cGVzLmxlbmd0aDsgdCsrICkge1xuXG5cdFx0XHR0bnMgPSBydHlwZW5hbWVzcGFjZS5leGVjKCB0eXBlc1t0XSApIHx8IFtdO1xuXHRcdFx0dHlwZSA9IHRuc1sxXTtcblx0XHRcdG5hbWVzcGFjZXMgPSAoIHRuc1syXSB8fCBcIlwiICkuc3BsaXQoIFwiLlwiICkuc29ydCgpO1xuXG5cdFx0XHQvLyBJZiBldmVudCBjaGFuZ2VzIGl0cyB0eXBlLCB1c2UgdGhlIHNwZWNpYWwgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBjaGFuZ2VkIHR5cGVcblx0XHRcdHNwZWNpYWwgPSBqUXVlcnkuZXZlbnQuc3BlY2lhbFsgdHlwZSBdIHx8IHt9O1xuXG5cdFx0XHQvLyBJZiBzZWxlY3RvciBkZWZpbmVkLCBkZXRlcm1pbmUgc3BlY2lhbCBldmVudCBhcGkgdHlwZSwgb3RoZXJ3aXNlIGdpdmVuIHR5cGVcblx0XHRcdHR5cGUgPSAoIHNlbGVjdG9yID8gc3BlY2lhbC5kZWxlZ2F0ZVR5cGUgOiBzcGVjaWFsLmJpbmRUeXBlICkgfHwgdHlwZTtcblxuXHRcdFx0Ly8gVXBkYXRlIHNwZWNpYWwgYmFzZWQgb24gbmV3bHkgcmVzZXQgdHlwZVxuXHRcdFx0c3BlY2lhbCA9IGpRdWVyeS5ldmVudC5zcGVjaWFsWyB0eXBlIF0gfHwge307XG5cblx0XHRcdC8vIGhhbmRsZU9iaiBpcyBwYXNzZWQgdG8gYWxsIGV2ZW50IGhhbmRsZXJzXG5cdFx0XHRoYW5kbGVPYmogPSBqUXVlcnkuZXh0ZW5kKHtcblx0XHRcdFx0dHlwZTogdHlwZSxcblx0XHRcdFx0b3JpZ1R5cGU6IHRuc1sxXSxcblx0XHRcdFx0ZGF0YTogZGF0YSxcblx0XHRcdFx0aGFuZGxlcjogaGFuZGxlcixcblx0XHRcdFx0Z3VpZDogaGFuZGxlci5ndWlkLFxuXHRcdFx0XHRzZWxlY3Rvcjogc2VsZWN0b3IsXG5cdFx0XHRcdG5hbWVzcGFjZTogbmFtZXNwYWNlcy5qb2luKFwiLlwiKVxuXHRcdFx0fSwgaGFuZGxlT2JqSW4gKTtcblxuXHRcdFx0Ly8gSW5pdCB0aGUgZXZlbnQgaGFuZGxlciBxdWV1ZSBpZiB3ZSdyZSB0aGUgZmlyc3Rcblx0XHRcdGhhbmRsZXJzID0gZXZlbnRzWyB0eXBlIF07XG5cdFx0XHRpZiAoICFoYW5kbGVycyApIHtcblx0XHRcdFx0aGFuZGxlcnMgPSBldmVudHNbIHR5cGUgXSA9IFtdO1xuXHRcdFx0XHRoYW5kbGVycy5kZWxlZ2F0ZUNvdW50ID0gMDtcblxuXHRcdFx0XHQvLyBPbmx5IHVzZSBhZGRFdmVudExpc3RlbmVyL2F0dGFjaEV2ZW50IGlmIHRoZSBzcGVjaWFsIGV2ZW50cyBoYW5kbGVyIHJldHVybnMgZmFsc2Vcblx0XHRcdFx0aWYgKCAhc3BlY2lhbC5zZXR1cCB8fCBzcGVjaWFsLnNldHVwLmNhbGwoIGVsZW0sIGRhdGEsIG5hbWVzcGFjZXMsIGV2ZW50SGFuZGxlICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdC8vIEJpbmQgdGhlIGdsb2JhbCBldmVudCBoYW5kbGVyIHRvIHRoZSBlbGVtZW50XG5cdFx0XHRcdFx0aWYgKCBlbGVtLmFkZEV2ZW50TGlzdGVuZXIgKSB7XG5cdFx0XHRcdFx0XHRlbGVtLmFkZEV2ZW50TGlzdGVuZXIoIHR5cGUsIGV2ZW50SGFuZGxlLCBmYWxzZSApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggZWxlbS5hdHRhY2hFdmVudCApIHtcblx0XHRcdFx0XHRcdGVsZW0uYXR0YWNoRXZlbnQoIFwib25cIiArIHR5cGUsIGV2ZW50SGFuZGxlICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmICggc3BlY2lhbC5hZGQgKSB7XG5cdFx0XHRcdHNwZWNpYWwuYWRkLmNhbGwoIGVsZW0sIGhhbmRsZU9iaiApO1xuXG5cdFx0XHRcdGlmICggIWhhbmRsZU9iai5oYW5kbGVyLmd1aWQgKSB7XG5cdFx0XHRcdFx0aGFuZGxlT2JqLmhhbmRsZXIuZ3VpZCA9IGhhbmRsZXIuZ3VpZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBBZGQgdG8gdGhlIGVsZW1lbnQncyBoYW5kbGVyIGxpc3QsIGRlbGVnYXRlcyBpbiBmcm9udFxuXHRcdFx0aWYgKCBzZWxlY3RvciApIHtcblx0XHRcdFx0aGFuZGxlcnMuc3BsaWNlKCBoYW5kbGVycy5kZWxlZ2F0ZUNvdW50KyssIDAsIGhhbmRsZU9iaiApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aGFuZGxlcnMucHVzaCggaGFuZGxlT2JqICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEtlZXAgdHJhY2sgb2Ygd2hpY2ggZXZlbnRzIGhhdmUgZXZlciBiZWVuIHVzZWQsIGZvciBldmVudCBvcHRpbWl6YXRpb25cblx0XHRcdGpRdWVyeS5ldmVudC5nbG9iYWxbIHR5cGUgXSA9IHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gTnVsbGlmeSBlbGVtIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzIGluIElFXG5cdFx0ZWxlbSA9IG51bGw7XG5cdH0sXG5cblx0Z2xvYmFsOiB7fSxcblxuXHQvLyBEZXRhY2ggYW4gZXZlbnQgb3Igc2V0IG9mIGV2ZW50cyBmcm9tIGFuIGVsZW1lbnRcblx0cmVtb3ZlOiBmdW5jdGlvbiggZWxlbSwgdHlwZXMsIGhhbmRsZXIsIHNlbGVjdG9yLCBtYXBwZWRUeXBlcyApIHtcblxuXHRcdHZhciB0LCB0bnMsIHR5cGUsIG9yaWdUeXBlLCBuYW1lc3BhY2VzLCBvcmlnQ291bnQsXG5cdFx0XHRqLCBldmVudHMsIHNwZWNpYWwsIGV2ZW50VHlwZSwgaGFuZGxlT2JqLFxuXHRcdFx0ZWxlbURhdGEgPSBqUXVlcnkuaGFzRGF0YSggZWxlbSApICYmIGpRdWVyeS5fZGF0YSggZWxlbSApO1xuXG5cdFx0aWYgKCAhZWxlbURhdGEgfHwgIShldmVudHMgPSBlbGVtRGF0YS5ldmVudHMpICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIE9uY2UgZm9yIGVhY2ggdHlwZS5uYW1lc3BhY2UgaW4gdHlwZXM7IHR5cGUgbWF5IGJlIG9taXR0ZWRcblx0XHR0eXBlcyA9IGpRdWVyeS50cmltKCBob3ZlckhhY2soIHR5cGVzIHx8IFwiXCIgKSApLnNwbGl0KFwiIFwiKTtcblx0XHRmb3IgKCB0ID0gMDsgdCA8IHR5cGVzLmxlbmd0aDsgdCsrICkge1xuXHRcdFx0dG5zID0gcnR5cGVuYW1lc3BhY2UuZXhlYyggdHlwZXNbdF0gKSB8fCBbXTtcblx0XHRcdHR5cGUgPSBvcmlnVHlwZSA9IHRuc1sxXTtcblx0XHRcdG5hbWVzcGFjZXMgPSB0bnNbMl07XG5cblx0XHRcdC8vIFVuYmluZCBhbGwgZXZlbnRzIChvbiB0aGlzIG5hbWVzcGFjZSwgaWYgcHJvdmlkZWQpIGZvciB0aGUgZWxlbWVudFxuXHRcdFx0aWYgKCAhdHlwZSApIHtcblx0XHRcdFx0Zm9yICggdHlwZSBpbiBldmVudHMgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5LmV2ZW50LnJlbW92ZSggZWxlbSwgdHlwZSArIHR5cGVzWyB0IF0sIGhhbmRsZXIsIHNlbGVjdG9yLCB0cnVlICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdHNwZWNpYWwgPSBqUXVlcnkuZXZlbnQuc3BlY2lhbFsgdHlwZSBdIHx8IHt9O1xuXHRcdFx0dHlwZSA9ICggc2VsZWN0b3I/IHNwZWNpYWwuZGVsZWdhdGVUeXBlIDogc3BlY2lhbC5iaW5kVHlwZSApIHx8IHR5cGU7XG5cdFx0XHRldmVudFR5cGUgPSBldmVudHNbIHR5cGUgXSB8fCBbXTtcblx0XHRcdG9yaWdDb3VudCA9IGV2ZW50VHlwZS5sZW5ndGg7XG5cdFx0XHRuYW1lc3BhY2VzID0gbmFtZXNwYWNlcyA/IG5ldyBSZWdFeHAoXCIoXnxcXFxcLilcIiArIG5hbWVzcGFjZXMuc3BsaXQoXCIuXCIpLnNvcnQoKS5qb2luKFwiXFxcXC4oPzouKlxcXFwufClcIikgKyBcIihcXFxcLnwkKVwiKSA6IG51bGw7XG5cblx0XHRcdC8vIFJlbW92ZSBtYXRjaGluZyBldmVudHNcblx0XHRcdGZvciAoIGogPSAwOyBqIDwgZXZlbnRUeXBlLmxlbmd0aDsgaisrICkge1xuXHRcdFx0XHRoYW5kbGVPYmogPSBldmVudFR5cGVbIGogXTtcblxuXHRcdFx0XHRpZiAoICggbWFwcGVkVHlwZXMgfHwgb3JpZ1R5cGUgPT09IGhhbmRsZU9iai5vcmlnVHlwZSApICYmXG5cdFx0XHRcdFx0ICggIWhhbmRsZXIgfHwgaGFuZGxlci5ndWlkID09PSBoYW5kbGVPYmouZ3VpZCApICYmXG5cdFx0XHRcdFx0ICggIW5hbWVzcGFjZXMgfHwgbmFtZXNwYWNlcy50ZXN0KCBoYW5kbGVPYmoubmFtZXNwYWNlICkgKSAmJlxuXHRcdFx0XHRcdCAoICFzZWxlY3RvciB8fCBzZWxlY3RvciA9PT0gaGFuZGxlT2JqLnNlbGVjdG9yIHx8IHNlbGVjdG9yID09PSBcIioqXCIgJiYgaGFuZGxlT2JqLnNlbGVjdG9yICkgKSB7XG5cdFx0XHRcdFx0ZXZlbnRUeXBlLnNwbGljZSggai0tLCAxICk7XG5cblx0XHRcdFx0XHRpZiAoIGhhbmRsZU9iai5zZWxlY3RvciApIHtcblx0XHRcdFx0XHRcdGV2ZW50VHlwZS5kZWxlZ2F0ZUNvdW50LS07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggc3BlY2lhbC5yZW1vdmUgKSB7XG5cdFx0XHRcdFx0XHRzcGVjaWFsLnJlbW92ZS5jYWxsKCBlbGVtLCBoYW5kbGVPYmogKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVtb3ZlIGdlbmVyaWMgZXZlbnQgaGFuZGxlciBpZiB3ZSByZW1vdmVkIHNvbWV0aGluZyBhbmQgbm8gbW9yZSBoYW5kbGVycyBleGlzdFxuXHRcdFx0Ly8gKGF2b2lkcyBwb3RlbnRpYWwgZm9yIGVuZGxlc3MgcmVjdXJzaW9uIGR1cmluZyByZW1vdmFsIG9mIHNwZWNpYWwgZXZlbnQgaGFuZGxlcnMpXG5cdFx0XHRpZiAoIGV2ZW50VHlwZS5sZW5ndGggPT09IDAgJiYgb3JpZ0NvdW50ICE9PSBldmVudFR5cGUubGVuZ3RoICkge1xuXHRcdFx0XHRpZiAoICFzcGVjaWFsLnRlYXJkb3duIHx8IHNwZWNpYWwudGVhcmRvd24uY2FsbCggZWxlbSwgbmFtZXNwYWNlcywgZWxlbURhdGEuaGFuZGxlICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRcdGpRdWVyeS5yZW1vdmVFdmVudCggZWxlbSwgdHlwZSwgZWxlbURhdGEuaGFuZGxlICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkZWxldGUgZXZlbnRzWyB0eXBlIF07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gUmVtb3ZlIHRoZSBleHBhbmRvIGlmIGl0J3Mgbm8gbG9uZ2VyIHVzZWRcblx0XHRpZiAoIGpRdWVyeS5pc0VtcHR5T2JqZWN0KCBldmVudHMgKSApIHtcblx0XHRcdGRlbGV0ZSBlbGVtRGF0YS5oYW5kbGU7XG5cblx0XHRcdC8vIHJlbW92ZURhdGEgYWxzbyBjaGVja3MgZm9yIGVtcHRpbmVzcyBhbmQgY2xlYXJzIHRoZSBleHBhbmRvIGlmIGVtcHR5XG5cdFx0XHQvLyBzbyB1c2UgaXQgaW5zdGVhZCBvZiBkZWxldGVcblx0XHRcdGpRdWVyeS5yZW1vdmVEYXRhKCBlbGVtLCBcImV2ZW50c1wiLCB0cnVlICk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIEV2ZW50cyB0aGF0IGFyZSBzYWZlIHRvIHNob3J0LWNpcmN1aXQgaWYgbm8gaGFuZGxlcnMgYXJlIGF0dGFjaGVkLlxuXHQvLyBOYXRpdmUgRE9NIGV2ZW50cyBzaG91bGQgbm90IGJlIGFkZGVkLCB0aGV5IG1heSBoYXZlIGlubGluZSBoYW5kbGVycy5cblx0Y3VzdG9tRXZlbnQ6IHtcblx0XHRcImdldERhdGFcIjogdHJ1ZSxcblx0XHRcInNldERhdGFcIjogdHJ1ZSxcblx0XHRcImNoYW5nZURhdGFcIjogdHJ1ZVxuXHR9LFxuXG5cdHRyaWdnZXI6IGZ1bmN0aW9uKCBldmVudCwgZGF0YSwgZWxlbSwgb25seUhhbmRsZXJzICkge1xuXHRcdC8vIERvbid0IGRvIGV2ZW50cyBvbiB0ZXh0IGFuZCBjb21tZW50IG5vZGVzXG5cdFx0aWYgKCBlbGVtICYmIChlbGVtLm5vZGVUeXBlID09PSAzIHx8IGVsZW0ubm9kZVR5cGUgPT09IDgpICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIEV2ZW50IG9iamVjdCBvciBldmVudCB0eXBlXG5cdFx0dmFyIGNhY2hlLCBleGNsdXNpdmUsIGksIGN1ciwgb2xkLCBvbnR5cGUsIHNwZWNpYWwsIGhhbmRsZSwgZXZlbnRQYXRoLCBidWJibGVUeXBlLFxuXHRcdFx0dHlwZSA9IGV2ZW50LnR5cGUgfHwgZXZlbnQsXG5cdFx0XHRuYW1lc3BhY2VzID0gW107XG5cblx0XHQvLyBmb2N1cy9ibHVyIG1vcnBocyB0byBmb2N1c2luL291dDsgZW5zdXJlIHdlJ3JlIG5vdCBmaXJpbmcgdGhlbSByaWdodCBub3dcblx0XHRpZiAoIHJmb2N1c01vcnBoLnRlc3QoIHR5cGUgKyBqUXVlcnkuZXZlbnQudHJpZ2dlcmVkICkgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKCB0eXBlLmluZGV4T2YoIFwiIVwiICkgPj0gMCApIHtcblx0XHRcdC8vIEV4Y2x1c2l2ZSBldmVudHMgdHJpZ2dlciBvbmx5IGZvciB0aGUgZXhhY3QgZXZlbnQgKG5vIG5hbWVzcGFjZXMpXG5cdFx0XHR0eXBlID0gdHlwZS5zbGljZSgwLCAtMSk7XG5cdFx0XHRleGNsdXNpdmUgPSB0cnVlO1xuXHRcdH1cblxuXHRcdGlmICggdHlwZS5pbmRleE9mKCBcIi5cIiApID49IDAgKSB7XG5cdFx0XHQvLyBOYW1lc3BhY2VkIHRyaWdnZXI7IGNyZWF0ZSBhIHJlZ2V4cCB0byBtYXRjaCBldmVudCB0eXBlIGluIGhhbmRsZSgpXG5cdFx0XHRuYW1lc3BhY2VzID0gdHlwZS5zcGxpdChcIi5cIik7XG5cdFx0XHR0eXBlID0gbmFtZXNwYWNlcy5zaGlmdCgpO1xuXHRcdFx0bmFtZXNwYWNlcy5zb3J0KCk7XG5cdFx0fVxuXG5cdFx0aWYgKCAoIWVsZW0gfHwgalF1ZXJ5LmV2ZW50LmN1c3RvbUV2ZW50WyB0eXBlIF0pICYmICFqUXVlcnkuZXZlbnQuZ2xvYmFsWyB0eXBlIF0gKSB7XG5cdFx0XHQvLyBObyBqUXVlcnkgaGFuZGxlcnMgZm9yIHRoaXMgZXZlbnQgdHlwZSwgYW5kIGl0IGNhbid0IGhhdmUgaW5saW5lIGhhbmRsZXJzXG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gQ2FsbGVyIGNhbiBwYXNzIGluIGFuIEV2ZW50LCBPYmplY3QsIG9yIGp1c3QgYW4gZXZlbnQgdHlwZSBzdHJpbmdcblx0XHRldmVudCA9IHR5cGVvZiBldmVudCA9PT0gXCJvYmplY3RcIiA/XG5cdFx0XHQvLyBqUXVlcnkuRXZlbnQgb2JqZWN0XG5cdFx0XHRldmVudFsgalF1ZXJ5LmV4cGFuZG8gXSA/IGV2ZW50IDpcblx0XHRcdC8vIE9iamVjdCBsaXRlcmFsXG5cdFx0XHRuZXcgalF1ZXJ5LkV2ZW50KCB0eXBlLCBldmVudCApIDpcblx0XHRcdC8vIEp1c3QgdGhlIGV2ZW50IHR5cGUgKHN0cmluZylcblx0XHRcdG5ldyBqUXVlcnkuRXZlbnQoIHR5cGUgKTtcblxuXHRcdGV2ZW50LnR5cGUgPSB0eXBlO1xuXHRcdGV2ZW50LmlzVHJpZ2dlciA9IHRydWU7XG5cdFx0ZXZlbnQuZXhjbHVzaXZlID0gZXhjbHVzaXZlO1xuXHRcdGV2ZW50Lm5hbWVzcGFjZSA9IG5hbWVzcGFjZXMuam9pbiggXCIuXCIgKTtcblx0XHRldmVudC5uYW1lc3BhY2VfcmUgPSBldmVudC5uYW1lc3BhY2U/IG5ldyBSZWdFeHAoXCIoXnxcXFxcLilcIiArIG5hbWVzcGFjZXMuam9pbihcIlxcXFwuKD86LipcXFxcLnwpXCIpICsgXCIoXFxcXC58JClcIikgOiBudWxsO1xuXHRcdG9udHlwZSA9IHR5cGUuaW5kZXhPZiggXCI6XCIgKSA8IDAgPyBcIm9uXCIgKyB0eXBlIDogXCJcIjtcblxuXHRcdC8vIEhhbmRsZSBhIGdsb2JhbCB0cmlnZ2VyXG5cdFx0aWYgKCAhZWxlbSApIHtcblxuXHRcdFx0Ly8gVE9ETzogU3RvcCB0YXVudGluZyB0aGUgZGF0YSBjYWNoZTsgcmVtb3ZlIGdsb2JhbCBldmVudHMgYW5kIGFsd2F5cyBhdHRhY2ggdG8gZG9jdW1lbnRcblx0XHRcdGNhY2hlID0galF1ZXJ5LmNhY2hlO1xuXHRcdFx0Zm9yICggaSBpbiBjYWNoZSApIHtcblx0XHRcdFx0aWYgKCBjYWNoZVsgaSBdLmV2ZW50cyAmJiBjYWNoZVsgaSBdLmV2ZW50c1sgdHlwZSBdICkge1xuXHRcdFx0XHRcdGpRdWVyeS5ldmVudC50cmlnZ2VyKCBldmVudCwgZGF0YSwgY2FjaGVbIGkgXS5oYW5kbGUuZWxlbSwgdHJ1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gQ2xlYW4gdXAgdGhlIGV2ZW50IGluIGNhc2UgaXQgaXMgYmVpbmcgcmV1c2VkXG5cdFx0ZXZlbnQucmVzdWx0ID0gdW5kZWZpbmVkO1xuXHRcdGlmICggIWV2ZW50LnRhcmdldCApIHtcblx0XHRcdGV2ZW50LnRhcmdldCA9IGVsZW07XG5cdFx0fVxuXG5cdFx0Ly8gQ2xvbmUgYW55IGluY29taW5nIGRhdGEgYW5kIHByZXBlbmQgdGhlIGV2ZW50LCBjcmVhdGluZyB0aGUgaGFuZGxlciBhcmcgbGlzdFxuXHRcdGRhdGEgPSBkYXRhICE9IG51bGwgPyBqUXVlcnkubWFrZUFycmF5KCBkYXRhICkgOiBbXTtcblx0XHRkYXRhLnVuc2hpZnQoIGV2ZW50ICk7XG5cblx0XHQvLyBBbGxvdyBzcGVjaWFsIGV2ZW50cyB0byBkcmF3IG91dHNpZGUgdGhlIGxpbmVzXG5cdFx0c3BlY2lhbCA9IGpRdWVyeS5ldmVudC5zcGVjaWFsWyB0eXBlIF0gfHwge307XG5cdFx0aWYgKCBzcGVjaWFsLnRyaWdnZXIgJiYgc3BlY2lhbC50cmlnZ2VyLmFwcGx5KCBlbGVtLCBkYXRhICkgPT09IGZhbHNlICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIERldGVybWluZSBldmVudCBwcm9wYWdhdGlvbiBwYXRoIGluIGFkdmFuY2UsIHBlciBXM0MgZXZlbnRzIHNwZWMgKCM5OTUxKVxuXHRcdC8vIEJ1YmJsZSB1cCB0byBkb2N1bWVudCwgdGhlbiB0byB3aW5kb3c7IHdhdGNoIGZvciBhIGdsb2JhbCBvd25lckRvY3VtZW50IHZhciAoIzk3MjQpXG5cdFx0ZXZlbnRQYXRoID0gW1sgZWxlbSwgc3BlY2lhbC5iaW5kVHlwZSB8fCB0eXBlIF1dO1xuXHRcdGlmICggIW9ubHlIYW5kbGVycyAmJiAhc3BlY2lhbC5ub0J1YmJsZSAmJiAhalF1ZXJ5LmlzV2luZG93KCBlbGVtICkgKSB7XG5cblx0XHRcdGJ1YmJsZVR5cGUgPSBzcGVjaWFsLmRlbGVnYXRlVHlwZSB8fCB0eXBlO1xuXHRcdFx0Y3VyID0gcmZvY3VzTW9ycGgudGVzdCggYnViYmxlVHlwZSArIHR5cGUgKSA/IGVsZW0gOiBlbGVtLnBhcmVudE5vZGU7XG5cdFx0XHRmb3IgKCBvbGQgPSBlbGVtOyBjdXI7IGN1ciA9IGN1ci5wYXJlbnROb2RlICkge1xuXHRcdFx0XHRldmVudFBhdGgucHVzaChbIGN1ciwgYnViYmxlVHlwZSBdKTtcblx0XHRcdFx0b2xkID0gY3VyO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBPbmx5IGFkZCB3aW5kb3cgaWYgd2UgZ290IHRvIGRvY3VtZW50IChlLmcuLCBub3QgcGxhaW4gb2JqIG9yIGRldGFjaGVkIERPTSlcblx0XHRcdGlmICggb2xkID09PSAoZWxlbS5vd25lckRvY3VtZW50IHx8IGRvY3VtZW50KSApIHtcblx0XHRcdFx0ZXZlbnRQYXRoLnB1c2goWyBvbGQuZGVmYXVsdFZpZXcgfHwgb2xkLnBhcmVudFdpbmRvdyB8fCB3aW5kb3csIGJ1YmJsZVR5cGUgXSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gRmlyZSBoYW5kbGVycyBvbiB0aGUgZXZlbnQgcGF0aFxuXHRcdGZvciAoIGkgPSAwOyBpIDwgZXZlbnRQYXRoLmxlbmd0aCAmJiAhZXZlbnQuaXNQcm9wYWdhdGlvblN0b3BwZWQoKTsgaSsrICkge1xuXG5cdFx0XHRjdXIgPSBldmVudFBhdGhbaV1bMF07XG5cdFx0XHRldmVudC50eXBlID0gZXZlbnRQYXRoW2ldWzFdO1xuXG5cdFx0XHRoYW5kbGUgPSAoIGpRdWVyeS5fZGF0YSggY3VyLCBcImV2ZW50c1wiICkgfHwge30gKVsgZXZlbnQudHlwZSBdICYmIGpRdWVyeS5fZGF0YSggY3VyLCBcImhhbmRsZVwiICk7XG5cdFx0XHRpZiAoIGhhbmRsZSApIHtcblx0XHRcdFx0aGFuZGxlLmFwcGx5KCBjdXIsIGRhdGEgKTtcblx0XHRcdH1cblx0XHRcdC8vIE5vdGUgdGhhdCB0aGlzIGlzIGEgYmFyZSBKUyBmdW5jdGlvbiBhbmQgbm90IGEgalF1ZXJ5IGhhbmRsZXJcblx0XHRcdGhhbmRsZSA9IG9udHlwZSAmJiBjdXJbIG9udHlwZSBdO1xuXHRcdFx0aWYgKCBoYW5kbGUgJiYgalF1ZXJ5LmFjY2VwdERhdGEoIGN1ciApICYmIGhhbmRsZS5hcHBseSggY3VyLCBkYXRhICkgPT09IGZhbHNlICkge1xuXHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRldmVudC50eXBlID0gdHlwZTtcblxuXHRcdC8vIElmIG5vYm9keSBwcmV2ZW50ZWQgdGhlIGRlZmF1bHQgYWN0aW9uLCBkbyBpdCBub3dcblx0XHRpZiAoICFvbmx5SGFuZGxlcnMgJiYgIWV2ZW50LmlzRGVmYXVsdFByZXZlbnRlZCgpICkge1xuXG5cdFx0XHRpZiAoICghc3BlY2lhbC5fZGVmYXVsdCB8fCBzcGVjaWFsLl9kZWZhdWx0LmFwcGx5KCBlbGVtLm93bmVyRG9jdW1lbnQsIGRhdGEgKSA9PT0gZmFsc2UpICYmXG5cdFx0XHRcdCEodHlwZSA9PT0gXCJjbGlja1wiICYmIGpRdWVyeS5ub2RlTmFtZSggZWxlbSwgXCJhXCIgKSkgJiYgalF1ZXJ5LmFjY2VwdERhdGEoIGVsZW0gKSApIHtcblxuXHRcdFx0XHQvLyBDYWxsIGEgbmF0aXZlIERPTSBtZXRob2Qgb24gdGhlIHRhcmdldCB3aXRoIHRoZSBzYW1lIG5hbWUgbmFtZSBhcyB0aGUgZXZlbnQuXG5cdFx0XHRcdC8vIENhbid0IHVzZSBhbiAuaXNGdW5jdGlvbigpIGNoZWNrIGhlcmUgYmVjYXVzZSBJRTYvNyBmYWlscyB0aGF0IHRlc3QuXG5cdFx0XHRcdC8vIERvbid0IGRvIGRlZmF1bHQgYWN0aW9ucyBvbiB3aW5kb3csIHRoYXQncyB3aGVyZSBnbG9iYWwgdmFyaWFibGVzIGJlICgjNjE3MClcblx0XHRcdFx0Ly8gSUU8OSBkaWVzIG9uIGZvY3VzL2JsdXIgdG8gaGlkZGVuIGVsZW1lbnQgKCMxNDg2KVxuXHRcdFx0XHRpZiAoIG9udHlwZSAmJiBlbGVtWyB0eXBlIF0gJiYgKCh0eXBlICE9PSBcImZvY3VzXCIgJiYgdHlwZSAhPT0gXCJibHVyXCIpIHx8IGV2ZW50LnRhcmdldC5vZmZzZXRXaWR0aCAhPT0gMCkgJiYgIWpRdWVyeS5pc1dpbmRvdyggZWxlbSApICkge1xuXG5cdFx0XHRcdFx0Ly8gRG9uJ3QgcmUtdHJpZ2dlciBhbiBvbkZPTyBldmVudCB3aGVuIHdlIGNhbGwgaXRzIEZPTygpIG1ldGhvZFxuXHRcdFx0XHRcdG9sZCA9IGVsZW1bIG9udHlwZSBdO1xuXG5cdFx0XHRcdFx0aWYgKCBvbGQgKSB7XG5cdFx0XHRcdFx0XHRlbGVtWyBvbnR5cGUgXSA9IG51bGw7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gUHJldmVudCByZS10cmlnZ2VyaW5nIG9mIHRoZSBzYW1lIGV2ZW50LCBzaW5jZSB3ZSBhbHJlYWR5IGJ1YmJsZWQgaXQgYWJvdmVcblx0XHRcdFx0XHRqUXVlcnkuZXZlbnQudHJpZ2dlcmVkID0gdHlwZTtcblx0XHRcdFx0XHRlbGVtWyB0eXBlIF0oKTtcblx0XHRcdFx0XHRqUXVlcnkuZXZlbnQudHJpZ2dlcmVkID0gdW5kZWZpbmVkO1xuXG5cdFx0XHRcdFx0aWYgKCBvbGQgKSB7XG5cdFx0XHRcdFx0XHRlbGVtWyBvbnR5cGUgXSA9IG9sZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZXZlbnQucmVzdWx0O1xuXHR9LFxuXG5cdGRpc3BhdGNoOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cblx0XHQvLyBNYWtlIGEgd3JpdGFibGUgalF1ZXJ5LkV2ZW50IGZyb20gdGhlIG5hdGl2ZSBldmVudCBvYmplY3Rcblx0XHRldmVudCA9IGpRdWVyeS5ldmVudC5maXgoIGV2ZW50IHx8IHdpbmRvdy5ldmVudCApO1xuXG5cdFx0dmFyIGksIGosIGN1ciwgcmV0LCBzZWxNYXRjaCwgbWF0Y2hlZCwgbWF0Y2hlcywgaGFuZGxlT2JqLCBzZWwsIHJlbGF0ZWQsXG5cdFx0XHRoYW5kbGVycyA9ICggKGpRdWVyeS5fZGF0YSggdGhpcywgXCJldmVudHNcIiApIHx8IHt9IClbIGV2ZW50LnR5cGUgXSB8fCBbXSksXG5cdFx0XHRkZWxlZ2F0ZUNvdW50ID0gaGFuZGxlcnMuZGVsZWdhdGVDb3VudCxcblx0XHRcdGFyZ3MgPSBbXS5zbGljZS5jYWxsKCBhcmd1bWVudHMgKSxcblx0XHRcdHJ1bl9hbGwgPSAhZXZlbnQuZXhjbHVzaXZlICYmICFldmVudC5uYW1lc3BhY2UsXG5cdFx0XHRzcGVjaWFsID0galF1ZXJ5LmV2ZW50LnNwZWNpYWxbIGV2ZW50LnR5cGUgXSB8fCB7fSxcblx0XHRcdGhhbmRsZXJRdWV1ZSA9IFtdO1xuXG5cdFx0Ly8gVXNlIHRoZSBmaXgtZWQgalF1ZXJ5LkV2ZW50IHJhdGhlciB0aGFuIHRoZSAocmVhZC1vbmx5KSBuYXRpdmUgZXZlbnRcblx0XHRhcmdzWzBdID0gZXZlbnQ7XG5cdFx0ZXZlbnQuZGVsZWdhdGVUYXJnZXQgPSB0aGlzO1xuXG5cdFx0Ly8gQ2FsbCB0aGUgcHJlRGlzcGF0Y2ggaG9vayBmb3IgdGhlIG1hcHBlZCB0eXBlLCBhbmQgbGV0IGl0IGJhaWwgaWYgZGVzaXJlZFxuXHRcdGlmICggc3BlY2lhbC5wcmVEaXNwYXRjaCAmJiBzcGVjaWFsLnByZURpc3BhdGNoLmNhbGwoIHRoaXMsIGV2ZW50ICkgPT09IGZhbHNlICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIERldGVybWluZSBoYW5kbGVycyB0aGF0IHNob3VsZCBydW4gaWYgdGhlcmUgYXJlIGRlbGVnYXRlZCBldmVudHNcblx0XHQvLyBBdm9pZCBub24tbGVmdC1jbGljayBidWJibGluZyBpbiBGaXJlZm94ICgjMzg2MSlcblx0XHRpZiAoIGRlbGVnYXRlQ291bnQgJiYgIShldmVudC5idXR0b24gJiYgZXZlbnQudHlwZSA9PT0gXCJjbGlja1wiKSApIHtcblxuXHRcdFx0Zm9yICggY3VyID0gZXZlbnQudGFyZ2V0OyBjdXIgIT0gdGhpczsgY3VyID0gY3VyLnBhcmVudE5vZGUgfHwgdGhpcyApIHtcblxuXHRcdFx0XHQvLyBEb24ndCBwcm9jZXNzIGNsaWNrcyAoT05MWSkgb24gZGlzYWJsZWQgZWxlbWVudHMgKCM2OTExLCAjODE2NSwgIzExMzgyLCAjMTE3NjQpXG5cdFx0XHRcdGlmICggY3VyLmRpc2FibGVkICE9PSB0cnVlIHx8IGV2ZW50LnR5cGUgIT09IFwiY2xpY2tcIiApIHtcblx0XHRcdFx0XHRzZWxNYXRjaCA9IHt9O1xuXHRcdFx0XHRcdG1hdGNoZXMgPSBbXTtcblx0XHRcdFx0XHRmb3IgKCBpID0gMDsgaSA8IGRlbGVnYXRlQ291bnQ7IGkrKyApIHtcblx0XHRcdFx0XHRcdGhhbmRsZU9iaiA9IGhhbmRsZXJzWyBpIF07XG5cdFx0XHRcdFx0XHRzZWwgPSBoYW5kbGVPYmouc2VsZWN0b3I7XG5cblx0XHRcdFx0XHRcdGlmICggc2VsTWF0Y2hbIHNlbCBdID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0XHRcdHNlbE1hdGNoWyBzZWwgXSA9IGpRdWVyeSggc2VsLCB0aGlzICkuaW5kZXgoIGN1ciApID49IDA7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIHNlbE1hdGNoWyBzZWwgXSApIHtcblx0XHRcdFx0XHRcdFx0bWF0Y2hlcy5wdXNoKCBoYW5kbGVPYmogKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCBtYXRjaGVzLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdGhhbmRsZXJRdWV1ZS5wdXNoKHsgZWxlbTogY3VyLCBtYXRjaGVzOiBtYXRjaGVzIH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEFkZCB0aGUgcmVtYWluaW5nIChkaXJlY3RseS1ib3VuZCkgaGFuZGxlcnNcblx0XHRpZiAoIGhhbmRsZXJzLmxlbmd0aCA+IGRlbGVnYXRlQ291bnQgKSB7XG5cdFx0XHRoYW5kbGVyUXVldWUucHVzaCh7IGVsZW06IHRoaXMsIG1hdGNoZXM6IGhhbmRsZXJzLnNsaWNlKCBkZWxlZ2F0ZUNvdW50ICkgfSk7XG5cdFx0fVxuXG5cdFx0Ly8gUnVuIGRlbGVnYXRlcyBmaXJzdDsgdGhleSBtYXkgd2FudCB0byBzdG9wIHByb3BhZ2F0aW9uIGJlbmVhdGggdXNcblx0XHRmb3IgKCBpID0gMDsgaSA8IGhhbmRsZXJRdWV1ZS5sZW5ndGggJiYgIWV2ZW50LmlzUHJvcGFnYXRpb25TdG9wcGVkKCk7IGkrKyApIHtcblx0XHRcdG1hdGNoZWQgPSBoYW5kbGVyUXVldWVbIGkgXTtcblx0XHRcdGV2ZW50LmN1cnJlbnRUYXJnZXQgPSBtYXRjaGVkLmVsZW07XG5cblx0XHRcdGZvciAoIGogPSAwOyBqIDwgbWF0Y2hlZC5tYXRjaGVzLmxlbmd0aCAmJiAhZXZlbnQuaXNJbW1lZGlhdGVQcm9wYWdhdGlvblN0b3BwZWQoKTsgaisrICkge1xuXHRcdFx0XHRoYW5kbGVPYmogPSBtYXRjaGVkLm1hdGNoZXNbIGogXTtcblxuXHRcdFx0XHQvLyBUcmlnZ2VyZWQgZXZlbnQgbXVzdCBlaXRoZXIgMSkgYmUgbm9uLWV4Y2x1c2l2ZSBhbmQgaGF2ZSBubyBuYW1lc3BhY2UsIG9yXG5cdFx0XHRcdC8vIDIpIGhhdmUgbmFtZXNwYWNlKHMpIGEgc3Vic2V0IG9yIGVxdWFsIHRvIHRob3NlIGluIHRoZSBib3VuZCBldmVudCAoYm90aCBjYW4gaGF2ZSBubyBuYW1lc3BhY2UpLlxuXHRcdFx0XHRpZiAoIHJ1bl9hbGwgfHwgKCFldmVudC5uYW1lc3BhY2UgJiYgIWhhbmRsZU9iai5uYW1lc3BhY2UpIHx8IGV2ZW50Lm5hbWVzcGFjZV9yZSAmJiBldmVudC5uYW1lc3BhY2VfcmUudGVzdCggaGFuZGxlT2JqLm5hbWVzcGFjZSApICkge1xuXG5cdFx0XHRcdFx0ZXZlbnQuZGF0YSA9IGhhbmRsZU9iai5kYXRhO1xuXHRcdFx0XHRcdGV2ZW50LmhhbmRsZU9iaiA9IGhhbmRsZU9iajtcblxuXHRcdFx0XHRcdHJldCA9ICggKGpRdWVyeS5ldmVudC5zcGVjaWFsWyBoYW5kbGVPYmoub3JpZ1R5cGUgXSB8fCB7fSkuaGFuZGxlIHx8IGhhbmRsZU9iai5oYW5kbGVyIClcblx0XHRcdFx0XHRcdFx0LmFwcGx5KCBtYXRjaGVkLmVsZW0sIGFyZ3MgKTtcblxuXHRcdFx0XHRcdGlmICggcmV0ICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdFx0XHRldmVudC5yZXN1bHQgPSByZXQ7XG5cdFx0XHRcdFx0XHRpZiAoIHJldCA9PT0gZmFsc2UgKSB7XG5cdFx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIENhbGwgdGhlIHBvc3REaXNwYXRjaCBob29rIGZvciB0aGUgbWFwcGVkIHR5cGVcblx0XHRpZiAoIHNwZWNpYWwucG9zdERpc3BhdGNoICkge1xuXHRcdFx0c3BlY2lhbC5wb3N0RGlzcGF0Y2guY2FsbCggdGhpcywgZXZlbnQgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZXZlbnQucmVzdWx0O1xuXHR9LFxuXG5cdC8vIEluY2x1ZGVzIHNvbWUgZXZlbnQgcHJvcHMgc2hhcmVkIGJ5IEtleUV2ZW50IGFuZCBNb3VzZUV2ZW50XG5cdC8vICoqKiBhdHRyQ2hhbmdlIGF0dHJOYW1lIHJlbGF0ZWROb2RlIHNyY0VsZW1lbnQgIGFyZSBub3Qgbm9ybWFsaXplZCwgbm9uLVczQywgZGVwcmVjYXRlZCwgd2lsbCBiZSByZW1vdmVkIGluIDEuOCAqKipcblx0cHJvcHM6IFwiYXR0ckNoYW5nZSBhdHRyTmFtZSByZWxhdGVkTm9kZSBzcmNFbGVtZW50IGFsdEtleSBidWJibGVzIGNhbmNlbGFibGUgY3RybEtleSBjdXJyZW50VGFyZ2V0IGV2ZW50UGhhc2UgbWV0YUtleSByZWxhdGVkVGFyZ2V0IHNoaWZ0S2V5IHRhcmdldCB0aW1lU3RhbXAgdmlldyB3aGljaFwiLnNwbGl0KFwiIFwiKSxcblxuXHRmaXhIb29rczoge30sXG5cblx0a2V5SG9va3M6IHtcblx0XHRwcm9wczogXCJjaGFyIGNoYXJDb2RlIGtleSBrZXlDb2RlXCIuc3BsaXQoXCIgXCIpLFxuXHRcdGZpbHRlcjogZnVuY3Rpb24oIGV2ZW50LCBvcmlnaW5hbCApIHtcblxuXHRcdFx0Ly8gQWRkIHdoaWNoIGZvciBrZXkgZXZlbnRzXG5cdFx0XHRpZiAoIGV2ZW50LndoaWNoID09IG51bGwgKSB7XG5cdFx0XHRcdGV2ZW50LndoaWNoID0gb3JpZ2luYWwuY2hhckNvZGUgIT0gbnVsbCA/IG9yaWdpbmFsLmNoYXJDb2RlIDogb3JpZ2luYWwua2V5Q29kZTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGV2ZW50O1xuXHRcdH1cblx0fSxcblxuXHRtb3VzZUhvb2tzOiB7XG5cdFx0cHJvcHM6IFwiYnV0dG9uIGJ1dHRvbnMgY2xpZW50WCBjbGllbnRZIGZyb21FbGVtZW50IG9mZnNldFggb2Zmc2V0WSBwYWdlWCBwYWdlWSBzY3JlZW5YIHNjcmVlblkgdG9FbGVtZW50XCIuc3BsaXQoXCIgXCIpLFxuXHRcdGZpbHRlcjogZnVuY3Rpb24oIGV2ZW50LCBvcmlnaW5hbCApIHtcblx0XHRcdHZhciBldmVudERvYywgZG9jLCBib2R5LFxuXHRcdFx0XHRidXR0b24gPSBvcmlnaW5hbC5idXR0b24sXG5cdFx0XHRcdGZyb21FbGVtZW50ID0gb3JpZ2luYWwuZnJvbUVsZW1lbnQ7XG5cblx0XHRcdC8vIENhbGN1bGF0ZSBwYWdlWC9ZIGlmIG1pc3NpbmcgYW5kIGNsaWVudFgvWSBhdmFpbGFibGVcblx0XHRcdGlmICggZXZlbnQucGFnZVggPT0gbnVsbCAmJiBvcmlnaW5hbC5jbGllbnRYICE9IG51bGwgKSB7XG5cdFx0XHRcdGV2ZW50RG9jID0gZXZlbnQudGFyZ2V0Lm93bmVyRG9jdW1lbnQgfHwgZG9jdW1lbnQ7XG5cdFx0XHRcdGRvYyA9IGV2ZW50RG9jLmRvY3VtZW50RWxlbWVudDtcblx0XHRcdFx0Ym9keSA9IGV2ZW50RG9jLmJvZHk7XG5cblx0XHRcdFx0ZXZlbnQucGFnZVggPSBvcmlnaW5hbC5jbGllbnRYICsgKCBkb2MgJiYgZG9jLnNjcm9sbExlZnQgfHwgYm9keSAmJiBib2R5LnNjcm9sbExlZnQgfHwgMCApIC0gKCBkb2MgJiYgZG9jLmNsaWVudExlZnQgfHwgYm9keSAmJiBib2R5LmNsaWVudExlZnQgfHwgMCApO1xuXHRcdFx0XHRldmVudC5wYWdlWSA9IG9yaWdpbmFsLmNsaWVudFkgKyAoIGRvYyAmJiBkb2Muc2Nyb2xsVG9wICB8fCBib2R5ICYmIGJvZHkuc2Nyb2xsVG9wICB8fCAwICkgLSAoIGRvYyAmJiBkb2MuY2xpZW50VG9wICB8fCBib2R5ICYmIGJvZHkuY2xpZW50VG9wICB8fCAwICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEFkZCByZWxhdGVkVGFyZ2V0LCBpZiBuZWNlc3Nhcnlcblx0XHRcdGlmICggIWV2ZW50LnJlbGF0ZWRUYXJnZXQgJiYgZnJvbUVsZW1lbnQgKSB7XG5cdFx0XHRcdGV2ZW50LnJlbGF0ZWRUYXJnZXQgPSBmcm9tRWxlbWVudCA9PT0gZXZlbnQudGFyZ2V0ID8gb3JpZ2luYWwudG9FbGVtZW50IDogZnJvbUVsZW1lbnQ7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEFkZCB3aGljaCBmb3IgY2xpY2s6IDEgPT09IGxlZnQ7IDIgPT09IG1pZGRsZTsgMyA9PT0gcmlnaHRcblx0XHRcdC8vIE5vdGU6IGJ1dHRvbiBpcyBub3Qgbm9ybWFsaXplZCwgc28gZG9uJ3QgdXNlIGl0XG5cdFx0XHRpZiAoICFldmVudC53aGljaCAmJiBidXR0b24gIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0ZXZlbnQud2hpY2ggPSAoIGJ1dHRvbiAmIDEgPyAxIDogKCBidXR0b24gJiAyID8gMyA6ICggYnV0dG9uICYgNCA/IDIgOiAwICkgKSApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZXZlbnQ7XG5cdFx0fVxuXHR9LFxuXG5cdGZpeDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGlmICggZXZlbnRbIGpRdWVyeS5leHBhbmRvIF0gKSB7XG5cdFx0XHRyZXR1cm4gZXZlbnQ7XG5cdFx0fVxuXG5cdFx0Ly8gQ3JlYXRlIGEgd3JpdGFibGUgY29weSBvZiB0aGUgZXZlbnQgb2JqZWN0IGFuZCBub3JtYWxpemUgc29tZSBwcm9wZXJ0aWVzXG5cdFx0dmFyIGksIHByb3AsXG5cdFx0XHRvcmlnaW5hbEV2ZW50ID0gZXZlbnQsXG5cdFx0XHRmaXhIb29rID0galF1ZXJ5LmV2ZW50LmZpeEhvb2tzWyBldmVudC50eXBlIF0gfHwge30sXG5cdFx0XHRjb3B5ID0gZml4SG9vay5wcm9wcyA/IHRoaXMucHJvcHMuY29uY2F0KCBmaXhIb29rLnByb3BzICkgOiB0aGlzLnByb3BzO1xuXG5cdFx0ZXZlbnQgPSBqUXVlcnkuRXZlbnQoIG9yaWdpbmFsRXZlbnQgKTtcblxuXHRcdGZvciAoIGkgPSBjb3B5Lmxlbmd0aDsgaTsgKSB7XG5cdFx0XHRwcm9wID0gY29weVsgLS1pIF07XG5cdFx0XHRldmVudFsgcHJvcCBdID0gb3JpZ2luYWxFdmVudFsgcHJvcCBdO1xuXHRcdH1cblxuXHRcdC8vIEZpeCB0YXJnZXQgcHJvcGVydHksIGlmIG5lY2Vzc2FyeSAoIzE5MjUsIElFIDYvNy84ICYgU2FmYXJpMilcblx0XHRpZiAoICFldmVudC50YXJnZXQgKSB7XG5cdFx0XHRldmVudC50YXJnZXQgPSBvcmlnaW5hbEV2ZW50LnNyY0VsZW1lbnQgfHwgZG9jdW1lbnQ7XG5cdFx0fVxuXG5cdFx0Ly8gVGFyZ2V0IHNob3VsZCBub3QgYmUgYSB0ZXh0IG5vZGUgKCM1MDQsIFNhZmFyaSlcblx0XHRpZiAoIGV2ZW50LnRhcmdldC5ub2RlVHlwZSA9PT0gMyApIHtcblx0XHRcdGV2ZW50LnRhcmdldCA9IGV2ZW50LnRhcmdldC5wYXJlbnROb2RlO1xuXHRcdH1cblxuXHRcdC8vIEZvciBtb3VzZS9rZXkgZXZlbnRzLCBtZXRhS2V5PT1mYWxzZSBpZiBpdCdzIHVuZGVmaW5lZCAoIzMzNjgsICMxMTMyODsgSUU2LzcvOClcblx0XHRldmVudC5tZXRhS2V5ID0gISFldmVudC5tZXRhS2V5O1xuXG5cdFx0cmV0dXJuIGZpeEhvb2suZmlsdGVyPyBmaXhIb29rLmZpbHRlciggZXZlbnQsIG9yaWdpbmFsRXZlbnQgKSA6IGV2ZW50O1xuXHR9LFxuXG5cdHNwZWNpYWw6IHtcblx0XHRsb2FkOiB7XG5cdFx0XHQvLyBQcmV2ZW50IHRyaWdnZXJlZCBpbWFnZS5sb2FkIGV2ZW50cyBmcm9tIGJ1YmJsaW5nIHRvIHdpbmRvdy5sb2FkXG5cdFx0XHRub0J1YmJsZTogdHJ1ZVxuXHRcdH0sXG5cblx0XHRmb2N1czoge1xuXHRcdFx0ZGVsZWdhdGVUeXBlOiBcImZvY3VzaW5cIlxuXHRcdH0sXG5cdFx0Ymx1cjoge1xuXHRcdFx0ZGVsZWdhdGVUeXBlOiBcImZvY3Vzb3V0XCJcblx0XHR9LFxuXG5cdFx0YmVmb3JldW5sb2FkOiB7XG5cdFx0XHRzZXR1cDogZnVuY3Rpb24oIGRhdGEsIG5hbWVzcGFjZXMsIGV2ZW50SGFuZGxlICkge1xuXHRcdFx0XHQvLyBXZSBvbmx5IHdhbnQgdG8gZG8gdGhpcyBzcGVjaWFsIGNhc2Ugb24gd2luZG93c1xuXHRcdFx0XHRpZiAoIGpRdWVyeS5pc1dpbmRvdyggdGhpcyApICkge1xuXHRcdFx0XHRcdHRoaXMub25iZWZvcmV1bmxvYWQgPSBldmVudEhhbmRsZTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0dGVhcmRvd246IGZ1bmN0aW9uKCBuYW1lc3BhY2VzLCBldmVudEhhbmRsZSApIHtcblx0XHRcdFx0aWYgKCB0aGlzLm9uYmVmb3JldW5sb2FkID09PSBldmVudEhhbmRsZSApIHtcblx0XHRcdFx0XHR0aGlzLm9uYmVmb3JldW5sb2FkID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHRzaW11bGF0ZTogZnVuY3Rpb24oIHR5cGUsIGVsZW0sIGV2ZW50LCBidWJibGUgKSB7XG5cdFx0Ly8gUGlnZ3liYWNrIG9uIGEgZG9ub3IgZXZlbnQgdG8gc2ltdWxhdGUgYSBkaWZmZXJlbnQgb25lLlxuXHRcdC8vIEZha2Ugb3JpZ2luYWxFdmVudCB0byBhdm9pZCBkb25vcidzIHN0b3BQcm9wYWdhdGlvbiwgYnV0IGlmIHRoZVxuXHRcdC8vIHNpbXVsYXRlZCBldmVudCBwcmV2ZW50cyBkZWZhdWx0IHRoZW4gd2UgZG8gdGhlIHNhbWUgb24gdGhlIGRvbm9yLlxuXHRcdHZhciBlID0galF1ZXJ5LmV4dGVuZChcblx0XHRcdG5ldyBqUXVlcnkuRXZlbnQoKSxcblx0XHRcdGV2ZW50LFxuXHRcdFx0eyB0eXBlOiB0eXBlLFxuXHRcdFx0XHRpc1NpbXVsYXRlZDogdHJ1ZSxcblx0XHRcdFx0b3JpZ2luYWxFdmVudDoge31cblx0XHRcdH1cblx0XHQpO1xuXHRcdGlmICggYnViYmxlICkge1xuXHRcdFx0alF1ZXJ5LmV2ZW50LnRyaWdnZXIoIGUsIG51bGwsIGVsZW0gKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0alF1ZXJ5LmV2ZW50LmRpc3BhdGNoLmNhbGwoIGVsZW0sIGUgKTtcblx0XHR9XG5cdFx0aWYgKCBlLmlzRGVmYXVsdFByZXZlbnRlZCgpICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHR9XG5cdH1cbn07XG5cbi8vIFNvbWUgcGx1Z2lucyBhcmUgdXNpbmcsIGJ1dCBpdCdzIHVuZG9jdW1lbnRlZC9kZXByZWNhdGVkIGFuZCB3aWxsIGJlIHJlbW92ZWQuXG4vLyBUaGUgMS43IHNwZWNpYWwgZXZlbnQgaW50ZXJmYWNlIHNob3VsZCBwcm92aWRlIGFsbCB0aGUgaG9va3MgbmVlZGVkIG5vdy5cbmpRdWVyeS5ldmVudC5oYW5kbGUgPSBqUXVlcnkuZXZlbnQuZGlzcGF0Y2g7XG5cbmpRdWVyeS5yZW1vdmVFdmVudCA9IGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIgP1xuXHRmdW5jdGlvbiggZWxlbSwgdHlwZSwgaGFuZGxlICkge1xuXHRcdGlmICggZWxlbS5yZW1vdmVFdmVudExpc3RlbmVyICkge1xuXHRcdFx0ZWxlbS5yZW1vdmVFdmVudExpc3RlbmVyKCB0eXBlLCBoYW5kbGUsIGZhbHNlICk7XG5cdFx0fVxuXHR9IDpcblx0ZnVuY3Rpb24oIGVsZW0sIHR5cGUsIGhhbmRsZSApIHtcblx0XHR2YXIgbmFtZSA9IFwib25cIiArIHR5cGU7XG5cblx0XHRpZiAoIGVsZW0uZGV0YWNoRXZlbnQgKSB7XG5cblx0XHRcdC8vICM4NTQ1LCAjNzA1NCwgcHJldmVudGluZyBtZW1vcnkgbGVha3MgZm9yIGN1c3RvbSBldmVudHMgaW4gSUU2LTgg4oCTXG5cdFx0XHQvLyBkZXRhY2hFdmVudCBuZWVkZWQgcHJvcGVydHkgb24gZWxlbWVudCwgYnkgbmFtZSBvZiB0aGF0IGV2ZW50LCB0byBwcm9wZXJseSBleHBvc2UgaXQgdG8gR0Ncblx0XHRcdGlmICggdHlwZW9mIGVsZW1bIG5hbWUgXSA9PT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdFx0ZWxlbVsgbmFtZSBdID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0ZWxlbS5kZXRhY2hFdmVudCggbmFtZSwgaGFuZGxlICk7XG5cdFx0fVxuXHR9O1xuXG5qUXVlcnkuRXZlbnQgPSBmdW5jdGlvbiggc3JjLCBwcm9wcyApIHtcblx0Ly8gQWxsb3cgaW5zdGFudGlhdGlvbiB3aXRob3V0IHRoZSAnbmV3JyBrZXl3b3JkXG5cdGlmICggISh0aGlzIGluc3RhbmNlb2YgalF1ZXJ5LkV2ZW50KSApIHtcblx0XHRyZXR1cm4gbmV3IGpRdWVyeS5FdmVudCggc3JjLCBwcm9wcyApO1xuXHR9XG5cblx0Ly8gRXZlbnQgb2JqZWN0XG5cdGlmICggc3JjICYmIHNyYy50eXBlICkge1xuXHRcdHRoaXMub3JpZ2luYWxFdmVudCA9IHNyYztcblx0XHR0aGlzLnR5cGUgPSBzcmMudHlwZTtcblxuXHRcdC8vIEV2ZW50cyBidWJibGluZyB1cCB0aGUgZG9jdW1lbnQgbWF5IGhhdmUgYmVlbiBtYXJrZWQgYXMgcHJldmVudGVkXG5cdFx0Ly8gYnkgYSBoYW5kbGVyIGxvd2VyIGRvd24gdGhlIHRyZWU7IHJlZmxlY3QgdGhlIGNvcnJlY3QgdmFsdWUuXG5cdFx0dGhpcy5pc0RlZmF1bHRQcmV2ZW50ZWQgPSAoIHNyYy5kZWZhdWx0UHJldmVudGVkIHx8IHNyYy5yZXR1cm5WYWx1ZSA9PT0gZmFsc2UgfHxcblx0XHRcdHNyYy5nZXRQcmV2ZW50RGVmYXVsdCAmJiBzcmMuZ2V0UHJldmVudERlZmF1bHQoKSApID8gcmV0dXJuVHJ1ZSA6IHJldHVybkZhbHNlO1xuXG5cdC8vIEV2ZW50IHR5cGVcblx0fSBlbHNlIHtcblx0XHR0aGlzLnR5cGUgPSBzcmM7XG5cdH1cblxuXHQvLyBQdXQgZXhwbGljaXRseSBwcm92aWRlZCBwcm9wZXJ0aWVzIG9udG8gdGhlIGV2ZW50IG9iamVjdFxuXHRpZiAoIHByb3BzICkge1xuXHRcdGpRdWVyeS5leHRlbmQoIHRoaXMsIHByb3BzICk7XG5cdH1cblxuXHQvLyBDcmVhdGUgYSB0aW1lc3RhbXAgaWYgaW5jb21pbmcgZXZlbnQgZG9lc24ndCBoYXZlIG9uZVxuXHR0aGlzLnRpbWVTdGFtcCA9IHNyYyAmJiBzcmMudGltZVN0YW1wIHx8IGpRdWVyeS5ub3coKTtcblxuXHQvLyBNYXJrIGl0IGFzIGZpeGVkXG5cdHRoaXNbIGpRdWVyeS5leHBhbmRvIF0gPSB0cnVlO1xufTtcblxuZnVuY3Rpb24gcmV0dXJuRmFsc2UoKSB7XG5cdHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIHJldHVyblRydWUoKSB7XG5cdHJldHVybiB0cnVlO1xufVxuXG4vLyBqUXVlcnkuRXZlbnQgaXMgYmFzZWQgb24gRE9NMyBFdmVudHMgYXMgc3BlY2lmaWVkIGJ5IHRoZSBFQ01BU2NyaXB0IExhbmd1YWdlIEJpbmRpbmdcbi8vIGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMDMvV0QtRE9NLUxldmVsLTMtRXZlbnRzLTIwMDMwMzMxL2VjbWEtc2NyaXB0LWJpbmRpbmcuaHRtbFxualF1ZXJ5LkV2ZW50LnByb3RvdHlwZSA9IHtcblx0cHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuaXNEZWZhdWx0UHJldmVudGVkID0gcmV0dXJuVHJ1ZTtcblxuXHRcdHZhciBlID0gdGhpcy5vcmlnaW5hbEV2ZW50O1xuXHRcdGlmICggIWUgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gaWYgcHJldmVudERlZmF1bHQgZXhpc3RzIHJ1biBpdCBvbiB0aGUgb3JpZ2luYWwgZXZlbnRcblx0XHRpZiAoIGUucHJldmVudERlZmF1bHQgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHQvLyBvdGhlcndpc2Ugc2V0IHRoZSByZXR1cm5WYWx1ZSBwcm9wZXJ0eSBvZiB0aGUgb3JpZ2luYWwgZXZlbnQgdG8gZmFsc2UgKElFKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRlLnJldHVyblZhbHVlID0gZmFsc2U7XG5cdFx0fVxuXHR9LFxuXHRzdG9wUHJvcGFnYXRpb246IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuaXNQcm9wYWdhdGlvblN0b3BwZWQgPSByZXR1cm5UcnVlO1xuXG5cdFx0dmFyIGUgPSB0aGlzLm9yaWdpbmFsRXZlbnQ7XG5cdFx0aWYgKCAhZSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Ly8gaWYgc3RvcFByb3BhZ2F0aW9uIGV4aXN0cyBydW4gaXQgb24gdGhlIG9yaWdpbmFsIGV2ZW50XG5cdFx0aWYgKCBlLnN0b3BQcm9wYWdhdGlvbiApIHtcblx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0fVxuXHRcdC8vIG90aGVyd2lzZSBzZXQgdGhlIGNhbmNlbEJ1YmJsZSBwcm9wZXJ0eSBvZiB0aGUgb3JpZ2luYWwgZXZlbnQgdG8gdHJ1ZSAoSUUpXG5cdFx0ZS5jYW5jZWxCdWJibGUgPSB0cnVlO1xuXHR9LFxuXHRzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb246IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuaXNJbW1lZGlhdGVQcm9wYWdhdGlvblN0b3BwZWQgPSByZXR1cm5UcnVlO1xuXHRcdHRoaXMuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdH0sXG5cdGlzRGVmYXVsdFByZXZlbnRlZDogcmV0dXJuRmFsc2UsXG5cdGlzUHJvcGFnYXRpb25TdG9wcGVkOiByZXR1cm5GYWxzZSxcblx0aXNJbW1lZGlhdGVQcm9wYWdhdGlvblN0b3BwZWQ6IHJldHVybkZhbHNlXG59O1xuXG4vLyBDcmVhdGUgbW91c2VlbnRlci9sZWF2ZSBldmVudHMgdXNpbmcgbW91c2VvdmVyL291dCBhbmQgZXZlbnQtdGltZSBjaGVja3NcbmpRdWVyeS5lYWNoKHtcblx0bW91c2VlbnRlcjogXCJtb3VzZW92ZXJcIixcblx0bW91c2VsZWF2ZTogXCJtb3VzZW91dFwiXG59LCBmdW5jdGlvbiggb3JpZywgZml4ICkge1xuXHRqUXVlcnkuZXZlbnQuc3BlY2lhbFsgb3JpZyBdID0ge1xuXHRcdGRlbGVnYXRlVHlwZTogZml4LFxuXHRcdGJpbmRUeXBlOiBmaXgsXG5cblx0XHRoYW5kbGU6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciByZXQsXG5cdFx0XHRcdHRhcmdldCA9IHRoaXMsXG5cdFx0XHRcdHJlbGF0ZWQgPSBldmVudC5yZWxhdGVkVGFyZ2V0LFxuXHRcdFx0XHRoYW5kbGVPYmogPSBldmVudC5oYW5kbGVPYmosXG5cdFx0XHRcdHNlbGVjdG9yID0gaGFuZGxlT2JqLnNlbGVjdG9yO1xuXG5cdFx0XHQvLyBGb3IgbW91c2VudGVyL2xlYXZlIGNhbGwgdGhlIGhhbmRsZXIgaWYgcmVsYXRlZCBpcyBvdXRzaWRlIHRoZSB0YXJnZXQuXG5cdFx0XHQvLyBOQjogTm8gcmVsYXRlZFRhcmdldCBpZiB0aGUgbW91c2UgbGVmdC9lbnRlcmVkIHRoZSBicm93c2VyIHdpbmRvd1xuXHRcdFx0aWYgKCAhcmVsYXRlZCB8fCAocmVsYXRlZCAhPT0gdGFyZ2V0ICYmICFqUXVlcnkuY29udGFpbnMoIHRhcmdldCwgcmVsYXRlZCApKSApIHtcblx0XHRcdFx0ZXZlbnQudHlwZSA9IGhhbmRsZU9iai5vcmlnVHlwZTtcblx0XHRcdFx0cmV0ID0gaGFuZGxlT2JqLmhhbmRsZXIuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0XHRldmVudC50eXBlID0gZml4O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHJldDtcblx0XHR9XG5cdH07XG59KTtcblxuLy8gSUUgc3VibWl0IGRlbGVnYXRpb25cbmlmICggIWpRdWVyeS5zdXBwb3J0LnN1Ym1pdEJ1YmJsZXMgKSB7XG5cblx0alF1ZXJ5LmV2ZW50LnNwZWNpYWwuc3VibWl0ID0ge1xuXHRcdHNldHVwOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIE9ubHkgbmVlZCB0aGlzIGZvciBkZWxlZ2F0ZWQgZm9ybSBzdWJtaXQgZXZlbnRzXG5cdFx0XHRpZiAoIGpRdWVyeS5ub2RlTmFtZSggdGhpcywgXCJmb3JtXCIgKSApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBMYXp5LWFkZCBhIHN1Ym1pdCBoYW5kbGVyIHdoZW4gYSBkZXNjZW5kYW50IGZvcm0gbWF5IHBvdGVudGlhbGx5IGJlIHN1Ym1pdHRlZFxuXHRcdFx0alF1ZXJ5LmV2ZW50LmFkZCggdGhpcywgXCJjbGljay5fc3VibWl0IGtleXByZXNzLl9zdWJtaXRcIiwgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRcdC8vIE5vZGUgbmFtZSBjaGVjayBhdm9pZHMgYSBWTUwtcmVsYXRlZCBjcmFzaCBpbiBJRSAoIzk4MDcpXG5cdFx0XHRcdHZhciBlbGVtID0gZS50YXJnZXQsXG5cdFx0XHRcdFx0Zm9ybSA9IGpRdWVyeS5ub2RlTmFtZSggZWxlbSwgXCJpbnB1dFwiICkgfHwgalF1ZXJ5Lm5vZGVOYW1lKCBlbGVtLCBcImJ1dHRvblwiICkgPyBlbGVtLmZvcm0gOiB1bmRlZmluZWQ7XG5cdFx0XHRcdGlmICggZm9ybSAmJiAhalF1ZXJ5Ll9kYXRhKCBmb3JtLCBcIl9zdWJtaXRfYXR0YWNoZWRcIiApICkge1xuXHRcdFx0XHRcdGpRdWVyeS5ldmVudC5hZGQoIGZvcm0sIFwic3VibWl0Ll9zdWJtaXRcIiwgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdFx0ZXZlbnQuX3N1Ym1pdF9idWJibGUgPSB0cnVlO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGpRdWVyeS5fZGF0YSggZm9ybSwgXCJfc3VibWl0X2F0dGFjaGVkXCIsIHRydWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyByZXR1cm4gdW5kZWZpbmVkIHNpbmNlIHdlIGRvbid0IG5lZWQgYW4gZXZlbnQgbGlzdGVuZXJcblx0XHR9LFxuXG5cdFx0cG9zdERpc3BhdGNoOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQvLyBJZiBmb3JtIHdhcyBzdWJtaXR0ZWQgYnkgdGhlIHVzZXIsIGJ1YmJsZSB0aGUgZXZlbnQgdXAgdGhlIHRyZWVcblx0XHRcdGlmICggZXZlbnQuX3N1Ym1pdF9idWJibGUgKSB7XG5cdFx0XHRcdGRlbGV0ZSBldmVudC5fc3VibWl0X2J1YmJsZTtcblx0XHRcdFx0aWYgKCB0aGlzLnBhcmVudE5vZGUgJiYgIWV2ZW50LmlzVHJpZ2dlciApIHtcblx0XHRcdFx0XHRqUXVlcnkuZXZlbnQuc2ltdWxhdGUoIFwic3VibWl0XCIsIHRoaXMucGFyZW50Tm9kZSwgZXZlbnQsIHRydWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBPbmx5IG5lZWQgdGhpcyBmb3IgZGVsZWdhdGVkIGZvcm0gc3VibWl0IGV2ZW50c1xuXHRcdFx0aWYgKCBqUXVlcnkubm9kZU5hbWUoIHRoaXMsIFwiZm9ybVwiICkgKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVtb3ZlIGRlbGVnYXRlZCBoYW5kbGVyczsgY2xlYW5EYXRhIGV2ZW50dWFsbHkgcmVhcHMgc3VibWl0IGhhbmRsZXJzIGF0dGFjaGVkIGFib3ZlXG5cdFx0XHRqUXVlcnkuZXZlbnQucmVtb3ZlKCB0aGlzLCBcIi5fc3VibWl0XCIgKTtcblx0XHR9XG5cdH07XG59XG5cbi8vIElFIGNoYW5nZSBkZWxlZ2F0aW9uIGFuZCBjaGVja2JveC9yYWRpbyBmaXhcbmlmICggIWpRdWVyeS5zdXBwb3J0LmNoYW5nZUJ1YmJsZXMgKSB7XG5cblx0alF1ZXJ5LmV2ZW50LnNwZWNpYWwuY2hhbmdlID0ge1xuXG5cdFx0c2V0dXA6IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHRpZiAoIHJmb3JtRWxlbXMudGVzdCggdGhpcy5ub2RlTmFtZSApICkge1xuXHRcdFx0XHQvLyBJRSBkb2Vzbid0IGZpcmUgY2hhbmdlIG9uIGEgY2hlY2svcmFkaW8gdW50aWwgYmx1cjsgdHJpZ2dlciBpdCBvbiBjbGlja1xuXHRcdFx0XHQvLyBhZnRlciBhIHByb3BlcnR5Y2hhbmdlLiBFYXQgdGhlIGJsdXItY2hhbmdlIGluIHNwZWNpYWwuY2hhbmdlLmhhbmRsZS5cblx0XHRcdFx0Ly8gVGhpcyBzdGlsbCBmaXJlcyBvbmNoYW5nZSBhIHNlY29uZCB0aW1lIGZvciBjaGVjay9yYWRpbyBhZnRlciBibHVyLlxuXHRcdFx0XHRpZiAoIHRoaXMudHlwZSA9PT0gXCJjaGVja2JveFwiIHx8IHRoaXMudHlwZSA9PT0gXCJyYWRpb1wiICkge1xuXHRcdFx0XHRcdGpRdWVyeS5ldmVudC5hZGQoIHRoaXMsIFwicHJvcGVydHljaGFuZ2UuX2NoYW5nZVwiLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0XHRpZiAoIGV2ZW50Lm9yaWdpbmFsRXZlbnQucHJvcGVydHlOYW1lID09PSBcImNoZWNrZWRcIiApIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fanVzdF9jaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRqUXVlcnkuZXZlbnQuYWRkKCB0aGlzLCBcImNsaWNrLl9jaGFuZ2VcIiwgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdFx0aWYgKCB0aGlzLl9qdXN0X2NoYW5nZWQgJiYgIWV2ZW50LmlzVHJpZ2dlciApIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fanVzdF9jaGFuZ2VkID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBBbGxvdyB0cmlnZ2VyZWQsIHNpbXVsYXRlZCBjaGFuZ2UgZXZlbnRzICgjMTE1MDApXG5cdFx0XHRcdFx0XHRqUXVlcnkuZXZlbnQuc2ltdWxhdGUoIFwiY2hhbmdlXCIsIHRoaXMsIGV2ZW50LCB0cnVlICk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0Ly8gRGVsZWdhdGVkIGV2ZW50OyBsYXp5LWFkZCBhIGNoYW5nZSBoYW5kbGVyIG9uIGRlc2NlbmRhbnQgaW5wdXRzXG5cdFx0XHRqUXVlcnkuZXZlbnQuYWRkKCB0aGlzLCBcImJlZm9yZWFjdGl2YXRlLl9jaGFuZ2VcIiwgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRcdHZhciBlbGVtID0gZS50YXJnZXQ7XG5cblx0XHRcdFx0aWYgKCByZm9ybUVsZW1zLnRlc3QoIGVsZW0ubm9kZU5hbWUgKSAmJiAhalF1ZXJ5Ll9kYXRhKCBlbGVtLCBcIl9jaGFuZ2VfYXR0YWNoZWRcIiApICkge1xuXHRcdFx0XHRcdGpRdWVyeS5ldmVudC5hZGQoIGVsZW0sIFwiY2hhbmdlLl9jaGFuZ2VcIiwgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdFx0aWYgKCB0aGlzLnBhcmVudE5vZGUgJiYgIWV2ZW50LmlzU2ltdWxhdGVkICYmICFldmVudC5pc1RyaWdnZXIgKSB7XG5cdFx0XHRcdFx0XHRcdGpRdWVyeS5ldmVudC5zaW11bGF0ZSggXCJjaGFuZ2VcIiwgdGhpcy5wYXJlbnROb2RlLCBldmVudCwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGpRdWVyeS5fZGF0YSggZWxlbSwgXCJfY2hhbmdlX2F0dGFjaGVkXCIsIHRydWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGhhbmRsZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGVsZW0gPSBldmVudC50YXJnZXQ7XG5cblx0XHRcdC8vIFN3YWxsb3cgbmF0aXZlIGNoYW5nZSBldmVudHMgZnJvbSBjaGVja2JveC9yYWRpbywgd2UgYWxyZWFkeSB0cmlnZ2VyZWQgdGhlbSBhYm92ZVxuXHRcdFx0aWYgKCB0aGlzICE9PSBlbGVtIHx8IGV2ZW50LmlzU2ltdWxhdGVkIHx8IGV2ZW50LmlzVHJpZ2dlciB8fCAoZWxlbS50eXBlICE9PSBcInJhZGlvXCIgJiYgZWxlbS50eXBlICE9PSBcImNoZWNrYm94XCIpICkge1xuXHRcdFx0XHRyZXR1cm4gZXZlbnQuaGFuZGxlT2JqLmhhbmRsZXIuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHR0ZWFyZG93bjogZnVuY3Rpb24oKSB7XG5cdFx0XHRqUXVlcnkuZXZlbnQucmVtb3ZlKCB0aGlzLCBcIi5fY2hhbmdlXCIgKTtcblxuXHRcdFx0cmV0dXJuICFyZm9ybUVsZW1zLnRlc3QoIHRoaXMubm9kZU5hbWUgKTtcblx0XHR9XG5cdH07XG59XG5cbi8vIENyZWF0ZSBcImJ1YmJsaW5nXCIgZm9jdXMgYW5kIGJsdXIgZXZlbnRzXG5pZiAoICFqUXVlcnkuc3VwcG9ydC5mb2N1c2luQnViYmxlcyApIHtcblx0alF1ZXJ5LmVhY2goeyBmb2N1czogXCJmb2N1c2luXCIsIGJsdXI6IFwiZm9jdXNvdXRcIiB9LCBmdW5jdGlvbiggb3JpZywgZml4ICkge1xuXG5cdFx0Ly8gQXR0YWNoIGEgc2luZ2xlIGNhcHR1cmluZyBoYW5kbGVyIHdoaWxlIHNvbWVvbmUgd2FudHMgZm9jdXNpbi9mb2N1c291dFxuXHRcdHZhciBhdHRhY2hlcyA9IDAsXG5cdFx0XHRoYW5kbGVyID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRqUXVlcnkuZXZlbnQuc2ltdWxhdGUoIGZpeCwgZXZlbnQudGFyZ2V0LCBqUXVlcnkuZXZlbnQuZml4KCBldmVudCApLCB0cnVlICk7XG5cdFx0XHR9O1xuXG5cdFx0alF1ZXJ5LmV2ZW50LnNwZWNpYWxbIGZpeCBdID0ge1xuXHRcdFx0c2V0dXA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIGF0dGFjaGVzKysgPT09IDAgKSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciggb3JpZywgaGFuZGxlciwgdHJ1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoIC0tYXR0YWNoZXMgPT09IDAgKSB7XG5cdFx0XHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lciggb3JpZywgaGFuZGxlciwgdHJ1ZSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG59XG5cbmpRdWVyeS5mbi5leHRlbmQoe1xuXG5cdG9uOiBmdW5jdGlvbiggdHlwZXMsIHNlbGVjdG9yLCBkYXRhLCBmbiwgLypJTlRFUk5BTCovIG9uZSApIHtcblx0XHR2YXIgb3JpZ0ZuLCB0eXBlO1xuXG5cdFx0Ly8gVHlwZXMgY2FuIGJlIGEgbWFwIG9mIHR5cGVzL2hhbmRsZXJzXG5cdFx0aWYgKCB0eXBlb2YgdHlwZXMgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHQvLyAoIHR5cGVzLU9iamVjdCwgc2VsZWN0b3IsIGRhdGEgKVxuXHRcdFx0aWYgKCB0eXBlb2Ygc2VsZWN0b3IgIT09IFwic3RyaW5nXCIgKSB7IC8vICYmIHNlbGVjdG9yICE9IG51bGxcblx0XHRcdFx0Ly8gKCB0eXBlcy1PYmplY3QsIGRhdGEgKVxuXHRcdFx0XHRkYXRhID0gZGF0YSB8fCBzZWxlY3Rvcjtcblx0XHRcdFx0c2VsZWN0b3IgPSB1bmRlZmluZWQ7XG5cdFx0XHR9XG5cdFx0XHRmb3IgKCB0eXBlIGluIHR5cGVzICkge1xuXHRcdFx0XHR0aGlzLm9uKCB0eXBlLCBzZWxlY3RvciwgZGF0YSwgdHlwZXNbIHR5cGUgXSwgb25lICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cblx0XHRpZiAoIGRhdGEgPT0gbnVsbCAmJiBmbiA9PSBudWxsICkge1xuXHRcdFx0Ly8gKCB0eXBlcywgZm4gKVxuXHRcdFx0Zm4gPSBzZWxlY3Rvcjtcblx0XHRcdGRhdGEgPSBzZWxlY3RvciA9IHVuZGVmaW5lZDtcblx0XHR9IGVsc2UgaWYgKCBmbiA9PSBudWxsICkge1xuXHRcdFx0aWYgKCB0eXBlb2Ygc2VsZWN0b3IgPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdC8vICggdHlwZXMsIHNlbGVjdG9yLCBmbiApXG5cdFx0XHRcdGZuID0gZGF0YTtcblx0XHRcdFx0ZGF0YSA9IHVuZGVmaW5lZDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vICggdHlwZXMsIGRhdGEsIGZuIClcblx0XHRcdFx0Zm4gPSBkYXRhO1xuXHRcdFx0XHRkYXRhID0gc2VsZWN0b3I7XG5cdFx0XHRcdHNlbGVjdG9yID0gdW5kZWZpbmVkO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoIGZuID09PSBmYWxzZSApIHtcblx0XHRcdGZuID0gcmV0dXJuRmFsc2U7XG5cdFx0fSBlbHNlIGlmICggIWZuICkge1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0aWYgKCBvbmUgPT09IDEgKSB7XG5cdFx0XHRvcmlnRm4gPSBmbjtcblx0XHRcdGZuID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHQvLyBDYW4gdXNlIGFuIGVtcHR5IHNldCwgc2luY2UgZXZlbnQgY29udGFpbnMgdGhlIGluZm9cblx0XHRcdFx0alF1ZXJ5KCkub2ZmKCBldmVudCApO1xuXHRcdFx0XHRyZXR1cm4gb3JpZ0ZuLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdH07XG5cdFx0XHQvLyBVc2Ugc2FtZSBndWlkIHNvIGNhbGxlciBjYW4gcmVtb3ZlIHVzaW5nIG9yaWdGblxuXHRcdFx0Zm4uZ3VpZCA9IG9yaWdGbi5ndWlkIHx8ICggb3JpZ0ZuLmd1aWQgPSBqUXVlcnkuZ3VpZCsrICk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0alF1ZXJ5LmV2ZW50LmFkZCggdGhpcywgdHlwZXMsIGZuLCBkYXRhLCBzZWxlY3RvciApO1xuXHRcdH0pO1xuXHR9LFxuXHRvbmU6IGZ1bmN0aW9uKCB0eXBlcywgc2VsZWN0b3IsIGRhdGEsIGZuICkge1xuXHRcdHJldHVybiB0aGlzLm9uKCB0eXBlcywgc2VsZWN0b3IsIGRhdGEsIGZuLCAxICk7XG5cdH0sXG5cdG9mZjogZnVuY3Rpb24oIHR5cGVzLCBzZWxlY3RvciwgZm4gKSB7XG5cdFx0dmFyIGhhbmRsZU9iaiwgdHlwZTtcblx0XHRpZiAoIHR5cGVzICYmIHR5cGVzLnByZXZlbnREZWZhdWx0ICYmIHR5cGVzLmhhbmRsZU9iaiApIHtcblx0XHRcdC8vICggZXZlbnQgKSAgZGlzcGF0Y2hlZCBqUXVlcnkuRXZlbnRcblx0XHRcdGhhbmRsZU9iaiA9IHR5cGVzLmhhbmRsZU9iajtcblx0XHRcdGpRdWVyeSggdHlwZXMuZGVsZWdhdGVUYXJnZXQgKS5vZmYoXG5cdFx0XHRcdGhhbmRsZU9iai5uYW1lc3BhY2UgPyBoYW5kbGVPYmoub3JpZ1R5cGUgKyBcIi5cIiArIGhhbmRsZU9iai5uYW1lc3BhY2UgOiBoYW5kbGVPYmoub3JpZ1R5cGUsXG5cdFx0XHRcdGhhbmRsZU9iai5zZWxlY3Rvcixcblx0XHRcdFx0aGFuZGxlT2JqLmhhbmRsZXJcblx0XHRcdCk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0aWYgKCB0eXBlb2YgdHlwZXMgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHQvLyAoIHR5cGVzLW9iamVjdCBbLCBzZWxlY3Rvcl0gKVxuXHRcdFx0Zm9yICggdHlwZSBpbiB0eXBlcyApIHtcblx0XHRcdFx0dGhpcy5vZmYoIHR5cGUsIHNlbGVjdG9yLCB0eXBlc1sgdHlwZSBdICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdFx0aWYgKCBzZWxlY3RvciA9PT0gZmFsc2UgfHwgdHlwZW9mIHNlbGVjdG9yID09PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHQvLyAoIHR5cGVzIFssIGZuXSApXG5cdFx0XHRmbiA9IHNlbGVjdG9yO1xuXHRcdFx0c2VsZWN0b3IgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXHRcdGlmICggZm4gPT09IGZhbHNlICkge1xuXHRcdFx0Zm4gPSByZXR1cm5GYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdGpRdWVyeS5ldmVudC5yZW1vdmUoIHRoaXMsIHR5cGVzLCBmbiwgc2VsZWN0b3IgKTtcblx0XHR9KTtcblx0fSxcblxuXHRiaW5kOiBmdW5jdGlvbiggdHlwZXMsIGRhdGEsIGZuICkge1xuXHRcdHJldHVybiB0aGlzLm9uKCB0eXBlcywgbnVsbCwgZGF0YSwgZm4gKTtcblx0fSxcblx0dW5iaW5kOiBmdW5jdGlvbiggdHlwZXMsIGZuICkge1xuXHRcdHJldHVybiB0aGlzLm9mZiggdHlwZXMsIG51bGwsIGZuICk7XG5cdH0sXG5cblx0bGl2ZTogZnVuY3Rpb24oIHR5cGVzLCBkYXRhLCBmbiApIHtcblx0XHRqUXVlcnkoIHRoaXMuY29udGV4dCApLm9uKCB0eXBlcywgdGhpcy5zZWxlY3RvciwgZGF0YSwgZm4gKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0ZGllOiBmdW5jdGlvbiggdHlwZXMsIGZuICkge1xuXHRcdGpRdWVyeSggdGhpcy5jb250ZXh0ICkub2ZmKCB0eXBlcywgdGhpcy5zZWxlY3RvciB8fCBcIioqXCIsIGZuICk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZGVsZWdhdGU6IGZ1bmN0aW9uKCBzZWxlY3RvciwgdHlwZXMsIGRhdGEsIGZuICkge1xuXHRcdHJldHVybiB0aGlzLm9uKCB0eXBlcywgc2VsZWN0b3IsIGRhdGEsIGZuICk7XG5cdH0sXG5cdHVuZGVsZWdhdGU6IGZ1bmN0aW9uKCBzZWxlY3RvciwgdHlwZXMsIGZuICkge1xuXHRcdC8vICggbmFtZXNwYWNlICkgb3IgKCBzZWxlY3RvciwgdHlwZXMgWywgZm5dIClcblx0XHRyZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PSAxPyB0aGlzLm9mZiggc2VsZWN0b3IsIFwiKipcIiApIDogdGhpcy5vZmYoIHR5cGVzLCBzZWxlY3RvciB8fCBcIioqXCIsIGZuICk7XG5cdH0sXG5cblx0dHJpZ2dlcjogZnVuY3Rpb24oIHR5cGUsIGRhdGEgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdGpRdWVyeS5ldmVudC50cmlnZ2VyKCB0eXBlLCBkYXRhLCB0aGlzICk7XG5cdFx0fSk7XG5cdH0sXG5cdHRyaWdnZXJIYW5kbGVyOiBmdW5jdGlvbiggdHlwZSwgZGF0YSApIHtcblx0XHRpZiAoIHRoaXNbMF0gKSB7XG5cdFx0XHRyZXR1cm4galF1ZXJ5LmV2ZW50LnRyaWdnZXIoIHR5cGUsIGRhdGEsIHRoaXNbMF0sIHRydWUgKTtcblx0XHR9XG5cdH0sXG5cblx0dG9nZ2xlOiBmdW5jdGlvbiggZm4gKSB7XG5cdFx0Ly8gU2F2ZSByZWZlcmVuY2UgdG8gYXJndW1lbnRzIGZvciBhY2Nlc3MgaW4gY2xvc3VyZVxuXHRcdHZhciBhcmdzID0gYXJndW1lbnRzLFxuXHRcdFx0Z3VpZCA9IGZuLmd1aWQgfHwgalF1ZXJ5Lmd1aWQrKyxcblx0XHRcdGkgPSAwLFxuXHRcdFx0dG9nZ2xlciA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0Ly8gRmlndXJlIG91dCB3aGljaCBmdW5jdGlvbiB0byBleGVjdXRlXG5cdFx0XHRcdHZhciBsYXN0VG9nZ2xlID0gKCBqUXVlcnkuX2RhdGEoIHRoaXMsIFwibGFzdFRvZ2dsZVwiICsgZm4uZ3VpZCApIHx8IDAgKSAlIGk7XG5cdFx0XHRcdGpRdWVyeS5fZGF0YSggdGhpcywgXCJsYXN0VG9nZ2xlXCIgKyBmbi5ndWlkLCBsYXN0VG9nZ2xlICsgMSApO1xuXG5cdFx0XHRcdC8vIE1ha2Ugc3VyZSB0aGF0IGNsaWNrcyBzdG9wXG5cdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0Ly8gYW5kIGV4ZWN1dGUgdGhlIGZ1bmN0aW9uXG5cdFx0XHRcdHJldHVybiBhcmdzWyBsYXN0VG9nZ2xlIF0uYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApIHx8IGZhbHNlO1xuXHRcdFx0fTtcblxuXHRcdC8vIGxpbmsgYWxsIHRoZSBmdW5jdGlvbnMsIHNvIGFueSBvZiB0aGVtIGNhbiB1bmJpbmQgdGhpcyBjbGljayBoYW5kbGVyXG5cdFx0dG9nZ2xlci5ndWlkID0gZ3VpZDtcblx0XHR3aGlsZSAoIGkgPCBhcmdzLmxlbmd0aCApIHtcblx0XHRcdGFyZ3NbIGkrKyBdLmd1aWQgPSBndWlkO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmNsaWNrKCB0b2dnbGVyICk7XG5cdH0sXG5cblx0aG92ZXI6IGZ1bmN0aW9uKCBmbk92ZXIsIGZuT3V0ICkge1xuXHRcdHJldHVybiB0aGlzLm1vdXNlZW50ZXIoIGZuT3ZlciApLm1vdXNlbGVhdmUoIGZuT3V0IHx8IGZuT3ZlciApO1xuXHR9XG59KTtcblxualF1ZXJ5LmVhY2goIChcImJsdXIgZm9jdXMgZm9jdXNpbiBmb2N1c291dCBsb2FkIHJlc2l6ZSBzY3JvbGwgdW5sb2FkIGNsaWNrIGRibGNsaWNrIFwiICtcblx0XCJtb3VzZWRvd24gbW91c2V1cCBtb3VzZW1vdmUgbW91c2VvdmVyIG1vdXNlb3V0IG1vdXNlZW50ZXIgbW91c2VsZWF2ZSBcIiArXG5cdFwiY2hhbmdlIHNlbGVjdCBzdWJtaXQga2V5ZG93biBrZXlwcmVzcyBrZXl1cCBlcnJvciBjb250ZXh0bWVudVwiKS5zcGxpdChcIiBcIiksIGZ1bmN0aW9uKCBpLCBuYW1lICkge1xuXG5cdC8vIEhhbmRsZSBldmVudCBiaW5kaW5nXG5cdGpRdWVyeS5mblsgbmFtZSBdID0gZnVuY3Rpb24oIGRhdGEsIGZuICkge1xuXHRcdGlmICggZm4gPT0gbnVsbCApIHtcblx0XHRcdGZuID0gZGF0YTtcblx0XHRcdGRhdGEgPSBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiBhcmd1bWVudHMubGVuZ3RoID4gMCA/XG5cdFx0XHR0aGlzLm9uKCBuYW1lLCBudWxsLCBkYXRhLCBmbiApIDpcblx0XHRcdHRoaXMudHJpZ2dlciggbmFtZSApO1xuXHR9O1xuXG5cdGlmICggcmtleUV2ZW50LnRlc3QoIG5hbWUgKSApIHtcblx0XHRqUXVlcnkuZXZlbnQuZml4SG9va3NbIG5hbWUgXSA9IGpRdWVyeS5ldmVudC5rZXlIb29rcztcblx0fVxuXG5cdGlmICggcm1vdXNlRXZlbnQudGVzdCggbmFtZSApICkge1xuXHRcdGpRdWVyeS5ldmVudC5maXhIb29rc1sgbmFtZSBdID0galF1ZXJ5LmV2ZW50Lm1vdXNlSG9va3M7XG5cdH1cbn0pO1xuLyohXHJcbiAqIFNpenpsZSBDU1MgU2VsZWN0b3IgRW5naW5lXHJcbiAqICBDb3B5cmlnaHQgMjAxMiBqUXVlcnkgRm91bmRhdGlvbiBhbmQgb3RoZXIgY29udHJpYnV0b3JzXHJcbiAqICBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcclxuICogIGh0dHA6Ly9zaXp6bGVqcy5jb20vXHJcbiAqL1xyXG4oZnVuY3Rpb24oIHdpbmRvdywgdW5kZWZpbmVkICkge1xyXG5cclxudmFyIGRpcnJ1bnMsXHJcblx0Y2FjaGVkcnVucyxcclxuXHRhc3NlcnRHZXRJZE5vdE5hbWUsXHJcblx0RXhwcixcclxuXHRnZXRUZXh0LFxyXG5cdGlzWE1MLFxyXG5cdGNvbnRhaW5zLFxyXG5cdGNvbXBpbGUsXHJcblx0c29ydE9yZGVyLFxyXG5cdGhhc0R1cGxpY2F0ZSxcclxuXHJcblx0YmFzZUhhc0R1cGxpY2F0ZSA9IHRydWUsXHJcblx0c3RydW5kZWZpbmVkID0gXCJ1bmRlZmluZWRcIixcclxuXHJcblx0ZXhwYW5kbyA9ICggXCJzaXpjYWNoZVwiICsgTWF0aC5yYW5kb20oKSApLnJlcGxhY2UoIFwiLlwiLCBcIlwiICksXHJcblxyXG5cdGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50LFxyXG5cdGRvY0VsZW0gPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsXHJcblx0ZG9uZSA9IDAsXHJcblx0c2xpY2UgPSBbXS5zbGljZSxcclxuXHRwdXNoID0gW10ucHVzaCxcclxuXHJcblx0Ly8gQXVnbWVudCBhIGZ1bmN0aW9uIGZvciBzcGVjaWFsIHVzZSBieSBTaXp6bGVcclxuXHRtYXJrRnVuY3Rpb24gPSBmdW5jdGlvbiggZm4sIHZhbHVlICkge1xyXG5cdFx0Zm5bIGV4cGFuZG8gXSA9IHZhbHVlIHx8IHRydWU7XHJcblx0XHRyZXR1cm4gZm47XHJcblx0fSxcclxuXHJcblx0Y3JlYXRlQ2FjaGUgPSBmdW5jdGlvbigpIHtcclxuXHRcdHZhciBjYWNoZSA9IHt9LFxyXG5cdFx0XHRrZXlzID0gW107XHJcblxyXG5cdFx0cmV0dXJuIG1hcmtGdW5jdGlvbihmdW5jdGlvbigga2V5LCB2YWx1ZSApIHtcclxuXHRcdFx0Ly8gT25seSBrZWVwIHRoZSBtb3N0IHJlY2VudCBlbnRyaWVzXHJcblx0XHRcdGlmICgga2V5cy5wdXNoKCBrZXkgKSA+IEV4cHIuY2FjaGVMZW5ndGggKSB7XHJcblx0XHRcdFx0ZGVsZXRlIGNhY2hlWyBrZXlzLnNoaWZ0KCkgXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIChjYWNoZVsga2V5IF0gPSB2YWx1ZSk7XHJcblx0XHR9LCBjYWNoZSApO1xyXG5cdH0sXHJcblxyXG5cdGNsYXNzQ2FjaGUgPSBjcmVhdGVDYWNoZSgpLFxyXG5cdHRva2VuQ2FjaGUgPSBjcmVhdGVDYWNoZSgpLFxyXG5cdGNvbXBpbGVyQ2FjaGUgPSBjcmVhdGVDYWNoZSgpLFxyXG5cclxuXHQvLyBSZWdleFxyXG5cclxuXHQvLyBXaGl0ZXNwYWNlIGNoYXJhY3RlcnMgaHR0cDovL3d3dy53My5vcmcvVFIvY3NzMy1zZWxlY3RvcnMvI3doaXRlc3BhY2VcclxuXHR3aGl0ZXNwYWNlID0gXCJbXFxcXHgyMFxcXFx0XFxcXHJcXFxcblxcXFxmXVwiLFxyXG5cdC8vIGh0dHA6Ly93d3cudzMub3JnL1RSL2NzczMtc3ludGF4LyNjaGFyYWN0ZXJzXHJcblx0Y2hhcmFjdGVyRW5jb2RpbmcgPSBcIig/OlxcXFxcXFxcLnxbLVxcXFx3XXxbXlxcXFx4MDAtXFxcXHhhMF0pK1wiLFxyXG5cclxuXHQvLyBMb29zZWx5IG1vZGVsZWQgb24gQ1NTIGlkZW50aWZpZXIgY2hhcmFjdGVyc1xyXG5cdC8vIEFuIHVucXVvdGVkIHZhbHVlIHNob3VsZCBiZSBhIENTUyBpZGVudGlmaWVyIChodHRwOi8vd3d3LnczLm9yZy9UUi9jc3MzLXNlbGVjdG9ycy8jYXR0cmlidXRlLXNlbGVjdG9ycylcclxuXHQvLyBQcm9wZXIgc3ludGF4OiBodHRwOi8vd3d3LnczLm9yZy9UUi9DU1MyMS9zeW5kYXRhLmh0bWwjdmFsdWUtZGVmLWlkZW50aWZpZXJcclxuXHRpZGVudGlmaWVyID0gY2hhcmFjdGVyRW5jb2RpbmcucmVwbGFjZSggXCJ3XCIsIFwidyNcIiApLFxyXG5cclxuXHQvLyBBY2NlcHRhYmxlIG9wZXJhdG9ycyBodHRwOi8vd3d3LnczLm9yZy9UUi9zZWxlY3RvcnMvI2F0dHJpYnV0ZS1zZWxlY3RvcnNcclxuXHRvcGVyYXRvcnMgPSBcIihbKl4kfCF+XT89KVwiLFxyXG5cdGF0dHJpYnV0ZXMgPSBcIlxcXFxbXCIgKyB3aGl0ZXNwYWNlICsgXCIqKFwiICsgY2hhcmFjdGVyRW5jb2RpbmcgKyBcIilcIiArIHdoaXRlc3BhY2UgK1xyXG5cdFx0XCIqKD86XCIgKyBvcGVyYXRvcnMgKyB3aGl0ZXNwYWNlICsgXCIqKD86KFsnXFxcIl0pKCg/OlxcXFxcXFxcLnxbXlxcXFxcXFxcXSkqPylcXFxcM3woXCIgKyBpZGVudGlmaWVyICsgXCIpfCl8KVwiICsgd2hpdGVzcGFjZSArIFwiKlxcXFxdXCIsXHJcblxyXG5cdC8vIFByZWZlciBhcmd1bWVudHMgbm90IGluIHBhcmVucy9icmFja2V0cyxcclxuXHQvLyAgIHRoZW4gYXR0cmlidXRlIHNlbGVjdG9ycyBhbmQgbm9uLXBzZXVkb3MgKGRlbm90ZWQgYnkgOiksXHJcblx0Ly8gICB0aGVuIGFueXRoaW5nIGVsc2VcclxuXHQvLyBUaGVzZSBwcmVmZXJlbmNlcyBhcmUgaGVyZSB0byByZWR1Y2UgdGhlIG51bWJlciBvZiBzZWxlY3RvcnNcclxuXHQvLyAgIG5lZWRpbmcgdG9rZW5pemUgaW4gdGhlIFBTRVVETyBwcmVGaWx0ZXJcclxuXHRwc2V1ZG9zID0gXCI6KFwiICsgY2hhcmFjdGVyRW5jb2RpbmcgKyBcIikoPzpcXFxcKCg/OihbJ1xcXCJdKSgoPzpcXFxcXFxcXC58W15cXFxcXFxcXF0pKj8pXFxcXDJ8KFteKClbXFxcXF1dKnwoPzooPzpcIiArIGF0dHJpYnV0ZXMgKyBcIil8W146XXxcXFxcXFxcXC4pKnwuKikpXFxcXCl8KVwiLFxyXG5cclxuXHQvLyBGb3IgbWF0Y2hFeHByLlBPUyBhbmQgbWF0Y2hFeHByLm5lZWRzQ29udGV4dFxyXG5cdHBvcyA9IFwiOihudGh8ZXF8Z3R8bHR8Zmlyc3R8bGFzdHxldmVufG9kZCkoPzpcXFxcKCgoPzotXFxcXGQpP1xcXFxkKilcXFxcKXwpKD89W14tXXwkKVwiLFxyXG5cclxuXHQvLyBMZWFkaW5nIGFuZCBub24tZXNjYXBlZCB0cmFpbGluZyB3aGl0ZXNwYWNlLCBjYXB0dXJpbmcgc29tZSBub24td2hpdGVzcGFjZSBjaGFyYWN0ZXJzIHByZWNlZGluZyB0aGUgbGF0dGVyXHJcblx0cnRyaW0gPSBuZXcgUmVnRXhwKCBcIl5cIiArIHdoaXRlc3BhY2UgKyBcIit8KCg/Ol58W15cXFxcXFxcXF0pKD86XFxcXFxcXFwuKSopXCIgKyB3aGl0ZXNwYWNlICsgXCIrJFwiLCBcImdcIiApLFxyXG5cclxuXHRyY29tbWEgPSBuZXcgUmVnRXhwKCBcIl5cIiArIHdoaXRlc3BhY2UgKyBcIiosXCIgKyB3aGl0ZXNwYWNlICsgXCIqXCIgKSxcclxuXHRyY29tYmluYXRvcnMgPSBuZXcgUmVnRXhwKCBcIl5cIiArIHdoaXRlc3BhY2UgKyBcIiooW1xcXFx4MjBcXFxcdFxcXFxyXFxcXG5cXFxcZj4rfl0pXCIgKyB3aGl0ZXNwYWNlICsgXCIqXCIgKSxcclxuXHRycHNldWRvID0gbmV3IFJlZ0V4cCggcHNldWRvcyApLFxyXG5cclxuXHQvLyBFYXNpbHktcGFyc2VhYmxlL3JldHJpZXZhYmxlIElEIG9yIFRBRyBvciBDTEFTUyBzZWxlY3RvcnNcclxuXHRycXVpY2tFeHByID0gL14oPzojKFtcXHdcXC1dKyl8KFxcdyspfFxcLihbXFx3XFwtXSspKSQvLFxyXG5cclxuXHRybm90ID0gL146bm90LyxcclxuXHRyc2libGluZyA9IC9bXFx4MjBcXHRcXHJcXG5cXGZdKlsrfl0vLFxyXG5cdHJlbmRzV2l0aE5vdCA9IC86bm90XFwoJC8sXHJcblxyXG5cdHJoZWFkZXIgPSAvaFxcZC9pLFxyXG5cdHJpbnB1dHMgPSAvaW5wdXR8c2VsZWN0fHRleHRhcmVhfGJ1dHRvbi9pLFxyXG5cclxuXHRyYmFja3NsYXNoID0gL1xcXFwoPyFcXFxcKS9nLFxyXG5cclxuXHRtYXRjaEV4cHIgPSB7XHJcblx0XHRcIklEXCI6IG5ldyBSZWdFeHAoIFwiXiMoXCIgKyBjaGFyYWN0ZXJFbmNvZGluZyArIFwiKVwiICksXHJcblx0XHRcIkNMQVNTXCI6IG5ldyBSZWdFeHAoIFwiXlxcXFwuKFwiICsgY2hhcmFjdGVyRW5jb2RpbmcgKyBcIilcIiApLFxyXG5cdFx0XCJOQU1FXCI6IG5ldyBSZWdFeHAoIFwiXlxcXFxbbmFtZT1bJ1xcXCJdPyhcIiArIGNoYXJhY3RlckVuY29kaW5nICsgXCIpWydcXFwiXT9cXFxcXVwiICksXHJcblx0XHRcIlRBR1wiOiBuZXcgUmVnRXhwKCBcIl4oXCIgKyBjaGFyYWN0ZXJFbmNvZGluZy5yZXBsYWNlKCBcIndcIiwgXCJ3KlwiICkgKyBcIilcIiApLFxyXG5cdFx0XCJBVFRSXCI6IG5ldyBSZWdFeHAoIFwiXlwiICsgYXR0cmlidXRlcyApLFxyXG5cdFx0XCJQU0VVRE9cIjogbmV3IFJlZ0V4cCggXCJeXCIgKyBwc2V1ZG9zICksXHJcblx0XHRcIkNISUxEXCI6IG5ldyBSZWdFeHAoIFwiXjoob25seXxudGh8bGFzdHxmaXJzdCktY2hpbGQoPzpcXFxcKFwiICsgd2hpdGVzcGFjZSArXHJcblx0XHRcdFwiKihldmVufG9kZHwoKFsrLV18KShcXFxcZCopbnwpXCIgKyB3aGl0ZXNwYWNlICsgXCIqKD86KFsrLV18KVwiICsgd2hpdGVzcGFjZSArXHJcblx0XHRcdFwiKihcXFxcZCspfCkpXCIgKyB3aGl0ZXNwYWNlICsgXCIqXFxcXCl8KVwiLCBcImlcIiApLFxyXG5cdFx0XCJQT1NcIjogbmV3IFJlZ0V4cCggcG9zLCBcImlnXCIgKSxcclxuXHRcdC8vIEZvciB1c2UgaW4gbGlicmFyaWVzIGltcGxlbWVudGluZyAuaXMoKVxyXG5cdFx0XCJuZWVkc0NvbnRleHRcIjogbmV3IFJlZ0V4cCggXCJeXCIgKyB3aGl0ZXNwYWNlICsgXCIqWz4rfl18XCIgKyBwb3MsIFwiaVwiIClcclxuXHR9LFxyXG5cclxuXHQvLyBTdXBwb3J0XHJcblxyXG5cdC8vIFVzZWQgZm9yIHRlc3Rpbmcgc29tZXRoaW5nIG9uIGFuIGVsZW1lbnRcclxuXHRhc3NlcnQgPSBmdW5jdGlvbiggZm4gKSB7XHJcblx0XHR2YXIgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHRyZXR1cm4gZm4oIGRpdiApO1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9IGZpbmFsbHkge1xyXG5cdFx0XHQvLyByZWxlYXNlIG1lbW9yeSBpbiBJRVxyXG5cdFx0XHRkaXYgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdC8vIENoZWNrIGlmIGdldEVsZW1lbnRzQnlUYWdOYW1lKFwiKlwiKSByZXR1cm5zIG9ubHkgZWxlbWVudHNcclxuXHRhc3NlcnRUYWdOYW1lTm9Db21tZW50cyA9IGFzc2VydChmdW5jdGlvbiggZGl2ICkge1xyXG5cdFx0ZGl2LmFwcGVuZENoaWxkKCBkb2N1bWVudC5jcmVhdGVDb21tZW50KFwiXCIpICk7XHJcblx0XHRyZXR1cm4gIWRpdi5nZXRFbGVtZW50c0J5VGFnTmFtZShcIipcIikubGVuZ3RoO1xyXG5cdH0pLFxyXG5cclxuXHQvLyBDaGVjayBpZiBnZXRBdHRyaWJ1dGUgcmV0dXJucyBub3JtYWxpemVkIGhyZWYgYXR0cmlidXRlc1xyXG5cdGFzc2VydEhyZWZOb3ROb3JtYWxpemVkID0gYXNzZXJ0KGZ1bmN0aW9uKCBkaXYgKSB7XHJcblx0XHRkaXYuaW5uZXJIVE1MID0gXCI8YSBocmVmPScjJz48L2E+XCI7XHJcblx0XHRyZXR1cm4gZGl2LmZpcnN0Q2hpbGQgJiYgdHlwZW9mIGRpdi5maXJzdENoaWxkLmdldEF0dHJpYnV0ZSAhPT0gc3RydW5kZWZpbmVkICYmXHJcblx0XHRcdGRpdi5maXJzdENoaWxkLmdldEF0dHJpYnV0ZShcImhyZWZcIikgPT09IFwiI1wiO1xyXG5cdH0pLFxyXG5cclxuXHQvLyBDaGVjayBpZiBhdHRyaWJ1dGVzIHNob3VsZCBiZSByZXRyaWV2ZWQgYnkgYXR0cmlidXRlIG5vZGVzXHJcblx0YXNzZXJ0QXR0cmlidXRlcyA9IGFzc2VydChmdW5jdGlvbiggZGl2ICkge1xyXG5cdFx0ZGl2LmlubmVySFRNTCA9IFwiPHNlbGVjdD48L3NlbGVjdD5cIjtcclxuXHRcdHZhciB0eXBlID0gdHlwZW9mIGRpdi5sYXN0Q2hpbGQuZ2V0QXR0cmlidXRlKFwibXVsdGlwbGVcIik7XHJcblx0XHQvLyBJRTggcmV0dXJucyBhIHN0cmluZyBmb3Igc29tZSBhdHRyaWJ1dGVzIGV2ZW4gd2hlbiBub3QgcHJlc2VudFxyXG5cdFx0cmV0dXJuIHR5cGUgIT09IFwiYm9vbGVhblwiICYmIHR5cGUgIT09IFwic3RyaW5nXCI7XHJcblx0fSksXHJcblxyXG5cdC8vIENoZWNrIGlmIGdldEVsZW1lbnRzQnlDbGFzc05hbWUgY2FuIGJlIHRydXN0ZWRcclxuXHRhc3NlcnRVc2FibGVDbGFzc05hbWUgPSBhc3NlcnQoZnVuY3Rpb24oIGRpdiApIHtcclxuXHRcdC8vIE9wZXJhIGNhbid0IGZpbmQgYSBzZWNvbmQgY2xhc3NuYW1lIChpbiA5LjYpXHJcblx0XHRkaXYuaW5uZXJIVE1MID0gXCI8ZGl2IGNsYXNzPSdoaWRkZW4gZSc+PC9kaXY+PGRpdiBjbGFzcz0naGlkZGVuJz48L2Rpdj5cIjtcclxuXHRcdGlmICggIWRpdi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lIHx8ICFkaXYuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcImVcIikubGVuZ3RoICkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2FmYXJpIDMuMiBjYWNoZXMgY2xhc3MgYXR0cmlidXRlcyBhbmQgZG9lc24ndCBjYXRjaCBjaGFuZ2VzXHJcblx0XHRkaXYubGFzdENoaWxkLmNsYXNzTmFtZSA9IFwiZVwiO1xyXG5cdFx0cmV0dXJuIGRpdi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwiZVwiKS5sZW5ndGggPT09IDI7XHJcblx0fSksXHJcblxyXG5cdC8vIENoZWNrIGlmIGdldEVsZW1lbnRCeUlkIHJldHVybnMgZWxlbWVudHMgYnkgbmFtZVxyXG5cdC8vIENoZWNrIGlmIGdldEVsZW1lbnRzQnlOYW1lIHByaXZpbGVnZXMgZm9ybSBjb250cm9scyBvciByZXR1cm5zIGVsZW1lbnRzIGJ5IElEXHJcblx0YXNzZXJ0VXNhYmxlTmFtZSA9IGFzc2VydChmdW5jdGlvbiggZGl2ICkge1xyXG5cdFx0Ly8gSW5qZWN0IGNvbnRlbnRcclxuXHRcdGRpdi5pZCA9IGV4cGFuZG8gKyAwO1xyXG5cdFx0ZGl2LmlubmVySFRNTCA9IFwiPGEgbmFtZT0nXCIgKyBleHBhbmRvICsgXCInPjwvYT48ZGl2IG5hbWU9J1wiICsgZXhwYW5kbyArIFwiJz48L2Rpdj5cIjtcclxuXHRcdGRvY0VsZW0uaW5zZXJ0QmVmb3JlKCBkaXYsIGRvY0VsZW0uZmlyc3RDaGlsZCApO1xyXG5cclxuXHRcdC8vIFRlc3RcclxuXHRcdHZhciBwYXNzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUgJiZcclxuXHRcdFx0Ly8gYnVnZ3kgYnJvd3NlcnMgd2lsbCByZXR1cm4gZmV3ZXIgdGhhbiB0aGUgY29ycmVjdCAyXHJcblx0XHRcdGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCBleHBhbmRvICkubGVuZ3RoID09PSAyICtcclxuXHRcdFx0Ly8gYnVnZ3kgYnJvd3NlcnMgd2lsbCByZXR1cm4gbW9yZSB0aGFuIHRoZSBjb3JyZWN0IDBcclxuXHRcdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoIGV4cGFuZG8gKyAwICkubGVuZ3RoO1xyXG5cdFx0YXNzZXJ0R2V0SWROb3ROYW1lID0gIWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBleHBhbmRvICk7XHJcblxyXG5cdFx0Ly8gQ2xlYW51cFxyXG5cdFx0ZG9jRWxlbS5yZW1vdmVDaGlsZCggZGl2ICk7XHJcblxyXG5cdFx0cmV0dXJuIHBhc3M7XHJcblx0fSk7XHJcblxyXG4vLyBJZiBzbGljZSBpcyBub3QgYXZhaWxhYmxlLCBwcm92aWRlIGEgYmFja3VwXHJcbnRyeSB7XHJcblx0c2xpY2UuY2FsbCggZG9jRWxlbS5jaGlsZE5vZGVzLCAwIClbMF0ubm9kZVR5cGU7XHJcbn0gY2F0Y2ggKCBlICkge1xyXG5cdHNsaWNlID0gZnVuY3Rpb24oIGkgKSB7XHJcblx0XHR2YXIgZWxlbSwgcmVzdWx0cyA9IFtdO1xyXG5cdFx0Zm9yICggOyAoZWxlbSA9IHRoaXNbaV0pOyBpKysgKSB7XHJcblx0XHRcdHJlc3VsdHMucHVzaCggZWxlbSApO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0fTtcclxufVxyXG5cclxuZnVuY3Rpb24gU2l6emxlKCBzZWxlY3RvciwgY29udGV4dCwgcmVzdWx0cywgc2VlZCApIHtcclxuXHRyZXN1bHRzID0gcmVzdWx0cyB8fCBbXTtcclxuXHRjb250ZXh0ID0gY29udGV4dCB8fCBkb2N1bWVudDtcclxuXHR2YXIgbWF0Y2gsIGVsZW0sIHhtbCwgbSxcclxuXHRcdG5vZGVUeXBlID0gY29udGV4dC5ub2RlVHlwZTtcclxuXHJcblx0aWYgKCBub2RlVHlwZSAhPT0gMSAmJiBub2RlVHlwZSAhPT0gOSApIHtcclxuXHRcdHJldHVybiBbXTtcclxuXHR9XHJcblxyXG5cdGlmICggIXNlbGVjdG9yIHx8IHR5cGVvZiBzZWxlY3RvciAhPT0gXCJzdHJpbmdcIiApIHtcclxuXHRcdHJldHVybiByZXN1bHRzO1xyXG5cdH1cclxuXHJcblx0eG1sID0gaXNYTUwoIGNvbnRleHQgKTtcclxuXHJcblx0aWYgKCAheG1sICYmICFzZWVkICkge1xyXG5cdFx0aWYgKCAobWF0Y2ggPSBycXVpY2tFeHByLmV4ZWMoIHNlbGVjdG9yICkpICkge1xyXG5cdFx0XHQvLyBTcGVlZC11cDogU2l6emxlKFwiI0lEXCIpXHJcblx0XHRcdGlmICggKG0gPSBtYXRjaFsxXSkgKSB7XHJcblx0XHRcdFx0aWYgKCBub2RlVHlwZSA9PT0gOSApIHtcclxuXHRcdFx0XHRcdGVsZW0gPSBjb250ZXh0LmdldEVsZW1lbnRCeUlkKCBtICk7XHJcblx0XHRcdFx0XHQvLyBDaGVjayBwYXJlbnROb2RlIHRvIGNhdGNoIHdoZW4gQmxhY2tiZXJyeSA0LjYgcmV0dXJuc1xyXG5cdFx0XHRcdFx0Ly8gbm9kZXMgdGhhdCBhcmUgbm8gbG9uZ2VyIGluIHRoZSBkb2N1bWVudCAjNjk2M1xyXG5cdFx0XHRcdFx0aWYgKCBlbGVtICYmIGVsZW0ucGFyZW50Tm9kZSApIHtcclxuXHRcdFx0XHRcdFx0Ly8gSGFuZGxlIHRoZSBjYXNlIHdoZXJlIElFLCBPcGVyYSwgYW5kIFdlYmtpdCByZXR1cm4gaXRlbXNcclxuXHRcdFx0XHRcdFx0Ly8gYnkgbmFtZSBpbnN0ZWFkIG9mIElEXHJcblx0XHRcdFx0XHRcdGlmICggZWxlbS5pZCA9PT0gbSApIHtcclxuXHRcdFx0XHRcdFx0XHRyZXN1bHRzLnB1c2goIGVsZW0gKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0cztcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIENvbnRleHQgaXMgbm90IGEgZG9jdW1lbnRcclxuXHRcdFx0XHRcdGlmICggY29udGV4dC5vd25lckRvY3VtZW50ICYmIChlbGVtID0gY29udGV4dC5vd25lckRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCBtICkpICYmXHJcblx0XHRcdFx0XHRcdGNvbnRhaW5zKCBjb250ZXh0LCBlbGVtICkgJiYgZWxlbS5pZCA9PT0gbSApIHtcclxuXHRcdFx0XHRcdFx0cmVzdWx0cy5wdXNoKCBlbGVtICk7XHJcblx0XHRcdFx0XHRcdHJldHVybiByZXN1bHRzO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNwZWVkLXVwOiBTaXp6bGUoXCJUQUdcIilcclxuXHRcdFx0fSBlbHNlIGlmICggbWF0Y2hbMl0gKSB7XHJcblx0XHRcdFx0cHVzaC5hcHBseSggcmVzdWx0cywgc2xpY2UuY2FsbChjb250ZXh0LmdldEVsZW1lbnRzQnlUYWdOYW1lKCBzZWxlY3RvciApLCAwKSApO1xyXG5cdFx0XHRcdHJldHVybiByZXN1bHRzO1xyXG5cclxuXHRcdFx0Ly8gU3BlZWQtdXA6IFNpenpsZShcIi5DTEFTU1wiKVxyXG5cdFx0XHR9IGVsc2UgaWYgKCAobSA9IG1hdGNoWzNdKSAmJiBhc3NlcnRVc2FibGVDbGFzc05hbWUgJiYgY29udGV4dC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lICkge1xyXG5cdFx0XHRcdHB1c2guYXBwbHkoIHJlc3VsdHMsIHNsaWNlLmNhbGwoY29udGV4dC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCBtICksIDApICk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIEFsbCBvdGhlcnNcclxuXHRyZXR1cm4gc2VsZWN0KCBzZWxlY3RvciwgY29udGV4dCwgcmVzdWx0cywgc2VlZCwgeG1sICk7XHJcbn1cclxuXHJcblNpenpsZS5tYXRjaGVzID0gZnVuY3Rpb24oIGV4cHIsIGVsZW1lbnRzICkge1xyXG5cdHJldHVybiBTaXp6bGUoIGV4cHIsIG51bGwsIG51bGwsIGVsZW1lbnRzICk7XHJcbn07XHJcblxyXG5TaXp6bGUubWF0Y2hlc1NlbGVjdG9yID0gZnVuY3Rpb24oIGVsZW0sIGV4cHIgKSB7XHJcblx0cmV0dXJuIFNpenpsZSggZXhwciwgbnVsbCwgbnVsbCwgWyBlbGVtIF0gKS5sZW5ndGggPiAwO1xyXG59O1xyXG5cclxuLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRvIHVzZSBpbiBwc2V1ZG9zIGZvciBpbnB1dCB0eXBlc1xyXG5mdW5jdGlvbiBjcmVhdGVJbnB1dFBzZXVkbyggdHlwZSApIHtcclxuXHRyZXR1cm4gZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHR2YXIgbmFtZSA9IGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcclxuXHRcdHJldHVybiBuYW1lID09PSBcImlucHV0XCIgJiYgZWxlbS50eXBlID09PSB0eXBlO1xyXG5cdH07XHJcbn1cclxuXHJcbi8vIFJldHVybnMgYSBmdW5jdGlvbiB0byB1c2UgaW4gcHNldWRvcyBmb3IgYnV0dG9uc1xyXG5mdW5jdGlvbiBjcmVhdGVCdXR0b25Qc2V1ZG8oIHR5cGUgKSB7XHJcblx0cmV0dXJuIGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0dmFyIG5hbWUgPSBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRyZXR1cm4gKG5hbWUgPT09IFwiaW5wdXRcIiB8fCBuYW1lID09PSBcImJ1dHRvblwiKSAmJiBlbGVtLnR5cGUgPT09IHR5cGU7XHJcblx0fTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFV0aWxpdHkgZnVuY3Rpb24gZm9yIHJldHJpZXZpbmcgdGhlIHRleHQgdmFsdWUgb2YgYW4gYXJyYXkgb2YgRE9NIG5vZGVzXHJcbiAqIEBwYXJhbSB7QXJyYXl8RWxlbWVudH0gZWxlbVxyXG4gKi9cclxuZ2V0VGV4dCA9IFNpenpsZS5nZXRUZXh0ID0gZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0dmFyIG5vZGUsXHJcblx0XHRyZXQgPSBcIlwiLFxyXG5cdFx0aSA9IDAsXHJcblx0XHRub2RlVHlwZSA9IGVsZW0ubm9kZVR5cGU7XHJcblxyXG5cdGlmICggbm9kZVR5cGUgKSB7XHJcblx0XHRpZiAoIG5vZGVUeXBlID09PSAxIHx8IG5vZGVUeXBlID09PSA5IHx8IG5vZGVUeXBlID09PSAxMSApIHtcclxuXHRcdFx0Ly8gVXNlIHRleHRDb250ZW50IGZvciBlbGVtZW50c1xyXG5cdFx0XHQvLyBpbm5lclRleHQgdXNhZ2UgcmVtb3ZlZCBmb3IgY29uc2lzdGVuY3kgb2YgbmV3IGxpbmVzIChzZWUgIzExMTUzKVxyXG5cdFx0XHRpZiAoIHR5cGVvZiBlbGVtLnRleHRDb250ZW50ID09PSBcInN0cmluZ1wiICkge1xyXG5cdFx0XHRcdHJldHVybiBlbGVtLnRleHRDb250ZW50O1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFRyYXZlcnNlIGl0cyBjaGlsZHJlblxyXG5cdFx0XHRcdGZvciAoIGVsZW0gPSBlbGVtLmZpcnN0Q2hpbGQ7IGVsZW07IGVsZW0gPSBlbGVtLm5leHRTaWJsaW5nICkge1xyXG5cdFx0XHRcdFx0cmV0ICs9IGdldFRleHQoIGVsZW0gKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAoIG5vZGVUeXBlID09PSAzIHx8IG5vZGVUeXBlID09PSA0ICkge1xyXG5cdFx0XHRyZXR1cm4gZWxlbS5ub2RlVmFsdWU7XHJcblx0XHR9XHJcblx0XHQvLyBEbyBub3QgaW5jbHVkZSBjb21tZW50IG9yIHByb2Nlc3NpbmcgaW5zdHJ1Y3Rpb24gbm9kZXNcclxuXHR9IGVsc2Uge1xyXG5cclxuXHRcdC8vIElmIG5vIG5vZGVUeXBlLCB0aGlzIGlzIGV4cGVjdGVkIHRvIGJlIGFuIGFycmF5XHJcblx0XHRmb3IgKCA7IChub2RlID0gZWxlbVtpXSk7IGkrKyApIHtcclxuXHRcdFx0Ly8gRG8gbm90IHRyYXZlcnNlIGNvbW1lbnQgbm9kZXNcclxuXHRcdFx0cmV0ICs9IGdldFRleHQoIG5vZGUgKTtcclxuXHRcdH1cclxuXHR9XHJcblx0cmV0dXJuIHJldDtcclxufTtcclxuXHJcbmlzWE1MID0gU2l6emxlLmlzWE1MID0gZnVuY3Rpb24gaXNYTUwoIGVsZW0gKSB7XHJcblx0Ly8gZG9jdW1lbnRFbGVtZW50IGlzIHZlcmlmaWVkIGZvciBjYXNlcyB3aGVyZSBpdCBkb2Vzbid0IHlldCBleGlzdFxyXG5cdC8vIChzdWNoIGFzIGxvYWRpbmcgaWZyYW1lcyBpbiBJRSAtICM0ODMzKVxyXG5cdHZhciBkb2N1bWVudEVsZW1lbnQgPSBlbGVtICYmIChlbGVtLm93bmVyRG9jdW1lbnQgfHwgZWxlbSkuZG9jdW1lbnRFbGVtZW50O1xyXG5cdHJldHVybiBkb2N1bWVudEVsZW1lbnQgPyBkb2N1bWVudEVsZW1lbnQubm9kZU5hbWUgIT09IFwiSFRNTFwiIDogZmFsc2U7XHJcbn07XHJcblxyXG4vLyBFbGVtZW50IGNvbnRhaW5zIGFub3RoZXJcclxuY29udGFpbnMgPSBTaXp6bGUuY29udGFpbnMgPSBkb2NFbGVtLmNvbnRhaW5zID9cclxuXHRmdW5jdGlvbiggYSwgYiApIHtcclxuXHRcdHZhciBhZG93biA9IGEubm9kZVR5cGUgPT09IDkgPyBhLmRvY3VtZW50RWxlbWVudCA6IGEsXHJcblx0XHRcdGJ1cCA9IGIgJiYgYi5wYXJlbnROb2RlO1xyXG5cdFx0cmV0dXJuIGEgPT09IGJ1cCB8fCAhISggYnVwICYmIGJ1cC5ub2RlVHlwZSA9PT0gMSAmJiBhZG93bi5jb250YWlucyAmJiBhZG93bi5jb250YWlucyhidXApICk7XHJcblx0fSA6XHJcblx0ZG9jRWxlbS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiA/XHJcblx0ZnVuY3Rpb24oIGEsIGIgKSB7XHJcblx0XHRyZXR1cm4gYiAmJiAhISggYS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiggYiApICYgMTYgKTtcclxuXHR9IDpcclxuXHRmdW5jdGlvbiggYSwgYiApIHtcclxuXHRcdHdoaWxlICggKGIgPSBiLnBhcmVudE5vZGUpICkge1xyXG5cdFx0XHRpZiAoIGIgPT09IGEgKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9O1xyXG5cclxuU2l6emxlLmF0dHIgPSBmdW5jdGlvbiggZWxlbSwgbmFtZSApIHtcclxuXHR2YXIgYXR0cixcclxuXHRcdHhtbCA9IGlzWE1MKCBlbGVtICk7XHJcblxyXG5cdGlmICggIXhtbCApIHtcclxuXHRcdG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XHJcblx0fVxyXG5cdGlmICggRXhwci5hdHRySGFuZGxlWyBuYW1lIF0gKSB7XHJcblx0XHRyZXR1cm4gRXhwci5hdHRySGFuZGxlWyBuYW1lIF0oIGVsZW0gKTtcclxuXHR9XHJcblx0aWYgKCBhc3NlcnRBdHRyaWJ1dGVzIHx8IHhtbCApIHtcclxuXHRcdHJldHVybiBlbGVtLmdldEF0dHJpYnV0ZSggbmFtZSApO1xyXG5cdH1cclxuXHRhdHRyID0gZWxlbS5nZXRBdHRyaWJ1dGVOb2RlKCBuYW1lICk7XHJcblx0cmV0dXJuIGF0dHIgP1xyXG5cdFx0dHlwZW9mIGVsZW1bIG5hbWUgXSA9PT0gXCJib29sZWFuXCIgP1xyXG5cdFx0XHRlbGVtWyBuYW1lIF0gPyBuYW1lIDogbnVsbCA6XHJcblx0XHRcdGF0dHIuc3BlY2lmaWVkID8gYXR0ci52YWx1ZSA6IG51bGwgOlxyXG5cdFx0bnVsbDtcclxufTtcclxuXHJcbkV4cHIgPSBTaXp6bGUuc2VsZWN0b3JzID0ge1xyXG5cclxuXHQvLyBDYW4gYmUgYWRqdXN0ZWQgYnkgdGhlIHVzZXJcclxuXHRjYWNoZUxlbmd0aDogNTAsXHJcblxyXG5cdGNyZWF0ZVBzZXVkbzogbWFya0Z1bmN0aW9uLFxyXG5cclxuXHRtYXRjaDogbWF0Y2hFeHByLFxyXG5cclxuXHRvcmRlcjogbmV3IFJlZ0V4cCggXCJJRHxUQUdcIiArXHJcblx0XHQoYXNzZXJ0VXNhYmxlTmFtZSA/IFwifE5BTUVcIiA6IFwiXCIpICtcclxuXHRcdChhc3NlcnRVc2FibGVDbGFzc05hbWUgPyBcInxDTEFTU1wiIDogXCJcIilcclxuXHQpLFxyXG5cclxuXHQvLyBJRTYvNyByZXR1cm4gYSBtb2RpZmllZCBocmVmXHJcblx0YXR0ckhhbmRsZTogYXNzZXJ0SHJlZk5vdE5vcm1hbGl6ZWQgP1xyXG5cdFx0e30gOlxyXG5cdFx0e1xyXG5cdFx0XHRcImhyZWZcIjogZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdFx0cmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKCBcImhyZWZcIiwgMiApO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRcInR5cGVcIjogZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdFx0cmV0dXJuIGVsZW0uZ2V0QXR0cmlidXRlKFwidHlwZVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHJcblx0ZmluZDoge1xyXG5cdFx0XCJJRFwiOiBhc3NlcnRHZXRJZE5vdE5hbWUgP1xyXG5cdFx0XHRmdW5jdGlvbiggaWQsIGNvbnRleHQsIHhtbCApIHtcclxuXHRcdFx0XHRpZiAoIHR5cGVvZiBjb250ZXh0LmdldEVsZW1lbnRCeUlkICE9PSBzdHJ1bmRlZmluZWQgJiYgIXhtbCApIHtcclxuXHRcdFx0XHRcdHZhciBtID0gY29udGV4dC5nZXRFbGVtZW50QnlJZCggaWQgKTtcclxuXHRcdFx0XHRcdC8vIENoZWNrIHBhcmVudE5vZGUgdG8gY2F0Y2ggd2hlbiBCbGFja2JlcnJ5IDQuNiByZXR1cm5zXHJcblx0XHRcdFx0XHQvLyBub2RlcyB0aGF0IGFyZSBubyBsb25nZXIgaW4gdGhlIGRvY3VtZW50ICM2OTYzXHJcblx0XHRcdFx0XHRyZXR1cm4gbSAmJiBtLnBhcmVudE5vZGUgPyBbbV0gOiBbXTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gOlxyXG5cdFx0XHRmdW5jdGlvbiggaWQsIGNvbnRleHQsIHhtbCApIHtcclxuXHRcdFx0XHRpZiAoIHR5cGVvZiBjb250ZXh0LmdldEVsZW1lbnRCeUlkICE9PSBzdHJ1bmRlZmluZWQgJiYgIXhtbCApIHtcclxuXHRcdFx0XHRcdHZhciBtID0gY29udGV4dC5nZXRFbGVtZW50QnlJZCggaWQgKTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gbSA/XHJcblx0XHRcdFx0XHRcdG0uaWQgPT09IGlkIHx8IHR5cGVvZiBtLmdldEF0dHJpYnV0ZU5vZGUgIT09IHN0cnVuZGVmaW5lZCAmJiBtLmdldEF0dHJpYnV0ZU5vZGUoXCJpZFwiKS52YWx1ZSA9PT0gaWQgP1xyXG5cdFx0XHRcdFx0XHRcdFttXSA6XHJcblx0XHRcdFx0XHRcdFx0dW5kZWZpbmVkIDpcclxuXHRcdFx0XHRcdFx0W107XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9LFxyXG5cclxuXHRcdFwiVEFHXCI6IGFzc2VydFRhZ05hbWVOb0NvbW1lbnRzID9cclxuXHRcdFx0ZnVuY3Rpb24oIHRhZywgY29udGV4dCApIHtcclxuXHRcdFx0XHRpZiAoIHR5cGVvZiBjb250ZXh0LmdldEVsZW1lbnRzQnlUYWdOYW1lICE9PSBzdHJ1bmRlZmluZWQgKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gY29udGV4dC5nZXRFbGVtZW50c0J5VGFnTmFtZSggdGFnICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IDpcclxuXHRcdFx0ZnVuY3Rpb24oIHRhZywgY29udGV4dCApIHtcclxuXHRcdFx0XHR2YXIgcmVzdWx0cyA9IGNvbnRleHQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoIHRhZyApO1xyXG5cclxuXHRcdFx0XHQvLyBGaWx0ZXIgb3V0IHBvc3NpYmxlIGNvbW1lbnRzXHJcblx0XHRcdFx0aWYgKCB0YWcgPT09IFwiKlwiICkge1xyXG5cdFx0XHRcdFx0dmFyIGVsZW0sXHJcblx0XHRcdFx0XHRcdHRtcCA9IFtdLFxyXG5cdFx0XHRcdFx0XHRpID0gMDtcclxuXHJcblx0XHRcdFx0XHRmb3IgKCA7IChlbGVtID0gcmVzdWx0c1tpXSk7IGkrKyApIHtcclxuXHRcdFx0XHRcdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAxICkge1xyXG5cdFx0XHRcdFx0XHRcdHRtcC5wdXNoKCBlbGVtICk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gdG1wO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gcmVzdWx0cztcclxuXHRcdFx0fSxcclxuXHJcblx0XHRcIk5BTUVcIjogZnVuY3Rpb24oIHRhZywgY29udGV4dCApIHtcclxuXHRcdFx0aWYgKCB0eXBlb2YgY29udGV4dC5nZXRFbGVtZW50c0J5TmFtZSAhPT0gc3RydW5kZWZpbmVkICkge1xyXG5cdFx0XHRcdHJldHVybiBjb250ZXh0LmdldEVsZW1lbnRzQnlOYW1lKCBuYW1lICk7XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblxyXG5cdFx0XCJDTEFTU1wiOiBmdW5jdGlvbiggY2xhc3NOYW1lLCBjb250ZXh0LCB4bWwgKSB7XHJcblx0XHRcdGlmICggdHlwZW9mIGNvbnRleHQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSAhPT0gc3RydW5kZWZpbmVkICYmICF4bWwgKSB7XHJcblx0XHRcdFx0cmV0dXJuIGNvbnRleHQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSggY2xhc3NOYW1lICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRyZWxhdGl2ZToge1xyXG5cdFx0XCI+XCI6IHsgZGlyOiBcInBhcmVudE5vZGVcIiwgZmlyc3Q6IHRydWUgfSxcclxuXHRcdFwiIFwiOiB7IGRpcjogXCJwYXJlbnROb2RlXCIgfSxcclxuXHRcdFwiK1wiOiB7IGRpcjogXCJwcmV2aW91c1NpYmxpbmdcIiwgZmlyc3Q6IHRydWUgfSxcclxuXHRcdFwiflwiOiB7IGRpcjogXCJwcmV2aW91c1NpYmxpbmdcIiB9XHJcblx0fSxcclxuXHJcblx0cHJlRmlsdGVyOiB7XHJcblx0XHRcIkFUVFJcIjogZnVuY3Rpb24oIG1hdGNoICkge1xyXG5cdFx0XHRtYXRjaFsxXSA9IG1hdGNoWzFdLnJlcGxhY2UoIHJiYWNrc2xhc2gsIFwiXCIgKTtcclxuXHJcblx0XHRcdC8vIE1vdmUgdGhlIGdpdmVuIHZhbHVlIHRvIG1hdGNoWzNdIHdoZXRoZXIgcXVvdGVkIG9yIHVucXVvdGVkXHJcblx0XHRcdG1hdGNoWzNdID0gKCBtYXRjaFs0XSB8fCBtYXRjaFs1XSB8fCBcIlwiICkucmVwbGFjZSggcmJhY2tzbGFzaCwgXCJcIiApO1xyXG5cclxuXHRcdFx0aWYgKCBtYXRjaFsyXSA9PT0gXCJ+PVwiICkge1xyXG5cdFx0XHRcdG1hdGNoWzNdID0gXCIgXCIgKyBtYXRjaFszXSArIFwiIFwiO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gbWF0Y2guc2xpY2UoIDAsIDQgKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0XCJDSElMRFwiOiBmdW5jdGlvbiggbWF0Y2ggKSB7XHJcblx0XHRcdC8qIG1hdGNoZXMgZnJvbSBtYXRjaEV4cHIuQ0hJTERcclxuXHRcdFx0XHQxIHR5cGUgKG9ubHl8bnRofC4uLilcclxuXHRcdFx0XHQyIGFyZ3VtZW50IChldmVufG9kZHxcXGQqfFxcZCpuKFsrLV1cXGQrKT98Li4uKVxyXG5cdFx0XHRcdDMgeG4tY29tcG9uZW50IG9mIHhuK3kgYXJndW1lbnQgKFsrLV0/XFxkKm58KVxyXG5cdFx0XHRcdDQgc2lnbiBvZiB4bi1jb21wb25lbnRcclxuXHRcdFx0XHQ1IHggb2YgeG4tY29tcG9uZW50XHJcblx0XHRcdFx0NiBzaWduIG9mIHktY29tcG9uZW50XHJcblx0XHRcdFx0NyB5IG9mIHktY29tcG9uZW50XHJcblx0XHRcdCovXHJcblx0XHRcdG1hdGNoWzFdID0gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHRcdGlmICggbWF0Y2hbMV0gPT09IFwibnRoXCIgKSB7XHJcblx0XHRcdFx0Ly8gbnRoLWNoaWxkIHJlcXVpcmVzIGFyZ3VtZW50XHJcblx0XHRcdFx0aWYgKCAhbWF0Y2hbMl0gKSB7XHJcblx0XHRcdFx0XHRTaXp6bGUuZXJyb3IoIG1hdGNoWzBdICk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBudW1lcmljIHggYW5kIHkgcGFyYW1ldGVycyBmb3IgRXhwci5maWx0ZXIuQ0hJTERcclxuXHRcdFx0XHQvLyByZW1lbWJlciB0aGF0IGZhbHNlL3RydWUgY2FzdCByZXNwZWN0aXZlbHkgdG8gMC8xXHJcblx0XHRcdFx0bWF0Y2hbM10gPSArKCBtYXRjaFszXSA/IG1hdGNoWzRdICsgKG1hdGNoWzVdIHx8IDEpIDogMiAqICggbWF0Y2hbMl0gPT09IFwiZXZlblwiIHx8IG1hdGNoWzJdID09PSBcIm9kZFwiICkgKTtcclxuXHRcdFx0XHRtYXRjaFs0XSA9ICsoICggbWF0Y2hbNl0gKyBtYXRjaFs3XSApIHx8IG1hdGNoWzJdID09PSBcIm9kZFwiICk7XHJcblxyXG5cdFx0XHQvLyBvdGhlciB0eXBlcyBwcm9oaWJpdCBhcmd1bWVudHNcclxuXHRcdFx0fSBlbHNlIGlmICggbWF0Y2hbMl0gKSB7XHJcblx0XHRcdFx0U2l6emxlLmVycm9yKCBtYXRjaFswXSApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gbWF0Y2g7XHJcblx0XHR9LFxyXG5cclxuXHRcdFwiUFNFVURPXCI6IGZ1bmN0aW9uKCBtYXRjaCwgY29udGV4dCwgeG1sICkge1xyXG5cdFx0XHR2YXIgdW5xdW90ZWQsIGV4Y2VzcztcclxuXHRcdFx0aWYgKCBtYXRjaEV4cHJbXCJDSElMRFwiXS50ZXN0KCBtYXRjaFswXSApICkge1xyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoIG1hdGNoWzNdICkge1xyXG5cdFx0XHRcdG1hdGNoWzJdID0gbWF0Y2hbM107XHJcblx0XHRcdH0gZWxzZSBpZiAoICh1bnF1b3RlZCA9IG1hdGNoWzRdKSApIHtcclxuXHRcdFx0XHQvLyBPbmx5IGNoZWNrIGFyZ3VtZW50cyB0aGF0IGNvbnRhaW4gYSBwc2V1ZG9cclxuXHRcdFx0XHRpZiAoIHJwc2V1ZG8udGVzdCh1bnF1b3RlZCkgJiZcclxuXHRcdFx0XHRcdC8vIEdldCBleGNlc3MgZnJvbSB0b2tlbml6ZSAocmVjdXJzaXZlbHkpXHJcblx0XHRcdFx0XHQoZXhjZXNzID0gdG9rZW5pemUoIHVucXVvdGVkLCBjb250ZXh0LCB4bWwsIHRydWUgKSkgJiZcclxuXHRcdFx0XHRcdC8vIGFkdmFuY2UgdG8gdGhlIG5leHQgY2xvc2luZyBwYXJlbnRoZXNpc1xyXG5cdFx0XHRcdFx0KGV4Y2VzcyA9IHVucXVvdGVkLmluZGV4T2YoIFwiKVwiLCB1bnF1b3RlZC5sZW5ndGggLSBleGNlc3MgKSAtIHVucXVvdGVkLmxlbmd0aCkgKSB7XHJcblxyXG5cdFx0XHRcdFx0Ly8gZXhjZXNzIGlzIGEgbmVnYXRpdmUgaW5kZXhcclxuXHRcdFx0XHRcdHVucXVvdGVkID0gdW5xdW90ZWQuc2xpY2UoIDAsIGV4Y2VzcyApO1xyXG5cdFx0XHRcdFx0bWF0Y2hbMF0gPSBtYXRjaFswXS5zbGljZSggMCwgZXhjZXNzICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdG1hdGNoWzJdID0gdW5xdW90ZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFJldHVybiBvbmx5IGNhcHR1cmVzIG5lZWRlZCBieSB0aGUgcHNldWRvIGZpbHRlciBtZXRob2QgKHR5cGUgYW5kIGFyZ3VtZW50KVxyXG5cdFx0XHRyZXR1cm4gbWF0Y2guc2xpY2UoIDAsIDMgKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRmaWx0ZXI6IHtcclxuXHRcdFwiSURcIjogYXNzZXJ0R2V0SWROb3ROYW1lID9cclxuXHRcdFx0ZnVuY3Rpb24oIGlkICkge1xyXG5cdFx0XHRcdGlkID0gaWQucmVwbGFjZSggcmJhY2tzbGFzaCwgXCJcIiApO1xyXG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbiggZWxlbSApIHtcclxuXHRcdFx0XHRcdHJldHVybiBlbGVtLmdldEF0dHJpYnV0ZShcImlkXCIpID09PSBpZDtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9IDpcclxuXHRcdFx0ZnVuY3Rpb24oIGlkICkge1xyXG5cdFx0XHRcdGlkID0gaWQucmVwbGFjZSggcmJhY2tzbGFzaCwgXCJcIiApO1xyXG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbiggZWxlbSApIHtcclxuXHRcdFx0XHRcdHZhciBub2RlID0gdHlwZW9mIGVsZW0uZ2V0QXR0cmlidXRlTm9kZSAhPT0gc3RydW5kZWZpbmVkICYmIGVsZW0uZ2V0QXR0cmlidXRlTm9kZShcImlkXCIpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5vZGUgJiYgbm9kZS52YWx1ZSA9PT0gaWQ7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fSxcclxuXHJcblx0XHRcIlRBR1wiOiBmdW5jdGlvbiggbm9kZU5hbWUgKSB7XHJcblx0XHRcdGlmICggbm9kZU5hbWUgPT09IFwiKlwiICkge1xyXG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbigpIHsgcmV0dXJuIHRydWU7IH07XHJcblx0XHRcdH1cclxuXHRcdFx0bm9kZU5hbWUgPSBub2RlTmFtZS5yZXBsYWNlKCByYmFja3NsYXNoLCBcIlwiICkudG9Mb3dlckNhc2UoKTtcclxuXHJcblx0XHRcdHJldHVybiBmdW5jdGlvbiggZWxlbSApIHtcclxuXHRcdFx0XHRyZXR1cm4gZWxlbS5ub2RlTmFtZSAmJiBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5vZGVOYW1lO1xyXG5cdFx0XHR9O1xyXG5cdFx0fSxcclxuXHJcblx0XHRcIkNMQVNTXCI6IGZ1bmN0aW9uKCBjbGFzc05hbWUgKSB7XHJcblx0XHRcdHZhciBwYXR0ZXJuID0gY2xhc3NDYWNoZVsgZXhwYW5kbyBdWyBjbGFzc05hbWUgXTtcclxuXHRcdFx0aWYgKCAhcGF0dGVybiApIHtcclxuXHRcdFx0XHRwYXR0ZXJuID0gY2xhc3NDYWNoZSggY2xhc3NOYW1lLCBuZXcgUmVnRXhwKFwiKF58XCIgKyB3aGl0ZXNwYWNlICsgXCIpXCIgKyBjbGFzc05hbWUgKyBcIihcIiArIHdoaXRlc3BhY2UgKyBcInwkKVwiKSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBmdW5jdGlvbiggZWxlbSApIHtcclxuXHRcdFx0XHRyZXR1cm4gcGF0dGVybi50ZXN0KCBlbGVtLmNsYXNzTmFtZSB8fCAodHlwZW9mIGVsZW0uZ2V0QXR0cmlidXRlICE9PSBzdHJ1bmRlZmluZWQgJiYgZWxlbS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSkgfHwgXCJcIiApO1xyXG5cdFx0XHR9O1xyXG5cdFx0fSxcclxuXHJcblx0XHRcIkFUVFJcIjogZnVuY3Rpb24oIG5hbWUsIG9wZXJhdG9yLCBjaGVjayApIHtcclxuXHRcdFx0aWYgKCAhb3BlcmF0b3IgKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIFNpenpsZS5hdHRyKCBlbGVtLCBuYW1lICkgIT0gbnVsbDtcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdFx0dmFyIHJlc3VsdCA9IFNpenpsZS5hdHRyKCBlbGVtLCBuYW1lICksXHJcblx0XHRcdFx0XHR2YWx1ZSA9IHJlc3VsdCArIFwiXCI7XHJcblxyXG5cdFx0XHRcdGlmICggcmVzdWx0ID09IG51bGwgKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gb3BlcmF0b3IgPT09IFwiIT1cIjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHN3aXRjaCAoIG9wZXJhdG9yICkge1xyXG5cdFx0XHRcdFx0Y2FzZSBcIj1cIjpcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHZhbHVlID09PSBjaGVjaztcclxuXHRcdFx0XHRcdGNhc2UgXCIhPVwiOlxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdmFsdWUgIT09IGNoZWNrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIl49XCI6XHJcblx0XHRcdFx0XHRcdHJldHVybiBjaGVjayAmJiB2YWx1ZS5pbmRleE9mKCBjaGVjayApID09PSAwO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIio9XCI6XHJcblx0XHRcdFx0XHRcdHJldHVybiBjaGVjayAmJiB2YWx1ZS5pbmRleE9mKCBjaGVjayApID4gLTE7XHJcblx0XHRcdFx0XHRjYXNlIFwiJD1cIjpcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGNoZWNrICYmIHZhbHVlLnN1YnN0ciggdmFsdWUubGVuZ3RoIC0gY2hlY2subGVuZ3RoICkgPT09IGNoZWNrO1xyXG5cdFx0XHRcdFx0Y2FzZSBcIn49XCI6XHJcblx0XHRcdFx0XHRcdHJldHVybiAoIFwiIFwiICsgdmFsdWUgKyBcIiBcIiApLmluZGV4T2YoIGNoZWNrICkgPiAtMTtcclxuXHRcdFx0XHRcdGNhc2UgXCJ8PVwiOlxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdmFsdWUgPT09IGNoZWNrIHx8IHZhbHVlLnN1YnN0ciggMCwgY2hlY2subGVuZ3RoICsgMSApID09PSBjaGVjayArIFwiLVwiO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblxyXG5cdFx0XCJDSElMRFwiOiBmdW5jdGlvbiggdHlwZSwgYXJndW1lbnQsIGZpcnN0LCBsYXN0ICkge1xyXG5cclxuXHRcdFx0aWYgKCB0eXBlID09PSBcIm50aFwiICkge1xyXG5cdFx0XHRcdHZhciBkb25lTmFtZSA9IGRvbmUrKztcclxuXHJcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0XHRcdFx0dmFyIHBhcmVudCwgZGlmZixcclxuXHRcdFx0XHRcdFx0Y291bnQgPSAwLFxyXG5cdFx0XHRcdFx0XHRub2RlID0gZWxlbTtcclxuXHJcblx0XHRcdFx0XHRpZiAoIGZpcnN0ID09PSAxICYmIGxhc3QgPT09IDAgKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdHBhcmVudCA9IGVsZW0ucGFyZW50Tm9kZTtcclxuXHJcblx0XHRcdFx0XHRpZiAoIHBhcmVudCAmJiAocGFyZW50WyBleHBhbmRvIF0gIT09IGRvbmVOYW1lIHx8ICFlbGVtLnNpenNldCkgKSB7XHJcblx0XHRcdFx0XHRcdGZvciAoIG5vZGUgPSBwYXJlbnQuZmlyc3RDaGlsZDsgbm9kZTsgbm9kZSA9IG5vZGUubmV4dFNpYmxpbmcgKSB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCBub2RlLm5vZGVUeXBlID09PSAxICkge1xyXG5cdFx0XHRcdFx0XHRcdFx0bm9kZS5zaXpzZXQgPSArK2NvdW50O1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBub2RlID09PSBlbGVtICkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdHBhcmVudFsgZXhwYW5kbyBdID0gZG9uZU5hbWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0ZGlmZiA9IGVsZW0uc2l6c2V0IC0gbGFzdDtcclxuXHJcblx0XHRcdFx0XHRpZiAoIGZpcnN0ID09PSAwICkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZGlmZiA9PT0gMDtcclxuXHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gKCBkaWZmICUgZmlyc3QgPT09IDAgJiYgZGlmZiAvIGZpcnN0ID49IDAgKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdFx0dmFyIG5vZGUgPSBlbGVtO1xyXG5cclxuXHRcdFx0XHRzd2l0Y2ggKCB0eXBlICkge1xyXG5cdFx0XHRcdFx0Y2FzZSBcIm9ubHlcIjpcclxuXHRcdFx0XHRcdGNhc2UgXCJmaXJzdFwiOlxyXG5cdFx0XHRcdFx0XHR3aGlsZSAoIChub2RlID0gbm9kZS5wcmV2aW91c1NpYmxpbmcpICkge1xyXG5cdFx0XHRcdFx0XHRcdGlmICggbm9kZS5ub2RlVHlwZSA9PT0gMSApIHtcclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGlmICggdHlwZSA9PT0gXCJmaXJzdFwiICkge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRub2RlID0gZWxlbTtcclxuXHJcblx0XHRcdFx0XHRcdC8qIGZhbGxzIHRocm91Z2ggKi9cclxuXHRcdFx0XHRcdGNhc2UgXCJsYXN0XCI6XHJcblx0XHRcdFx0XHRcdHdoaWxlICggKG5vZGUgPSBub2RlLm5leHRTaWJsaW5nKSApIHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIG5vZGUubm9kZVR5cGUgPT09IDEgKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblx0XHR9LFxyXG5cclxuXHRcdFwiUFNFVURPXCI6IGZ1bmN0aW9uKCBwc2V1ZG8sIGFyZ3VtZW50LCBjb250ZXh0LCB4bWwgKSB7XHJcblx0XHRcdC8vIHBzZXVkby1jbGFzcyBuYW1lcyBhcmUgY2FzZS1pbnNlbnNpdGl2ZVxyXG5cdFx0XHQvLyBodHRwOi8vd3d3LnczLm9yZy9UUi9zZWxlY3RvcnMvI3BzZXVkby1jbGFzc2VzXHJcblx0XHRcdC8vIFByaW9yaXRpemUgYnkgY2FzZSBzZW5zaXRpdml0eSBpbiBjYXNlIGN1c3RvbSBwc2V1ZG9zIGFyZSBhZGRlZCB3aXRoIHVwcGVyY2FzZSBsZXR0ZXJzXHJcblx0XHRcdHZhciBhcmdzLFxyXG5cdFx0XHRcdGZuID0gRXhwci5wc2V1ZG9zWyBwc2V1ZG8gXSB8fCBFeHByLnBzZXVkb3NbIHBzZXVkby50b0xvd2VyQ2FzZSgpIF07XHJcblxyXG5cdFx0XHRpZiAoICFmbiApIHtcclxuXHRcdFx0XHRTaXp6bGUuZXJyb3IoIFwidW5zdXBwb3J0ZWQgcHNldWRvOiBcIiArIHBzZXVkbyApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUaGUgdXNlciBtYXkgdXNlIGNyZWF0ZVBzZXVkbyB0byBpbmRpY2F0ZSB0aGF0XHJcblx0XHRcdC8vIGFyZ3VtZW50cyBhcmUgbmVlZGVkIHRvIGNyZWF0ZSB0aGUgZmlsdGVyIGZ1bmN0aW9uXHJcblx0XHRcdC8vIGp1c3QgYXMgU2l6emxlIGRvZXNcclxuXHRcdFx0aWYgKCAhZm5bIGV4cGFuZG8gXSApIHtcclxuXHRcdFx0XHRpZiAoIGZuLmxlbmd0aCA+IDEgKSB7XHJcblx0XHRcdFx0XHRhcmdzID0gWyBwc2V1ZG8sIHBzZXVkbywgXCJcIiwgYXJndW1lbnQgXTtcclxuXHRcdFx0XHRcdHJldHVybiBmdW5jdGlvbiggZWxlbSApIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGZuKCBlbGVtLCAwLCBhcmdzICk7XHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4gZm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBmbiggYXJndW1lbnQsIGNvbnRleHQsIHhtbCApO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdHBzZXVkb3M6IHtcclxuXHRcdFwibm90XCI6IG1hcmtGdW5jdGlvbihmdW5jdGlvbiggc2VsZWN0b3IsIGNvbnRleHQsIHhtbCApIHtcclxuXHRcdFx0Ly8gVHJpbSB0aGUgc2VsZWN0b3IgcGFzc2VkIHRvIGNvbXBpbGVcclxuXHRcdFx0Ly8gdG8gYXZvaWQgdHJlYXRpbmcgbGVhZGluZyBhbmQgdHJhaWxpbmdcclxuXHRcdFx0Ly8gc3BhY2VzIGFzIGNvbWJpbmF0b3JzXHJcblx0XHRcdHZhciBtYXRjaGVyID0gY29tcGlsZSggc2VsZWN0b3IucmVwbGFjZSggcnRyaW0sIFwiJDFcIiApLCBjb250ZXh0LCB4bWwgKTtcclxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0XHRcdHJldHVybiAhbWF0Y2hlciggZWxlbSApO1xyXG5cdFx0XHR9O1xyXG5cdFx0fSksXHJcblxyXG5cdFx0XCJlbmFibGVkXCI6IGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0XHRyZXR1cm4gZWxlbS5kaXNhYmxlZCA9PT0gZmFsc2U7XHJcblx0XHR9LFxyXG5cclxuXHRcdFwiZGlzYWJsZWRcIjogZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdHJldHVybiBlbGVtLmRpc2FibGVkID09PSB0cnVlO1xyXG5cdFx0fSxcclxuXHJcblx0XHRcImNoZWNrZWRcIjogZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdC8vIEluIENTUzMsIDpjaGVja2VkIHNob3VsZCByZXR1cm4gYm90aCBjaGVja2VkIGFuZCBzZWxlY3RlZCBlbGVtZW50c1xyXG5cdFx0XHQvLyBodHRwOi8vd3d3LnczLm9yZy9UUi8yMDExL1JFQy1jc3MzLXNlbGVjdG9ycy0yMDExMDkyOS8jY2hlY2tlZFxyXG5cdFx0XHR2YXIgbm9kZU5hbWUgPSBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdHJldHVybiAobm9kZU5hbWUgPT09IFwiaW5wdXRcIiAmJiAhIWVsZW0uY2hlY2tlZCkgfHwgKG5vZGVOYW1lID09PSBcIm9wdGlvblwiICYmICEhZWxlbS5zZWxlY3RlZCk7XHJcblx0XHR9LFxyXG5cclxuXHRcdFwic2VsZWN0ZWRcIjogZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdC8vIEFjY2Vzc2luZyB0aGlzIHByb3BlcnR5IG1ha2VzIHNlbGVjdGVkLWJ5LWRlZmF1bHRcclxuXHRcdFx0Ly8gb3B0aW9ucyBpbiBTYWZhcmkgd29yayBwcm9wZXJseVxyXG5cdFx0XHRpZiAoIGVsZW0ucGFyZW50Tm9kZSApIHtcclxuXHRcdFx0XHRlbGVtLnBhcmVudE5vZGUuc2VsZWN0ZWRJbmRleDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIGVsZW0uc2VsZWN0ZWQgPT09IHRydWU7XHJcblx0XHR9LFxyXG5cclxuXHRcdFwicGFyZW50XCI6IGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0XHRyZXR1cm4gIUV4cHIucHNldWRvc1tcImVtcHR5XCJdKCBlbGVtICk7XHJcblx0XHR9LFxyXG5cclxuXHRcdFwiZW1wdHlcIjogZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdC8vIGh0dHA6Ly93d3cudzMub3JnL1RSL3NlbGVjdG9ycy8jZW1wdHktcHNldWRvXHJcblx0XHRcdC8vIDplbXB0eSBpcyBvbmx5IGFmZmVjdGVkIGJ5IGVsZW1lbnQgbm9kZXMgYW5kIGNvbnRlbnQgbm9kZXMoaW5jbHVkaW5nIHRleHQoMyksIGNkYXRhKDQpKSxcclxuXHRcdFx0Ly8gICBub3QgY29tbWVudCwgcHJvY2Vzc2luZyBpbnN0cnVjdGlvbnMsIG9yIG90aGVyc1xyXG5cdFx0XHQvLyBUaGFua3MgdG8gRGllZ28gUGVyaW5pIGZvciB0aGUgbm9kZU5hbWUgc2hvcnRjdXRcclxuXHRcdFx0Ly8gICBHcmVhdGVyIHRoYW4gXCJAXCIgbWVhbnMgYWxwaGEgY2hhcmFjdGVycyAoc3BlY2lmaWNhbGx5IG5vdCBzdGFydGluZyB3aXRoIFwiI1wiIG9yIFwiP1wiKVxyXG5cdFx0XHR2YXIgbm9kZVR5cGU7XHJcblx0XHRcdGVsZW0gPSBlbGVtLmZpcnN0Q2hpbGQ7XHJcblx0XHRcdHdoaWxlICggZWxlbSApIHtcclxuXHRcdFx0XHRpZiAoIGVsZW0ubm9kZU5hbWUgPiBcIkBcIiB8fCAobm9kZVR5cGUgPSBlbGVtLm5vZGVUeXBlKSA9PT0gMyB8fCBub2RlVHlwZSA9PT0gNCApIHtcclxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZWxlbSA9IGVsZW0ubmV4dFNpYmxpbmc7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9LFxyXG5cclxuXHRcdFwiY29udGFpbnNcIjogbWFya0Z1bmN0aW9uKGZ1bmN0aW9uKCB0ZXh0ICkge1xyXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdFx0cmV0dXJuICggZWxlbS50ZXh0Q29udGVudCB8fCBlbGVtLmlubmVyVGV4dCB8fCBnZXRUZXh0KCBlbGVtICkgKS5pbmRleE9mKCB0ZXh0ICkgPiAtMTtcclxuXHRcdFx0fTtcclxuXHRcdH0pLFxyXG5cclxuXHRcdFwiaGFzXCI6IG1hcmtGdW5jdGlvbihmdW5jdGlvbiggc2VsZWN0b3IgKSB7XHJcblx0XHRcdHJldHVybiBmdW5jdGlvbiggZWxlbSApIHtcclxuXHRcdFx0XHRyZXR1cm4gU2l6emxlKCBzZWxlY3RvciwgZWxlbSApLmxlbmd0aCA+IDA7XHJcblx0XHRcdH07XHJcblx0XHR9KSxcclxuXHJcblx0XHRcImhlYWRlclwiOiBmdW5jdGlvbiggZWxlbSApIHtcclxuXHRcdFx0cmV0dXJuIHJoZWFkZXIudGVzdCggZWxlbS5ub2RlTmFtZSApO1xyXG5cdFx0fSxcclxuXHJcblx0XHRcInRleHRcIjogZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdHZhciB0eXBlLCBhdHRyO1xyXG5cdFx0XHQvLyBJRTYgYW5kIDcgd2lsbCBtYXAgZWxlbS50eXBlIHRvICd0ZXh0JyBmb3IgbmV3IEhUTUw1IHR5cGVzIChzZWFyY2gsIGV0YylcclxuXHRcdFx0Ly8gdXNlIGdldEF0dHJpYnV0ZSBpbnN0ZWFkIHRvIHRlc3QgdGhpcyBjYXNlXHJcblx0XHRcdHJldHVybiBlbGVtLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwiaW5wdXRcIiAmJlxyXG5cdFx0XHRcdCh0eXBlID0gZWxlbS50eXBlKSA9PT0gXCJ0ZXh0XCIgJiZcclxuXHRcdFx0XHQoIChhdHRyID0gZWxlbS5nZXRBdHRyaWJ1dGUoXCJ0eXBlXCIpKSA9PSBudWxsIHx8IGF0dHIudG9Mb3dlckNhc2UoKSA9PT0gdHlwZSApO1xyXG5cdFx0fSxcclxuXHJcblx0XHQvLyBJbnB1dCB0eXBlc1xyXG5cdFx0XCJyYWRpb1wiOiBjcmVhdGVJbnB1dFBzZXVkbyhcInJhZGlvXCIpLFxyXG5cdFx0XCJjaGVja2JveFwiOiBjcmVhdGVJbnB1dFBzZXVkbyhcImNoZWNrYm94XCIpLFxyXG5cdFx0XCJmaWxlXCI6IGNyZWF0ZUlucHV0UHNldWRvKFwiZmlsZVwiKSxcclxuXHRcdFwicGFzc3dvcmRcIjogY3JlYXRlSW5wdXRQc2V1ZG8oXCJwYXNzd29yZFwiKSxcclxuXHRcdFwiaW1hZ2VcIjogY3JlYXRlSW5wdXRQc2V1ZG8oXCJpbWFnZVwiKSxcclxuXHJcblx0XHRcInN1Ym1pdFwiOiBjcmVhdGVCdXR0b25Qc2V1ZG8oXCJzdWJtaXRcIiksXHJcblx0XHRcInJlc2V0XCI6IGNyZWF0ZUJ1dHRvblBzZXVkbyhcInJlc2V0XCIpLFxyXG5cclxuXHRcdFwiYnV0dG9uXCI6IGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0XHR2YXIgbmFtZSA9IGVsZW0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0cmV0dXJuIG5hbWUgPT09IFwiaW5wdXRcIiAmJiBlbGVtLnR5cGUgPT09IFwiYnV0dG9uXCIgfHwgbmFtZSA9PT0gXCJidXR0b25cIjtcclxuXHRcdH0sXHJcblxyXG5cdFx0XCJpbnB1dFwiOiBmdW5jdGlvbiggZWxlbSApIHtcclxuXHRcdFx0cmV0dXJuIHJpbnB1dHMudGVzdCggZWxlbS5ub2RlTmFtZSApO1xyXG5cdFx0fSxcclxuXHJcblx0XHRcImZvY3VzXCI6IGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0XHR2YXIgZG9jID0gZWxlbS5vd25lckRvY3VtZW50O1xyXG5cdFx0XHRyZXR1cm4gZWxlbSA9PT0gZG9jLmFjdGl2ZUVsZW1lbnQgJiYgKCFkb2MuaGFzRm9jdXMgfHwgZG9jLmhhc0ZvY3VzKCkpICYmICEhKGVsZW0udHlwZSB8fCBlbGVtLmhyZWYpO1xyXG5cdFx0fSxcclxuXHJcblx0XHRcImFjdGl2ZVwiOiBmdW5jdGlvbiggZWxlbSApIHtcclxuXHRcdFx0cmV0dXJuIGVsZW0gPT09IGVsZW0ub3duZXJEb2N1bWVudC5hY3RpdmVFbGVtZW50O1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdHNldEZpbHRlcnM6IHtcclxuXHRcdFwiZmlyc3RcIjogZnVuY3Rpb24oIGVsZW1lbnRzLCBhcmd1bWVudCwgbm90ICkge1xyXG5cdFx0XHRyZXR1cm4gbm90ID8gZWxlbWVudHMuc2xpY2UoIDEgKSA6IFsgZWxlbWVudHNbMF0gXTtcclxuXHRcdH0sXHJcblxyXG5cdFx0XCJsYXN0XCI6IGZ1bmN0aW9uKCBlbGVtZW50cywgYXJndW1lbnQsIG5vdCApIHtcclxuXHRcdFx0dmFyIGVsZW0gPSBlbGVtZW50cy5wb3AoKTtcclxuXHRcdFx0cmV0dXJuIG5vdCA/IGVsZW1lbnRzIDogWyBlbGVtIF07XHJcblx0XHR9LFxyXG5cclxuXHRcdFwiZXZlblwiOiBmdW5jdGlvbiggZWxlbWVudHMsIGFyZ3VtZW50LCBub3QgKSB7XHJcblx0XHRcdHZhciByZXN1bHRzID0gW10sXHJcblx0XHRcdFx0aSA9IG5vdCA/IDEgOiAwLFxyXG5cdFx0XHRcdGxlbiA9IGVsZW1lbnRzLmxlbmd0aDtcclxuXHRcdFx0Zm9yICggOyBpIDwgbGVuOyBpID0gaSArIDIgKSB7XHJcblx0XHRcdFx0cmVzdWx0cy5wdXNoKCBlbGVtZW50c1tpXSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiByZXN1bHRzO1xyXG5cdFx0fSxcclxuXHJcblx0XHRcIm9kZFwiOiBmdW5jdGlvbiggZWxlbWVudHMsIGFyZ3VtZW50LCBub3QgKSB7XHJcblx0XHRcdHZhciByZXN1bHRzID0gW10sXHJcblx0XHRcdFx0aSA9IG5vdCA/IDAgOiAxLFxyXG5cdFx0XHRcdGxlbiA9IGVsZW1lbnRzLmxlbmd0aDtcclxuXHRcdFx0Zm9yICggOyBpIDwgbGVuOyBpID0gaSArIDIgKSB7XHJcblx0XHRcdFx0cmVzdWx0cy5wdXNoKCBlbGVtZW50c1tpXSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiByZXN1bHRzO1xyXG5cdFx0fSxcclxuXHJcblx0XHRcImx0XCI6IGZ1bmN0aW9uKCBlbGVtZW50cywgYXJndW1lbnQsIG5vdCApIHtcclxuXHRcdFx0cmV0dXJuIG5vdCA/IGVsZW1lbnRzLnNsaWNlKCArYXJndW1lbnQgKSA6IGVsZW1lbnRzLnNsaWNlKCAwLCArYXJndW1lbnQgKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0XCJndFwiOiBmdW5jdGlvbiggZWxlbWVudHMsIGFyZ3VtZW50LCBub3QgKSB7XHJcblx0XHRcdHJldHVybiBub3QgPyBlbGVtZW50cy5zbGljZSggMCwgK2FyZ3VtZW50ICsgMSApIDogZWxlbWVudHMuc2xpY2UoICthcmd1bWVudCArIDEgKTtcclxuXHRcdH0sXHJcblxyXG5cdFx0XCJlcVwiOiBmdW5jdGlvbiggZWxlbWVudHMsIGFyZ3VtZW50LCBub3QgKSB7XHJcblx0XHRcdHZhciBlbGVtID0gZWxlbWVudHMuc3BsaWNlKCArYXJndW1lbnQsIDEgKTtcclxuXHRcdFx0cmV0dXJuIG5vdCA/IGVsZW1lbnRzIDogZWxlbTtcclxuXHRcdH1cclxuXHR9XHJcbn07XHJcblxyXG5mdW5jdGlvbiBzaWJsaW5nQ2hlY2soIGEsIGIsIHJldCApIHtcclxuXHRpZiAoIGEgPT09IGIgKSB7XHJcblx0XHRyZXR1cm4gcmV0O1xyXG5cdH1cclxuXHJcblx0dmFyIGN1ciA9IGEubmV4dFNpYmxpbmc7XHJcblxyXG5cdHdoaWxlICggY3VyICkge1xyXG5cdFx0aWYgKCBjdXIgPT09IGIgKSB7XHJcblx0XHRcdHJldHVybiAtMTtcclxuXHRcdH1cclxuXHJcblx0XHRjdXIgPSBjdXIubmV4dFNpYmxpbmc7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gMTtcclxufVxyXG5cclxuc29ydE9yZGVyID0gZG9jRWxlbS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiA/XHJcblx0ZnVuY3Rpb24oIGEsIGIgKSB7XHJcblx0XHRpZiAoIGEgPT09IGIgKSB7XHJcblx0XHRcdGhhc0R1cGxpY2F0ZSA9IHRydWU7XHJcblx0XHRcdHJldHVybiAwO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiAoICFhLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uIHx8ICFiLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uID9cclxuXHRcdFx0YS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiA6XHJcblx0XHRcdGEuY29tcGFyZURvY3VtZW50UG9zaXRpb24oYikgJiA0XHJcblx0XHQpID8gLTEgOiAxO1xyXG5cdH0gOlxyXG5cdGZ1bmN0aW9uKCBhLCBiICkge1xyXG5cdFx0Ly8gVGhlIG5vZGVzIGFyZSBpZGVudGljYWwsIHdlIGNhbiBleGl0IGVhcmx5XHJcblx0XHRpZiAoIGEgPT09IGIgKSB7XHJcblx0XHRcdGhhc0R1cGxpY2F0ZSA9IHRydWU7XHJcblx0XHRcdHJldHVybiAwO1xyXG5cclxuXHRcdC8vIEZhbGxiYWNrIHRvIHVzaW5nIHNvdXJjZUluZGV4IChpbiBJRSkgaWYgaXQncyBhdmFpbGFibGUgb24gYm90aCBub2Rlc1xyXG5cdFx0fSBlbHNlIGlmICggYS5zb3VyY2VJbmRleCAmJiBiLnNvdXJjZUluZGV4ICkge1xyXG5cdFx0XHRyZXR1cm4gYS5zb3VyY2VJbmRleCAtIGIuc291cmNlSW5kZXg7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGFsLCBibCxcclxuXHRcdFx0YXAgPSBbXSxcclxuXHRcdFx0YnAgPSBbXSxcclxuXHRcdFx0YXVwID0gYS5wYXJlbnROb2RlLFxyXG5cdFx0XHRidXAgPSBiLnBhcmVudE5vZGUsXHJcblx0XHRcdGN1ciA9IGF1cDtcclxuXHJcblx0XHQvLyBJZiB0aGUgbm9kZXMgYXJlIHNpYmxpbmdzIChvciBpZGVudGljYWwpIHdlIGNhbiBkbyBhIHF1aWNrIGNoZWNrXHJcblx0XHRpZiAoIGF1cCA9PT0gYnVwICkge1xyXG5cdFx0XHRyZXR1cm4gc2libGluZ0NoZWNrKCBhLCBiICk7XHJcblxyXG5cdFx0Ly8gSWYgbm8gcGFyZW50cyB3ZXJlIGZvdW5kIHRoZW4gdGhlIG5vZGVzIGFyZSBkaXNjb25uZWN0ZWRcclxuXHRcdH0gZWxzZSBpZiAoICFhdXAgKSB7XHJcblx0XHRcdHJldHVybiAtMTtcclxuXHJcblx0XHR9IGVsc2UgaWYgKCAhYnVwICkge1xyXG5cdFx0XHRyZXR1cm4gMTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBPdGhlcndpc2UgdGhleSdyZSBzb21ld2hlcmUgZWxzZSBpbiB0aGUgdHJlZSBzbyB3ZSBuZWVkXHJcblx0XHQvLyB0byBidWlsZCB1cCBhIGZ1bGwgbGlzdCBvZiB0aGUgcGFyZW50Tm9kZXMgZm9yIGNvbXBhcmlzb25cclxuXHRcdHdoaWxlICggY3VyICkge1xyXG5cdFx0XHRhcC51bnNoaWZ0KCBjdXIgKTtcclxuXHRcdFx0Y3VyID0gY3VyLnBhcmVudE5vZGU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y3VyID0gYnVwO1xyXG5cclxuXHRcdHdoaWxlICggY3VyICkge1xyXG5cdFx0XHRicC51bnNoaWZ0KCBjdXIgKTtcclxuXHRcdFx0Y3VyID0gY3VyLnBhcmVudE5vZGU7XHJcblx0XHR9XHJcblxyXG5cdFx0YWwgPSBhcC5sZW5ndGg7XHJcblx0XHRibCA9IGJwLmxlbmd0aDtcclxuXHJcblx0XHQvLyBTdGFydCB3YWxraW5nIGRvd24gdGhlIHRyZWUgbG9va2luZyBmb3IgYSBkaXNjcmVwYW5jeVxyXG5cdFx0Zm9yICggdmFyIGkgPSAwOyBpIDwgYWwgJiYgaSA8IGJsOyBpKysgKSB7XHJcblx0XHRcdGlmICggYXBbaV0gIT09IGJwW2ldICkge1xyXG5cdFx0XHRcdHJldHVybiBzaWJsaW5nQ2hlY2soIGFwW2ldLCBicFtpXSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gV2UgZW5kZWQgc29tZXBsYWNlIHVwIHRoZSB0cmVlIHNvIGRvIGEgc2libGluZyBjaGVja1xyXG5cdFx0cmV0dXJuIGkgPT09IGFsID9cclxuXHRcdFx0c2libGluZ0NoZWNrKCBhLCBicFtpXSwgLTEgKSA6XHJcblx0XHRcdHNpYmxpbmdDaGVjayggYXBbaV0sIGIsIDEgKTtcclxuXHR9O1xyXG5cclxuLy8gQWx3YXlzIGFzc3VtZSB0aGUgcHJlc2VuY2Ugb2YgZHVwbGljYXRlcyBpZiBzb3J0IGRvZXNuJ3RcclxuLy8gcGFzcyB0aGVtIHRvIG91ciBjb21wYXJpc29uIGZ1bmN0aW9uIChhcyBpbiBHb29nbGUgQ2hyb21lKS5cclxuWzAsIDBdLnNvcnQoIHNvcnRPcmRlciApO1xyXG5iYXNlSGFzRHVwbGljYXRlID0gIWhhc0R1cGxpY2F0ZTtcclxuXHJcbi8vIERvY3VtZW50IHNvcnRpbmcgYW5kIHJlbW92aW5nIGR1cGxpY2F0ZXNcclxuU2l6emxlLnVuaXF1ZVNvcnQgPSBmdW5jdGlvbiggcmVzdWx0cyApIHtcclxuXHR2YXIgZWxlbSxcclxuXHRcdGkgPSAxO1xyXG5cclxuXHRoYXNEdXBsaWNhdGUgPSBiYXNlSGFzRHVwbGljYXRlO1xyXG5cdHJlc3VsdHMuc29ydCggc29ydE9yZGVyICk7XHJcblxyXG5cdGlmICggaGFzRHVwbGljYXRlICkge1xyXG5cdFx0Zm9yICggOyAoZWxlbSA9IHJlc3VsdHNbaV0pOyBpKysgKSB7XHJcblx0XHRcdGlmICggZWxlbSA9PT0gcmVzdWx0c1sgaSAtIDEgXSApIHtcclxuXHRcdFx0XHRyZXN1bHRzLnNwbGljZSggaS0tLCAxICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiByZXN1bHRzO1xyXG59O1xyXG5cclxuU2l6emxlLmVycm9yID0gZnVuY3Rpb24oIG1zZyApIHtcclxuXHR0aHJvdyBuZXcgRXJyb3IoIFwiU3ludGF4IGVycm9yLCB1bnJlY29nbml6ZWQgZXhwcmVzc2lvbjogXCIgKyBtc2cgKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIHRva2VuaXplKCBzZWxlY3RvciwgY29udGV4dCwgeG1sLCBwYXJzZU9ubHkgKSB7XHJcblx0dmFyIG1hdGNoZWQsIG1hdGNoLCB0b2tlbnMsIHR5cGUsXHJcblx0XHRzb0ZhciwgZ3JvdXBzLCBncm91cCwgaSxcclxuXHRcdHByZUZpbHRlcnMsIGZpbHRlcnMsXHJcblx0XHRjaGVja0NvbnRleHQgPSAheG1sICYmIGNvbnRleHQgIT09IGRvY3VtZW50LFxyXG5cdFx0Ly8gVG9rZW4gY2FjaGUgc2hvdWxkIG1haW50YWluIHNwYWNlc1xyXG5cdFx0a2V5ID0gKCBjaGVja0NvbnRleHQgPyBcIjxzPlwiIDogXCJcIiApICsgc2VsZWN0b3IucmVwbGFjZSggcnRyaW0sIFwiJDE8cz5cIiApLFxyXG5cdFx0Y2FjaGVkID0gdG9rZW5DYWNoZVsgZXhwYW5kbyBdWyBrZXkgXTtcclxuXHJcblx0aWYgKCBjYWNoZWQgKSB7XHJcblx0XHRyZXR1cm4gcGFyc2VPbmx5ID8gMCA6IHNsaWNlLmNhbGwoIGNhY2hlZCwgMCApO1xyXG5cdH1cclxuXHJcblx0c29GYXIgPSBzZWxlY3RvcjtcclxuXHRncm91cHMgPSBbXTtcclxuXHRpID0gMDtcclxuXHRwcmVGaWx0ZXJzID0gRXhwci5wcmVGaWx0ZXI7XHJcblx0ZmlsdGVycyA9IEV4cHIuZmlsdGVyO1xyXG5cclxuXHR3aGlsZSAoIHNvRmFyICkge1xyXG5cclxuXHRcdC8vIENvbW1hIGFuZCBmaXJzdCBydW5cclxuXHRcdGlmICggIW1hdGNoZWQgfHwgKG1hdGNoID0gcmNvbW1hLmV4ZWMoIHNvRmFyICkpICkge1xyXG5cdFx0XHRpZiAoIG1hdGNoICkge1xyXG5cdFx0XHRcdHNvRmFyID0gc29GYXIuc2xpY2UoIG1hdGNoWzBdLmxlbmd0aCApO1xyXG5cdFx0XHRcdHRva2Vucy5zZWxlY3RvciA9IGdyb3VwO1xyXG5cdFx0XHR9XHJcblx0XHRcdGdyb3Vwcy5wdXNoKCB0b2tlbnMgPSBbXSApO1xyXG5cdFx0XHRncm91cCA9IFwiXCI7XHJcblxyXG5cdFx0XHQvLyBOZWVkIHRvIG1ha2Ugc3VyZSB3ZSdyZSB3aXRoaW4gYSBuYXJyb3dlciBjb250ZXh0IGlmIG5lY2Vzc2FyeVxyXG5cdFx0XHQvLyBBZGRpbmcgYSBkZXNjZW5kYW50IGNvbWJpbmF0b3Igd2lsbCBnZW5lcmF0ZSB3aGF0IGlzIG5lZWRlZFxyXG5cdFx0XHRpZiAoIGNoZWNrQ29udGV4dCApIHtcclxuXHRcdFx0XHRzb0ZhciA9IFwiIFwiICsgc29GYXI7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRtYXRjaGVkID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gQ29tYmluYXRvcnNcclxuXHRcdGlmICggKG1hdGNoID0gcmNvbWJpbmF0b3JzLmV4ZWMoIHNvRmFyICkpICkge1xyXG5cdFx0XHRncm91cCArPSBtYXRjaFswXTtcclxuXHRcdFx0c29GYXIgPSBzb0Zhci5zbGljZSggbWF0Y2hbMF0ubGVuZ3RoICk7XHJcblxyXG5cdFx0XHQvLyBDYXN0IGRlc2NlbmRhbnQgY29tYmluYXRvcnMgdG8gc3BhY2VcclxuXHRcdFx0bWF0Y2hlZCA9IHRva2Vucy5wdXNoKHtcclxuXHRcdFx0XHRwYXJ0OiBtYXRjaC5wb3AoKS5yZXBsYWNlKCBydHJpbSwgXCIgXCIgKSxcclxuXHRcdFx0XHRzdHJpbmc6IG1hdGNoWzBdLFxyXG5cdFx0XHRcdGNhcHR1cmVzOiBtYXRjaFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGaWx0ZXJzXHJcblx0XHRmb3IgKCB0eXBlIGluIGZpbHRlcnMgKSB7XHJcblx0XHRcdGlmICggKG1hdGNoID0gbWF0Y2hFeHByWyB0eXBlIF0uZXhlYyggc29GYXIgKSkgJiYgKCFwcmVGaWx0ZXJzWyB0eXBlIF0gfHxcclxuXHRcdFx0XHQoIG1hdGNoID0gcHJlRmlsdGVyc1sgdHlwZSBdKG1hdGNoLCBjb250ZXh0LCB4bWwpICkpICkge1xyXG5cclxuXHRcdFx0XHRncm91cCArPSBtYXRjaFswXTtcclxuXHRcdFx0XHRzb0ZhciA9IHNvRmFyLnNsaWNlKCBtYXRjaFswXS5sZW5ndGggKTtcclxuXHRcdFx0XHRtYXRjaGVkID0gdG9rZW5zLnB1c2goe1xyXG5cdFx0XHRcdFx0cGFydDogdHlwZSxcclxuXHRcdFx0XHRcdHN0cmluZzogbWF0Y2guc2hpZnQoKSxcclxuXHRcdFx0XHRcdGNhcHR1cmVzOiBtYXRjaFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCAhbWF0Y2hlZCApIHtcclxuXHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBBdHRhY2ggdGhlIGZ1bGwgZ3JvdXAgYXMgYSBzZWxlY3RvclxyXG5cdGlmICggZ3JvdXAgKSB7XHJcblx0XHR0b2tlbnMuc2VsZWN0b3IgPSBncm91cDtcclxuXHR9XHJcblxyXG5cdC8vIFJldHVybiB0aGUgbGVuZ3RoIG9mIHRoZSBpbnZhbGlkIGV4Y2Vzc1xyXG5cdC8vIGlmIHdlJ3JlIGp1c3QgcGFyc2luZ1xyXG5cdC8vIE90aGVyd2lzZSwgdGhyb3cgYW4gZXJyb3Igb3IgcmV0dXJuIHRva2Vuc1xyXG5cdHJldHVybiBwYXJzZU9ubHkgP1xyXG5cdFx0c29GYXIubGVuZ3RoIDpcclxuXHRcdHNvRmFyID9cclxuXHRcdFx0U2l6emxlLmVycm9yKCBzZWxlY3RvciApIDpcclxuXHRcdFx0Ly8gQ2FjaGUgdGhlIHRva2Vuc1xyXG5cdFx0XHRzbGljZS5jYWxsKCB0b2tlbkNhY2hlKGtleSwgZ3JvdXBzKSwgMCApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRDb21iaW5hdG9yKCBtYXRjaGVyLCBjb21iaW5hdG9yLCBjb250ZXh0LCB4bWwgKSB7XHJcblx0dmFyIGRpciA9IGNvbWJpbmF0b3IuZGlyLFxyXG5cdFx0ZG9uZU5hbWUgPSBkb25lKys7XHJcblxyXG5cdGlmICggIW1hdGNoZXIgKSB7XHJcblx0XHQvLyBJZiB0aGVyZSBpcyBubyBtYXRjaGVyIHRvIGNoZWNrLCBjaGVjayBhZ2FpbnN0IHRoZSBjb250ZXh0XHJcblx0XHRtYXRjaGVyID0gZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdHJldHVybiBlbGVtID09PSBjb250ZXh0O1xyXG5cdFx0fTtcclxuXHR9XHJcblx0cmV0dXJuIGNvbWJpbmF0b3IuZmlyc3QgP1xyXG5cdFx0ZnVuY3Rpb24oIGVsZW0gKSB7XHJcblx0XHRcdHdoaWxlICggKGVsZW0gPSBlbGVtWyBkaXIgXSkgKSB7XHJcblx0XHRcdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAxICkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG1hdGNoZXIoIGVsZW0gKSAmJiBlbGVtO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSA6XHJcblx0XHR4bWwgP1xyXG5cdFx0XHRmdW5jdGlvbiggZWxlbSApIHtcclxuXHRcdFx0XHR3aGlsZSAoIChlbGVtID0gZWxlbVsgZGlyIF0pICkge1xyXG5cdFx0XHRcdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAxICkge1xyXG5cdFx0XHRcdFx0XHRpZiAoIG1hdGNoZXIoIGVsZW0gKSApIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gZWxlbTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSA6XHJcblx0XHRcdGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0XHRcdHZhciBjYWNoZSxcclxuXHRcdFx0XHRcdGRpcmtleSA9IGRvbmVOYW1lICsgXCIuXCIgKyBkaXJydW5zLFxyXG5cdFx0XHRcdFx0Y2FjaGVka2V5ID0gZGlya2V5ICsgXCIuXCIgKyBjYWNoZWRydW5zO1xyXG5cdFx0XHRcdHdoaWxlICggKGVsZW0gPSBlbGVtWyBkaXIgXSkgKSB7XHJcblx0XHRcdFx0XHRpZiAoIGVsZW0ubm9kZVR5cGUgPT09IDEgKSB7XHJcblx0XHRcdFx0XHRcdGlmICggKGNhY2hlID0gZWxlbVsgZXhwYW5kbyBdKSA9PT0gY2FjaGVka2V5ICkge1xyXG5cdFx0XHRcdFx0XHRcdHJldHVybiBlbGVtLnNpenNldDtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggdHlwZW9mIGNhY2hlID09PSBcInN0cmluZ1wiICYmIGNhY2hlLmluZGV4T2YoZGlya2V5KSA9PT0gMCApIHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIGVsZW0uc2l6c2V0ICkge1xyXG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGVsZW07XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdGVsZW1bIGV4cGFuZG8gXSA9IGNhY2hlZGtleTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIG1hdGNoZXIoIGVsZW0gKSApIHtcclxuXHRcdFx0XHRcdFx0XHRcdGVsZW0uc2l6c2V0ID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBlbGVtO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRlbGVtLnNpenNldCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRNYXRjaGVyKCBoaWdoZXIsIGRlZXBlciApIHtcclxuXHRyZXR1cm4gaGlnaGVyID9cclxuXHRcdGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0XHR2YXIgcmVzdWx0ID0gZGVlcGVyKCBlbGVtICk7XHJcblx0XHRcdHJldHVybiByZXN1bHQgJiYgaGlnaGVyKCByZXN1bHQgPT09IHRydWUgPyBlbGVtIDogcmVzdWx0ICk7XHJcblx0XHR9IDpcclxuXHRcdGRlZXBlcjtcclxufVxyXG5cclxuLy8gW1wiVEFHXCIsIFwiPlwiLCBcIklEXCIsIFwiIFwiLCBcIkNMQVNTXCJdXHJcbmZ1bmN0aW9uIG1hdGNoZXJGcm9tVG9rZW5zKCB0b2tlbnMsIGNvbnRleHQsIHhtbCApIHtcclxuXHR2YXIgdG9rZW4sIG1hdGNoZXIsXHJcblx0XHRpID0gMDtcclxuXHJcblx0Zm9yICggOyAodG9rZW4gPSB0b2tlbnNbaV0pOyBpKysgKSB7XHJcblx0XHRpZiAoIEV4cHIucmVsYXRpdmVbIHRva2VuLnBhcnQgXSApIHtcclxuXHRcdFx0bWF0Y2hlciA9IGFkZENvbWJpbmF0b3IoIG1hdGNoZXIsIEV4cHIucmVsYXRpdmVbIHRva2VuLnBhcnQgXSwgY29udGV4dCwgeG1sICk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRtYXRjaGVyID0gYWRkTWF0Y2hlciggbWF0Y2hlciwgRXhwci5maWx0ZXJbIHRva2VuLnBhcnQgXS5hcHBseShudWxsLCB0b2tlbi5jYXB0dXJlcy5jb25jYXQoIGNvbnRleHQsIHhtbCApKSApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG1hdGNoZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1hdGNoZXJGcm9tR3JvdXBNYXRjaGVycyggbWF0Y2hlcnMgKSB7XHJcblx0cmV0dXJuIGZ1bmN0aW9uKCBlbGVtICkge1xyXG5cdFx0dmFyIG1hdGNoZXIsXHJcblx0XHRcdGogPSAwO1xyXG5cdFx0Zm9yICggOyAobWF0Y2hlciA9IG1hdGNoZXJzW2pdKTsgaisrICkge1xyXG5cdFx0XHRpZiAoIG1hdGNoZXIoZWxlbSkgKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9O1xyXG59XHJcblxyXG5jb21waWxlID0gU2l6emxlLmNvbXBpbGUgPSBmdW5jdGlvbiggc2VsZWN0b3IsIGNvbnRleHQsIHhtbCApIHtcclxuXHR2YXIgZ3JvdXAsIGksIGxlbixcclxuXHRcdGNhY2hlZCA9IGNvbXBpbGVyQ2FjaGVbIGV4cGFuZG8gXVsgc2VsZWN0b3IgXTtcclxuXHJcblx0Ly8gUmV0dXJuIGEgY2FjaGVkIGdyb3VwIGZ1bmN0aW9uIGlmIGFscmVhZHkgZ2VuZXJhdGVkIChjb250ZXh0IGRlcGVuZGVudClcclxuXHRpZiAoIGNhY2hlZCAmJiBjYWNoZWQuY29udGV4dCA9PT0gY29udGV4dCApIHtcclxuXHRcdHJldHVybiBjYWNoZWQ7XHJcblx0fVxyXG5cclxuXHQvLyBHZW5lcmF0ZSBhIGZ1bmN0aW9uIG9mIHJlY3Vyc2l2ZSBmdW5jdGlvbnMgdGhhdCBjYW4gYmUgdXNlZCB0byBjaGVjayBlYWNoIGVsZW1lbnRcclxuXHRncm91cCA9IHRva2VuaXplKCBzZWxlY3RvciwgY29udGV4dCwgeG1sICk7XHJcblx0Zm9yICggaSA9IDAsIGxlbiA9IGdyb3VwLmxlbmd0aDsgaSA8IGxlbjsgaSsrICkge1xyXG5cdFx0Z3JvdXBbaV0gPSBtYXRjaGVyRnJvbVRva2Vucyhncm91cFtpXSwgY29udGV4dCwgeG1sKTtcclxuXHR9XHJcblxyXG5cdC8vIENhY2hlIHRoZSBjb21waWxlZCBmdW5jdGlvblxyXG5cdGNhY2hlZCA9IGNvbXBpbGVyQ2FjaGUoIHNlbGVjdG9yLCBtYXRjaGVyRnJvbUdyb3VwTWF0Y2hlcnMoZ3JvdXApICk7XHJcblx0Y2FjaGVkLmNvbnRleHQgPSBjb250ZXh0O1xyXG5cdGNhY2hlZC5ydW5zID0gY2FjaGVkLmRpcnJ1bnMgPSAwO1xyXG5cdHJldHVybiBjYWNoZWQ7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBtdWx0aXBsZUNvbnRleHRzKCBzZWxlY3RvciwgY29udGV4dHMsIHJlc3VsdHMsIHNlZWQgKSB7XHJcblx0dmFyIGkgPSAwLFxyXG5cdFx0bGVuID0gY29udGV4dHMubGVuZ3RoO1xyXG5cdGZvciAoIDsgaSA8IGxlbjsgaSsrICkge1xyXG5cdFx0U2l6emxlKCBzZWxlY3RvciwgY29udGV4dHNbaV0sIHJlc3VsdHMsIHNlZWQgKTtcclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZVBPU0dyb3VwKCBzZWxlY3RvciwgcG9zZmlsdGVyLCBhcmd1bWVudCwgY29udGV4dHMsIHNlZWQsIG5vdCApIHtcclxuXHR2YXIgcmVzdWx0cyxcclxuXHRcdGZuID0gRXhwci5zZXRGaWx0ZXJzWyBwb3NmaWx0ZXIudG9Mb3dlckNhc2UoKSBdO1xyXG5cclxuXHRpZiAoICFmbiApIHtcclxuXHRcdFNpenpsZS5lcnJvciggcG9zZmlsdGVyICk7XHJcblx0fVxyXG5cclxuXHRpZiAoIHNlbGVjdG9yIHx8ICEocmVzdWx0cyA9IHNlZWQpICkge1xyXG5cdFx0bXVsdGlwbGVDb250ZXh0cyggc2VsZWN0b3IgfHwgXCIqXCIsIGNvbnRleHRzLCAocmVzdWx0cyA9IFtdKSwgc2VlZCApO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHJlc3VsdHMubGVuZ3RoID4gMCA/IGZuKCByZXN1bHRzLCBhcmd1bWVudCwgbm90ICkgOiBbXTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlUE9TKCBncm91cHMsIGNvbnRleHQsIHJlc3VsdHMsIHNlZWQgKSB7XHJcblx0dmFyIGdyb3VwLCBwYXJ0LCBqLCBncm91cExlbiwgdG9rZW4sIHNlbGVjdG9yLFxyXG5cdFx0YW5jaG9yLCBlbGVtZW50cywgbWF0Y2gsIG1hdGNoZWQsXHJcblx0XHRsYXN0SW5kZXgsIGN1cnJlbnRDb250ZXh0cywgbm90LFxyXG5cdFx0aSA9IDAsXHJcblx0XHRsZW4gPSBncm91cHMubGVuZ3RoLFxyXG5cdFx0cnBvcyA9IG1hdGNoRXhwcltcIlBPU1wiXSxcclxuXHRcdC8vIFRoaXMgaXMgZ2VuZXJhdGVkIGhlcmUgaW4gY2FzZSBtYXRjaEV4cHJbXCJQT1NcIl0gaXMgZXh0ZW5kZWRcclxuXHRcdHJwb3Nncm91cHMgPSBuZXcgUmVnRXhwKCBcIl5cIiArIHJwb3Muc291cmNlICsgXCIoPyFcIiArIHdoaXRlc3BhY2UgKyBcIilcIiwgXCJpXCIgKSxcclxuXHRcdC8vIFRoaXMgaXMgZm9yIG1ha2luZyBzdXJlIG5vbi1wYXJ0aWNpcGF0aW5nXHJcblx0XHQvLyBtYXRjaGluZyBncm91cHMgYXJlIHJlcHJlc2VudGVkIGNyb3NzLWJyb3dzZXIgKElFNi04KVxyXG5cdFx0c2V0VW5kZWZpbmVkID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdHZhciBpID0gMSxcclxuXHRcdFx0XHRsZW4gPSBhcmd1bWVudHMubGVuZ3RoIC0gMjtcclxuXHRcdFx0Zm9yICggOyBpIDwgbGVuOyBpKysgKSB7XHJcblx0XHRcdFx0aWYgKCBhcmd1bWVudHNbaV0gPT09IHVuZGVmaW5lZCApIHtcclxuXHRcdFx0XHRcdG1hdGNoW2ldID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fTtcclxuXHJcblx0Zm9yICggOyBpIDwgbGVuOyBpKysgKSB7XHJcblx0XHRncm91cCA9IGdyb3Vwc1tpXTtcclxuXHRcdHBhcnQgPSBcIlwiO1xyXG5cdFx0ZWxlbWVudHMgPSBzZWVkO1xyXG5cdFx0Zm9yICggaiA9IDAsIGdyb3VwTGVuID0gZ3JvdXAubGVuZ3RoOyBqIDwgZ3JvdXBMZW47IGorKyApIHtcclxuXHRcdFx0dG9rZW4gPSBncm91cFtqXTtcclxuXHRcdFx0c2VsZWN0b3IgPSB0b2tlbi5zdHJpbmc7XHJcblx0XHRcdGlmICggdG9rZW4ucGFydCA9PT0gXCJQU0VVRE9cIiApIHtcclxuXHRcdFx0XHQvLyBSZXNldCByZWdleCBpbmRleCB0byAwXHJcblx0XHRcdFx0cnBvcy5leGVjKFwiXCIpO1xyXG5cdFx0XHRcdGFuY2hvciA9IDA7XHJcblx0XHRcdFx0d2hpbGUgKCAobWF0Y2ggPSBycG9zLmV4ZWMoIHNlbGVjdG9yICkpICkge1xyXG5cdFx0XHRcdFx0bWF0Y2hlZCA9IHRydWU7XHJcblx0XHRcdFx0XHRsYXN0SW5kZXggPSBycG9zLmxhc3RJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xyXG5cdFx0XHRcdFx0aWYgKCBsYXN0SW5kZXggPiBhbmNob3IgKSB7XHJcblx0XHRcdFx0XHRcdHBhcnQgKz0gc2VsZWN0b3Iuc2xpY2UoIGFuY2hvciwgbWF0Y2guaW5kZXggKTtcclxuXHRcdFx0XHRcdFx0YW5jaG9yID0gbGFzdEluZGV4O1xyXG5cdFx0XHRcdFx0XHRjdXJyZW50Q29udGV4dHMgPSBbIGNvbnRleHQgXTtcclxuXHJcblx0XHRcdFx0XHRcdGlmICggcmNvbWJpbmF0b3JzLnRlc3QocGFydCkgKSB7XHJcblx0XHRcdFx0XHRcdFx0aWYgKCBlbGVtZW50cyApIHtcclxuXHRcdFx0XHRcdFx0XHRcdGN1cnJlbnRDb250ZXh0cyA9IGVsZW1lbnRzO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRlbGVtZW50cyA9IHNlZWQ7XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdGlmICggKG5vdCA9IHJlbmRzV2l0aE5vdC50ZXN0KCBwYXJ0ICkpICkge1xyXG5cdFx0XHRcdFx0XHRcdHBhcnQgPSBwYXJ0LnNsaWNlKCAwLCAtNSApLnJlcGxhY2UoIHJjb21iaW5hdG9ycywgXCIkJipcIiApO1xyXG5cdFx0XHRcdFx0XHRcdGFuY2hvcisrO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRpZiAoIG1hdGNoLmxlbmd0aCA+IDEgKSB7XHJcblx0XHRcdFx0XHRcdFx0bWF0Y2hbMF0ucmVwbGFjZSggcnBvc2dyb3Vwcywgc2V0VW5kZWZpbmVkICk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0ZWxlbWVudHMgPSBoYW5kbGVQT1NHcm91cCggcGFydCwgbWF0Y2hbMV0sIG1hdGNoWzJdLCBjdXJyZW50Q29udGV4dHMsIGVsZW1lbnRzLCBub3QgKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHBhcnQgPSBcIlwiO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICggIW1hdGNoZWQgKSB7XHJcblx0XHRcdFx0cGFydCArPSBzZWxlY3RvcjtcclxuXHRcdFx0fVxyXG5cdFx0XHRtYXRjaGVkID0gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCBwYXJ0ICkge1xyXG5cdFx0XHRpZiAoIHJjb21iaW5hdG9ycy50ZXN0KHBhcnQpICkge1xyXG5cdFx0XHRcdG11bHRpcGxlQ29udGV4dHMoIHBhcnQsIGVsZW1lbnRzIHx8IFsgY29udGV4dCBdLCByZXN1bHRzLCBzZWVkICk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0U2l6emxlKCBwYXJ0LCBjb250ZXh0LCByZXN1bHRzLCBzZWVkID8gc2VlZC5jb25jYXQoZWxlbWVudHMpIDogZWxlbWVudHMgKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0cHVzaC5hcHBseSggcmVzdWx0cywgZWxlbWVudHMgKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIERvIG5vdCBzb3J0IGlmIHRoaXMgaXMgYSBzaW5nbGUgZmlsdGVyXHJcblx0cmV0dXJuIGxlbiA9PT0gMSA/IHJlc3VsdHMgOiBTaXp6bGUudW5pcXVlU29ydCggcmVzdWx0cyApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZWxlY3QoIHNlbGVjdG9yLCBjb250ZXh0LCByZXN1bHRzLCBzZWVkLCB4bWwgKSB7XHJcblx0Ly8gUmVtb3ZlIGV4Y2Vzc2l2ZSB3aGl0ZXNwYWNlXHJcblx0c2VsZWN0b3IgPSBzZWxlY3Rvci5yZXBsYWNlKCBydHJpbSwgXCIkMVwiICk7XHJcblx0dmFyIGVsZW1lbnRzLCBtYXRjaGVyLCBjYWNoZWQsIGVsZW0sXHJcblx0XHRpLCB0b2tlbnMsIHRva2VuLCBsYXN0VG9rZW4sIGZpbmRDb250ZXh0LCB0eXBlLFxyXG5cdFx0bWF0Y2ggPSB0b2tlbml6ZSggc2VsZWN0b3IsIGNvbnRleHQsIHhtbCApLFxyXG5cdFx0Y29udGV4dE5vZGVUeXBlID0gY29udGV4dC5ub2RlVHlwZTtcclxuXHJcblx0Ly8gUE9TIGhhbmRsaW5nXHJcblx0aWYgKCBtYXRjaEV4cHJbXCJQT1NcIl0udGVzdChzZWxlY3RvcikgKSB7XHJcblx0XHRyZXR1cm4gaGFuZGxlUE9TKCBtYXRjaCwgY29udGV4dCwgcmVzdWx0cywgc2VlZCApO1xyXG5cdH1cclxuXHJcblx0aWYgKCBzZWVkICkge1xyXG5cdFx0ZWxlbWVudHMgPSBzbGljZS5jYWxsKCBzZWVkLCAwICk7XHJcblxyXG5cdC8vIFRvIG1haW50YWluIGRvY3VtZW50IG9yZGVyLCBvbmx5IG5hcnJvdyB0aGVcclxuXHQvLyBzZXQgaWYgdGhlcmUgaXMgb25lIGdyb3VwXHJcblx0fSBlbHNlIGlmICggbWF0Y2gubGVuZ3RoID09PSAxICkge1xyXG5cclxuXHRcdC8vIFRha2UgYSBzaG9ydGN1dCBhbmQgc2V0IHRoZSBjb250ZXh0IGlmIHRoZSByb290IHNlbGVjdG9yIGlzIGFuIElEXHJcblx0XHRpZiAoICh0b2tlbnMgPSBzbGljZS5jYWxsKCBtYXRjaFswXSwgMCApKS5sZW5ndGggPiAyICYmXHJcblx0XHRcdFx0KHRva2VuID0gdG9rZW5zWzBdKS5wYXJ0ID09PSBcIklEXCIgJiZcclxuXHRcdFx0XHRjb250ZXh0Tm9kZVR5cGUgPT09IDkgJiYgIXhtbCAmJlxyXG5cdFx0XHRcdEV4cHIucmVsYXRpdmVbIHRva2Vuc1sxXS5wYXJ0IF0gKSB7XHJcblxyXG5cdFx0XHRjb250ZXh0ID0gRXhwci5maW5kW1wiSURcIl0oIHRva2VuLmNhcHR1cmVzWzBdLnJlcGxhY2UoIHJiYWNrc2xhc2gsIFwiXCIgKSwgY29udGV4dCwgeG1sIClbMF07XHJcblx0XHRcdGlmICggIWNvbnRleHQgKSB7XHJcblx0XHRcdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNlbGVjdG9yID0gc2VsZWN0b3Iuc2xpY2UoIHRva2Vucy5zaGlmdCgpLnN0cmluZy5sZW5ndGggKTtcclxuXHRcdH1cclxuXHJcblx0XHRmaW5kQ29udGV4dCA9ICggKG1hdGNoID0gcnNpYmxpbmcuZXhlYyggdG9rZW5zWzBdLnN0cmluZyApKSAmJiAhbWF0Y2guaW5kZXggJiYgY29udGV4dC5wYXJlbnROb2RlICkgfHwgY29udGV4dDtcclxuXHJcblx0XHQvLyBSZWR1Y2UgdGhlIHNldCBpZiBwb3NzaWJsZVxyXG5cdFx0bGFzdFRva2VuID0gXCJcIjtcclxuXHRcdGZvciAoIGkgPSB0b2tlbnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0gKSB7XHJcblx0XHRcdHRva2VuID0gdG9rZW5zW2ldO1xyXG5cdFx0XHR0eXBlID0gdG9rZW4ucGFydDtcclxuXHRcdFx0bGFzdFRva2VuID0gdG9rZW4uc3RyaW5nICsgbGFzdFRva2VuO1xyXG5cdFx0XHRpZiAoIEV4cHIucmVsYXRpdmVbIHR5cGUgXSApIHtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoIEV4cHIub3JkZXIudGVzdCh0eXBlKSApIHtcclxuXHRcdFx0XHRlbGVtZW50cyA9IEV4cHIuZmluZFsgdHlwZSBdKCB0b2tlbi5jYXB0dXJlc1swXS5yZXBsYWNlKCByYmFja3NsYXNoLCBcIlwiICksIGZpbmRDb250ZXh0LCB4bWwgKTtcclxuXHRcdFx0XHRpZiAoIGVsZW1lbnRzID09IG51bGwgKSB7XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0c2VsZWN0b3IgPSBzZWxlY3Rvci5zbGljZSggMCwgc2VsZWN0b3IubGVuZ3RoIC0gbGFzdFRva2VuLmxlbmd0aCApICtcclxuXHRcdFx0XHRcdFx0bGFzdFRva2VuLnJlcGxhY2UoIG1hdGNoRXhwclsgdHlwZSBdLCBcIlwiICk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKCAhc2VsZWN0b3IgKSB7XHJcblx0XHRcdFx0XHRcdHB1c2guYXBwbHkoIHJlc3VsdHMsIHNsaWNlLmNhbGwoZWxlbWVudHMsIDApICk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBPbmx5IGxvb3Agb3ZlciB0aGUgZ2l2ZW4gZWxlbWVudHMgb25jZVxyXG5cdGlmICggc2VsZWN0b3IgKSB7XHJcblx0XHRtYXRjaGVyID0gY29tcGlsZSggc2VsZWN0b3IsIGNvbnRleHQsIHhtbCApO1xyXG5cdFx0ZGlycnVucyA9IG1hdGNoZXIuZGlycnVucysrO1xyXG5cdFx0aWYgKCBlbGVtZW50cyA9PSBudWxsICkge1xyXG5cdFx0XHRlbGVtZW50cyA9IEV4cHIuZmluZFtcIlRBR1wiXSggXCIqXCIsIChyc2libGluZy50ZXN0KCBzZWxlY3RvciApICYmIGNvbnRleHQucGFyZW50Tm9kZSkgfHwgY29udGV4dCApO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAoIGkgPSAwOyAoZWxlbSA9IGVsZW1lbnRzW2ldKTsgaSsrICkge1xyXG5cdFx0XHRjYWNoZWRydW5zID0gbWF0Y2hlci5ydW5zKys7XHJcblx0XHRcdGlmICggbWF0Y2hlcihlbGVtKSApIHtcclxuXHRcdFx0XHRyZXN1bHRzLnB1c2goIGVsZW0gKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHJlc3VsdHM7XHJcbn1cclxuXHJcbmlmICggZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCApIHtcclxuXHQoZnVuY3Rpb24oKSB7XHJcblx0XHR2YXIgZGlzY29ubmVjdGVkTWF0Y2gsXHJcblx0XHRcdG9sZFNlbGVjdCA9IHNlbGVjdCxcclxuXHRcdFx0cmVzY2FwZSA9IC8nfFxcXFwvZyxcclxuXHRcdFx0cmF0dHJpYnV0ZVF1b3RlcyA9IC9cXD1bXFx4MjBcXHRcXHJcXG5cXGZdKihbXidcIlxcXV0qKVtcXHgyMFxcdFxcclxcblxcZl0qXFxdL2csXHJcblx0XHRcdHJidWdneVFTQSA9IFtdLFxyXG5cdFx0XHQvLyBtYXRjaGVzU2VsZWN0b3IoOmFjdGl2ZSkgcmVwb3J0cyBmYWxzZSB3aGVuIHRydWUgKElFOS9PcGVyYSAxMS41KVxyXG5cdFx0XHQvLyBBIHN1cHBvcnQgdGVzdCB3b3VsZCByZXF1aXJlIHRvbyBtdWNoIGNvZGUgKHdvdWxkIGluY2x1ZGUgZG9jdW1lbnQgcmVhZHkpXHJcblx0XHRcdC8vIGp1c3Qgc2tpcCBtYXRjaGVzU2VsZWN0b3IgZm9yIDphY3RpdmVcclxuXHRcdFx0cmJ1Z2d5TWF0Y2hlcyA9IFtcIjphY3RpdmVcIl0sXHJcblx0XHRcdG1hdGNoZXMgPSBkb2NFbGVtLm1hdGNoZXNTZWxlY3RvciB8fFxyXG5cdFx0XHRcdGRvY0VsZW0ubW96TWF0Y2hlc1NlbGVjdG9yIHx8XHJcblx0XHRcdFx0ZG9jRWxlbS53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHxcclxuXHRcdFx0XHRkb2NFbGVtLm9NYXRjaGVzU2VsZWN0b3IgfHxcclxuXHRcdFx0XHRkb2NFbGVtLm1zTWF0Y2hlc1NlbGVjdG9yO1xyXG5cclxuXHRcdC8vIEJ1aWxkIFFTQSByZWdleFxyXG5cdFx0Ly8gUmVnZXggc3RyYXRlZ3kgYWRvcHRlZCBmcm9tIERpZWdvIFBlcmluaVxyXG5cdFx0YXNzZXJ0KGZ1bmN0aW9uKCBkaXYgKSB7XHJcblx0XHRcdC8vIFNlbGVjdCBpcyBzZXQgdG8gZW1wdHkgc3RyaW5nIG9uIHB1cnBvc2VcclxuXHRcdFx0Ly8gVGhpcyBpcyB0byB0ZXN0IElFJ3MgdHJlYXRtZW50IG9mIG5vdCBleHBsaWN0bHlcclxuXHRcdFx0Ly8gc2V0dGluZyBhIGJvb2xlYW4gY29udGVudCBhdHRyaWJ1dGUsXHJcblx0XHRcdC8vIHNpbmNlIGl0cyBwcmVzZW5jZSBzaG91bGQgYmUgZW5vdWdoXHJcblx0XHRcdC8vIGh0dHA6Ly9idWdzLmpxdWVyeS5jb20vdGlja2V0LzEyMzU5XHJcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBcIjxzZWxlY3Q+PG9wdGlvbiBzZWxlY3RlZD0nJz48L29wdGlvbj48L3NlbGVjdD5cIjtcclxuXHJcblx0XHRcdC8vIElFOCAtIFNvbWUgYm9vbGVhbiBhdHRyaWJ1dGVzIGFyZSBub3QgdHJlYXRlZCBjb3JyZWN0bHlcclxuXHRcdFx0aWYgKCAhZGl2LnF1ZXJ5U2VsZWN0b3JBbGwoXCJbc2VsZWN0ZWRdXCIpLmxlbmd0aCApIHtcclxuXHRcdFx0XHRyYnVnZ3lRU0EucHVzaCggXCJcXFxcW1wiICsgd2hpdGVzcGFjZSArIFwiKig/OmNoZWNrZWR8ZGlzYWJsZWR8aXNtYXB8bXVsdGlwbGV8cmVhZG9ubHl8c2VsZWN0ZWR8dmFsdWUpXCIgKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gV2Via2l0L09wZXJhIC0gOmNoZWNrZWQgc2hvdWxkIHJldHVybiBzZWxlY3RlZCBvcHRpb24gZWxlbWVudHNcclxuXHRcdFx0Ly8gaHR0cDovL3d3dy53My5vcmcvVFIvMjAxMS9SRUMtY3NzMy1zZWxlY3RvcnMtMjAxMTA5MjkvI2NoZWNrZWRcclxuXHRcdFx0Ly8gSUU4IHRocm93cyBlcnJvciBoZXJlIChkbyBub3QgcHV0IHRlc3RzIGFmdGVyIHRoaXMgb25lKVxyXG5cdFx0XHRpZiAoICFkaXYucXVlcnlTZWxlY3RvckFsbChcIjpjaGVja2VkXCIpLmxlbmd0aCApIHtcclxuXHRcdFx0XHRyYnVnZ3lRU0EucHVzaChcIjpjaGVja2VkXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRhc3NlcnQoZnVuY3Rpb24oIGRpdiApIHtcclxuXHJcblx0XHRcdC8vIE9wZXJhIDEwLTEyL0lFOSAtIF49ICQ9ICo9IGFuZCBlbXB0eSB2YWx1ZXNcclxuXHRcdFx0Ly8gU2hvdWxkIG5vdCBzZWxlY3QgYW55dGhpbmdcclxuXHRcdFx0ZGl2LmlubmVySFRNTCA9IFwiPHAgdGVzdD0nJz48L3A+XCI7XHJcblx0XHRcdGlmICggZGl2LnF1ZXJ5U2VsZWN0b3JBbGwoXCJbdGVzdF49JyddXCIpLmxlbmd0aCApIHtcclxuXHRcdFx0XHRyYnVnZ3lRU0EucHVzaCggXCJbKl4kXT1cIiArIHdoaXRlc3BhY2UgKyBcIiooPzpcXFwiXFxcInwnJylcIiApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBGRiAzLjUgLSA6ZW5hYmxlZC86ZGlzYWJsZWQgYW5kIGhpZGRlbiBlbGVtZW50cyAoaGlkZGVuIGVsZW1lbnRzIGFyZSBzdGlsbCBlbmFibGVkKVxyXG5cdFx0XHQvLyBJRTggdGhyb3dzIGVycm9yIGhlcmUgKGRvIG5vdCBwdXQgdGVzdHMgYWZ0ZXIgdGhpcyBvbmUpXHJcblx0XHRcdGRpdi5pbm5lckhUTUwgPSBcIjxpbnB1dCB0eXBlPSdoaWRkZW4nLz5cIjtcclxuXHRcdFx0aWYgKCAhZGl2LnF1ZXJ5U2VsZWN0b3JBbGwoXCI6ZW5hYmxlZFwiKS5sZW5ndGggKSB7XHJcblx0XHRcdFx0cmJ1Z2d5UVNBLnB1c2goXCI6ZW5hYmxlZFwiLCBcIjpkaXNhYmxlZFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmJ1Z2d5UVNBID0gcmJ1Z2d5UVNBLmxlbmd0aCAmJiBuZXcgUmVnRXhwKCByYnVnZ3lRU0Euam9pbihcInxcIikgKTtcclxuXHJcblx0XHRzZWxlY3QgPSBmdW5jdGlvbiggc2VsZWN0b3IsIGNvbnRleHQsIHJlc3VsdHMsIHNlZWQsIHhtbCApIHtcclxuXHRcdFx0Ly8gT25seSB1c2UgcXVlcnlTZWxlY3RvckFsbCB3aGVuIG5vdCBmaWx0ZXJpbmcsXHJcblx0XHRcdC8vIHdoZW4gdGhpcyBpcyBub3QgeG1sLFxyXG5cdFx0XHQvLyBhbmQgd2hlbiBubyBRU0EgYnVncyBhcHBseVxyXG5cdFx0XHRpZiAoICFzZWVkICYmICF4bWwgJiYgKCFyYnVnZ3lRU0EgfHwgIXJidWdneVFTQS50ZXN0KCBzZWxlY3RvciApKSApIHtcclxuXHRcdFx0XHRpZiAoIGNvbnRleHQubm9kZVR5cGUgPT09IDkgKSB7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRwdXNoLmFwcGx5KCByZXN1bHRzLCBzbGljZS5jYWxsKGNvbnRleHQucXVlcnlTZWxlY3RvckFsbCggc2VsZWN0b3IgKSwgMCkgKTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0XHRcdFx0XHR9IGNhdGNoKHFzYUVycm9yKSB7fVxyXG5cdFx0XHRcdC8vIHFTQSB3b3JrcyBzdHJhbmdlbHkgb24gRWxlbWVudC1yb290ZWQgcXVlcmllc1xyXG5cdFx0XHRcdC8vIFdlIGNhbiB3b3JrIGFyb3VuZCB0aGlzIGJ5IHNwZWNpZnlpbmcgYW4gZXh0cmEgSUQgb24gdGhlIHJvb3RcclxuXHRcdFx0XHQvLyBhbmQgd29ya2luZyB1cCBmcm9tIHRoZXJlIChUaGFua3MgdG8gQW5kcmV3IER1cG9udCBmb3IgdGhlIHRlY2huaXF1ZSlcclxuXHRcdFx0XHQvLyBJRSA4IGRvZXNuJ3Qgd29yayBvbiBvYmplY3QgZWxlbWVudHNcclxuXHRcdFx0XHR9IGVsc2UgaWYgKCBjb250ZXh0Lm5vZGVUeXBlID09PSAxICYmIGNvbnRleHQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gXCJvYmplY3RcIiApIHtcclxuXHRcdFx0XHRcdHZhciBncm91cHMsIGksIGxlbixcclxuXHRcdFx0XHRcdFx0b2xkID0gY29udGV4dC5nZXRBdHRyaWJ1dGUoXCJpZFwiKSxcclxuXHRcdFx0XHRcdFx0bmlkID0gb2xkIHx8IGV4cGFuZG8sXHJcblx0XHRcdFx0XHRcdG5ld0NvbnRleHQgPSByc2libGluZy50ZXN0KCBzZWxlY3RvciApICYmIGNvbnRleHQucGFyZW50Tm9kZSB8fCBjb250ZXh0O1xyXG5cclxuXHRcdFx0XHRcdGlmICggb2xkICkge1xyXG5cdFx0XHRcdFx0XHRuaWQgPSBuaWQucmVwbGFjZSggcmVzY2FwZSwgXCJcXFxcJCZcIiApO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Y29udGV4dC5zZXRBdHRyaWJ1dGUoIFwiaWRcIiwgbmlkICk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Z3JvdXBzID0gdG9rZW5pemUoc2VsZWN0b3IsIGNvbnRleHQsIHhtbCk7XHJcblx0XHRcdFx0XHQvLyBUcmFpbGluZyBzcGFjZSBpcyB1bm5lY2Vzc2FyeVxyXG5cdFx0XHRcdFx0Ly8gVGhlcmUgaXMgYWx3YXlzIGEgY29udGV4dCBjaGVja1xyXG5cdFx0XHRcdFx0bmlkID0gXCJbaWQ9J1wiICsgbmlkICsgXCInXVwiO1xyXG5cdFx0XHRcdFx0Zm9yICggaSA9IDAsIGxlbiA9IGdyb3Vwcy5sZW5ndGg7IGkgPCBsZW47IGkrKyApIHtcclxuXHRcdFx0XHRcdFx0Z3JvdXBzW2ldID0gbmlkICsgZ3JvdXBzW2ldLnNlbGVjdG9yO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0cHVzaC5hcHBseSggcmVzdWx0cywgc2xpY2UuY2FsbCggbmV3Q29udGV4dC5xdWVyeVNlbGVjdG9yQWxsKFxyXG5cdFx0XHRcdFx0XHRcdGdyb3Vwcy5qb2luKFwiLFwiKVxyXG5cdFx0XHRcdFx0XHQpLCAwICkgKTtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0XHRcdFx0XHR9IGNhdGNoKHFzYUVycm9yKSB7XHJcblx0XHRcdFx0XHR9IGZpbmFsbHkge1xyXG5cdFx0XHRcdFx0XHRpZiAoICFvbGQgKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29udGV4dC5yZW1vdmVBdHRyaWJ1dGUoXCJpZFwiKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIG9sZFNlbGVjdCggc2VsZWN0b3IsIGNvbnRleHQsIHJlc3VsdHMsIHNlZWQsIHhtbCApO1xyXG5cdFx0fTtcclxuXHJcblx0XHRpZiAoIG1hdGNoZXMgKSB7XHJcblx0XHRcdGFzc2VydChmdW5jdGlvbiggZGl2ICkge1xyXG5cdFx0XHRcdC8vIENoZWNrIHRvIHNlZSBpZiBpdCdzIHBvc3NpYmxlIHRvIGRvIG1hdGNoZXNTZWxlY3RvclxyXG5cdFx0XHRcdC8vIG9uIGEgZGlzY29ubmVjdGVkIG5vZGUgKElFIDkpXHJcblx0XHRcdFx0ZGlzY29ubmVjdGVkTWF0Y2ggPSBtYXRjaGVzLmNhbGwoIGRpdiwgXCJkaXZcIiApO1xyXG5cclxuXHRcdFx0XHQvLyBUaGlzIHNob3VsZCBmYWlsIHdpdGggYW4gZXhjZXB0aW9uXHJcblx0XHRcdFx0Ly8gR2Vja28gZG9lcyBub3QgZXJyb3IsIHJldHVybnMgZmFsc2UgaW5zdGVhZFxyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRtYXRjaGVzLmNhbGwoIGRpdiwgXCJbdGVzdCE9JyddOnNpenpsZVwiICk7XHJcblx0XHRcdFx0XHRyYnVnZ3lNYXRjaGVzLnB1c2goIG1hdGNoRXhwcltcIlBTRVVET1wiXS5zb3VyY2UsIG1hdGNoRXhwcltcIlBPU1wiXS5zb3VyY2UsIFwiIT1cIiApO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKCBlICkge31cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyByYnVnZ3lNYXRjaGVzIGFsd2F5cyBjb250YWlucyA6YWN0aXZlLCBzbyBubyBuZWVkIGZvciBhIGxlbmd0aCBjaGVja1xyXG5cdFx0XHRyYnVnZ3lNYXRjaGVzID0gLyogcmJ1Z2d5TWF0Y2hlcy5sZW5ndGggJiYgKi8gbmV3IFJlZ0V4cCggcmJ1Z2d5TWF0Y2hlcy5qb2luKFwifFwiKSApO1xyXG5cclxuXHRcdFx0U2l6emxlLm1hdGNoZXNTZWxlY3RvciA9IGZ1bmN0aW9uKCBlbGVtLCBleHByICkge1xyXG5cdFx0XHRcdC8vIE1ha2Ugc3VyZSB0aGF0IGF0dHJpYnV0ZSBzZWxlY3RvcnMgYXJlIHF1b3RlZFxyXG5cdFx0XHRcdGV4cHIgPSBleHByLnJlcGxhY2UoIHJhdHRyaWJ1dGVRdW90ZXMsIFwiPSckMSddXCIgKTtcclxuXHJcblx0XHRcdFx0Ly8gcmJ1Z2d5TWF0Y2hlcyBhbHdheXMgY29udGFpbnMgOmFjdGl2ZSwgc28gbm8gbmVlZCBmb3IgYW4gZXhpc3RlbmNlIGNoZWNrXHJcblx0XHRcdFx0aWYgKCAhaXNYTUwoIGVsZW0gKSAmJiAhcmJ1Z2d5TWF0Y2hlcy50ZXN0KCBleHByICkgJiYgKCFyYnVnZ3lRU0EgfHwgIXJidWdneVFTQS50ZXN0KCBleHByICkpICkge1xyXG5cdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0dmFyIHJldCA9IG1hdGNoZXMuY2FsbCggZWxlbSwgZXhwciApO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gSUUgOSdzIG1hdGNoZXNTZWxlY3RvciByZXR1cm5zIGZhbHNlIG9uIGRpc2Nvbm5lY3RlZCBub2Rlc1xyXG5cdFx0XHRcdFx0XHRpZiAoIHJldCB8fCBkaXNjb25uZWN0ZWRNYXRjaCB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gQXMgd2VsbCwgZGlzY29ubmVjdGVkIG5vZGVzIGFyZSBzYWlkIHRvIGJlIGluIGEgZG9jdW1lbnRcclxuXHRcdFx0XHRcdFx0XHRcdC8vIGZyYWdtZW50IGluIElFIDlcclxuXHRcdFx0XHRcdFx0XHRcdGVsZW0uZG9jdW1lbnQgJiYgZWxlbS5kb2N1bWVudC5ub2RlVHlwZSAhPT0gMTEgKSB7XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHJldDtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBjYXRjaChlKSB7fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIFNpenpsZSggZXhwciwgbnVsbCwgbnVsbCwgWyBlbGVtIF0gKS5sZW5ndGggPiAwO1xyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH0pKCk7XHJcbn1cclxuXHJcbi8vIERlcHJlY2F0ZWRcclxuRXhwci5zZXRGaWx0ZXJzW1wibnRoXCJdID0gRXhwci5zZXRGaWx0ZXJzW1wiZXFcIl07XHJcblxyXG4vLyBCYWNrLWNvbXBhdFxyXG5FeHByLmZpbHRlcnMgPSBFeHByLnBzZXVkb3M7XHJcblxyXG4vLyBPdmVycmlkZSBzaXp6bGUgYXR0cmlidXRlIHJldHJpZXZhbFxuU2l6emxlLmF0dHIgPSBqUXVlcnkuYXR0cjtcbmpRdWVyeS5maW5kID0gU2l6emxlO1xualF1ZXJ5LmV4cHIgPSBTaXp6bGUuc2VsZWN0b3JzO1xualF1ZXJ5LmV4cHJbXCI6XCJdID0galF1ZXJ5LmV4cHIucHNldWRvcztcbmpRdWVyeS51bmlxdWUgPSBTaXp6bGUudW5pcXVlU29ydDtcbmpRdWVyeS50ZXh0ID0gU2l6emxlLmdldFRleHQ7XG5qUXVlcnkuaXNYTUxEb2MgPSBTaXp6bGUuaXNYTUw7XG5qUXVlcnkuY29udGFpbnMgPSBTaXp6bGUuY29udGFpbnM7XG5cclxuXHJcbn0pKCB3aW5kb3cgKTtcclxudmFyIHJ1bnRpbCA9IC9VbnRpbCQvLFxuXHRycGFyZW50c3ByZXYgPSAvXig/OnBhcmVudHN8cHJldig/OlVudGlsfEFsbCkpLyxcblx0aXNTaW1wbGUgPSAvXi5bXjojXFxbXFwuLF0qJC8sXG5cdHJuZWVkc0NvbnRleHQgPSBqUXVlcnkuZXhwci5tYXRjaC5uZWVkc0NvbnRleHQsXG5cdC8vIG1ldGhvZHMgZ3VhcmFudGVlZCB0byBwcm9kdWNlIGEgdW5pcXVlIHNldCB3aGVuIHN0YXJ0aW5nIGZyb20gYSB1bmlxdWUgc2V0XG5cdGd1YXJhbnRlZWRVbmlxdWUgPSB7XG5cdFx0Y2hpbGRyZW46IHRydWUsXG5cdFx0Y29udGVudHM6IHRydWUsXG5cdFx0bmV4dDogdHJ1ZSxcblx0XHRwcmV2OiB0cnVlXG5cdH07XG5cbmpRdWVyeS5mbi5leHRlbmQoe1xuXHRmaW5kOiBmdW5jdGlvbiggc2VsZWN0b3IgKSB7XG5cdFx0dmFyIGksIGwsIGxlbmd0aCwgbiwgciwgcmV0LFxuXHRcdFx0c2VsZiA9IHRoaXM7XG5cblx0XHRpZiAoIHR5cGVvZiBzZWxlY3RvciAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHJldHVybiBqUXVlcnkoIHNlbGVjdG9yICkuZmlsdGVyKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRmb3IgKCBpID0gMCwgbCA9IHNlbGYubGVuZ3RoOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0XHRcdGlmICggalF1ZXJ5LmNvbnRhaW5zKCBzZWxmWyBpIF0sIHRoaXMgKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0ID0gdGhpcy5wdXNoU3RhY2soIFwiXCIsIFwiZmluZFwiLCBzZWxlY3RvciApO1xuXG5cdFx0Zm9yICggaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdGxlbmd0aCA9IHJldC5sZW5ndGg7XG5cdFx0XHRqUXVlcnkuZmluZCggc2VsZWN0b3IsIHRoaXNbaV0sIHJldCApO1xuXG5cdFx0XHRpZiAoIGkgPiAwICkge1xuXHRcdFx0XHQvLyBNYWtlIHN1cmUgdGhhdCB0aGUgcmVzdWx0cyBhcmUgdW5pcXVlXG5cdFx0XHRcdGZvciAoIG4gPSBsZW5ndGg7IG4gPCByZXQubGVuZ3RoOyBuKysgKSB7XG5cdFx0XHRcdFx0Zm9yICggciA9IDA7IHIgPCBsZW5ndGg7IHIrKyApIHtcblx0XHRcdFx0XHRcdGlmICggcmV0W3JdID09PSByZXRbbl0gKSB7XG5cdFx0XHRcdFx0XHRcdHJldC5zcGxpY2Uobi0tLCAxKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJldDtcblx0fSxcblxuXHRoYXM6IGZ1bmN0aW9uKCB0YXJnZXQgKSB7XG5cdFx0dmFyIGksXG5cdFx0XHR0YXJnZXRzID0galF1ZXJ5KCB0YXJnZXQsIHRoaXMgKSxcblx0XHRcdGxlbiA9IHRhcmdldHMubGVuZ3RoO1xuXG5cdFx0cmV0dXJuIHRoaXMuZmlsdGVyKGZ1bmN0aW9uKCkge1xuXHRcdFx0Zm9yICggaSA9IDA7IGkgPCBsZW47IGkrKyApIHtcblx0XHRcdFx0aWYgKCBqUXVlcnkuY29udGFpbnMoIHRoaXMsIHRhcmdldHNbaV0gKSApIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdG5vdDogZnVuY3Rpb24oIHNlbGVjdG9yICkge1xuXHRcdHJldHVybiB0aGlzLnB1c2hTdGFjayggd2lubm93KHRoaXMsIHNlbGVjdG9yLCBmYWxzZSksIFwibm90XCIsIHNlbGVjdG9yKTtcblx0fSxcblxuXHRmaWx0ZXI6IGZ1bmN0aW9uKCBzZWxlY3RvciApIHtcblx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIHdpbm5vdyh0aGlzLCBzZWxlY3RvciwgdHJ1ZSksIFwiZmlsdGVyXCIsIHNlbGVjdG9yICk7XG5cdH0sXG5cblx0aXM6IGZ1bmN0aW9uKCBzZWxlY3RvciApIHtcblx0XHRyZXR1cm4gISFzZWxlY3RvciAmJiAoXG5cdFx0XHR0eXBlb2Ygc2VsZWN0b3IgPT09IFwic3RyaW5nXCIgP1xuXHRcdFx0XHQvLyBJZiB0aGlzIGlzIGEgcG9zaXRpb25hbC9yZWxhdGl2ZSBzZWxlY3RvciwgY2hlY2sgbWVtYmVyc2hpcCBpbiB0aGUgcmV0dXJuZWQgc2V0XG5cdFx0XHRcdC8vIHNvICQoXCJwOmZpcnN0XCIpLmlzKFwicDpsYXN0XCIpIHdvbid0IHJldHVybiB0cnVlIGZvciBhIGRvYyB3aXRoIHR3byBcInBcIi5cblx0XHRcdFx0cm5lZWRzQ29udGV4dC50ZXN0KCBzZWxlY3RvciApID9cblx0XHRcdFx0XHRqUXVlcnkoIHNlbGVjdG9yLCB0aGlzLmNvbnRleHQgKS5pbmRleCggdGhpc1swXSApID49IDAgOlxuXHRcdFx0XHRcdGpRdWVyeS5maWx0ZXIoIHNlbGVjdG9yLCB0aGlzICkubGVuZ3RoID4gMCA6XG5cdFx0XHRcdHRoaXMuZmlsdGVyKCBzZWxlY3RvciApLmxlbmd0aCA+IDAgKTtcblx0fSxcblxuXHRjbG9zZXN0OiBmdW5jdGlvbiggc2VsZWN0b3JzLCBjb250ZXh0ICkge1xuXHRcdHZhciBjdXIsXG5cdFx0XHRpID0gMCxcblx0XHRcdGwgPSB0aGlzLmxlbmd0aCxcblx0XHRcdHJldCA9IFtdLFxuXHRcdFx0cG9zID0gcm5lZWRzQ29udGV4dC50ZXN0KCBzZWxlY3RvcnMgKSB8fCB0eXBlb2Ygc2VsZWN0b3JzICE9PSBcInN0cmluZ1wiID9cblx0XHRcdFx0alF1ZXJ5KCBzZWxlY3RvcnMsIGNvbnRleHQgfHwgdGhpcy5jb250ZXh0ICkgOlxuXHRcdFx0XHQwO1xuXG5cdFx0Zm9yICggOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0Y3VyID0gdGhpc1tpXTtcblxuXHRcdFx0d2hpbGUgKCBjdXIgJiYgY3VyLm93bmVyRG9jdW1lbnQgJiYgY3VyICE9PSBjb250ZXh0ICYmIGN1ci5ub2RlVHlwZSAhPT0gMTEgKSB7XG5cdFx0XHRcdGlmICggcG9zID8gcG9zLmluZGV4KGN1cikgPiAtMSA6IGpRdWVyeS5maW5kLm1hdGNoZXNTZWxlY3RvcihjdXIsIHNlbGVjdG9ycykgKSB7XG5cdFx0XHRcdFx0cmV0LnB1c2goIGN1ciApO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGN1ciA9IGN1ci5wYXJlbnROb2RlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldCA9IHJldC5sZW5ndGggPiAxID8galF1ZXJ5LnVuaXF1ZSggcmV0ICkgOiByZXQ7XG5cblx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIHJldCwgXCJjbG9zZXN0XCIsIHNlbGVjdG9ycyApO1xuXHR9LFxuXG5cdC8vIERldGVybWluZSB0aGUgcG9zaXRpb24gb2YgYW4gZWxlbWVudCB3aXRoaW5cblx0Ly8gdGhlIG1hdGNoZWQgc2V0IG9mIGVsZW1lbnRzXG5cdGluZGV4OiBmdW5jdGlvbiggZWxlbSApIHtcblxuXHRcdC8vIE5vIGFyZ3VtZW50LCByZXR1cm4gaW5kZXggaW4gcGFyZW50XG5cdFx0aWYgKCAhZWxlbSApIHtcblx0XHRcdHJldHVybiAoIHRoaXNbMF0gJiYgdGhpc1swXS5wYXJlbnROb2RlICkgPyB0aGlzLnByZXZBbGwoKS5sZW5ndGggOiAtMTtcblx0XHR9XG5cblx0XHQvLyBpbmRleCBpbiBzZWxlY3RvclxuXHRcdGlmICggdHlwZW9mIGVsZW0gPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRyZXR1cm4galF1ZXJ5LmluQXJyYXkoIHRoaXNbMF0sIGpRdWVyeSggZWxlbSApICk7XG5cdFx0fVxuXG5cdFx0Ly8gTG9jYXRlIHRoZSBwb3NpdGlvbiBvZiB0aGUgZGVzaXJlZCBlbGVtZW50XG5cdFx0cmV0dXJuIGpRdWVyeS5pbkFycmF5KFxuXHRcdFx0Ly8gSWYgaXQgcmVjZWl2ZXMgYSBqUXVlcnkgb2JqZWN0LCB0aGUgZmlyc3QgZWxlbWVudCBpcyB1c2VkXG5cdFx0XHRlbGVtLmpxdWVyeSA/IGVsZW1bMF0gOiBlbGVtLCB0aGlzICk7XG5cdH0sXG5cblx0YWRkOiBmdW5jdGlvbiggc2VsZWN0b3IsIGNvbnRleHQgKSB7XG5cdFx0dmFyIHNldCA9IHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIiA/XG5cdFx0XHRcdGpRdWVyeSggc2VsZWN0b3IsIGNvbnRleHQgKSA6XG5cdFx0XHRcdGpRdWVyeS5tYWtlQXJyYXkoIHNlbGVjdG9yICYmIHNlbGVjdG9yLm5vZGVUeXBlID8gWyBzZWxlY3RvciBdIDogc2VsZWN0b3IgKSxcblx0XHRcdGFsbCA9IGpRdWVyeS5tZXJnZSggdGhpcy5nZXQoKSwgc2V0ICk7XG5cblx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIGlzRGlzY29ubmVjdGVkKCBzZXRbMF0gKSB8fCBpc0Rpc2Nvbm5lY3RlZCggYWxsWzBdICkgP1xuXHRcdFx0YWxsIDpcblx0XHRcdGpRdWVyeS51bmlxdWUoIGFsbCApICk7XG5cdH0sXG5cblx0YWRkQmFjazogZnVuY3Rpb24oIHNlbGVjdG9yICkge1xuXHRcdHJldHVybiB0aGlzLmFkZCggc2VsZWN0b3IgPT0gbnVsbCA/XG5cdFx0XHR0aGlzLnByZXZPYmplY3QgOiB0aGlzLnByZXZPYmplY3QuZmlsdGVyKHNlbGVjdG9yKVxuXHRcdCk7XG5cdH1cbn0pO1xuXG5qUXVlcnkuZm4uYW5kU2VsZiA9IGpRdWVyeS5mbi5hZGRCYWNrO1xuXG4vLyBBIHBhaW5mdWxseSBzaW1wbGUgY2hlY2sgdG8gc2VlIGlmIGFuIGVsZW1lbnQgaXMgZGlzY29ubmVjdGVkXG4vLyBmcm9tIGEgZG9jdW1lbnQgKHNob3VsZCBiZSBpbXByb3ZlZCwgd2hlcmUgZmVhc2libGUpLlxuZnVuY3Rpb24gaXNEaXNjb25uZWN0ZWQoIG5vZGUgKSB7XG5cdHJldHVybiAhbm9kZSB8fCAhbm9kZS5wYXJlbnROb2RlIHx8IG5vZGUucGFyZW50Tm9kZS5ub2RlVHlwZSA9PT0gMTE7XG59XG5cbmZ1bmN0aW9uIHNpYmxpbmcoIGN1ciwgZGlyICkge1xuXHRkbyB7XG5cdFx0Y3VyID0gY3VyWyBkaXIgXTtcblx0fSB3aGlsZSAoIGN1ciAmJiBjdXIubm9kZVR5cGUgIT09IDEgKTtcblxuXHRyZXR1cm4gY3VyO1xufVxuXG5qUXVlcnkuZWFjaCh7XG5cdHBhcmVudDogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0dmFyIHBhcmVudCA9IGVsZW0ucGFyZW50Tm9kZTtcblx0XHRyZXR1cm4gcGFyZW50ICYmIHBhcmVudC5ub2RlVHlwZSAhPT0gMTEgPyBwYXJlbnQgOiBudWxsO1xuXHR9LFxuXHRwYXJlbnRzOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRyZXR1cm4galF1ZXJ5LmRpciggZWxlbSwgXCJwYXJlbnROb2RlXCIgKTtcblx0fSxcblx0cGFyZW50c1VudGlsOiBmdW5jdGlvbiggZWxlbSwgaSwgdW50aWwgKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5kaXIoIGVsZW0sIFwicGFyZW50Tm9kZVwiLCB1bnRpbCApO1xuXHR9LFxuXHRuZXh0OiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRyZXR1cm4gc2libGluZyggZWxlbSwgXCJuZXh0U2libGluZ1wiICk7XG5cdH0sXG5cdHByZXY6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdHJldHVybiBzaWJsaW5nKCBlbGVtLCBcInByZXZpb3VzU2libGluZ1wiICk7XG5cdH0sXG5cdG5leHRBbGw6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdHJldHVybiBqUXVlcnkuZGlyKCBlbGVtLCBcIm5leHRTaWJsaW5nXCIgKTtcblx0fSxcblx0cHJldkFsbDogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5kaXIoIGVsZW0sIFwicHJldmlvdXNTaWJsaW5nXCIgKTtcblx0fSxcblx0bmV4dFVudGlsOiBmdW5jdGlvbiggZWxlbSwgaSwgdW50aWwgKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5kaXIoIGVsZW0sIFwibmV4dFNpYmxpbmdcIiwgdW50aWwgKTtcblx0fSxcblx0cHJldlVudGlsOiBmdW5jdGlvbiggZWxlbSwgaSwgdW50aWwgKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5kaXIoIGVsZW0sIFwicHJldmlvdXNTaWJsaW5nXCIsIHVudGlsICk7XG5cdH0sXG5cdHNpYmxpbmdzOiBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRyZXR1cm4galF1ZXJ5LnNpYmxpbmcoICggZWxlbS5wYXJlbnROb2RlIHx8IHt9ICkuZmlyc3RDaGlsZCwgZWxlbSApO1xuXHR9LFxuXHRjaGlsZHJlbjogZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5zaWJsaW5nKCBlbGVtLmZpcnN0Q2hpbGQgKTtcblx0fSxcblx0Y29udGVudHM6IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdHJldHVybiBqUXVlcnkubm9kZU5hbWUoIGVsZW0sIFwiaWZyYW1lXCIgKSA/XG5cdFx0XHRlbGVtLmNvbnRlbnREb2N1bWVudCB8fCBlbGVtLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQgOlxuXHRcdFx0alF1ZXJ5Lm1lcmdlKCBbXSwgZWxlbS5jaGlsZE5vZGVzICk7XG5cdH1cbn0sIGZ1bmN0aW9uKCBuYW1lLCBmbiApIHtcblx0alF1ZXJ5LmZuWyBuYW1lIF0gPSBmdW5jdGlvbiggdW50aWwsIHNlbGVjdG9yICkge1xuXHRcdHZhciByZXQgPSBqUXVlcnkubWFwKCB0aGlzLCBmbiwgdW50aWwgKTtcblxuXHRcdGlmICggIXJ1bnRpbC50ZXN0KCBuYW1lICkgKSB7XG5cdFx0XHRzZWxlY3RvciA9IHVudGlsO1xuXHRcdH1cblxuXHRcdGlmICggc2VsZWN0b3IgJiYgdHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0cmV0ID0galF1ZXJ5LmZpbHRlciggc2VsZWN0b3IsIHJldCApO1xuXHRcdH1cblxuXHRcdHJldCA9IHRoaXMubGVuZ3RoID4gMSAmJiAhZ3VhcmFudGVlZFVuaXF1ZVsgbmFtZSBdID8galF1ZXJ5LnVuaXF1ZSggcmV0ICkgOiByZXQ7XG5cblx0XHRpZiAoIHRoaXMubGVuZ3RoID4gMSAmJiBycGFyZW50c3ByZXYudGVzdCggbmFtZSApICkge1xuXHRcdFx0cmV0ID0gcmV0LnJldmVyc2UoKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIHJldCwgbmFtZSwgY29yZV9zbGljZS5jYWxsKCBhcmd1bWVudHMgKS5qb2luKFwiLFwiKSApO1xuXHR9O1xufSk7XG5cbmpRdWVyeS5leHRlbmQoe1xuXHRmaWx0ZXI6IGZ1bmN0aW9uKCBleHByLCBlbGVtcywgbm90ICkge1xuXHRcdGlmICggbm90ICkge1xuXHRcdFx0ZXhwciA9IFwiOm5vdChcIiArIGV4cHIgKyBcIilcIjtcblx0XHR9XG5cblx0XHRyZXR1cm4gZWxlbXMubGVuZ3RoID09PSAxID9cblx0XHRcdGpRdWVyeS5maW5kLm1hdGNoZXNTZWxlY3RvcihlbGVtc1swXSwgZXhwcikgPyBbIGVsZW1zWzBdIF0gOiBbXSA6XG5cdFx0XHRqUXVlcnkuZmluZC5tYXRjaGVzKGV4cHIsIGVsZW1zKTtcblx0fSxcblxuXHRkaXI6IGZ1bmN0aW9uKCBlbGVtLCBkaXIsIHVudGlsICkge1xuXHRcdHZhciBtYXRjaGVkID0gW10sXG5cdFx0XHRjdXIgPSBlbGVtWyBkaXIgXTtcblxuXHRcdHdoaWxlICggY3VyICYmIGN1ci5ub2RlVHlwZSAhPT0gOSAmJiAodW50aWwgPT09IHVuZGVmaW5lZCB8fCBjdXIubm9kZVR5cGUgIT09IDEgfHwgIWpRdWVyeSggY3VyICkuaXMoIHVudGlsICkpICkge1xuXHRcdFx0aWYgKCBjdXIubm9kZVR5cGUgPT09IDEgKSB7XG5cdFx0XHRcdG1hdGNoZWQucHVzaCggY3VyICk7XG5cdFx0XHR9XG5cdFx0XHRjdXIgPSBjdXJbZGlyXTtcblx0XHR9XG5cdFx0cmV0dXJuIG1hdGNoZWQ7XG5cdH0sXG5cblx0c2libGluZzogZnVuY3Rpb24oIG4sIGVsZW0gKSB7XG5cdFx0dmFyIHIgPSBbXTtcblxuXHRcdGZvciAoIDsgbjsgbiA9IG4ubmV4dFNpYmxpbmcgKSB7XG5cdFx0XHRpZiAoIG4ubm9kZVR5cGUgPT09IDEgJiYgbiAhPT0gZWxlbSApIHtcblx0XHRcdFx0ci5wdXNoKCBuICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHI7XG5cdH1cbn0pO1xuXG4vLyBJbXBsZW1lbnQgdGhlIGlkZW50aWNhbCBmdW5jdGlvbmFsaXR5IGZvciBmaWx0ZXIgYW5kIG5vdFxuZnVuY3Rpb24gd2lubm93KCBlbGVtZW50cywgcXVhbGlmaWVyLCBrZWVwICkge1xuXG5cdC8vIENhbid0IHBhc3MgbnVsbCBvciB1bmRlZmluZWQgdG8gaW5kZXhPZiBpbiBGaXJlZm94IDRcblx0Ly8gU2V0IHRvIDAgdG8gc2tpcCBzdHJpbmcgY2hlY2tcblx0cXVhbGlmaWVyID0gcXVhbGlmaWVyIHx8IDA7XG5cblx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggcXVhbGlmaWVyICkgKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5ncmVwKGVsZW1lbnRzLCBmdW5jdGlvbiggZWxlbSwgaSApIHtcblx0XHRcdHZhciByZXRWYWwgPSAhIXF1YWxpZmllci5jYWxsKCBlbGVtLCBpLCBlbGVtICk7XG5cdFx0XHRyZXR1cm4gcmV0VmFsID09PSBrZWVwO1xuXHRcdH0pO1xuXG5cdH0gZWxzZSBpZiAoIHF1YWxpZmllci5ub2RlVHlwZSApIHtcblx0XHRyZXR1cm4galF1ZXJ5LmdyZXAoZWxlbWVudHMsIGZ1bmN0aW9uKCBlbGVtLCBpICkge1xuXHRcdFx0cmV0dXJuICggZWxlbSA9PT0gcXVhbGlmaWVyICkgPT09IGtlZXA7XG5cdFx0fSk7XG5cblx0fSBlbHNlIGlmICggdHlwZW9mIHF1YWxpZmllciA9PT0gXCJzdHJpbmdcIiApIHtcblx0XHR2YXIgZmlsdGVyZWQgPSBqUXVlcnkuZ3JlcChlbGVtZW50cywgZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRyZXR1cm4gZWxlbS5ub2RlVHlwZSA9PT0gMTtcblx0XHR9KTtcblxuXHRcdGlmICggaXNTaW1wbGUudGVzdCggcXVhbGlmaWVyICkgKSB7XG5cdFx0XHRyZXR1cm4galF1ZXJ5LmZpbHRlcihxdWFsaWZpZXIsIGZpbHRlcmVkLCAha2VlcCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHF1YWxpZmllciA9IGpRdWVyeS5maWx0ZXIoIHF1YWxpZmllciwgZmlsdGVyZWQgKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4galF1ZXJ5LmdyZXAoZWxlbWVudHMsIGZ1bmN0aW9uKCBlbGVtLCBpICkge1xuXHRcdHJldHVybiAoIGpRdWVyeS5pbkFycmF5KCBlbGVtLCBxdWFsaWZpZXIgKSA+PSAwICkgPT09IGtlZXA7XG5cdH0pO1xufVxuZnVuY3Rpb24gY3JlYXRlU2FmZUZyYWdtZW50KCBkb2N1bWVudCApIHtcblx0dmFyIGxpc3QgPSBub2RlTmFtZXMuc3BsaXQoIFwifFwiICksXG5cdHNhZmVGcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXG5cdGlmICggc2FmZUZyYWcuY3JlYXRlRWxlbWVudCApIHtcblx0XHR3aGlsZSAoIGxpc3QubGVuZ3RoICkge1xuXHRcdFx0c2FmZUZyYWcuY3JlYXRlRWxlbWVudChcblx0XHRcdFx0bGlzdC5wb3AoKVxuXHRcdFx0KTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHNhZmVGcmFnO1xufVxuXG52YXIgbm9kZU5hbWVzID0gXCJhYmJyfGFydGljbGV8YXNpZGV8YXVkaW98YmRpfGNhbnZhc3xkYXRhfGRhdGFsaXN0fGRldGFpbHN8ZmlnY2FwdGlvbnxmaWd1cmV8Zm9vdGVyfFwiICtcblx0XHRcImhlYWRlcnxoZ3JvdXB8bWFya3xtZXRlcnxuYXZ8b3V0cHV0fHByb2dyZXNzfHNlY3Rpb258c3VtbWFyeXx0aW1lfHZpZGVvXCIsXG5cdHJpbmxpbmVqUXVlcnkgPSAvIGpRdWVyeVxcZCs9XCIoPzpudWxsfFxcZCspXCIvZyxcblx0cmxlYWRpbmdXaGl0ZXNwYWNlID0gL15cXHMrLyxcblx0cnhodG1sVGFnID0gLzwoPyFhcmVhfGJyfGNvbHxlbWJlZHxocnxpbWd8aW5wdXR8bGlua3xtZXRhfHBhcmFtKSgoW1xcdzpdKylbXj5dKilcXC8+L2dpLFxuXHRydGFnTmFtZSA9IC88KFtcXHc6XSspLyxcblx0cnRib2R5ID0gLzx0Ym9keS9pLFxuXHRyaHRtbCA9IC88fCYjP1xcdys7Lyxcblx0cm5vSW5uZXJodG1sID0gLzwoPzpzY3JpcHR8c3R5bGV8bGluaykvaSxcblx0cm5vY2FjaGUgPSAvPCg/OnNjcmlwdHxvYmplY3R8ZW1iZWR8b3B0aW9ufHN0eWxlKS9pLFxuXHRybm9zaGltY2FjaGUgPSBuZXcgUmVnRXhwKFwiPCg/OlwiICsgbm9kZU5hbWVzICsgXCIpW1xcXFxzLz5dXCIsIFwiaVwiKSxcblx0cmNoZWNrYWJsZVR5cGUgPSAvXig/OmNoZWNrYm94fHJhZGlvKSQvLFxuXHQvLyBjaGVja2VkPVwiY2hlY2tlZFwiIG9yIGNoZWNrZWRcblx0cmNoZWNrZWQgPSAvY2hlY2tlZFxccyooPzpbXj1dfD1cXHMqLmNoZWNrZWQuKS9pLFxuXHRyc2NyaXB0VHlwZSA9IC9cXC8oamF2YXxlY21hKXNjcmlwdC9pLFxuXHRyY2xlYW5TY3JpcHQgPSAvXlxccyo8ISg/OlxcW0NEQVRBXFxbfFxcLVxcLSl8W1xcXVxcLV17Mn0+XFxzKiQvZyxcblx0d3JhcE1hcCA9IHtcblx0XHRvcHRpb246IFsgMSwgXCI8c2VsZWN0IG11bHRpcGxlPSdtdWx0aXBsZSc+XCIsIFwiPC9zZWxlY3Q+XCIgXSxcblx0XHRsZWdlbmQ6IFsgMSwgXCI8ZmllbGRzZXQ+XCIsIFwiPC9maWVsZHNldD5cIiBdLFxuXHRcdHRoZWFkOiBbIDEsIFwiPHRhYmxlPlwiLCBcIjwvdGFibGU+XCIgXSxcblx0XHR0cjogWyAyLCBcIjx0YWJsZT48dGJvZHk+XCIsIFwiPC90Ym9keT48L3RhYmxlPlwiIF0sXG5cdFx0dGQ6IFsgMywgXCI8dGFibGU+PHRib2R5Pjx0cj5cIiwgXCI8L3RyPjwvdGJvZHk+PC90YWJsZT5cIiBdLFxuXHRcdGNvbDogWyAyLCBcIjx0YWJsZT48dGJvZHk+PC90Ym9keT48Y29sZ3JvdXA+XCIsIFwiPC9jb2xncm91cD48L3RhYmxlPlwiIF0sXG5cdFx0YXJlYTogWyAxLCBcIjxtYXA+XCIsIFwiPC9tYXA+XCIgXSxcblx0XHRfZGVmYXVsdDogWyAwLCBcIlwiLCBcIlwiIF1cblx0fSxcblx0c2FmZUZyYWdtZW50ID0gY3JlYXRlU2FmZUZyYWdtZW50KCBkb2N1bWVudCApLFxuXHRmcmFnbWVudERpdiA9IHNhZmVGcmFnbWVudC5hcHBlbmRDaGlsZCggZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSApO1xuXG53cmFwTWFwLm9wdGdyb3VwID0gd3JhcE1hcC5vcHRpb247XG53cmFwTWFwLnRib2R5ID0gd3JhcE1hcC50Zm9vdCA9IHdyYXBNYXAuY29sZ3JvdXAgPSB3cmFwTWFwLmNhcHRpb24gPSB3cmFwTWFwLnRoZWFkO1xud3JhcE1hcC50aCA9IHdyYXBNYXAudGQ7XG5cbi8vIElFNi04IGNhbid0IHNlcmlhbGl6ZSBsaW5rLCBzY3JpcHQsIHN0eWxlLCBvciBhbnkgaHRtbDUgKE5vU2NvcGUpIHRhZ3MsXG4vLyB1bmxlc3Mgd3JhcHBlZCBpbiBhIGRpdiB3aXRoIG5vbi1icmVha2luZyBjaGFyYWN0ZXJzIGluIGZyb250IG9mIGl0LlxuaWYgKCAhalF1ZXJ5LnN1cHBvcnQuaHRtbFNlcmlhbGl6ZSApIHtcblx0d3JhcE1hcC5fZGVmYXVsdCA9IFsgMSwgXCJYPGRpdj5cIiwgXCI8L2Rpdj5cIiBdO1xufVxuXG5qUXVlcnkuZm4uZXh0ZW5kKHtcblx0dGV4dDogZnVuY3Rpb24oIHZhbHVlICkge1xuXHRcdHJldHVybiBqUXVlcnkuYWNjZXNzKCB0aGlzLCBmdW5jdGlvbiggdmFsdWUgKSB7XG5cdFx0XHRyZXR1cm4gdmFsdWUgPT09IHVuZGVmaW5lZCA/XG5cdFx0XHRcdGpRdWVyeS50ZXh0KCB0aGlzICkgOlxuXHRcdFx0XHR0aGlzLmVtcHR5KCkuYXBwZW5kKCAoIHRoaXNbMF0gJiYgdGhpc1swXS5vd25lckRvY3VtZW50IHx8IGRvY3VtZW50ICkuY3JlYXRlVGV4dE5vZGUoIHZhbHVlICkgKTtcblx0XHR9LCBudWxsLCB2YWx1ZSwgYXJndW1lbnRzLmxlbmd0aCApO1xuXHR9LFxuXG5cdHdyYXBBbGw6IGZ1bmN0aW9uKCBodG1sICkge1xuXHRcdGlmICggalF1ZXJ5LmlzRnVuY3Rpb24oIGh0bWwgKSApIHtcblx0XHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oaSkge1xuXHRcdFx0XHRqUXVlcnkodGhpcykud3JhcEFsbCggaHRtbC5jYWxsKHRoaXMsIGkpICk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAoIHRoaXNbMF0gKSB7XG5cdFx0XHQvLyBUaGUgZWxlbWVudHMgdG8gd3JhcCB0aGUgdGFyZ2V0IGFyb3VuZFxuXHRcdFx0dmFyIHdyYXAgPSBqUXVlcnkoIGh0bWwsIHRoaXNbMF0ub3duZXJEb2N1bWVudCApLmVxKDApLmNsb25lKHRydWUpO1xuXG5cdFx0XHRpZiAoIHRoaXNbMF0ucGFyZW50Tm9kZSApIHtcblx0XHRcdFx0d3JhcC5pbnNlcnRCZWZvcmUoIHRoaXNbMF0gKTtcblx0XHRcdH1cblxuXHRcdFx0d3JhcC5tYXAoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBlbGVtID0gdGhpcztcblxuXHRcdFx0XHR3aGlsZSAoIGVsZW0uZmlyc3RDaGlsZCAmJiBlbGVtLmZpcnN0Q2hpbGQubm9kZVR5cGUgPT09IDEgKSB7XG5cdFx0XHRcdFx0ZWxlbSA9IGVsZW0uZmlyc3RDaGlsZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBlbGVtO1xuXHRcdFx0fSkuYXBwZW5kKCB0aGlzICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0d3JhcElubmVyOiBmdW5jdGlvbiggaHRtbCApIHtcblx0XHRpZiAoIGpRdWVyeS5pc0Z1bmN0aW9uKCBodG1sICkgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKGkpIHtcblx0XHRcdFx0alF1ZXJ5KHRoaXMpLndyYXBJbm5lciggaHRtbC5jYWxsKHRoaXMsIGkpICk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSBqUXVlcnkoIHRoaXMgKSxcblx0XHRcdFx0Y29udGVudHMgPSBzZWxmLmNvbnRlbnRzKCk7XG5cblx0XHRcdGlmICggY29udGVudHMubGVuZ3RoICkge1xuXHRcdFx0XHRjb250ZW50cy53cmFwQWxsKCBodG1sICk7XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbGYuYXBwZW5kKCBodG1sICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cblx0d3JhcDogZnVuY3Rpb24oIGh0bWwgKSB7XG5cdFx0dmFyIGlzRnVuY3Rpb24gPSBqUXVlcnkuaXNGdW5jdGlvbiggaHRtbCApO1xuXG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbihpKSB7XG5cdFx0XHRqUXVlcnkoIHRoaXMgKS53cmFwQWxsKCBpc0Z1bmN0aW9uID8gaHRtbC5jYWxsKHRoaXMsIGkpIDogaHRtbCApO1xuXHRcdH0pO1xuXHR9LFxuXG5cdHVud3JhcDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMucGFyZW50KCkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdGlmICggIWpRdWVyeS5ub2RlTmFtZSggdGhpcywgXCJib2R5XCIgKSApIHtcblx0XHRcdFx0alF1ZXJ5KCB0aGlzICkucmVwbGFjZVdpdGgoIHRoaXMuY2hpbGROb2RlcyApO1xuXHRcdFx0fVxuXHRcdH0pLmVuZCgpO1xuXHR9LFxuXG5cdGFwcGVuZDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuZG9tTWFuaXAoYXJndW1lbnRzLCB0cnVlLCBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdGlmICggdGhpcy5ub2RlVHlwZSA9PT0gMSB8fCB0aGlzLm5vZGVUeXBlID09PSAxMSApIHtcblx0XHRcdFx0dGhpcy5hcHBlbmRDaGlsZCggZWxlbSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdHByZXBlbmQ6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmRvbU1hbmlwKGFyZ3VtZW50cywgdHJ1ZSwgZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRpZiAoIHRoaXMubm9kZVR5cGUgPT09IDEgfHwgdGhpcy5ub2RlVHlwZSA9PT0gMTEgKSB7XG5cdFx0XHRcdHRoaXMuaW5zZXJ0QmVmb3JlKCBlbGVtLCB0aGlzLmZpcnN0Q2hpbGQgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblxuXHRiZWZvcmU6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICggIWlzRGlzY29ubmVjdGVkKCB0aGlzWzBdICkgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kb21NYW5pcChhcmd1bWVudHMsIGZhbHNlLCBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdFx0dGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSggZWxlbSwgdGhpcyApO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCBhcmd1bWVudHMubGVuZ3RoICkge1xuXHRcdFx0dmFyIHNldCA9IGpRdWVyeS5jbGVhbiggYXJndW1lbnRzICk7XG5cdFx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIGpRdWVyeS5tZXJnZSggc2V0LCB0aGlzICksIFwiYmVmb3JlXCIsIHRoaXMuc2VsZWN0b3IgKTtcblx0XHR9XG5cdH0sXG5cblx0YWZ0ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICggIWlzRGlzY29ubmVjdGVkKCB0aGlzWzBdICkgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kb21NYW5pcChhcmd1bWVudHMsIGZhbHNlLCBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRcdFx0dGhpcy5wYXJlbnROb2RlLmluc2VydEJlZm9yZSggZWxlbSwgdGhpcy5uZXh0U2libGluZyApO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCBhcmd1bWVudHMubGVuZ3RoICkge1xuXHRcdFx0dmFyIHNldCA9IGpRdWVyeS5jbGVhbiggYXJndW1lbnRzICk7XG5cdFx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIGpRdWVyeS5tZXJnZSggdGhpcywgc2V0ICksIFwiYWZ0ZXJcIiwgdGhpcy5zZWxlY3RvciApO1xuXHRcdH1cblx0fSxcblxuXHQvLyBrZWVwRGF0YSBpcyBmb3IgaW50ZXJuYWwgdXNlIG9ubHktLWRvIG5vdCBkb2N1bWVudFxuXHRyZW1vdmU6IGZ1bmN0aW9uKCBzZWxlY3Rvciwga2VlcERhdGEgKSB7XG5cdFx0dmFyIGVsZW0sXG5cdFx0XHRpID0gMDtcblxuXHRcdGZvciAoIDsgKGVsZW0gPSB0aGlzW2ldKSAhPSBudWxsOyBpKysgKSB7XG5cdFx0XHRpZiAoICFzZWxlY3RvciB8fCBqUXVlcnkuZmlsdGVyKCBzZWxlY3RvciwgWyBlbGVtIF0gKS5sZW5ndGggKSB7XG5cdFx0XHRcdGlmICggIWtlZXBEYXRhICYmIGVsZW0ubm9kZVR5cGUgPT09IDEgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5LmNsZWFuRGF0YSggZWxlbS5nZXRFbGVtZW50c0J5VGFnTmFtZShcIipcIikgKTtcblx0XHRcdFx0XHRqUXVlcnkuY2xlYW5EYXRhKCBbIGVsZW0gXSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCBlbGVtLnBhcmVudE5vZGUgKSB7XG5cdFx0XHRcdFx0ZWxlbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKCBlbGVtICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRlbXB0eTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGVsZW0sXG5cdFx0XHRpID0gMDtcblxuXHRcdGZvciAoIDsgKGVsZW0gPSB0aGlzW2ldKSAhPSBudWxsOyBpKysgKSB7XG5cdFx0XHQvLyBSZW1vdmUgZWxlbWVudCBub2RlcyBhbmQgcHJldmVudCBtZW1vcnkgbGVha3Ncblx0XHRcdGlmICggZWxlbS5ub2RlVHlwZSA9PT0gMSApIHtcblx0XHRcdFx0alF1ZXJ5LmNsZWFuRGF0YSggZWxlbS5nZXRFbGVtZW50c0J5VGFnTmFtZShcIipcIikgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gUmVtb3ZlIGFueSByZW1haW5pbmcgbm9kZXNcblx0XHRcdHdoaWxlICggZWxlbS5maXJzdENoaWxkICkge1xuXHRcdFx0XHRlbGVtLnJlbW92ZUNoaWxkKCBlbGVtLmZpcnN0Q2hpbGQgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRjbG9uZTogZnVuY3Rpb24oIGRhdGFBbmRFdmVudHMsIGRlZXBEYXRhQW5kRXZlbnRzICkge1xuXHRcdGRhdGFBbmRFdmVudHMgPSBkYXRhQW5kRXZlbnRzID09IG51bGwgPyBmYWxzZSA6IGRhdGFBbmRFdmVudHM7XG5cdFx0ZGVlcERhdGFBbmRFdmVudHMgPSBkZWVwRGF0YUFuZEV2ZW50cyA9PSBudWxsID8gZGF0YUFuZEV2ZW50cyA6IGRlZXBEYXRhQW5kRXZlbnRzO1xuXG5cdFx0cmV0dXJuIHRoaXMubWFwKCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4galF1ZXJ5LmNsb25lKCB0aGlzLCBkYXRhQW5kRXZlbnRzLCBkZWVwRGF0YUFuZEV2ZW50cyApO1xuXHRcdH0pO1xuXHR9LFxuXG5cdGh0bWw6IGZ1bmN0aW9uKCB2YWx1ZSApIHtcblx0XHRyZXR1cm4galF1ZXJ5LmFjY2VzcyggdGhpcywgZnVuY3Rpb24oIHZhbHVlICkge1xuXHRcdFx0dmFyIGVsZW0gPSB0aGlzWzBdIHx8IHt9LFxuXHRcdFx0XHRpID0gMCxcblx0XHRcdFx0bCA9IHRoaXMubGVuZ3RoO1xuXG5cdFx0XHRpZiAoIHZhbHVlID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdHJldHVybiBlbGVtLm5vZGVUeXBlID09PSAxID9cblx0XHRcdFx0XHRlbGVtLmlubmVySFRNTC5yZXBsYWNlKCByaW5saW5lalF1ZXJ5LCBcIlwiICkgOlxuXHRcdFx0XHRcdHVuZGVmaW5lZDtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2VlIGlmIHdlIGNhbiB0YWtlIGEgc2hvcnRjdXQgYW5kIGp1c3QgdXNlIGlubmVySFRNTFxuXHRcdFx0aWYgKCB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgJiYgIXJub0lubmVyaHRtbC50ZXN0KCB2YWx1ZSApICYmXG5cdFx0XHRcdCggalF1ZXJ5LnN1cHBvcnQuaHRtbFNlcmlhbGl6ZSB8fCAhcm5vc2hpbWNhY2hlLnRlc3QoIHZhbHVlICkgICkgJiZcblx0XHRcdFx0KCBqUXVlcnkuc3VwcG9ydC5sZWFkaW5nV2hpdGVzcGFjZSB8fCAhcmxlYWRpbmdXaGl0ZXNwYWNlLnRlc3QoIHZhbHVlICkgKSAmJlxuXHRcdFx0XHQhd3JhcE1hcFsgKCBydGFnTmFtZS5leGVjKCB2YWx1ZSApIHx8IFtcIlwiLCBcIlwiXSApWzFdLnRvTG93ZXJDYXNlKCkgXSApIHtcblxuXHRcdFx0XHR2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoIHJ4aHRtbFRhZywgXCI8JDE+PC8kMj5cIiApO1xuXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0Zm9yICg7IGkgPCBsOyBpKysgKSB7XG5cdFx0XHRcdFx0XHQvLyBSZW1vdmUgZWxlbWVudCBub2RlcyBhbmQgcHJldmVudCBtZW1vcnkgbGVha3Ncblx0XHRcdFx0XHRcdGVsZW0gPSB0aGlzW2ldIHx8IHt9O1xuXHRcdFx0XHRcdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAxICkge1xuXHRcdFx0XHRcdFx0XHRqUXVlcnkuY2xlYW5EYXRhKCBlbGVtLmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcIipcIiApICk7XG5cdFx0XHRcdFx0XHRcdGVsZW0uaW5uZXJIVE1MID0gdmFsdWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0ZWxlbSA9IDA7XG5cblx0XHRcdFx0Ly8gSWYgdXNpbmcgaW5uZXJIVE1MIHRocm93cyBhbiBleGNlcHRpb24sIHVzZSB0aGUgZmFsbGJhY2sgbWV0aG9kXG5cdFx0XHRcdH0gY2F0Y2goZSkge31cblx0XHRcdH1cblxuXHRcdFx0aWYgKCBlbGVtICkge1xuXHRcdFx0XHR0aGlzLmVtcHR5KCkuYXBwZW5kKCB2YWx1ZSApO1xuXHRcdFx0fVxuXHRcdH0sIG51bGwsIHZhbHVlLCBhcmd1bWVudHMubGVuZ3RoICk7XG5cdH0sXG5cblx0cmVwbGFjZVdpdGg6IGZ1bmN0aW9uKCB2YWx1ZSApIHtcblx0XHRpZiAoICFpc0Rpc2Nvbm5lY3RlZCggdGhpc1swXSApICkge1xuXHRcdFx0Ly8gTWFrZSBzdXJlIHRoYXQgdGhlIGVsZW1lbnRzIGFyZSByZW1vdmVkIGZyb20gdGhlIERPTSBiZWZvcmUgdGhleSBhcmUgaW5zZXJ0ZWRcblx0XHRcdC8vIHRoaXMgY2FuIGhlbHAgZml4IHJlcGxhY2luZyBhIHBhcmVudCB3aXRoIGNoaWxkIGVsZW1lbnRzXG5cdFx0XHRpZiAoIGpRdWVyeS5pc0Z1bmN0aW9uKCB2YWx1ZSApICkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKGkpIHtcblx0XHRcdFx0XHR2YXIgc2VsZiA9IGpRdWVyeSh0aGlzKSwgb2xkID0gc2VsZi5odG1sKCk7XG5cdFx0XHRcdFx0c2VsZi5yZXBsYWNlV2l0aCggdmFsdWUuY2FsbCggdGhpcywgaSwgb2xkICkgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggdHlwZW9mIHZhbHVlICE9PSBcInN0cmluZ1wiICkge1xuXHRcdFx0XHR2YWx1ZSA9IGpRdWVyeSggdmFsdWUgKS5kZXRhY2goKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIG5leHQgPSB0aGlzLm5leHRTaWJsaW5nLFxuXHRcdFx0XHRcdHBhcmVudCA9IHRoaXMucGFyZW50Tm9kZTtcblxuXHRcdFx0XHRqUXVlcnkoIHRoaXMgKS5yZW1vdmUoKTtcblxuXHRcdFx0XHRpZiAoIG5leHQgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5KG5leHQpLmJlZm9yZSggdmFsdWUgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRqUXVlcnkocGFyZW50KS5hcHBlbmQoIHZhbHVlICk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLmxlbmd0aCA/XG5cdFx0XHR0aGlzLnB1c2hTdGFjayggalF1ZXJ5KGpRdWVyeS5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlKCkgOiB2YWx1ZSksIFwicmVwbGFjZVdpdGhcIiwgdmFsdWUgKSA6XG5cdFx0XHR0aGlzO1xuXHR9LFxuXG5cdGRldGFjaDogZnVuY3Rpb24oIHNlbGVjdG9yICkge1xuXHRcdHJldHVybiB0aGlzLnJlbW92ZSggc2VsZWN0b3IsIHRydWUgKTtcblx0fSxcblxuXHRkb21NYW5pcDogZnVuY3Rpb24oIGFyZ3MsIHRhYmxlLCBjYWxsYmFjayApIHtcblxuXHRcdC8vIEZsYXR0ZW4gYW55IG5lc3RlZCBhcnJheXNcblx0XHRhcmdzID0gW10uY29uY2F0LmFwcGx5KCBbXSwgYXJncyApO1xuXG5cdFx0dmFyIHJlc3VsdHMsIGZpcnN0LCBmcmFnbWVudCwgaU5vQ2xvbmUsXG5cdFx0XHRpID0gMCxcblx0XHRcdHZhbHVlID0gYXJnc1swXSxcblx0XHRcdHNjcmlwdHMgPSBbXSxcblx0XHRcdGwgPSB0aGlzLmxlbmd0aDtcblxuXHRcdC8vIFdlIGNhbid0IGNsb25lTm9kZSBmcmFnbWVudHMgdGhhdCBjb250YWluIGNoZWNrZWQsIGluIFdlYktpdFxuXHRcdGlmICggIWpRdWVyeS5zdXBwb3J0LmNoZWNrQ2xvbmUgJiYgbCA+IDEgJiYgdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmIHJjaGVja2VkLnRlc3QoIHZhbHVlICkgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRqUXVlcnkodGhpcykuZG9tTWFuaXAoIGFyZ3MsIHRhYmxlLCBjYWxsYmFjayApO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbih2YWx1ZSkgKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKGkpIHtcblx0XHRcdFx0dmFyIHNlbGYgPSBqUXVlcnkodGhpcyk7XG5cdFx0XHRcdGFyZ3NbMF0gPSB2YWx1ZS5jYWxsKCB0aGlzLCBpLCB0YWJsZSA/IHNlbGYuaHRtbCgpIDogdW5kZWZpbmVkICk7XG5cdFx0XHRcdHNlbGYuZG9tTWFuaXAoIGFyZ3MsIHRhYmxlLCBjYWxsYmFjayApO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCB0aGlzWzBdICkge1xuXHRcdFx0cmVzdWx0cyA9IGpRdWVyeS5idWlsZEZyYWdtZW50KCBhcmdzLCB0aGlzLCBzY3JpcHRzICk7XG5cdFx0XHRmcmFnbWVudCA9IHJlc3VsdHMuZnJhZ21lbnQ7XG5cdFx0XHRmaXJzdCA9IGZyYWdtZW50LmZpcnN0Q2hpbGQ7XG5cblx0XHRcdGlmICggZnJhZ21lbnQuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEgKSB7XG5cdFx0XHRcdGZyYWdtZW50ID0gZmlyc3Q7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggZmlyc3QgKSB7XG5cdFx0XHRcdHRhYmxlID0gdGFibGUgJiYgalF1ZXJ5Lm5vZGVOYW1lKCBmaXJzdCwgXCJ0clwiICk7XG5cblx0XHRcdFx0Ly8gVXNlIHRoZSBvcmlnaW5hbCBmcmFnbWVudCBmb3IgdGhlIGxhc3QgaXRlbSBpbnN0ZWFkIG9mIHRoZSBmaXJzdCBiZWNhdXNlIGl0IGNhbiBlbmQgdXBcblx0XHRcdFx0Ly8gYmVpbmcgZW1wdGllZCBpbmNvcnJlY3RseSBpbiBjZXJ0YWluIHNpdHVhdGlvbnMgKCM4MDcwKS5cblx0XHRcdFx0Ly8gRnJhZ21lbnRzIGZyb20gdGhlIGZyYWdtZW50IGNhY2hlIG11c3QgYWx3YXlzIGJlIGNsb25lZCBhbmQgbmV2ZXIgdXNlZCBpbiBwbGFjZS5cblx0XHRcdFx0Zm9yICggaU5vQ2xvbmUgPSByZXN1bHRzLmNhY2hlYWJsZSB8fCBsIC0gMTsgaSA8IGw7IGkrKyApIHtcblx0XHRcdFx0XHRjYWxsYmFjay5jYWxsKFxuXHRcdFx0XHRcdFx0dGFibGUgJiYgalF1ZXJ5Lm5vZGVOYW1lKCB0aGlzW2ldLCBcInRhYmxlXCIgKSA/XG5cdFx0XHRcdFx0XHRcdGZpbmRPckFwcGVuZCggdGhpc1tpXSwgXCJ0Ym9keVwiICkgOlxuXHRcdFx0XHRcdFx0XHR0aGlzW2ldLFxuXHRcdFx0XHRcdFx0aSA9PT0gaU5vQ2xvbmUgP1xuXHRcdFx0XHRcdFx0XHRmcmFnbWVudCA6XG5cdFx0XHRcdFx0XHRcdGpRdWVyeS5jbG9uZSggZnJhZ21lbnQsIHRydWUsIHRydWUgKVxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gRml4ICMxMTgwOTogQXZvaWQgbGVha2luZyBtZW1vcnlcblx0XHRcdGZyYWdtZW50ID0gZmlyc3QgPSBudWxsO1xuXG5cdFx0XHRpZiAoIHNjcmlwdHMubGVuZ3RoICkge1xuXHRcdFx0XHRqUXVlcnkuZWFjaCggc2NyaXB0cywgZnVuY3Rpb24oIGksIGVsZW0gKSB7XG5cdFx0XHRcdFx0aWYgKCBlbGVtLnNyYyApIHtcblx0XHRcdFx0XHRcdGlmICggalF1ZXJ5LmFqYXggKSB7XG5cdFx0XHRcdFx0XHRcdGpRdWVyeS5hamF4KHtcblx0XHRcdFx0XHRcdFx0XHR1cmw6IGVsZW0uc3JjLFxuXHRcdFx0XHRcdFx0XHRcdHR5cGU6IFwiR0VUXCIsXG5cdFx0XHRcdFx0XHRcdFx0ZGF0YVR5cGU6IFwic2NyaXB0XCIsXG5cdFx0XHRcdFx0XHRcdFx0YXN5bmM6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdGdsb2JhbDogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdFx0XCJ0aHJvd3NcIjogdHJ1ZVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGpRdWVyeS5lcnJvcihcIm5vIGFqYXhcIik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGpRdWVyeS5nbG9iYWxFdmFsKCAoIGVsZW0udGV4dCB8fCBlbGVtLnRleHRDb250ZW50IHx8IGVsZW0uaW5uZXJIVE1MIHx8IFwiXCIgKS5yZXBsYWNlKCByY2xlYW5TY3JpcHQsIFwiXCIgKSApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggZWxlbS5wYXJlbnROb2RlICkge1xuXHRcdFx0XHRcdFx0ZWxlbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKCBlbGVtICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxufSk7XG5cbmZ1bmN0aW9uIGZpbmRPckFwcGVuZCggZWxlbSwgdGFnICkge1xuXHRyZXR1cm4gZWxlbS5nZXRFbGVtZW50c0J5VGFnTmFtZSggdGFnIClbMF0gfHwgZWxlbS5hcHBlbmRDaGlsZCggZWxlbS5vd25lckRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIHRhZyApICk7XG59XG5cbmZ1bmN0aW9uIGNsb25lQ29weUV2ZW50KCBzcmMsIGRlc3QgKSB7XG5cblx0aWYgKCBkZXN0Lm5vZGVUeXBlICE9PSAxIHx8ICFqUXVlcnkuaGFzRGF0YSggc3JjICkgKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dmFyIHR5cGUsIGksIGwsXG5cdFx0b2xkRGF0YSA9IGpRdWVyeS5fZGF0YSggc3JjICksXG5cdFx0Y3VyRGF0YSA9IGpRdWVyeS5fZGF0YSggZGVzdCwgb2xkRGF0YSApLFxuXHRcdGV2ZW50cyA9IG9sZERhdGEuZXZlbnRzO1xuXG5cdGlmICggZXZlbnRzICkge1xuXHRcdGRlbGV0ZSBjdXJEYXRhLmhhbmRsZTtcblx0XHRjdXJEYXRhLmV2ZW50cyA9IHt9O1xuXG5cdFx0Zm9yICggdHlwZSBpbiBldmVudHMgKSB7XG5cdFx0XHRmb3IgKCBpID0gMCwgbCA9IGV2ZW50c1sgdHlwZSBdLmxlbmd0aDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdFx0alF1ZXJ5LmV2ZW50LmFkZCggZGVzdCwgdHlwZSwgZXZlbnRzWyB0eXBlIF1bIGkgXSApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIG1ha2UgdGhlIGNsb25lZCBwdWJsaWMgZGF0YSBvYmplY3QgYSBjb3B5IGZyb20gdGhlIG9yaWdpbmFsXG5cdGlmICggY3VyRGF0YS5kYXRhICkge1xuXHRcdGN1ckRhdGEuZGF0YSA9IGpRdWVyeS5leHRlbmQoIHt9LCBjdXJEYXRhLmRhdGEgKTtcblx0fVxufVxuXG5mdW5jdGlvbiBjbG9uZUZpeEF0dHJpYnV0ZXMoIHNyYywgZGVzdCApIHtcblx0dmFyIG5vZGVOYW1lO1xuXG5cdC8vIFdlIGRvIG5vdCBuZWVkIHRvIGRvIGFueXRoaW5nIGZvciBub24tRWxlbWVudHNcblx0aWYgKCBkZXN0Lm5vZGVUeXBlICE9PSAxICkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdC8vIGNsZWFyQXR0cmlidXRlcyByZW1vdmVzIHRoZSBhdHRyaWJ1dGVzLCB3aGljaCB3ZSBkb24ndCB3YW50LFxuXHQvLyBidXQgYWxzbyByZW1vdmVzIHRoZSBhdHRhY2hFdmVudCBldmVudHMsIHdoaWNoIHdlICpkbyogd2FudFxuXHRpZiAoIGRlc3QuY2xlYXJBdHRyaWJ1dGVzICkge1xuXHRcdGRlc3QuY2xlYXJBdHRyaWJ1dGVzKCk7XG5cdH1cblxuXHQvLyBtZXJnZUF0dHJpYnV0ZXMsIGluIGNvbnRyYXN0LCBvbmx5IG1lcmdlcyBiYWNrIG9uIHRoZVxuXHQvLyBvcmlnaW5hbCBhdHRyaWJ1dGVzLCBub3QgdGhlIGV2ZW50c1xuXHRpZiAoIGRlc3QubWVyZ2VBdHRyaWJ1dGVzICkge1xuXHRcdGRlc3QubWVyZ2VBdHRyaWJ1dGVzKCBzcmMgKTtcblx0fVxuXG5cdG5vZGVOYW1lID0gZGVzdC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuXG5cdGlmICggbm9kZU5hbWUgPT09IFwib2JqZWN0XCIgKSB7XG5cdFx0Ly8gSUU2LTEwIGltcHJvcGVybHkgY2xvbmVzIGNoaWxkcmVuIG9mIG9iamVjdCBlbGVtZW50cyB1c2luZyBjbGFzc2lkLlxuXHRcdC8vIElFMTAgdGhyb3dzIE5vTW9kaWZpY2F0aW9uQWxsb3dlZEVycm9yIGlmIHBhcmVudCBpcyBudWxsLCAjMTIxMzIuXG5cdFx0aWYgKCBkZXN0LnBhcmVudE5vZGUgKSB7XG5cdFx0XHRkZXN0Lm91dGVySFRNTCA9IHNyYy5vdXRlckhUTUw7XG5cdFx0fVxuXG5cdFx0Ly8gVGhpcyBwYXRoIGFwcGVhcnMgdW5hdm9pZGFibGUgZm9yIElFOS4gV2hlbiBjbG9uaW5nIGFuIG9iamVjdFxuXHRcdC8vIGVsZW1lbnQgaW4gSUU5LCB0aGUgb3V0ZXJIVE1MIHN0cmF0ZWd5IGFib3ZlIGlzIG5vdCBzdWZmaWNpZW50LlxuXHRcdC8vIElmIHRoZSBzcmMgaGFzIGlubmVySFRNTCBhbmQgdGhlIGRlc3RpbmF0aW9uIGRvZXMgbm90LFxuXHRcdC8vIGNvcHkgdGhlIHNyYy5pbm5lckhUTUwgaW50byB0aGUgZGVzdC5pbm5lckhUTUwuICMxMDMyNFxuXHRcdGlmICggalF1ZXJ5LnN1cHBvcnQuaHRtbDVDbG9uZSAmJiAoc3JjLmlubmVySFRNTCAmJiAhalF1ZXJ5LnRyaW0oZGVzdC5pbm5lckhUTUwpKSApIHtcblx0XHRcdGRlc3QuaW5uZXJIVE1MID0gc3JjLmlubmVySFRNTDtcblx0XHR9XG5cblx0fSBlbHNlIGlmICggbm9kZU5hbWUgPT09IFwiaW5wdXRcIiAmJiByY2hlY2thYmxlVHlwZS50ZXN0KCBzcmMudHlwZSApICkge1xuXHRcdC8vIElFNi04IGZhaWxzIHRvIHBlcnNpc3QgdGhlIGNoZWNrZWQgc3RhdGUgb2YgYSBjbG9uZWQgY2hlY2tib3hcblx0XHQvLyBvciByYWRpbyBidXR0b24uIFdvcnNlLCBJRTYtNyBmYWlsIHRvIGdpdmUgdGhlIGNsb25lZCBlbGVtZW50XG5cdFx0Ly8gYSBjaGVja2VkIGFwcGVhcmFuY2UgaWYgdGhlIGRlZmF1bHRDaGVja2VkIHZhbHVlIGlzbid0IGFsc28gc2V0XG5cblx0XHRkZXN0LmRlZmF1bHRDaGVja2VkID0gZGVzdC5jaGVja2VkID0gc3JjLmNoZWNrZWQ7XG5cblx0XHQvLyBJRTYtNyBnZXQgY29uZnVzZWQgYW5kIGVuZCB1cCBzZXR0aW5nIHRoZSB2YWx1ZSBvZiBhIGNsb25lZFxuXHRcdC8vIGNoZWNrYm94L3JhZGlvIGJ1dHRvbiB0byBhbiBlbXB0eSBzdHJpbmcgaW5zdGVhZCBvZiBcIm9uXCJcblx0XHRpZiAoIGRlc3QudmFsdWUgIT09IHNyYy52YWx1ZSApIHtcblx0XHRcdGRlc3QudmFsdWUgPSBzcmMudmFsdWU7XG5cdFx0fVxuXG5cdC8vIElFNi04IGZhaWxzIHRvIHJldHVybiB0aGUgc2VsZWN0ZWQgb3B0aW9uIHRvIHRoZSBkZWZhdWx0IHNlbGVjdGVkXG5cdC8vIHN0YXRlIHdoZW4gY2xvbmluZyBvcHRpb25zXG5cdH0gZWxzZSBpZiAoIG5vZGVOYW1lID09PSBcIm9wdGlvblwiICkge1xuXHRcdGRlc3Quc2VsZWN0ZWQgPSBzcmMuZGVmYXVsdFNlbGVjdGVkO1xuXG5cdC8vIElFNi04IGZhaWxzIHRvIHNldCB0aGUgZGVmYXVsdFZhbHVlIHRvIHRoZSBjb3JyZWN0IHZhbHVlIHdoZW5cblx0Ly8gY2xvbmluZyBvdGhlciB0eXBlcyBvZiBpbnB1dCBmaWVsZHNcblx0fSBlbHNlIGlmICggbm9kZU5hbWUgPT09IFwiaW5wdXRcIiB8fCBub2RlTmFtZSA9PT0gXCJ0ZXh0YXJlYVwiICkge1xuXHRcdGRlc3QuZGVmYXVsdFZhbHVlID0gc3JjLmRlZmF1bHRWYWx1ZTtcblxuXHQvLyBJRSBibGFua3MgY29udGVudHMgd2hlbiBjbG9uaW5nIHNjcmlwdHNcblx0fSBlbHNlIGlmICggbm9kZU5hbWUgPT09IFwic2NyaXB0XCIgJiYgZGVzdC50ZXh0ICE9PSBzcmMudGV4dCApIHtcblx0XHRkZXN0LnRleHQgPSBzcmMudGV4dDtcblx0fVxuXG5cdC8vIEV2ZW50IGRhdGEgZ2V0cyByZWZlcmVuY2VkIGluc3RlYWQgb2YgY29waWVkIGlmIHRoZSBleHBhbmRvXG5cdC8vIGdldHMgY29waWVkIHRvb1xuXHRkZXN0LnJlbW92ZUF0dHJpYnV0ZSggalF1ZXJ5LmV4cGFuZG8gKTtcbn1cblxualF1ZXJ5LmJ1aWxkRnJhZ21lbnQgPSBmdW5jdGlvbiggYXJncywgY29udGV4dCwgc2NyaXB0cyApIHtcblx0dmFyIGZyYWdtZW50LCBjYWNoZWFibGUsIGNhY2hlaGl0LFxuXHRcdGZpcnN0ID0gYXJnc1sgMCBdO1xuXG5cdC8vIFNldCBjb250ZXh0IGZyb20gd2hhdCBtYXkgY29tZSBpbiBhcyB1bmRlZmluZWQgb3IgYSBqUXVlcnkgY29sbGVjdGlvbiBvciBhIG5vZGVcblx0Ly8gVXBkYXRlZCB0byBmaXggIzEyMjY2IHdoZXJlIGFjY2Vzc2luZyBjb250ZXh0WzBdIGNvdWxkIHRocm93IGFuIGV4Y2VwdGlvbiBpbiBJRTkvMTAgJlxuXHQvLyBhbHNvIGRvdWJsZXMgYXMgZml4IGZvciAjODk1MCB3aGVyZSBwbGFpbiBvYmplY3RzIGNhdXNlZCBjcmVhdGVEb2N1bWVudEZyYWdtZW50IGV4Y2VwdGlvblxuXHRjb250ZXh0ID0gY29udGV4dCB8fCBkb2N1bWVudDtcblx0Y29udGV4dCA9ICFjb250ZXh0Lm5vZGVUeXBlICYmIGNvbnRleHRbMF0gfHwgY29udGV4dDtcblx0Y29udGV4dCA9IGNvbnRleHQub3duZXJEb2N1bWVudCB8fCBjb250ZXh0O1xuXG5cdC8vIE9ubHkgY2FjaGUgXCJzbWFsbFwiICgxLzIgS0IpIEhUTUwgc3RyaW5ncyB0aGF0IGFyZSBhc3NvY2lhdGVkIHdpdGggdGhlIG1haW4gZG9jdW1lbnRcblx0Ly8gQ2xvbmluZyBvcHRpb25zIGxvc2VzIHRoZSBzZWxlY3RlZCBzdGF0ZSwgc28gZG9uJ3QgY2FjaGUgdGhlbVxuXHQvLyBJRSA2IGRvZXNuJ3QgbGlrZSBpdCB3aGVuIHlvdSBwdXQgPG9iamVjdD4gb3IgPGVtYmVkPiBlbGVtZW50cyBpbiBhIGZyYWdtZW50XG5cdC8vIEFsc28sIFdlYktpdCBkb2VzIG5vdCBjbG9uZSAnY2hlY2tlZCcgYXR0cmlidXRlcyBvbiBjbG9uZU5vZGUsIHNvIGRvbid0IGNhY2hlXG5cdC8vIExhc3RseSwgSUU2LDcsOCB3aWxsIG5vdCBjb3JyZWN0bHkgcmV1c2UgY2FjaGVkIGZyYWdtZW50cyB0aGF0IHdlcmUgY3JlYXRlZCBmcm9tIHVua25vd24gZWxlbXMgIzEwNTAxXG5cdGlmICggYXJncy5sZW5ndGggPT09IDEgJiYgdHlwZW9mIGZpcnN0ID09PSBcInN0cmluZ1wiICYmIGZpcnN0Lmxlbmd0aCA8IDUxMiAmJiBjb250ZXh0ID09PSBkb2N1bWVudCAmJlxuXHRcdGZpcnN0LmNoYXJBdCgwKSA9PT0gXCI8XCIgJiYgIXJub2NhY2hlLnRlc3QoIGZpcnN0ICkgJiZcblx0XHQoalF1ZXJ5LnN1cHBvcnQuY2hlY2tDbG9uZSB8fCAhcmNoZWNrZWQudGVzdCggZmlyc3QgKSkgJiZcblx0XHQoalF1ZXJ5LnN1cHBvcnQuaHRtbDVDbG9uZSB8fCAhcm5vc2hpbWNhY2hlLnRlc3QoIGZpcnN0ICkpICkge1xuXG5cdFx0Ly8gTWFyayBjYWNoZWFibGUgYW5kIGxvb2sgZm9yIGEgaGl0XG5cdFx0Y2FjaGVhYmxlID0gdHJ1ZTtcblx0XHRmcmFnbWVudCA9IGpRdWVyeS5mcmFnbWVudHNbIGZpcnN0IF07XG5cdFx0Y2FjaGVoaXQgPSBmcmFnbWVudCAhPT0gdW5kZWZpbmVkO1xuXHR9XG5cblx0aWYgKCAhZnJhZ21lbnQgKSB7XG5cdFx0ZnJhZ21lbnQgPSBjb250ZXh0LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblx0XHRqUXVlcnkuY2xlYW4oIGFyZ3MsIGNvbnRleHQsIGZyYWdtZW50LCBzY3JpcHRzICk7XG5cblx0XHQvLyBVcGRhdGUgdGhlIGNhY2hlLCBidXQgb25seSBzdG9yZSBmYWxzZVxuXHRcdC8vIHVubGVzcyB0aGlzIGlzIGEgc2Vjb25kIHBhcnNpbmcgb2YgdGhlIHNhbWUgY29udGVudFxuXHRcdGlmICggY2FjaGVhYmxlICkge1xuXHRcdFx0alF1ZXJ5LmZyYWdtZW50c1sgZmlyc3QgXSA9IGNhY2hlaGl0ICYmIGZyYWdtZW50O1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7IGZyYWdtZW50OiBmcmFnbWVudCwgY2FjaGVhYmxlOiBjYWNoZWFibGUgfTtcbn07XG5cbmpRdWVyeS5mcmFnbWVudHMgPSB7fTtcblxualF1ZXJ5LmVhY2goe1xuXHRhcHBlbmRUbzogXCJhcHBlbmRcIixcblx0cHJlcGVuZFRvOiBcInByZXBlbmRcIixcblx0aW5zZXJ0QmVmb3JlOiBcImJlZm9yZVwiLFxuXHRpbnNlcnRBZnRlcjogXCJhZnRlclwiLFxuXHRyZXBsYWNlQWxsOiBcInJlcGxhY2VXaXRoXCJcbn0sIGZ1bmN0aW9uKCBuYW1lLCBvcmlnaW5hbCApIHtcblx0alF1ZXJ5LmZuWyBuYW1lIF0gPSBmdW5jdGlvbiggc2VsZWN0b3IgKSB7XG5cdFx0dmFyIGVsZW1zLFxuXHRcdFx0aSA9IDAsXG5cdFx0XHRyZXQgPSBbXSxcblx0XHRcdGluc2VydCA9IGpRdWVyeSggc2VsZWN0b3IgKSxcblx0XHRcdGwgPSBpbnNlcnQubGVuZ3RoLFxuXHRcdFx0cGFyZW50ID0gdGhpcy5sZW5ndGggPT09IDEgJiYgdGhpc1swXS5wYXJlbnROb2RlO1xuXG5cdFx0aWYgKCAocGFyZW50ID09IG51bGwgfHwgcGFyZW50ICYmIHBhcmVudC5ub2RlVHlwZSA9PT0gMTEgJiYgcGFyZW50LmNoaWxkTm9kZXMubGVuZ3RoID09PSAxKSAmJiBsID09PSAxICkge1xuXHRcdFx0aW5zZXJ0WyBvcmlnaW5hbCBdKCB0aGlzWzBdICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0Zm9yICggOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0XHRlbGVtcyA9ICggaSA+IDAgPyB0aGlzLmNsb25lKHRydWUpIDogdGhpcyApLmdldCgpO1xuXHRcdFx0XHRqUXVlcnkoIGluc2VydFtpXSApWyBvcmlnaW5hbCBdKCBlbGVtcyApO1xuXHRcdFx0XHRyZXQgPSByZXQuY29uY2F0KCBlbGVtcyApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5wdXNoU3RhY2soIHJldCwgbmFtZSwgaW5zZXJ0LnNlbGVjdG9yICk7XG5cdFx0fVxuXHR9O1xufSk7XG5cbmZ1bmN0aW9uIGdldEFsbCggZWxlbSApIHtcblx0aWYgKCB0eXBlb2YgZWxlbS5nZXRFbGVtZW50c0J5VGFnTmFtZSAhPT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRyZXR1cm4gZWxlbS5nZXRFbGVtZW50c0J5VGFnTmFtZSggXCIqXCIgKTtcblxuXHR9IGVsc2UgaWYgKCB0eXBlb2YgZWxlbS5xdWVyeVNlbGVjdG9yQWxsICE9PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdHJldHVybiBlbGVtLnF1ZXJ5U2VsZWN0b3JBbGwoIFwiKlwiICk7XG5cblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gW107XG5cdH1cbn1cblxuLy8gVXNlZCBpbiBjbGVhbiwgZml4ZXMgdGhlIGRlZmF1bHRDaGVja2VkIHByb3BlcnR5XG5mdW5jdGlvbiBmaXhEZWZhdWx0Q2hlY2tlZCggZWxlbSApIHtcblx0aWYgKCByY2hlY2thYmxlVHlwZS50ZXN0KCBlbGVtLnR5cGUgKSApIHtcblx0XHRlbGVtLmRlZmF1bHRDaGVja2VkID0gZWxlbS5jaGVja2VkO1xuXHR9XG59XG5cbmpRdWVyeS5leHRlbmQoe1xuXHRjbG9uZTogZnVuY3Rpb24oIGVsZW0sIGRhdGFBbmRFdmVudHMsIGRlZXBEYXRhQW5kRXZlbnRzICkge1xuXHRcdHZhciBzcmNFbGVtZW50cyxcblx0XHRcdGRlc3RFbGVtZW50cyxcblx0XHRcdGksXG5cdFx0XHRjbG9uZTtcblxuXHRcdGlmICggalF1ZXJ5LnN1cHBvcnQuaHRtbDVDbG9uZSB8fCBqUXVlcnkuaXNYTUxEb2MoZWxlbSkgfHwgIXJub3NoaW1jYWNoZS50ZXN0KCBcIjxcIiArIGVsZW0ubm9kZU5hbWUgKyBcIj5cIiApICkge1xuXHRcdFx0Y2xvbmUgPSBlbGVtLmNsb25lTm9kZSggdHJ1ZSApO1xuXG5cdFx0Ly8gSUU8PTggZG9lcyBub3QgcHJvcGVybHkgY2xvbmUgZGV0YWNoZWQsIHVua25vd24gZWxlbWVudCBub2Rlc1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmcmFnbWVudERpdi5pbm5lckhUTUwgPSBlbGVtLm91dGVySFRNTDtcblx0XHRcdGZyYWdtZW50RGl2LnJlbW92ZUNoaWxkKCBjbG9uZSA9IGZyYWdtZW50RGl2LmZpcnN0Q2hpbGQgKTtcblx0XHR9XG5cblx0XHRpZiAoICghalF1ZXJ5LnN1cHBvcnQubm9DbG9uZUV2ZW50IHx8ICFqUXVlcnkuc3VwcG9ydC5ub0Nsb25lQ2hlY2tlZCkgJiZcblx0XHRcdFx0KGVsZW0ubm9kZVR5cGUgPT09IDEgfHwgZWxlbS5ub2RlVHlwZSA9PT0gMTEpICYmICFqUXVlcnkuaXNYTUxEb2MoZWxlbSkgKSB7XG5cdFx0XHQvLyBJRSBjb3BpZXMgZXZlbnRzIGJvdW5kIHZpYSBhdHRhY2hFdmVudCB3aGVuIHVzaW5nIGNsb25lTm9kZS5cblx0XHRcdC8vIENhbGxpbmcgZGV0YWNoRXZlbnQgb24gdGhlIGNsb25lIHdpbGwgYWxzbyByZW1vdmUgdGhlIGV2ZW50c1xuXHRcdFx0Ly8gZnJvbSB0aGUgb3JpZ2luYWwuIEluIG9yZGVyIHRvIGdldCBhcm91bmQgdGhpcywgd2UgdXNlIHNvbWVcblx0XHRcdC8vIHByb3ByaWV0YXJ5IG1ldGhvZHMgdG8gY2xlYXIgdGhlIGV2ZW50cy4gVGhhbmtzIHRvIE1vb1Rvb2xzXG5cdFx0XHQvLyBndXlzIGZvciB0aGlzIGhvdG5lc3MuXG5cblx0XHRcdGNsb25lRml4QXR0cmlidXRlcyggZWxlbSwgY2xvbmUgKTtcblxuXHRcdFx0Ly8gVXNpbmcgU2l6emxlIGhlcmUgaXMgY3Jhenkgc2xvdywgc28gd2UgdXNlIGdldEVsZW1lbnRzQnlUYWdOYW1lIGluc3RlYWRcblx0XHRcdHNyY0VsZW1lbnRzID0gZ2V0QWxsKCBlbGVtICk7XG5cdFx0XHRkZXN0RWxlbWVudHMgPSBnZXRBbGwoIGNsb25lICk7XG5cblx0XHRcdC8vIFdlaXJkIGl0ZXJhdGlvbiBiZWNhdXNlIElFIHdpbGwgcmVwbGFjZSB0aGUgbGVuZ3RoIHByb3BlcnR5XG5cdFx0XHQvLyB3aXRoIGFuIGVsZW1lbnQgaWYgeW91IGFyZSBjbG9uaW5nIHRoZSBib2R5IGFuZCBvbmUgb2YgdGhlXG5cdFx0XHQvLyBlbGVtZW50cyBvbiB0aGUgcGFnZSBoYXMgYSBuYW1lIG9yIGlkIG9mIFwibGVuZ3RoXCJcblx0XHRcdGZvciAoIGkgPSAwOyBzcmNFbGVtZW50c1tpXTsgKytpICkge1xuXHRcdFx0XHQvLyBFbnN1cmUgdGhhdCB0aGUgZGVzdGluYXRpb24gbm9kZSBpcyBub3QgbnVsbDsgRml4ZXMgIzk1ODdcblx0XHRcdFx0aWYgKCBkZXN0RWxlbWVudHNbaV0gKSB7XG5cdFx0XHRcdFx0Y2xvbmVGaXhBdHRyaWJ1dGVzKCBzcmNFbGVtZW50c1tpXSwgZGVzdEVsZW1lbnRzW2ldICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBDb3B5IHRoZSBldmVudHMgZnJvbSB0aGUgb3JpZ2luYWwgdG8gdGhlIGNsb25lXG5cdFx0aWYgKCBkYXRhQW5kRXZlbnRzICkge1xuXHRcdFx0Y2xvbmVDb3B5RXZlbnQoIGVsZW0sIGNsb25lICk7XG5cblx0XHRcdGlmICggZGVlcERhdGFBbmRFdmVudHMgKSB7XG5cdFx0XHRcdHNyY0VsZW1lbnRzID0gZ2V0QWxsKCBlbGVtICk7XG5cdFx0XHRcdGRlc3RFbGVtZW50cyA9IGdldEFsbCggY2xvbmUgKTtcblxuXHRcdFx0XHRmb3IgKCBpID0gMDsgc3JjRWxlbWVudHNbaV07ICsraSApIHtcblx0XHRcdFx0XHRjbG9uZUNvcHlFdmVudCggc3JjRWxlbWVudHNbaV0sIGRlc3RFbGVtZW50c1tpXSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0c3JjRWxlbWVudHMgPSBkZXN0RWxlbWVudHMgPSBudWxsO1xuXG5cdFx0Ly8gUmV0dXJuIHRoZSBjbG9uZWQgc2V0XG5cdFx0cmV0dXJuIGNsb25lO1xuXHR9LFxuXG5cdGNsZWFuOiBmdW5jdGlvbiggZWxlbXMsIGNvbnRleHQsIGZyYWdtZW50LCBzY3JpcHRzICkge1xuXHRcdHZhciBpLCBqLCBlbGVtLCB0YWcsIHdyYXAsIGRlcHRoLCBkaXYsIGhhc0JvZHksIHRib2R5LCBsZW4sIGhhbmRsZVNjcmlwdCwganNUYWdzLFxuXHRcdFx0c2FmZSA9IGNvbnRleHQgPT09IGRvY3VtZW50ICYmIHNhZmVGcmFnbWVudCxcblx0XHRcdHJldCA9IFtdO1xuXG5cdFx0Ly8gRW5zdXJlIHRoYXQgY29udGV4dCBpcyBhIGRvY3VtZW50XG5cdFx0aWYgKCAhY29udGV4dCB8fCB0eXBlb2YgY29udGV4dC5jcmVhdGVEb2N1bWVudEZyYWdtZW50ID09PSBcInVuZGVmaW5lZFwiICkge1xuXHRcdFx0Y29udGV4dCA9IGRvY3VtZW50O1xuXHRcdH1cblxuXHRcdC8vIFVzZSB0aGUgYWxyZWFkeS1jcmVhdGVkIHNhZmUgZnJhZ21lbnQgaWYgY29udGV4dCBwZXJtaXRzXG5cdFx0Zm9yICggaSA9IDA7IChlbGVtID0gZWxlbXNbaV0pICE9IG51bGw7IGkrKyApIHtcblx0XHRcdGlmICggdHlwZW9mIGVsZW0gPT09IFwibnVtYmVyXCIgKSB7XG5cdFx0XHRcdGVsZW0gKz0gXCJcIjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAhZWxlbSApIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIENvbnZlcnQgaHRtbCBzdHJpbmcgaW50byBET00gbm9kZXNcblx0XHRcdGlmICggdHlwZW9mIGVsZW0gPT09IFwic3RyaW5nXCIgKSB7XG5cdFx0XHRcdGlmICggIXJodG1sLnRlc3QoIGVsZW0gKSApIHtcblx0XHRcdFx0XHRlbGVtID0gY29udGV4dC5jcmVhdGVUZXh0Tm9kZSggZWxlbSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIEVuc3VyZSBhIHNhZmUgY29udGFpbmVyIGluIHdoaWNoIHRvIHJlbmRlciB0aGUgaHRtbFxuXHRcdFx0XHRcdHNhZmUgPSBzYWZlIHx8IGNyZWF0ZVNhZmVGcmFnbWVudCggY29udGV4dCApO1xuXHRcdFx0XHRcdGRpdiA9IGNvbnRleHQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0XHRcdFx0XHRzYWZlLmFwcGVuZENoaWxkKCBkaXYgKTtcblxuXHRcdFx0XHRcdC8vIEZpeCBcIlhIVE1MXCItc3R5bGUgdGFncyBpbiBhbGwgYnJvd3NlcnNcblx0XHRcdFx0XHRlbGVtID0gZWxlbS5yZXBsYWNlKHJ4aHRtbFRhZywgXCI8JDE+PC8kMj5cIik7XG5cblx0XHRcdFx0XHQvLyBHbyB0byBodG1sIGFuZCBiYWNrLCB0aGVuIHBlZWwgb2ZmIGV4dHJhIHdyYXBwZXJzXG5cdFx0XHRcdFx0dGFnID0gKCBydGFnTmFtZS5leGVjKCBlbGVtICkgfHwgW1wiXCIsIFwiXCJdIClbMV0udG9Mb3dlckNhc2UoKTtcblx0XHRcdFx0XHR3cmFwID0gd3JhcE1hcFsgdGFnIF0gfHwgd3JhcE1hcC5fZGVmYXVsdDtcblx0XHRcdFx0XHRkZXB0aCA9IHdyYXBbMF07XG5cdFx0XHRcdFx0ZGl2LmlubmVySFRNTCA9IHdyYXBbMV0gKyBlbGVtICsgd3JhcFsyXTtcblxuXHRcdFx0XHRcdC8vIE1vdmUgdG8gdGhlIHJpZ2h0IGRlcHRoXG5cdFx0XHRcdFx0d2hpbGUgKCBkZXB0aC0tICkge1xuXHRcdFx0XHRcdFx0ZGl2ID0gZGl2Lmxhc3RDaGlsZDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBSZW1vdmUgSUUncyBhdXRvaW5zZXJ0ZWQgPHRib2R5PiBmcm9tIHRhYmxlIGZyYWdtZW50c1xuXHRcdFx0XHRcdGlmICggIWpRdWVyeS5zdXBwb3J0LnRib2R5ICkge1xuXG5cdFx0XHRcdFx0XHQvLyBTdHJpbmcgd2FzIGEgPHRhYmxlPiwgKm1heSogaGF2ZSBzcHVyaW91cyA8dGJvZHk+XG5cdFx0XHRcdFx0XHRoYXNCb2R5ID0gcnRib2R5LnRlc3QoZWxlbSk7XG5cdFx0XHRcdFx0XHRcdHRib2R5ID0gdGFnID09PSBcInRhYmxlXCIgJiYgIWhhc0JvZHkgP1xuXHRcdFx0XHRcdFx0XHRcdGRpdi5maXJzdENoaWxkICYmIGRpdi5maXJzdENoaWxkLmNoaWxkTm9kZXMgOlxuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gU3RyaW5nIHdhcyBhIGJhcmUgPHRoZWFkPiBvciA8dGZvb3Q+XG5cdFx0XHRcdFx0XHRcdFx0d3JhcFsxXSA9PT0gXCI8dGFibGU+XCIgJiYgIWhhc0JvZHkgP1xuXHRcdFx0XHRcdFx0XHRcdFx0ZGl2LmNoaWxkTm9kZXMgOlxuXHRcdFx0XHRcdFx0XHRcdFx0W107XG5cblx0XHRcdFx0XHRcdGZvciAoIGogPSB0Ym9keS5sZW5ndGggLSAxOyBqID49IDAgOyAtLWogKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggalF1ZXJ5Lm5vZGVOYW1lKCB0Ym9keVsgaiBdLCBcInRib2R5XCIgKSAmJiAhdGJvZHlbIGogXS5jaGlsZE5vZGVzLmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdFx0XHR0Ym9keVsgaiBdLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoIHRib2R5WyBqIF0gKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIElFIGNvbXBsZXRlbHkga2lsbHMgbGVhZGluZyB3aGl0ZXNwYWNlIHdoZW4gaW5uZXJIVE1MIGlzIHVzZWRcblx0XHRcdFx0XHRpZiAoICFqUXVlcnkuc3VwcG9ydC5sZWFkaW5nV2hpdGVzcGFjZSAmJiBybGVhZGluZ1doaXRlc3BhY2UudGVzdCggZWxlbSApICkge1xuXHRcdFx0XHRcdFx0ZGl2Lmluc2VydEJlZm9yZSggY29udGV4dC5jcmVhdGVUZXh0Tm9kZSggcmxlYWRpbmdXaGl0ZXNwYWNlLmV4ZWMoZWxlbSlbMF0gKSwgZGl2LmZpcnN0Q2hpbGQgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRlbGVtID0gZGl2LmNoaWxkTm9kZXM7XG5cblx0XHRcdFx0XHQvLyBUYWtlIG91dCBvZiBmcmFnbWVudCBjb250YWluZXIgKHdlIG5lZWQgYSBmcmVzaCBkaXYgZWFjaCB0aW1lKVxuXHRcdFx0XHRcdGRpdi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKCBkaXYgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGVsZW0ubm9kZVR5cGUgKSB7XG5cdFx0XHRcdHJldC5wdXNoKCBlbGVtICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRqUXVlcnkubWVyZ2UoIHJldCwgZWxlbSApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEZpeCAjMTEzNTY6IENsZWFyIGVsZW1lbnRzIGZyb20gc2FmZUZyYWdtZW50XG5cdFx0aWYgKCBkaXYgKSB7XG5cdFx0XHRlbGVtID0gZGl2ID0gc2FmZSA9IG51bGw7XG5cdFx0fVxuXG5cdFx0Ly8gUmVzZXQgZGVmYXVsdENoZWNrZWQgZm9yIGFueSByYWRpb3MgYW5kIGNoZWNrYm94ZXNcblx0XHQvLyBhYm91dCB0byBiZSBhcHBlbmRlZCB0byB0aGUgRE9NIGluIElFIDYvNyAoIzgwNjApXG5cdFx0aWYgKCAhalF1ZXJ5LnN1cHBvcnQuYXBwZW5kQ2hlY2tlZCApIHtcblx0XHRcdGZvciAoIGkgPSAwOyAoZWxlbSA9IHJldFtpXSkgIT0gbnVsbDsgaSsrICkge1xuXHRcdFx0XHRpZiAoIGpRdWVyeS5ub2RlTmFtZSggZWxlbSwgXCJpbnB1dFwiICkgKSB7XG5cdFx0XHRcdFx0Zml4RGVmYXVsdENoZWNrZWQoIGVsZW0gKTtcblx0XHRcdFx0fSBlbHNlIGlmICggdHlwZW9mIGVsZW0uZ2V0RWxlbWVudHNCeVRhZ05hbWUgIT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5LmdyZXAoIGVsZW0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnB1dFwiKSwgZml4RGVmYXVsdENoZWNrZWQgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEFwcGVuZCBlbGVtZW50cyB0byBhIHByb3ZpZGVkIGRvY3VtZW50IGZyYWdtZW50XG5cdFx0aWYgKCBmcmFnbWVudCApIHtcblx0XHRcdC8vIFNwZWNpYWwgaGFuZGxpbmcgb2YgZWFjaCBzY3JpcHQgZWxlbWVudFxuXHRcdFx0aGFuZGxlU2NyaXB0ID0gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0XHRcdC8vIENoZWNrIGlmIHdlIGNvbnNpZGVyIGl0IGV4ZWN1dGFibGVcblx0XHRcdFx0aWYgKCAhZWxlbS50eXBlIHx8IHJzY3JpcHRUeXBlLnRlc3QoIGVsZW0udHlwZSApICkge1xuXHRcdFx0XHRcdC8vIERldGFjaCB0aGUgc2NyaXB0IGFuZCBzdG9yZSBpdCBpbiB0aGUgc2NyaXB0cyBhcnJheSAoaWYgcHJvdmlkZWQpIG9yIHRoZSBmcmFnbWVudFxuXHRcdFx0XHRcdC8vIFJldHVybiB0cnV0aHkgdG8gaW5kaWNhdGUgdGhhdCBpdCBoYXMgYmVlbiBoYW5kbGVkXG5cdFx0XHRcdFx0cmV0dXJuIHNjcmlwdHMgP1xuXHRcdFx0XHRcdFx0c2NyaXB0cy5wdXNoKCBlbGVtLnBhcmVudE5vZGUgPyBlbGVtLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoIGVsZW0gKSA6IGVsZW0gKSA6XG5cdFx0XHRcdFx0XHRmcmFnbWVudC5hcHBlbmRDaGlsZCggZWxlbSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRmb3IgKCBpID0gMDsgKGVsZW0gPSByZXRbaV0pICE9IG51bGw7IGkrKyApIHtcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgd2UncmUgZG9uZSBhZnRlciBoYW5kbGluZyBhbiBleGVjdXRhYmxlIHNjcmlwdFxuXHRcdFx0XHRpZiAoICEoIGpRdWVyeS5ub2RlTmFtZSggZWxlbSwgXCJzY3JpcHRcIiApICYmIGhhbmRsZVNjcmlwdCggZWxlbSApICkgKSB7XG5cdFx0XHRcdFx0Ly8gQXBwZW5kIHRvIGZyYWdtZW50IGFuZCBoYW5kbGUgZW1iZWRkZWQgc2NyaXB0c1xuXHRcdFx0XHRcdGZyYWdtZW50LmFwcGVuZENoaWxkKCBlbGVtICk7XG5cdFx0XHRcdFx0aWYgKCB0eXBlb2YgZWxlbS5nZXRFbGVtZW50c0J5VGFnTmFtZSAhPT0gXCJ1bmRlZmluZWRcIiApIHtcblx0XHRcdFx0XHRcdC8vIGhhbmRsZVNjcmlwdCBhbHRlcnMgdGhlIERPTSwgc28gdXNlIGpRdWVyeS5tZXJnZSB0byBlbnN1cmUgc25hcHNob3QgaXRlcmF0aW9uXG5cdFx0XHRcdFx0XHRqc1RhZ3MgPSBqUXVlcnkuZ3JlcCggalF1ZXJ5Lm1lcmdlKCBbXSwgZWxlbS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNjcmlwdFwiKSApLCBoYW5kbGVTY3JpcHQgKTtcblxuXHRcdFx0XHRcdFx0Ly8gU3BsaWNlIHRoZSBzY3JpcHRzIGludG8gcmV0IGFmdGVyIHRoZWlyIGZvcm1lciBhbmNlc3RvciBhbmQgYWR2YW5jZSBvdXIgaW5kZXggYmV5b25kIHRoZW1cblx0XHRcdFx0XHRcdHJldC5zcGxpY2UuYXBwbHkoIHJldCwgW2kgKyAxLCAwXS5jb25jYXQoIGpzVGFncyApICk7XG5cdFx0XHRcdFx0XHRpICs9IGpzVGFncy5sZW5ndGg7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJldDtcblx0fSxcblxuXHRjbGVhbkRhdGE6IGZ1bmN0aW9uKCBlbGVtcywgLyogaW50ZXJuYWwgKi8gYWNjZXB0RGF0YSApIHtcblx0XHR2YXIgZGF0YSwgaWQsIGVsZW0sIHR5cGUsXG5cdFx0XHRpID0gMCxcblx0XHRcdGludGVybmFsS2V5ID0galF1ZXJ5LmV4cGFuZG8sXG5cdFx0XHRjYWNoZSA9IGpRdWVyeS5jYWNoZSxcblx0XHRcdGRlbGV0ZUV4cGFuZG8gPSBqUXVlcnkuc3VwcG9ydC5kZWxldGVFeHBhbmRvLFxuXHRcdFx0c3BlY2lhbCA9IGpRdWVyeS5ldmVudC5zcGVjaWFsO1xuXG5cdFx0Zm9yICggOyAoZWxlbSA9IGVsZW1zW2ldKSAhPSBudWxsOyBpKysgKSB7XG5cblx0XHRcdGlmICggYWNjZXB0RGF0YSB8fCBqUXVlcnkuYWNjZXB0RGF0YSggZWxlbSApICkge1xuXG5cdFx0XHRcdGlkID0gZWxlbVsgaW50ZXJuYWxLZXkgXTtcblx0XHRcdFx0ZGF0YSA9IGlkICYmIGNhY2hlWyBpZCBdO1xuXG5cdFx0XHRcdGlmICggZGF0YSApIHtcblx0XHRcdFx0XHRpZiAoIGRhdGEuZXZlbnRzICkge1xuXHRcdFx0XHRcdFx0Zm9yICggdHlwZSBpbiBkYXRhLmV2ZW50cyApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCBzcGVjaWFsWyB0eXBlIF0gKSB7XG5cdFx0XHRcdFx0XHRcdFx0alF1ZXJ5LmV2ZW50LnJlbW92ZSggZWxlbSwgdHlwZSApO1xuXG5cdFx0XHRcdFx0XHRcdC8vIFRoaXMgaXMgYSBzaG9ydGN1dCB0byBhdm9pZCBqUXVlcnkuZXZlbnQucmVtb3ZlJ3Mgb3ZlcmhlYWRcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRqUXVlcnkucmVtb3ZlRXZlbnQoIGVsZW0sIHR5cGUsIGRhdGEuaGFuZGxlICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBSZW1vdmUgY2FjaGUgb25seSBpZiBpdCB3YXMgbm90IGFscmVhZHkgcmVtb3ZlZCBieSBqUXVlcnkuZXZlbnQucmVtb3ZlXG5cdFx0XHRcdFx0aWYgKCBjYWNoZVsgaWQgXSApIHtcblxuXHRcdFx0XHRcdFx0ZGVsZXRlIGNhY2hlWyBpZCBdO1xuXG5cdFx0XHRcdFx0XHQvLyBJRSBkb2VzIG5vdCBhbGxvdyB1cyB0byBkZWxldGUgZXhwYW5kbyBwcm9wZXJ0aWVzIGZyb20gbm9kZXMsXG5cdFx0XHRcdFx0XHQvLyBub3IgZG9lcyBpdCBoYXZlIGEgcmVtb3ZlQXR0cmlidXRlIGZ1bmN0aW9uIG9uIERvY3VtZW50IG5vZGVzO1xuXHRcdFx0XHRcdFx0Ly8gd2UgbXVzdCBoYW5kbGUgYWxsIG9mIHRoZXNlIGNhc2VzXG5cdFx0XHRcdFx0XHRpZiAoIGRlbGV0ZUV4cGFuZG8gKSB7XG5cdFx0XHRcdFx0XHRcdGRlbGV0ZSBlbGVtWyBpbnRlcm5hbEtleSBdO1xuXG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBlbGVtLnJlbW92ZUF0dHJpYnV0ZSApIHtcblx0XHRcdFx0XHRcdFx0ZWxlbS5yZW1vdmVBdHRyaWJ1dGUoIGludGVybmFsS2V5ICk7XG5cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGVsZW1bIGludGVybmFsS2V5IF0gPSBudWxsO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRqUXVlcnkuZGVsZXRlZElkcy5wdXNoKCBpZCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufSk7XG4vLyBMaW1pdCBzY29wZSBwb2xsdXRpb24gZnJvbSBhbnkgZGVwcmVjYXRlZCBBUElcbihmdW5jdGlvbigpIHtcblxudmFyIG1hdGNoZWQsIGJyb3dzZXI7XG5cbi8vIFVzZSBvZiBqUXVlcnkuYnJvd3NlciBpcyBmcm93bmVkIHVwb24uXG4vLyBNb3JlIGRldGFpbHM6IGh0dHA6Ly9hcGkuanF1ZXJ5LmNvbS9qUXVlcnkuYnJvd3NlclxuLy8galF1ZXJ5LnVhTWF0Y2ggbWFpbnRhaW5lZCBmb3IgYmFjay1jb21wYXRcbmpRdWVyeS51YU1hdGNoID0gZnVuY3Rpb24oIHVhICkge1xuXHR1YSA9IHVhLnRvTG93ZXJDYXNlKCk7XG5cblx0dmFyIG1hdGNoID0gLyhjaHJvbWUpWyBcXC9dKFtcXHcuXSspLy5leGVjKCB1YSApIHx8XG5cdFx0Lyh3ZWJraXQpWyBcXC9dKFtcXHcuXSspLy5leGVjKCB1YSApIHx8XG5cdFx0LyhvcGVyYSkoPzouKnZlcnNpb258KVsgXFwvXShbXFx3Ll0rKS8uZXhlYyggdWEgKSB8fFxuXHRcdC8obXNpZSkgKFtcXHcuXSspLy5leGVjKCB1YSApIHx8XG5cdFx0dWEuaW5kZXhPZihcImNvbXBhdGlibGVcIikgPCAwICYmIC8obW96aWxsYSkoPzouKj8gcnY6KFtcXHcuXSspfCkvLmV4ZWMoIHVhICkgfHxcblx0XHRbXTtcblxuXHRyZXR1cm4ge1xuXHRcdGJyb3dzZXI6IG1hdGNoWyAxIF0gfHwgXCJcIixcblx0XHR2ZXJzaW9uOiBtYXRjaFsgMiBdIHx8IFwiMFwiXG5cdH07XG59O1xuXG5tYXRjaGVkID0galF1ZXJ5LnVhTWF0Y2goIG5hdmlnYXRvci51c2VyQWdlbnQgKTtcbmJyb3dzZXIgPSB7fTtcblxuaWYgKCBtYXRjaGVkLmJyb3dzZXIgKSB7XG5cdGJyb3dzZXJbIG1hdGNoZWQuYnJvd3NlciBdID0gdHJ1ZTtcblx0YnJvd3Nlci52ZXJzaW9uID0gbWF0Y2hlZC52ZXJzaW9uO1xufVxuXG4vLyBDaHJvbWUgaXMgV2Via2l0LCBidXQgV2Via2l0IGlzIGFsc28gU2FmYXJpLlxuaWYgKCBicm93c2VyLmNocm9tZSApIHtcblx0YnJvd3Nlci53ZWJraXQgPSB0cnVlO1xufSBlbHNlIGlmICggYnJvd3Nlci53ZWJraXQgKSB7XG5cdGJyb3dzZXIuc2FmYXJpID0gdHJ1ZTtcbn1cblxualF1ZXJ5LmJyb3dzZXIgPSBicm93c2VyO1xuXG5qUXVlcnkuc3ViID0gZnVuY3Rpb24oKSB7XG5cdGZ1bmN0aW9uIGpRdWVyeVN1Yiggc2VsZWN0b3IsIGNvbnRleHQgKSB7XG5cdFx0cmV0dXJuIG5ldyBqUXVlcnlTdWIuZm4uaW5pdCggc2VsZWN0b3IsIGNvbnRleHQgKTtcblx0fVxuXHRqUXVlcnkuZXh0ZW5kKCB0cnVlLCBqUXVlcnlTdWIsIHRoaXMgKTtcblx0alF1ZXJ5U3ViLnN1cGVyY2xhc3MgPSB0aGlzO1xuXHRqUXVlcnlTdWIuZm4gPSBqUXVlcnlTdWIucHJvdG90eXBlID0gdGhpcygpO1xuXHRqUXVlcnlTdWIuZm4uY29uc3RydWN0b3IgPSBqUXVlcnlTdWI7XG5cdGpRdWVyeVN1Yi5zdWIgPSB0aGlzLnN1Yjtcblx0alF1ZXJ5U3ViLmZuLmluaXQgPSBmdW5jdGlvbiBpbml0KCBzZWxlY3RvciwgY29udGV4dCApIHtcblx0XHRpZiAoIGNvbnRleHQgJiYgY29udGV4dCBpbnN0YW5jZW9mIGpRdWVyeSAmJiAhKGNvbnRleHQgaW5zdGFuY2VvZiBqUXVlcnlTdWIpICkge1xuXHRcdFx0Y29udGV4dCA9IGpRdWVyeVN1YiggY29udGV4dCApO1xuXHRcdH1cblxuXHRcdHJldHVybiBqUXVlcnkuZm4uaW5pdC5jYWxsKCB0aGlzLCBzZWxlY3RvciwgY29udGV4dCwgcm9vdGpRdWVyeVN1YiApO1xuXHR9O1xuXHRqUXVlcnlTdWIuZm4uaW5pdC5wcm90b3R5cGUgPSBqUXVlcnlTdWIuZm47XG5cdHZhciByb290alF1ZXJ5U3ViID0galF1ZXJ5U3ViKGRvY3VtZW50KTtcblx0cmV0dXJuIGpRdWVyeVN1Yjtcbn07XG5cbn0pKCk7XG52YXIgY3VyQ1NTLCBpZnJhbWUsIGlmcmFtZURvYyxcblx0cmFscGhhID0gL2FscGhhXFwoW14pXSpcXCkvaSxcblx0cm9wYWNpdHkgPSAvb3BhY2l0eT0oW14pXSopLyxcblx0cnBvc2l0aW9uID0gL14odG9wfHJpZ2h0fGJvdHRvbXxsZWZ0KSQvLFxuXHQvLyBzd2FwcGFibGUgaWYgZGlzcGxheSBpcyBub25lIG9yIHN0YXJ0cyB3aXRoIHRhYmxlIGV4Y2VwdCBcInRhYmxlXCIsIFwidGFibGUtY2VsbFwiLCBvciBcInRhYmxlLWNhcHRpb25cIlxuXHQvLyBzZWUgaGVyZSBmb3IgZGlzcGxheSB2YWx1ZXM6IGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvQ1NTL2Rpc3BsYXlcblx0cmRpc3BsYXlzd2FwID0gL14obm9uZXx0YWJsZSg/IS1jW2VhXSkuKykvLFxuXHRybWFyZ2luID0gL15tYXJnaW4vLFxuXHRybnVtc3BsaXQgPSBuZXcgUmVnRXhwKCBcIl4oXCIgKyBjb3JlX3BudW0gKyBcIikoLiopJFwiLCBcImlcIiApLFxuXHRybnVtbm9ucHggPSBuZXcgUmVnRXhwKCBcIl4oXCIgKyBjb3JlX3BudW0gKyBcIikoPyFweClbYS16JV0rJFwiLCBcImlcIiApLFxuXHRycmVsTnVtID0gbmV3IFJlZ0V4cCggXCJeKFstK10pPShcIiArIGNvcmVfcG51bSArIFwiKVwiLCBcImlcIiApLFxuXHRlbGVtZGlzcGxheSA9IHt9LFxuXG5cdGNzc1Nob3cgPSB7IHBvc2l0aW9uOiBcImFic29sdXRlXCIsIHZpc2liaWxpdHk6IFwiaGlkZGVuXCIsIGRpc3BsYXk6IFwiYmxvY2tcIiB9LFxuXHRjc3NOb3JtYWxUcmFuc2Zvcm0gPSB7XG5cdFx0bGV0dGVyU3BhY2luZzogMCxcblx0XHRmb250V2VpZ2h0OiA0MDBcblx0fSxcblxuXHRjc3NFeHBhbmQgPSBbIFwiVG9wXCIsIFwiUmlnaHRcIiwgXCJCb3R0b21cIiwgXCJMZWZ0XCIgXSxcblx0Y3NzUHJlZml4ZXMgPSBbIFwiV2Via2l0XCIsIFwiT1wiLCBcIk1velwiLCBcIm1zXCIgXSxcblxuXHRldmVudHNUb2dnbGUgPSBqUXVlcnkuZm4udG9nZ2xlO1xuXG4vLyByZXR1cm4gYSBjc3MgcHJvcGVydHkgbWFwcGVkIHRvIGEgcG90ZW50aWFsbHkgdmVuZG9yIHByZWZpeGVkIHByb3BlcnR5XG5mdW5jdGlvbiB2ZW5kb3JQcm9wTmFtZSggc3R5bGUsIG5hbWUgKSB7XG5cblx0Ly8gc2hvcnRjdXQgZm9yIG5hbWVzIHRoYXQgYXJlIG5vdCB2ZW5kb3IgcHJlZml4ZWRcblx0aWYgKCBuYW1lIGluIHN0eWxlICkge1xuXHRcdHJldHVybiBuYW1lO1xuXHR9XG5cblx0Ly8gY2hlY2sgZm9yIHZlbmRvciBwcmVmaXhlZCBuYW1lc1xuXHR2YXIgY2FwTmFtZSA9IG5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBuYW1lLnNsaWNlKDEpLFxuXHRcdG9yaWdOYW1lID0gbmFtZSxcblx0XHRpID0gY3NzUHJlZml4ZXMubGVuZ3RoO1xuXG5cdHdoaWxlICggaS0tICkge1xuXHRcdG5hbWUgPSBjc3NQcmVmaXhlc1sgaSBdICsgY2FwTmFtZTtcblx0XHRpZiAoIG5hbWUgaW4gc3R5bGUgKSB7XG5cdFx0XHRyZXR1cm4gbmFtZTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gb3JpZ05hbWU7XG59XG5cbmZ1bmN0aW9uIGlzSGlkZGVuKCBlbGVtLCBlbCApIHtcblx0ZWxlbSA9IGVsIHx8IGVsZW07XG5cdHJldHVybiBqUXVlcnkuY3NzKCBlbGVtLCBcImRpc3BsYXlcIiApID09PSBcIm5vbmVcIiB8fCAhalF1ZXJ5LmNvbnRhaW5zKCBlbGVtLm93bmVyRG9jdW1lbnQsIGVsZW0gKTtcbn1cblxuZnVuY3Rpb24gc2hvd0hpZGUoIGVsZW1lbnRzLCBzaG93ICkge1xuXHR2YXIgZWxlbSwgZGlzcGxheSxcblx0XHR2YWx1ZXMgPSBbXSxcblx0XHRpbmRleCA9IDAsXG5cdFx0bGVuZ3RoID0gZWxlbWVudHMubGVuZ3RoO1xuXG5cdGZvciAoIDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KysgKSB7XG5cdFx0ZWxlbSA9IGVsZW1lbnRzWyBpbmRleCBdO1xuXHRcdGlmICggIWVsZW0uc3R5bGUgKSB7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cdFx0dmFsdWVzWyBpbmRleCBdID0galF1ZXJ5Ll9kYXRhKCBlbGVtLCBcIm9sZGRpc3BsYXlcIiApO1xuXHRcdGlmICggc2hvdyApIHtcblx0XHRcdC8vIFJlc2V0IHRoZSBpbmxpbmUgZGlzcGxheSBvZiB0aGlzIGVsZW1lbnQgdG8gbGVhcm4gaWYgaXQgaXNcblx0XHRcdC8vIGJlaW5nIGhpZGRlbiBieSBjYXNjYWRlZCBydWxlcyBvciBub3Rcblx0XHRcdGlmICggIXZhbHVlc1sgaW5kZXggXSAmJiBlbGVtLnN0eWxlLmRpc3BsYXkgPT09IFwibm9uZVwiICkge1xuXHRcdFx0XHRlbGVtLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgZWxlbWVudHMgd2hpY2ggaGF2ZSBiZWVuIG92ZXJyaWRkZW4gd2l0aCBkaXNwbGF5OiBub25lXG5cdFx0XHQvLyBpbiBhIHN0eWxlc2hlZXQgdG8gd2hhdGV2ZXIgdGhlIGRlZmF1bHQgYnJvd3NlciBzdHlsZSBpc1xuXHRcdFx0Ly8gZm9yIHN1Y2ggYW4gZWxlbWVudFxuXHRcdFx0aWYgKCBlbGVtLnN0eWxlLmRpc3BsYXkgPT09IFwiXCIgJiYgaXNIaWRkZW4oIGVsZW0gKSApIHtcblx0XHRcdFx0dmFsdWVzWyBpbmRleCBdID0galF1ZXJ5Ll9kYXRhKCBlbGVtLCBcIm9sZGRpc3BsYXlcIiwgY3NzX2RlZmF1bHREaXNwbGF5KGVsZW0ubm9kZU5hbWUpICk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGRpc3BsYXkgPSBjdXJDU1MoIGVsZW0sIFwiZGlzcGxheVwiICk7XG5cblx0XHRcdGlmICggIXZhbHVlc1sgaW5kZXggXSAmJiBkaXNwbGF5ICE9PSBcIm5vbmVcIiApIHtcblx0XHRcdFx0alF1ZXJ5Ll9kYXRhKCBlbGVtLCBcIm9sZGRpc3BsYXlcIiwgZGlzcGxheSApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIFNldCB0aGUgZGlzcGxheSBvZiBtb3N0IG9mIHRoZSBlbGVtZW50cyBpbiBhIHNlY29uZCBsb29wXG5cdC8vIHRvIGF2b2lkIHRoZSBjb25zdGFudCByZWZsb3dcblx0Zm9yICggaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKyApIHtcblx0XHRlbGVtID0gZWxlbWVudHNbIGluZGV4IF07XG5cdFx0aWYgKCAhZWxlbS5zdHlsZSApIHtcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH1cblx0XHRpZiAoICFzaG93IHx8IGVsZW0uc3R5bGUuZGlzcGxheSA9PT0gXCJub25lXCIgfHwgZWxlbS5zdHlsZS5kaXNwbGF5ID09PSBcIlwiICkge1xuXHRcdFx0ZWxlbS5zdHlsZS5kaXNwbGF5ID0gc2hvdyA/IHZhbHVlc1sgaW5kZXggXSB8fCBcIlwiIDogXCJub25lXCI7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGVsZW1lbnRzO1xufVxuXG5qUXVlcnkuZm4uZXh0ZW5kKHtcblx0Y3NzOiBmdW5jdGlvbiggbmFtZSwgdmFsdWUgKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5hY2Nlc3MoIHRoaXMsIGZ1bmN0aW9uKCBlbGVtLCBuYW1lLCB2YWx1ZSApIHtcblx0XHRcdHJldHVybiB2YWx1ZSAhPT0gdW5kZWZpbmVkID9cblx0XHRcdFx0alF1ZXJ5LnN0eWxlKCBlbGVtLCBuYW1lLCB2YWx1ZSApIDpcblx0XHRcdFx0alF1ZXJ5LmNzcyggZWxlbSwgbmFtZSApO1xuXHRcdH0sIG5hbWUsIHZhbHVlLCBhcmd1bWVudHMubGVuZ3RoID4gMSApO1xuXHR9LFxuXHRzaG93OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gc2hvd0hpZGUoIHRoaXMsIHRydWUgKTtcblx0fSxcblx0aGlkZTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHNob3dIaWRlKCB0aGlzICk7XG5cdH0sXG5cdHRvZ2dsZTogZnVuY3Rpb24oIHN0YXRlLCBmbjIgKSB7XG5cdFx0dmFyIGJvb2wgPSB0eXBlb2Ygc3RhdGUgPT09IFwiYm9vbGVhblwiO1xuXG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggc3RhdGUgKSAmJiBqUXVlcnkuaXNGdW5jdGlvbiggZm4yICkgKSB7XG5cdFx0XHRyZXR1cm4gZXZlbnRzVG9nZ2xlLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBib29sID8gc3RhdGUgOiBpc0hpZGRlbiggdGhpcyApICkge1xuXHRcdFx0XHRqUXVlcnkoIHRoaXMgKS5zaG93KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRqUXVlcnkoIHRoaXMgKS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5qUXVlcnkuZXh0ZW5kKHtcblx0Ly8gQWRkIGluIHN0eWxlIHByb3BlcnR5IGhvb2tzIGZvciBvdmVycmlkaW5nIHRoZSBkZWZhdWx0XG5cdC8vIGJlaGF2aW9yIG9mIGdldHRpbmcgYW5kIHNldHRpbmcgYSBzdHlsZSBwcm9wZXJ0eVxuXHRjc3NIb29rczoge1xuXHRcdG9wYWNpdHk6IHtcblx0XHRcdGdldDogZnVuY3Rpb24oIGVsZW0sIGNvbXB1dGVkICkge1xuXHRcdFx0XHRpZiAoIGNvbXB1dGVkICkge1xuXHRcdFx0XHRcdC8vIFdlIHNob3VsZCBhbHdheXMgZ2V0IGEgbnVtYmVyIGJhY2sgZnJvbSBvcGFjaXR5XG5cdFx0XHRcdFx0dmFyIHJldCA9IGN1ckNTUyggZWxlbSwgXCJvcGFjaXR5XCIgKTtcblx0XHRcdFx0XHRyZXR1cm4gcmV0ID09PSBcIlwiID8gXCIxXCIgOiByZXQ7XG5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSxcblxuXHQvLyBFeGNsdWRlIHRoZSBmb2xsb3dpbmcgY3NzIHByb3BlcnRpZXMgdG8gYWRkIHB4XG5cdGNzc051bWJlcjoge1xuXHRcdFwiZmlsbE9wYWNpdHlcIjogdHJ1ZSxcblx0XHRcImZvbnRXZWlnaHRcIjogdHJ1ZSxcblx0XHRcImxpbmVIZWlnaHRcIjogdHJ1ZSxcblx0XHRcIm9wYWNpdHlcIjogdHJ1ZSxcblx0XHRcIm9ycGhhbnNcIjogdHJ1ZSxcblx0XHRcIndpZG93c1wiOiB0cnVlLFxuXHRcdFwiekluZGV4XCI6IHRydWUsXG5cdFx0XCJ6b29tXCI6IHRydWVcblx0fSxcblxuXHQvLyBBZGQgaW4gcHJvcGVydGllcyB3aG9zZSBuYW1lcyB5b3Ugd2lzaCB0byBmaXggYmVmb3JlXG5cdC8vIHNldHRpbmcgb3IgZ2V0dGluZyB0aGUgdmFsdWVcblx0Y3NzUHJvcHM6IHtcblx0XHQvLyBub3JtYWxpemUgZmxvYXQgY3NzIHByb3BlcnR5XG5cdFx0XCJmbG9hdFwiOiBqUXVlcnkuc3VwcG9ydC5jc3NGbG9hdCA/IFwiY3NzRmxvYXRcIiA6IFwic3R5bGVGbG9hdFwiXG5cdH0sXG5cblx0Ly8gR2V0IGFuZCBzZXQgdGhlIHN0eWxlIHByb3BlcnR5IG9uIGEgRE9NIE5vZGVcblx0c3R5bGU6IGZ1bmN0aW9uKCBlbGVtLCBuYW1lLCB2YWx1ZSwgZXh0cmEgKSB7XG5cdFx0Ly8gRG9uJ3Qgc2V0IHN0eWxlcyBvbiB0ZXh0IGFuZCBjb21tZW50IG5vZGVzXG5cdFx0aWYgKCAhZWxlbSB8fCBlbGVtLm5vZGVUeXBlID09PSAzIHx8IGVsZW0ubm9kZVR5cGUgPT09IDggfHwgIWVsZW0uc3R5bGUgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gTWFrZSBzdXJlIHRoYXQgd2UncmUgd29ya2luZyB3aXRoIHRoZSByaWdodCBuYW1lXG5cdFx0dmFyIHJldCwgdHlwZSwgaG9va3MsXG5cdFx0XHRvcmlnTmFtZSA9IGpRdWVyeS5jYW1lbENhc2UoIG5hbWUgKSxcblx0XHRcdHN0eWxlID0gZWxlbS5zdHlsZTtcblxuXHRcdG5hbWUgPSBqUXVlcnkuY3NzUHJvcHNbIG9yaWdOYW1lIF0gfHwgKCBqUXVlcnkuY3NzUHJvcHNbIG9yaWdOYW1lIF0gPSB2ZW5kb3JQcm9wTmFtZSggc3R5bGUsIG9yaWdOYW1lICkgKTtcblxuXHRcdC8vIGdldHMgaG9vayBmb3IgdGhlIHByZWZpeGVkIHZlcnNpb25cblx0XHQvLyBmb2xsb3dlZCBieSB0aGUgdW5wcmVmaXhlZCB2ZXJzaW9uXG5cdFx0aG9va3MgPSBqUXVlcnkuY3NzSG9va3NbIG5hbWUgXSB8fCBqUXVlcnkuY3NzSG9va3NbIG9yaWdOYW1lIF07XG5cblx0XHQvLyBDaGVjayBpZiB3ZSdyZSBzZXR0aW5nIGEgdmFsdWVcblx0XHRpZiAoIHZhbHVlICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHR0eXBlID0gdHlwZW9mIHZhbHVlO1xuXG5cdFx0XHQvLyBjb252ZXJ0IHJlbGF0aXZlIG51bWJlciBzdHJpbmdzICgrPSBvciAtPSkgdG8gcmVsYXRpdmUgbnVtYmVycy4gIzczNDVcblx0XHRcdGlmICggdHlwZSA9PT0gXCJzdHJpbmdcIiAmJiAocmV0ID0gcnJlbE51bS5leGVjKCB2YWx1ZSApKSApIHtcblx0XHRcdFx0dmFsdWUgPSAoIHJldFsxXSArIDEgKSAqIHJldFsyXSArIHBhcnNlRmxvYXQoIGpRdWVyeS5jc3MoIGVsZW0sIG5hbWUgKSApO1xuXHRcdFx0XHQvLyBGaXhlcyBidWcgIzkyMzdcblx0XHRcdFx0dHlwZSA9IFwibnVtYmVyXCI7XG5cdFx0XHR9XG5cblx0XHRcdC8vIE1ha2Ugc3VyZSB0aGF0IE5hTiBhbmQgbnVsbCB2YWx1ZXMgYXJlbid0IHNldC4gU2VlOiAjNzExNlxuXHRcdFx0aWYgKCB2YWx1ZSA9PSBudWxsIHx8IHR5cGUgPT09IFwibnVtYmVyXCIgJiYgaXNOYU4oIHZhbHVlICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgYSBudW1iZXIgd2FzIHBhc3NlZCBpbiwgYWRkICdweCcgdG8gdGhlIChleGNlcHQgZm9yIGNlcnRhaW4gQ1NTIHByb3BlcnRpZXMpXG5cdFx0XHRpZiAoIHR5cGUgPT09IFwibnVtYmVyXCIgJiYgIWpRdWVyeS5jc3NOdW1iZXJbIG9yaWdOYW1lIF0gKSB7XG5cdFx0XHRcdHZhbHVlICs9IFwicHhcIjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgYSBob29rIHdhcyBwcm92aWRlZCwgdXNlIHRoYXQgdmFsdWUsIG90aGVyd2lzZSBqdXN0IHNldCB0aGUgc3BlY2lmaWVkIHZhbHVlXG5cdFx0XHRpZiAoICFob29rcyB8fCAhKFwic2V0XCIgaW4gaG9va3MpIHx8ICh2YWx1ZSA9IGhvb2tzLnNldCggZWxlbSwgdmFsdWUsIGV4dHJhICkpICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdC8vIFdyYXBwZWQgdG8gcHJldmVudCBJRSBmcm9tIHRocm93aW5nIGVycm9ycyB3aGVuICdpbnZhbGlkJyB2YWx1ZXMgYXJlIHByb3ZpZGVkXG5cdFx0XHRcdC8vIEZpeGVzIGJ1ZyAjNTUwOVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHN0eWxlWyBuYW1lIF0gPSB2YWx1ZTtcblx0XHRcdFx0fSBjYXRjaChlKSB7fVxuXHRcdFx0fVxuXG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIElmIGEgaG9vayB3YXMgcHJvdmlkZWQgZ2V0IHRoZSBub24tY29tcHV0ZWQgdmFsdWUgZnJvbSB0aGVyZVxuXHRcdFx0aWYgKCBob29rcyAmJiBcImdldFwiIGluIGhvb2tzICYmIChyZXQgPSBob29rcy5nZXQoIGVsZW0sIGZhbHNlLCBleHRyYSApKSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0XHRyZXR1cm4gcmV0O1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBPdGhlcndpc2UganVzdCBnZXQgdGhlIHZhbHVlIGZyb20gdGhlIHN0eWxlIG9iamVjdFxuXHRcdFx0cmV0dXJuIHN0eWxlWyBuYW1lIF07XG5cdFx0fVxuXHR9LFxuXG5cdGNzczogZnVuY3Rpb24oIGVsZW0sIG5hbWUsIG51bWVyaWMsIGV4dHJhICkge1xuXHRcdHZhciB2YWwsIG51bSwgaG9va3MsXG5cdFx0XHRvcmlnTmFtZSA9IGpRdWVyeS5jYW1lbENhc2UoIG5hbWUgKTtcblxuXHRcdC8vIE1ha2Ugc3VyZSB0aGF0IHdlJ3JlIHdvcmtpbmcgd2l0aCB0aGUgcmlnaHQgbmFtZVxuXHRcdG5hbWUgPSBqUXVlcnkuY3NzUHJvcHNbIG9yaWdOYW1lIF0gfHwgKCBqUXVlcnkuY3NzUHJvcHNbIG9yaWdOYW1lIF0gPSB2ZW5kb3JQcm9wTmFtZSggZWxlbS5zdHlsZSwgb3JpZ05hbWUgKSApO1xuXG5cdFx0Ly8gZ2V0cyBob29rIGZvciB0aGUgcHJlZml4ZWQgdmVyc2lvblxuXHRcdC8vIGZvbGxvd2VkIGJ5IHRoZSB1bnByZWZpeGVkIHZlcnNpb25cblx0XHRob29rcyA9IGpRdWVyeS5jc3NIb29rc1sgbmFtZSBdIHx8IGpRdWVyeS5jc3NIb29rc1sgb3JpZ05hbWUgXTtcblxuXHRcdC8vIElmIGEgaG9vayB3YXMgcHJvdmlkZWQgZ2V0IHRoZSBjb21wdXRlZCB2YWx1ZSBmcm9tIHRoZXJlXG5cdFx0aWYgKCBob29rcyAmJiBcImdldFwiIGluIGhvb2tzICkge1xuXHRcdFx0dmFsID0gaG9va3MuZ2V0KCBlbGVtLCB0cnVlLCBleHRyYSApO1xuXHRcdH1cblxuXHRcdC8vIE90aGVyd2lzZSwgaWYgYSB3YXkgdG8gZ2V0IHRoZSBjb21wdXRlZCB2YWx1ZSBleGlzdHMsIHVzZSB0aGF0XG5cdFx0aWYgKCB2YWwgPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdHZhbCA9IGN1ckNTUyggZWxlbSwgbmFtZSApO1xuXHRcdH1cblxuXHRcdC8vY29udmVydCBcIm5vcm1hbFwiIHRvIGNvbXB1dGVkIHZhbHVlXG5cdFx0aWYgKCB2YWwgPT09IFwibm9ybWFsXCIgJiYgbmFtZSBpbiBjc3NOb3JtYWxUcmFuc2Zvcm0gKSB7XG5cdFx0XHR2YWwgPSBjc3NOb3JtYWxUcmFuc2Zvcm1bIG5hbWUgXTtcblx0XHR9XG5cblx0XHQvLyBSZXR1cm4sIGNvbnZlcnRpbmcgdG8gbnVtYmVyIGlmIGZvcmNlZCBvciBhIHF1YWxpZmllciB3YXMgcHJvdmlkZWQgYW5kIHZhbCBsb29rcyBudW1lcmljXG5cdFx0aWYgKCBudW1lcmljIHx8IGV4dHJhICE9PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRudW0gPSBwYXJzZUZsb2F0KCB2YWwgKTtcblx0XHRcdHJldHVybiBudW1lcmljIHx8IGpRdWVyeS5pc051bWVyaWMoIG51bSApID8gbnVtIHx8IDAgOiB2YWw7XG5cdFx0fVxuXHRcdHJldHVybiB2YWw7XG5cdH0sXG5cblx0Ly8gQSBtZXRob2QgZm9yIHF1aWNrbHkgc3dhcHBpbmcgaW4vb3V0IENTUyBwcm9wZXJ0aWVzIHRvIGdldCBjb3JyZWN0IGNhbGN1bGF0aW9uc1xuXHRzd2FwOiBmdW5jdGlvbiggZWxlbSwgb3B0aW9ucywgY2FsbGJhY2sgKSB7XG5cdFx0dmFyIHJldCwgbmFtZSxcblx0XHRcdG9sZCA9IHt9O1xuXG5cdFx0Ly8gUmVtZW1iZXIgdGhlIG9sZCB2YWx1ZXMsIGFuZCBpbnNlcnQgdGhlIG5ldyBvbmVzXG5cdFx0Zm9yICggbmFtZSBpbiBvcHRpb25zICkge1xuXHRcdFx0b2xkWyBuYW1lIF0gPSBlbGVtLnN0eWxlWyBuYW1lIF07XG5cdFx0XHRlbGVtLnN0eWxlWyBuYW1lIF0gPSBvcHRpb25zWyBuYW1lIF07XG5cdFx0fVxuXG5cdFx0cmV0ID0gY2FsbGJhY2suY2FsbCggZWxlbSApO1xuXG5cdFx0Ly8gUmV2ZXJ0IHRoZSBvbGQgdmFsdWVzXG5cdFx0Zm9yICggbmFtZSBpbiBvcHRpb25zICkge1xuXHRcdFx0ZWxlbS5zdHlsZVsgbmFtZSBdID0gb2xkWyBuYW1lIF07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJldDtcblx0fVxufSk7XG5cbi8vIE5PVEU6IFRvIGFueSBmdXR1cmUgbWFpbnRhaW5lciwgd2UndmUgd2luZG93LmdldENvbXB1dGVkU3R5bGVcbi8vIGJlY2F1c2UganNkb20gb24gbm9kZS5qcyB3aWxsIGJyZWFrIHdpdGhvdXQgaXQuXG5pZiAoIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlICkge1xuXHRjdXJDU1MgPSBmdW5jdGlvbiggZWxlbSwgbmFtZSApIHtcblx0XHR2YXIgcmV0LCB3aWR0aCwgbWluV2lkdGgsIG1heFdpZHRoLFxuXHRcdFx0Y29tcHV0ZWQgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSggZWxlbSwgbnVsbCApLFxuXHRcdFx0c3R5bGUgPSBlbGVtLnN0eWxlO1xuXG5cdFx0aWYgKCBjb21wdXRlZCApIHtcblxuXHRcdFx0cmV0ID0gY29tcHV0ZWRbIG5hbWUgXTtcblx0XHRcdGlmICggcmV0ID09PSBcIlwiICYmICFqUXVlcnkuY29udGFpbnMoIGVsZW0ub3duZXJEb2N1bWVudCwgZWxlbSApICkge1xuXHRcdFx0XHRyZXQgPSBqUXVlcnkuc3R5bGUoIGVsZW0sIG5hbWUgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQSB0cmlidXRlIHRvIHRoZSBcImF3ZXNvbWUgaGFjayBieSBEZWFuIEVkd2FyZHNcIlxuXHRcdFx0Ly8gQ2hyb21lIDwgMTcgYW5kIFNhZmFyaSA1LjAgdXNlcyBcImNvbXB1dGVkIHZhbHVlXCIgaW5zdGVhZCBvZiBcInVzZWQgdmFsdWVcIiBmb3IgbWFyZ2luLXJpZ2h0XG5cdFx0XHQvLyBTYWZhcmkgNS4xLjcgKGF0IGxlYXN0KSByZXR1cm5zIHBlcmNlbnRhZ2UgZm9yIGEgbGFyZ2VyIHNldCBvZiB2YWx1ZXMsIGJ1dCB3aWR0aCBzZWVtcyB0byBiZSByZWxpYWJseSBwaXhlbHNcblx0XHRcdC8vIHRoaXMgaXMgYWdhaW5zdCB0aGUgQ1NTT00gZHJhZnQgc3BlYzogaHR0cDovL2Rldi53My5vcmcvY3Nzd2cvY3Nzb20vI3Jlc29sdmVkLXZhbHVlc1xuXHRcdFx0aWYgKCBybnVtbm9ucHgudGVzdCggcmV0ICkgJiYgcm1hcmdpbi50ZXN0KCBuYW1lICkgKSB7XG5cdFx0XHRcdHdpZHRoID0gc3R5bGUud2lkdGg7XG5cdFx0XHRcdG1pbldpZHRoID0gc3R5bGUubWluV2lkdGg7XG5cdFx0XHRcdG1heFdpZHRoID0gc3R5bGUubWF4V2lkdGg7XG5cblx0XHRcdFx0c3R5bGUubWluV2lkdGggPSBzdHlsZS5tYXhXaWR0aCA9IHN0eWxlLndpZHRoID0gcmV0O1xuXHRcdFx0XHRyZXQgPSBjb21wdXRlZC53aWR0aDtcblxuXHRcdFx0XHRzdHlsZS53aWR0aCA9IHdpZHRoO1xuXHRcdFx0XHRzdHlsZS5taW5XaWR0aCA9IG1pbldpZHRoO1xuXHRcdFx0XHRzdHlsZS5tYXhXaWR0aCA9IG1heFdpZHRoO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByZXQ7XG5cdH07XG59IGVsc2UgaWYgKCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY3VycmVudFN0eWxlICkge1xuXHRjdXJDU1MgPSBmdW5jdGlvbiggZWxlbSwgbmFtZSApIHtcblx0XHR2YXIgbGVmdCwgcnNMZWZ0LFxuXHRcdFx0cmV0ID0gZWxlbS5jdXJyZW50U3R5bGUgJiYgZWxlbS5jdXJyZW50U3R5bGVbIG5hbWUgXSxcblx0XHRcdHN0eWxlID0gZWxlbS5zdHlsZTtcblxuXHRcdC8vIEF2b2lkIHNldHRpbmcgcmV0IHRvIGVtcHR5IHN0cmluZyBoZXJlXG5cdFx0Ly8gc28gd2UgZG9uJ3QgZGVmYXVsdCB0byBhdXRvXG5cdFx0aWYgKCByZXQgPT0gbnVsbCAmJiBzdHlsZSAmJiBzdHlsZVsgbmFtZSBdICkge1xuXHRcdFx0cmV0ID0gc3R5bGVbIG5hbWUgXTtcblx0XHR9XG5cblx0XHQvLyBGcm9tIHRoZSBhd2Vzb21lIGhhY2sgYnkgRGVhbiBFZHdhcmRzXG5cdFx0Ly8gaHR0cDovL2VyaWsuZWFlLm5ldC9hcmNoaXZlcy8yMDA3LzA3LzI3LzE4LjU0LjE1LyNjb21tZW50LTEwMjI5MVxuXG5cdFx0Ly8gSWYgd2UncmUgbm90IGRlYWxpbmcgd2l0aCBhIHJlZ3VsYXIgcGl4ZWwgbnVtYmVyXG5cdFx0Ly8gYnV0IGEgbnVtYmVyIHRoYXQgaGFzIGEgd2VpcmQgZW5kaW5nLCB3ZSBuZWVkIHRvIGNvbnZlcnQgaXQgdG8gcGl4ZWxzXG5cdFx0Ly8gYnV0IG5vdCBwb3NpdGlvbiBjc3MgYXR0cmlidXRlcywgYXMgdGhvc2UgYXJlIHByb3BvcnRpb25hbCB0byB0aGUgcGFyZW50IGVsZW1lbnQgaW5zdGVhZFxuXHRcdC8vIGFuZCB3ZSBjYW4ndCBtZWFzdXJlIHRoZSBwYXJlbnQgaW5zdGVhZCBiZWNhdXNlIGl0IG1pZ2h0IHRyaWdnZXIgYSBcInN0YWNraW5nIGRvbGxzXCIgcHJvYmxlbVxuXHRcdGlmICggcm51bW5vbnB4LnRlc3QoIHJldCApICYmICFycG9zaXRpb24udGVzdCggbmFtZSApICkge1xuXG5cdFx0XHQvLyBSZW1lbWJlciB0aGUgb3JpZ2luYWwgdmFsdWVzXG5cdFx0XHRsZWZ0ID0gc3R5bGUubGVmdDtcblx0XHRcdHJzTGVmdCA9IGVsZW0ucnVudGltZVN0eWxlICYmIGVsZW0ucnVudGltZVN0eWxlLmxlZnQ7XG5cblx0XHRcdC8vIFB1dCBpbiB0aGUgbmV3IHZhbHVlcyB0byBnZXQgYSBjb21wdXRlZCB2YWx1ZSBvdXRcblx0XHRcdGlmICggcnNMZWZ0ICkge1xuXHRcdFx0XHRlbGVtLnJ1bnRpbWVTdHlsZS5sZWZ0ID0gZWxlbS5jdXJyZW50U3R5bGUubGVmdDtcblx0XHRcdH1cblx0XHRcdHN0eWxlLmxlZnQgPSBuYW1lID09PSBcImZvbnRTaXplXCIgPyBcIjFlbVwiIDogcmV0O1xuXHRcdFx0cmV0ID0gc3R5bGUucGl4ZWxMZWZ0ICsgXCJweFwiO1xuXG5cdFx0XHQvLyBSZXZlcnQgdGhlIGNoYW5nZWQgdmFsdWVzXG5cdFx0XHRzdHlsZS5sZWZ0ID0gbGVmdDtcblx0XHRcdGlmICggcnNMZWZ0ICkge1xuXHRcdFx0XHRlbGVtLnJ1bnRpbWVTdHlsZS5sZWZ0ID0gcnNMZWZ0O1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByZXQgPT09IFwiXCIgPyBcImF1dG9cIiA6IHJldDtcblx0fTtcbn1cblxuZnVuY3Rpb24gc2V0UG9zaXRpdmVOdW1iZXIoIGVsZW0sIHZhbHVlLCBzdWJ0cmFjdCApIHtcblx0dmFyIG1hdGNoZXMgPSBybnVtc3BsaXQuZXhlYyggdmFsdWUgKTtcblx0cmV0dXJuIG1hdGNoZXMgP1xuXHRcdFx0TWF0aC5tYXgoIDAsIG1hdGNoZXNbIDEgXSAtICggc3VidHJhY3QgfHwgMCApICkgKyAoIG1hdGNoZXNbIDIgXSB8fCBcInB4XCIgKSA6XG5cdFx0XHR2YWx1ZTtcbn1cblxuZnVuY3Rpb24gYXVnbWVudFdpZHRoT3JIZWlnaHQoIGVsZW0sIG5hbWUsIGV4dHJhLCBpc0JvcmRlckJveCApIHtcblx0dmFyIGkgPSBleHRyYSA9PT0gKCBpc0JvcmRlckJveCA/IFwiYm9yZGVyXCIgOiBcImNvbnRlbnRcIiApID9cblx0XHQvLyBJZiB3ZSBhbHJlYWR5IGhhdmUgdGhlIHJpZ2h0IG1lYXN1cmVtZW50LCBhdm9pZCBhdWdtZW50YXRpb25cblx0XHQ0IDpcblx0XHQvLyBPdGhlcndpc2UgaW5pdGlhbGl6ZSBmb3IgaG9yaXpvbnRhbCBvciB2ZXJ0aWNhbCBwcm9wZXJ0aWVzXG5cdFx0bmFtZSA9PT0gXCJ3aWR0aFwiID8gMSA6IDAsXG5cblx0XHR2YWwgPSAwO1xuXG5cdGZvciAoIDsgaSA8IDQ7IGkgKz0gMiApIHtcblx0XHQvLyBib3RoIGJveCBtb2RlbHMgZXhjbHVkZSBtYXJnaW4sIHNvIGFkZCBpdCBpZiB3ZSB3YW50IGl0XG5cdFx0aWYgKCBleHRyYSA9PT0gXCJtYXJnaW5cIiApIHtcblx0XHRcdC8vIHdlIHVzZSBqUXVlcnkuY3NzIGluc3RlYWQgb2YgY3VyQ1NTIGhlcmVcblx0XHRcdC8vIGJlY2F1c2Ugb2YgdGhlIHJlbGlhYmxlTWFyZ2luUmlnaHQgQ1NTIGhvb2shXG5cdFx0XHR2YWwgKz0galF1ZXJ5LmNzcyggZWxlbSwgZXh0cmEgKyBjc3NFeHBhbmRbIGkgXSwgdHJ1ZSApO1xuXHRcdH1cblxuXHRcdC8vIEZyb20gdGhpcyBwb2ludCBvbiB3ZSB1c2UgY3VyQ1NTIGZvciBtYXhpbXVtIHBlcmZvcm1hbmNlIChyZWxldmFudCBpbiBhbmltYXRpb25zKVxuXHRcdGlmICggaXNCb3JkZXJCb3ggKSB7XG5cdFx0XHQvLyBib3JkZXItYm94IGluY2x1ZGVzIHBhZGRpbmcsIHNvIHJlbW92ZSBpdCBpZiB3ZSB3YW50IGNvbnRlbnRcblx0XHRcdGlmICggZXh0cmEgPT09IFwiY29udGVudFwiICkge1xuXHRcdFx0XHR2YWwgLT0gcGFyc2VGbG9hdCggY3VyQ1NTKCBlbGVtLCBcInBhZGRpbmdcIiArIGNzc0V4cGFuZFsgaSBdICkgKSB8fCAwO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBhdCB0aGlzIHBvaW50LCBleHRyYSBpc24ndCBib3JkZXIgbm9yIG1hcmdpbiwgc28gcmVtb3ZlIGJvcmRlclxuXHRcdFx0aWYgKCBleHRyYSAhPT0gXCJtYXJnaW5cIiApIHtcblx0XHRcdFx0dmFsIC09IHBhcnNlRmxvYXQoIGN1ckNTUyggZWxlbSwgXCJib3JkZXJcIiArIGNzc0V4cGFuZFsgaSBdICsgXCJXaWR0aFwiICkgKSB8fCAwO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBhdCB0aGlzIHBvaW50LCBleHRyYSBpc24ndCBjb250ZW50LCBzbyBhZGQgcGFkZGluZ1xuXHRcdFx0dmFsICs9IHBhcnNlRmxvYXQoIGN1ckNTUyggZWxlbSwgXCJwYWRkaW5nXCIgKyBjc3NFeHBhbmRbIGkgXSApICkgfHwgMDtcblxuXHRcdFx0Ly8gYXQgdGhpcyBwb2ludCwgZXh0cmEgaXNuJ3QgY29udGVudCBub3IgcGFkZGluZywgc28gYWRkIGJvcmRlclxuXHRcdFx0aWYgKCBleHRyYSAhPT0gXCJwYWRkaW5nXCIgKSB7XG5cdFx0XHRcdHZhbCArPSBwYXJzZUZsb2F0KCBjdXJDU1MoIGVsZW0sIFwiYm9yZGVyXCIgKyBjc3NFeHBhbmRbIGkgXSArIFwiV2lkdGhcIiApICkgfHwgMDtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdmFsO1xufVxuXG5mdW5jdGlvbiBnZXRXaWR0aE9ySGVpZ2h0KCBlbGVtLCBuYW1lLCBleHRyYSApIHtcblxuXHQvLyBTdGFydCB3aXRoIG9mZnNldCBwcm9wZXJ0eSwgd2hpY2ggaXMgZXF1aXZhbGVudCB0byB0aGUgYm9yZGVyLWJveCB2YWx1ZVxuXHR2YXIgdmFsID0gbmFtZSA9PT0gXCJ3aWR0aFwiID8gZWxlbS5vZmZzZXRXaWR0aCA6IGVsZW0ub2Zmc2V0SGVpZ2h0LFxuXHRcdHZhbHVlSXNCb3JkZXJCb3ggPSB0cnVlLFxuXHRcdGlzQm9yZGVyQm94ID0galF1ZXJ5LnN1cHBvcnQuYm94U2l6aW5nICYmIGpRdWVyeS5jc3MoIGVsZW0sIFwiYm94U2l6aW5nXCIgKSA9PT0gXCJib3JkZXItYm94XCI7XG5cblx0Ly8gc29tZSBub24taHRtbCBlbGVtZW50cyByZXR1cm4gdW5kZWZpbmVkIGZvciBvZmZzZXRXaWR0aCwgc28gY2hlY2sgZm9yIG51bGwvdW5kZWZpbmVkXG5cdC8vIHN2ZyAtIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY0OTI4NVxuXHQvLyBNYXRoTUwgLSBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD00OTE2Njhcblx0aWYgKCB2YWwgPD0gMCB8fCB2YWwgPT0gbnVsbCApIHtcblx0XHQvLyBGYWxsIGJhY2sgdG8gY29tcHV0ZWQgdGhlbiB1bmNvbXB1dGVkIGNzcyBpZiBuZWNlc3Nhcnlcblx0XHR2YWwgPSBjdXJDU1MoIGVsZW0sIG5hbWUgKTtcblx0XHRpZiAoIHZhbCA8IDAgfHwgdmFsID09IG51bGwgKSB7XG5cdFx0XHR2YWwgPSBlbGVtLnN0eWxlWyBuYW1lIF07XG5cdFx0fVxuXG5cdFx0Ly8gQ29tcHV0ZWQgdW5pdCBpcyBub3QgcGl4ZWxzLiBTdG9wIGhlcmUgYW5kIHJldHVybi5cblx0XHRpZiAoIHJudW1ub25weC50ZXN0KHZhbCkgKSB7XG5cdFx0XHRyZXR1cm4gdmFsO1xuXHRcdH1cblxuXHRcdC8vIHdlIG5lZWQgdGhlIGNoZWNrIGZvciBzdHlsZSBpbiBjYXNlIGEgYnJvd3NlciB3aGljaCByZXR1cm5zIHVucmVsaWFibGUgdmFsdWVzXG5cdFx0Ly8gZm9yIGdldENvbXB1dGVkU3R5bGUgc2lsZW50bHkgZmFsbHMgYmFjayB0byB0aGUgcmVsaWFibGUgZWxlbS5zdHlsZVxuXHRcdHZhbHVlSXNCb3JkZXJCb3ggPSBpc0JvcmRlckJveCAmJiAoIGpRdWVyeS5zdXBwb3J0LmJveFNpemluZ1JlbGlhYmxlIHx8IHZhbCA9PT0gZWxlbS5zdHlsZVsgbmFtZSBdICk7XG5cblx0XHQvLyBOb3JtYWxpemUgXCJcIiwgYXV0bywgYW5kIHByZXBhcmUgZm9yIGV4dHJhXG5cdFx0dmFsID0gcGFyc2VGbG9hdCggdmFsICkgfHwgMDtcblx0fVxuXG5cdC8vIHVzZSB0aGUgYWN0aXZlIGJveC1zaXppbmcgbW9kZWwgdG8gYWRkL3N1YnRyYWN0IGlycmVsZXZhbnQgc3R5bGVzXG5cdHJldHVybiAoIHZhbCArXG5cdFx0YXVnbWVudFdpZHRoT3JIZWlnaHQoXG5cdFx0XHRlbGVtLFxuXHRcdFx0bmFtZSxcblx0XHRcdGV4dHJhIHx8ICggaXNCb3JkZXJCb3ggPyBcImJvcmRlclwiIDogXCJjb250ZW50XCIgKSxcblx0XHRcdHZhbHVlSXNCb3JkZXJCb3hcblx0XHQpXG5cdCkgKyBcInB4XCI7XG59XG5cblxuLy8gVHJ5IHRvIGRldGVybWluZSB0aGUgZGVmYXVsdCBkaXNwbGF5IHZhbHVlIG9mIGFuIGVsZW1lbnRcbmZ1bmN0aW9uIGNzc19kZWZhdWx0RGlzcGxheSggbm9kZU5hbWUgKSB7XG5cdGlmICggZWxlbWRpc3BsYXlbIG5vZGVOYW1lIF0gKSB7XG5cdFx0cmV0dXJuIGVsZW1kaXNwbGF5WyBub2RlTmFtZSBdO1xuXHR9XG5cblx0dmFyIGVsZW0gPSBqUXVlcnkoIFwiPFwiICsgbm9kZU5hbWUgKyBcIj5cIiApLmFwcGVuZFRvKCBkb2N1bWVudC5ib2R5ICksXG5cdFx0ZGlzcGxheSA9IGVsZW0uY3NzKFwiZGlzcGxheVwiKTtcblx0ZWxlbS5yZW1vdmUoKTtcblxuXHQvLyBJZiB0aGUgc2ltcGxlIHdheSBmYWlscyxcblx0Ly8gZ2V0IGVsZW1lbnQncyByZWFsIGRlZmF1bHQgZGlzcGxheSBieSBhdHRhY2hpbmcgaXQgdG8gYSB0ZW1wIGlmcmFtZVxuXHRpZiAoIGRpc3BsYXkgPT09IFwibm9uZVwiIHx8IGRpc3BsYXkgPT09IFwiXCIgKSB7XG5cdFx0Ly8gVXNlIHRoZSBhbHJlYWR5LWNyZWF0ZWQgaWZyYW1lIGlmIHBvc3NpYmxlXG5cdFx0aWZyYW1lID0gZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChcblx0XHRcdGlmcmFtZSB8fCBqUXVlcnkuZXh0ZW5kKCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpLCB7XG5cdFx0XHRcdGZyYW1lQm9yZGVyOiAwLFxuXHRcdFx0XHR3aWR0aDogMCxcblx0XHRcdFx0aGVpZ2h0OiAwXG5cdFx0XHR9KVxuXHRcdCk7XG5cblx0XHQvLyBDcmVhdGUgYSBjYWNoZWFibGUgY29weSBvZiB0aGUgaWZyYW1lIGRvY3VtZW50IG9uIGZpcnN0IGNhbGwuXG5cdFx0Ly8gSUUgYW5kIE9wZXJhIHdpbGwgYWxsb3cgdXMgdG8gcmV1c2UgdGhlIGlmcmFtZURvYyB3aXRob3V0IHJlLXdyaXRpbmcgdGhlIGZha2UgSFRNTFxuXHRcdC8vIGRvY3VtZW50IHRvIGl0OyBXZWJLaXQgJiBGaXJlZm94IHdvbid0IGFsbG93IHJldXNpbmcgdGhlIGlmcmFtZSBkb2N1bWVudC5cblx0XHRpZiAoICFpZnJhbWVEb2MgfHwgIWlmcmFtZS5jcmVhdGVFbGVtZW50ICkge1xuXHRcdFx0aWZyYW1lRG9jID0gKCBpZnJhbWUuY29udGVudFdpbmRvdyB8fCBpZnJhbWUuY29udGVudERvY3VtZW50ICkuZG9jdW1lbnQ7XG5cdFx0XHRpZnJhbWVEb2Mud3JpdGUoXCI8IWRvY3R5cGUgaHRtbD48aHRtbD48Ym9keT5cIik7XG5cdFx0XHRpZnJhbWVEb2MuY2xvc2UoKTtcblx0XHR9XG5cblx0XHRlbGVtID0gaWZyYW1lRG9jLmJvZHkuYXBwZW5kQ2hpbGQoIGlmcmFtZURvYy5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKSApO1xuXG5cdFx0ZGlzcGxheSA9IGN1ckNTUyggZWxlbSwgXCJkaXNwbGF5XCIgKTtcblx0XHRkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKCBpZnJhbWUgKTtcblx0fVxuXG5cdC8vIFN0b3JlIHRoZSBjb3JyZWN0IGRlZmF1bHQgZGlzcGxheVxuXHRlbGVtZGlzcGxheVsgbm9kZU5hbWUgXSA9IGRpc3BsYXk7XG5cblx0cmV0dXJuIGRpc3BsYXk7XG59XG5cbmpRdWVyeS5lYWNoKFsgXCJoZWlnaHRcIiwgXCJ3aWR0aFwiIF0sIGZ1bmN0aW9uKCBpLCBuYW1lICkge1xuXHRqUXVlcnkuY3NzSG9va3NbIG5hbWUgXSA9IHtcblx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtLCBjb21wdXRlZCwgZXh0cmEgKSB7XG5cdFx0XHRpZiAoIGNvbXB1dGVkICkge1xuXHRcdFx0XHQvLyBjZXJ0YWluIGVsZW1lbnRzIGNhbiBoYXZlIGRpbWVuc2lvbiBpbmZvIGlmIHdlIGludmlzaWJseSBzaG93IHRoZW1cblx0XHRcdFx0Ly8gaG93ZXZlciwgaXQgbXVzdCBoYXZlIGEgY3VycmVudCBkaXNwbGF5IHN0eWxlIHRoYXQgd291bGQgYmVuZWZpdCBmcm9tIHRoaXNcblx0XHRcdFx0aWYgKCBlbGVtLm9mZnNldFdpZHRoID09PSAwICYmIHJkaXNwbGF5c3dhcC50ZXN0KCBjdXJDU1MoIGVsZW0sIFwiZGlzcGxheVwiICkgKSApIHtcblx0XHRcdFx0XHRyZXR1cm4galF1ZXJ5LnN3YXAoIGVsZW0sIGNzc1Nob3csIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGdldFdpZHRoT3JIZWlnaHQoIGVsZW0sIG5hbWUsIGV4dHJhICk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIGdldFdpZHRoT3JIZWlnaHQoIGVsZW0sIG5hbWUsIGV4dHJhICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0c2V0OiBmdW5jdGlvbiggZWxlbSwgdmFsdWUsIGV4dHJhICkge1xuXHRcdFx0cmV0dXJuIHNldFBvc2l0aXZlTnVtYmVyKCBlbGVtLCB2YWx1ZSwgZXh0cmEgP1xuXHRcdFx0XHRhdWdtZW50V2lkdGhPckhlaWdodChcblx0XHRcdFx0XHRlbGVtLFxuXHRcdFx0XHRcdG5hbWUsXG5cdFx0XHRcdFx0ZXh0cmEsXG5cdFx0XHRcdFx0alF1ZXJ5LnN1cHBvcnQuYm94U2l6aW5nICYmIGpRdWVyeS5jc3MoIGVsZW0sIFwiYm94U2l6aW5nXCIgKSA9PT0gXCJib3JkZXItYm94XCJcblx0XHRcdFx0KSA6IDBcblx0XHRcdCk7XG5cdFx0fVxuXHR9O1xufSk7XG5cbmlmICggIWpRdWVyeS5zdXBwb3J0Lm9wYWNpdHkgKSB7XG5cdGpRdWVyeS5jc3NIb29rcy5vcGFjaXR5ID0ge1xuXHRcdGdldDogZnVuY3Rpb24oIGVsZW0sIGNvbXB1dGVkICkge1xuXHRcdFx0Ly8gSUUgdXNlcyBmaWx0ZXJzIGZvciBvcGFjaXR5XG5cdFx0XHRyZXR1cm4gcm9wYWNpdHkudGVzdCggKGNvbXB1dGVkICYmIGVsZW0uY3VycmVudFN0eWxlID8gZWxlbS5jdXJyZW50U3R5bGUuZmlsdGVyIDogZWxlbS5zdHlsZS5maWx0ZXIpIHx8IFwiXCIgKSA/XG5cdFx0XHRcdCggMC4wMSAqIHBhcnNlRmxvYXQoIFJlZ0V4cC4kMSApICkgKyBcIlwiIDpcblx0XHRcdFx0Y29tcHV0ZWQgPyBcIjFcIiA6IFwiXCI7XG5cdFx0fSxcblxuXHRcdHNldDogZnVuY3Rpb24oIGVsZW0sIHZhbHVlICkge1xuXHRcdFx0dmFyIHN0eWxlID0gZWxlbS5zdHlsZSxcblx0XHRcdFx0Y3VycmVudFN0eWxlID0gZWxlbS5jdXJyZW50U3R5bGUsXG5cdFx0XHRcdG9wYWNpdHkgPSBqUXVlcnkuaXNOdW1lcmljKCB2YWx1ZSApID8gXCJhbHBoYShvcGFjaXR5PVwiICsgdmFsdWUgKiAxMDAgKyBcIilcIiA6IFwiXCIsXG5cdFx0XHRcdGZpbHRlciA9IGN1cnJlbnRTdHlsZSAmJiBjdXJyZW50U3R5bGUuZmlsdGVyIHx8IHN0eWxlLmZpbHRlciB8fCBcIlwiO1xuXG5cdFx0XHQvLyBJRSBoYXMgdHJvdWJsZSB3aXRoIG9wYWNpdHkgaWYgaXQgZG9lcyBub3QgaGF2ZSBsYXlvdXRcblx0XHRcdC8vIEZvcmNlIGl0IGJ5IHNldHRpbmcgdGhlIHpvb20gbGV2ZWxcblx0XHRcdHN0eWxlLnpvb20gPSAxO1xuXG5cdFx0XHQvLyBpZiBzZXR0aW5nIG9wYWNpdHkgdG8gMSwgYW5kIG5vIG90aGVyIGZpbHRlcnMgZXhpc3QgLSBhdHRlbXB0IHRvIHJlbW92ZSBmaWx0ZXIgYXR0cmlidXRlICM2NjUyXG5cdFx0XHRpZiAoIHZhbHVlID49IDEgJiYgalF1ZXJ5LnRyaW0oIGZpbHRlci5yZXBsYWNlKCByYWxwaGEsIFwiXCIgKSApID09PSBcIlwiICYmXG5cdFx0XHRcdHN0eWxlLnJlbW92ZUF0dHJpYnV0ZSApIHtcblxuXHRcdFx0XHQvLyBTZXR0aW5nIHN0eWxlLmZpbHRlciB0byBudWxsLCBcIlwiICYgXCIgXCIgc3RpbGwgbGVhdmUgXCJmaWx0ZXI6XCIgaW4gdGhlIGNzc1RleHRcblx0XHRcdFx0Ly8gaWYgXCJmaWx0ZXI6XCIgaXMgcHJlc2VudCBhdCBhbGwsIGNsZWFyVHlwZSBpcyBkaXNhYmxlZCwgd2Ugd2FudCB0byBhdm9pZCB0aGlzXG5cdFx0XHRcdC8vIHN0eWxlLnJlbW92ZUF0dHJpYnV0ZSBpcyBJRSBPbmx5LCBidXQgc28gYXBwYXJlbnRseSBpcyB0aGlzIGNvZGUgcGF0aC4uLlxuXHRcdFx0XHRzdHlsZS5yZW1vdmVBdHRyaWJ1dGUoIFwiZmlsdGVyXCIgKTtcblxuXHRcdFx0XHQvLyBpZiB0aGVyZSB0aGVyZSBpcyBubyBmaWx0ZXIgc3R5bGUgYXBwbGllZCBpbiBhIGNzcyBydWxlLCB3ZSBhcmUgZG9uZVxuXHRcdFx0XHRpZiAoIGN1cnJlbnRTdHlsZSAmJiAhY3VycmVudFN0eWxlLmZpbHRlciApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gb3RoZXJ3aXNlLCBzZXQgbmV3IGZpbHRlciB2YWx1ZXNcblx0XHRcdHN0eWxlLmZpbHRlciA9IHJhbHBoYS50ZXN0KCBmaWx0ZXIgKSA/XG5cdFx0XHRcdGZpbHRlci5yZXBsYWNlKCByYWxwaGEsIG9wYWNpdHkgKSA6XG5cdFx0XHRcdGZpbHRlciArIFwiIFwiICsgb3BhY2l0eTtcblx0XHR9XG5cdH07XG59XG5cbi8vIFRoZXNlIGhvb2tzIGNhbm5vdCBiZSBhZGRlZCB1bnRpbCBET00gcmVhZHkgYmVjYXVzZSB0aGUgc3VwcG9ydCB0ZXN0XG4vLyBmb3IgaXQgaXMgbm90IHJ1biB1bnRpbCBhZnRlciBET00gcmVhZHlcbmpRdWVyeShmdW5jdGlvbigpIHtcblx0aWYgKCAhalF1ZXJ5LnN1cHBvcnQucmVsaWFibGVNYXJnaW5SaWdodCApIHtcblx0XHRqUXVlcnkuY3NzSG9va3MubWFyZ2luUmlnaHQgPSB7XG5cdFx0XHRnZXQ6IGZ1bmN0aW9uKCBlbGVtLCBjb21wdXRlZCApIHtcblx0XHRcdFx0Ly8gV2ViS2l0IEJ1ZyAxMzM0MyAtIGdldENvbXB1dGVkU3R5bGUgcmV0dXJucyB3cm9uZyB2YWx1ZSBmb3IgbWFyZ2luLXJpZ2h0XG5cdFx0XHRcdC8vIFdvcmsgYXJvdW5kIGJ5IHRlbXBvcmFyaWx5IHNldHRpbmcgZWxlbWVudCBkaXNwbGF5IHRvIGlubGluZS1ibG9ja1xuXHRcdFx0XHRyZXR1cm4galF1ZXJ5LnN3YXAoIGVsZW0sIHsgXCJkaXNwbGF5XCI6IFwiaW5saW5lLWJsb2NrXCIgfSwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKCBjb21wdXRlZCApIHtcblx0XHRcdFx0XHRcdHJldHVybiBjdXJDU1MoIGVsZW0sIFwibWFyZ2luUmlnaHRcIiApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxuXG5cdC8vIFdlYmtpdCBidWc6IGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD0yOTA4NFxuXHQvLyBnZXRDb21wdXRlZFN0eWxlIHJldHVybnMgcGVyY2VudCB3aGVuIHNwZWNpZmllZCBmb3IgdG9wL2xlZnQvYm90dG9tL3JpZ2h0XG5cdC8vIHJhdGhlciB0aGFuIG1ha2UgdGhlIGNzcyBtb2R1bGUgZGVwZW5kIG9uIHRoZSBvZmZzZXQgbW9kdWxlLCB3ZSBqdXN0IGNoZWNrIGZvciBpdCBoZXJlXG5cdGlmICggIWpRdWVyeS5zdXBwb3J0LnBpeGVsUG9zaXRpb24gJiYgalF1ZXJ5LmZuLnBvc2l0aW9uICkge1xuXHRcdGpRdWVyeS5lYWNoKCBbIFwidG9wXCIsIFwibGVmdFwiIF0sIGZ1bmN0aW9uKCBpLCBwcm9wICkge1xuXHRcdFx0alF1ZXJ5LmNzc0hvb2tzWyBwcm9wIF0gPSB7XG5cdFx0XHRcdGdldDogZnVuY3Rpb24oIGVsZW0sIGNvbXB1dGVkICkge1xuXHRcdFx0XHRcdGlmICggY29tcHV0ZWQgKSB7XG5cdFx0XHRcdFx0XHR2YXIgcmV0ID0gY3VyQ1NTKCBlbGVtLCBwcm9wICk7XG5cdFx0XHRcdFx0XHQvLyBpZiBjdXJDU1MgcmV0dXJucyBwZXJjZW50YWdlLCBmYWxsYmFjayB0byBvZmZzZXRcblx0XHRcdFx0XHRcdHJldHVybiBybnVtbm9ucHgudGVzdCggcmV0ICkgPyBqUXVlcnkoIGVsZW0gKS5wb3NpdGlvbigpWyBwcm9wIF0gKyBcInB4XCIgOiByZXQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH0pO1xuXHR9XG5cbn0pO1xuXG5pZiAoIGpRdWVyeS5leHByICYmIGpRdWVyeS5leHByLmZpbHRlcnMgKSB7XG5cdGpRdWVyeS5leHByLmZpbHRlcnMuaGlkZGVuID0gZnVuY3Rpb24oIGVsZW0gKSB7XG5cdFx0cmV0dXJuICggZWxlbS5vZmZzZXRXaWR0aCA9PT0gMCAmJiBlbGVtLm9mZnNldEhlaWdodCA9PT0gMCApIHx8ICghalF1ZXJ5LnN1cHBvcnQucmVsaWFibGVIaWRkZW5PZmZzZXRzICYmICgoZWxlbS5zdHlsZSAmJiBlbGVtLnN0eWxlLmRpc3BsYXkpIHx8IGN1ckNTUyggZWxlbSwgXCJkaXNwbGF5XCIgKSkgPT09IFwibm9uZVwiKTtcblx0fTtcblxuXHRqUXVlcnkuZXhwci5maWx0ZXJzLnZpc2libGUgPSBmdW5jdGlvbiggZWxlbSApIHtcblx0XHRyZXR1cm4gIWpRdWVyeS5leHByLmZpbHRlcnMuaGlkZGVuKCBlbGVtICk7XG5cdH07XG59XG5cbi8vIFRoZXNlIGhvb2tzIGFyZSB1c2VkIGJ5IGFuaW1hdGUgdG8gZXhwYW5kIHByb3BlcnRpZXNcbmpRdWVyeS5lYWNoKHtcblx0bWFyZ2luOiBcIlwiLFxuXHRwYWRkaW5nOiBcIlwiLFxuXHRib3JkZXI6IFwiV2lkdGhcIlxufSwgZnVuY3Rpb24oIHByZWZpeCwgc3VmZml4ICkge1xuXHRqUXVlcnkuY3NzSG9va3NbIHByZWZpeCArIHN1ZmZpeCBdID0ge1xuXHRcdGV4cGFuZDogZnVuY3Rpb24oIHZhbHVlICkge1xuXHRcdFx0dmFyIGksXG5cblx0XHRcdFx0Ly8gYXNzdW1lcyBhIHNpbmdsZSBudW1iZXIgaWYgbm90IGEgc3RyaW5nXG5cdFx0XHRcdHBhcnRzID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gdmFsdWUuc3BsaXQoXCIgXCIpIDogWyB2YWx1ZSBdLFxuXHRcdFx0XHRleHBhbmRlZCA9IHt9O1xuXG5cdFx0XHRmb3IgKCBpID0gMDsgaSA8IDQ7IGkrKyApIHtcblx0XHRcdFx0ZXhwYW5kZWRbIHByZWZpeCArIGNzc0V4cGFuZFsgaSBdICsgc3VmZml4IF0gPVxuXHRcdFx0XHRcdHBhcnRzWyBpIF0gfHwgcGFydHNbIGkgLSAyIF0gfHwgcGFydHNbIDAgXTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGV4cGFuZGVkO1xuXHRcdH1cblx0fTtcblxuXHRpZiAoICFybWFyZ2luLnRlc3QoIHByZWZpeCApICkge1xuXHRcdGpRdWVyeS5jc3NIb29rc1sgcHJlZml4ICsgc3VmZml4IF0uc2V0ID0gc2V0UG9zaXRpdmVOdW1iZXI7XG5cdH1cbn0pO1xudmFyIHIyMCA9IC8lMjAvZyxcblx0cmJyYWNrZXQgPSAvXFxbXFxdJC8sXG5cdHJDUkxGID0gL1xccj9cXG4vZyxcblx0cmlucHV0ID0gL14oPzpjb2xvcnxkYXRlfGRhdGV0aW1lfGRhdGV0aW1lLWxvY2FsfGVtYWlsfGhpZGRlbnxtb250aHxudW1iZXJ8cGFzc3dvcmR8cmFuZ2V8c2VhcmNofHRlbHx0ZXh0fHRpbWV8dXJsfHdlZWspJC9pLFxuXHRyc2VsZWN0VGV4dGFyZWEgPSAvXig/OnNlbGVjdHx0ZXh0YXJlYSkvaTtcblxualF1ZXJ5LmZuLmV4dGVuZCh7XG5cdHNlcmlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5wYXJhbSggdGhpcy5zZXJpYWxpemVBcnJheSgpICk7XG5cdH0sXG5cdHNlcmlhbGl6ZUFycmF5OiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLmVsZW1lbnRzID8galF1ZXJ5Lm1ha2VBcnJheSggdGhpcy5lbGVtZW50cyApIDogdGhpcztcblx0XHR9KVxuXHRcdC5maWx0ZXIoZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLm5hbWUgJiYgIXRoaXMuZGlzYWJsZWQgJiZcblx0XHRcdFx0KCB0aGlzLmNoZWNrZWQgfHwgcnNlbGVjdFRleHRhcmVhLnRlc3QoIHRoaXMubm9kZU5hbWUgKSB8fFxuXHRcdFx0XHRcdHJpbnB1dC50ZXN0KCB0aGlzLnR5cGUgKSApO1xuXHRcdH0pXG5cdFx0Lm1hcChmdW5jdGlvbiggaSwgZWxlbSApe1xuXHRcdFx0dmFyIHZhbCA9IGpRdWVyeSggdGhpcyApLnZhbCgpO1xuXG5cdFx0XHRyZXR1cm4gdmFsID09IG51bGwgP1xuXHRcdFx0XHRudWxsIDpcblx0XHRcdFx0alF1ZXJ5LmlzQXJyYXkoIHZhbCApID9cblx0XHRcdFx0XHRqUXVlcnkubWFwKCB2YWwsIGZ1bmN0aW9uKCB2YWwsIGkgKXtcblx0XHRcdFx0XHRcdHJldHVybiB7IG5hbWU6IGVsZW0ubmFtZSwgdmFsdWU6IHZhbC5yZXBsYWNlKCByQ1JMRiwgXCJcXHJcXG5cIiApIH07XG5cdFx0XHRcdFx0fSkgOlxuXHRcdFx0XHRcdHsgbmFtZTogZWxlbS5uYW1lLCB2YWx1ZTogdmFsLnJlcGxhY2UoIHJDUkxGLCBcIlxcclxcblwiICkgfTtcblx0XHR9KS5nZXQoKTtcblx0fVxufSk7XG5cbi8vU2VyaWFsaXplIGFuIGFycmF5IG9mIGZvcm0gZWxlbWVudHMgb3IgYSBzZXQgb2Zcbi8va2V5L3ZhbHVlcyBpbnRvIGEgcXVlcnkgc3RyaW5nXG5qUXVlcnkucGFyYW0gPSBmdW5jdGlvbiggYSwgdHJhZGl0aW9uYWwgKSB7XG5cdHZhciBwcmVmaXgsXG5cdFx0cyA9IFtdLFxuXHRcdGFkZCA9IGZ1bmN0aW9uKCBrZXksIHZhbHVlICkge1xuXHRcdFx0Ly8gSWYgdmFsdWUgaXMgYSBmdW5jdGlvbiwgaW52b2tlIGl0IGFuZCByZXR1cm4gaXRzIHZhbHVlXG5cdFx0XHR2YWx1ZSA9IGpRdWVyeS5pc0Z1bmN0aW9uKCB2YWx1ZSApID8gdmFsdWUoKSA6ICggdmFsdWUgPT0gbnVsbCA/IFwiXCIgOiB2YWx1ZSApO1xuXHRcdFx0c1sgcy5sZW5ndGggXSA9IGVuY29kZVVSSUNvbXBvbmVudCgga2V5ICkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudCggdmFsdWUgKTtcblx0XHR9O1xuXG5cdC8vIFNldCB0cmFkaXRpb25hbCB0byB0cnVlIGZvciBqUXVlcnkgPD0gMS4zLjIgYmVoYXZpb3IuXG5cdGlmICggdHJhZGl0aW9uYWwgPT09IHVuZGVmaW5lZCApIHtcblx0XHR0cmFkaXRpb25hbCA9IGpRdWVyeS5hamF4U2V0dGluZ3MgJiYgalF1ZXJ5LmFqYXhTZXR0aW5ncy50cmFkaXRpb25hbDtcblx0fVxuXG5cdC8vIElmIGFuIGFycmF5IHdhcyBwYXNzZWQgaW4sIGFzc3VtZSB0aGF0IGl0IGlzIGFuIGFycmF5IG9mIGZvcm0gZWxlbWVudHMuXG5cdGlmICggalF1ZXJ5LmlzQXJyYXkoIGEgKSB8fCAoIGEuanF1ZXJ5ICYmICFqUXVlcnkuaXNQbGFpbk9iamVjdCggYSApICkgKSB7XG5cdFx0Ly8gU2VyaWFsaXplIHRoZSBmb3JtIGVsZW1lbnRzXG5cdFx0alF1ZXJ5LmVhY2goIGEsIGZ1bmN0aW9uKCkge1xuXHRcdFx0YWRkKCB0aGlzLm5hbWUsIHRoaXMudmFsdWUgKTtcblx0XHR9KTtcblxuXHR9IGVsc2Uge1xuXHRcdC8vIElmIHRyYWRpdGlvbmFsLCBlbmNvZGUgdGhlIFwib2xkXCIgd2F5ICh0aGUgd2F5IDEuMy4yIG9yIG9sZGVyXG5cdFx0Ly8gZGlkIGl0KSwgb3RoZXJ3aXNlIGVuY29kZSBwYXJhbXMgcmVjdXJzaXZlbHkuXG5cdFx0Zm9yICggcHJlZml4IGluIGEgKSB7XG5cdFx0XHRidWlsZFBhcmFtcyggcHJlZml4LCBhWyBwcmVmaXggXSwgdHJhZGl0aW9uYWwsIGFkZCApO1xuXHRcdH1cblx0fVxuXG5cdC8vIFJldHVybiB0aGUgcmVzdWx0aW5nIHNlcmlhbGl6YXRpb25cblx0cmV0dXJuIHMuam9pbiggXCImXCIgKS5yZXBsYWNlKCByMjAsIFwiK1wiICk7XG59O1xuXG5mdW5jdGlvbiBidWlsZFBhcmFtcyggcHJlZml4LCBvYmosIHRyYWRpdGlvbmFsLCBhZGQgKSB7XG5cdHZhciBuYW1lO1xuXG5cdGlmICggalF1ZXJ5LmlzQXJyYXkoIG9iaiApICkge1xuXHRcdC8vIFNlcmlhbGl6ZSBhcnJheSBpdGVtLlxuXHRcdGpRdWVyeS5lYWNoKCBvYmosIGZ1bmN0aW9uKCBpLCB2ICkge1xuXHRcdFx0aWYgKCB0cmFkaXRpb25hbCB8fCByYnJhY2tldC50ZXN0KCBwcmVmaXggKSApIHtcblx0XHRcdFx0Ly8gVHJlYXQgZWFjaCBhcnJheSBpdGVtIGFzIGEgc2NhbGFyLlxuXHRcdFx0XHRhZGQoIHByZWZpeCwgdiApO1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBJZiBhcnJheSBpdGVtIGlzIG5vbi1zY2FsYXIgKGFycmF5IG9yIG9iamVjdCksIGVuY29kZSBpdHNcblx0XHRcdFx0Ly8gbnVtZXJpYyBpbmRleCB0byByZXNvbHZlIGRlc2VyaWFsaXphdGlvbiBhbWJpZ3VpdHkgaXNzdWVzLlxuXHRcdFx0XHQvLyBOb3RlIHRoYXQgcmFjayAoYXMgb2YgMS4wLjApIGNhbid0IGN1cnJlbnRseSBkZXNlcmlhbGl6ZVxuXHRcdFx0XHQvLyBuZXN0ZWQgYXJyYXlzIHByb3Blcmx5LCBhbmQgYXR0ZW1wdGluZyB0byBkbyBzbyBtYXkgY2F1c2Vcblx0XHRcdFx0Ly8gYSBzZXJ2ZXIgZXJyb3IuIFBvc3NpYmxlIGZpeGVzIGFyZSB0byBtb2RpZnkgcmFjaydzXG5cdFx0XHRcdC8vIGRlc2VyaWFsaXphdGlvbiBhbGdvcml0aG0gb3IgdG8gcHJvdmlkZSBhbiBvcHRpb24gb3IgZmxhZ1xuXHRcdFx0XHQvLyB0byBmb3JjZSBhcnJheSBzZXJpYWxpemF0aW9uIHRvIGJlIHNoYWxsb3cuXG5cdFx0XHRcdGJ1aWxkUGFyYW1zKCBwcmVmaXggKyBcIltcIiArICggdHlwZW9mIHYgPT09IFwib2JqZWN0XCIgPyBpIDogXCJcIiApICsgXCJdXCIsIHYsIHRyYWRpdGlvbmFsLCBhZGQgKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHR9IGVsc2UgaWYgKCAhdHJhZGl0aW9uYWwgJiYgalF1ZXJ5LnR5cGUoIG9iaiApID09PSBcIm9iamVjdFwiICkge1xuXHRcdC8vIFNlcmlhbGl6ZSBvYmplY3QgaXRlbS5cblx0XHRmb3IgKCBuYW1lIGluIG9iaiApIHtcblx0XHRcdGJ1aWxkUGFyYW1zKCBwcmVmaXggKyBcIltcIiArIG5hbWUgKyBcIl1cIiwgb2JqWyBuYW1lIF0sIHRyYWRpdGlvbmFsLCBhZGQgKTtcblx0XHR9XG5cblx0fSBlbHNlIHtcblx0XHQvLyBTZXJpYWxpemUgc2NhbGFyIGl0ZW0uXG5cdFx0YWRkKCBwcmVmaXgsIG9iaiApO1xuXHR9XG59XG52YXIgLy8gRG9jdW1lbnQgbG9jYXRpb25cblx0YWpheExvY2F0aW9uLFxuXHQvLyBEb2N1bWVudCBsb2NhdGlvbiBzZWdtZW50c1xuXHRhamF4TG9jUGFydHMsXG5cblx0cmhhc2ggPSAvIy4qJC8sXG5cdHJoZWFkZXJzID0gL14oLio/KTpbIFxcdF0qKFteXFxyXFxuXSopXFxyPyQvbWcsIC8vIElFIGxlYXZlcyBhbiBcXHIgY2hhcmFjdGVyIGF0IEVPTFxuXHQvLyAjNzY1MywgIzgxMjUsICM4MTUyOiBsb2NhbCBwcm90b2NvbCBkZXRlY3Rpb25cblx0cmxvY2FsUHJvdG9jb2wgPSAvXig/OmFib3V0fGFwcHxhcHBcXC1zdG9yYWdlfC4rXFwtZXh0ZW5zaW9ufGZpbGV8cmVzfHdpZGdldCk6JC8sXG5cdHJub0NvbnRlbnQgPSAvXig/OkdFVHxIRUFEKSQvLFxuXHRycHJvdG9jb2wgPSAvXlxcL1xcLy8sXG5cdHJxdWVyeSA9IC9cXD8vLFxuXHRyc2NyaXB0ID0gLzxzY3JpcHRcXGJbXjxdKig/Oig/ITxcXC9zY3JpcHQ+KTxbXjxdKikqPFxcL3NjcmlwdD4vZ2ksXG5cdHJ0cyA9IC8oWz8mXSlfPVteJl0qLyxcblx0cnVybCA9IC9eKFtcXHdcXCtcXC5cXC1dKzopKD86XFwvXFwvKFteXFwvPyM6XSopKD86OihcXGQrKXwpfCkvLFxuXG5cdC8vIEtlZXAgYSBjb3B5IG9mIHRoZSBvbGQgbG9hZCBtZXRob2Rcblx0X2xvYWQgPSBqUXVlcnkuZm4ubG9hZCxcblxuXHQvKiBQcmVmaWx0ZXJzXG5cdCAqIDEpIFRoZXkgYXJlIHVzZWZ1bCB0byBpbnRyb2R1Y2UgY3VzdG9tIGRhdGFUeXBlcyAoc2VlIGFqYXgvanNvbnAuanMgZm9yIGFuIGV4YW1wbGUpXG5cdCAqIDIpIFRoZXNlIGFyZSBjYWxsZWQ6XG5cdCAqICAgIC0gQkVGT1JFIGFza2luZyBmb3IgYSB0cmFuc3BvcnRcblx0ICogICAgLSBBRlRFUiBwYXJhbSBzZXJpYWxpemF0aW9uIChzLmRhdGEgaXMgYSBzdHJpbmcgaWYgcy5wcm9jZXNzRGF0YSBpcyB0cnVlKVxuXHQgKiAzKSBrZXkgaXMgdGhlIGRhdGFUeXBlXG5cdCAqIDQpIHRoZSBjYXRjaGFsbCBzeW1ib2wgXCIqXCIgY2FuIGJlIHVzZWRcblx0ICogNSkgZXhlY3V0aW9uIHdpbGwgc3RhcnQgd2l0aCB0cmFuc3BvcnQgZGF0YVR5cGUgYW5kIFRIRU4gY29udGludWUgZG93biB0byBcIipcIiBpZiBuZWVkZWRcblx0ICovXG5cdHByZWZpbHRlcnMgPSB7fSxcblxuXHQvKiBUcmFuc3BvcnRzIGJpbmRpbmdzXG5cdCAqIDEpIGtleSBpcyB0aGUgZGF0YVR5cGVcblx0ICogMikgdGhlIGNhdGNoYWxsIHN5bWJvbCBcIipcIiBjYW4gYmUgdXNlZFxuXHQgKiAzKSBzZWxlY3Rpb24gd2lsbCBzdGFydCB3aXRoIHRyYW5zcG9ydCBkYXRhVHlwZSBhbmQgVEhFTiBnbyB0byBcIipcIiBpZiBuZWVkZWRcblx0ICovXG5cdHRyYW5zcG9ydHMgPSB7fSxcblxuXHQvLyBBdm9pZCBjb21tZW50LXByb2xvZyBjaGFyIHNlcXVlbmNlICgjMTAwOTgpOyBtdXN0IGFwcGVhc2UgbGludCBhbmQgZXZhZGUgY29tcHJlc3Npb25cblx0YWxsVHlwZXMgPSBbXCIqL1wiXSArIFtcIipcIl07XG5cbi8vICM4MTM4LCBJRSBtYXkgdGhyb3cgYW4gZXhjZXB0aW9uIHdoZW4gYWNjZXNzaW5nXG4vLyBhIGZpZWxkIGZyb20gd2luZG93LmxvY2F0aW9uIGlmIGRvY3VtZW50LmRvbWFpbiBoYXMgYmVlbiBzZXRcbnRyeSB7XG5cdGFqYXhMb2NhdGlvbiA9IGxvY2F0aW9uLmhyZWY7XG59IGNhdGNoKCBlICkge1xuXHQvLyBVc2UgdGhlIGhyZWYgYXR0cmlidXRlIG9mIGFuIEEgZWxlbWVudFxuXHQvLyBzaW5jZSBJRSB3aWxsIG1vZGlmeSBpdCBnaXZlbiBkb2N1bWVudC5sb2NhdGlvblxuXHRhamF4TG9jYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImFcIiApO1xuXHRhamF4TG9jYXRpb24uaHJlZiA9IFwiXCI7XG5cdGFqYXhMb2NhdGlvbiA9IGFqYXhMb2NhdGlvbi5ocmVmO1xufVxuXG4vLyBTZWdtZW50IGxvY2F0aW9uIGludG8gcGFydHNcbmFqYXhMb2NQYXJ0cyA9IHJ1cmwuZXhlYyggYWpheExvY2F0aW9uLnRvTG93ZXJDYXNlKCkgKSB8fCBbXTtcblxuLy8gQmFzZSBcImNvbnN0cnVjdG9yXCIgZm9yIGpRdWVyeS5hamF4UHJlZmlsdGVyIGFuZCBqUXVlcnkuYWpheFRyYW5zcG9ydFxuZnVuY3Rpb24gYWRkVG9QcmVmaWx0ZXJzT3JUcmFuc3BvcnRzKCBzdHJ1Y3R1cmUgKSB7XG5cblx0Ly8gZGF0YVR5cGVFeHByZXNzaW9uIGlzIG9wdGlvbmFsIGFuZCBkZWZhdWx0cyB0byBcIipcIlxuXHRyZXR1cm4gZnVuY3Rpb24oIGRhdGFUeXBlRXhwcmVzc2lvbiwgZnVuYyApIHtcblxuXHRcdGlmICggdHlwZW9mIGRhdGFUeXBlRXhwcmVzc2lvbiAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdGZ1bmMgPSBkYXRhVHlwZUV4cHJlc3Npb247XG5cdFx0XHRkYXRhVHlwZUV4cHJlc3Npb24gPSBcIipcIjtcblx0XHR9XG5cblx0XHR2YXIgZGF0YVR5cGUsIGxpc3QsIHBsYWNlQmVmb3JlLFxuXHRcdFx0ZGF0YVR5cGVzID0gZGF0YVR5cGVFeHByZXNzaW9uLnRvTG93ZXJDYXNlKCkuc3BsaXQoIGNvcmVfcnNwYWNlICksXG5cdFx0XHRpID0gMCxcblx0XHRcdGxlbmd0aCA9IGRhdGFUeXBlcy5sZW5ndGg7XG5cblx0XHRpZiAoIGpRdWVyeS5pc0Z1bmN0aW9uKCBmdW5jICkgKSB7XG5cdFx0XHQvLyBGb3IgZWFjaCBkYXRhVHlwZSBpbiB0aGUgZGF0YVR5cGVFeHByZXNzaW9uXG5cdFx0XHRmb3IgKCA7IGkgPCBsZW5ndGg7IGkrKyApIHtcblx0XHRcdFx0ZGF0YVR5cGUgPSBkYXRhVHlwZXNbIGkgXTtcblx0XHRcdFx0Ly8gV2UgY29udHJvbCBpZiB3ZSdyZSBhc2tlZCB0byBhZGQgYmVmb3JlXG5cdFx0XHRcdC8vIGFueSBleGlzdGluZyBlbGVtZW50XG5cdFx0XHRcdHBsYWNlQmVmb3JlID0gL15cXCsvLnRlc3QoIGRhdGFUeXBlICk7XG5cdFx0XHRcdGlmICggcGxhY2VCZWZvcmUgKSB7XG5cdFx0XHRcdFx0ZGF0YVR5cGUgPSBkYXRhVHlwZS5zdWJzdHIoIDEgKSB8fCBcIipcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRsaXN0ID0gc3RydWN0dXJlWyBkYXRhVHlwZSBdID0gc3RydWN0dXJlWyBkYXRhVHlwZSBdIHx8IFtdO1xuXHRcdFx0XHQvLyB0aGVuIHdlIGFkZCB0byB0aGUgc3RydWN0dXJlIGFjY29yZGluZ2x5XG5cdFx0XHRcdGxpc3RbIHBsYWNlQmVmb3JlID8gXCJ1bnNoaWZ0XCIgOiBcInB1c2hcIiBdKCBmdW5jICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xufVxuXG4vLyBCYXNlIGluc3BlY3Rpb24gZnVuY3Rpb24gZm9yIHByZWZpbHRlcnMgYW5kIHRyYW5zcG9ydHNcbmZ1bmN0aW9uIGluc3BlY3RQcmVmaWx0ZXJzT3JUcmFuc3BvcnRzKCBzdHJ1Y3R1cmUsIG9wdGlvbnMsIG9yaWdpbmFsT3B0aW9ucywganFYSFIsXG5cdFx0ZGF0YVR5cGUgLyogaW50ZXJuYWwgKi8sIGluc3BlY3RlZCAvKiBpbnRlcm5hbCAqLyApIHtcblxuXHRkYXRhVHlwZSA9IGRhdGFUeXBlIHx8IG9wdGlvbnMuZGF0YVR5cGVzWyAwIF07XG5cdGluc3BlY3RlZCA9IGluc3BlY3RlZCB8fCB7fTtcblxuXHRpbnNwZWN0ZWRbIGRhdGFUeXBlIF0gPSB0cnVlO1xuXG5cdHZhciBzZWxlY3Rpb24sXG5cdFx0bGlzdCA9IHN0cnVjdHVyZVsgZGF0YVR5cGUgXSxcblx0XHRpID0gMCxcblx0XHRsZW5ndGggPSBsaXN0ID8gbGlzdC5sZW5ndGggOiAwLFxuXHRcdGV4ZWN1dGVPbmx5ID0gKCBzdHJ1Y3R1cmUgPT09IHByZWZpbHRlcnMgKTtcblxuXHRmb3IgKCA7IGkgPCBsZW5ndGggJiYgKCBleGVjdXRlT25seSB8fCAhc2VsZWN0aW9uICk7IGkrKyApIHtcblx0XHRzZWxlY3Rpb24gPSBsaXN0WyBpIF0oIG9wdGlvbnMsIG9yaWdpbmFsT3B0aW9ucywganFYSFIgKTtcblx0XHQvLyBJZiB3ZSBnb3QgcmVkaXJlY3RlZCB0byBhbm90aGVyIGRhdGFUeXBlXG5cdFx0Ly8gd2UgdHJ5IHRoZXJlIGlmIGV4ZWN1dGluZyBvbmx5IGFuZCBub3QgZG9uZSBhbHJlYWR5XG5cdFx0aWYgKCB0eXBlb2Ygc2VsZWN0aW9uID09PSBcInN0cmluZ1wiICkge1xuXHRcdFx0aWYgKCAhZXhlY3V0ZU9ubHkgfHwgaW5zcGVjdGVkWyBzZWxlY3Rpb24gXSApIHtcblx0XHRcdFx0c2VsZWN0aW9uID0gdW5kZWZpbmVkO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0b3B0aW9ucy5kYXRhVHlwZXMudW5zaGlmdCggc2VsZWN0aW9uICk7XG5cdFx0XHRcdHNlbGVjdGlvbiA9IGluc3BlY3RQcmVmaWx0ZXJzT3JUcmFuc3BvcnRzKFxuXHRcdFx0XHRcdFx0c3RydWN0dXJlLCBvcHRpb25zLCBvcmlnaW5hbE9wdGlvbnMsIGpxWEhSLCBzZWxlY3Rpb24sIGluc3BlY3RlZCApO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHQvLyBJZiB3ZSdyZSBvbmx5IGV4ZWN1dGluZyBvciBub3RoaW5nIHdhcyBzZWxlY3RlZFxuXHQvLyB3ZSB0cnkgdGhlIGNhdGNoYWxsIGRhdGFUeXBlIGlmIG5vdCBkb25lIGFscmVhZHlcblx0aWYgKCAoIGV4ZWN1dGVPbmx5IHx8ICFzZWxlY3Rpb24gKSAmJiAhaW5zcGVjdGVkWyBcIipcIiBdICkge1xuXHRcdHNlbGVjdGlvbiA9IGluc3BlY3RQcmVmaWx0ZXJzT3JUcmFuc3BvcnRzKFxuXHRcdFx0XHRzdHJ1Y3R1cmUsIG9wdGlvbnMsIG9yaWdpbmFsT3B0aW9ucywganFYSFIsIFwiKlwiLCBpbnNwZWN0ZWQgKTtcblx0fVxuXHQvLyB1bm5lY2Vzc2FyeSB3aGVuIG9ubHkgZXhlY3V0aW5nIChwcmVmaWx0ZXJzKVxuXHQvLyBidXQgaXQnbGwgYmUgaWdub3JlZCBieSB0aGUgY2FsbGVyIGluIHRoYXQgY2FzZVxuXHRyZXR1cm4gc2VsZWN0aW9uO1xufVxuXG4vLyBBIHNwZWNpYWwgZXh0ZW5kIGZvciBhamF4IG9wdGlvbnNcbi8vIHRoYXQgdGFrZXMgXCJmbGF0XCIgb3B0aW9ucyAobm90IHRvIGJlIGRlZXAgZXh0ZW5kZWQpXG4vLyBGaXhlcyAjOTg4N1xuZnVuY3Rpb24gYWpheEV4dGVuZCggdGFyZ2V0LCBzcmMgKSB7XG5cdHZhciBrZXksIGRlZXAsXG5cdFx0ZmxhdE9wdGlvbnMgPSBqUXVlcnkuYWpheFNldHRpbmdzLmZsYXRPcHRpb25zIHx8IHt9O1xuXHRmb3IgKCBrZXkgaW4gc3JjICkge1xuXHRcdGlmICggc3JjWyBrZXkgXSAhPT0gdW5kZWZpbmVkICkge1xuXHRcdFx0KCBmbGF0T3B0aW9uc1sga2V5IF0gPyB0YXJnZXQgOiAoIGRlZXAgfHwgKCBkZWVwID0ge30gKSApIClbIGtleSBdID0gc3JjWyBrZXkgXTtcblx0XHR9XG5cdH1cblx0aWYgKCBkZWVwICkge1xuXHRcdGpRdWVyeS5leHRlbmQoIHRydWUsIHRhcmdldCwgZGVlcCApO1xuXHR9XG59XG5cbmpRdWVyeS5mbi5sb2FkID0gZnVuY3Rpb24oIHVybCwgcGFyYW1zLCBjYWxsYmFjayApIHtcblx0aWYgKCB0eXBlb2YgdXJsICE9PSBcInN0cmluZ1wiICYmIF9sb2FkICkge1xuXHRcdHJldHVybiBfbG9hZC5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdH1cblxuXHQvLyBEb24ndCBkbyBhIHJlcXVlc3QgaWYgbm8gZWxlbWVudHMgYXJlIGJlaW5nIHJlcXVlc3RlZFxuXHRpZiAoICF0aGlzLmxlbmd0aCApIHtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHZhciBzZWxlY3RvciwgdHlwZSwgcmVzcG9uc2UsXG5cdFx0c2VsZiA9IHRoaXMsXG5cdFx0b2ZmID0gdXJsLmluZGV4T2YoXCIgXCIpO1xuXG5cdGlmICggb2ZmID49IDAgKSB7XG5cdFx0c2VsZWN0b3IgPSB1cmwuc2xpY2UoIG9mZiwgdXJsLmxlbmd0aCApO1xuXHRcdHVybCA9IHVybC5zbGljZSggMCwgb2ZmICk7XG5cdH1cblxuXHQvLyBJZiBpdCdzIGEgZnVuY3Rpb25cblx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggcGFyYW1zICkgKSB7XG5cblx0XHQvLyBXZSBhc3N1bWUgdGhhdCBpdCdzIHRoZSBjYWxsYmFja1xuXHRcdGNhbGxiYWNrID0gcGFyYW1zO1xuXHRcdHBhcmFtcyA9IHVuZGVmaW5lZDtcblxuXHQvLyBPdGhlcndpc2UsIGJ1aWxkIGEgcGFyYW0gc3RyaW5nXG5cdH0gZWxzZSBpZiAoIHBhcmFtcyAmJiB0eXBlb2YgcGFyYW1zID09PSBcIm9iamVjdFwiICkge1xuXHRcdHR5cGUgPSBcIlBPU1RcIjtcblx0fVxuXG5cdC8vIFJlcXVlc3QgdGhlIHJlbW90ZSBkb2N1bWVudFxuXHRqUXVlcnkuYWpheCh7XG5cdFx0dXJsOiB1cmwsXG5cblx0XHQvLyBpZiBcInR5cGVcIiB2YXJpYWJsZSBpcyB1bmRlZmluZWQsIHRoZW4gXCJHRVRcIiBtZXRob2Qgd2lsbCBiZSB1c2VkXG5cdFx0dHlwZTogdHlwZSxcblx0XHRkYXRhVHlwZTogXCJodG1sXCIsXG5cdFx0ZGF0YTogcGFyYW1zLFxuXHRcdGNvbXBsZXRlOiBmdW5jdGlvbigganFYSFIsIHN0YXR1cyApIHtcblx0XHRcdGlmICggY2FsbGJhY2sgKSB7XG5cdFx0XHRcdHNlbGYuZWFjaCggY2FsbGJhY2ssIHJlc3BvbnNlIHx8IFsganFYSFIucmVzcG9uc2VUZXh0LCBzdGF0dXMsIGpxWEhSIF0gKTtcblx0XHRcdH1cblx0XHR9XG5cdH0pLmRvbmUoZnVuY3Rpb24oIHJlc3BvbnNlVGV4dCApIHtcblxuXHRcdC8vIFNhdmUgcmVzcG9uc2UgZm9yIHVzZSBpbiBjb21wbGV0ZSBjYWxsYmFja1xuXHRcdHJlc3BvbnNlID0gYXJndW1lbnRzO1xuXG5cdFx0Ly8gU2VlIGlmIGEgc2VsZWN0b3Igd2FzIHNwZWNpZmllZFxuXHRcdHNlbGYuaHRtbCggc2VsZWN0b3IgP1xuXG5cdFx0XHQvLyBDcmVhdGUgYSBkdW1teSBkaXYgdG8gaG9sZCB0aGUgcmVzdWx0c1xuXHRcdFx0alF1ZXJ5KFwiPGRpdj5cIilcblxuXHRcdFx0XHQvLyBpbmplY3QgdGhlIGNvbnRlbnRzIG9mIHRoZSBkb2N1bWVudCBpbiwgcmVtb3ZpbmcgdGhlIHNjcmlwdHNcblx0XHRcdFx0Ly8gdG8gYXZvaWQgYW55ICdQZXJtaXNzaW9uIERlbmllZCcgZXJyb3JzIGluIElFXG5cdFx0XHRcdC5hcHBlbmQoIHJlc3BvbnNlVGV4dC5yZXBsYWNlKCByc2NyaXB0LCBcIlwiICkgKVxuXG5cdFx0XHRcdC8vIExvY2F0ZSB0aGUgc3BlY2lmaWVkIGVsZW1lbnRzXG5cdFx0XHRcdC5maW5kKCBzZWxlY3RvciApIDpcblxuXHRcdFx0Ly8gSWYgbm90LCBqdXN0IGluamVjdCB0aGUgZnVsbCByZXN1bHRcblx0XHRcdHJlc3BvbnNlVGV4dCApO1xuXG5cdH0pO1xuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLy8gQXR0YWNoIGEgYnVuY2ggb2YgZnVuY3Rpb25zIGZvciBoYW5kbGluZyBjb21tb24gQUpBWCBldmVudHNcbmpRdWVyeS5lYWNoKCBcImFqYXhTdGFydCBhamF4U3RvcCBhamF4Q29tcGxldGUgYWpheEVycm9yIGFqYXhTdWNjZXNzIGFqYXhTZW5kXCIuc3BsaXQoIFwiIFwiICksIGZ1bmN0aW9uKCBpLCBvICl7XG5cdGpRdWVyeS5mblsgbyBdID0gZnVuY3Rpb24oIGYgKXtcblx0XHRyZXR1cm4gdGhpcy5vbiggbywgZiApO1xuXHR9O1xufSk7XG5cbmpRdWVyeS5lYWNoKCBbIFwiZ2V0XCIsIFwicG9zdFwiIF0sIGZ1bmN0aW9uKCBpLCBtZXRob2QgKSB7XG5cdGpRdWVyeVsgbWV0aG9kIF0gPSBmdW5jdGlvbiggdXJsLCBkYXRhLCBjYWxsYmFjaywgdHlwZSApIHtcblx0XHQvLyBzaGlmdCBhcmd1bWVudHMgaWYgZGF0YSBhcmd1bWVudCB3YXMgb21pdHRlZFxuXHRcdGlmICggalF1ZXJ5LmlzRnVuY3Rpb24oIGRhdGEgKSApIHtcblx0XHRcdHR5cGUgPSB0eXBlIHx8IGNhbGxiYWNrO1xuXHRcdFx0Y2FsbGJhY2sgPSBkYXRhO1xuXHRcdFx0ZGF0YSA9IHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRyZXR1cm4galF1ZXJ5LmFqYXgoe1xuXHRcdFx0dHlwZTogbWV0aG9kLFxuXHRcdFx0dXJsOiB1cmwsXG5cdFx0XHRkYXRhOiBkYXRhLFxuXHRcdFx0c3VjY2VzczogY2FsbGJhY2ssXG5cdFx0XHRkYXRhVHlwZTogdHlwZVxuXHRcdH0pO1xuXHR9O1xufSk7XG5cbmpRdWVyeS5leHRlbmQoe1xuXG5cdGdldFNjcmlwdDogZnVuY3Rpb24oIHVybCwgY2FsbGJhY2sgKSB7XG5cdFx0cmV0dXJuIGpRdWVyeS5nZXQoIHVybCwgdW5kZWZpbmVkLCBjYWxsYmFjaywgXCJzY3JpcHRcIiApO1xuXHR9LFxuXG5cdGdldEpTT046IGZ1bmN0aW9uKCB1cmwsIGRhdGEsIGNhbGxiYWNrICkge1xuXHRcdHJldHVybiBqUXVlcnkuZ2V0KCB1cmwsIGRhdGEsIGNhbGxiYWNrLCBcImpzb25cIiApO1xuXHR9LFxuXG5cdC8vIENyZWF0ZXMgYSBmdWxsIGZsZWRnZWQgc2V0dGluZ3Mgb2JqZWN0IGludG8gdGFyZ2V0XG5cdC8vIHdpdGggYm90aCBhamF4U2V0dGluZ3MgYW5kIHNldHRpbmdzIGZpZWxkcy5cblx0Ly8gSWYgdGFyZ2V0IGlzIG9taXR0ZWQsIHdyaXRlcyBpbnRvIGFqYXhTZXR0aW5ncy5cblx0YWpheFNldHVwOiBmdW5jdGlvbiggdGFyZ2V0LCBzZXR0aW5ncyApIHtcblx0XHRpZiAoIHNldHRpbmdzICkge1xuXHRcdFx0Ly8gQnVpbGRpbmcgYSBzZXR0aW5ncyBvYmplY3Rcblx0XHRcdGFqYXhFeHRlbmQoIHRhcmdldCwgalF1ZXJ5LmFqYXhTZXR0aW5ncyApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBFeHRlbmRpbmcgYWpheFNldHRpbmdzXG5cdFx0XHRzZXR0aW5ncyA9IHRhcmdldDtcblx0XHRcdHRhcmdldCA9IGpRdWVyeS5hamF4U2V0dGluZ3M7XG5cdFx0fVxuXHRcdGFqYXhFeHRlbmQoIHRhcmdldCwgc2V0dGluZ3MgKTtcblx0XHRyZXR1cm4gdGFyZ2V0O1xuXHR9LFxuXG5cdGFqYXhTZXR0aW5nczoge1xuXHRcdHVybDogYWpheExvY2F0aW9uLFxuXHRcdGlzTG9jYWw6IHJsb2NhbFByb3RvY29sLnRlc3QoIGFqYXhMb2NQYXJ0c1sgMSBdICksXG5cdFx0Z2xvYmFsOiB0cnVlLFxuXHRcdHR5cGU6IFwiR0VUXCIsXG5cdFx0Y29udGVudFR5cGU6IFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04XCIsXG5cdFx0cHJvY2Vzc0RhdGE6IHRydWUsXG5cdFx0YXN5bmM6IHRydWUsXG5cdFx0Lypcblx0XHR0aW1lb3V0OiAwLFxuXHRcdGRhdGE6IG51bGwsXG5cdFx0ZGF0YVR5cGU6IG51bGwsXG5cdFx0dXNlcm5hbWU6IG51bGwsXG5cdFx0cGFzc3dvcmQ6IG51bGwsXG5cdFx0Y2FjaGU6IG51bGwsXG5cdFx0dGhyb3dzOiBmYWxzZSxcblx0XHR0cmFkaXRpb25hbDogZmFsc2UsXG5cdFx0aGVhZGVyczoge30sXG5cdFx0Ki9cblxuXHRcdGFjY2VwdHM6IHtcblx0XHRcdHhtbDogXCJhcHBsaWNhdGlvbi94bWwsIHRleHQveG1sXCIsXG5cdFx0XHRodG1sOiBcInRleHQvaHRtbFwiLFxuXHRcdFx0dGV4dDogXCJ0ZXh0L3BsYWluXCIsXG5cdFx0XHRqc29uOiBcImFwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdFwiLFxuXHRcdFx0XCIqXCI6IGFsbFR5cGVzXG5cdFx0fSxcblxuXHRcdGNvbnRlbnRzOiB7XG5cdFx0XHR4bWw6IC94bWwvLFxuXHRcdFx0aHRtbDogL2h0bWwvLFxuXHRcdFx0anNvbjogL2pzb24vXG5cdFx0fSxcblxuXHRcdHJlc3BvbnNlRmllbGRzOiB7XG5cdFx0XHR4bWw6IFwicmVzcG9uc2VYTUxcIixcblx0XHRcdHRleHQ6IFwicmVzcG9uc2VUZXh0XCJcblx0XHR9LFxuXG5cdFx0Ly8gTGlzdCBvZiBkYXRhIGNvbnZlcnRlcnNcblx0XHQvLyAxKSBrZXkgZm9ybWF0IGlzIFwic291cmNlX3R5cGUgZGVzdGluYXRpb25fdHlwZVwiIChhIHNpbmdsZSBzcGFjZSBpbi1iZXR3ZWVuKVxuXHRcdC8vIDIpIHRoZSBjYXRjaGFsbCBzeW1ib2wgXCIqXCIgY2FuIGJlIHVzZWQgZm9yIHNvdXJjZV90eXBlXG5cdFx0Y29udmVydGVyczoge1xuXG5cdFx0XHQvLyBDb252ZXJ0IGFueXRoaW5nIHRvIHRleHRcblx0XHRcdFwiKiB0ZXh0XCI6IHdpbmRvdy5TdHJpbmcsXG5cblx0XHRcdC8vIFRleHQgdG8gaHRtbCAodHJ1ZSA9IG5vIHRyYW5zZm9ybWF0aW9uKVxuXHRcdFx0XCJ0ZXh0IGh0bWxcIjogdHJ1ZSxcblxuXHRcdFx0Ly8gRXZhbHVhdGUgdGV4dCBhcyBhIGpzb24gZXhwcmVzc2lvblxuXHRcdFx0XCJ0ZXh0IGpzb25cIjogalF1ZXJ5LnBhcnNlSlNPTixcblxuXHRcdFx0Ly8gUGFyc2UgdGV4dCBhcyB4bWxcblx0XHRcdFwidGV4dCB4bWxcIjogalF1ZXJ5LnBhcnNlWE1MXG5cdFx0fSxcblxuXHRcdC8vIEZvciBvcHRpb25zIHRoYXQgc2hvdWxkbid0IGJlIGRlZXAgZXh0ZW5kZWQ6XG5cdFx0Ly8geW91IGNhbiBhZGQgeW91ciBvd24gY3VzdG9tIG9wdGlvbnMgaGVyZSBpZlxuXHRcdC8vIGFuZCB3aGVuIHlvdSBjcmVhdGUgb25lIHRoYXQgc2hvdWxkbid0IGJlXG5cdFx0Ly8gZGVlcCBleHRlbmRlZCAoc2VlIGFqYXhFeHRlbmQpXG5cdFx0ZmxhdE9wdGlvbnM6IHtcblx0XHRcdGNvbnRleHQ6IHRydWUsXG5cdFx0XHR1cmw6IHRydWVcblx0XHR9XG5cdH0sXG5cblx0YWpheFByZWZpbHRlcjogYWRkVG9QcmVmaWx0ZXJzT3JUcmFuc3BvcnRzKCBwcmVmaWx0ZXJzICksXG5cdGFqYXhUcmFuc3BvcnQ6IGFkZFRvUHJlZmlsdGVyc09yVHJhbnNwb3J0cyggdHJhbnNwb3J0cyApLFxuXG5cdC8vIE1haW4gbWV0aG9kXG5cdGFqYXg6IGZ1bmN0aW9uKCB1cmwsIG9wdGlvbnMgKSB7XG5cblx0XHQvLyBJZiB1cmwgaXMgYW4gb2JqZWN0LCBzaW11bGF0ZSBwcmUtMS41IHNpZ25hdHVyZVxuXHRcdGlmICggdHlwZW9mIHVybCA9PT0gXCJvYmplY3RcIiApIHtcblx0XHRcdG9wdGlvbnMgPSB1cmw7XG5cdFx0XHR1cmwgPSB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0Ly8gRm9yY2Ugb3B0aW9ucyB0byBiZSBhbiBvYmplY3Rcblx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdHZhciAvLyBpZk1vZGlmaWVkIGtleVxuXHRcdFx0aWZNb2RpZmllZEtleSxcblx0XHRcdC8vIFJlc3BvbnNlIGhlYWRlcnNcblx0XHRcdHJlc3BvbnNlSGVhZGVyc1N0cmluZyxcblx0XHRcdHJlc3BvbnNlSGVhZGVycyxcblx0XHRcdC8vIHRyYW5zcG9ydFxuXHRcdFx0dHJhbnNwb3J0LFxuXHRcdFx0Ly8gdGltZW91dCBoYW5kbGVcblx0XHRcdHRpbWVvdXRUaW1lcixcblx0XHRcdC8vIENyb3NzLWRvbWFpbiBkZXRlY3Rpb24gdmFyc1xuXHRcdFx0cGFydHMsXG5cdFx0XHQvLyBUbyBrbm93IGlmIGdsb2JhbCBldmVudHMgYXJlIHRvIGJlIGRpc3BhdGNoZWRcblx0XHRcdGZpcmVHbG9iYWxzLFxuXHRcdFx0Ly8gTG9vcCB2YXJpYWJsZVxuXHRcdFx0aSxcblx0XHRcdC8vIENyZWF0ZSB0aGUgZmluYWwgb3B0aW9ucyBvYmplY3Rcblx0XHRcdHMgPSBqUXVlcnkuYWpheFNldHVwKCB7fSwgb3B0aW9ucyApLFxuXHRcdFx0Ly8gQ2FsbGJhY2tzIGNvbnRleHRcblx0XHRcdGNhbGxiYWNrQ29udGV4dCA9IHMuY29udGV4dCB8fCBzLFxuXHRcdFx0Ly8gQ29udGV4dCBmb3IgZ2xvYmFsIGV2ZW50c1xuXHRcdFx0Ly8gSXQncyB0aGUgY2FsbGJhY2tDb250ZXh0IGlmIG9uZSB3YXMgcHJvdmlkZWQgaW4gdGhlIG9wdGlvbnNcblx0XHRcdC8vIGFuZCBpZiBpdCdzIGEgRE9NIG5vZGUgb3IgYSBqUXVlcnkgY29sbGVjdGlvblxuXHRcdFx0Z2xvYmFsRXZlbnRDb250ZXh0ID0gY2FsbGJhY2tDb250ZXh0ICE9PSBzICYmXG5cdFx0XHRcdCggY2FsbGJhY2tDb250ZXh0Lm5vZGVUeXBlIHx8IGNhbGxiYWNrQ29udGV4dCBpbnN0YW5jZW9mIGpRdWVyeSApID9cblx0XHRcdFx0XHRcdGpRdWVyeSggY2FsbGJhY2tDb250ZXh0ICkgOiBqUXVlcnkuZXZlbnQsXG5cdFx0XHQvLyBEZWZlcnJlZHNcblx0XHRcdGRlZmVycmVkID0galF1ZXJ5LkRlZmVycmVkKCksXG5cdFx0XHRjb21wbGV0ZURlZmVycmVkID0galF1ZXJ5LkNhbGxiYWNrcyggXCJvbmNlIG1lbW9yeVwiICksXG5cdFx0XHQvLyBTdGF0dXMtZGVwZW5kZW50IGNhbGxiYWNrc1xuXHRcdFx0c3RhdHVzQ29kZSA9IHMuc3RhdHVzQ29kZSB8fCB7fSxcblx0XHRcdC8vIEhlYWRlcnMgKHRoZXkgYXJlIHNlbnQgYWxsIGF0IG9uY2UpXG5cdFx0XHRyZXF1ZXN0SGVhZGVycyA9IHt9LFxuXHRcdFx0cmVxdWVzdEhlYWRlcnNOYW1lcyA9IHt9LFxuXHRcdFx0Ly8gVGhlIGpxWEhSIHN0YXRlXG5cdFx0XHRzdGF0ZSA9IDAsXG5cdFx0XHQvLyBEZWZhdWx0IGFib3J0IG1lc3NhZ2Vcblx0XHRcdHN0ckFib3J0ID0gXCJjYW5jZWxlZFwiLFxuXHRcdFx0Ly8gRmFrZSB4aHJcblx0XHRcdGpxWEhSID0ge1xuXG5cdFx0XHRcdHJlYWR5U3RhdGU6IDAsXG5cblx0XHRcdFx0Ly8gQ2FjaGVzIHRoZSBoZWFkZXJcblx0XHRcdFx0c2V0UmVxdWVzdEhlYWRlcjogZnVuY3Rpb24oIG5hbWUsIHZhbHVlICkge1xuXHRcdFx0XHRcdGlmICggIXN0YXRlICkge1xuXHRcdFx0XHRcdFx0dmFyIGxuYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdFx0bmFtZSA9IHJlcXVlc3RIZWFkZXJzTmFtZXNbIGxuYW1lIF0gPSByZXF1ZXN0SGVhZGVyc05hbWVzWyBsbmFtZSBdIHx8IG5hbWU7XG5cdFx0XHRcdFx0XHRyZXF1ZXN0SGVhZGVyc1sgbmFtZSBdID0gdmFsdWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdC8vIFJhdyBzdHJpbmdcblx0XHRcdFx0Z2V0QWxsUmVzcG9uc2VIZWFkZXJzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gc3RhdGUgPT09IDIgPyByZXNwb25zZUhlYWRlcnNTdHJpbmcgOiBudWxsO1xuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdC8vIEJ1aWxkcyBoZWFkZXJzIGhhc2h0YWJsZSBpZiBuZWVkZWRcblx0XHRcdFx0Z2V0UmVzcG9uc2VIZWFkZXI6IGZ1bmN0aW9uKCBrZXkgKSB7XG5cdFx0XHRcdFx0dmFyIG1hdGNoO1xuXHRcdFx0XHRcdGlmICggc3RhdGUgPT09IDIgKSB7XG5cdFx0XHRcdFx0XHRpZiAoICFyZXNwb25zZUhlYWRlcnMgKSB7XG5cdFx0XHRcdFx0XHRcdHJlc3BvbnNlSGVhZGVycyA9IHt9O1xuXHRcdFx0XHRcdFx0XHR3aGlsZSggKCBtYXRjaCA9IHJoZWFkZXJzLmV4ZWMoIHJlc3BvbnNlSGVhZGVyc1N0cmluZyApICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2VIZWFkZXJzWyBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpIF0gPSBtYXRjaFsgMiBdO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRtYXRjaCA9IHJlc3BvbnNlSGVhZGVyc1sga2V5LnRvTG93ZXJDYXNlKCkgXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIG1hdGNoID09PSB1bmRlZmluZWQgPyBudWxsIDogbWF0Y2g7XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Ly8gT3ZlcnJpZGVzIHJlc3BvbnNlIGNvbnRlbnQtdHlwZSBoZWFkZXJcblx0XHRcdFx0b3ZlcnJpZGVNaW1lVHlwZTogZnVuY3Rpb24oIHR5cGUgKSB7XG5cdFx0XHRcdFx0aWYgKCAhc3RhdGUgKSB7XG5cdFx0XHRcdFx0XHRzLm1pbWVUeXBlID0gdHlwZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHRcdH0sXG5cblx0XHRcdFx0Ly8gQ2FuY2VsIHRoZSByZXF1ZXN0XG5cdFx0XHRcdGFib3J0OiBmdW5jdGlvbiggc3RhdHVzVGV4dCApIHtcblx0XHRcdFx0XHRzdGF0dXNUZXh0ID0gc3RhdHVzVGV4dCB8fCBzdHJBYm9ydDtcblx0XHRcdFx0XHRpZiAoIHRyYW5zcG9ydCApIHtcblx0XHRcdFx0XHRcdHRyYW5zcG9ydC5hYm9ydCggc3RhdHVzVGV4dCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkb25lKCAwLCBzdGF0dXNUZXh0ICk7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHQvLyBDYWxsYmFjayBmb3Igd2hlbiBldmVyeXRoaW5nIGlzIGRvbmVcblx0XHQvLyBJdCBpcyBkZWZpbmVkIGhlcmUgYmVjYXVzZSBqc2xpbnQgY29tcGxhaW5zIGlmIGl0IGlzIGRlY2xhcmVkXG5cdFx0Ly8gYXQgdGhlIGVuZCBvZiB0aGUgZnVuY3Rpb24gKHdoaWNoIHdvdWxkIGJlIG1vcmUgbG9naWNhbCBhbmQgcmVhZGFibGUpXG5cdFx0ZnVuY3Rpb24gZG9uZSggc3RhdHVzLCBuYXRpdmVTdGF0dXNUZXh0LCByZXNwb25zZXMsIGhlYWRlcnMgKSB7XG5cdFx0XHR2YXIgaXNTdWNjZXNzLCBzdWNjZXNzLCBlcnJvciwgcmVzcG9uc2UsIG1vZGlmaWVkLFxuXHRcdFx0XHRzdGF0dXNUZXh0ID0gbmF0aXZlU3RhdHVzVGV4dDtcblxuXHRcdFx0Ly8gQ2FsbGVkIG9uY2Vcblx0XHRcdGlmICggc3RhdGUgPT09IDIgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU3RhdGUgaXMgXCJkb25lXCIgbm93XG5cdFx0XHRzdGF0ZSA9IDI7XG5cblx0XHRcdC8vIENsZWFyIHRpbWVvdXQgaWYgaXQgZXhpc3RzXG5cdFx0XHRpZiAoIHRpbWVvdXRUaW1lciApIHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KCB0aW1lb3V0VGltZXIgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRGVyZWZlcmVuY2UgdHJhbnNwb3J0IGZvciBlYXJseSBnYXJiYWdlIGNvbGxlY3Rpb25cblx0XHRcdC8vIChubyBtYXR0ZXIgaG93IGxvbmcgdGhlIGpxWEhSIG9iamVjdCB3aWxsIGJlIHVzZWQpXG5cdFx0XHR0cmFuc3BvcnQgPSB1bmRlZmluZWQ7XG5cblx0XHRcdC8vIENhY2hlIHJlc3BvbnNlIGhlYWRlcnNcblx0XHRcdHJlc3BvbnNlSGVhZGVyc1N0cmluZyA9IGhlYWRlcnMgfHwgXCJcIjtcblxuXHRcdFx0Ly8gU2V0IHJlYWR5U3RhdGVcblx0XHRcdGpxWEhSLnJlYWR5U3RhdGUgPSBzdGF0dXMgPiAwID8gNCA6IDA7XG5cblx0XHRcdC8vIEdldCByZXNwb25zZSBkYXRhXG5cdFx0XHRpZiAoIHJlc3BvbnNlcyApIHtcblx0XHRcdFx0cmVzcG9uc2UgPSBhamF4SGFuZGxlUmVzcG9uc2VzKCBzLCBqcVhIUiwgcmVzcG9uc2VzICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIElmIHN1Y2Nlc3NmdWwsIGhhbmRsZSB0eXBlIGNoYWluaW5nXG5cdFx0XHRpZiAoIHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwIHx8IHN0YXR1cyA9PT0gMzA0ICkge1xuXG5cdFx0XHRcdC8vIFNldCB0aGUgSWYtTW9kaWZpZWQtU2luY2UgYW5kL29yIElmLU5vbmUtTWF0Y2ggaGVhZGVyLCBpZiBpbiBpZk1vZGlmaWVkIG1vZGUuXG5cdFx0XHRcdGlmICggcy5pZk1vZGlmaWVkICkge1xuXG5cdFx0XHRcdFx0bW9kaWZpZWQgPSBqcVhIUi5nZXRSZXNwb25zZUhlYWRlcihcIkxhc3QtTW9kaWZpZWRcIik7XG5cdFx0XHRcdFx0aWYgKCBtb2RpZmllZCApIHtcblx0XHRcdFx0XHRcdGpRdWVyeS5sYXN0TW9kaWZpZWRbIGlmTW9kaWZpZWRLZXkgXSA9IG1vZGlmaWVkO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtb2RpZmllZCA9IGpxWEhSLmdldFJlc3BvbnNlSGVhZGVyKFwiRXRhZ1wiKTtcblx0XHRcdFx0XHRpZiAoIG1vZGlmaWVkICkge1xuXHRcdFx0XHRcdFx0alF1ZXJ5LmV0YWdbIGlmTW9kaWZpZWRLZXkgXSA9IG1vZGlmaWVkO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIElmIG5vdCBtb2RpZmllZFxuXHRcdFx0XHRpZiAoIHN0YXR1cyA9PT0gMzA0ICkge1xuXG5cdFx0XHRcdFx0c3RhdHVzVGV4dCA9IFwibm90bW9kaWZpZWRcIjtcblx0XHRcdFx0XHRpc1N1Y2Nlc3MgPSB0cnVlO1xuXG5cdFx0XHRcdC8vIElmIHdlIGhhdmUgZGF0YVxuXHRcdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdFx0aXNTdWNjZXNzID0gYWpheENvbnZlcnQoIHMsIHJlc3BvbnNlICk7XG5cdFx0XHRcdFx0c3RhdHVzVGV4dCA9IGlzU3VjY2Vzcy5zdGF0ZTtcblx0XHRcdFx0XHRzdWNjZXNzID0gaXNTdWNjZXNzLmRhdGE7XG5cdFx0XHRcdFx0ZXJyb3IgPSBpc1N1Y2Nlc3MuZXJyb3I7XG5cdFx0XHRcdFx0aXNTdWNjZXNzID0gIWVycm9yO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBXZSBleHRyYWN0IGVycm9yIGZyb20gc3RhdHVzVGV4dFxuXHRcdFx0XHQvLyB0aGVuIG5vcm1hbGl6ZSBzdGF0dXNUZXh0IGFuZCBzdGF0dXMgZm9yIG5vbi1hYm9ydHNcblx0XHRcdFx0ZXJyb3IgPSBzdGF0dXNUZXh0O1xuXHRcdFx0XHRpZiAoICFzdGF0dXNUZXh0IHx8IHN0YXR1cyApIHtcblx0XHRcdFx0XHRzdGF0dXNUZXh0ID0gXCJlcnJvclwiO1xuXHRcdFx0XHRcdGlmICggc3RhdHVzIDwgMCApIHtcblx0XHRcdFx0XHRcdHN0YXR1cyA9IDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCBkYXRhIGZvciB0aGUgZmFrZSB4aHIgb2JqZWN0XG5cdFx0XHRqcVhIUi5zdGF0dXMgPSBzdGF0dXM7XG5cdFx0XHRqcVhIUi5zdGF0dXNUZXh0ID0gXCJcIiArICggbmF0aXZlU3RhdHVzVGV4dCB8fCBzdGF0dXNUZXh0ICk7XG5cblx0XHRcdC8vIFN1Y2Nlc3MvRXJyb3Jcblx0XHRcdGlmICggaXNTdWNjZXNzICkge1xuXHRcdFx0XHRkZWZlcnJlZC5yZXNvbHZlV2l0aCggY2FsbGJhY2tDb250ZXh0LCBbIHN1Y2Nlc3MsIHN0YXR1c1RleHQsIGpxWEhSIF0gKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlamVjdFdpdGgoIGNhbGxiYWNrQ29udGV4dCwgWyBqcVhIUiwgc3RhdHVzVGV4dCwgZXJyb3IgXSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTdGF0dXMtZGVwZW5kZW50IGNhbGxiYWNrc1xuXHRcdFx0anFYSFIuc3RhdHVzQ29kZSggc3RhdHVzQ29kZSApO1xuXHRcdFx0c3RhdHVzQ29kZSA9IHVuZGVmaW5lZDtcblxuXHRcdFx0aWYgKCBmaXJlR2xvYmFscyApIHtcblx0XHRcdFx0Z2xvYmFsRXZlbnRDb250ZXh0LnRyaWdnZXIoIFwiYWpheFwiICsgKCBpc1N1Y2Nlc3MgPyBcIlN1Y2Nlc3NcIiA6IFwiRXJyb3JcIiApLFxuXHRcdFx0XHRcdFx0WyBqcVhIUiwgcywgaXNTdWNjZXNzID8gc3VjY2VzcyA6IGVycm9yIF0gKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQ29tcGxldGVcblx0XHRcdGNvbXBsZXRlRGVmZXJyZWQuZmlyZVdpdGgoIGNhbGxiYWNrQ29udGV4dCwgWyBqcVhIUiwgc3RhdHVzVGV4dCBdICk7XG5cblx0XHRcdGlmICggZmlyZUdsb2JhbHMgKSB7XG5cdFx0XHRcdGdsb2JhbEV2ZW50Q29udGV4dC50cmlnZ2VyKCBcImFqYXhDb21wbGV0ZVwiLCBbIGpxWEhSLCBzIF0gKTtcblx0XHRcdFx0Ly8gSGFuZGxlIHRoZSBnbG9iYWwgQUpBWCBjb3VudGVyXG5cdFx0XHRcdGlmICggISggLS1qUXVlcnkuYWN0aXZlICkgKSB7XG5cdFx0XHRcdFx0alF1ZXJ5LmV2ZW50LnRyaWdnZXIoIFwiYWpheFN0b3BcIiApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gQXR0YWNoIGRlZmVycmVkc1xuXHRcdGRlZmVycmVkLnByb21pc2UoIGpxWEhSICk7XG5cdFx0anFYSFIuc3VjY2VzcyA9IGpxWEhSLmRvbmU7XG5cdFx0anFYSFIuZXJyb3IgPSBqcVhIUi5mYWlsO1xuXHRcdGpxWEhSLmNvbXBsZXRlID0gY29tcGxldGVEZWZlcnJlZC5hZGQ7XG5cblx0XHQvLyBTdGF0dXMtZGVwZW5kZW50IGNhbGxiYWNrc1xuXHRcdGpxWEhSLnN0YXR1c0NvZGUgPSBmdW5jdGlvbiggbWFwICkge1xuXHRcdFx0aWYgKCBtYXAgKSB7XG5cdFx0XHRcdHZhciB0bXA7XG5cdFx0XHRcdGlmICggc3RhdGUgPCAyICkge1xuXHRcdFx0XHRcdGZvciAoIHRtcCBpbiBtYXAgKSB7XG5cdFx0XHRcdFx0XHRzdGF0dXNDb2RlWyB0bXAgXSA9IFsgc3RhdHVzQ29kZVt0bXBdLCBtYXBbdG1wXSBdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0bXAgPSBtYXBbIGpxWEhSLnN0YXR1cyBdO1xuXHRcdFx0XHRcdGpxWEhSLmFsd2F5cyggdG1wICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH07XG5cblx0XHQvLyBSZW1vdmUgaGFzaCBjaGFyYWN0ZXIgKCM3NTMxOiBhbmQgc3RyaW5nIHByb21vdGlvbilcblx0XHQvLyBBZGQgcHJvdG9jb2wgaWYgbm90IHByb3ZpZGVkICgjNTg2NjogSUU3IGlzc3VlIHdpdGggcHJvdG9jb2wtbGVzcyB1cmxzKVxuXHRcdC8vIFdlIGFsc28gdXNlIHRoZSB1cmwgcGFyYW1ldGVyIGlmIGF2YWlsYWJsZVxuXHRcdHMudXJsID0gKCAoIHVybCB8fCBzLnVybCApICsgXCJcIiApLnJlcGxhY2UoIHJoYXNoLCBcIlwiICkucmVwbGFjZSggcnByb3RvY29sLCBhamF4TG9jUGFydHNbIDEgXSArIFwiLy9cIiApO1xuXG5cdFx0Ly8gRXh0cmFjdCBkYXRhVHlwZXMgbGlzdFxuXHRcdHMuZGF0YVR5cGVzID0galF1ZXJ5LnRyaW0oIHMuZGF0YVR5cGUgfHwgXCIqXCIgKS50b0xvd2VyQ2FzZSgpLnNwbGl0KCBjb3JlX3JzcGFjZSApO1xuXG5cdFx0Ly8gRGV0ZXJtaW5lIGlmIGEgY3Jvc3MtZG9tYWluIHJlcXVlc3QgaXMgaW4gb3JkZXJcblx0XHRpZiAoIHMuY3Jvc3NEb21haW4gPT0gbnVsbCApIHtcblx0XHRcdHBhcnRzID0gcnVybC5leGVjKCBzLnVybC50b0xvd2VyQ2FzZSgpICk7XG5cdFx0XHRzLmNyb3NzRG9tYWluID0gISEoIHBhcnRzICYmXG5cdFx0XHRcdCggcGFydHNbIDEgXSAhPSBhamF4TG9jUGFydHNbIDEgXSB8fCBwYXJ0c1sgMiBdICE9IGFqYXhMb2NQYXJ0c1sgMiBdIHx8XG5cdFx0XHRcdFx0KCBwYXJ0c1sgMyBdIHx8ICggcGFydHNbIDEgXSA9PT0gXCJodHRwOlwiID8gODAgOiA0NDMgKSApICE9XG5cdFx0XHRcdFx0XHQoIGFqYXhMb2NQYXJ0c1sgMyBdIHx8ICggYWpheExvY1BhcnRzWyAxIF0gPT09IFwiaHR0cDpcIiA/IDgwIDogNDQzICkgKSApXG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdC8vIENvbnZlcnQgZGF0YSBpZiBub3QgYWxyZWFkeSBhIHN0cmluZ1xuXHRcdGlmICggcy5kYXRhICYmIHMucHJvY2Vzc0RhdGEgJiYgdHlwZW9mIHMuZGF0YSAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdHMuZGF0YSA9IGpRdWVyeS5wYXJhbSggcy5kYXRhLCBzLnRyYWRpdGlvbmFsICk7XG5cdFx0fVxuXG5cdFx0Ly8gQXBwbHkgcHJlZmlsdGVyc1xuXHRcdGluc3BlY3RQcmVmaWx0ZXJzT3JUcmFuc3BvcnRzKCBwcmVmaWx0ZXJzLCBzLCBvcHRpb25zLCBqcVhIUiApO1xuXG5cdFx0Ly8gSWYgcmVxdWVzdCB3YXMgYWJvcnRlZCBpbnNpZGUgYSBwcmVmaWx0ZXIsIHN0b3AgdGhlcmVcblx0XHRpZiAoIHN0YXRlID09PSAyICkge1xuXHRcdFx0cmV0dXJuIGpxWEhSO1xuXHRcdH1cblxuXHRcdC8vIFdlIGNhbiBmaXJlIGdsb2JhbCBldmVudHMgYXMgb2Ygbm93IGlmIGFza2VkIHRvXG5cdFx0ZmlyZUdsb2JhbHMgPSBzLmdsb2JhbDtcblxuXHRcdC8vIFVwcGVyY2FzZSB0aGUgdHlwZVxuXHRcdHMudHlwZSA9IHMudHlwZS50b1VwcGVyQ2FzZSgpO1xuXG5cdFx0Ly8gRGV0ZXJtaW5lIGlmIHJlcXVlc3QgaGFzIGNvbnRlbnRcblx0XHRzLmhhc0NvbnRlbnQgPSAhcm5vQ29udGVudC50ZXN0KCBzLnR5cGUgKTtcblxuXHRcdC8vIFdhdGNoIGZvciBhIG5ldyBzZXQgb2YgcmVxdWVzdHNcblx0XHRpZiAoIGZpcmVHbG9iYWxzICYmIGpRdWVyeS5hY3RpdmUrKyA9PT0gMCApIHtcblx0XHRcdGpRdWVyeS5ldmVudC50cmlnZ2VyKCBcImFqYXhTdGFydFwiICk7XG5cdFx0fVxuXG5cdFx0Ly8gTW9yZSBvcHRpb25zIGhhbmRsaW5nIGZvciByZXF1ZXN0cyB3aXRoIG5vIGNvbnRlbnRcblx0XHRpZiAoICFzLmhhc0NvbnRlbnQgKSB7XG5cblx0XHRcdC8vIElmIGRhdGEgaXMgYXZhaWxhYmxlLCBhcHBlbmQgZGF0YSB0byB1cmxcblx0XHRcdGlmICggcy5kYXRhICkge1xuXHRcdFx0XHRzLnVybCArPSAoIHJxdWVyeS50ZXN0KCBzLnVybCApID8gXCImXCIgOiBcIj9cIiApICsgcy5kYXRhO1xuXHRcdFx0XHQvLyAjOTY4MjogcmVtb3ZlIGRhdGEgc28gdGhhdCBpdCdzIG5vdCB1c2VkIGluIGFuIGV2ZW50dWFsIHJldHJ5XG5cdFx0XHRcdGRlbGV0ZSBzLmRhdGE7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEdldCBpZk1vZGlmaWVkS2V5IGJlZm9yZSBhZGRpbmcgdGhlIGFudGktY2FjaGUgcGFyYW1ldGVyXG5cdFx0XHRpZk1vZGlmaWVkS2V5ID0gcy51cmw7XG5cblx0XHRcdC8vIEFkZCBhbnRpLWNhY2hlIGluIHVybCBpZiBuZWVkZWRcblx0XHRcdGlmICggcy5jYWNoZSA9PT0gZmFsc2UgKSB7XG5cblx0XHRcdFx0dmFyIHRzID0galF1ZXJ5Lm5vdygpLFxuXHRcdFx0XHRcdC8vIHRyeSByZXBsYWNpbmcgXz0gaWYgaXQgaXMgdGhlcmVcblx0XHRcdFx0XHRyZXQgPSBzLnVybC5yZXBsYWNlKCBydHMsIFwiJDFfPVwiICsgdHMgKTtcblxuXHRcdFx0XHQvLyBpZiBub3RoaW5nIHdhcyByZXBsYWNlZCwgYWRkIHRpbWVzdGFtcCB0byB0aGUgZW5kXG5cdFx0XHRcdHMudXJsID0gcmV0ICsgKCAoIHJldCA9PT0gcy51cmwgKSA/ICggcnF1ZXJ5LnRlc3QoIHMudXJsICkgPyBcIiZcIiA6IFwiP1wiICkgKyBcIl89XCIgKyB0cyA6IFwiXCIgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTZXQgdGhlIGNvcnJlY3QgaGVhZGVyLCBpZiBkYXRhIGlzIGJlaW5nIHNlbnRcblx0XHRpZiAoIHMuZGF0YSAmJiBzLmhhc0NvbnRlbnQgJiYgcy5jb250ZW50VHlwZSAhPT0gZmFsc2UgfHwgb3B0aW9ucy5jb250ZW50VHlwZSApIHtcblx0XHRcdGpxWEhSLnNldFJlcXVlc3RIZWFkZXIoIFwiQ29udGVudC1UeXBlXCIsIHMuY29udGVudFR5cGUgKTtcblx0XHR9XG5cblx0XHQvLyBTZXQgdGhlIElmLU1vZGlmaWVkLVNpbmNlIGFuZC9vciBJZi1Ob25lLU1hdGNoIGhlYWRlciwgaWYgaW4gaWZNb2RpZmllZCBtb2RlLlxuXHRcdGlmICggcy5pZk1vZGlmaWVkICkge1xuXHRcdFx0aWZNb2RpZmllZEtleSA9IGlmTW9kaWZpZWRLZXkgfHwgcy51cmw7XG5cdFx0XHRpZiAoIGpRdWVyeS5sYXN0TW9kaWZpZWRbIGlmTW9kaWZpZWRLZXkgXSApIHtcblx0XHRcdFx0anFYSFIuc2V0UmVxdWVzdEhlYWRlciggXCJJZi1Nb2RpZmllZC1TaW5jZVwiLCBqUXVlcnkubGFzdE1vZGlmaWVkWyBpZk1vZGlmaWVkS2V5IF0gKTtcblx0XHRcdH1cblx0XHRcdGlmICggalF1ZXJ5LmV0YWdbIGlmTW9kaWZpZWRLZXkgXSApIHtcblx0XHRcdFx0anFYSFIuc2V0UmVxdWVzdEhlYWRlciggXCJJZi1Ob25lLU1hdGNoXCIsIGpRdWVyeS5ldGFnWyBpZk1vZGlmaWVkS2V5IF0gKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTZXQgdGhlIEFjY2VwdHMgaGVhZGVyIGZvciB0aGUgc2VydmVyLCBkZXBlbmRpbmcgb24gdGhlIGRhdGFUeXBlXG5cdFx0anFYSFIuc2V0UmVxdWVzdEhlYWRlcihcblx0XHRcdFwiQWNjZXB0XCIsXG5cdFx0XHRzLmRhdGFUeXBlc1sgMCBdICYmIHMuYWNjZXB0c1sgcy5kYXRhVHlwZXNbMF0gXSA/XG5cdFx0XHRcdHMuYWNjZXB0c1sgcy5kYXRhVHlwZXNbMF0gXSArICggcy5kYXRhVHlwZXNbIDAgXSAhPT0gXCIqXCIgPyBcIiwgXCIgKyBhbGxUeXBlcyArIFwiOyBxPTAuMDFcIiA6IFwiXCIgKSA6XG5cdFx0XHRcdHMuYWNjZXB0c1sgXCIqXCIgXVxuXHRcdCk7XG5cblx0XHQvLyBDaGVjayBmb3IgaGVhZGVycyBvcHRpb25cblx0XHRmb3IgKCBpIGluIHMuaGVhZGVycyApIHtcblx0XHRcdGpxWEhSLnNldFJlcXVlc3RIZWFkZXIoIGksIHMuaGVhZGVyc1sgaSBdICk7XG5cdFx0fVxuXG5cdFx0Ly8gQWxsb3cgY3VzdG9tIGhlYWRlcnMvbWltZXR5cGVzIGFuZCBlYXJseSBhYm9ydFxuXHRcdGlmICggcy5iZWZvcmVTZW5kICYmICggcy5iZWZvcmVTZW5kLmNhbGwoIGNhbGxiYWNrQ29udGV4dCwganFYSFIsIHMgKSA9PT0gZmFsc2UgfHwgc3RhdGUgPT09IDIgKSApIHtcblx0XHRcdFx0Ly8gQWJvcnQgaWYgbm90IGRvbmUgYWxyZWFkeSBhbmQgcmV0dXJuXG5cdFx0XHRcdHJldHVybiBqcVhIUi5hYm9ydCgpO1xuXG5cdFx0fVxuXG5cdFx0Ly8gYWJvcnRpbmcgaXMgbm8gbG9uZ2VyIGEgY2FuY2VsbGF0aW9uXG5cdFx0c3RyQWJvcnQgPSBcImFib3J0XCI7XG5cblx0XHQvLyBJbnN0YWxsIGNhbGxiYWNrcyBvbiBkZWZlcnJlZHNcblx0XHRmb3IgKCBpIGluIHsgc3VjY2VzczogMSwgZXJyb3I6IDEsIGNvbXBsZXRlOiAxIH0gKSB7XG5cdFx0XHRqcVhIUlsgaSBdKCBzWyBpIF0gKTtcblx0XHR9XG5cblx0XHQvLyBHZXQgdHJhbnNwb3J0XG5cdFx0dHJhbnNwb3J0ID0gaW5zcGVjdFByZWZpbHRlcnNPclRyYW5zcG9ydHMoIHRyYW5zcG9ydHMsIHMsIG9wdGlvbnMsIGpxWEhSICk7XG5cblx0XHQvLyBJZiBubyB0cmFuc3BvcnQsIHdlIGF1dG8tYWJvcnRcblx0XHRpZiAoICF0cmFuc3BvcnQgKSB7XG5cdFx0XHRkb25lKCAtMSwgXCJObyBUcmFuc3BvcnRcIiApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRqcVhIUi5yZWFkeVN0YXRlID0gMTtcblx0XHRcdC8vIFNlbmQgZ2xvYmFsIGV2ZW50XG5cdFx0XHRpZiAoIGZpcmVHbG9iYWxzICkge1xuXHRcdFx0XHRnbG9iYWxFdmVudENvbnRleHQudHJpZ2dlciggXCJhamF4U2VuZFwiLCBbIGpxWEhSLCBzIF0gKTtcblx0XHRcdH1cblx0XHRcdC8vIFRpbWVvdXRcblx0XHRcdGlmICggcy5hc3luYyAmJiBzLnRpbWVvdXQgPiAwICkge1xuXHRcdFx0XHR0aW1lb3V0VGltZXIgPSBzZXRUaW1lb3V0KCBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdGpxWEhSLmFib3J0KCBcInRpbWVvdXRcIiApO1xuXHRcdFx0XHR9LCBzLnRpbWVvdXQgKTtcblx0XHRcdH1cblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0c3RhdGUgPSAxO1xuXHRcdFx0XHR0cmFuc3BvcnQuc2VuZCggcmVxdWVzdEhlYWRlcnMsIGRvbmUgKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0Ly8gUHJvcGFnYXRlIGV4Y2VwdGlvbiBhcyBlcnJvciBpZiBub3QgZG9uZVxuXHRcdFx0XHRpZiAoIHN0YXRlIDwgMiApIHtcblx0XHRcdFx0XHRkb25lKCAtMSwgZSApO1xuXHRcdFx0XHQvLyBTaW1wbHkgcmV0aHJvdyBvdGhlcndpc2Vcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aHJvdyBlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGpxWEhSO1xuXHR9LFxuXG5cdC8vIENvdW50ZXIgZm9yIGhvbGRpbmcgdGhlIG51bWJlciBvZiBhY3RpdmUgcXVlcmllc1xuXHRhY3RpdmU6IDAsXG5cblx0Ly8gTGFzdC1Nb2RpZmllZCBoZWFkZXIgY2FjaGUgZm9yIG5leHQgcmVxdWVzdFxuXHRsYXN0TW9kaWZpZWQ6IHt9LFxuXHRldGFnOiB7fVxuXG59KTtcblxuLyogSGFuZGxlcyByZXNwb25zZXMgdG8gYW4gYWpheCByZXF1ZXN0OlxuICogLSBzZXRzIGFsbCByZXNwb25zZVhYWCBmaWVsZHMgYWNjb3JkaW5nbHlcbiAqIC0gZmluZHMgdGhlIHJpZ2h0IGRhdGFUeXBlIChtZWRpYXRlcyBiZXR3ZWVuIGNvbnRlbnQtdHlwZSBhbmQgZXhwZWN0ZWQgZGF0YVR5cGUpXG4gKiAtIHJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmcgcmVzcG9uc2VcbiAqL1xuZnVuY3Rpb24gYWpheEhhbmRsZVJlc3BvbnNlcyggcywganFYSFIsIHJlc3BvbnNlcyApIHtcblxuXHR2YXIgY3QsIHR5cGUsIGZpbmFsRGF0YVR5cGUsIGZpcnN0RGF0YVR5cGUsXG5cdFx0Y29udGVudHMgPSBzLmNvbnRlbnRzLFxuXHRcdGRhdGFUeXBlcyA9IHMuZGF0YVR5cGVzLFxuXHRcdHJlc3BvbnNlRmllbGRzID0gcy5yZXNwb25zZUZpZWxkcztcblxuXHQvLyBGaWxsIHJlc3BvbnNlWFhYIGZpZWxkc1xuXHRmb3IgKCB0eXBlIGluIHJlc3BvbnNlRmllbGRzICkge1xuXHRcdGlmICggdHlwZSBpbiByZXNwb25zZXMgKSB7XG5cdFx0XHRqcVhIUlsgcmVzcG9uc2VGaWVsZHNbdHlwZV0gXSA9IHJlc3BvbnNlc1sgdHlwZSBdO1xuXHRcdH1cblx0fVxuXG5cdC8vIFJlbW92ZSBhdXRvIGRhdGFUeXBlIGFuZCBnZXQgY29udGVudC10eXBlIGluIHRoZSBwcm9jZXNzXG5cdHdoaWxlKCBkYXRhVHlwZXNbIDAgXSA9PT0gXCIqXCIgKSB7XG5cdFx0ZGF0YVR5cGVzLnNoaWZ0KCk7XG5cdFx0aWYgKCBjdCA9PT0gdW5kZWZpbmVkICkge1xuXHRcdFx0Y3QgPSBzLm1pbWVUeXBlIHx8IGpxWEhSLmdldFJlc3BvbnNlSGVhZGVyKCBcImNvbnRlbnQtdHlwZVwiICk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gQ2hlY2sgaWYgd2UncmUgZGVhbGluZyB3aXRoIGEga25vd24gY29udGVudC10eXBlXG5cdGlmICggY3QgKSB7XG5cdFx0Zm9yICggdHlwZSBpbiBjb250ZW50cyApIHtcblx0XHRcdGlmICggY29udGVudHNbIHR5cGUgXSAmJiBjb250ZW50c1sgdHlwZSBdLnRlc3QoIGN0ICkgKSB7XG5cdFx0XHRcdGRhdGFUeXBlcy51bnNoaWZ0KCB0eXBlICk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8vIENoZWNrIHRvIHNlZSBpZiB3ZSBoYXZlIGEgcmVzcG9uc2UgZm9yIHRoZSBleHBlY3RlZCBkYXRhVHlwZVxuXHRpZiAoIGRhdGFUeXBlc1sgMCBdIGluIHJlc3BvbnNlcyApIHtcblx0XHRmaW5hbERhdGFUeXBlID0gZGF0YVR5cGVzWyAwIF07XG5cdH0gZWxzZSB7XG5cdFx0Ly8gVHJ5IGNvbnZlcnRpYmxlIGRhdGFUeXBlc1xuXHRcdGZvciAoIHR5cGUgaW4gcmVzcG9uc2VzICkge1xuXHRcdFx0aWYgKCAhZGF0YVR5cGVzWyAwIF0gfHwgcy5jb252ZXJ0ZXJzWyB0eXBlICsgXCIgXCIgKyBkYXRhVHlwZXNbMF0gXSApIHtcblx0XHRcdFx0ZmluYWxEYXRhVHlwZSA9IHR5cGU7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAhZmlyc3REYXRhVHlwZSApIHtcblx0XHRcdFx0Zmlyc3REYXRhVHlwZSA9IHR5cGU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdC8vIE9yIGp1c3QgdXNlIGZpcnN0IG9uZVxuXHRcdGZpbmFsRGF0YVR5cGUgPSBmaW5hbERhdGFUeXBlIHx8IGZpcnN0RGF0YVR5cGU7XG5cdH1cblxuXHQvLyBJZiB3ZSBmb3VuZCBhIGRhdGFUeXBlXG5cdC8vIFdlIGFkZCB0aGUgZGF0YVR5cGUgdG8gdGhlIGxpc3QgaWYgbmVlZGVkXG5cdC8vIGFuZCByZXR1cm4gdGhlIGNvcnJlc3BvbmRpbmcgcmVzcG9uc2Vcblx0aWYgKCBmaW5hbERhdGFUeXBlICkge1xuXHRcdGlmICggZmluYWxEYXRhVHlwZSAhPT0gZGF0YVR5cGVzWyAwIF0gKSB7XG5cdFx0XHRkYXRhVHlwZXMudW5zaGlmdCggZmluYWxEYXRhVHlwZSApO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzcG9uc2VzWyBmaW5hbERhdGFUeXBlIF07XG5cdH1cbn1cblxuLy8gQ2hhaW4gY29udmVyc2lvbnMgZ2l2ZW4gdGhlIHJlcXVlc3QgYW5kIHRoZSBvcmlnaW5hbCByZXNwb25zZVxuZnVuY3Rpb24gYWpheENvbnZlcnQoIHMsIHJlc3BvbnNlICkge1xuXG5cdHZhciBjb252LCBjb252MiwgY3VycmVudCwgdG1wLFxuXHRcdC8vIFdvcmsgd2l0aCBhIGNvcHkgb2YgZGF0YVR5cGVzIGluIGNhc2Ugd2UgbmVlZCB0byBtb2RpZnkgaXQgZm9yIGNvbnZlcnNpb25cblx0XHRkYXRhVHlwZXMgPSBzLmRhdGFUeXBlcy5zbGljZSgpLFxuXHRcdHByZXYgPSBkYXRhVHlwZXNbIDAgXSxcblx0XHRjb252ZXJ0ZXJzID0ge30sXG5cdFx0aSA9IDA7XG5cblx0Ly8gQXBwbHkgdGhlIGRhdGFGaWx0ZXIgaWYgcHJvdmlkZWRcblx0aWYgKCBzLmRhdGFGaWx0ZXIgKSB7XG5cdFx0cmVzcG9uc2UgPSBzLmRhdGFGaWx0ZXIoIHJlc3BvbnNlLCBzLmRhdGFUeXBlICk7XG5cdH1cblxuXHQvLyBDcmVhdGUgY29udmVydGVycyBtYXAgd2l0aCBsb3dlcmNhc2VkIGtleXNcblx0aWYgKCBkYXRhVHlwZXNbIDEgXSApIHtcblx0XHRmb3IgKCBjb252IGluIHMuY29udmVydGVycyApIHtcblx0XHRcdGNvbnZlcnRlcnNbIGNvbnYudG9Mb3dlckNhc2UoKSBdID0gcy5jb252ZXJ0ZXJzWyBjb252IF07XG5cdFx0fVxuXHR9XG5cblx0Ly8gQ29udmVydCB0byBlYWNoIHNlcXVlbnRpYWwgZGF0YVR5cGUsIHRvbGVyYXRpbmcgbGlzdCBtb2RpZmljYXRpb25cblx0Zm9yICggOyAoY3VycmVudCA9IGRhdGFUeXBlc1srK2ldKTsgKSB7XG5cblx0XHQvLyBUaGVyZSdzIG9ubHkgd29yayB0byBkbyBpZiBjdXJyZW50IGRhdGFUeXBlIGlzIG5vbi1hdXRvXG5cdFx0aWYgKCBjdXJyZW50ICE9PSBcIipcIiApIHtcblxuXHRcdFx0Ly8gQ29udmVydCByZXNwb25zZSBpZiBwcmV2IGRhdGFUeXBlIGlzIG5vbi1hdXRvIGFuZCBkaWZmZXJzIGZyb20gY3VycmVudFxuXHRcdFx0aWYgKCBwcmV2ICE9PSBcIipcIiAmJiBwcmV2ICE9PSBjdXJyZW50ICkge1xuXG5cdFx0XHRcdC8vIFNlZWsgYSBkaXJlY3QgY29udmVydGVyXG5cdFx0XHRcdGNvbnYgPSBjb252ZXJ0ZXJzWyBwcmV2ICsgXCIgXCIgKyBjdXJyZW50IF0gfHwgY29udmVydGVyc1sgXCIqIFwiICsgY3VycmVudCBdO1xuXG5cdFx0XHRcdC8vIElmIG5vbmUgZm91bmQsIHNlZWsgYSBwYWlyXG5cdFx0XHRcdGlmICggIWNvbnYgKSB7XG5cdFx0XHRcdFx0Zm9yICggY29udjIgaW4gY29udmVydGVycyApIHtcblxuXHRcdFx0XHRcdFx0Ly8gSWYgY29udjIgb3V0cHV0cyBjdXJyZW50XG5cdFx0XHRcdFx0XHR0bXAgPSBjb252Mi5zcGxpdChcIiBcIik7XG5cdFx0XHRcdFx0XHRpZiAoIHRtcFsgMSBdID09PSBjdXJyZW50ICkge1xuXG5cdFx0XHRcdFx0XHRcdC8vIElmIHByZXYgY2FuIGJlIGNvbnZlcnRlZCB0byBhY2NlcHRlZCBpbnB1dFxuXHRcdFx0XHRcdFx0XHRjb252ID0gY29udmVydGVyc1sgcHJldiArIFwiIFwiICsgdG1wWyAwIF0gXSB8fFxuXHRcdFx0XHRcdFx0XHRcdGNvbnZlcnRlcnNbIFwiKiBcIiArIHRtcFsgMCBdIF07XG5cdFx0XHRcdFx0XHRcdGlmICggY29udiApIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBDb25kZW5zZSBlcXVpdmFsZW5jZSBjb252ZXJ0ZXJzXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBjb252ID09PSB0cnVlICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29udiA9IGNvbnZlcnRlcnNbIGNvbnYyIF07XG5cblx0XHRcdFx0XHRcdFx0XHQvLyBPdGhlcndpc2UsIGluc2VydCB0aGUgaW50ZXJtZWRpYXRlIGRhdGFUeXBlXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICggY29udmVydGVyc1sgY29udjIgXSAhPT0gdHJ1ZSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdGN1cnJlbnQgPSB0bXBbIDAgXTtcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGFUeXBlcy5zcGxpY2UoIGktLSwgMCwgY3VycmVudCApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQXBwbHkgY29udmVydGVyIChpZiBub3QgYW4gZXF1aXZhbGVuY2UpXG5cdFx0XHRcdGlmICggY29udiAhPT0gdHJ1ZSApIHtcblxuXHRcdFx0XHRcdC8vIFVubGVzcyBlcnJvcnMgYXJlIGFsbG93ZWQgdG8gYnViYmxlLCBjYXRjaCBhbmQgcmV0dXJuIHRoZW1cblx0XHRcdFx0XHRpZiAoIGNvbnYgJiYgc1tcInRocm93c1wiXSApIHtcblx0XHRcdFx0XHRcdHJlc3BvbnNlID0gY29udiggcmVzcG9uc2UgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0cmVzcG9uc2UgPSBjb252KCByZXNwb25zZSApO1xuXHRcdFx0XHRcdFx0fSBjYXRjaCAoIGUgKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB7IHN0YXRlOiBcInBhcnNlcmVycm9yXCIsIGVycm9yOiBjb252ID8gZSA6IFwiTm8gY29udmVyc2lvbiBmcm9tIFwiICsgcHJldiArIFwiIHRvIFwiICsgY3VycmVudCB9O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBVcGRhdGUgcHJldiBmb3IgbmV4dCBpdGVyYXRpb25cblx0XHRcdHByZXYgPSBjdXJyZW50O1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7IHN0YXRlOiBcInN1Y2Nlc3NcIiwgZGF0YTogcmVzcG9uc2UgfTtcbn1cbnZhciBvbGRDYWxsYmFja3MgPSBbXSxcblx0cnF1ZXN0aW9uID0gL1xcPy8sXG5cdHJqc29ucCA9IC8oPSlcXD8oPz0mfCQpfFxcP1xcPy8sXG5cdG5vbmNlID0galF1ZXJ5Lm5vdygpO1xuXG4vLyBEZWZhdWx0IGpzb25wIHNldHRpbmdzXG5qUXVlcnkuYWpheFNldHVwKHtcblx0anNvbnA6IFwiY2FsbGJhY2tcIixcblx0anNvbnBDYWxsYmFjazogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGNhbGxiYWNrID0gb2xkQ2FsbGJhY2tzLnBvcCgpIHx8ICggalF1ZXJ5LmV4cGFuZG8gKyBcIl9cIiArICggbm9uY2UrKyApICk7XG5cdFx0dGhpc1sgY2FsbGJhY2sgXSA9IHRydWU7XG5cdFx0cmV0dXJuIGNhbGxiYWNrO1xuXHR9XG59KTtcblxuLy8gRGV0ZWN0LCBub3JtYWxpemUgb3B0aW9ucyBhbmQgaW5zdGFsbCBjYWxsYmFja3MgZm9yIGpzb25wIHJlcXVlc3RzXG5qUXVlcnkuYWpheFByZWZpbHRlciggXCJqc29uIGpzb25wXCIsIGZ1bmN0aW9uKCBzLCBvcmlnaW5hbFNldHRpbmdzLCBqcVhIUiApIHtcblxuXHR2YXIgY2FsbGJhY2tOYW1lLCBvdmVyd3JpdHRlbiwgcmVzcG9uc2VDb250YWluZXIsXG5cdFx0ZGF0YSA9IHMuZGF0YSxcblx0XHR1cmwgPSBzLnVybCxcblx0XHRoYXNDYWxsYmFjayA9IHMuanNvbnAgIT09IGZhbHNlLFxuXHRcdHJlcGxhY2VJblVybCA9IGhhc0NhbGxiYWNrICYmIHJqc29ucC50ZXN0KCB1cmwgKSxcblx0XHRyZXBsYWNlSW5EYXRhID0gaGFzQ2FsbGJhY2sgJiYgIXJlcGxhY2VJblVybCAmJiB0eXBlb2YgZGF0YSA9PT0gXCJzdHJpbmdcIiAmJlxuXHRcdFx0ISggcy5jb250ZW50VHlwZSB8fCBcIlwiICkuaW5kZXhPZihcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZFwiKSAmJlxuXHRcdFx0cmpzb25wLnRlc3QoIGRhdGEgKTtcblxuXHQvLyBIYW5kbGUgaWZmIHRoZSBleHBlY3RlZCBkYXRhIHR5cGUgaXMgXCJqc29ucFwiIG9yIHdlIGhhdmUgYSBwYXJhbWV0ZXIgdG8gc2V0XG5cdGlmICggcy5kYXRhVHlwZXNbIDAgXSA9PT0gXCJqc29ucFwiIHx8IHJlcGxhY2VJblVybCB8fCByZXBsYWNlSW5EYXRhICkge1xuXG5cdFx0Ly8gR2V0IGNhbGxiYWNrIG5hbWUsIHJlbWVtYmVyaW5nIHByZWV4aXN0aW5nIHZhbHVlIGFzc29jaWF0ZWQgd2l0aCBpdFxuXHRcdGNhbGxiYWNrTmFtZSA9IHMuanNvbnBDYWxsYmFjayA9IGpRdWVyeS5pc0Z1bmN0aW9uKCBzLmpzb25wQ2FsbGJhY2sgKSA/XG5cdFx0XHRzLmpzb25wQ2FsbGJhY2soKSA6XG5cdFx0XHRzLmpzb25wQ2FsbGJhY2s7XG5cdFx0b3ZlcndyaXR0ZW4gPSB3aW5kb3dbIGNhbGxiYWNrTmFtZSBdO1xuXG5cdFx0Ly8gSW5zZXJ0IGNhbGxiYWNrIGludG8gdXJsIG9yIGZvcm0gZGF0YVxuXHRcdGlmICggcmVwbGFjZUluVXJsICkge1xuXHRcdFx0cy51cmwgPSB1cmwucmVwbGFjZSggcmpzb25wLCBcIiQxXCIgKyBjYWxsYmFja05hbWUgKTtcblx0XHR9IGVsc2UgaWYgKCByZXBsYWNlSW5EYXRhICkge1xuXHRcdFx0cy5kYXRhID0gZGF0YS5yZXBsYWNlKCByanNvbnAsIFwiJDFcIiArIGNhbGxiYWNrTmFtZSApO1xuXHRcdH0gZWxzZSBpZiAoIGhhc0NhbGxiYWNrICkge1xuXHRcdFx0cy51cmwgKz0gKCBycXVlc3Rpb24udGVzdCggdXJsICkgPyBcIiZcIiA6IFwiP1wiICkgKyBzLmpzb25wICsgXCI9XCIgKyBjYWxsYmFja05hbWU7XG5cdFx0fVxuXG5cdFx0Ly8gVXNlIGRhdGEgY29udmVydGVyIHRvIHJldHJpZXZlIGpzb24gYWZ0ZXIgc2NyaXB0IGV4ZWN1dGlvblxuXHRcdHMuY29udmVydGVyc1tcInNjcmlwdCBqc29uXCJdID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoICFyZXNwb25zZUNvbnRhaW5lciApIHtcblx0XHRcdFx0alF1ZXJ5LmVycm9yKCBjYWxsYmFja05hbWUgKyBcIiB3YXMgbm90IGNhbGxlZFwiICk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2VDb250YWluZXJbIDAgXTtcblx0XHR9O1xuXG5cdFx0Ly8gZm9yY2UganNvbiBkYXRhVHlwZVxuXHRcdHMuZGF0YVR5cGVzWyAwIF0gPSBcImpzb25cIjtcblxuXHRcdC8vIEluc3RhbGwgY2FsbGJhY2tcblx0XHR3aW5kb3dbIGNhbGxiYWNrTmFtZSBdID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXNwb25zZUNvbnRhaW5lciA9IGFyZ3VtZW50cztcblx0XHR9O1xuXG5cdFx0Ly8gQ2xlYW4tdXAgZnVuY3Rpb24gKGZpcmVzIGFmdGVyIGNvbnZlcnRlcnMpXG5cdFx0anFYSFIuYWx3YXlzKGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gUmVzdG9yZSBwcmVleGlzdGluZyB2YWx1ZVxuXHRcdFx0d2luZG93WyBjYWxsYmFja05hbWUgXSA9IG92ZXJ3cml0dGVuO1xuXG5cdFx0XHQvLyBTYXZlIGJhY2sgYXMgZnJlZVxuXHRcdFx0aWYgKCBzWyBjYWxsYmFja05hbWUgXSApIHtcblx0XHRcdFx0Ly8gbWFrZSBzdXJlIHRoYXQgcmUtdXNpbmcgdGhlIG9wdGlvbnMgZG9lc24ndCBzY3JldyB0aGluZ3MgYXJvdW5kXG5cdFx0XHRcdHMuanNvbnBDYWxsYmFjayA9IG9yaWdpbmFsU2V0dGluZ3MuanNvbnBDYWxsYmFjaztcblxuXHRcdFx0XHQvLyBzYXZlIHRoZSBjYWxsYmFjayBuYW1lIGZvciBmdXR1cmUgdXNlXG5cdFx0XHRcdG9sZENhbGxiYWNrcy5wdXNoKCBjYWxsYmFja05hbWUgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gQ2FsbCBpZiBpdCB3YXMgYSBmdW5jdGlvbiBhbmQgd2UgaGF2ZSBhIHJlc3BvbnNlXG5cdFx0XHRpZiAoIHJlc3BvbnNlQ29udGFpbmVyICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCBvdmVyd3JpdHRlbiApICkge1xuXHRcdFx0XHRvdmVyd3JpdHRlbiggcmVzcG9uc2VDb250YWluZXJbIDAgXSApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXNwb25zZUNvbnRhaW5lciA9IG92ZXJ3cml0dGVuID0gdW5kZWZpbmVkO1xuXHRcdH0pO1xuXG5cdFx0Ly8gRGVsZWdhdGUgdG8gc2NyaXB0XG5cdFx0cmV0dXJuIFwic2NyaXB0XCI7XG5cdH1cbn0pO1xuLy8gSW5zdGFsbCBzY3JpcHQgZGF0YVR5cGVcbmpRdWVyeS5hamF4U2V0dXAoe1xuXHRhY2NlcHRzOiB7XG5cdFx0c2NyaXB0OiBcInRleHQvamF2YXNjcmlwdCwgYXBwbGljYXRpb24vamF2YXNjcmlwdCwgYXBwbGljYXRpb24vZWNtYXNjcmlwdCwgYXBwbGljYXRpb24veC1lY21hc2NyaXB0XCJcblx0fSxcblx0Y29udGVudHM6IHtcblx0XHRzY3JpcHQ6IC9qYXZhc2NyaXB0fGVjbWFzY3JpcHQvXG5cdH0sXG5cdGNvbnZlcnRlcnM6IHtcblx0XHRcInRleHQgc2NyaXB0XCI6IGZ1bmN0aW9uKCB0ZXh0ICkge1xuXHRcdFx0alF1ZXJ5Lmdsb2JhbEV2YWwoIHRleHQgKTtcblx0XHRcdHJldHVybiB0ZXh0O1xuXHRcdH1cblx0fVxufSk7XG5cbi8vIEhhbmRsZSBjYWNoZSdzIHNwZWNpYWwgY2FzZSBhbmQgZ2xvYmFsXG5qUXVlcnkuYWpheFByZWZpbHRlciggXCJzY3JpcHRcIiwgZnVuY3Rpb24oIHMgKSB7XG5cdGlmICggcy5jYWNoZSA9PT0gdW5kZWZpbmVkICkge1xuXHRcdHMuY2FjaGUgPSBmYWxzZTtcblx0fVxuXHRpZiAoIHMuY3Jvc3NEb21haW4gKSB7XG5cdFx0cy50eXBlID0gXCJHRVRcIjtcblx0XHRzLmdsb2JhbCA9IGZhbHNlO1xuXHR9XG59KTtcblxuLy8gQmluZCBzY3JpcHQgdGFnIGhhY2sgdHJhbnNwb3J0XG5qUXVlcnkuYWpheFRyYW5zcG9ydCggXCJzY3JpcHRcIiwgZnVuY3Rpb24ocykge1xuXG5cdC8vIFRoaXMgdHJhbnNwb3J0IG9ubHkgZGVhbHMgd2l0aCBjcm9zcyBkb21haW4gcmVxdWVzdHNcblx0aWYgKCBzLmNyb3NzRG9tYWluICkge1xuXG5cdFx0dmFyIHNjcmlwdCxcblx0XHRcdGhlYWQgPSBkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcImhlYWRcIiApWzBdIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuXHRcdHJldHVybiB7XG5cblx0XHRcdHNlbmQ6IGZ1bmN0aW9uKCBfLCBjYWxsYmFjayApIHtcblxuXHRcdFx0XHRzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcInNjcmlwdFwiICk7XG5cblx0XHRcdFx0c2NyaXB0LmFzeW5jID0gXCJhc3luY1wiO1xuXG5cdFx0XHRcdGlmICggcy5zY3JpcHRDaGFyc2V0ICkge1xuXHRcdFx0XHRcdHNjcmlwdC5jaGFyc2V0ID0gcy5zY3JpcHRDaGFyc2V0O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2NyaXB0LnNyYyA9IHMudXJsO1xuXG5cdFx0XHRcdC8vIEF0dGFjaCBoYW5kbGVycyBmb3IgYWxsIGJyb3dzZXJzXG5cdFx0XHRcdHNjcmlwdC5vbmxvYWQgPSBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oIF8sIGlzQWJvcnQgKSB7XG5cblx0XHRcdFx0XHRpZiAoIGlzQWJvcnQgfHwgIXNjcmlwdC5yZWFkeVN0YXRlIHx8IC9sb2FkZWR8Y29tcGxldGUvLnRlc3QoIHNjcmlwdC5yZWFkeVN0YXRlICkgKSB7XG5cblx0XHRcdFx0XHRcdC8vIEhhbmRsZSBtZW1vcnkgbGVhayBpbiBJRVxuXHRcdFx0XHRcdFx0c2NyaXB0Lm9ubG9hZCA9IHNjcmlwdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBudWxsO1xuXG5cdFx0XHRcdFx0XHQvLyBSZW1vdmUgdGhlIHNjcmlwdFxuXHRcdFx0XHRcdFx0aWYgKCBoZWFkICYmIHNjcmlwdC5wYXJlbnROb2RlICkge1xuXHRcdFx0XHRcdFx0XHRoZWFkLnJlbW92ZUNoaWxkKCBzY3JpcHQgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gRGVyZWZlcmVuY2UgdGhlIHNjcmlwdFxuXHRcdFx0XHRcdFx0c2NyaXB0ID0gdW5kZWZpbmVkO1xuXG5cdFx0XHRcdFx0XHQvLyBDYWxsYmFjayBpZiBub3QgYWJvcnRcblx0XHRcdFx0XHRcdGlmICggIWlzQWJvcnQgKSB7XG5cdFx0XHRcdFx0XHRcdGNhbGxiYWNrKCAyMDAsIFwic3VjY2Vzc1wiICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0XHQvLyBVc2UgaW5zZXJ0QmVmb3JlIGluc3RlYWQgb2YgYXBwZW5kQ2hpbGQgIHRvIGNpcmN1bXZlbnQgYW4gSUU2IGJ1Zy5cblx0XHRcdFx0Ly8gVGhpcyBhcmlzZXMgd2hlbiBhIGJhc2Ugbm9kZSBpcyB1c2VkICgjMjcwOSBhbmQgIzQzNzgpLlxuXHRcdFx0XHRoZWFkLmluc2VydEJlZm9yZSggc2NyaXB0LCBoZWFkLmZpcnN0Q2hpbGQgKTtcblx0XHRcdH0sXG5cblx0XHRcdGFib3J0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCBzY3JpcHQgKSB7XG5cdFx0XHRcdFx0c2NyaXB0Lm9ubG9hZCggMCwgMSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxufSk7XG52YXIgeGhyQ2FsbGJhY2tzLFxuXHQvLyAjNTI4MDogSW50ZXJuZXQgRXhwbG9yZXIgd2lsbCBrZWVwIGNvbm5lY3Rpb25zIGFsaXZlIGlmIHdlIGRvbid0IGFib3J0IG9uIHVubG9hZFxuXHR4aHJPblVubG9hZEFib3J0ID0gd2luZG93LkFjdGl2ZVhPYmplY3QgPyBmdW5jdGlvbigpIHtcblx0XHQvLyBBYm9ydCBhbGwgcGVuZGluZyByZXF1ZXN0c1xuXHRcdGZvciAoIHZhciBrZXkgaW4geGhyQ2FsbGJhY2tzICkge1xuXHRcdFx0eGhyQ2FsbGJhY2tzWyBrZXkgXSggMCwgMSApO1xuXHRcdH1cblx0fSA6IGZhbHNlLFxuXHR4aHJJZCA9IDA7XG5cbi8vIEZ1bmN0aW9ucyB0byBjcmVhdGUgeGhyc1xuZnVuY3Rpb24gY3JlYXRlU3RhbmRhcmRYSFIoKSB7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblx0fSBjYXRjaCggZSApIHt9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUFjdGl2ZVhIUigpIHtcblx0dHJ5IHtcblx0XHRyZXR1cm4gbmV3IHdpbmRvdy5BY3RpdmVYT2JqZWN0KCBcIk1pY3Jvc29mdC5YTUxIVFRQXCIgKTtcblx0fSBjYXRjaCggZSApIHt9XG59XG5cbi8vIENyZWF0ZSB0aGUgcmVxdWVzdCBvYmplY3Rcbi8vIChUaGlzIGlzIHN0aWxsIGF0dGFjaGVkIHRvIGFqYXhTZXR0aW5ncyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbmpRdWVyeS5hamF4U2V0dGluZ3MueGhyID0gd2luZG93LkFjdGl2ZVhPYmplY3QgP1xuXHQvKiBNaWNyb3NvZnQgZmFpbGVkIHRvIHByb3Blcmx5XG5cdCAqIGltcGxlbWVudCB0aGUgWE1MSHR0cFJlcXVlc3QgaW4gSUU3IChjYW4ndCByZXF1ZXN0IGxvY2FsIGZpbGVzKSxcblx0ICogc28gd2UgdXNlIHRoZSBBY3RpdmVYT2JqZWN0IHdoZW4gaXQgaXMgYXZhaWxhYmxlXG5cdCAqIEFkZGl0aW9uYWxseSBYTUxIdHRwUmVxdWVzdCBjYW4gYmUgZGlzYWJsZWQgaW4gSUU3L0lFOCBzb1xuXHQgKiB3ZSBuZWVkIGEgZmFsbGJhY2suXG5cdCAqL1xuXHRmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gIXRoaXMuaXNMb2NhbCAmJiBjcmVhdGVTdGFuZGFyZFhIUigpIHx8IGNyZWF0ZUFjdGl2ZVhIUigpO1xuXHR9IDpcblx0Ly8gRm9yIGFsbCBvdGhlciBicm93c2VycywgdXNlIHRoZSBzdGFuZGFyZCBYTUxIdHRwUmVxdWVzdCBvYmplY3Rcblx0Y3JlYXRlU3RhbmRhcmRYSFI7XG5cbi8vIERldGVybWluZSBzdXBwb3J0IHByb3BlcnRpZXNcbihmdW5jdGlvbiggeGhyICkge1xuXHRqUXVlcnkuZXh0ZW5kKCBqUXVlcnkuc3VwcG9ydCwge1xuXHRcdGFqYXg6ICEheGhyLFxuXHRcdGNvcnM6ICEheGhyICYmICggXCJ3aXRoQ3JlZGVudGlhbHNcIiBpbiB4aHIgKVxuXHR9KTtcbn0pKCBqUXVlcnkuYWpheFNldHRpbmdzLnhocigpICk7XG5cbi8vIENyZWF0ZSB0cmFuc3BvcnQgaWYgdGhlIGJyb3dzZXIgY2FuIHByb3ZpZGUgYW4geGhyXG5pZiAoIGpRdWVyeS5zdXBwb3J0LmFqYXggKSB7XG5cblx0alF1ZXJ5LmFqYXhUcmFuc3BvcnQoZnVuY3Rpb24oIHMgKSB7XG5cdFx0Ly8gQ3Jvc3MgZG9tYWluIG9ubHkgYWxsb3dlZCBpZiBzdXBwb3J0ZWQgdGhyb3VnaCBYTUxIdHRwUmVxdWVzdFxuXHRcdGlmICggIXMuY3Jvc3NEb21haW4gfHwgalF1ZXJ5LnN1cHBvcnQuY29ycyApIHtcblxuXHRcdFx0dmFyIGNhbGxiYWNrO1xuXG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRzZW5kOiBmdW5jdGlvbiggaGVhZGVycywgY29tcGxldGUgKSB7XG5cblx0XHRcdFx0XHQvLyBHZXQgYSBuZXcgeGhyXG5cdFx0XHRcdFx0dmFyIGhhbmRsZSwgaSxcblx0XHRcdFx0XHRcdHhociA9IHMueGhyKCk7XG5cblx0XHRcdFx0XHQvLyBPcGVuIHRoZSBzb2NrZXRcblx0XHRcdFx0XHQvLyBQYXNzaW5nIG51bGwgdXNlcm5hbWUsIGdlbmVyYXRlcyBhIGxvZ2luIHBvcHVwIG9uIE9wZXJhICgjMjg2NSlcblx0XHRcdFx0XHRpZiAoIHMudXNlcm5hbWUgKSB7XG5cdFx0XHRcdFx0XHR4aHIub3Blbiggcy50eXBlLCBzLnVybCwgcy5hc3luYywgcy51c2VybmFtZSwgcy5wYXNzd29yZCApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR4aHIub3Blbiggcy50eXBlLCBzLnVybCwgcy5hc3luYyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIEFwcGx5IGN1c3RvbSBmaWVsZHMgaWYgcHJvdmlkZWRcblx0XHRcdFx0XHRpZiAoIHMueGhyRmllbGRzICkge1xuXHRcdFx0XHRcdFx0Zm9yICggaSBpbiBzLnhockZpZWxkcyApIHtcblx0XHRcdFx0XHRcdFx0eGhyWyBpIF0gPSBzLnhockZpZWxkc1sgaSBdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE92ZXJyaWRlIG1pbWUgdHlwZSBpZiBuZWVkZWRcblx0XHRcdFx0XHRpZiAoIHMubWltZVR5cGUgJiYgeGhyLm92ZXJyaWRlTWltZVR5cGUgKSB7XG5cdFx0XHRcdFx0XHR4aHIub3ZlcnJpZGVNaW1lVHlwZSggcy5taW1lVHlwZSApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFgtUmVxdWVzdGVkLVdpdGggaGVhZGVyXG5cdFx0XHRcdFx0Ly8gRm9yIGNyb3NzLWRvbWFpbiByZXF1ZXN0cywgc2VlaW5nIGFzIGNvbmRpdGlvbnMgZm9yIGEgcHJlZmxpZ2h0IGFyZVxuXHRcdFx0XHRcdC8vIGFraW4gdG8gYSBqaWdzYXcgcHV6emxlLCB3ZSBzaW1wbHkgbmV2ZXIgc2V0IGl0IHRvIGJlIHN1cmUuXG5cdFx0XHRcdFx0Ly8gKGl0IGNhbiBhbHdheXMgYmUgc2V0IG9uIGEgcGVyLXJlcXVlc3QgYmFzaXMgb3IgZXZlbiB1c2luZyBhamF4U2V0dXApXG5cdFx0XHRcdFx0Ly8gRm9yIHNhbWUtZG9tYWluIHJlcXVlc3RzLCB3b24ndCBjaGFuZ2UgaGVhZGVyIGlmIGFscmVhZHkgcHJvdmlkZWQuXG5cdFx0XHRcdFx0aWYgKCAhcy5jcm9zc0RvbWFpbiAmJiAhaGVhZGVyc1tcIlgtUmVxdWVzdGVkLVdpdGhcIl0gKSB7XG5cdFx0XHRcdFx0XHRoZWFkZXJzWyBcIlgtUmVxdWVzdGVkLVdpdGhcIiBdID0gXCJYTUxIdHRwUmVxdWVzdFwiO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIE5lZWQgYW4gZXh0cmEgdHJ5L2NhdGNoIGZvciBjcm9zcyBkb21haW4gcmVxdWVzdHMgaW4gRmlyZWZveCAzXG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGZvciAoIGkgaW4gaGVhZGVycyApIHtcblx0XHRcdFx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoIGksIGhlYWRlcnNbIGkgXSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gY2F0Y2goIF8gKSB7fVxuXG5cdFx0XHRcdFx0Ly8gRG8gc2VuZCB0aGUgcmVxdWVzdFxuXHRcdFx0XHRcdC8vIFRoaXMgbWF5IHJhaXNlIGFuIGV4Y2VwdGlvbiB3aGljaCBpcyBhY3R1YWxseVxuXHRcdFx0XHRcdC8vIGhhbmRsZWQgaW4galF1ZXJ5LmFqYXggKHNvIG5vIHRyeS9jYXRjaCBoZXJlKVxuXHRcdFx0XHRcdHhoci5zZW5kKCAoIHMuaGFzQ29udGVudCAmJiBzLmRhdGEgKSB8fCBudWxsICk7XG5cblx0XHRcdFx0XHQvLyBMaXN0ZW5lclxuXHRcdFx0XHRcdGNhbGxiYWNrID0gZnVuY3Rpb24oIF8sIGlzQWJvcnQgKSB7XG5cblx0XHRcdFx0XHRcdHZhciBzdGF0dXMsXG5cdFx0XHRcdFx0XHRcdHN0YXR1c1RleHQsXG5cdFx0XHRcdFx0XHRcdHJlc3BvbnNlSGVhZGVycyxcblx0XHRcdFx0XHRcdFx0cmVzcG9uc2VzLFxuXHRcdFx0XHRcdFx0XHR4bWw7XG5cblx0XHRcdFx0XHRcdC8vIEZpcmVmb3ggdGhyb3dzIGV4Y2VwdGlvbnMgd2hlbiBhY2Nlc3NpbmcgcHJvcGVydGllc1xuXHRcdFx0XHRcdFx0Ly8gb2YgYW4geGhyIHdoZW4gYSBuZXR3b3JrIGVycm9yIG9jY3VycmVkXG5cdFx0XHRcdFx0XHQvLyBodHRwOi8vaGVscGZ1bC5rbm9icy1kaWFscy5jb20vaW5kZXgucGhwL0NvbXBvbmVudF9yZXR1cm5lZF9mYWlsdXJlX2NvZGU6XzB4ODAwNDAxMTFfKE5TX0VSUk9SX05PVF9BVkFJTEFCTEUpXG5cdFx0XHRcdFx0XHR0cnkge1xuXG5cdFx0XHRcdFx0XHRcdC8vIFdhcyBuZXZlciBjYWxsZWQgYW5kIGlzIGFib3J0ZWQgb3IgY29tcGxldGVcblx0XHRcdFx0XHRcdFx0aWYgKCBjYWxsYmFjayAmJiAoIGlzQWJvcnQgfHwgeGhyLnJlYWR5U3RhdGUgPT09IDQgKSApIHtcblxuXHRcdFx0XHRcdFx0XHRcdC8vIE9ubHkgY2FsbGVkIG9uY2Vcblx0XHRcdFx0XHRcdFx0XHRjYWxsYmFjayA9IHVuZGVmaW5lZDtcblxuXHRcdFx0XHRcdFx0XHRcdC8vIERvIG5vdCBrZWVwIGFzIGFjdGl2ZSBhbnltb3JlXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBoYW5kbGUgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR4aHIub25yZWFkeXN0YXRlY2hhbmdlID0galF1ZXJ5Lm5vb3A7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIHhock9uVW5sb2FkQWJvcnQgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGRlbGV0ZSB4aHJDYWxsYmFja3NbIGhhbmRsZSBdO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdC8vIElmIGl0J3MgYW4gYWJvcnRcblx0XHRcdFx0XHRcdFx0XHRpZiAoIGlzQWJvcnQgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBBYm9ydCBpdCBtYW51YWxseSBpZiBuZWVkZWRcblx0XHRcdFx0XHRcdFx0XHRcdGlmICggeGhyLnJlYWR5U3RhdGUgIT09IDQgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHhoci5hYm9ydCgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRzdGF0dXMgPSB4aHIuc3RhdHVzO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2VIZWFkZXJzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzcG9uc2VzID0ge307XG5cdFx0XHRcdFx0XHRcdFx0XHR4bWwgPSB4aHIucmVzcG9uc2VYTUw7XG5cblx0XHRcdFx0XHRcdFx0XHRcdC8vIENvbnN0cnVjdCByZXNwb25zZSBsaXN0XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoIHhtbCAmJiB4bWwuZG9jdW1lbnRFbGVtZW50IC8qICM0OTU4ICovICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXNwb25zZXMueG1sID0geG1sO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBXaGVuIHJlcXVlc3RpbmcgYmluYXJ5IGRhdGEsIElFNi05IHdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBvbiBhbnkgYXR0ZW1wdCB0byBhY2Nlc3MgcmVzcG9uc2VUZXh0ICgjMTE0MjYpXG5cdFx0XHRcdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXNwb25zZXMudGV4dCA9IHhoci5yZXNwb25zZVRleHQ7XG5cdFx0XHRcdFx0XHRcdFx0XHR9IGNhdGNoKCBfICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBGaXJlZm94IHRocm93cyBhbiBleGNlcHRpb24gd2hlbiBhY2Nlc3Npbmdcblx0XHRcdFx0XHRcdFx0XHRcdC8vIHN0YXR1c1RleHQgZm9yIGZhdWx0eSBjcm9zcy1kb21haW4gcmVxdWVzdHNcblx0XHRcdFx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN0YXR1c1RleHQgPSB4aHIuc3RhdHVzVGV4dDtcblx0XHRcdFx0XHRcdFx0XHRcdH0gY2F0Y2goIGUgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIFdlIG5vcm1hbGl6ZSB3aXRoIFdlYmtpdCBnaXZpbmcgYW4gZW1wdHkgc3RhdHVzVGV4dFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdGF0dXNUZXh0ID0gXCJcIjtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gRmlsdGVyIHN0YXR1cyBmb3Igbm9uIHN0YW5kYXJkIGJlaGF2aW9yc1xuXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBJZiB0aGUgcmVxdWVzdCBpcyBsb2NhbCBhbmQgd2UgaGF2ZSBkYXRhOiBhc3N1bWUgYSBzdWNjZXNzXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyAoc3VjY2VzcyB3aXRoIG5vIGRhdGEgd29uJ3QgZ2V0IG5vdGlmaWVkLCB0aGF0J3MgdGhlIGJlc3Qgd2Vcblx0XHRcdFx0XHRcdFx0XHRcdC8vIGNhbiBkbyBnaXZlbiBjdXJyZW50IGltcGxlbWVudGF0aW9ucylcblx0XHRcdFx0XHRcdFx0XHRcdGlmICggIXN0YXR1cyAmJiBzLmlzTG9jYWwgJiYgIXMuY3Jvc3NEb21haW4gKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN0YXR1cyA9IHJlc3BvbnNlcy50ZXh0ID8gMjAwIDogNDA0O1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gSUUgLSAjMTQ1MDogc29tZXRpbWVzIHJldHVybnMgMTIyMyB3aGVuIGl0IHNob3VsZCBiZSAyMDRcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIHN0YXR1cyA9PT0gMTIyMyApIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3RhdHVzID0gMjA0O1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBjYXRjaCggZmlyZWZveEFjY2Vzc0V4Y2VwdGlvbiApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCAhaXNBYm9ydCApIHtcblx0XHRcdFx0XHRcdFx0XHRjb21wbGV0ZSggLTEsIGZpcmVmb3hBY2Nlc3NFeGNlcHRpb24gKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBDYWxsIGNvbXBsZXRlIGlmIG5lZWRlZFxuXHRcdFx0XHRcdFx0aWYgKCByZXNwb25zZXMgKSB7XG5cdFx0XHRcdFx0XHRcdGNvbXBsZXRlKCBzdGF0dXMsIHN0YXR1c1RleHQsIHJlc3BvbnNlcywgcmVzcG9uc2VIZWFkZXJzICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdGlmICggIXMuYXN5bmMgKSB7XG5cdFx0XHRcdFx0XHQvLyBpZiB3ZSdyZSBpbiBzeW5jIG1vZGUgd2UgZmlyZSB0aGUgY2FsbGJhY2tcblx0XHRcdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggeGhyLnJlYWR5U3RhdGUgPT09IDQgKSB7XG5cdFx0XHRcdFx0XHQvLyAoSUU2ICYgSUU3KSBpZiBpdCdzIGluIGNhY2hlIGFuZCBoYXMgYmVlblxuXHRcdFx0XHRcdFx0Ly8gcmV0cmlldmVkIGRpcmVjdGx5IHdlIG5lZWQgdG8gZmlyZSB0aGUgY2FsbGJhY2tcblx0XHRcdFx0XHRcdHNldFRpbWVvdXQoIGNhbGxiYWNrLCAwICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGhhbmRsZSA9ICsreGhySWQ7XG5cdFx0XHRcdFx0XHRpZiAoIHhock9uVW5sb2FkQWJvcnQgKSB7XG5cdFx0XHRcdFx0XHRcdC8vIENyZWF0ZSB0aGUgYWN0aXZlIHhocnMgY2FsbGJhY2tzIGxpc3QgaWYgbmVlZGVkXG5cdFx0XHRcdFx0XHRcdC8vIGFuZCBhdHRhY2ggdGhlIHVubG9hZCBoYW5kbGVyXG5cdFx0XHRcdFx0XHRcdGlmICggIXhockNhbGxiYWNrcyApIHtcblx0XHRcdFx0XHRcdFx0XHR4aHJDYWxsYmFja3MgPSB7fTtcblx0XHRcdFx0XHRcdFx0XHRqUXVlcnkoIHdpbmRvdyApLnVubG9hZCggeGhyT25VbmxvYWRBYm9ydCApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdC8vIEFkZCB0byBsaXN0IG9mIGFjdGl2ZSB4aHJzIGNhbGxiYWNrc1xuXHRcdFx0XHRcdFx0XHR4aHJDYWxsYmFja3NbIGhhbmRsZSBdID0gY2FsbGJhY2s7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gY2FsbGJhY2s7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXG5cdFx0XHRcdGFib3J0OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAoIGNhbGxiYWNrICkge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2soMCwxKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fVxuXHR9KTtcbn1cbnZhciBmeE5vdywgdGltZXJJZCxcblx0cmZ4dHlwZXMgPSAvXig/OnRvZ2dsZXxzaG93fGhpZGUpJC8sXG5cdHJmeG51bSA9IG5ldyBSZWdFeHAoIFwiXig/OihbLStdKT18KShcIiArIGNvcmVfcG51bSArIFwiKShbYS16JV0qKSRcIiwgXCJpXCIgKSxcblx0cnJ1biA9IC9xdWV1ZUhvb2tzJC8sXG5cdGFuaW1hdGlvblByZWZpbHRlcnMgPSBbIGRlZmF1bHRQcmVmaWx0ZXIgXSxcblx0dHdlZW5lcnMgPSB7XG5cdFx0XCIqXCI6IFtmdW5jdGlvbiggcHJvcCwgdmFsdWUgKSB7XG5cdFx0XHR2YXIgZW5kLCB1bml0LCBwcmV2U2NhbGUsXG5cdFx0XHRcdHR3ZWVuID0gdGhpcy5jcmVhdGVUd2VlbiggcHJvcCwgdmFsdWUgKSxcblx0XHRcdFx0cGFydHMgPSByZnhudW0uZXhlYyggdmFsdWUgKSxcblx0XHRcdFx0dGFyZ2V0ID0gdHdlZW4uY3VyKCksXG5cdFx0XHRcdHN0YXJ0ID0gK3RhcmdldCB8fCAwLFxuXHRcdFx0XHRzY2FsZSA9IDE7XG5cblx0XHRcdGlmICggcGFydHMgKSB7XG5cdFx0XHRcdGVuZCA9ICtwYXJ0c1syXTtcblx0XHRcdFx0dW5pdCA9IHBhcnRzWzNdIHx8ICggalF1ZXJ5LmNzc051bWJlclsgcHJvcCBdID8gXCJcIiA6IFwicHhcIiApO1xuXG5cdFx0XHRcdC8vIFdlIG5lZWQgdG8gY29tcHV0ZSBzdGFydGluZyB2YWx1ZVxuXHRcdFx0XHRpZiAoIHVuaXQgIT09IFwicHhcIiAmJiBzdGFydCApIHtcblx0XHRcdFx0XHQvLyBJdGVyYXRpdmVseSBhcHByb3hpbWF0ZSBmcm9tIGEgbm9uemVybyBzdGFydGluZyBwb2ludFxuXHRcdFx0XHRcdC8vIFByZWZlciB0aGUgY3VycmVudCBwcm9wZXJ0eSwgYmVjYXVzZSB0aGlzIHByb2Nlc3Mgd2lsbCBiZSB0cml2aWFsIGlmIGl0IHVzZXMgdGhlIHNhbWUgdW5pdHNcblx0XHRcdFx0XHQvLyBGYWxsYmFjayB0byBlbmQgb3IgYSBzaW1wbGUgY29uc3RhbnRcblx0XHRcdFx0XHRzdGFydCA9IGpRdWVyeS5jc3MoIHR3ZWVuLmVsZW0sIHByb3AsIHRydWUgKSB8fCBlbmQgfHwgMTtcblxuXHRcdFx0XHRcdGRvIHtcblx0XHRcdFx0XHRcdC8vIElmIHByZXZpb3VzIGl0ZXJhdGlvbiB6ZXJvZWQgb3V0LCBkb3VibGUgdW50aWwgd2UgZ2V0ICpzb21ldGhpbmcqXG5cdFx0XHRcdFx0XHQvLyBVc2UgYSBzdHJpbmcgZm9yIGRvdWJsaW5nIGZhY3RvciBzbyB3ZSBkb24ndCBhY2NpZGVudGFsbHkgc2VlIHNjYWxlIGFzIHVuY2hhbmdlZCBiZWxvd1xuXHRcdFx0XHRcdFx0cHJldlNjYWxlID0gc2NhbGUgPSBzY2FsZSB8fCBcIi41XCI7XG5cblx0XHRcdFx0XHRcdC8vIEFkanVzdCBhbmQgYXBwbHlcblx0XHRcdFx0XHRcdHN0YXJ0ID0gc3RhcnQgLyBzY2FsZTtcblx0XHRcdFx0XHRcdGpRdWVyeS5zdHlsZSggdHdlZW4uZWxlbSwgcHJvcCwgc3RhcnQgKyB1bml0ICk7XG5cblx0XHRcdFx0XHRcdC8vIFVwZGF0ZSBzY2FsZSwgdG9sZXJhdGluZyB6ZXJvZXMgZnJvbSB0d2Vlbi5jdXIoKVxuXHRcdFx0XHRcdFx0c2NhbGUgPSB0d2Vlbi5jdXIoKSAvIHRhcmdldDtcblxuXHRcdFx0XHRcdC8vIFN0b3AgbG9vcGluZyBpZiB3ZSd2ZSBoaXQgdGhlIG1hcmsgb3Igc2NhbGUgaXMgdW5jaGFuZ2VkXG5cdFx0XHRcdFx0fSB3aGlsZSAoIHNjYWxlICE9PSAxICYmIHNjYWxlICE9PSBwcmV2U2NhbGUgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHR3ZWVuLnVuaXQgPSB1bml0O1xuXHRcdFx0XHR0d2Vlbi5zdGFydCA9IHN0YXJ0O1xuXHRcdFx0XHQvLyBJZiBhICs9Ly09IHRva2VuIHdhcyBwcm92aWRlZCwgd2UncmUgZG9pbmcgYSByZWxhdGl2ZSBhbmltYXRpb25cblx0XHRcdFx0dHdlZW4uZW5kID0gcGFydHNbMV0gPyBzdGFydCArICggcGFydHNbMV0gKyAxICkgKiBlbmQgOiBlbmQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdHdlZW47XG5cdFx0fV1cblx0fTtcblxuLy8gQW5pbWF0aW9ucyBjcmVhdGVkIHN5bmNocm9ub3VzbHkgd2lsbCBydW4gc3luY2hyb25vdXNseVxuZnVuY3Rpb24gY3JlYXRlRnhOb3coKSB7XG5cdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0ZnhOb3cgPSB1bmRlZmluZWQ7XG5cdH0sIDAgKTtcblx0cmV0dXJuICggZnhOb3cgPSBqUXVlcnkubm93KCkgKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVHdlZW5zKCBhbmltYXRpb24sIHByb3BzICkge1xuXHRqUXVlcnkuZWFjaCggcHJvcHMsIGZ1bmN0aW9uKCBwcm9wLCB2YWx1ZSApIHtcblx0XHR2YXIgY29sbGVjdGlvbiA9ICggdHdlZW5lcnNbIHByb3AgXSB8fCBbXSApLmNvbmNhdCggdHdlZW5lcnNbIFwiKlwiIF0gKSxcblx0XHRcdGluZGV4ID0gMCxcblx0XHRcdGxlbmd0aCA9IGNvbGxlY3Rpb24ubGVuZ3RoO1xuXHRcdGZvciAoIDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KysgKSB7XG5cdFx0XHRpZiAoIGNvbGxlY3Rpb25bIGluZGV4IF0uY2FsbCggYW5pbWF0aW9uLCBwcm9wLCB2YWx1ZSApICkge1xuXG5cdFx0XHRcdC8vIHdlJ3JlIGRvbmUgd2l0aCB0aGlzIHByb3BlcnR5XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBBbmltYXRpb24oIGVsZW0sIHByb3BlcnRpZXMsIG9wdGlvbnMgKSB7XG5cdHZhciByZXN1bHQsXG5cdFx0aW5kZXggPSAwLFxuXHRcdHR3ZWVuZXJJbmRleCA9IDAsXG5cdFx0bGVuZ3RoID0gYW5pbWF0aW9uUHJlZmlsdGVycy5sZW5ndGgsXG5cdFx0ZGVmZXJyZWQgPSBqUXVlcnkuRGVmZXJyZWQoKS5hbHdheXMoIGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gZG9uJ3QgbWF0Y2ggZWxlbSBpbiB0aGUgOmFuaW1hdGVkIHNlbGVjdG9yXG5cdFx0XHRkZWxldGUgdGljay5lbGVtO1xuXHRcdH0pLFxuXHRcdHRpY2sgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBjdXJyZW50VGltZSA9IGZ4Tm93IHx8IGNyZWF0ZUZ4Tm93KCksXG5cdFx0XHRcdHJlbWFpbmluZyA9IE1hdGgubWF4KCAwLCBhbmltYXRpb24uc3RhcnRUaW1lICsgYW5pbWF0aW9uLmR1cmF0aW9uIC0gY3VycmVudFRpbWUgKSxcblx0XHRcdFx0cGVyY2VudCA9IDEgLSAoIHJlbWFpbmluZyAvIGFuaW1hdGlvbi5kdXJhdGlvbiB8fCAwICksXG5cdFx0XHRcdGluZGV4ID0gMCxcblx0XHRcdFx0bGVuZ3RoID0gYW5pbWF0aW9uLnR3ZWVucy5sZW5ndGg7XG5cblx0XHRcdGZvciAoIDsgaW5kZXggPCBsZW5ndGggOyBpbmRleCsrICkge1xuXHRcdFx0XHRhbmltYXRpb24udHdlZW5zWyBpbmRleCBdLnJ1biggcGVyY2VudCApO1xuXHRcdFx0fVxuXG5cdFx0XHRkZWZlcnJlZC5ub3RpZnlXaXRoKCBlbGVtLCBbIGFuaW1hdGlvbiwgcGVyY2VudCwgcmVtYWluaW5nIF0pO1xuXG5cdFx0XHRpZiAoIHBlcmNlbnQgPCAxICYmIGxlbmd0aCApIHtcblx0XHRcdFx0cmV0dXJuIHJlbWFpbmluZztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCBlbGVtLCBbIGFuaW1hdGlvbiBdICk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGFuaW1hdGlvbiA9IGRlZmVycmVkLnByb21pc2Uoe1xuXHRcdFx0ZWxlbTogZWxlbSxcblx0XHRcdHByb3BzOiBqUXVlcnkuZXh0ZW5kKCB7fSwgcHJvcGVydGllcyApLFxuXHRcdFx0b3B0czogalF1ZXJ5LmV4dGVuZCggdHJ1ZSwgeyBzcGVjaWFsRWFzaW5nOiB7fSB9LCBvcHRpb25zICksXG5cdFx0XHRvcmlnaW5hbFByb3BlcnRpZXM6IHByb3BlcnRpZXMsXG5cdFx0XHRvcmlnaW5hbE9wdGlvbnM6IG9wdGlvbnMsXG5cdFx0XHRzdGFydFRpbWU6IGZ4Tm93IHx8IGNyZWF0ZUZ4Tm93KCksXG5cdFx0XHRkdXJhdGlvbjogb3B0aW9ucy5kdXJhdGlvbixcblx0XHRcdHR3ZWVuczogW10sXG5cdFx0XHRjcmVhdGVUd2VlbjogZnVuY3Rpb24oIHByb3AsIGVuZCwgZWFzaW5nICkge1xuXHRcdFx0XHR2YXIgdHdlZW4gPSBqUXVlcnkuVHdlZW4oIGVsZW0sIGFuaW1hdGlvbi5vcHRzLCBwcm9wLCBlbmQsXG5cdFx0XHRcdFx0XHRhbmltYXRpb24ub3B0cy5zcGVjaWFsRWFzaW5nWyBwcm9wIF0gfHwgYW5pbWF0aW9uLm9wdHMuZWFzaW5nICk7XG5cdFx0XHRcdGFuaW1hdGlvbi50d2VlbnMucHVzaCggdHdlZW4gKTtcblx0XHRcdFx0cmV0dXJuIHR3ZWVuO1xuXHRcdFx0fSxcblx0XHRcdHN0b3A6IGZ1bmN0aW9uKCBnb3RvRW5kICkge1xuXHRcdFx0XHR2YXIgaW5kZXggPSAwLFxuXHRcdFx0XHRcdC8vIGlmIHdlIGFyZSBnb2luZyB0byB0aGUgZW5kLCB3ZSB3YW50IHRvIHJ1biBhbGwgdGhlIHR3ZWVuc1xuXHRcdFx0XHRcdC8vIG90aGVyd2lzZSB3ZSBza2lwIHRoaXMgcGFydFxuXHRcdFx0XHRcdGxlbmd0aCA9IGdvdG9FbmQgPyBhbmltYXRpb24udHdlZW5zLmxlbmd0aCA6IDA7XG5cblx0XHRcdFx0Zm9yICggOyBpbmRleCA8IGxlbmd0aCA7IGluZGV4KysgKSB7XG5cdFx0XHRcdFx0YW5pbWF0aW9uLnR3ZWVuc1sgaW5kZXggXS5ydW4oIDEgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHJlc29sdmUgd2hlbiB3ZSBwbGF5ZWQgdGhlIGxhc3QgZnJhbWVcblx0XHRcdFx0Ly8gb3RoZXJ3aXNlLCByZWplY3Rcblx0XHRcdFx0aWYgKCBnb3RvRW5kICkge1xuXHRcdFx0XHRcdGRlZmVycmVkLnJlc29sdmVXaXRoKCBlbGVtLCBbIGFuaW1hdGlvbiwgZ290b0VuZCBdICk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucmVqZWN0V2l0aCggZWxlbSwgWyBhbmltYXRpb24sIGdvdG9FbmQgXSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXHRcdH0pLFxuXHRcdHByb3BzID0gYW5pbWF0aW9uLnByb3BzO1xuXG5cdHByb3BGaWx0ZXIoIHByb3BzLCBhbmltYXRpb24ub3B0cy5zcGVjaWFsRWFzaW5nICk7XG5cblx0Zm9yICggOyBpbmRleCA8IGxlbmd0aCA7IGluZGV4KysgKSB7XG5cdFx0cmVzdWx0ID0gYW5pbWF0aW9uUHJlZmlsdGVyc1sgaW5kZXggXS5jYWxsKCBhbmltYXRpb24sIGVsZW0sIHByb3BzLCBhbmltYXRpb24ub3B0cyApO1xuXHRcdGlmICggcmVzdWx0ICkge1xuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cblxuXHRjcmVhdGVUd2VlbnMoIGFuaW1hdGlvbiwgcHJvcHMgKTtcblxuXHRpZiAoIGpRdWVyeS5pc0Z1bmN0aW9uKCBhbmltYXRpb24ub3B0cy5zdGFydCApICkge1xuXHRcdGFuaW1hdGlvbi5vcHRzLnN0YXJ0LmNhbGwoIGVsZW0sIGFuaW1hdGlvbiApO1xuXHR9XG5cblx0alF1ZXJ5LmZ4LnRpbWVyKFxuXHRcdGpRdWVyeS5leHRlbmQoIHRpY2ssIHtcblx0XHRcdGFuaW06IGFuaW1hdGlvbixcblx0XHRcdHF1ZXVlOiBhbmltYXRpb24ub3B0cy5xdWV1ZSxcblx0XHRcdGVsZW06IGVsZW1cblx0XHR9KVxuXHQpO1xuXG5cdC8vIGF0dGFjaCBjYWxsYmFja3MgZnJvbSBvcHRpb25zXG5cdHJldHVybiBhbmltYXRpb24ucHJvZ3Jlc3MoIGFuaW1hdGlvbi5vcHRzLnByb2dyZXNzIClcblx0XHQuZG9uZSggYW5pbWF0aW9uLm9wdHMuZG9uZSwgYW5pbWF0aW9uLm9wdHMuY29tcGxldGUgKVxuXHRcdC5mYWlsKCBhbmltYXRpb24ub3B0cy5mYWlsIClcblx0XHQuYWx3YXlzKCBhbmltYXRpb24ub3B0cy5hbHdheXMgKTtcbn1cblxuZnVuY3Rpb24gcHJvcEZpbHRlciggcHJvcHMsIHNwZWNpYWxFYXNpbmcgKSB7XG5cdHZhciBpbmRleCwgbmFtZSwgZWFzaW5nLCB2YWx1ZSwgaG9va3M7XG5cblx0Ly8gY2FtZWxDYXNlLCBzcGVjaWFsRWFzaW5nIGFuZCBleHBhbmQgY3NzSG9vayBwYXNzXG5cdGZvciAoIGluZGV4IGluIHByb3BzICkge1xuXHRcdG5hbWUgPSBqUXVlcnkuY2FtZWxDYXNlKCBpbmRleCApO1xuXHRcdGVhc2luZyA9IHNwZWNpYWxFYXNpbmdbIG5hbWUgXTtcblx0XHR2YWx1ZSA9IHByb3BzWyBpbmRleCBdO1xuXHRcdGlmICggalF1ZXJ5LmlzQXJyYXkoIHZhbHVlICkgKSB7XG5cdFx0XHRlYXNpbmcgPSB2YWx1ZVsgMSBdO1xuXHRcdFx0dmFsdWUgPSBwcm9wc1sgaW5kZXggXSA9IHZhbHVlWyAwIF07XG5cdFx0fVxuXG5cdFx0aWYgKCBpbmRleCAhPT0gbmFtZSApIHtcblx0XHRcdHByb3BzWyBuYW1lIF0gPSB2YWx1ZTtcblx0XHRcdGRlbGV0ZSBwcm9wc1sgaW5kZXggXTtcblx0XHR9XG5cblx0XHRob29rcyA9IGpRdWVyeS5jc3NIb29rc1sgbmFtZSBdO1xuXHRcdGlmICggaG9va3MgJiYgXCJleHBhbmRcIiBpbiBob29rcyApIHtcblx0XHRcdHZhbHVlID0gaG9va3MuZXhwYW5kKCB2YWx1ZSApO1xuXHRcdFx0ZGVsZXRlIHByb3BzWyBuYW1lIF07XG5cblx0XHRcdC8vIG5vdCBxdWl0ZSAkLmV4dGVuZCwgdGhpcyB3b250IG92ZXJ3cml0ZSBrZXlzIGFscmVhZHkgcHJlc2VudC5cblx0XHRcdC8vIGFsc28gLSByZXVzaW5nICdpbmRleCcgZnJvbSBhYm92ZSBiZWNhdXNlIHdlIGhhdmUgdGhlIGNvcnJlY3QgXCJuYW1lXCJcblx0XHRcdGZvciAoIGluZGV4IGluIHZhbHVlICkge1xuXHRcdFx0XHRpZiAoICEoIGluZGV4IGluIHByb3BzICkgKSB7XG5cdFx0XHRcdFx0cHJvcHNbIGluZGV4IF0gPSB2YWx1ZVsgaW5kZXggXTtcblx0XHRcdFx0XHRzcGVjaWFsRWFzaW5nWyBpbmRleCBdID0gZWFzaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHNwZWNpYWxFYXNpbmdbIG5hbWUgXSA9IGVhc2luZztcblx0XHR9XG5cdH1cbn1cblxualF1ZXJ5LkFuaW1hdGlvbiA9IGpRdWVyeS5leHRlbmQoIEFuaW1hdGlvbiwge1xuXG5cdHR3ZWVuZXI6IGZ1bmN0aW9uKCBwcm9wcywgY2FsbGJhY2sgKSB7XG5cdFx0aWYgKCBqUXVlcnkuaXNGdW5jdGlvbiggcHJvcHMgKSApIHtcblx0XHRcdGNhbGxiYWNrID0gcHJvcHM7XG5cdFx0XHRwcm9wcyA9IFsgXCIqXCIgXTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cHJvcHMgPSBwcm9wcy5zcGxpdChcIiBcIik7XG5cdFx0fVxuXG5cdFx0dmFyIHByb3AsXG5cdFx0XHRpbmRleCA9IDAsXG5cdFx0XHRsZW5ndGggPSBwcm9wcy5sZW5ndGg7XG5cblx0XHRmb3IgKCA7IGluZGV4IDwgbGVuZ3RoIDsgaW5kZXgrKyApIHtcblx0XHRcdHByb3AgPSBwcm9wc1sgaW5kZXggXTtcblx0XHRcdHR3ZWVuZXJzWyBwcm9wIF0gPSB0d2VlbmVyc1sgcHJvcCBdIHx8IFtdO1xuXHRcdFx0dHdlZW5lcnNbIHByb3AgXS51bnNoaWZ0KCBjYWxsYmFjayApO1xuXHRcdH1cblx0fSxcblxuXHRwcmVmaWx0ZXI6IGZ1bmN0aW9uKCBjYWxsYmFjaywgcHJlcGVuZCApIHtcblx0XHRpZiAoIHByZXBlbmQgKSB7XG5cdFx0XHRhbmltYXRpb25QcmVmaWx0ZXJzLnVuc2hpZnQoIGNhbGxiYWNrICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFuaW1hdGlvblByZWZpbHRlcnMucHVzaCggY2FsbGJhY2sgKTtcblx0XHR9XG5cdH1cbn0pO1xuXG5mdW5jdGlvbiBkZWZhdWx0UHJlZmlsdGVyKCBlbGVtLCBwcm9wcywgb3B0cyApIHtcblx0dmFyIGluZGV4LCBwcm9wLCB2YWx1ZSwgbGVuZ3RoLCBkYXRhU2hvdywgdHdlZW4sIGhvb2tzLCBvbGRmaXJlLFxuXHRcdGFuaW0gPSB0aGlzLFxuXHRcdHN0eWxlID0gZWxlbS5zdHlsZSxcblx0XHRvcmlnID0ge30sXG5cdFx0aGFuZGxlZCA9IFtdLFxuXHRcdGhpZGRlbiA9IGVsZW0ubm9kZVR5cGUgJiYgaXNIaWRkZW4oIGVsZW0gKTtcblxuXHQvLyBoYW5kbGUgcXVldWU6IGZhbHNlIHByb21pc2VzXG5cdGlmICggIW9wdHMucXVldWUgKSB7XG5cdFx0aG9va3MgPSBqUXVlcnkuX3F1ZXVlSG9va3MoIGVsZW0sIFwiZnhcIiApO1xuXHRcdGlmICggaG9va3MudW5xdWV1ZWQgPT0gbnVsbCApIHtcblx0XHRcdGhvb2tzLnVucXVldWVkID0gMDtcblx0XHRcdG9sZGZpcmUgPSBob29rcy5lbXB0eS5maXJlO1xuXHRcdFx0aG9va3MuZW1wdHkuZmlyZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoICFob29rcy51bnF1ZXVlZCApIHtcblx0XHRcdFx0XHRvbGRmaXJlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0fVxuXHRcdGhvb2tzLnVucXVldWVkKys7XG5cblx0XHRhbmltLmFsd2F5cyhmdW5jdGlvbigpIHtcblx0XHRcdC8vIGRvaW5nIHRoaXMgbWFrZXMgc3VyZSB0aGF0IHRoZSBjb21wbGV0ZSBoYW5kbGVyIHdpbGwgYmUgY2FsbGVkXG5cdFx0XHQvLyBiZWZvcmUgdGhpcyBjb21wbGV0ZXNcblx0XHRcdGFuaW0uYWx3YXlzKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRob29rcy51bnF1ZXVlZC0tO1xuXHRcdFx0XHRpZiAoICFqUXVlcnkucXVldWUoIGVsZW0sIFwiZnhcIiApLmxlbmd0aCApIHtcblx0XHRcdFx0XHRob29rcy5lbXB0eS5maXJlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0Ly8gaGVpZ2h0L3dpZHRoIG92ZXJmbG93IHBhc3Ncblx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSAxICYmICggXCJoZWlnaHRcIiBpbiBwcm9wcyB8fCBcIndpZHRoXCIgaW4gcHJvcHMgKSApIHtcblx0XHQvLyBNYWtlIHN1cmUgdGhhdCBub3RoaW5nIHNuZWFrcyBvdXRcblx0XHQvLyBSZWNvcmQgYWxsIDMgb3ZlcmZsb3cgYXR0cmlidXRlcyBiZWNhdXNlIElFIGRvZXMgbm90XG5cdFx0Ly8gY2hhbmdlIHRoZSBvdmVyZmxvdyBhdHRyaWJ1dGUgd2hlbiBvdmVyZmxvd1ggYW5kXG5cdFx0Ly8gb3ZlcmZsb3dZIGFyZSBzZXQgdG8gdGhlIHNhbWUgdmFsdWVcblx0XHRvcHRzLm92ZXJmbG93ID0gWyBzdHlsZS5vdmVyZmxvdywgc3R5bGUub3ZlcmZsb3dYLCBzdHlsZS5vdmVyZmxvd1kgXTtcblxuXHRcdC8vIFNldCBkaXNwbGF5IHByb3BlcnR5IHRvIGlubGluZS1ibG9jayBmb3IgaGVpZ2h0L3dpZHRoXG5cdFx0Ly8gYW5pbWF0aW9ucyBvbiBpbmxpbmUgZWxlbWVudHMgdGhhdCBhcmUgaGF2aW5nIHdpZHRoL2hlaWdodCBhbmltYXRlZFxuXHRcdGlmICggalF1ZXJ5LmNzcyggZWxlbSwgXCJkaXNwbGF5XCIgKSA9PT0gXCJpbmxpbmVcIiAmJlxuXHRcdFx0XHRqUXVlcnkuY3NzKCBlbGVtLCBcImZsb2F0XCIgKSA9PT0gXCJub25lXCIgKSB7XG5cblx0XHRcdC8vIGlubGluZS1sZXZlbCBlbGVtZW50cyBhY2NlcHQgaW5saW5lLWJsb2NrO1xuXHRcdFx0Ly8gYmxvY2stbGV2ZWwgZWxlbWVudHMgbmVlZCB0byBiZSBpbmxpbmUgd2l0aCBsYXlvdXRcblx0XHRcdGlmICggIWpRdWVyeS5zdXBwb3J0LmlubGluZUJsb2NrTmVlZHNMYXlvdXQgfHwgY3NzX2RlZmF1bHREaXNwbGF5KCBlbGVtLm5vZGVOYW1lICkgPT09IFwiaW5saW5lXCIgKSB7XG5cdFx0XHRcdHN0eWxlLmRpc3BsYXkgPSBcImlubGluZS1ibG9ja1wiO1xuXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzdHlsZS56b29tID0gMTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAoIG9wdHMub3ZlcmZsb3cgKSB7XG5cdFx0c3R5bGUub3ZlcmZsb3cgPSBcImhpZGRlblwiO1xuXHRcdGlmICggIWpRdWVyeS5zdXBwb3J0LnNocmlua1dyYXBCbG9ja3MgKSB7XG5cdFx0XHRhbmltLmRvbmUoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHN0eWxlLm92ZXJmbG93ID0gb3B0cy5vdmVyZmxvd1sgMCBdO1xuXHRcdFx0XHRzdHlsZS5vdmVyZmxvd1ggPSBvcHRzLm92ZXJmbG93WyAxIF07XG5cdFx0XHRcdHN0eWxlLm92ZXJmbG93WSA9IG9wdHMub3ZlcmZsb3dbIDIgXTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cblx0Ly8gc2hvdy9oaWRlIHBhc3Ncblx0Zm9yICggaW5kZXggaW4gcHJvcHMgKSB7XG5cdFx0dmFsdWUgPSBwcm9wc1sgaW5kZXggXTtcblx0XHRpZiAoIHJmeHR5cGVzLmV4ZWMoIHZhbHVlICkgKSB7XG5cdFx0XHRkZWxldGUgcHJvcHNbIGluZGV4IF07XG5cdFx0XHRpZiAoIHZhbHVlID09PSAoIGhpZGRlbiA/IFwiaGlkZVwiIDogXCJzaG93XCIgKSApIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cdFx0XHRoYW5kbGVkLnB1c2goIGluZGV4ICk7XG5cdFx0fVxuXHR9XG5cblx0bGVuZ3RoID0gaGFuZGxlZC5sZW5ndGg7XG5cdGlmICggbGVuZ3RoICkge1xuXHRcdGRhdGFTaG93ID0galF1ZXJ5Ll9kYXRhKCBlbGVtLCBcImZ4c2hvd1wiICkgfHwgalF1ZXJ5Ll9kYXRhKCBlbGVtLCBcImZ4c2hvd1wiLCB7fSApO1xuXHRcdGlmICggaGlkZGVuICkge1xuXHRcdFx0alF1ZXJ5KCBlbGVtICkuc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhbmltLmRvbmUoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGpRdWVyeSggZWxlbSApLmhpZGUoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRhbmltLmRvbmUoZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcHJvcDtcblx0XHRcdGpRdWVyeS5yZW1vdmVEYXRhKCBlbGVtLCBcImZ4c2hvd1wiLCB0cnVlICk7XG5cdFx0XHRmb3IgKCBwcm9wIGluIG9yaWcgKSB7XG5cdFx0XHRcdGpRdWVyeS5zdHlsZSggZWxlbSwgcHJvcCwgb3JpZ1sgcHJvcCBdICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Zm9yICggaW5kZXggPSAwIDsgaW5kZXggPCBsZW5ndGggOyBpbmRleCsrICkge1xuXHRcdFx0cHJvcCA9IGhhbmRsZWRbIGluZGV4IF07XG5cdFx0XHR0d2VlbiA9IGFuaW0uY3JlYXRlVHdlZW4oIHByb3AsIGhpZGRlbiA/IGRhdGFTaG93WyBwcm9wIF0gOiAwICk7XG5cdFx0XHRvcmlnWyBwcm9wIF0gPSBkYXRhU2hvd1sgcHJvcCBdIHx8IGpRdWVyeS5zdHlsZSggZWxlbSwgcHJvcCApO1xuXG5cdFx0XHRpZiAoICEoIHByb3AgaW4gZGF0YVNob3cgKSApIHtcblx0XHRcdFx0ZGF0YVNob3dbIHByb3AgXSA9IHR3ZWVuLnN0YXJ0O1xuXHRcdFx0XHRpZiAoIGhpZGRlbiApIHtcblx0XHRcdFx0XHR0d2Vlbi5lbmQgPSB0d2Vlbi5zdGFydDtcblx0XHRcdFx0XHR0d2Vlbi5zdGFydCA9IHByb3AgPT09IFwid2lkdGhcIiB8fCBwcm9wID09PSBcImhlaWdodFwiID8gMSA6IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gVHdlZW4oIGVsZW0sIG9wdGlvbnMsIHByb3AsIGVuZCwgZWFzaW5nICkge1xuXHRyZXR1cm4gbmV3IFR3ZWVuLnByb3RvdHlwZS5pbml0KCBlbGVtLCBvcHRpb25zLCBwcm9wLCBlbmQsIGVhc2luZyApO1xufVxualF1ZXJ5LlR3ZWVuID0gVHdlZW47XG5cblR3ZWVuLnByb3RvdHlwZSA9IHtcblx0Y29uc3RydWN0b3I6IFR3ZWVuLFxuXHRpbml0OiBmdW5jdGlvbiggZWxlbSwgb3B0aW9ucywgcHJvcCwgZW5kLCBlYXNpbmcsIHVuaXQgKSB7XG5cdFx0dGhpcy5lbGVtID0gZWxlbTtcblx0XHR0aGlzLnByb3AgPSBwcm9wO1xuXHRcdHRoaXMuZWFzaW5nID0gZWFzaW5nIHx8IFwic3dpbmdcIjtcblx0XHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXHRcdHRoaXMuc3RhcnQgPSB0aGlzLm5vdyA9IHRoaXMuY3VyKCk7XG5cdFx0dGhpcy5lbmQgPSBlbmQ7XG5cdFx0dGhpcy51bml0ID0gdW5pdCB8fCAoIGpRdWVyeS5jc3NOdW1iZXJbIHByb3AgXSA/IFwiXCIgOiBcInB4XCIgKTtcblx0fSxcblx0Y3VyOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgaG9va3MgPSBUd2Vlbi5wcm9wSG9va3NbIHRoaXMucHJvcCBdO1xuXG5cdFx0cmV0dXJuIGhvb2tzICYmIGhvb2tzLmdldCA/XG5cdFx0XHRob29rcy5nZXQoIHRoaXMgKSA6XG5cdFx0XHRUd2Vlbi5wcm9wSG9va3MuX2RlZmF1bHQuZ2V0KCB0aGlzICk7XG5cdH0sXG5cdHJ1bjogZnVuY3Rpb24oIHBlcmNlbnQgKSB7XG5cdFx0dmFyIGVhc2VkLFxuXHRcdFx0aG9va3MgPSBUd2Vlbi5wcm9wSG9va3NbIHRoaXMucHJvcCBdO1xuXG5cdFx0aWYgKCB0aGlzLm9wdGlvbnMuZHVyYXRpb24gKSB7XG5cdFx0XHR0aGlzLnBvcyA9IGVhc2VkID0galF1ZXJ5LmVhc2luZ1sgdGhpcy5lYXNpbmcgXShcblx0XHRcdFx0cGVyY2VudCwgdGhpcy5vcHRpb25zLmR1cmF0aW9uICogcGVyY2VudCwgMCwgMSwgdGhpcy5vcHRpb25zLmR1cmF0aW9uXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnBvcyA9IGVhc2VkID0gcGVyY2VudDtcblx0XHR9XG5cdFx0dGhpcy5ub3cgPSAoIHRoaXMuZW5kIC0gdGhpcy5zdGFydCApICogZWFzZWQgKyB0aGlzLnN0YXJ0O1xuXG5cdFx0aWYgKCB0aGlzLm9wdGlvbnMuc3RlcCApIHtcblx0XHRcdHRoaXMub3B0aW9ucy5zdGVwLmNhbGwoIHRoaXMuZWxlbSwgdGhpcy5ub3csIHRoaXMgKTtcblx0XHR9XG5cblx0XHRpZiAoIGhvb2tzICYmIGhvb2tzLnNldCApIHtcblx0XHRcdGhvb2tzLnNldCggdGhpcyApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRUd2Vlbi5wcm9wSG9va3MuX2RlZmF1bHQuc2V0KCB0aGlzICk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG59O1xuXG5Ud2Vlbi5wcm90b3R5cGUuaW5pdC5wcm90b3R5cGUgPSBUd2Vlbi5wcm90b3R5cGU7XG5cblR3ZWVuLnByb3BIb29rcyA9IHtcblx0X2RlZmF1bHQ6IHtcblx0XHRnZXQ6IGZ1bmN0aW9uKCB0d2VlbiApIHtcblx0XHRcdHZhciByZXN1bHQ7XG5cblx0XHRcdGlmICggdHdlZW4uZWxlbVsgdHdlZW4ucHJvcCBdICE9IG51bGwgJiZcblx0XHRcdFx0KCF0d2Vlbi5lbGVtLnN0eWxlIHx8IHR3ZWVuLmVsZW0uc3R5bGVbIHR3ZWVuLnByb3AgXSA9PSBudWxsKSApIHtcblx0XHRcdFx0cmV0dXJuIHR3ZWVuLmVsZW1bIHR3ZWVuLnByb3AgXTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gcGFzc2luZyBhbnkgdmFsdWUgYXMgYSA0dGggcGFyYW1ldGVyIHRvIC5jc3Mgd2lsbCBhdXRvbWF0aWNhbGx5XG5cdFx0XHQvLyBhdHRlbXB0IGEgcGFyc2VGbG9hdCBhbmQgZmFsbGJhY2sgdG8gYSBzdHJpbmcgaWYgdGhlIHBhcnNlIGZhaWxzXG5cdFx0XHQvLyBzbywgc2ltcGxlIHZhbHVlcyBzdWNoIGFzIFwiMTBweFwiIGFyZSBwYXJzZWQgdG8gRmxvYXQuXG5cdFx0XHQvLyBjb21wbGV4IHZhbHVlcyBzdWNoIGFzIFwicm90YXRlKDFyYWQpXCIgYXJlIHJldHVybmVkIGFzIGlzLlxuXHRcdFx0cmVzdWx0ID0galF1ZXJ5LmNzcyggdHdlZW4uZWxlbSwgdHdlZW4ucHJvcCwgZmFsc2UsIFwiXCIgKTtcblx0XHRcdC8vIEVtcHR5IHN0cmluZ3MsIG51bGwsIHVuZGVmaW5lZCBhbmQgXCJhdXRvXCIgYXJlIGNvbnZlcnRlZCB0byAwLlxuXHRcdFx0cmV0dXJuICFyZXN1bHQgfHwgcmVzdWx0ID09PSBcImF1dG9cIiA/IDAgOiByZXN1bHQ7XG5cdFx0fSxcblx0XHRzZXQ6IGZ1bmN0aW9uKCB0d2VlbiApIHtcblx0XHRcdC8vIHVzZSBzdGVwIGhvb2sgZm9yIGJhY2sgY29tcGF0IC0gdXNlIGNzc0hvb2sgaWYgaXRzIHRoZXJlIC0gdXNlIC5zdHlsZSBpZiBpdHNcblx0XHRcdC8vIGF2YWlsYWJsZSBhbmQgdXNlIHBsYWluIHByb3BlcnRpZXMgd2hlcmUgYXZhaWxhYmxlXG5cdFx0XHRpZiAoIGpRdWVyeS5meC5zdGVwWyB0d2Vlbi5wcm9wIF0gKSB7XG5cdFx0XHRcdGpRdWVyeS5meC5zdGVwWyB0d2Vlbi5wcm9wIF0oIHR3ZWVuICk7XG5cdFx0XHR9IGVsc2UgaWYgKCB0d2Vlbi5lbGVtLnN0eWxlICYmICggdHdlZW4uZWxlbS5zdHlsZVsgalF1ZXJ5LmNzc1Byb3BzWyB0d2Vlbi5wcm9wIF0gXSAhPSBudWxsIHx8IGpRdWVyeS5jc3NIb29rc1sgdHdlZW4ucHJvcCBdICkgKSB7XG5cdFx0XHRcdGpRdWVyeS5zdHlsZSggdHdlZW4uZWxlbSwgdHdlZW4ucHJvcCwgdHdlZW4ubm93ICsgdHdlZW4udW5pdCApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dHdlZW4uZWxlbVsgdHdlZW4ucHJvcCBdID0gdHdlZW4ubm93O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuLy8gUmVtb3ZlIGluIDIuMCAtIHRoaXMgc3VwcG9ydHMgSUU4J3MgcGFuaWMgYmFzZWQgYXBwcm9hY2hcbi8vIHRvIHNldHRpbmcgdGhpbmdzIG9uIGRpc2Nvbm5lY3RlZCBub2Rlc1xuXG5Ud2Vlbi5wcm9wSG9va3Muc2Nyb2xsVG9wID0gVHdlZW4ucHJvcEhvb2tzLnNjcm9sbExlZnQgPSB7XG5cdHNldDogZnVuY3Rpb24oIHR3ZWVuICkge1xuXHRcdGlmICggdHdlZW4uZWxlbS5ub2RlVHlwZSAmJiB0d2Vlbi5lbGVtLnBhcmVudE5vZGUgKSB7XG5cdFx0XHR0d2Vlbi5lbGVtWyB0d2Vlbi5wcm9wIF0gPSB0d2Vlbi5ub3c7XG5cdFx0fVxuXHR9XG59O1xuXG5qUXVlcnkuZWFjaChbIFwidG9nZ2xlXCIsIFwic2hvd1wiLCBcImhpZGVcIiBdLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblx0dmFyIGNzc0ZuID0galF1ZXJ5LmZuWyBuYW1lIF07XG5cdGpRdWVyeS5mblsgbmFtZSBdID0gZnVuY3Rpb24oIHNwZWVkLCBlYXNpbmcsIGNhbGxiYWNrICkge1xuXHRcdHJldHVybiBzcGVlZCA9PSBudWxsIHx8IHR5cGVvZiBzcGVlZCA9PT0gXCJib29sZWFuXCIgfHxcblx0XHRcdC8vIHNwZWNpYWwgY2hlY2sgZm9yIC50b2dnbGUoIGhhbmRsZXIsIGhhbmRsZXIsIC4uLiApXG5cdFx0XHQoICFpICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCBzcGVlZCApICYmIGpRdWVyeS5pc0Z1bmN0aW9uKCBlYXNpbmcgKSApID9cblx0XHRcdGNzc0ZuLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKSA6XG5cdFx0XHR0aGlzLmFuaW1hdGUoIGdlbkZ4KCBuYW1lLCB0cnVlICksIHNwZWVkLCBlYXNpbmcsIGNhbGxiYWNrICk7XG5cdH07XG59KTtcblxualF1ZXJ5LmZuLmV4dGVuZCh7XG5cdGZhZGVUbzogZnVuY3Rpb24oIHNwZWVkLCB0bywgZWFzaW5nLCBjYWxsYmFjayApIHtcblxuXHRcdC8vIHNob3cgYW55IGhpZGRlbiBlbGVtZW50cyBhZnRlciBzZXR0aW5nIG9wYWNpdHkgdG8gMFxuXHRcdHJldHVybiB0aGlzLmZpbHRlciggaXNIaWRkZW4gKS5jc3MoIFwib3BhY2l0eVwiLCAwICkuc2hvdygpXG5cblx0XHRcdC8vIGFuaW1hdGUgdG8gdGhlIHZhbHVlIHNwZWNpZmllZFxuXHRcdFx0LmVuZCgpLmFuaW1hdGUoeyBvcGFjaXR5OiB0byB9LCBzcGVlZCwgZWFzaW5nLCBjYWxsYmFjayApO1xuXHR9LFxuXHRhbmltYXRlOiBmdW5jdGlvbiggcHJvcCwgc3BlZWQsIGVhc2luZywgY2FsbGJhY2sgKSB7XG5cdFx0dmFyIGVtcHR5ID0galF1ZXJ5LmlzRW1wdHlPYmplY3QoIHByb3AgKSxcblx0XHRcdG9wdGFsbCA9IGpRdWVyeS5zcGVlZCggc3BlZWQsIGVhc2luZywgY2FsbGJhY2sgKSxcblx0XHRcdGRvQW5pbWF0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIE9wZXJhdGUgb24gYSBjb3B5IG9mIHByb3Agc28gcGVyLXByb3BlcnR5IGVhc2luZyB3b24ndCBiZSBsb3N0XG5cdFx0XHRcdHZhciBhbmltID0gQW5pbWF0aW9uKCB0aGlzLCBqUXVlcnkuZXh0ZW5kKCB7fSwgcHJvcCApLCBvcHRhbGwgKTtcblxuXHRcdFx0XHQvLyBFbXB0eSBhbmltYXRpb25zIHJlc29sdmUgaW1tZWRpYXRlbHlcblx0XHRcdFx0aWYgKCBlbXB0eSApIHtcblx0XHRcdFx0XHRhbmltLnN0b3AoIHRydWUgKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdHJldHVybiBlbXB0eSB8fCBvcHRhbGwucXVldWUgPT09IGZhbHNlID9cblx0XHRcdHRoaXMuZWFjaCggZG9BbmltYXRpb24gKSA6XG5cdFx0XHR0aGlzLnF1ZXVlKCBvcHRhbGwucXVldWUsIGRvQW5pbWF0aW9uICk7XG5cdH0sXG5cdHN0b3A6IGZ1bmN0aW9uKCB0eXBlLCBjbGVhclF1ZXVlLCBnb3RvRW5kICkge1xuXHRcdHZhciBzdG9wUXVldWUgPSBmdW5jdGlvbiggaG9va3MgKSB7XG5cdFx0XHR2YXIgc3RvcCA9IGhvb2tzLnN0b3A7XG5cdFx0XHRkZWxldGUgaG9va3Muc3RvcDtcblx0XHRcdHN0b3AoIGdvdG9FbmQgKTtcblx0XHR9O1xuXG5cdFx0aWYgKCB0eXBlb2YgdHlwZSAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdGdvdG9FbmQgPSBjbGVhclF1ZXVlO1xuXHRcdFx0Y2xlYXJRdWV1ZSA9IHR5cGU7XG5cdFx0XHR0eXBlID0gdW5kZWZpbmVkO1xuXHRcdH1cblx0XHRpZiAoIGNsZWFyUXVldWUgJiYgdHlwZSAhPT0gZmFsc2UgKSB7XG5cdFx0XHR0aGlzLnF1ZXVlKCB0eXBlIHx8IFwiZnhcIiwgW10gKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRlcXVldWUgPSB0cnVlLFxuXHRcdFx0XHRpbmRleCA9IHR5cGUgIT0gbnVsbCAmJiB0eXBlICsgXCJxdWV1ZUhvb2tzXCIsXG5cdFx0XHRcdHRpbWVycyA9IGpRdWVyeS50aW1lcnMsXG5cdFx0XHRcdGRhdGEgPSBqUXVlcnkuX2RhdGEoIHRoaXMgKTtcblxuXHRcdFx0aWYgKCBpbmRleCApIHtcblx0XHRcdFx0aWYgKCBkYXRhWyBpbmRleCBdICYmIGRhdGFbIGluZGV4IF0uc3RvcCApIHtcblx0XHRcdFx0XHRzdG9wUXVldWUoIGRhdGFbIGluZGV4IF0gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm9yICggaW5kZXggaW4gZGF0YSApIHtcblx0XHRcdFx0XHRpZiAoIGRhdGFbIGluZGV4IF0gJiYgZGF0YVsgaW5kZXggXS5zdG9wICYmIHJydW4udGVzdCggaW5kZXggKSApIHtcblx0XHRcdFx0XHRcdHN0b3BRdWV1ZSggZGF0YVsgaW5kZXggXSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKCBpbmRleCA9IHRpbWVycy5sZW5ndGg7IGluZGV4LS07ICkge1xuXHRcdFx0XHRpZiAoIHRpbWVyc1sgaW5kZXggXS5lbGVtID09PSB0aGlzICYmICh0eXBlID09IG51bGwgfHwgdGltZXJzWyBpbmRleCBdLnF1ZXVlID09PSB0eXBlKSApIHtcblx0XHRcdFx0XHR0aW1lcnNbIGluZGV4IF0uYW5pbS5zdG9wKCBnb3RvRW5kICk7XG5cdFx0XHRcdFx0ZGVxdWV1ZSA9IGZhbHNlO1xuXHRcdFx0XHRcdHRpbWVycy5zcGxpY2UoIGluZGV4LCAxICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RhcnQgdGhlIG5leHQgaW4gdGhlIHF1ZXVlIGlmIHRoZSBsYXN0IHN0ZXAgd2Fzbid0IGZvcmNlZFxuXHRcdFx0Ly8gdGltZXJzIGN1cnJlbnRseSB3aWxsIGNhbGwgdGhlaXIgY29tcGxldGUgY2FsbGJhY2tzLCB3aGljaCB3aWxsIGRlcXVldWVcblx0XHRcdC8vIGJ1dCBvbmx5IGlmIHRoZXkgd2VyZSBnb3RvRW5kXG5cdFx0XHRpZiAoIGRlcXVldWUgfHwgIWdvdG9FbmQgKSB7XG5cdFx0XHRcdGpRdWVyeS5kZXF1ZXVlKCB0aGlzLCB0eXBlICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG4vLyBHZW5lcmF0ZSBwYXJhbWV0ZXJzIHRvIGNyZWF0ZSBhIHN0YW5kYXJkIGFuaW1hdGlvblxuZnVuY3Rpb24gZ2VuRngoIHR5cGUsIGluY2x1ZGVXaWR0aCApIHtcblx0dmFyIHdoaWNoLFxuXHRcdGF0dHJzID0geyBoZWlnaHQ6IHR5cGUgfSxcblx0XHRpID0gMDtcblxuXHQvLyBpZiB3ZSBpbmNsdWRlIHdpZHRoLCBzdGVwIHZhbHVlIGlzIDEgdG8gZG8gYWxsIGNzc0V4cGFuZCB2YWx1ZXMsXG5cdC8vIGlmIHdlIGRvbid0IGluY2x1ZGUgd2lkdGgsIHN0ZXAgdmFsdWUgaXMgMiB0byBza2lwIG92ZXIgTGVmdCBhbmQgUmlnaHRcblx0aW5jbHVkZVdpZHRoID0gaW5jbHVkZVdpZHRoPyAxIDogMDtcblx0Zm9yKCA7IGkgPCA0IDsgaSArPSAyIC0gaW5jbHVkZVdpZHRoICkge1xuXHRcdHdoaWNoID0gY3NzRXhwYW5kWyBpIF07XG5cdFx0YXR0cnNbIFwibWFyZ2luXCIgKyB3aGljaCBdID0gYXR0cnNbIFwicGFkZGluZ1wiICsgd2hpY2ggXSA9IHR5cGU7XG5cdH1cblxuXHRpZiAoIGluY2x1ZGVXaWR0aCApIHtcblx0XHRhdHRycy5vcGFjaXR5ID0gYXR0cnMud2lkdGggPSB0eXBlO1xuXHR9XG5cblx0cmV0dXJuIGF0dHJzO1xufVxuXG4vLyBHZW5lcmF0ZSBzaG9ydGN1dHMgZm9yIGN1c3RvbSBhbmltYXRpb25zXG5qUXVlcnkuZWFjaCh7XG5cdHNsaWRlRG93bjogZ2VuRngoXCJzaG93XCIpLFxuXHRzbGlkZVVwOiBnZW5GeChcImhpZGVcIiksXG5cdHNsaWRlVG9nZ2xlOiBnZW5GeChcInRvZ2dsZVwiKSxcblx0ZmFkZUluOiB7IG9wYWNpdHk6IFwic2hvd1wiIH0sXG5cdGZhZGVPdXQ6IHsgb3BhY2l0eTogXCJoaWRlXCIgfSxcblx0ZmFkZVRvZ2dsZTogeyBvcGFjaXR5OiBcInRvZ2dsZVwiIH1cbn0sIGZ1bmN0aW9uKCBuYW1lLCBwcm9wcyApIHtcblx0alF1ZXJ5LmZuWyBuYW1lIF0gPSBmdW5jdGlvbiggc3BlZWQsIGVhc2luZywgY2FsbGJhY2sgKSB7XG5cdFx0cmV0dXJuIHRoaXMuYW5pbWF0ZSggcHJvcHMsIHNwZWVkLCBlYXNpbmcsIGNhbGxiYWNrICk7XG5cdH07XG59KTtcblxualF1ZXJ5LnNwZWVkID0gZnVuY3Rpb24oIHNwZWVkLCBlYXNpbmcsIGZuICkge1xuXHR2YXIgb3B0ID0gc3BlZWQgJiYgdHlwZW9mIHNwZWVkID09PSBcIm9iamVjdFwiID8galF1ZXJ5LmV4dGVuZCgge30sIHNwZWVkICkgOiB7XG5cdFx0Y29tcGxldGU6IGZuIHx8ICFmbiAmJiBlYXNpbmcgfHxcblx0XHRcdGpRdWVyeS5pc0Z1bmN0aW9uKCBzcGVlZCApICYmIHNwZWVkLFxuXHRcdGR1cmF0aW9uOiBzcGVlZCxcblx0XHRlYXNpbmc6IGZuICYmIGVhc2luZyB8fCBlYXNpbmcgJiYgIWpRdWVyeS5pc0Z1bmN0aW9uKCBlYXNpbmcgKSAmJiBlYXNpbmdcblx0fTtcblxuXHRvcHQuZHVyYXRpb24gPSBqUXVlcnkuZngub2ZmID8gMCA6IHR5cGVvZiBvcHQuZHVyYXRpb24gPT09IFwibnVtYmVyXCIgPyBvcHQuZHVyYXRpb24gOlxuXHRcdG9wdC5kdXJhdGlvbiBpbiBqUXVlcnkuZnguc3BlZWRzID8galF1ZXJ5LmZ4LnNwZWVkc1sgb3B0LmR1cmF0aW9uIF0gOiBqUXVlcnkuZnguc3BlZWRzLl9kZWZhdWx0O1xuXG5cdC8vIG5vcm1hbGl6ZSBvcHQucXVldWUgLSB0cnVlL3VuZGVmaW5lZC9udWxsIC0+IFwiZnhcIlxuXHRpZiAoIG9wdC5xdWV1ZSA9PSBudWxsIHx8IG9wdC5xdWV1ZSA9PT0gdHJ1ZSApIHtcblx0XHRvcHQucXVldWUgPSBcImZ4XCI7XG5cdH1cblxuXHQvLyBRdWV1ZWluZ1xuXHRvcHQub2xkID0gb3B0LmNvbXBsZXRlO1xuXG5cdG9wdC5jb21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmICggalF1ZXJ5LmlzRnVuY3Rpb24oIG9wdC5vbGQgKSApIHtcblx0XHRcdG9wdC5vbGQuY2FsbCggdGhpcyApO1xuXHRcdH1cblxuXHRcdGlmICggb3B0LnF1ZXVlICkge1xuXHRcdFx0alF1ZXJ5LmRlcXVldWUoIHRoaXMsIG9wdC5xdWV1ZSApO1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4gb3B0O1xufTtcblxualF1ZXJ5LmVhc2luZyA9IHtcblx0bGluZWFyOiBmdW5jdGlvbiggcCApIHtcblx0XHRyZXR1cm4gcDtcblx0fSxcblx0c3dpbmc6IGZ1bmN0aW9uKCBwICkge1xuXHRcdHJldHVybiAwLjUgLSBNYXRoLmNvcyggcCpNYXRoLlBJICkgLyAyO1xuXHR9XG59O1xuXG5qUXVlcnkudGltZXJzID0gW107XG5qUXVlcnkuZnggPSBUd2Vlbi5wcm90b3R5cGUuaW5pdDtcbmpRdWVyeS5meC50aWNrID0gZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lcixcblx0XHR0aW1lcnMgPSBqUXVlcnkudGltZXJzLFxuXHRcdGkgPSAwO1xuXG5cdGZvciAoIDsgaSA8IHRpbWVycy5sZW5ndGg7IGkrKyApIHtcblx0XHR0aW1lciA9IHRpbWVyc1sgaSBdO1xuXHRcdC8vIENoZWNrcyB0aGUgdGltZXIgaGFzIG5vdCBhbHJlYWR5IGJlZW4gcmVtb3ZlZFxuXHRcdGlmICggIXRpbWVyKCkgJiYgdGltZXJzWyBpIF0gPT09IHRpbWVyICkge1xuXHRcdFx0dGltZXJzLnNwbGljZSggaS0tLCAxICk7XG5cdFx0fVxuXHR9XG5cblx0aWYgKCAhdGltZXJzLmxlbmd0aCApIHtcblx0XHRqUXVlcnkuZnguc3RvcCgpO1xuXHR9XG59O1xuXG5qUXVlcnkuZngudGltZXIgPSBmdW5jdGlvbiggdGltZXIgKSB7XG5cdGlmICggdGltZXIoKSAmJiBqUXVlcnkudGltZXJzLnB1c2goIHRpbWVyICkgJiYgIXRpbWVySWQgKSB7XG5cdFx0dGltZXJJZCA9IHNldEludGVydmFsKCBqUXVlcnkuZngudGljaywgalF1ZXJ5LmZ4LmludGVydmFsICk7XG5cdH1cbn07XG5cbmpRdWVyeS5meC5pbnRlcnZhbCA9IDEzO1xuXG5qUXVlcnkuZnguc3RvcCA9IGZ1bmN0aW9uKCkge1xuXHRjbGVhckludGVydmFsKCB0aW1lcklkICk7XG5cdHRpbWVySWQgPSBudWxsO1xufTtcblxualF1ZXJ5LmZ4LnNwZWVkcyA9IHtcblx0c2xvdzogNjAwLFxuXHRmYXN0OiAyMDAsXG5cdC8vIERlZmF1bHQgc3BlZWRcblx0X2RlZmF1bHQ6IDQwMFxufTtcblxuLy8gQmFjayBDb21wYXQgPDEuOCBleHRlbnNpb24gcG9pbnRcbmpRdWVyeS5meC5zdGVwID0ge307XG5cbmlmICggalF1ZXJ5LmV4cHIgJiYgalF1ZXJ5LmV4cHIuZmlsdGVycyApIHtcblx0alF1ZXJ5LmV4cHIuZmlsdGVycy5hbmltYXRlZCA9IGZ1bmN0aW9uKCBlbGVtICkge1xuXHRcdHJldHVybiBqUXVlcnkuZ3JlcChqUXVlcnkudGltZXJzLCBmdW5jdGlvbiggZm4gKSB7XG5cdFx0XHRyZXR1cm4gZWxlbSA9PT0gZm4uZWxlbTtcblx0XHR9KS5sZW5ndGg7XG5cdH07XG59XG52YXIgcnJvb3QgPSAvXig/OmJvZHl8aHRtbCkkL2k7XG5cbmpRdWVyeS5mbi5vZmZzZXQgPSBmdW5jdGlvbiggb3B0aW9ucyApIHtcblx0aWYgKCBhcmd1bWVudHMubGVuZ3RoICkge1xuXHRcdHJldHVybiBvcHRpb25zID09PSB1bmRlZmluZWQgP1xuXHRcdFx0dGhpcyA6XG5cdFx0XHR0aGlzLmVhY2goZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdGpRdWVyeS5vZmZzZXQuc2V0T2Zmc2V0KCB0aGlzLCBvcHRpb25zLCBpICk7XG5cdFx0XHR9KTtcblx0fVxuXG5cdHZhciBib3gsIGRvY0VsZW0sIGJvZHksIHdpbiwgY2xpZW50VG9wLCBjbGllbnRMZWZ0LCBzY3JvbGxUb3AsIHNjcm9sbExlZnQsIHRvcCwgbGVmdCxcblx0XHRlbGVtID0gdGhpc1sgMCBdLFxuXHRcdGRvYyA9IGVsZW0gJiYgZWxlbS5vd25lckRvY3VtZW50O1xuXG5cdGlmICggIWRvYyApIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoIChib2R5ID0gZG9jLmJvZHkpID09PSBlbGVtICkge1xuXHRcdHJldHVybiBqUXVlcnkub2Zmc2V0LmJvZHlPZmZzZXQoIGVsZW0gKTtcblx0fVxuXG5cdGRvY0VsZW0gPSBkb2MuZG9jdW1lbnRFbGVtZW50O1xuXG5cdC8vIE1ha2Ugc3VyZSB3ZSdyZSBub3QgZGVhbGluZyB3aXRoIGEgZGlzY29ubmVjdGVkIERPTSBub2RlXG5cdGlmICggIWpRdWVyeS5jb250YWlucyggZG9jRWxlbSwgZWxlbSApICkge1xuXHRcdHJldHVybiB7IHRvcDogMCwgbGVmdDogMCB9O1xuXHR9XG5cblx0Ym94ID0gZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblx0d2luID0gZ2V0V2luZG93KCBkb2MgKTtcblx0Y2xpZW50VG9wICA9IGRvY0VsZW0uY2xpZW50VG9wICB8fCBib2R5LmNsaWVudFRvcCAgfHwgMDtcblx0Y2xpZW50TGVmdCA9IGRvY0VsZW0uY2xpZW50TGVmdCB8fCBib2R5LmNsaWVudExlZnQgfHwgMDtcblx0c2Nyb2xsVG9wICA9IHdpbi5wYWdlWU9mZnNldCB8fCBkb2NFbGVtLnNjcm9sbFRvcDtcblx0c2Nyb2xsTGVmdCA9IHdpbi5wYWdlWE9mZnNldCB8fCBkb2NFbGVtLnNjcm9sbExlZnQ7XG5cdHRvcCAgPSBib3gudG9wICArIHNjcm9sbFRvcCAgLSBjbGllbnRUb3A7XG5cdGxlZnQgPSBib3gubGVmdCArIHNjcm9sbExlZnQgLSBjbGllbnRMZWZ0O1xuXG5cdHJldHVybiB7IHRvcDogdG9wLCBsZWZ0OiBsZWZ0IH07XG59O1xuXG5qUXVlcnkub2Zmc2V0ID0ge1xuXG5cdGJvZHlPZmZzZXQ6IGZ1bmN0aW9uKCBib2R5ICkge1xuXHRcdHZhciB0b3AgPSBib2R5Lm9mZnNldFRvcCxcblx0XHRcdGxlZnQgPSBib2R5Lm9mZnNldExlZnQ7XG5cblx0XHRpZiAoIGpRdWVyeS5zdXBwb3J0LmRvZXNOb3RJbmNsdWRlTWFyZ2luSW5Cb2R5T2Zmc2V0ICkge1xuXHRcdFx0dG9wICArPSBwYXJzZUZsb2F0KCBqUXVlcnkuY3NzKGJvZHksIFwibWFyZ2luVG9wXCIpICkgfHwgMDtcblx0XHRcdGxlZnQgKz0gcGFyc2VGbG9hdCggalF1ZXJ5LmNzcyhib2R5LCBcIm1hcmdpbkxlZnRcIikgKSB8fCAwO1xuXHRcdH1cblxuXHRcdHJldHVybiB7IHRvcDogdG9wLCBsZWZ0OiBsZWZ0IH07XG5cdH0sXG5cblx0c2V0T2Zmc2V0OiBmdW5jdGlvbiggZWxlbSwgb3B0aW9ucywgaSApIHtcblx0XHR2YXIgcG9zaXRpb24gPSBqUXVlcnkuY3NzKCBlbGVtLCBcInBvc2l0aW9uXCIgKTtcblxuXHRcdC8vIHNldCBwb3NpdGlvbiBmaXJzdCwgaW4tY2FzZSB0b3AvbGVmdCBhcmUgc2V0IGV2ZW4gb24gc3RhdGljIGVsZW1cblx0XHRpZiAoIHBvc2l0aW9uID09PSBcInN0YXRpY1wiICkge1xuXHRcdFx0ZWxlbS5zdHlsZS5wb3NpdGlvbiA9IFwicmVsYXRpdmVcIjtcblx0XHR9XG5cblx0XHR2YXIgY3VyRWxlbSA9IGpRdWVyeSggZWxlbSApLFxuXHRcdFx0Y3VyT2Zmc2V0ID0gY3VyRWxlbS5vZmZzZXQoKSxcblx0XHRcdGN1ckNTU1RvcCA9IGpRdWVyeS5jc3MoIGVsZW0sIFwidG9wXCIgKSxcblx0XHRcdGN1ckNTU0xlZnQgPSBqUXVlcnkuY3NzKCBlbGVtLCBcImxlZnRcIiApLFxuXHRcdFx0Y2FsY3VsYXRlUG9zaXRpb24gPSAoIHBvc2l0aW9uID09PSBcImFic29sdXRlXCIgfHwgcG9zaXRpb24gPT09IFwiZml4ZWRcIiApICYmIGpRdWVyeS5pbkFycmF5KFwiYXV0b1wiLCBbY3VyQ1NTVG9wLCBjdXJDU1NMZWZ0XSkgPiAtMSxcblx0XHRcdHByb3BzID0ge30sIGN1clBvc2l0aW9uID0ge30sIGN1clRvcCwgY3VyTGVmdDtcblxuXHRcdC8vIG5lZWQgdG8gYmUgYWJsZSB0byBjYWxjdWxhdGUgcG9zaXRpb24gaWYgZWl0aGVyIHRvcCBvciBsZWZ0IGlzIGF1dG8gYW5kIHBvc2l0aW9uIGlzIGVpdGhlciBhYnNvbHV0ZSBvciBmaXhlZFxuXHRcdGlmICggY2FsY3VsYXRlUG9zaXRpb24gKSB7XG5cdFx0XHRjdXJQb3NpdGlvbiA9IGN1ckVsZW0ucG9zaXRpb24oKTtcblx0XHRcdGN1clRvcCA9IGN1clBvc2l0aW9uLnRvcDtcblx0XHRcdGN1ckxlZnQgPSBjdXJQb3NpdGlvbi5sZWZ0O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXJUb3AgPSBwYXJzZUZsb2F0KCBjdXJDU1NUb3AgKSB8fCAwO1xuXHRcdFx0Y3VyTGVmdCA9IHBhcnNlRmxvYXQoIGN1ckNTU0xlZnQgKSB8fCAwO1xuXHRcdH1cblxuXHRcdGlmICggalF1ZXJ5LmlzRnVuY3Rpb24oIG9wdGlvbnMgKSApIHtcblx0XHRcdG9wdGlvbnMgPSBvcHRpb25zLmNhbGwoIGVsZW0sIGksIGN1ck9mZnNldCApO1xuXHRcdH1cblxuXHRcdGlmICggb3B0aW9ucy50b3AgIT0gbnVsbCApIHtcblx0XHRcdHByb3BzLnRvcCA9ICggb3B0aW9ucy50b3AgLSBjdXJPZmZzZXQudG9wICkgKyBjdXJUb3A7XG5cdFx0fVxuXHRcdGlmICggb3B0aW9ucy5sZWZ0ICE9IG51bGwgKSB7XG5cdFx0XHRwcm9wcy5sZWZ0ID0gKCBvcHRpb25zLmxlZnQgLSBjdXJPZmZzZXQubGVmdCApICsgY3VyTGVmdDtcblx0XHR9XG5cblx0XHRpZiAoIFwidXNpbmdcIiBpbiBvcHRpb25zICkge1xuXHRcdFx0b3B0aW9ucy51c2luZy5jYWxsKCBlbGVtLCBwcm9wcyApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXJFbGVtLmNzcyggcHJvcHMgKTtcblx0XHR9XG5cdH1cbn07XG5cblxualF1ZXJ5LmZuLmV4dGVuZCh7XG5cblx0cG9zaXRpb246IGZ1bmN0aW9uKCkge1xuXHRcdGlmICggIXRoaXNbMF0gKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIGVsZW0gPSB0aGlzWzBdLFxuXG5cdFx0Ly8gR2V0ICpyZWFsKiBvZmZzZXRQYXJlbnRcblx0XHRvZmZzZXRQYXJlbnQgPSB0aGlzLm9mZnNldFBhcmVudCgpLFxuXG5cdFx0Ly8gR2V0IGNvcnJlY3Qgb2Zmc2V0c1xuXHRcdG9mZnNldCAgICAgICA9IHRoaXMub2Zmc2V0KCksXG5cdFx0cGFyZW50T2Zmc2V0ID0gcnJvb3QudGVzdChvZmZzZXRQYXJlbnRbMF0ubm9kZU5hbWUpID8geyB0b3A6IDAsIGxlZnQ6IDAgfSA6IG9mZnNldFBhcmVudC5vZmZzZXQoKTtcblxuXHRcdC8vIFN1YnRyYWN0IGVsZW1lbnQgbWFyZ2luc1xuXHRcdC8vIG5vdGU6IHdoZW4gYW4gZWxlbWVudCBoYXMgbWFyZ2luOiBhdXRvIHRoZSBvZmZzZXRMZWZ0IGFuZCBtYXJnaW5MZWZ0XG5cdFx0Ly8gYXJlIHRoZSBzYW1lIGluIFNhZmFyaSBjYXVzaW5nIG9mZnNldC5sZWZ0IHRvIGluY29ycmVjdGx5IGJlIDBcblx0XHRvZmZzZXQudG9wICAtPSBwYXJzZUZsb2F0KCBqUXVlcnkuY3NzKGVsZW0sIFwibWFyZ2luVG9wXCIpICkgfHwgMDtcblx0XHRvZmZzZXQubGVmdCAtPSBwYXJzZUZsb2F0KCBqUXVlcnkuY3NzKGVsZW0sIFwibWFyZ2luTGVmdFwiKSApIHx8IDA7XG5cblx0XHQvLyBBZGQgb2Zmc2V0UGFyZW50IGJvcmRlcnNcblx0XHRwYXJlbnRPZmZzZXQudG9wICArPSBwYXJzZUZsb2F0KCBqUXVlcnkuY3NzKG9mZnNldFBhcmVudFswXSwgXCJib3JkZXJUb3BXaWR0aFwiKSApIHx8IDA7XG5cdFx0cGFyZW50T2Zmc2V0LmxlZnQgKz0gcGFyc2VGbG9hdCggalF1ZXJ5LmNzcyhvZmZzZXRQYXJlbnRbMF0sIFwiYm9yZGVyTGVmdFdpZHRoXCIpICkgfHwgMDtcblxuXHRcdC8vIFN1YnRyYWN0IHRoZSB0d28gb2Zmc2V0c1xuXHRcdHJldHVybiB7XG5cdFx0XHR0b3A6ICBvZmZzZXQudG9wICAtIHBhcmVudE9mZnNldC50b3AsXG5cdFx0XHRsZWZ0OiBvZmZzZXQubGVmdCAtIHBhcmVudE9mZnNldC5sZWZ0XG5cdFx0fTtcblx0fSxcblxuXHRvZmZzZXRQYXJlbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLm1hcChmdW5jdGlvbigpIHtcblx0XHRcdHZhciBvZmZzZXRQYXJlbnQgPSB0aGlzLm9mZnNldFBhcmVudCB8fCBkb2N1bWVudC5ib2R5O1xuXHRcdFx0d2hpbGUgKCBvZmZzZXRQYXJlbnQgJiYgKCFycm9vdC50ZXN0KG9mZnNldFBhcmVudC5ub2RlTmFtZSkgJiYgalF1ZXJ5LmNzcyhvZmZzZXRQYXJlbnQsIFwicG9zaXRpb25cIikgPT09IFwic3RhdGljXCIpICkge1xuXHRcdFx0XHRvZmZzZXRQYXJlbnQgPSBvZmZzZXRQYXJlbnQub2Zmc2V0UGFyZW50O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG9mZnNldFBhcmVudCB8fCBkb2N1bWVudC5ib2R5O1xuXHRcdH0pO1xuXHR9XG59KTtcblxuXG4vLyBDcmVhdGUgc2Nyb2xsTGVmdCBhbmQgc2Nyb2xsVG9wIG1ldGhvZHNcbmpRdWVyeS5lYWNoKCB7c2Nyb2xsTGVmdDogXCJwYWdlWE9mZnNldFwiLCBzY3JvbGxUb3A6IFwicGFnZVlPZmZzZXRcIn0sIGZ1bmN0aW9uKCBtZXRob2QsIHByb3AgKSB7XG5cdHZhciB0b3AgPSAvWS8udGVzdCggcHJvcCApO1xuXG5cdGpRdWVyeS5mblsgbWV0aG9kIF0gPSBmdW5jdGlvbiggdmFsICkge1xuXHRcdHJldHVybiBqUXVlcnkuYWNjZXNzKCB0aGlzLCBmdW5jdGlvbiggZWxlbSwgbWV0aG9kLCB2YWwgKSB7XG5cdFx0XHR2YXIgd2luID0gZ2V0V2luZG93KCBlbGVtICk7XG5cblx0XHRcdGlmICggdmFsID09PSB1bmRlZmluZWQgKSB7XG5cdFx0XHRcdHJldHVybiB3aW4gPyAocHJvcCBpbiB3aW4pID8gd2luWyBwcm9wIF0gOlxuXHRcdFx0XHRcdHdpbi5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnRbIG1ldGhvZCBdIDpcblx0XHRcdFx0XHRlbGVtWyBtZXRob2QgXTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCB3aW4gKSB7XG5cdFx0XHRcdHdpbi5zY3JvbGxUbyhcblx0XHRcdFx0XHQhdG9wID8gdmFsIDogalF1ZXJ5KCB3aW4gKS5zY3JvbGxMZWZ0KCksXG5cdFx0XHRcdFx0IHRvcCA/IHZhbCA6IGpRdWVyeSggd2luICkuc2Nyb2xsVG9wKClcblx0XHRcdFx0KTtcblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWxlbVsgbWV0aG9kIF0gPSB2YWw7XG5cdFx0XHR9XG5cdFx0fSwgbWV0aG9kLCB2YWwsIGFyZ3VtZW50cy5sZW5ndGgsIG51bGwgKTtcblx0fTtcbn0pO1xuXG5mdW5jdGlvbiBnZXRXaW5kb3coIGVsZW0gKSB7XG5cdHJldHVybiBqUXVlcnkuaXNXaW5kb3coIGVsZW0gKSA/XG5cdFx0ZWxlbSA6XG5cdFx0ZWxlbS5ub2RlVHlwZSA9PT0gOSA/XG5cdFx0XHRlbGVtLmRlZmF1bHRWaWV3IHx8IGVsZW0ucGFyZW50V2luZG93IDpcblx0XHRcdGZhbHNlO1xufVxuLy8gQ3JlYXRlIGlubmVySGVpZ2h0LCBpbm5lcldpZHRoLCBoZWlnaHQsIHdpZHRoLCBvdXRlckhlaWdodCBhbmQgb3V0ZXJXaWR0aCBtZXRob2RzXG5qUXVlcnkuZWFjaCggeyBIZWlnaHQ6IFwiaGVpZ2h0XCIsIFdpZHRoOiBcIndpZHRoXCIgfSwgZnVuY3Rpb24oIG5hbWUsIHR5cGUgKSB7XG5cdGpRdWVyeS5lYWNoKCB7IHBhZGRpbmc6IFwiaW5uZXJcIiArIG5hbWUsIGNvbnRlbnQ6IHR5cGUsIFwiXCI6IFwib3V0ZXJcIiArIG5hbWUgfSwgZnVuY3Rpb24oIGRlZmF1bHRFeHRyYSwgZnVuY05hbWUgKSB7XG5cdFx0Ly8gbWFyZ2luIGlzIG9ubHkgZm9yIG91dGVySGVpZ2h0LCBvdXRlcldpZHRoXG5cdFx0alF1ZXJ5LmZuWyBmdW5jTmFtZSBdID0gZnVuY3Rpb24oIG1hcmdpbiwgdmFsdWUgKSB7XG5cdFx0XHR2YXIgY2hhaW5hYmxlID0gYXJndW1lbnRzLmxlbmd0aCAmJiAoIGRlZmF1bHRFeHRyYSB8fCB0eXBlb2YgbWFyZ2luICE9PSBcImJvb2xlYW5cIiApLFxuXHRcdFx0XHRleHRyYSA9IGRlZmF1bHRFeHRyYSB8fCAoIG1hcmdpbiA9PT0gdHJ1ZSB8fCB2YWx1ZSA9PT0gdHJ1ZSA/IFwibWFyZ2luXCIgOiBcImJvcmRlclwiICk7XG5cblx0XHRcdHJldHVybiBqUXVlcnkuYWNjZXNzKCB0aGlzLCBmdW5jdGlvbiggZWxlbSwgdHlwZSwgdmFsdWUgKSB7XG5cdFx0XHRcdHZhciBkb2M7XG5cblx0XHRcdFx0aWYgKCBqUXVlcnkuaXNXaW5kb3coIGVsZW0gKSApIHtcblx0XHRcdFx0XHQvLyBBcyBvZiA1LzgvMjAxMiB0aGlzIHdpbGwgeWllbGQgaW5jb3JyZWN0IHJlc3VsdHMgZm9yIE1vYmlsZSBTYWZhcmksIGJ1dCB0aGVyZVxuXHRcdFx0XHRcdC8vIGlzbid0IGEgd2hvbGUgbG90IHdlIGNhbiBkby4gU2VlIHB1bGwgcmVxdWVzdCBhdCB0aGlzIFVSTCBmb3IgZGlzY3Vzc2lvbjpcblx0XHRcdFx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vanF1ZXJ5L2pxdWVyeS9wdWxsLzc2NFxuXHRcdFx0XHRcdHJldHVybiBlbGVtLmRvY3VtZW50LmRvY3VtZW50RWxlbWVudFsgXCJjbGllbnRcIiArIG5hbWUgXTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIEdldCBkb2N1bWVudCB3aWR0aCBvciBoZWlnaHRcblx0XHRcdFx0aWYgKCBlbGVtLm5vZGVUeXBlID09PSA5ICkge1xuXHRcdFx0XHRcdGRvYyA9IGVsZW0uZG9jdW1lbnRFbGVtZW50O1xuXG5cdFx0XHRcdFx0Ly8gRWl0aGVyIHNjcm9sbFtXaWR0aC9IZWlnaHRdIG9yIG9mZnNldFtXaWR0aC9IZWlnaHRdIG9yIGNsaWVudFtXaWR0aC9IZWlnaHRdLCB3aGljaGV2ZXIgaXMgZ3JlYXRlc3Rcblx0XHRcdFx0XHQvLyB1bmZvcnR1bmF0ZWx5LCB0aGlzIGNhdXNlcyBidWcgIzM4MzggaW4gSUU2Lzggb25seSwgYnV0IHRoZXJlIGlzIGN1cnJlbnRseSBubyBnb29kLCBzbWFsbCB3YXkgdG8gZml4IGl0LlxuXHRcdFx0XHRcdHJldHVybiBNYXRoLm1heChcblx0XHRcdFx0XHRcdGVsZW0uYm9keVsgXCJzY3JvbGxcIiArIG5hbWUgXSwgZG9jWyBcInNjcm9sbFwiICsgbmFtZSBdLFxuXHRcdFx0XHRcdFx0ZWxlbS5ib2R5WyBcIm9mZnNldFwiICsgbmFtZSBdLCBkb2NbIFwib2Zmc2V0XCIgKyBuYW1lIF0sXG5cdFx0XHRcdFx0XHRkb2NbIFwiY2xpZW50XCIgKyBuYW1lIF1cblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHZhbHVlID09PSB1bmRlZmluZWQgP1xuXHRcdFx0XHRcdC8vIEdldCB3aWR0aCBvciBoZWlnaHQgb24gdGhlIGVsZW1lbnQsIHJlcXVlc3RpbmcgYnV0IG5vdCBmb3JjaW5nIHBhcnNlRmxvYXRcblx0XHRcdFx0XHRqUXVlcnkuY3NzKCBlbGVtLCB0eXBlLCB2YWx1ZSwgZXh0cmEgKSA6XG5cblx0XHRcdFx0XHQvLyBTZXQgd2lkdGggb3IgaGVpZ2h0IG9uIHRoZSBlbGVtZW50XG5cdFx0XHRcdFx0alF1ZXJ5LnN0eWxlKCBlbGVtLCB0eXBlLCB2YWx1ZSwgZXh0cmEgKTtcblx0XHRcdH0sIHR5cGUsIGNoYWluYWJsZSA/IG1hcmdpbiA6IHVuZGVmaW5lZCwgY2hhaW5hYmxlLCBudWxsICk7XG5cdFx0fTtcblx0fSk7XG59KTtcbi8vIEV4cG9zZSBqUXVlcnkgdG8gdGhlIGdsb2JhbCBvYmplY3RcbndpbmRvdy5qUXVlcnkgPSB3aW5kb3cuJCA9IGpRdWVyeTtcblxuLy8gRXhwb3NlIGpRdWVyeSBhcyBhbiBBTUQgbW9kdWxlLCBidXQgb25seSBmb3IgQU1EIGxvYWRlcnMgdGhhdFxuLy8gdW5kZXJzdGFuZCB0aGUgaXNzdWVzIHdpdGggbG9hZGluZyBtdWx0aXBsZSB2ZXJzaW9ucyBvZiBqUXVlcnlcbi8vIGluIGEgcGFnZSB0aGF0IGFsbCBtaWdodCBjYWxsIGRlZmluZSgpLiBUaGUgbG9hZGVyIHdpbGwgaW5kaWNhdGVcbi8vIHRoZXkgaGF2ZSBzcGVjaWFsIGFsbG93YW5jZXMgZm9yIG11bHRpcGxlIGpRdWVyeSB2ZXJzaW9ucyBieVxuLy8gc3BlY2lmeWluZyBkZWZpbmUuYW1kLmpRdWVyeSA9IHRydWUuIFJlZ2lzdGVyIGFzIGEgbmFtZWQgbW9kdWxlLFxuLy8gc2luY2UgalF1ZXJ5IGNhbiBiZSBjb25jYXRlbmF0ZWQgd2l0aCBvdGhlciBmaWxlcyB0aGF0IG1heSB1c2UgZGVmaW5lLFxuLy8gYnV0IG5vdCB1c2UgYSBwcm9wZXIgY29uY2F0ZW5hdGlvbiBzY3JpcHQgdGhhdCB1bmRlcnN0YW5kcyBhbm9ueW1vdXNcbi8vIEFNRCBtb2R1bGVzLiBBIG5hbWVkIEFNRCBpcyBzYWZlc3QgYW5kIG1vc3Qgcm9idXN0IHdheSB0byByZWdpc3Rlci5cbi8vIExvd2VyY2FzZSBqcXVlcnkgaXMgdXNlZCBiZWNhdXNlIEFNRCBtb2R1bGUgbmFtZXMgYXJlIGRlcml2ZWQgZnJvbVxuLy8gZmlsZSBuYW1lcywgYW5kIGpRdWVyeSBpcyBub3JtYWxseSBkZWxpdmVyZWQgaW4gYSBsb3dlcmNhc2UgZmlsZSBuYW1lLlxuLy8gRG8gdGhpcyBhZnRlciBjcmVhdGluZyB0aGUgZ2xvYmFsIHNvIHRoYXQgaWYgYW4gQU1EIG1vZHVsZSB3YW50cyB0byBjYWxsXG4vLyBub0NvbmZsaWN0IHRvIGhpZGUgdGhpcyB2ZXJzaW9uIG9mIGpRdWVyeSwgaXQgd2lsbCB3b3JrLlxuaWYgKCB0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCAmJiBkZWZpbmUuYW1kLmpRdWVyeSApIHtcblx0ZGVmaW5lKCBcImpxdWVyeVwiLCBbXSwgZnVuY3Rpb24gKCkgeyByZXR1cm4galF1ZXJ5OyB9ICk7XG59XG5cbnJldHVybiBqUXVlcnk7XG5cbn0pKCB3aW5kb3cgKTsgfSkpO1xuIiwiXG4vLyBub3QgaW1wbGVtZW50ZWRcbi8vIFRoZSByZWFzb24gZm9yIGhhdmluZyBhbiBlbXB0eSBmaWxlIGFuZCBub3QgdGhyb3dpbmcgaXMgdG8gYWxsb3dcbi8vIHVudHJhZGl0aW9uYWwgaW1wbGVtZW50YXRpb24gb2YgdGhpcyBtb2R1bGUuXG4iXX0=
;
