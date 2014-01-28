var Timer = require('./Timer');

module.exports = Explosion;

function Explosion(x, y, f, radius) {
    this.x = x;
    this.y = y;
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

Explosion.prototype.getForce = function(x, y) {
    var dX = this.x - x, 
        dY = this.y - y,
        dist = Math.sqrt(Math.pow(dX, 2) + Math.pow(dY, 2)),
        sX = dX / dist,
        sY = dY / dist,
        fX = 0;
        fY = 0;

    if(dist < this.radius && dY !== 0) {
        fY += -Math.round((sY * (this.radius - dist) / 4));
    }
    
    if(dist < this.radius && dX !== 0) {
        fX += -Math.round((sX * (this.radius - dist) / 4));
    }

    return {
        x: fX,
        y: fY
    };
};
