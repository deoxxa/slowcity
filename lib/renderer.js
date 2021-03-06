var defaults = require("lodash.defaults");

var Renderer = module.exports = function Renderer(options) {
  options = options || {};

  defaults(options, {
    width: 640,
    height: 400,
    renderZones: true,
    renderRoads: true,
  });

  if (!options.map) {
    throw Error("map property required");
  }

  this.map = options.map;

  var el = this.el = document.createElement("canvas");

  (options.container || document.body).appendChild(el);

  this.width = el.width = options.width;
  this.height = el.height = options.height;

  this.ctx = el.getContext("2d");

  this.afr = null;

  this.cursorX = 0;
  this.cursorY = 0;
  this.scrollX = 0;
  this.scrollY = 0;
  this.scrollXMax = (this.map.width  * 8) - this.width;
  this.scrollYMax = (this.map.height * 8) - this.height;
  this.selectActive = false;
  this.selectX = 0;
  this.selectY = 0;
  this.selectW = 0;
  this.selectH = 0;

  this.inputText = "";
  this.inputIndex = 0;

  this.debug = !!options.debug;
  this.debugText = "";
  this.fts = [0,0,0,0,0,0,0,0,0,0];
  this.fti = 0;
  this.fta = 0;

  this.renderZones = options.renderZones;
  this.renderRoads = options.renderRoads;

  this.frameTime = 0;
};

Renderer.prototype.spriteInfo = {"road.2.v":{"x":27,"y":21,"w":1,"h":1},"road.2.h":{"x":26,"y":23,"w":1,"h":1},"road.2.bl":{"x":21,"y":25,"w":1,"h":1},"road.2.tl":{"x":21,"y":21,"w":1,"h":1},"road.2.tr":{"x":25,"y":21,"w":1,"h":1},"road.2.br":{"x":25,"y":25,"w":1,"h":1},"road.3.l":{"x":27,"y":23,"w":1,"h":1},"road.3.r":{"x":25,"y":23,"w":1,"h":1},"road.3.t":{"x":23,"y":21,"w":1,"h":1},"road.3.b":{"x":23,"y":25,"w":1,"h":1},"road.4.a":{"x":27,"y":19,"w":1,"h":1},"power.2.h":{"x":18,"y":8,"w":1,"h":1},"power.2.v":{"x":17,"y":9,"w":1,"h":1},"power.3.l":{"x":17,"y":10,"w":1,"h":1},"power.3.r":{"x":21,"y":10,"w":1,"h":1},"power.3.b":{"x":19,"y":12,"w":1,"h":1},"power.3.top":{"x":19,"y":8,"w":1,"h":1},"power.4.a":{"x":19,"y":10,"w":1,"h":1}};
Renderer.prototype.spriteInfoRoad = {"0":"road.4.a","16":"road.2.h","32":"road.2.h","48":"road.2.h","64":"road.2.v","80":"road.2.br","96":"road.2.bl","112":"road.3.b","128":"road.2.v","144":"road.2.tr","192":"road.2.v","160":"road.2.tl","176":"road.3.t","208":"road.3.l","224":"road.3.r","240":"road.4.a"};

Renderer.prototype.setDimensions = function setDimensions(width, height) {
  this.width = this.el.width = width;
  this.height = this.el.height = height;
};

Renderer.prototype.splash = function splash() {
  this.ctx.save();
  this.ctx.fillStyle = "#FFFFFF";
  this.ctx.fillRect(0, 0, this.width, this.height);
  this.ctx.restore();
};

Renderer.prototype.error = function error(message) {
  this.ctx.save();

  var fontSize = 14,
      padding = 4;

  this.ctx.font = fontSize + "px sans-serif";

  var m = this.ctx.measureText(message);

  this.ctx.fillStyle = "#200000";
  this.ctx.fillRect(0, 0, this.width, this.height);

  this.ctx.fillStyle = "#000000";
  this.ctx.fillRect(
    this.width / 2 - m.width / 2 - padding / 2,
    this.height / 2 - fontSize / 2 - padding / 2,
    m.width + padding * 2,
    fontSize + padding * 2
  )

  this.ctx.fillStyle = "#FF0000";
  this.ctx.fillText(message, this.width / 2 - m.width / 2, this.height / 2 + fontSize - padding);

  this.ctx.restore();
};

Renderer.prototype.loadTiles = function loadTiles(src, cb) {
  var self = this;

  var img = document.createElement("img");
  img.src = src;

  img.addEventListener("error", function() {
    return cb(Error("couldn't load tiles"));
  });

  img.addEventListener("load", function() {
    var canvas = document.createElement("canvas");
    canvas.height = img.height;
    canvas.width = img.width;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    for (var k in self.spriteInfo) {
      self.spriteInfo[k].data = ctx.getImageData(self.spriteInfo[k].x*8, self.spriteInfo[k].y*8, self.spriteInfo[k].w*8, self.spriteInfo[k].h*8);
    }

    return cb();
  });
};

