var $ = require('jquery-browserify'),
    Vector = require('./Vector'),
    AABB = require('./AABB'),
    World = require('./World'),
    Solid = require('./Solid'),
    fs = require('fs'),
    vertShader = fs.readFileSync(__dirname + '/vert.glsl'),
    fragShader = fs.readFileSync(__dirname + '/frag.glsl');

module.exports = Dust;

function Dust() {
    var self = this;

    this.socket = io.connect('http://192.168.1.77:9966');

    this.WIDTH  = $('#canvainer').width();
    this.HEIGHT = $('#canvainer').height();

    this.gl = this.getGL();
    this.shaderProgram = this.getShaderProgram(vertShader, fragShader);
    this.gl.useProgram(this.shaderProgram);

    this.projectionMatrix = makeProjectionMatrix(this.WIDTH, this.HEIGHT);
    this.modelViewMatrix = [];
    
    this.uProjectionMatrix = null;
    this.uModelViewMatrix = null;
    this.uColor = null;
    this.setUniforms();
    
    this.loadIdentity();
    this.setBuffer();

    this.world = null; //this.initWorld();
    this.grid = new Array2D(this.WIDTH, this.HEIGHT);
    this.bounds = new AABB(0, 0, this.WIDTH, this.HEIGHT); // TODO make code use AABB
    this.sands = [];

    this.materials = {
        sand: {
            uColor: [0.9, 0.7, 0.2, 1.0]
        }
    };

    this.selectionBox = null;
}

Dust.prototype.getGL = function() {
    htmlCanvas = "<canvas width=" + "\"" + this.WIDTH + "\"" + "height=" + "\"" + this.HEIGHT + "\"" + "></canvas>";

    $('#canvainer').append(htmlCanvas);

    return $('canvas').get(0).getContext('webgl');
};

Dust.prototype.update = function(dt) {
    //this.world.update(dt);

    for (var i = 0; i < this.sands.length; i++) {
        var sand = this.sands[i];
        
        if(sand.x >= 0 && sand.y >= 0 && sand.x <= (this.WIDTH - 1) && sand.y <= (this.HEIGHT - 1)) {

            if(this.grid[sand.x][sand.y + 1] === 0) { 
                sand.y += 1;
                
                this.grid[sand.x][sand.y - 1] = 0;
                this.grid[sand.x][sand.y] = 1;
            } else if(this.grid[sand.x - 1][sand.y + 1] === 0) {
                sand.x -= 1;
                sand.y += 1;

                this.grid[sand.x + 1][sand.y - 1] = 0;
                this.grid[sand.x][sand.y] = 1;
            } else if(this.grid[sand.x + 1][sand.y + 1] === 0) {
                sand.x += 1;
                sand.y += 1;

                this.grid[sand.x - 1][sand.y - 1] = 0;
                this.grid[sand.x][sand.y] = 1;
            }
        }
    }
};


Dust.prototype.draw = function() {
    var self = this;
    
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    for (var x = 0; x < this.grid.length; x++) {
        for (var y = 0; y < this.grid[x].length; y++) {
            var cell = this.grid[x][y];

            switch(cell) {
                case 0:
                    break;
                case 1:
                    var material = this.materials.sand;

                    this.mvTranslate(x, y);

                    this.gl.uniformMatrix3fv(this.uModelViewMatrix, false, this.modelViewMatrix);
                    this.gl.uniform4fv(this.uColor, material.uColor);

                    this.gl.drawElements(this.gl.TRIANGLE_STRIP, 4, this.gl.UNSIGNED_SHORT, 0);

                    break;
                default:
                    break;
            }
        }
    }

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
        x = Math.round((x - area/2) + area*Math.random()) - 1;
        y = Math.round((y - area/2) + area*Math.random()) - 1;

        if(x >= 0 && y >= 0 && (x <= this.WIDTH) && y <= (this.HEIGHT - 1)) {
            var s = new Vector(x, y);

            //if(!this.world.collides(s) && s.within(this.world.bounds)) this.world.pushSand(s);

            this.sands.push(s);
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
    this.uProjectionMatrix = this.gl.getUniformLocation(this.shaderProgram, 'projectionMatrix');
    this.uModelViewMatrix = this.gl.getUniformLocation(this.shaderProgram, 'modelViewMatrix');
    this.uColor = this.gl.getUniformLocation(this.shaderProgram, 'uColor');

    this.gl.uniformMatrix3fv(this.uProjectionMatrix, false, this.projectionMatrix);
};

Dust.prototype.setBuffer = function() {
    this.dustBuffer = this.gl.createBuffer();
    this.indexBuffer = this.gl.createBuffer();

    this.floatArray = new Float32Array([
            -1.0, -1.0, 
            -1.0,  1.0, 
            1.0,  -1.0, 
            1.0,   1.0]);
    this.indexArray = new Uint16Array([
            0, 1, 2, 3]);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.dustBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.floatArray, this.gl.STATIC_DRAW);
    
    this.positionAttribute = this.gl.getAttribLocation(this.shaderProgram, "position");
    this.gl.enableVertexAttribArray(this.positionAttribute);
    this.gl.vertexAttribPointer(this.positionAttribute, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indexArray, this.gl.STATIC_DRAW);
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
//new THREE.OrthographicCamera(this.WIDTH / -2, this.WIDTH / 2, this.HEIGHT / 2, this.HEIGHT / -2, 1, -1);

