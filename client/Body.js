var Vector = require('./Vector');

module.exports = Body;

function Body(w, h, x, y) {
    this.w = w;
    this.h = h;

    this.pos = new Vector(x, y);
}
