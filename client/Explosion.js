var Timer = require('./Timer');

module.exports = Explosion;

function Explosion(x, y, f, radius) {
    this.x = x;
    this.y = y;
    this.force =  f;
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
