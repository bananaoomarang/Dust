var Vector = require('./Vector');

module.exports = AABB;

function AABB(minx, miny, maxx, maxy) {
    this.min = new Vector(minx, miny);
    this.max = new Vector(maxx, maxy);
    console.log('forged new AABB');
}

AABB.prototype.translate = function(vec) {
    this.min.add(vec);
    this.max.add(vec);
}

AABB.prototype.intersects = function(aabb) {
    if(this.max.x < aabb.min.x ||
       this.max.y < aabb.min.y ||
       this.min.x > aabb.max.x ||
       this.min.y > aabb.max.y) {
           return false;
       } else {
           var vec = new Vector(0, 0);

           var left = (aabb.min.x - this.max.x),
               right = (aabb.max.x - this.min.x),
               top = (aabb.min.y - this.max.y),
               bottom = (aabb.max.y - this.min.y);

           if(Math.abs(left) < right) {
               vec.x = -left;
           } else {
               vec.x = -right;
           }

           if(Math.abs(top) < bottom) {
               vec.y = -top;
           } else {
               vec.y = -bottom;
           }

           if(Math.abs(vec.x) < Math.abs(vec.y)) {
               vec.y = 0;
           } else {
               vec.x = 0;
           }

           return vec;
       }
}
