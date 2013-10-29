module.exports = Vector;

function Vector(x, y) {
    this.x = x;
    this.y = y;
};

Vector.prototype.add = function(vec) {
    this.x += vec.x;
    this.y += vec.y;
}

Vector.prototype.within = function(aabb) {
    if(this.x < aabb.min.x ||
       this.x > aabb.max.x ||
       this.y < aabb.min.y ||
       this.y > aabb.max.y) {
           return false;
       } else {
           return true;
       }
}