Renderer.prototype.renderFrame = function renderFrame(t, done) {
  if (this.debug && this.frameTime) {
    this.fts[(this.fti+1)%10] = t - this.frameTime;
    this.fti = (this.fti+1) % 10;

    var fta = 0;
    for (var i=0;i<10;i++) {
      fta += this.fts[i] / 1000;
    }
    this.fta = fta / 10;
  }

  this.frameTime = t;

  this.ctx.save();

  this.ctx.fillStyle = "#505050";
  this.ctx.fillRect(0, 0, this.width, this.height);

  var ox = Math.floor(this.scrollX / 8),
      oy = Math.floor(this.scrollY / 8);

  if (this.renderZones) {
    var zr = [],
        zc = [],
        zi = [];

    for (var x=0;x<this.width/8;x++) {
      for (var y=0;y<this.height/8;y++) {
        switch (this.map.getZone(ox + x, oy + y)) {
        case 1:
          zr.push([x, y]); break;
        case 2:
          zc.push([x, y]); break;
        case 3:
          zi.push([x, y]); break;
        }
      }
    }

    var lxo = Math.floor(this.frameTime / 50) % 16,
        lyo = Math.floor(this.frameTime / 50) % 16,
        lxe = (Math.floor(this.frameTime / 50) + 8) % 16,
        lye = (Math.floor(this.frameTime / 50) + 8) % 16;

    var lxoa = Math.max(0, lxo-8),
        lxob = Math.min(8, lxo),
        lyoa = Math.min(8, lyo),
        lyob = Math.max(0, lyo-8),
        lxea = Math.max(0, lxe-8),
        lxeb = Math.min(8, lxe),
        lyea = Math.min(8, lye),
        lyeb = Math.max(0, lye-8);

    if (zr.length) {
      this.ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
      this.ctx.beginPath();
      for (var i=0;i<zr.length;i++) {
        if ((zr[i][0] & 1) === (zr[i][1] & 1)) {
          this.ctx.moveTo(zr[i][0]*8+lxea, zr[i][1]*8+lyea);
          this.ctx.lineTo(zr[i][0]*8+lxeb, zr[i][1]*8+lyeb);
        } else {
          this.ctx.moveTo(zr[i][0]*8+lxoa, zr[i][1]*8+lyoa);
          this.ctx.lineTo(zr[i][0]*8+lxob, zr[i][1]*8+lyob);
        }
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }

    if (zc.length) {
      this.ctx.strokeStyle = "rgba(0, 0, 255, 0.5)";
      this.ctx.beginPath();
      for (var i=0;i<zc.length;i++) {
        if ((zc[i][0] & 1) === (zc[i][1] & 1)) {
          this.ctx.moveTo(zc[i][0]*8+lxea, zc[i][1]*8+lyea);
          this.ctx.lineTo(zc[i][0]*8+lxeb, zc[i][1]*8+lyeb);
        } else {
          this.ctx.moveTo(zc[i][0]*8+lxoa, zc[i][1]*8+lyoa);
          this.ctx.lineTo(zc[i][0]*8+lxob, zc[i][1]*8+lyob);
        }
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }

    if (zi.length) {
      this.ctx.strokeStyle = "rgba(255, 180, 0, 0.5)";
      this.ctx.beginPath();
      for (var i=0;i<zi.length;i++) {
        if ((zi[i][0] & 1) === (zi[i][1] & 1)) {
          this.ctx.moveTo(zi[i][0]*8+lxea, zi[i][1]*8+lyea);
          this.ctx.lineTo(zi[i][0]*8+lxeb, zi[i][1]*8+lyeb);
        } else {
          this.ctx.moveTo(zi[i][0]*8+lxoa, zi[i][1]*8+lyoa);
          this.ctx.lineTo(zi[i][0]*8+lxob, zi[i][1]*8+lyob);
        }
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }
  }

  if (this.renderRoads) {
    for (var x=0;x<this.width/8;x++) {
      for (var y=0;y<this.height/8;y++) {
        var road = this.map.getRoad(ox + x, oy + y);

        if (road & 0x01) {
          this.ctx.putImageData(this.spriteInfo[this.spriteInfoRoad[road & 0xf0]].data, x*8, y*8);
        }
      }
    }
  }

  this.ctx.strokeStyle = "rgba(255, 0, 0, 1)";
  this.ctx.lineWidth = 1;
  this.ctx.strokeRect((this.cursorX-ox)*8, (this.cursorY-oy)*8, 8, 8);

  if (this.selectActive) {
    var d1 = Math.floor(this.frameTime / 250) & 1 ? 2 : 0,
        d2 = d1 ? 0 : 2;
    this.ctx.setLineDash([d1, d2, d2, d1]);
    this.ctx.strokeRect((this.selectX-ox)*8, (this.selectY-oy)*8, this.selectW*8, this.selectH*8);
  }

  this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
  this.ctx.fillRect(0, this.height - 14, this.width, 14);

  var m = this.ctx.measureText("> " + this.inputText.substr(0, this.inputIndex));
  this.ctx.strokeStyle = "rgba(255, 255, 255, " + Math.abs(((this.frameTime / 1000) % 1.2) - 0.5) + ")";
  this.ctx.beginPath();
  this.ctx.moveTo(m.width + 4, this.height - 12);
  this.ctx.lineTo(m.width + 4, this.height - 2);
  this.ctx.closePath();
  this.ctx.stroke();

  this.ctx.fillStyle = "#FF0000";
  this.ctx.fillText("> " + this.inputText, 3, this.height - 3);

  this.ctx.restore();

  if (this.debug) {
    this.renderDebug();
  }

  return done();
};

Renderer.prototype.renderDebug = function renderDebug() {
  this.ctx.save();

  var text = this.scrollX + "," + this.scrollY + " : " + Math.round(1 / this.fta) + " fps" + this.debugText;
  var m = this.ctx.measureText(text);

  this.ctx.fillStyle = "#000000";
  this.ctx.fillRect(0, 0, m.width + 6, 14);
  this.ctx.fillStyle = "#FF0000";
  this.ctx.fillText(text, 3, 10);

  this.ctx.restore();
};

Renderer.prototype.start = function start() {
  var self = this;

  var f = function(t) {
    self.renderFrame(t, function() {
      self.afr = requestAnimationFrame(f);
    });
  };

  this.afr = requestAnimationFrame(f);

  return this;
};

Renderer.prototype.stop = function stop() {
  var afr = self.afr;
  self.afr = null;
  cancelAnimationFrame(afr);

  return this;
};
