module.exports = Timer;

function Timer() {
    this.start = new Date().getTime();
}

Timer.prototype.getTime = function() {
    var currentTime = new Date().getTime();

    return currentTime - this.start;
}

Timer.prototype.reset = function() {
    this.start = new Date().getTime();
}
