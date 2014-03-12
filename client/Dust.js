var $ = require('jquery'),
    Vector = require('./Vector'),
    Timer = require('./Timer'),
    AABB = require('./AABB'),
    Explosion = require('./Explosion'),
    fs = require('fs'),
    vertShader = fs.readFileSync(__dirname + '/vert.glsl'),
    fragShader = fs.readFileSync(__dirname + '/frag.glsl');

module.exports = Dust;

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

function Dust() {
    var self = this;

    //this.socket = io.connect('http://192.168.1.77:9966');

    this.WIDTH  = $('#canvainer').width();
    this.HEIGHT = $('#canvainer').height();
    this.MAX_DUST = 100000;

    this.gl = this.getGL();
    this.shaderProgram = this.getShaderProgram(vertShader, fragShader);
    this.gl.useProgram(this.shaderProgram);

    this.projectionMatrix = makeProjectionMatrix(this.WIDTH, this.HEIGHT);
    this.modelViewMatrix = [];
    
    this.modelViewProjectionMatrix = null;
    this.setUniforms();

    this.sandVertexArray = new Float32Array(this.MAX_DUST * 3 * 6);
    this.dustBuffer = this.gl.createBuffer();
    
    this.positionAttribute = this.gl.getAttribLocation(this.shaderProgram, "position");
    this.colorAttribute = this.gl.getAttribLocation(this.shaderProgram, "aColor");

    this.gl.enableVertexAttribArray(this.positionAttribute);
    this.gl.enableVertexAttribArray(this.colorAttribute);
    
    this.setSandBuffers();
    this.loadIdentity();
    this.mvpMatrix = matrixMultiply(this.modelViewMatrix, this.projectionMatrix);
    this.gl.uniformMatrix3fv(this.uModelViewProjectionMatrix, false, this.mvpMatrix);
    
    this.gl.vertexAttribPointer(this.positionAttribute, 2, this.gl.FLOAT, false, 12, 0);
    this.gl.vertexAttribPointer(this.colorAttribute, 1, this.gl.FLOAT, false, 12, 8);

    this.grid = new Array2D(this.WIDTH, this.HEIGHT);
    this.blacklist = new Array2D(this.WIDTH, this.HEIGHT);
    this.explosions = [];
    this.dustCount = 0;

    this.lifeTimer = new Timer();
    this.lifeTime = 50;
    
    this.paused = false;

    this.materials = {
        sand: {
            color: [9, 7, 2],
            friction: 0.99,
            density: 10
        },
        oil: {
            color: [5, 4, 1],
            bColors: [10, 4, 1, 8, 4, 1],
            friction: 1,
            liquid: true,
            density: 5
        },
        fire: {
            color: [10, 5, 0],
            bColors: [10, 5, 0, 9, 6, 1],
            friction: 1,
            density: -1
        },
        lava: {
            color: [10, 3, 0],
            liquid: true,
            density: 10
        },
        C4: {
            color: [2, 9, 1],
            bColors: [9, 7, 2, 10, 10, 3]
        },
        water: {
            color: [0, 5, 10],
            friction: 1,
            liquid: true,
            density: 6
        },
        steam: {
            color: [6, 6, 6],
            density: -1,
            liquid: true
        },
        life: {
            color: [0, 10, 2],
            bColors: [10, 7, 1, 7, 6, 1]
        },
        solid: {
            color: [0, 0, 0]
        },
        space: {
            density: 0
        }
    };

    this.spawnRect(250, 200, 200, 20);
}

Dust.prototype.getGL = function() {
    htmlCanvas = "<canvas width=" + "\"" + this.WIDTH + "\"" + "height=" + "\"" + this.HEIGHT + "\"" + "></canvas>";

    $('#canvainer').append(htmlCanvas);

    return $('canvas').get(0).getContext('webgl');
};

