var Vector = require('./Vector'),
    AABB = require('./AABB');

module.exports = Solid;

function Solid(w, h, x, y) {
    this.w = w;
    this.h = h;
    
    this.pos = new Vector(x, y);

    this.aabb = new AABB(x, y, (x + this.w - 1), (y + this.h));
}

Solid.prototype.move = function(dVec) {
    dVec.round();
    this.pos.add(vec);
    this.aabb.translate(vec);
}
