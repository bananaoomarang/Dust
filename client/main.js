var Client = require('./Client'),
    Dust = require('./Dust'),
    $ = require('jquery-browserify');

$(document).ready(main);

function main() {
    var DUST = new Dust();

    DUST.socket.on('client connected', function(data) {
        var ip = "172.16.0.20"

        console.log(data);
        if(data === 1) {
            DUST.client = new Client(ip, "red");
            DUST.client.turn = true;
        } else if(data === 2) {
            DUST.client = new Client(ip, "blue");
        } else if(data > 2) {
            DUST.client = new Client(ip);
        }

    });
}
