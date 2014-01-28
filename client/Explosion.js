var Vector = require('./Vector'),
    Timer = require('./Timer');

module.exports = Explosion;

function Explosion(x, y, f, radius) {
    this.pos = new Vector(x, y);
    this.force =  10;
    this.radius = 0;
    this.radiusLimit = radius;
    this.updated = false; // Have we updated this frame?
}

Explosion.prototype.update = function() {
    this.radius += 1 * (this.force);

    this.updated = true;

    if(this.radius > this.radiusLimit) {
        this.force = 0;
    }
};
    
Explosion.prototype.getXForce = function(x, y) {
    var dX = this.pos.x - x, 
        dY = this.pos.y - y,
        dist = Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2)),
        sX = dX / dist,
        fX = 0;

    if(dist < this.radius && dX !== 0) {
        fX += -Math.round((sX * (this.radius - dist) / 4));
    }

    return fX;
};

Explosion.prototype.getYForce = function(x, y, dt) {
    var dX = this.pos.x - x, 
        dY = this.pos.y - y,
        dist = Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2)),
        sY = dY / dist,
        fY = 0;

    if(dist < this.radius && dY !== 0) {
        fY += -Math.round((sY * (this.radius - dist) / 4));
    }

    return fY;
};