Dust.prototype.update = function(dt) {
    var lived = false;
        
    var rx = Math.floor(Math.random() * 500)  % (this.grid.length -1),
        xIncrement = 7;

    for (var x = 1; x < this.grid.length - 1; x++) {
        var ry = Math.floor(Math.random() * 500)  % (this.grid[x].length -1),
            yIncrement = 2;

        rx = (rx + xIncrement) % (this.grid.length - 1);
            
        if(rx === 0 || rx === this.grid[x].length) continue;

        for (var y = this.grid[x].length; y > 0; y--) {
            ry = (ry + yIncrement) % (this.grid.length - 1);

            // If we think we're gonna incur OOBE, get the HELL out of there.
            if(ry === 0 || ry === this.grid[x].length) continue;
            
            var d = this.grid[rx][ry],
                m = this.getMaterial(d),
                xDir = Math.random() < 0.5 ? 1 : -1;

            if(d === 0) continue;
            
            if(this.blacklist[rx][ry]) continue;

            for (var e = 0; e < this.explosions.length; e++) {
                var exp = this.explosions[e];

                if(!exp.updated) {
                    exp.update();
                    this.spawnCircle(exp.x, exp.y, FIRE, exp.radius);
                }

                if(exp.force === 0) {
                    this.explosions.splice(e, 1);
                    e--;
                }

            }

            if(d & INFECTANT) {
                this.runOnSurrounds(rx, ry, function(x, y) {
                    if(x > 1 && x < this.WIDTH - 1 && y > 1 && y < this.HEIGHT - 1) {
                        var n = this.grid[x][y - 1],
                            ne = this.grid[x + 1][y - 1],
                            e = this.grid[x + 1][y],
                            se = this.grid[x + 1][y + 1],
                            s = this.grid[x][y + 1],
                            sw = this.grid[x - 1][y + 1],
                            w = this.grid[x - 1][y],
                            nw = this.grid[x - 1][y - 1],
                            rand = Math.random();

                            if(n !== 0 && !(n & INFECTANT) && rand > 0.99) this.spawn(x, y - 1, d);
                            if(ne !== 0 && !(ne & INFECTANT) && rand > 0.99) this.spawn(x + 1, y - 1, d);
                            if(e !== 0 && !(e & INFECTANT) && rand > 0.99) this.spawn(x + 1, y, d);
                            if(se !== 0 && !(se & INFECTANT) && rand > 0.99) this.spawn(x + 1, y + 1, d);
                            if(s !== 0 && !(s & INFECTANT) && rand > 0.99) this.spawn(x, y + 1, d);
                            if(sw !== 0 && !(sw & INFECTANT) && rand > 0.99) this.spawn(x - 1, y + 1, d);
                            if(w !== 0 && !(w & INFECTANT) && rand > 0.99) this.spawn(x - 1, y, d);
                            if(nw !== 0 && !(nw & INFECTANT) && rand > 0.99) this.spawn(x - 1, y - 1, d);
                    }
                });
            }

            if(d & LIFE) {
                if(this.lifeTimer.getTime() >= this.lifeTime) {
                    lived = true;

                    var neighbours = this.countNeighbours(rx, ry, true);

                    if(neighbours < 2) this.destroy(rx, ry);
                    if(neighbours > 3) this.destroy(rx, ry);

                    this.runOnSurrounds(rx, ry, function(x, y) {
                        if(x > 1 && x < this.WIDTH - 1 && y > 1 && y < this.HEIGHT - 1) {
                            if(!this.blacklist[x][y] && this.grid[x][y] === 0) {
                                neighbours = this.countNeighbours(x, y);

                                if(neighbours === 3) {
                                    this.grid[x][y] = LIFE;
                                    this.dustCount++;
                                }

                                // Not a misatake, this makes it work better
                                this.blacklist[x][y] = true;
                            }
                        }
                    });
                }
            }
            
            // This is a spring
            if(d & WATER && d & SOLID) {
                this.infect(rx, ry, 0, WATER);
            }
            
            // Oil spring
            if(d & OIL && d & SOLID) {
                this.infect(rx, ry, 0, OIL);
            }
            
            // Lava spring
            if(d & LAVA && d & SOLID) {
                this.infect(rx, ry, 0, LAVA);
            }

            if(d & FIRE) {
                if(Math.random() > 0.8) this.grid[rx][ry] |= BURNING;
            }
           
            if(d & BURNING && Math.random() > 0.8 && !this.blacklist[rx][ry]) {
                if(d & C4) this.explode(rx, ry, 40, 100);

                this.destroy(rx, ry);
            } else {
                this.blacklist[rx][ry] = true;
            }
            
            // Burn baby burn
            if(d & FIRE || d & LAVA || d & BURNING) {
                this.infect(rx, ry, LIFE, BURNING);
                this.infect(rx, ry, C4, BURNING);
                
                if (Math.random() > 0.5) {
                    this.infect(rx, ry, OIL, BURNING);
                    this.infect(rx, ry, WATER, STEAM, WATER);
                }
            }
            
            if(d & SOLID || d & LIFE || d & C4) continue;

            // Chance that steam will condense + it will condense if it's surrounded by steam
            if(d & STEAM) {
                if(Math.random() > 0.9999) {
                    this.spawn(rx, ry, WATER);
                } else if(this.surrounded(rx, ry)) {
                    this.spawn(rx, ry, WATER);
                }
            }


            // Water baby... errr.... Water?
            if(d & WATER) {
                // Put out fires
                if(Math.random() > 0.5) {
                    this.runOnSurrounds(rx, ry, this.destroy, FIRE);
                    this.infect(rx, ry, BURNING, BURNING);
                }
            }

            var um = this.getMaterial(this.grid[rx][ry - 1]),
                uxDirm = this.getMaterial(this.grid[rx + xDir][ry - 1]);

            if(typeof um.density !== 'undefined' && typeof uxDirm.density !== 'undefined') {
                if(m.density < um.density) {
                    if(d & FIRE) {
                        this.swap(rx, ry, rx, ry -1);
                    } else if(Math.random() < 0.7) {
                        this.swap(rx, ry, rx + xDir, ry - 1);
                    } else if(Math.random() < 0.7){
                        this.swap(rx, ry, rx, ry -1);
                    }
                }
            }

            if(d & RESTING) continue;

            if(this.grid[rx][ry + 1] === 0)
                this.move(rx, ry, rx, ry + 1);

            // NB This code is paraphrased from http://pok5.de/elementdots/js/dots.js, so full credit where it's due. 
            if(m.liquid && rx + 3 < this.WIDTH && rx - 3 > 0) {
                var r1 = this.grid[rx+1][ry];
                var r2 = this.grid[rx+2][ry];
                var r3 = this.grid[rx+3][ry]; 
                var l1 = this.grid[rx-1][ry];
                var l2 = this.grid[rx-2][ry];
                var l3 = this.grid[rx-3][ry]; 
                var c = this.grid[rx][ry];

                var w = ((r1==c)?1:0) + ((r2==c)?1:0) + ((r3==c)?1:0) - ((l1==c)?1:0) - ((l2==c)?1:0) - ((l3==c)?1:0);

                if (w<=0 && Math.random()<0.5) {
                    if (r1===0 && this.grid[rx+1][ry-1] !== c) 
                        this.move(rx,ry,rx+1,ry);
                    else if (r2===0 && this.grid[rx+2][ry-1] !== c) 
                        this.move(rx,ry,rx+2,ry);
                    else if (r3===0 && this.grid[rx+3][ry-1] !== c) 
                        this.move(rx,ry,rx+3,ry);
                } else if (w>=0 && Math.random()<0.5) {
                    if (l1===0 && this.grid[rx-1][ry-1] !== c) 
                        this.move(rx,ry,rx-1,ry);
                    else if (l2===0 && this.grid[rx-2][ry-1] !== c) 
                        this.move(rx,ry,rx-2,ry);
                    else if (l3===0 && this.grid[rx-3][ry-1] !== c) 
                        this.move(rx,ry,rx-3,ry);
                }
            } else {
                if(this.grid[rx + xDir][ry + 1] === 0) {
                    //if(this.grid[x][ry] & SAND && Math.random() > 0.8) 
                        //this.grid[x][ry] |= RESTING;
                    //else 
                        this.move(rx, ry, rx + xDir, ry + 1);
                } else {
                    // Check if the particle should be RESTING
                    if(this.shouldLieDown(rx, ry)) {
                        this.grid[rx][ry] |= RESTING;
                    }
                }
            }
        }
    }

    this.clearBlacklist();

    for (e = 0; e < this.explosions.length; e++) {
        this.explosions[e].updated = false;
    }

    if(lived) {
        this.lifeTimer.reset();
        lived = false;
    }
};


