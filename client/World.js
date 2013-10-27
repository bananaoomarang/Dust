module.exports = World;

function World() {
    var self = this;

    this.bodies = [];
    this.forces = {
        x: 0,
        y: 0
    }
}

World.prototype.pushBody = function(b) {
    this.bodies.push(b);
}

World.prototype.addForce = function(f) {
    this.forces.x += f.x;
    this.forces.y += f.y;
}

World.prototype.update = function(dt) {
    for (var i = 0; i < this.bodies.length; i++) {
        this.bodies[i].pos.x += this.forces.x * dt;
        this.bodies[i].pos.y += this.forces.y * dt;
    };
}
