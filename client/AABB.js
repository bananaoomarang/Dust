var Vector = require('./Vector');

module.exports = AABB;

function AABB(minx, miny, maxx, maxy) {
    this.min = new Vector(minx, miny);
    this.max = new Vector(maxx, maxy);
}
