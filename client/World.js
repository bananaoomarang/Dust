var Vector = require('./Vector');

module.exports = World;

function World(opts) {
    var self = this;

    this.bodies = opts.bodies || [];

    this.forces = opts.forces || new Vector(0, 0)

    this.bounds = opts.bounds || new AABB(0, 0, 100, 100);
}

World.prototype.pushBody = function(b) {
    b.addAccel(this.forces);

    this.bodies.push(b);
}

World.prototype.addForce = function(f) {
    this.forces.add(f);
}

World.prototype.update = function(dt) {
    for (var i = 0; i < this.bodies.length; i++) {
        var b = this.bodies[i];

        b.update(dt);

        var correctionVector = this.outOfBounds(b);

        var intersect = this.collides(b);

        if(intersect !== false) {
            correctionVector.add(intersect);
        }

        b.addVector(correctionVector);
    };
}

// Check if a body collides with any other one
World.prototype.collides = function(b) {
    for (var i = 0; i < this.bodies.length; i++) {
        var b2 = this.bodies[i];

        if(b2 !== b) {
            var intersect = b2.aabb.intersects(b.aabb);
            if(intersect !== false) {
                // Return the correction vector
                return intersect;
            }
        }
    };

    return false;
}

// Check if a body is out of bounds, and returns the correction vector
World.prototype.outOfBounds = function(b) {
    if(b.pos.x < this.bounds.min.x) {
        return new Vector(this.bounds.min.x - b.pos.x, 0);
    }

    if((b.pos.x + b.w) > this.bounds.max.x) {
        return new Vector(this.bounds.max.x - (b.pos.x + b.w), 0);
    }

    if(b.pos.y < this.bounds.min.y) {
        return new Vector(0, this.bounds.min.y - b.pos.y);
    }

    if((b.pos.y + b.h) > this.bounds.max.y) {
        return new Vector(0, this.bounds.max.y - (b.pos.y + b.h));
    }

    return new Vector(0, 0);
}
