module.exports = Vector;

function Vector(x, y) {
    this.x = x;
    this.y = y;

    return this;
}

Vector.prototype.set = function(x, y) {
    this.x = x;
    this.y = y;
};

Vector.prototype.add = function(vec) {
    this.x += vec.x;
    this.y += vec.y;
    return this;
};

Vector.prototype.within = function(aabb) {
    if(this.x < aabb.min.x ||
       this.x > aabb.max.x ||
       this.y < aabb.min.y ||
       this.y > aabb.max.y) {
           return false;
       } else {
           return true;
       }
};

Vector.prototype.round = function() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);

    return this;
};

Vector.prototype.scalar = function(s) {
    this.x *= s;
    this.y *= s;

    return this;
};

// Returns the opposite vector
Vector.prototype.reverse = function() {
    return new Vector(this.x * -1, this.y * -1);
};

Vector.prototype.normalize = function() {
    this.x = this.x / 1;
    this.y = this.y / 1;

    return this;
};

Vector.prototype.normalized = function() {
    return new Vector(this.x / 1, this.y / 1);
};
