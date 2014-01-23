var $ = require('jquery-browserify'),
    Vector = require('./Vector'),
    AABB = require('./AABB'),
    fs = require('fs'),
    vertShader = fs.readFileSync(__dirname + '/vert.glsl'),
    fragShader = fs.readFileSync(__dirname + '/frag.glsl');

module.exports = Dust;

var SAND = 1,
    OIL = 2,
    FIRE = 4,
    WATER = 8,
    STEAM = 16,
    SOLID = 32,
    RESTING = 64,
    BURNING = 128;

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
    
    this.modelViewProjectionMatrix = null;
    this.setUniforms();

    this.sandVertexArray = new Float32Array(this.MAX_DUST * 3 * 6);
    this.dustBuffer = this.gl.createBuffer();
    
    this.positionAttribute = this.gl.getAttribLocation(this.shaderProgram, "position");
    this.colorAttribute = this.gl.getAttribLocation(this.shaderProgram, "aColor");

    this.gl.enableVertexAttribArray(this.positionAttribute);
    this.gl.enableVertexAttribArray(this.colorAttribute);
    
    this.setSandBuffers();
    this.loadIdentity();
    this.mvpMatrix = matrixMultiply(this.modelViewMatrix, this.projectionMatrix);
    this.gl.uniformMatrix3fv(this.uModelViewProjectionMatrix, false, this.mvpMatrix);
    
    this.gl.vertexAttribPointer(this.positionAttribute, 2, this.gl.FLOAT, false, 12, 0);
    this.gl.vertexAttribPointer(this.colorAttribute, 1, this.gl.FLOAT, false, 12, 8);

    this.grid = new Array2D(this.WIDTH, this.HEIGHT);
    this.blacklist = new Array2D(this.WIDTH, this.HEIGHT);
    this.dustCount = 0;

    this.materials = {
        sand: {
            color: [9, 7, 2],
            friction: 0.99,
            density: 10
        },
        oil: {
            color: [5, 4, 1],
            friction: 1,
            density: 5
        },
        fire: {
            color: [10, 5, 0],
            friction: 1,
            desity: 0
        },
        water: {
            color: [0, 5, 10],
            friction: 1,
            density: 6
        },
        steam: {
            color: [4, 4, 4],
            density: -1
        },
        solid: {
            color: [0, 0, 0]
        },
        space: {
            density: 0
        }
    };

    this.selectionBox = null;

    this.spawnRect(250, 200, 200, 20);

    // Walls

    var width = 1;
    this.spawnRect(0, 0, this.WIDTH, width);
    this.spawnRect(0, 0, width, this.HEIGHT);
    this.spawnRect(0, this.HEIGHT - width, this.WIDTH, width);
    this.spawnRect(this.WIDTH - width, 0, width, this.HEIGHT);
}

Dust.prototype.getGL = function() {
    htmlCanvas = "<canvas width=" + "\"" + this.WIDTH + "\"" + "height=" + "\"" + this.HEIGHT + "\"" + "></canvas>";

    $('#canvainer').append(htmlCanvas);

    return $('canvas').get(0).getContext('webgl');
};