Dust.prototype.draw = function() {
    var self = this;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    var material,
        color,
        vertexCount = 0;

    for (var x = 0; x < this.grid.length; x++) {
        for (var y = 0; y < this.grid[x].length; y++) {
            var s = this.grid[x][y];
    
            if(s === 0) continue;

            material = this.getMaterial(s);

            if(s & BURNING) 
                color = (Math.random() > 0.1) ? [material.bColors[0], material.bColors[1], material.bColors[2]] : [material.bColors[3], material.bColors[4], material.bColors[5]];
            else 
                color = material.color;

            var offset = vertexCount * 3 * 6;

            if(vertexCount < this.MAX_DUST) {
                this.sandVertexArray[offset]     = x;
                this.sandVertexArray[offset + 1] = y;
                this.sandVertexArray[offset + 2] = packColor(color);

                this.sandVertexArray[offset + 3] = x + 1;
                this.sandVertexArray[offset + 4] = y;
                this.sandVertexArray[offset + 5] = packColor(color);

                this.sandVertexArray[offset + 6] = x;
                this.sandVertexArray[offset + 7] = y + 1;
                this.sandVertexArray[offset + 8] = packColor(color);


                this.sandVertexArray[offset + 9]= x;
                this.sandVertexArray[offset + 10] = y + 1;
                this.sandVertexArray[offset + 11] = packColor(color);

                this.sandVertexArray[offset + 12] = x + 1;
                this.sandVertexArray[offset + 13] = y;
                this.sandVertexArray[offset + 14] = packColor(color);

                this.sandVertexArray[offset + 15] = x + 1;
                this.sandVertexArray[offset + 16] = y + 1;
                this.sandVertexArray[offset + 17] = packColor(color);

                vertexCount++;
            }
        }
    }

    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.sandVertexArray, this.gl.STATIC_DRAW);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, vertexCount * 6);
};

