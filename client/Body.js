var Vector = require('./Vector'),
    AABB = require('./AABB');

module.exports = Body;

function Body(w, h, x, y) {
    this.w = w;
    this.h = h;
    
    this.mass = 1;

    this.pos = new Vector(x, y);
    this.vel = new Vector(0, 0);
    this.acc = new Vector(0, 0);
    this.forces = new Vector(0, 0);

    this.resting = {
        x: false,
        y: false
    };

    this.aabb = new AABB(x, y, (x + this.w - 1), (y + this.h));
}

Body.prototype.update = function(dt) {
    var dVec = new Vector(0, 0),
        acc = new Vector(this.acc.x * dt, this.acc.y * dt),
        terminal = 80;

    if(this.vel.y < terminal) {
        this.vel.add(acc);
    }

    var vel = new Vector(this.vel.x * dt, this.vel.y * dt);

    dVec.add(vel);

    if(this.resting.x) dVec.x = 0;

    if(this.resting.y) dVec.y = 0;

    this.addVector(dVec);
}

Body.prototype.addVector = function(vec) {
    vec.round();
    this.pos.add(vec);
    this.aabb.translate(vec);
}

Body.prototype.addAccel = function(vec) {
    this.acc.add(vec);
}

Body.prototype.addForce = function(vec) {
    this.forces.add(vec);
}