Dust.prototype.update = function(dt) {
    for (var x = 1; x < this.grid.length - 1; x++) {
        var ry = Math.floor(Math.random() * 500)  % (this.grid.length -1),
            yIncrement = 2;

        for (var y = this.grid[x].length - 1; y > 1; y--) {
            ry = (ry + yIncrement) % (this.grid.length - 1);
            
            var d = this.grid[x][ry],
                m = this.getMaterial(d),
                xDir = Math.round(Math.random()) < 0.5 ? 1 : -1;

            
            if(d === 0) continue;

            if(d & SOLID) continue;
            
            if(this.blacklist[x][ry]) continue;
            
            if(d & FIRE) {
                if(Math.random() > 0.8) this.grid[x][ry] |= BURNING;
            }
            
            if(d & BURNING && Math.random() > 0.8) this.destroy(x, ry);

            // Chance that steam will condense
            if(d & STEAM && Math.random() > 0.9999) {
                this.grid[x][ry] |= WATER;
                this.grid[x][ry] ^= STEAM;
            }

            // Burn baby burn
            if(d & FIRE || d & BURNING) {
                if(Math.random() > 0.5) {
                    this.infect(x, ry, OIL, BURNING);
                    this.infect(x, ry, WATER, STEAM, WATER);
                }
            }

            // Water baby... errr.... Water?
            if(d & WATER) {
                // Put out fires
                //this.runOnSurrounds(x, ry, FIRE, this.destroy);
                //this.infect(x, ry, BURNING, BURNING);
            }


            if(m.density < this.getMaterial(this.grid[x][ry - 1]).density) {
                if(Math.random() < 0.7) this.swap(x, ry, x, ry - 1);
            }

            if(d & RESTING) continue;

            if(this.grid[x][ry + 1] === 0) {
                this.move(x, ry, x, ry + 1);
            } else if(this.grid[x + xDir][ry + 1] === 0) {
                this.move(x, ry, x + xDir, ry + 1);
            } else {
                 // Check if the particle should be RESTING
                if(this.shouldLieDown(x, ry)) {
                    this.grid[x][ry] |= RESTING;
                }
            }
        }
    }

    this.clearBlacklist();
};


Dust.prototype.draw = function() {
    var self = this;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    var material,
        color,
        vertexCount = 0;

    for (var x = 0; x < this.grid.length; x++) {
        for (var y = 0; y < this.grid[x].length; y++) {
            var s = this.grid[x][y];
    
            if(s === 0) continue;

            material = this.getMaterial(s);
            
            if(s & BURNING) 
                color = (Math.random() > 0.1) ? [10, material.color[1], material.color[2]] : [material.color[0] + 1, material.color[1], material.color[2]];
            else 
                color = material.color;

            var offset = vertexCount * 3 * 6;

            if(vertexCount < this.MAX_DUST) {
                this.sandVertexArray[offset]     = x;
                this.sandVertexArray[offset + 1] = y;
                this.sandVertexArray[offset + 2] = packColor(color);

                this.sandVertexArray[offset + 3] = x + 1;
                this.sandVertexArray[offset + 4] = y;
                this.sandVertexArray[offset + 5] = packColor(color);

                this.sandVertexArray[offset + 6] = x;
                this.sandVertexArray[offset + 7] = y + 1;
                this.sandVertexArray[offset + 8] = packColor(color);


                this.sandVertexArray[offset + 9]= x;
                this.sandVertexArray[offset + 10] = y + 1;
                this.sandVertexArray[offset + 11] = packColor(color);

                this.sandVertexArray[offset + 12] = x + 1;
                this.sandVertexArray[offset + 13] = y;
                this.sandVertexArray[offset + 14] = packColor(color);

                this.sandVertexArray[offset + 15] = x + 1;
                this.sandVertexArray[offset + 16] = y + 1;
                this.sandVertexArray[offset + 17] = packColor(color);

                vertexCount++;
            }
        }
    }

    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.sandVertexArray, this.gl.STATIC_DRAW);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, vertexCount * 6);
};

Dust.prototype.sandCollides = function(s) {
    if(this.grid[s.x][s.y] !== 0) 
        return true;
    else 
        return false;
};

Dust.prototype.resizeSelection = function(w, h) {
    this.selectionBox.resize(w, h);
};

Dust.prototype.moveSelection = function(vec) {
    this.selectionBox.move(vec);
};

Dust.prototype.drawSelection = function(x, y, w, h) {
    this.selectionBox = new Rect(x, y, w, h);
};

Dust.prototype.spawnRect = function(x, y, w, h) {
    for(var i = x; i < (x + w); i++) {
        for(var j = y; j < (y + h); j++) {
            this.grid[i][j] |= SOLID;
        }
    }
};