Dust.prototype.sandCollides = function(x, y) {
    if(this.grid[x][y] !== 0) 
        return true;
    else 
        return false;
};

Dust.prototype.spawnRect = function(x, y, w, h, type, infect) {
    var nType;

    if(infect) {
        nType = (INFECTANT | this.getType(type));
    } else {
        nType = this.getType(type) || SOLID;
    }
    
    for(var i = x; i < (x + w); i++) {
        for(var j = y; j < (y + h); j++) {
            if(!this.sandCollides(i, j)) {
                this.grid[i][j] |= nType;
                this.dustCount++;
            }
        }
    }
};

Dust.prototype.spawnCircle = function(x, y, type, brushSize, infect) {
    var radius = brushSize || 10;

    if(this.dustCount + radius >= this.MAX_DUST && type !== 'eraser') return;

    var nType,
        segments = 500,
        step = (2*Math.PI) / segments;
    
    if(infect && type !== 'eraser') {
        nType = (INFECTANT | this.getType(type));
    } else {
        nType = this.getType(type) || type;
    }

    for(var r = radius; r > 0; r--) {
        for(var i = 0; i < 2*Math.PI; i += step) {
            var spawnX = x + Math.floor(r*Math.sin(i)),
                spawnY = y + Math.floor(r*Math.cos(i));
            
            if(spawnX <= 0 || spawnY <= 0 || spawnX >= this.WIDTH - 1|| spawnY >= this.HEIGHT - 1) continue;

            if(nType !== 'eraser') {
                if(this.grid[spawnX][spawnY] === 0) this.dustCount++;
                this.grid[spawnX][spawnY] = nType;
            } else{
                if(this.grid[spawnX][spawnY] !== 0) {
                    this.dustCount--;
                    this.destroy(spawnX, spawnY);
                    this.wakeSurrounds(spawnX, spawnY);
                }
            }
        }
    }
};

