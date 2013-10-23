var b2d = require('box2d');

console.log(b2d);

module.exports = Dust;

function Dust() {
    this.socket = io.connect('http://172.16.0.20:9966');
};


