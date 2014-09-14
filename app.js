(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var defaults = require("lodash.defaults");

var Map = module.exports = function Map(options) {
  options = options || {};

  defaults(options, {
    width: 200,
    height: 200,
  });

  this.width = options.width;
  this.height = options.height;

  this.zoneData = new Uint8Array(new ArrayBuffer(this.width * this.height));
  this.roadData = new Uint8Array(new ArrayBuffer(this.width * this.height));
};

Map.prototype.getZone = function getZone(x, y) {
  return this.zoneData[x * this.width + y];
};

Map.prototype.setZone = function setZone(x, y, zone) {
  this.zoneData[x * this.width + y] = zone;
};

Map.prototype.getRoad = function getRoad(x, y) {
  return this.roadData[x * this.width + y];
};

Map.prototype.setRoad = function setRoad(x, y, road) {
  if (x < this.width - 1) {
    if (road) {
      this.roadData[(x + 1) * this.width + y] |= 0x10;
    } else {
      this.roadData[(x + 1) * this.width + y] &= 0xef;
    }
  }

  if (x > 0) {
    if (road) {
      this.roadData[(x - 1) * this.width + y] |= 0x20;
    } else {
      this.roadData[(x - 1) * this.width + y] &= 0xdf;
    }
  }

  if (y < this.height - 1) {
    if (road) {
      this.roadData[x * this.width + (y + 1)] |= 0x40;
    } else {
      this.roadData[x * this.width + (y + 1)] &= 0xbf;
    }
  }

  if (y > 0) {
    if (road) {
      this.roadData[x * this.width + (y - 1)] |= 0x80;
    } else {
      this.roadData[x * this.width + (y - 1)] &= 0x7f;
    }
  }

  if (road) {
    this.roadData[x * this.width + y] |= 0x01;
  } else {
    this.roadData[x * this.width + y] &= 0xfe;
  }
};

},{"lodash.defaults":8}],2:[function(require,module,exports){
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

},{"lodash.defaults":8}],3:[function(require,module,exports){
var LISP = require("LISP.js");

var UI = module.exports = function UI(options) {
  options = options || {};

  if (!options.renderer) {
    throw Error("renderer option must be supplied");
  }

  this.ctx = new LISP.Context();
  for (var k in this.procedures) {
    this.ctx.attach(k, this.procedures[k].bind(this));
  }

  this.mouseEnabled = true;

  this.renderer = options.renderer;
  this.map = options.map;

  this.history = [];
  this.historyIndex = 0;
};

UI.prototype.procedures = {
  printf: function print(args, env) {
    var res = [];

    for (var i=0;i<args.length;++i) {
      res[i] = this.ctx.exec(args[i], env);
    }

    console.log.apply(console, res);

    return {
      type: "boolean",
      value: false,
    };
  },
  index: function index(args, env) {
    var i = this.ctx.exec(args[0], env),
        a = this.ctx.exec(args[1], env);

    if (i.type !== "number") {
      throw new Error("invalid index type in index");
    }

    if (a.type !== "list") {
      throw new Error("invalid list type in index");
    }

    return this.ctx.exec(a.cells[i.value]);
  },
  concatenate: function concatenate(args, env) {
    var self = this;

    return [].concat.apply([], args);
  },
  debug: function debug(args, env) {
    if (args.length > 0) {
      this.renderer.debug = this.ctx.exec(args[0], env).value;
    }

    return {
      type: "boolean",
      value: this.renderer.debug,
    };
  },
  mouse: function mouse(args, env) {
    if (args.length > 0) {
      this.mouseEnabled = this.ctx.exec(args[0], env).value;
    }

    return {
      type: "boolean",
      value: this.mouseEnabled,
    };
  },
  history: function history(args, env) {
    return {
      type: "list",
      eval: false,
      cells: this.history.map(function(e) {
        return {type: "string", value: e};
      }),
    };
  },
  cursor: function cursor(args, env) {
    if (args.length === 2) {
      this.renderer.cursorX = this.ctx.exec(args[0], env).value;
      this.renderer.cursorY = this.ctx.exec(args[1], env).value;
    }

    return {
      type: "list",
      eval: false,
      cells: [
        {type: "number", value: this.renderer.cursorX},
        {type: "number", value: this.renderer.cursorY},
      ],
    };
  },
  select: function select(args, env) {
    if (args.length === 4) {
      this.renderer.selectActive = true;
      this.renderer.selectX = this.ctx.exec(args[0], env).value;
      this.renderer.selectY = this.ctx.exec(args[1], env).value;
      this.renderer.selectW = this.ctx.exec(args[2], env).value;
      this.renderer.selectH = this.ctx.exec(args[3], env).value;
    } else if (args.length === 1) {
      this.renderer.selectActive = !!this.ctx.exec(args[0], env).value;
    }

    return {
      type: "list",
      eval: false,
      cells: [
        {type: "boolean", value: this.renderer.selectActive},
        {type: "number", value: this.renderer.selectX},
        {type: "number", value: this.renderer.selectY},
        {type: "number", value: this.renderer.selectW},
        {type: "number", value: this.renderer.selectH},
      ],
    };
  },
  zone: function zone(args, env) {
    var x = this.ctx.exec(args[0], env),
        y = this.ctx.exec(args[1], env),
        w = this.ctx.exec(args[2], env),
        h = this.ctx.exec(args[3], env),
        type = this.ctx.exec(args[4], env);

    if (x.type !== "number") {
      throw new Error("invalid x type in zone function");
    }

    if (y.type !== "number") {
      throw new Error("invalid y type in zone function");
    }

    if (w.type !== "number") {
      throw new Error("invalid w type in zone function");
    }

    if (h.type !== "number") {
      throw new Error("invalid h type in zone function");
    }

    if (type.type !== "number") {
      throw new Error("invalid zone type in zone function");
    }

    for (var i=0;i<w.value;i++) {
      for (var j=0;j<h.value;j++) {
        this.map.setZone(x.value+i, y.value+j, type.value);
      }
    }

    return {
      type: "boolean",
      value: false,
    };
  },
  road: function road(args, env) {
    var x = this.ctx.exec(args[0], env),
        y = this.ctx.exec(args[1], env),
        w = this.ctx.exec(args[2], env),
        h = this.ctx.exec(args[3], env),
        state = this.ctx.exec(args[4], env);

    if (x.type !== "number") {
      throw new Error("invalid x type in zone function");
    }

    if (y.type !== "number") {
      throw new Error("invalid y type in zone function");
    }

    if (w.type !== "number") {
      throw new Error("invalid w type in zone function");
    }

    if (h.type !== "number") {
      throw new Error("invalid h type in zone function");
    }

    if (state.type !== "boolean") {
      throw new Error("invalid state type in zone function");
    }

    for (var i=0;i<w.value;i++) {
      for (var j=0;j<h.value;j++) {
        this.map.setRoad(x.value+i, y.value+j, state.value);
      }
    }

    return {
      type: "boolean",
      value: false,
    };
  },
};

UI.prototype.attachEvents = function attachEvents() {
  var self = this;

  var keycodes = {
    "8":   "backspace",
    "13":  "enter",
    "27":  "escape",
    "37":  "left",
    "38":  "up",
    "39":  "right",
    "40":  "down",
    "186": ";",
    "187": "=",
    "188": ",",
    "189": "-",
    "190": ".",
    "191": "/",
    "192": "`",
    "219": "[",
    "220": "\\",
    "221": "]",
    "222": "'",
  };

  "abcdefghijklmnopqrstuvwxyz1234567890 ".toUpperCase().split('').forEach(function(e) {
    keycodes[e.charCodeAt(0)] = e.toLowerCase();
  });

  var upper = {
    ";":  ":",
    "=":  "+",
    ",":  "<",
    "-":  "_",
    ".":  ">",
    "/":  "?",
    "`":  "~",
    "[":  "{",
    "\\": "|",
    "]":  "}",
    "'":  "\"",
    "1":  "!",
    "2":  "@",
    "3":  "#",
    "4":  "$",
    "5":  "%",
    "6":  "^",
    "7":  "&",
    "8":  "*",
    "9":  "(",
    "0":  ")",
  };

  window.addEventListener("keydown", function(ev) {
    if (ev.metaKey === true) {
      return;
    }

    var c = keycodes[ev.keyCode];

    if (!c) {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    if (c === "up" || c === "down") {
      if (c === "up") {
        if (self.historyIndex === null) {
          self.historyIndex = 0;
        } else if (self.historyIndex < self.history.length - 1) {
          self.historyIndex++;
        }
      } else if (c === "down") {
        if (self.historyIndex === null || self.historyIndex === 0) {
          self.historyIndex = null;
        } else {
          self.historyIndex--;
        }
      }

      if (self.historyIndex === null || self.history.length === 0) {
        self.renderer.inputText = "";
        self.renderer.inputIndex = 0;
      } else {
        self.renderer.inputText = self.history[self.historyIndex];
        self.renderer.inputIndex = self.renderer.inputText.length;
      }

      return;
    }

    if (c === "enter") {
      self.historyIndex = null;

      var inputText = self.renderer.inputText;

      self.renderer.inputText = "";
      self.renderer.inputIndex = 0;

      var res = self.exec(inputText);

      if (res.success) {
        console.log(res.result);

        if (self.history[0] !== inputText) {
          self.history.unshift(inputText);
        }
      } else {
        console.warn(res.error);
      }

      return;
    }

    if (c === "backspace") {
      if (self.renderer.inputIndex > 0) {
        self.renderer.inputText = self.renderer.inputText.substr(0, self.renderer.inputIndex - 1) + self.renderer.inputText.substr(self.renderer.inputIndex);
        self.renderer.inputIndex--;
      }

      return;
    }

    if (c === "right") {
      if (self.renderer.inputIndex < self.renderer.inputText.length) {
        self.renderer.inputIndex++;
      }

      return;
    }

    if (c === "left") {
      if (self.renderer.inputIndex > 0) {
        self.renderer.inputIndex--;
      }

      return;
    }

    if (ev.shiftKey) {
      c = upper[c] || c.toUpperCase();
    }

    self.renderer.inputText = self.renderer.inputText.substr(0, self.renderer.inputIndex) + c + self.renderer.inputText.substr(self.renderer.inputIndex);
    self.renderer.inputIndex++;
  });

  var selecting = false;
  var originX = 0,
      originY = 0;

  this.renderer.el.addEventListener("mousemove", function(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    if (!self.mouseEnabled) {
      return;
    }

    var ax = self.renderer.scrollX + ev.offsetX,
        ay = self.renderer.scrollY + ev.offsetY;

    var tx = Math.floor(ax / 8),
        ty = Math.floor(ay / 8);

    self.renderer.cursorX = tx;
    self.renderer.cursorY = ty;

    if (selecting) {
      self.renderer.selectActive = true;

      if (tx < originX) {
        self.renderer.selectX = tx;
      } else {
        self.renderer.selectX = originX;
      }
      if (ty < originY) {
        self.renderer.selectY = ty;
      } else {
        self.renderer.selectY = originY;
      }

      self.renderer.selectW = Math.abs(originX - tx) + 1;
      self.renderer.selectH = Math.abs(originY - ty) + 1;
    }
  });

  this.renderer.el.addEventListener("mousedown", function(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    if (!self.mouseEnabled) {
      return;
    }

    selecting = true;

    self.renderer.selectActive = false;

    originX = self.renderer.cursorX;
    originY = self.renderer.cursorY;
  });

  this.renderer.el.addEventListener("mouseup", function(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    if (!self.mouseEnabled) {
      return;
    }

    selecting = false;
  });

  this.renderer.el.addEventListener("wheel", function(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    if (!self.mouseEnabled) {
      return;
    }

    if (Math.abs(ev.wheelDeltaX) > Math.abs(ev.wheelDeltaY)) {
      self.renderer.scrollX -= ev.wheelDeltaX;
    } else if (Math.abs(ev.wheelDeltaY) > Math.abs(ev.wheelDeltaX)) {
      self.renderer.scrollY -= ev.wheelDeltaY;
    } else {
      self.renderer.scrollX -= ev.wheelDeltaX;
      self.renderer.scrollY -= ev.wheelDeltaY;
    }

    self.renderer.scrollX = Math.min(self.renderer.scrollXMax, Math.max(0, self.renderer.scrollX));
    self.renderer.scrollY = Math.min(self.renderer.scrollYMax, Math.max(0, self.renderer.scrollY));
  });
};

UI.prototype.exec = function exec(text) {
  try {
    var res = this.ctx.exec(text);
  } catch (e) {
    return {
      success: false,
      error: e,
    };
  }

  return {
    success: true,
    result: res,
  };
};

},{"LISP.js":5}],4:[function(require,module,exports){
var Map = require("./map"),
    Renderer = require("./renderer"),
    UI = require("./ui");

window.addEventListener("load", function() {
  var map = new Map();

  var renderer = new Renderer({
    map: map,
    width: window.innerWidth - 10,
    height: window.innerHeight - 10,
  });

  var ui = new UI({
    map: map,
    renderer: renderer,
  });

  renderer.splash();

  renderer.loadTiles("tiles.gif", function(err) {
    if (err) {
      return renderer.error(err);
    }

    ui.attachEvents();
    renderer.start();

    ui.ctx.exec("(defun rselect (w h) (let (('p (cursor))) (select (index 0 p) (index 1 p) w h)))");
    ui.ctx.exec("(defun szone (z) (let (('s (select))) (zone (index 1 s) (index 2 s) (index 3 s) (index 4 s) z)))");
  });

  window.addEventListener("resize", function() {
    renderer.setDimensions(window.innerWidth - 10, window.innerHeight - 10);
  });
});

},{"./map":1,"./renderer":2,"./ui":3}],5:[function(require,module,exports){
"use strict";

exports.parser = require('./parser');
exports.Context = require('./context');

},{"./context":6,"./parser":7}],6:[function(require,module,exports){
"use strict";

var parser = require('./parser');

var Context = function Context() {
	this.globalenv = Object.create(null);

	for (var k in builtins) {
		this.attach(k, builtins[k]);
	}
};

Context.prototype.attach = function attach(name, fn) {
	this.globalenv[name] = {
		type: "function",
		name: name,
		fn: fn,
	};
};

Context.prototype.exec = function(expr, env) {
	if (typeof expr === "string") {
		expr = parser.parse(expr);
	}

	if (expr.type === "string" || expr.type === "number" || expr.type === "boolean") {
		return expr;
	}

	if (!env) {
		env = this.globalenv;
	}

	if (expr.type === "symbol") {
		if (expr.eval === false) {
			return expr;
		}

		if (expr.name in env) {
			return env[expr.name];
		}

		throw new Error("tried to access undefined symbol `" + expr.name + "'");
	}

	if (expr.type !== "list") {
		throw new Error("invalid expression type: " + expr.type);
	}

	if (expr.eval === false) {
		return expr.cells;
	}

	var fn = this.exec(expr.cells[0], env),
	    args = expr.cells.slice(1);

	if (typeof fn !== "object" || fn.type !== "function") {
		throw new Error("tried to call a non-function");
	}

	return fn.fn.call(this, args, env);
};

var builtins = {
	'defun': function(args, env) {
		var fname = args[0],
				fargs = args[1],
				fbody = args.slice(2);

		if (typeof fname !== "object" || fname.type !== "symbol") {
			throw new Error("the name parameter of a defun statement must be a symbol");
		}

		if (typeof fargs !== "object" || fargs.type !== "list") {
			throw new Error("the argument list parameter of a defun statement must be a list");
		}

		for (var i=0;i<fargs.cells.length;i++) {
			if (typeof fargs.cells[i] !== "object" || fargs.cells[i].type !== "symbol") {
				throw new Error("all elements of a defun argument list must be symbols");
			}
		}

		var fn = function(_args, env) {
			var _env = Object.create(env),
					res = false;

			for (var i = 0; i < fargs.cells.length; i++) {
				_env[fargs.cells[i].name] = this.exec(_args[i], _env);
			}

			for (var j = 0; j < fbody.length; j++) {
				res = this.exec(fbody[j], _env);
			}

			return res;
		};

		var res = {
			type: "function",
			name: fname.name,
			fn: fn,
		};

		env[fname.name] = res;

		return res;
	},

	'if': function(args, env) {
		var res = {
			type: "boolean",
			value: false,
		};

		if (this.exec(args[0], env).value !== false) {
			res = this.exec(args[1], env);
		}	else if (args[2]) {
			res = this.exec(args[2], env);
		}

		return res;
	},

	'setq': function(args, env) {
		var res = null;

		for (var i = 0; i < args.length; i += 2) {
			if (args[i].type !== "symbol") {
				throw new Error("tried to assign to a non-symbol in setq");
			}

			res = env[args[i].name] = this.exec(args[i+1], env);
		}

		return res;
	},

	'let': function(args, env) {
		var sym = this.exec(args[0].cells[0].cells[0], env);

		if (typeof sym !== "object" || sym.type !== "symbol") {
			throw new Error("tried assign something to a non-symbol");
		}

		env[sym.name] = this.exec(args[0].cells[0].cells[1], env);

		return this.exec(args[1], env);
	},

	'+': function(args, env) {
		var res = this.exec(args[0], env).value;

		for (var i = 1; i < args.length; i++) {
			res += this.exec(args[i], env).value;
		}

		return {type: "number", value: res};
	},

	'-': function(args, env) {
		var res = this.exec(args[0], env).value;

		for (var i = 1; i < args.length; i++) {
			res -= this.exec(args[i], env).value;
		}

		return {type: "number", value: res};
	},

	'*': function(args, env) {
		var res = 1;

		for (var i = 0; i < args.length; i++) {
			res *= this.exec(args[i], env).value;
		}

		return {type: "number", value: res};
	},

	'/': function(args, env) {
		var res = this.exec(args[0], env).value;

		for (var i = 1; i < args.length; i++) {
			res /= this.exec(args[i], env).value;
		}

		return {type: "number", value: res};
	},

	// gonometry
	'cos': function(args, env) {
		return {
			type: "number",
			value: Math.cos(this.exec(args[0], env).value),
		};
	},

	'sin': function(args, env) {
		return {
			type: "number",
			value: Math.sin(this.exec(args[0], env).value),
		};
	},

	'tan': function(args, env) {
		return {
			type: "number",
			value: Math.tan(this.exec(args[0], env).value),
		};
	},

	// comparison
	'<=': function(a, env) {
		return {
			type: "boolean",
			value: this.exec(a[0], env).value <= this.exec(a[1], env).value,
		};
	},
	'<': function(a, env) {
		return {
			type: "boolean",
			value: this.exec(a[0], env).value < this.exec(a[1], env).value,
		};
	},
	'>=': function(a, env) {
		return {
			type: "boolean",
			value: this.exec(a[0], env).value >= this.exec(a[1], env).value,
		};
	},
	'>': function(a, env) {
		return {
			type: "boolean",
			value: this.exec(a[0], env).value > this.exec(a[1], env).value,
		};
	},
	'=': function(a, env) {
		return {
			type: "boolean",
			value: this.exec(a[0], env).value == this.exec(a[1], env).value,
		};
	},
	'eq': function(a, env) {
		return {
			type: "boolean",
			value: this.exec(a[0], env).value === this.exec(a[1], env).value,
		};
	},

	// logical
	'not': function(args, env) {
		return {
			type: "boolean",
			value: !this.exec(args[0], env).value,
		};
	},

	'and': function(args, env) {
		var res = {
			type: "boolean",
			value: false,
		};

		for (var i = 0; i < args.length; i++) {
			res = this.exec(args[i], env);

			if (res.type === "boolean" && res.value === false) {
				return res;
			}
		}

		return res;
	},

	'or': function(args, env) {
		var res = {
			type: "boolean",
			value: false,
		};

		for (var i = 0; i < args.length; i++) {
			res = this.exec(args[i], env);

			if (res.type !== "boolean" || res.value !== false) {
				return res;
			}
		}

		return res;
	},

	// stuff

	'list': function(args, env) {
		var self = this;

		var res = [];
		for (var i=0;i<args.length;i++) {
			res.push(self.exec(args[i], env));
		}

		return res;
	},

	'progn': function(args, env) {
		var _args = {
			type: "list",
			cells: [{type: "symbol", eval: true, name: "list"}].concat(args),
		};

		var res = this.exec(_args, env);

		return res.length ? res[res.length-1] : false;
	},

	'print': function(args, env) {
		var _args = {
			type: "list",
			cells: [{type: "symbol", eval: true, name: "progn"}].concat(args),
		};

		var res = this.exec(_args, env);

		console.log(res);

		return res;
	},
};

module.exports = Context;

},{"./parser":7}],7:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = peg$FAILED,
        peg$c1 = function(cell) {
          return cell;
        },
        peg$c2 = /^[ \n\r\t]/,
        peg$c3 = { type: "class", value: "[ \\n\\r\\t]", description: "[ \\n\\r\\t]" },
        peg$c4 = [],
        peg$c5 = null,
        peg$c6 = function(d) {
          var cells = [];

          if (d && d.length) {
            cells = [d[0]];

            if (d.length > 1) {
              cells = cells.concat(d[1].map(function(e) { 
                return e[1];
              }));
            }
          }

          return cells;
        },
        peg$c7 = function(data) {
          return data;
        },
        peg$c8 = "'",
        peg$c9 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c10 = "(",
        peg$c11 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c12 = ")",
        peg$c13 = { type: "literal", value: ")", description: "\")\"" },
        peg$c14 = function(q, cells) {
          return {
            type: "list",
            eval: !q,
            cells: cells,
          };
        },
        peg$c15 = "#t",
        peg$c16 = { type: "literal", value: "#t", description: "\"#t\"" },
        peg$c17 = "#f",
        peg$c18 = { type: "literal", value: "#f", description: "\"#f\"" },
        peg$c19 = function(v) {
          return {
            type: "boolean",
            value: v === "#t",
          };
        },
        peg$c20 = /^[0-9]/,
        peg$c21 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c22 = ".",
        peg$c23 = { type: "literal", value: ".", description: "\".\"" },
        peg$c24 = function(d, m) {
          var s = d.join("");
          if (m) {
            s += "." + m[1].join("");
          }

          return {
            type: "number",
            value: parseFloat(s),
          };
        },
        peg$c25 = "\"",
        peg$c26 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c27 = "\\\"",
        peg$c28 = { type: "literal", value: "\\\"", description: "\"\\\\\\\"\"" },
        peg$c29 = /^[^"]/,
        peg$c30 = { type: "class", value: "[^\"]", description: "[^\"]" },
        peg$c31 = function(c) {
          return {
            type: "string",
            value: JSON.parse('"' + c.join("") + '"'),
          }
        },
        peg$c32 = /^[^() \n\r\t#"]/,
        peg$c33 = { type: "class", value: "[^() \\n\\r\\t#\"]", description: "[^() \\n\\r\\t#\"]" },
        peg$c34 = function(q, d) {
          return {
            type: "symbol",
            eval: !q,
            name: d.join(""),
          };
        },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        s2 = peg$parsecell();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c1(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parse_() {
      var s0;

      if (peg$c2.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c3); }
      }

      return s0;
    }

    function peg$parse__() {
      var s0, s1;

      s0 = [];
      s1 = peg$parse_();
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parse_();
      }

      return s0;
    }

    function peg$parsecells() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parsecell();
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$currPos;
        s5 = [];
        s6 = peg$parse_();
        if (s6 !== peg$FAILED) {
          while (s6 !== peg$FAILED) {
            s5.push(s6);
            s6 = peg$parse_();
          }
        } else {
          s5 = peg$c0;
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parsecell();
          if (s6 !== peg$FAILED) {
            s5 = [s5, s6];
            s4 = s5;
          } else {
            peg$currPos = s4;
            s4 = peg$c0;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$c0;
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$currPos;
          s5 = [];
          s6 = peg$parse_();
          if (s6 !== peg$FAILED) {
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = peg$parse_();
            }
          } else {
            s5 = peg$c0;
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parsecell();
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$c0;
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c5;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c6(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsecell() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parselist();
      if (s1 === peg$FAILED) {
        s1 = peg$parseatom();
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c7(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parselist() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c8;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c5;
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 40) {
          s2 = peg$c10;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c11); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsecells();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse__();
              if (s5 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                  s6 = peg$c12;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c13); }
                }
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c14(s1, s4);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseatom() {
      var s0;

      s0 = peg$parseboolean();
      if (s0 === peg$FAILED) {
        s0 = peg$parsenumber();
        if (s0 === peg$FAILED) {
          s0 = peg$parsestring();
          if (s0 === peg$FAILED) {
            s0 = peg$parsesymbol();
          }
        }
      }

      return s0;
    }

    function peg$parseboolean() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c15) {
        s1 = peg$c15;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c16); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c17) {
          s1 = peg$c17;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c18); }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c19(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsenumber() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c20.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c21); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c20.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c21); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s3 = peg$c22;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c23); }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          if (peg$c20.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c21); }
          }
          if (s5 !== peg$FAILED) {
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              if (peg$c20.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c21); }
              }
            }
          } else {
            s4 = peg$c0;
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c5;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c24(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsestring() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c25;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c26); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (input.substr(peg$currPos, 2) === peg$c27) {
          s3 = peg$c27;
          peg$currPos += 2;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c28); }
        }
        if (s3 === peg$FAILED) {
          if (peg$c29.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c30); }
          }
        }
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (input.substr(peg$currPos, 2) === peg$c27) {
              s3 = peg$c27;
              peg$currPos += 2;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c28); }
            }
            if (s3 === peg$FAILED) {
              if (peg$c29.test(input.charAt(peg$currPos))) {
                s3 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c30); }
              }
            }
          }
        } else {
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c25;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c26); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c31(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsesymbol() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c8;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c5;
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c32.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c33); }
        }
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c32.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c33); }
            }
          }
        } else {
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c34(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{}],8:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var keys = require('lodash.keys'),
    objectTypes = require('lodash._objecttypes');

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object for all destination properties that resolve to `undefined`. Once a
 * property is set, additional defaults of the same property will be ignored.
 *
 * @static
 * @memberOf _
 * @type Function
 * @category Objects
 * @param {Object} object The destination object.
 * @param {...Object} [source] The source objects.
 * @param- {Object} [guard] Allows working with `_.reduce` without using its
 *  `key` and `object` arguments as sources.
 * @returns {Object} Returns the destination object.
 * @example
 *
 * var object = { 'name': 'barney' };
 * _.defaults(object, { 'name': 'fred', 'employer': 'slate' });
 * // => { 'name': 'barney', 'employer': 'slate' }
 */
var defaults = function(object, source, guard) {
  var index, iterable = object, result = iterable;
  if (!iterable) return result;
  var args = arguments,
      argsIndex = 0,
      argsLength = typeof guard == 'number' ? 2 : args.length;
  while (++argsIndex < argsLength) {
    iterable = args[argsIndex];
    if (iterable && objectTypes[typeof iterable]) {
    var ownIndex = -1,
        ownProps = objectTypes[typeof iterable] && keys(iterable),
        length = ownProps ? ownProps.length : 0;

    while (++ownIndex < length) {
      index = ownProps[ownIndex];
      if (typeof result[index] == 'undefined') result[index] = iterable[index];
    }
    }
  }
  return result
};

module.exports = defaults;

},{"lodash._objecttypes":9,"lodash.keys":10}],9:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used to determine if values are of the language type Object */
var objectTypes = {
  'boolean': false,
  'function': true,
  'object': true,
  'number': false,
  'string': false,
  'undefined': false
};

