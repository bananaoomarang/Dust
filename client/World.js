var Vector = require('./Vector');

module.exports = World;

function World(opts) {
    var self = this;

    this.forces = opts.forces || new Vector(0, 0)

    this.bounds = opts.bounds || new AABB(0, 0, 100, 100);

    this.terminalVel = 20;

    this.solids = []; // Solid objects for sand to bump into
    this.sands = []; // Vectors storing a position of sand
}

World.prototype.pushSolid = function(s) {
    this.solids.push(s);
}

World.prototype.pushSand = function(v) {
    v.resting = false;
    v.forces = this.forces;
    this.sands.push(v);
}

World.prototype.addForce = function(f) {
    this.forces.add(f);
}

World.prototype.update = function(dt) {
    // Update solid positions
    for (var i = 0; i < this.solids.length; i++) {
        var s = this.solids[i];

        for (var x = s.aabb.min.x; x < s.aabb.max.x; x++) {
            for(var y = s.aabb.min.y; y < s.aabb.max.y; y++) {
                window.particleArray[x][y] = 1;
            }
        };
    };

    // Update sand
    for (var i = 0; i < this.sands.length; i++) {
        var s = this.sands[i];

        if(typeof window.particleArray[s.x] === 'undefined') console.log(s.x + ' ' + this.bounds.max.x)

        window.particleArray[s.x][s.y] = 1;

        if(!s.resting) {
            state = this.sandState(s);
            var startY = s.y,
                startX = s.x,
                dVec;

            if(!state.bellow) {
                dVec = new Vector(0, 1);
            } else if(!state.leftBellow) {
                dVec = new Vector(1, -1);
            } else if(!state.rightBellow) {
                dVec = new Vector(1, 1);
            } else {
                s.resting = true;
                dVec = new Vector(0, 0);
            }

            s.add(dVec);

            // If we're out of bounds, reverse
            if(!s.within(this.bounds)) s.add(new Vector(-dVec.x, -dVec.y));

            if(s.y !== startY) {
               window.particleArray[startX][startY] = 0; 
            }

            if(s.x !== startX) {
               window.particleArray[startX][startY] = 0; 
            }
        }     
    };
}

// Check situation around grain and return descriptive object
World.prototype.sandState = function(s) {
    var right = new Vector(s.x + 1, s.y),
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

    // Check for surrounding sand, do some of the ugliest out of bounds exception catching ever seen
    if(s.x === this.bounds.min.x) {
        left = 1;
        leftBellow = 1;
    }

    if(s.x === this.bounds.max.x) {
        right = 1;
        rightBellow = 1;
    }

    if(s.y === this.bounds.min.y) {
        above = 1;
    }

    if(s.y === this.bounds.max.y) {
        bellow = 1;
        leftBellow = 1;
        rightBellow = 1;
    }

    s = window.particleArray[s.x][s.y];

    if(left !== 1)        left = window.particleArray[left.x][left.y];
    if(bellow !== 1)      bellow = window.particleArray[bellow.x][bellow.y];
    if(above !== 1)       above = window.particleArray[above.x][above.y];
    if(right !== 1)       right = window.particleArray[right.x][right.y];
    if(leftBellow !== 1)  leftBellow = window.particleArray[leftBellow.x][leftBellow.y];
    if(rightBellow !== 1) rightBellow = window.particleArray[rightBellow.x][rightBellow.y];

    if(right !== 0) {
        state.right = true;
    }

    if(left !== 0) {
        state.left = true;
    }

    if(bellow !== 0) {
        state.bellow = true;
    }

    if(above !== 0) {
        state.above = true;
    }

    if(leftBellow !== 0) {
        state.leftBellow = true;
    }

    if(rightBellow !== 0) {
        state.rightBellow = true;
    }

    return state;
}

// Checks if a sand grain is in a solids aabb
World.prototype.collides = function(sand) {

    for (var i = 0; i < this.solids.length; i++) {
        var s = this.solids[i];

        if(sand.within(s.aabb)) {
            return true;
        }
    };

    return false;
}
