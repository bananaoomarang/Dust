var express = require("express"),
    app = express(),
    server = require('http').createServer(app),
    io = require("socket.io").listen(server),
    levelup = require('level'),
    connections = 0;

var db = levelup('./leveldb');

var PORT = process.env.PORT || 2368;

server.listen(PORT);
console.log('\n   Server listening on ' + PORT);

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

app.get('/listLevels', function(req, res) {
    var levelList = [],
        query = req.query.query,
        match = new RegExp(query, 'i');

    db.createKeyStream().on('data', function(key) {
        if(key.match(match)) levelList.push(key);
    }).on('error', function(err) {
        res.write("Holy mother of Javascript, CAN'T READ THE DAMN LEVEL LIST: ", err);
    }).on('end', function() {
        res.send({ suggestions: levelList });
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