Dust.prototype.spawnHollowCircle = function(x, y, type, radius) {
    if((x - radius) < 0 || (y - radius) < 0 || (x + radius) > this.WIDTH || (y + radius) > this.HEIGHT) return;

    var nType = this.getType(type) || type;

    for(var i = 0; i < 2*Math.PI; i += 0.01) {
        var spawnX = x + Math.floor(radius*Math.sin(i)),
            spawnY = y + Math.floor(radius*Math.cos(i));

        if(nType) {
            if(this.grid[spawnX][spawnY] === 0) this.dustCount++;
            this.grid[spawnX][spawnY] = nType;
        }
    }

};

// Returns numerical code for material type
Dust.prototype.getType = function(typeString) {
    switch(typeString) {
        case 'eraser':
            return 0;
        case 'sand':
            return SAND;
        case 'oil':
            return OIL;
        case 'fire':
            return FIRE;
        case 'lava':
            return LAVA;
        case 'water':
            return WATER;
        case 'solid':
            return SOLID;
        case 'spring':
            return SPRING;
        case 'volcanic':
            return VOLCANIC;
        case 'oil well':
            return OIL_WELL;
        case 'life':
            return LIFE;
        case 'C4':
            return C4;
        default:
            return 0;
    }
};

Dust.prototype.getMaterial = function(s) {
    if(s === 0) return this.materials.space;
    if(s & SAND)  return this.materials.sand;
    if(s & OIL)   return this.materials.oil;
    if(s & FIRE)  return this.materials.fire;
    if(s & WATER) return this.materials.water;
    if(s & STEAM) return this.materials.steam;
    if(s & LAVA) return this.materials.lava;
    if(s & LIFE) return this.materials.life;
    if(s & C4) return this.materials.C4;
    if(s & SOLID) return this.materials.solid;
};

// Returns true if the particle is surrounded by itself
Dust.prototype.surrounded = function(x, y) {
    if(this.grid[x][y] === (this.grid[x + 1][y] && this.grid[x - 1][y] && this.grid[x][y + 1] && 
       this.grid[x][y - 1] && this.grid[x + 1][y + 1] && this.grid[x + 1][y - 1] && this.grid[x - 1][y + 1] && this.grid[x - 1][y - 1]))
        return true;
    else
        return false;
};

// Returns true if particle is next to another with the flag
Dust.prototype.nextTo = function(x, y, flag) {
    var n = this.grid[x][y - 1],
        ne = this.grid[x + 1][y - 1],
        e = this.grid[x + 1][y],
        se = this.grid[x + 1][y + 1],
        s = this.grid[x][y + 1],
        sw = this.grid[x - 1][y + 1],
        w = this.grid[x - 1][y],
        nw = this.grid[x - 1][y - 1],
        d = this.grid[x][y];

    // Return true if it's not the current material
    if(flag === -1) {
        if(!(n & d)) return true;
        if(!(ne & d)) return true; 
        if(!(e & d)) return true; 
        if(!(se & d)) return true;
        if(!(s & d)) return true;
        if(!(sw & d)) return true;
        if(!(w & d)) return true;
        if(!(nw & d)) return true;
    } else if(flag === 0) {
        if(n === 0) return true;
        if(ne === 0) return true; 
        if(e === 0) return true; 
        if(se === 0) return true;
        if(s === 0) return true;
        if(sw === 0) return true;
        if(w === 0) return true;
        if(nw === 0) return true;
    } else {
        if(n & flag) return true;
        if(ne & flag) return true; 
        if(e & flag) return true; 
        if(se & flag) return true;
        if(s & flag) return true;
        if(sw & flag) return true;
        if(w & flag) return true;
        if(nw & flag) return true;
    }

    return false;
};

Dust.prototype.move = function(ox, oy, nx, ny) {
    if(nx === 0 || nx >= this.WIDTH - 1 || ny === 0 || ny >= this.HEIGHT - 1) return;

    var d = this.grid[ox][oy];

    this.grid[ox][oy] = 0;
    this.grid[nx][ny] = d;
    this.blacklist[nx][ny] = true;

    this.wakeSurrounds(ox, oy);
};

