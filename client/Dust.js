var $ = require('jquery-browserify'),
    Vector = require('./Vector'),
    AABB = require('./AABB'),
    Solid = require('./Solid'),
    fs = require('fs'),
    vertShader = fs.readFileSync(__dirname + '/vert.glsl'),
    fragShader = fs.readFileSync(__dirname + '/frag.glsl');

module.exports = Dust;

var SAND = 1,
    OIL = 2,
    FIRE = 3,
    WATER = 4;

function Dust() {
    var self = this;

    this.socket = io.connect('http://192.168.1.77:9966');

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
            color: [9, 7, 2, 1.0],
            friction: 0.99
        },
        oil: {
            color: [5, 4, 1, 1.0],
            friction: 1
        },
        fire: {
            color: [10, 5, 0, 1.0],
            friction: 1
        },
        water: {
            color: [0, 5, 10, 1.0],
            friction: 1
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

        var down = new Vector(0, 1),
            left = new Vector(-1, 1),
            right = new Vector(1, 1);

        if(this.grid[sand.x][sand.y + down.y] === 0) { 
            sand.add(down);

            if(!this.sandCollides(sand)) {
                this.grid[sand.x + down.reverse().x][sand.y + down.reverse().y] = 0;

                this.grid[sand.x][sand.y] = sand.type;
            } else {
                sand.add(down.reverse());
            }
        } else if(this.grid[sand.x + left.x][sand.y + left.y] === 0) {
            if(Math.random() > sand.friction) {
                sand.resting = true;
            }

            if(!sand.resting) {
                sand.add(left);

                if(!this.sandCollides(sand)) {
                    this.grid[sand.x + left.reverse().x][sand.y + left.reverse().y] = 0;

                    this.grid[sand.x][sand.y] = sand.type;
                } else {
                    sand.add(left.reverse());
                }
            }
        } else if(this.grid[sand.x + right.x][sand.y + right.y] === 0) {
            if(Math.random() > sand.friction) {
                sand.resting = true;
            }

            if(!sand.resting) {
                sand.add(right);

                if(!this.sandCollides(sand)) {
                    this.grid[sand.x + right.reverse().x][sand.y + right.reverse().y] = 0;
                    this.grid[sand.x][sand.y] = sand.type;
                } else {
                    sand.add(right.reverse());
                }
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
            case SAND:
                material = this.materials.sand;
                break;
            case OIL:
                material = this.materials.oil;
                break;
            case FIRE:
                material = this.materials.fire;
                break;
            case WATER:
                material = this.materials.water;
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
        } else if(this.grid[s.x][s.y] !== 0) {
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
        
        s.resting = false;
        s.type = this.getType(type);
        
        switch(s.type) {
            case 1:
                s.friction = this.materials.sand.friction;
                break;
            case 2:
                s.friction = this.materials.oil.friction;
                break;
            case 3:
                s.friction = this.materials.fire.friction;
                break;
            default:
                break;
        }

        if(!this.sandCollides(s)) {
            this.sands.push(s);
        }
    }
};

// Returns numerical code for material type
Dust.prototype.getType = function(typeString) {
    switch(typeString) {
        case 'sand':
            return SAND;
        case 'oil':
            return OIL;
        case 'fire':
            return FIRE;
        case 'water':
            return WATER;
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
