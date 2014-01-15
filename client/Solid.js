var Vector = require('./Vector'),
    AABB = require('./AABB');

module.exports = Solid;

function Solid(x, y, w, h) {
    this.w = w;
    this.h = h;
    
    this.pos = new Vector(x, y);

    this.aabb = new AABB(x - this.w, y - this.h, (x + this.w), (y + this.h));

    this.color = [0, 0, 0];
}

Solid.prototype.bufferUp = function(gl) {
    this.vertexBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    var floatArray = new Float32Array([
            -this.w,  -this.h, this.color[0], this.color[1], this.color[2],
            -this.w,   this.h, this.color[0], this.color[1], this.color[2],
             this.w,  -this.h, this.color[0], this.color[1], this.color[2],
             this.w,   this.h, this.color[0], this.color[1], this.color[2]]);


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