Dust.prototype.swap = function(x1, y1, x2, y2) {
    if(x2 === 0 || x2 >= this.WIDTH - 1 || y2 === 0 || y2 >= this.HEIGHT - 1) return;
    
    var d1 = this.grid[x1][y1];
    var d2 = this.grid[x2][y2];

    this.grid[x1][y1] = d2;
    this.grid[x2][y2] = d1;
    
    this.blacklist[x1][y1] = true;
    this.blacklist[x2][y2] = true;
};

Dust.prototype.countNeighbours = function(x, y, exclusive) {
    var d = this.grid[x][y],
        n = this.grid[x][y - 1],
        ne = this.grid[x + 1][y - 1],
        e = this.grid[x + 1][y],
        se = this.grid[x + 1][y + 1],
        s = this.grid[x][y + 1],
        sw = this.grid[x - 1][y + 1],
        w = this.grid[x - 1][y],
        nw = this.grid[x - 1][y - 1];

    var count = 0;

    if(exclusive) {
        // Then only count cells of the same type
        if(n === d) count++;
        if(ne === d) count++;
        if(e === d) count++;
        if(se === d) count++;
        if(s === d) count++;
        if(sw === d) count++;
        if(w === d) count++;
        if(nw === d) count++;
    } else {
        if(n !== 0) count++;
        if(ne !== 0) count++;
        if(e !== 0) count++;
        if(se !== 0) count++;
        if(s !== 0) count++;
        if(sw !== 0) count++;
        if(w !== 0) count++;
        if(nw !== 0) count++;
    } 

    return count;
};
// Wakes the surrounding particles
Dust.prototype.wakeSurrounds = function(x, y) {
    if(this.grid[x][y] & RESTING)     this.grid[x][y] ^= RESTING;
    if(this.grid[x][y - 1] & RESTING) this.grid[x][y - 1] ^= RESTING;
    if(this.grid[x + 1][y] & RESTING) this.grid[x + 1][y] ^= RESTING;
    if(this.grid[x][y + 1] & RESTING) this.grid[x][y + 1] ^= RESTING;
    if(this.grid[x - 1][y] & RESTING) this.grid[x - 1][y] ^= RESTING;
    if(this.grid[x + 1][y + 1] & RESTING) this.grid[x + 1][y + 1] ^= RESTING;
    if(this.grid[x - 1][y + 1] & RESTING) this.grid[x - 1][y + 1] ^= RESTING;
};

// Checks if this particle needs a nap
Dust.prototype.shouldLieDown = function(x, y) {
    if(!this.surrounded(x, y)) return false;

    while(y <= this.HEIGHT) {
        if(this.grid[x][y] & SOLID) {
            return true;
        } else if(this.grid[x][y] === 0) {
            return false;
        }
        
        y++;
    }
};

Dust.prototype.destroy = function(x, y) {
    this.grid[x][y] = 0;
    this.dustCount--;

    this.wakeSurrounds(x, y);
};