Dust.prototype.spawnDust = function(x, y, type) {
    if(this.dustCount >= this.MAX_DUST) {
        return;
    }

    var n = 20,
        area = 10;

    x -= area / 2;
    y -= area / 2;

    if(x < 0 || y < 0 || (x + area) > this.WIDTH || (y + area) > this.HEIGHT) return;

    for (var offX = 0; offX < area; offX++) {
        for(var offY = 0; offY < area; offY++) {
            //var spawnX = Math.round(x + area*Math.random()),
            //spawnY = Math.round(y + area*Math.random());
            var spawnX = x + offX,
                spawnY = y + offY;

            var s = new Vector(spawnX, spawnY);
            s.type = this.getType(type);

            if(s.type !== 0) {
                if(!this.sandCollides(s)) {
                    this.grid[s.x][s.y] = s.type;
                    this.dustCount++;
                }
            } else {
                // Eraser
                if(s.x > 0 && s.x < this.WIDTH && s.y > 0 && s.y < this.HEIGHT) {
                    if(this.grid[s.x][s.y] !== 0) {
                        this.dustCount--;
                        this.destroy(spawnX, spawnY);
                        this.wakeSurrounds(s.x, s.y);
                    }
                }
            }
        }
    }
};

// Returns numerical code for material type
Dust.prototype.getType = function(typeString) {
    switch(typeString) {
        case 0: // eraser
            return 0;
        case 'sand':
            return SAND;
        case 'oil':
            return OIL;
        case 'fire':
            return FIRE;
        case 'water':
            return WATER;
        case 'solid':
            return SOLID;
        default:
            return 0;
    }
};

Dust.prototype.getMaterial = function(s) {
    if(s === 0)   return this.materials.space;
    if(s & SAND)  return this.materials.sand;
    if(s & OIL)   return this.materials.oil;
    if(s & FIRE)  return this.materials.fire;
    if(s & WATER) return this.materials.water;
    if(s & SOLID) return this.materials.solid;
    if(s & STEAM) return this.materials.steam;
};

// Returns true if the particle is surrounded by itself
Dust.prototype.surrounded = function(v) {
    if(this.grid[v.x][v.y] === (this.grid[v.x + 1][v.y] && this.grid[v.x - 1][v.y] && this.grid[v.x][v.y + 1] && 
       this.grid[v.x][v.y - 1] && this.grid[v.x + 1][v.y + 1] && this.grid[v.x + 1][v.y - 1] && this.grid[v.x - 1][v.y + 1] && this.grid[v.x - 1][v.y - 1]))
        return true;
    else
        return false;
};

Dust.prototype.move = function(ox, oy, nx, ny) {
    var d = this.grid[ox][oy];

    this.grid[ox][oy] = 0;
    this.grid[nx][ny] = d;
    this.blacklist[nx][ny] = true;

    this.wakeSurrounds(ox, oy);
};

Dust.prototype.swap = function(x1, y1, x2, y2) {
    var d1 = this.grid[x1][y1];
    var d2 = this.grid[x2][y2];

    this.grid[x1][y1] = d2;
    this.grid[x2][y2] = d1;
    
    this.blacklist[x1][y1] = true;
    this.blacklist[x2][y2] = true;
};

// Wakes the surrounding particles
Dust.prototype.wakeSurrounds = function(x, y) {
    if(this.grid[x][y - 1] & RESTING) this.grid[x][y - 1] ^= RESTING;
    if(this.grid[x + 1][y] & RESTING) this.grid[x + 1][y] ^= RESTING;
    if(this.grid[x][y + 1] & RESTING) this.grid[x][y + 1] ^= RESTING;
    if(this.grid[x - 1][y] & RESTING) this.grid[x - 1][y] ^= RESTING;
    if(this.grid[x + 1][y + 1] & RESTING) this.grid[x + 1][y + 1] ^= RESTING;
    if(this.grid[x - 1][y + 1] & RESTING) this.grid[x - 1][y + 1] ^= RESTING;
};

