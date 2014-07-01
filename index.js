var express = require("express"),
    fs = require('fs'),
    app = express(),
    server = require('http').createServer(app),
    levelup = require('level'),
    Jpeg = require('jpeg').Jpeg,
    im = require('imagemagick'),
    connections = 0;

var db = levelup('./leveldb');

var PORT = process.env.PORT || 9966;

// Possible material values
var SAND = 1,
    OIL = 2,
    FIRE = 4,
    LAVA = 8,
    WATER = 16,
    STEAM = 32,
    SOLID = 64,
    RESTING = 128,
    BURNING = 256,
    LIFE = 512,
    INFECTANT = 1024,
    C4 = 2048,
    SPRING = (SOLID | WATER),
    VOLCANIC = (SOLID | LAVA),
    OIL_WELL = (SOLID | OIL);

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

    // Generate and store JPeg
    var arr = [];

    for (var y = 0; y < grid[0].length; y++) {
        for (var x = 0; x < grid[0].length; x++) {
            var val = grid[x][y],
                r,
                g,
                b;

            if(val & INFECTANT) val &= ~INFECTANT;

            // Map materials to RGB values. No I didn't think of this when I wrote the client.
            switch(val) {
                case SAND:
                    r = 230;
                    g = 179;
                    b = 51;
                    break;
                case OIL:
                    r = 128;
                    g = 102;
                    b = 26;
                    break;
                case FIRE:
                    r = 255;
                    g = 128;
                    b = 0;
                    break;
                case LAVA:
                    r = 255;
                    g = 77;
                    b = 0;
                    break;
                case WATER:
                    r = 0;
                    g = 128;
                    b = 255;
                    break;
                case STEAM:
                    r = 153;
                    g = 153;
                    b = 153;
                    break;
                case SOLID:
                    r = 0;
                    g = 0;
                    b = 0;
                    break;
                case BURNING:
                    r = 255;
                    g = 128;
                    b = 0;
                    break;
                case LIFE:
                    r = 0;
                    g = 255;
                    b = 51;
                    break;
                case C4:
                    r = 51;
                    g = 230;
                    b = 26;
                    break;
                default:
                    r = 255;
                    g = 255;
                    b = 255;
                    break;
            }

            arr.push(r, g, b);
        }
    }

    var buff = new Buffer(arr);

    var jpeg = new Jpeg(buff, 500, 500, 'rgb');

    jpeg.encode(function(img, err) {
        if(err) {
            console.log(err);
        } else {
            fs.writeFile('public/imgs/' + req.params.name + '.jpg', img, 0, function(err) {
                if(err) {
                    console.log(err);
                } else {

                    smallify('public/imgs/' + req.params.name + '.jpg');
                } 
            });
        }
    });

    res.status(200);
    res.end();
});

function smallify(path) {
    im.resize({
        srcPath: path,
        dstPath: path,
        width: 125,
        height: 125
    }, function(err) {
        if(err) throw err;
        else console.log('yup');
    });
}

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