// 'Infects's' surrounding particles, toggling the second flag providing first is set
Dust.prototype.infect = function(x, y, flagSet, flagToSet, flagToRemove) {
    var n = this.grid[x][y - 1],
        ne = this.grid[x + 1][y - 1],
        e = this.grid[x + 1][y],
        se = this.grid[x + 1][y + 1],
        s = this.grid[x][y + 1],
        sw = this.grid[x - 1][y + 1],
        w = this.grid[x - 1][y],
        nw = this.grid[x - 1][y - 1];

    if(flagSet === -1) {
        // Infect ANYTHING apart from NOTHING
        if(n !== 0)  this.spawn(x, y - 1, flagToSet);
        if(ne !== 0) this.spawn(x + 1, y - 1, flagToSet);
        if(e !== 0)  this.spawn(x + 1, y, flagToSet);
        if(se !== 0) this.spawn(x + 1, y + 1, flagToSet);
        if(s !== 0)  this.spawn(x, y + 1, flagToSet);
        if(sw !== 0) this.spawn(x - 1, y + 1, flagToSet);
        if(w !== 0)  this.spawn(x - 1, y, flagToSet);
        if(nw !== 0) this.spawn(x - 1, y - 1, flagToSet);
    } else if (flagSet === 0) {
        // Infect just NOTHING (air)
        if(n === flagSet) this.spawn(x, y - 1, flagToSet);
        if(ne === flagSet) this.spawn(x + 1, y - 1, flagToSet);
        if(e === flagSet) this.spawn(x + 1, y, flagToSet);
        if(se === flagSet) this.spawn(x + 1, y + 1, flagToSet);
        if(s === flagSet) this.spawn(x, y + 1, flagToSet);
        if(sw === flagSet) this.spawn(x - 1, y + 1, flagToSet);
        if(w === flagSet) this.spawn(x - 1, y, flagToSet);
        if(nw === flagSet) this.spawn(x - 1, y - 1, flagToSet);
    } else {
        // Infect everything with the flag
        if(n & flagSet) this.grid[x][y - 1] |= flagToSet;
        if(ne & flagSet) this.grid[x + 1][y - 1] |= flagToSet;
        if(e & flagSet) this.grid[x + 1][y] |= flagToSet;
        if(se & flagSet) this.grid[x + 1][y + 1] |= flagToSet;
        if(s & flagSet) this.grid[x][y + 1] |= flagToSet;
        if(sw & flagSet) this.grid[x - 1][y + 1] |= flagToSet;
        if(w & flagSet) this.grid[x - 1][y] ^= flagToSet;
        if(nw & flagSet) this.grid[x - 1][y - 1] |= flagToSet;
    }

    // Remove an optional flag
    if(flagToRemove) {
        if(n & flagSet) this.grid[x][y - 1] &= ~flagToRemove;
        if(ne & flagSet) this.grid[x + 1][y - 1] &= ~flagToRemove;
        if(e & flagSet) this.grid[x + 1][y] &= ~flagToRemove;
        if(se & flagSet) this.grid[x + 1][y + 1] &= ~flagToRemove;
        if(s & flagSet) this.grid[x][y + 1] &= ~flagToRemove;
        if(sw & flagSet) this.grid[x - 1][y + 1] &= ~flagToRemove;
        if(w & flagSet) this.grid[x - 1][y] &= ~flagToRemove;
        if(nw & flagSet) this.grid[x - 1][y - 1] &= ~flagToRemove;
    }
};

// Runs a function on surrounding particles providing a flag is set
Dust.prototype.runOnSurrounds = function(x, y, f, flag) {
    var n = this.grid[x][y - 1],
        ne = this.grid[x + 1][y - 1],
        e = this.grid[x + 1][y],
        se = this.grid[x + 1][y + 1],
        s = this.grid[x][y + 1],
        sw = this.grid[x - 1][y + 1],
        w = this.grid[x - 1][y],
        nw = this.grid[x - 1][y - 1];

    if(flag) {
        if(n & flag)  f.call(this, x, y - 1);
        if(ne & flag) f.call(this, x + 1, y - 1);
        if(e & flag)  f.call(this, x + 1, y);
        if(se & flag) f.call(this, x + 1, y + 1);
        if(s & flag)  f.call(this, x, y + 1);
        if(sw & flag) f.call(this, x - 1, y + 1);
        if(w & flag)  f.call(this, x - 1, y);
        if(nw & flag) f.call(this, x - 1, y - 1);
    } else {
        f.call(this, x, y - 1);
        f.call(this, x + 1, y - 1);
        f.call(this, x + 1, y);
        f.call(this, x + 1, y + 1);
        f.call(this, x, y + 1);
        f.call(this, x - 1, y + 1);
        f.call(this, x - 1, y);
        f.call(this, x - 1, y - 1);
    }
};

// It's not even a hyperbolic name this time. This is the real deal.
Dust.prototype.explode = function(x, y, f, r) {
    var explosion = new Explosion(x, y, f, r);

    this.explosions.push(explosion);
};

Dust.prototype.clearBlacklist = function() {
    for (var x = 0; x < this.blacklist.length; x++) {
        for (var y = 0; y < this.blacklist[x].length; y++) {
            this.blacklist[x][y] = false;
        }
    }
};

