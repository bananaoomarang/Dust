var express = require("express"),
    app = express(),
    server = require('http').createServer(app),
    io = require("socket.io").listen(server),
    levelup = require('level'),
    connections = 0;

var db = levelup('./leveldb');

var PORT = process.env.PORT || 9966;

server.listen(PORT);
console.log('\n   Server listening on ' + process.env.PORT || 9966);

app.configure(function() {
    app.use(express.bodyParser());
    app.use(app.router);
});

app.use(express.static(__dirname + "/public"));

app.post('/saveLevel/:name', function(req, res) {
    if(!req.body) return console.error("Oh my... Didn't receive the data :'(");

    var grid = req.body;


    db.put(req.params.name, JSON.stringify(grid), function(err) {
        if(err) return console.error("Ooopsie ", err);
    });

    res.status(200);
    res.end();
});

app.get('/loadLevel/:name', function(req, res) {
    db.get(req.params.name, function(err, grid) {
        if(err) return console.error("Ooopsie ", err);

        res.contentType('json');
        res.send(JSON.stringify(grid));
        res.status(200);
        res.end();
    });
});

io.sockets.on('connection', function (socket) {
    connections++;
    socket.emit('client connected', connections);
    
    socket.on('disconnect', function (socket) {
        connections--;
        io.sockets.emit('client disconnected', connections);
    });

    socket.on('grid hit', function(data) {
        socket.broadcast.emit('new grid hit', data);
        socket.broadcast.emit('turn ended');
    });

    socket.on('client won', function() {
        io.sockets.emit('game ended');
    });
});