// Checks if this particle needs a nap
Dust.prototype.shouldLieDown = function(x, y) {
    while(y <= this.HEIGHT) {
        if(this.grid[x][y] & SOLID) 
            return true;
        else if(this.grid[x][y] === 0) 
            return false;
        
        y++;
    }
};

Dust.prototype.destroy = function(x, y) {
    this.grid[x][y] = 0;

    this.wakeSurrounds(x, y);
};

// 'Infects's' surrounding particles, toggling the second flag providing first is set
Dust.prototype.infect = function(x, y, flagSet, flagToToggle, flagToRemove) {
    var n = this.grid[x][y - 1],
        ne = this.grid[x + 1][y - 1],
        e = this.grid[x + 1][y],
        se = this.grid[x + 1][y + 1],
        s = this.grid[x][y + 1],
        sw = this.grid[x - 1][y + 1],
        w = this.grid[x - 1][y],
        nw = this.grid[x - 1][y - 1];

    if(n & flagSet) this.grid[x][y - 1] ^= flagToToggle;
    if(ne & flagSet) this.grid[x + 1][y - 1] ^= flagToToggle;
    if(e & flagSet) this.grid[x + 1][y] ^= flagToToggle;
    if(se & flagSet) this.grid[x + 1][y + 1] ^= flagToToggle;
    if(s & flagSet) this.grid[x][y + 1] ^= flagToToggle;
    if(sw & flagSet) this.grid[x - 1][y + 1] ^= flagToToggle;
    if(w & flagSet) this.grid[x - 1][y] ^= flagToToggle;
    if(nw & flagSet) this.grid[x - 1][y - 1] ^= flagToToggle;

    // Remove an optional flag
    if(typeof flagToRemove !== 'undefined') {
        if(n & flagSet) this.grid[x][y - 1] &= ~flagToRemove;
        if(ne & flagSet) this.grid[x + 1][y - 1] &= ~flagToRemove;
        if(e & flagSet) this.grid[x + 1][y] &= ~flagToRemove;
        if(se & flagSet) this.grid[x + 1][y + 1] &= ~flagToRemove;
        if(s & flagSet) this.grid[x][y + 1] &= ~flagToRemove;
        if(sw & flagSet) this.grid[x - 1][y + 1] &= ~flagToRemove;
        if(w & flagSet) this.grid[x - 1][y] &= ~flagToRemove;
        if(nw & flagSet) this.grid[x - 1][y - 1] &= ~flagToRemove;
    }
};

// Runs a function on surrounding particles providing a flag is set
Dust.prototype.runOnSurrounds = function(x, y, flag, f) {
    var n = this.grid[x][y - 1],
        ne = this.grid[x + 1][y - 1],
        e = this.grid[x + 1][y],
        se = this.grid[x + 1][y + 1],
        s = this.grid[x][y + 1],
        sw = this.grid[x - 1][y + 1],
        w = this.grid[x - 1][y],
        nw = this.grid[x - 1][y - 1];

    if(n & flag)  f.call(this, x, y - 1);
    if(ne & flag) f.call(this, x + 1, y - 1);
    if(e & flag)  f.call(this, x + 1, y);
    if(se & flag) f.call(this, x + 1, y + 1);
    if(s & flag)  f.call(this, x, y + 1);
    if(sw & flag) f.call(this, x - 1, y + 1);
    if(w & flag)  f.call(this, x - 1, y);
    if(nw & flag) f.call(this, x - 1, y - 1);
};

Dust.prototype.clearBlacklist = function() {
    for (var x = 0; x < this.blacklist.length; x++) {
        for (var y = 0; y < this.blacklist[x].length; y++) {
            this.blacklist[x][y] = false;
        }
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
