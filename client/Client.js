module.exports = Client;

function Client(ip, type) {
    var self = this;

    this.type = type || "spectator";
    this.ip = ip;
};