module.exports = objectTypes;

},{}],10:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var isNative = require('lodash._isnative'),
    isObject = require('lodash.isobject'),
    shimKeys = require('lodash._shimkeys');

/* Native method shortcuts for methods with the same name as other `lodash` methods */
var nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys;

/**
 * Creates an array composed of the own enumerable property names of an object.
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns an array of property names.
 * @example
 *
 * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
 * // => ['one', 'two', 'three'] (property order is not guaranteed across environments)
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  if (!isObject(object)) {
    return [];
  }
  return nativeKeys(object);
};

module.exports = keys;

},{"lodash._isnative":11,"lodash._shimkeys":12,"lodash.isobject":13}],11:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used for native method references */
var objectProto = Object.prototype;

/** Used to resolve the internal [[Class]] of values */
var toString = objectProto.toString;

/** Used to detect if a method is native */
var reNative = RegExp('^' +
  String(toString)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/toString| for [^\]]+/g, '.*?') + '$'
);

/**
 * Checks if `value` is a native function.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is a native function, else `false`.
 */
function isNative(value) {
  return typeof value == 'function' && reNative.test(value);
}

module.exports = isNative;

},{}],12:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var objectTypes = require('lodash._objecttypes');

/** Used for native method references */
var objectProto = Object.prototype;

/** Native method shortcuts */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A fallback implementation of `Object.keys` which produces an array of the
 * given object's own enumerable property names.
 *
 * @private
 * @type Function
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns an array of property names.
 */
var shimKeys = function(object) {
  var index, iterable = object, result = [];
  if (!iterable) return result;
  if (!(objectTypes[typeof object])) return result;
    for (index in iterable) {
      if (hasOwnProperty.call(iterable, index)) {
        result.push(index);
      }
    }
  return result
};

module.exports = shimKeys;

},{"lodash._objecttypes":9}],13:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var objectTypes = require('lodash._objecttypes');

/**
 * Checks if `value` is the language type of Object.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // check if the value is the ECMAScript language type of Object
  // http://es5.github.io/#x8
  // and avoid a V8 bug
  // http://code.google.com/p/v8/issues/detail?id=2291
  return !!(value && objectTypes[typeof value]);
}

module.exports = isObject;

},{"lodash._objecttypes":9}]},{},[4]);