Dust.prototype.spawn = function(x, y, type) {
    if(x === 0 || x === this.WIDTH - 1 || y === 0 || y === this.HEIGHT - 1) return;
    
    if(!(this.grid[x][y] & type) && this.dustCount <= this.MAX_DUST) {
        this.grid[x][y] = type;
        this.blacklist[x][y] = true;
        this.wakeSurrounds(x, y);
        this.dustCount++;
    }
};

// Compiles a shader program from given sources
Dust.prototype.getShaderProgram = function(vert, frag) {
    var vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER),
        fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);

    this.gl.shaderSource(vertexShader, vert);
    this.gl.shaderSource(fragmentShader, frag);

    this.gl.compileShader(vertexShader);
    this.gl.compileShader(fragmentShader);

    if(!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
        console.error("Vertex shader won't compile mate: ", this.gl.getShaderInfoLog(vertexShader));
    }
    
    if(!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
        console.error("Fragment shader won't compile mate: ", this.gl.getShaderInfoLog(fragmentShader));
    }

    var program = this.gl.createProgram();

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    return program;
};

Dust.prototype.setUniforms = function() {
    this.uModelViewProjectionMatrix = this.gl.getUniformLocation(this.shaderProgram, 'modelViewProjectionMatrix');
};

Dust.prototype.setSandBuffers = function() {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.dustBuffer);
};

Dust.prototype.loadIdentity = function() {
    this.modelViewMatrix = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
};

Dust.prototype.mvTranslate = function(x, y) {
    this.modelViewMatrix[6] = x;
    this.modelViewMatrix[7] = y;
};

Dust.prototype.mvScale = function(xs, ys) {
    this.modelViewMatrix[0] = xs;
    this.modelViewMatrix[4] = ys;
};

Dust.prototype.saveLevel = function(name) {
    $.ajax({
        type: "POST",
        url: "/saveLevel/" + name,
        contentType: 'application/json',
        data: JSON.stringify(this.grid),
        success: function(data) {
            console.log(data);
        }
    });
};

Dust.prototype.loadLevel = function(name) {
    var self = this;

    $.get("/loadLevel/" + name, function(grid) {
        self.grid = JSON.parse(grid);
        self.paused = true;
    });
};

// Assorted functions
function Array2D(w, h) {
    var array = [];

    for (var x = 0; x < w; x++) {
        array[x] = [];
        for (var y = 0; y < h; y++) {
            array[x][y] = 0;
        }
    }

    return array;
}

function makeProjectionMatrix(width, height) {
    return [
        2 / width, 0,          0,
        0,        -2 / height, 0,
       -1,         1,          1
    ];
}


// Yeah I did steal this one. How did you know?
function matrixMultiply(a, b) {
  var a00 = a[0*3+0];
  var a01 = a[0*3+1];
  var a02 = a[0*3+2];
  var a10 = a[1*3+0];
  var a11 = a[1*3+1];
  var a12 = a[1*3+2];
  var a20 = a[2*3+0];
  var a21 = a[2*3+1];
  var a22 = a[2*3+2];
  var b00 = b[0*3+0];
  var b01 = b[0*3+1];
  var b02 = b[0*3+2];
  var b10 = b[1*3+0];
  var b11 = b[1*3+1];
  var b12 = b[1*3+2];
  var b20 = b[2*3+0];
  var b21 = b[2*3+1];
  var b22 = b[2*3+2];
  return [a00 * b00 + a01 * b10 + a02 * b20,
          a00 * b01 + a01 * b11 + a02 * b21,
          a00 * b02 + a01 * b12 + a02 * b22,
          a10 * b00 + a11 * b10 + a12 * b20,
          a10 * b01 + a11 * b11 + a12 * b21,
          a10 * b02 + a11 * b12 + a12 * b22,
          a20 * b00 + a21 * b10 + a22 * b20,
          a20 * b01 + a21 * b11 + a22 * b21,
          a20 * b02 + a21 * b12 + a22 * b22];
}

// Credit to 'AHM' on StackOverflow
function packColor(color) {
    return color[0] + color[1] * 256 + color[2] * 256 * 256;
}
