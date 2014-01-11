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
    
    this.uProjectionMatrix = this.gl.getUniformLocation(this.shaderProgram, 'projectionMatrix');
    this.uModelViewMatrix = this.gl.getUniformLocation(this.shaderProgram, 'modelViewMatrix');
    
    this.world = this.initWorld();
    this.selectionBox = null;
    this.grid = new Array2D(this.WIDTH, this.HEIGHT);
}

Dust.prototype.getGL = function() {
    htmlCanvas = "<canvas width=" + "\"" + this.WIDTH + "\"" + "height=" + "\"" + this.HEIGHT + "\"" + "></canvas>";

    $('#canvainer').append(htmlCanvas);

    return $('canvas').get(0).getContext('webgl');
};

Dust.prototype.initWorld = function() {
    // Define world
    var gravity = new Vector(0.0, 50),
        worldBounds = new AABB(0, 0, this.WIDTH, this.HEIGHT);

    var world = new World({
        forces: gravity,
        bounds: worldBounds
    });

    var solid = new Solid(100, 10, 100, 300);
    world.pushSolid(solid);
    
    this.loadIdentity();

    return world;
};

Dust.prototype.updateWorld = function(dt) {
    //this.world.update(dt);
};

Dust.prototype.drawWorld = function() {
    var self = this;
    
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.mvTranslate(100, 50, 0);
    
    this.gl.uniformMatrix4fv(this.uProjectionMatrix, false, new Float32Array(this.projectionMatrix));

    this.gl.uniformMatrix4fv(this.uModelViewMatrix, false, new Float32Array(this.modelViewMatrix));
    
    var buffer = this.gl.createBuffer(),
        floatArray = new Float32Array([
                -1.0, -1.0, 
                1.0, -1.0, 
                -1.0,  1.0, 
                -1.0,  1.0, 
                1.0, -1.0, 
                1.0,  1.0]),
        positionAttribute = this.gl.getAttribLocation(this.shaderProgram, "position");
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, floatArray, this.gl.STATIC_DRAW);
    this.gl.enableVertexAttribArray(positionAttribute);
    this.gl.vertexAttribPointer(positionAttribute, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
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

Dust.prototype.loadIdentity = function() {
    this.modelViewMatrix = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
};

Dust.prototype.mvTranslate = function(x, y, z) {
    this.modelViewMatrix[12] = x;
    this.modelViewMatrix[13] = y;
    this.modelViewMatrix[14] = z;
};

// Assorted functions
function Array2D(w, h) {
    var array = [];

    for (var x = 1; x < w; x++) {
        array[x] = 0;
        for (var y = 0; y < h; y++) {
            array[x][y] = 0;
        }
    }
}

function makeProjectionMatrix(width, height) {
    return [
        2 / width, 0,           0, 0,
        0,         -2 / height, 0, 0,
        0,         0,           1, 0,
        0,         0,           0, 1
    ];
}
//new THREE.OrthographicCamera(this.WIDTH / -2, this.WIDTH / 2, this.HEIGHT / 2, this.HEIGHT / -2, 1, -1);

