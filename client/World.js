var Vector = require('./Vector');

module.exports = World;

function World(opts) {
    var self = this;

    this.bodies = opts.bodies || [];

    this.forces = opts.forces || new Vector(0, 0)

    this.bounds = opts.bounds || new AABB(0, 0, 100, 100);

    this.terminalVel = 20;

    this.sands = []; // Vectors storing a position of sand
}

World.prototype.pushBody = function(b) {
    b.addAccel(this.forces);

    this.bodies.push(b);
}

World.prototype.pushSand = function(v) {
    this.sands.push(v);
}

World.prototype.addForce = function(f) {
    this.forces.add(f);
}

World.prototype.update = function(dt) {
    // Update newtonian bodies
    for (var i = 0; i < this.bodies.length; i++) {
        var b = this.bodies[i];

        b.update(dt);

        var correctionVector = this.outOfBounds(b);

        var intersect = this.collides(b);

        if(intersect !== false) {
            correctionVector.add(intersect);

            if(Math.abs(intersect.x) > 0) {
                b.resting.x = true;
            }

            if(Math.abs(intersect.y) > 0) {
                b.resting.y = true;
            }
        } else {
            b.resting.x = false;
            b.resting.y = false;
        }

        b.addVector(correctionVector);
    };

    // Update sand
    for (var i = 0; i < this.sands.length; i++) {
        var s = this.sands[i],
            state = this.sandState(s);

        if(!state.bellow) {
            s.y += 1;
        } else if(!state.leftBellow) {
            s.y += 1;
            s.x -= 1;
        } else if(!state.rightBellow) {
            s.y += 1;
            s.x += 1;
        }
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

// Check situation around grain and return descriptive object
World.prototype.sandState = function(s) {
    for (var i = 0; i < this.bodies.length; i++) {
        var b = this.bodies[i],
            right = new Vector(s.x + 1, s.y),
            left = new Vector(s.x - 1, s.y),
            above = new Vector(s.x, s.y - 1),
            bellow = new Vector(s.x, s.y + 1),
            leftBellow = new Vector(s.x - 1, s.y + 1),
            rightBellow = new Vector(s.x + 1, s.y + 1),
            state = {
                right: false,
                left: false,
                above: false,
                bellow: false,
                leftBellow: false,
                rightBellow: false
            };

        // Check for surrounding newtonian bodies
        if(right.within(b.aabb) || !right.within(this.bounds)) {
            state.right = true;
        }

        if(left.within(b.aabb) || !left.within(this.bounds)) {
            state.left = true;
        }

        if(above.within(b.aabb) || !above.within(this.bounds)) {
            state.above = true;
        }

        if(bellow.within(b.aabb) || !bellow.within(this.bounds)) {
            state.bellow = true;
        }
        
        if(leftBellow.within(b.aabb) || !leftBellow.within(this.bounds)) {
            state.leftBellow = true;
        }
        
        if(rightBellow.within(b.aabb) || !rightBellow.within(this.bounds)) {
            state.rightBellow = true;
        }

        // Now for surrounding sand
        for (var j = 0; j < this.sands.length; j++) {
            var s2 = this.sands[j];

            if(s2.x === right.x && s2.y === right.y) {
                state.right = true;
            }

            if(s2.x === left.x && s2.y === left.y) {
                state.left = true;
            }

            if(s2.x === bellow.x && s2.y === bellow.y) {
                state.bellow = true;
            }

            if(s2.x === above.x && s2.y === above.y) {
                state.bellow = true;
            }

            if(s2.x === leftBellow.x && s2.y === leftBellow.y) {
                state.leftBellow = true;
            }

            if(s2.x === rightBellow.x && s2.y === rightBellow.y) {
                state.rightBellow = true;
            }
        };

        return state;
    };
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
