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

},{"lodash.defaults":5}],2:[function(require,module,exports){
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

  this.inputActive = false;
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

  if (this.inputActive) {
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
  }

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

},{"lodash.defaults":5}],3:[function(require,module,exports){
var sq = require("shell-quote");

var UI = module.exports = function UI(options) {
  options = options || {};

  if (!options.renderer) {
    throw Error("renderer option must be supplied");
  }

  this.renderer = options.renderer;
  this.map = options.map;
  this.commands = {
    debug: function setDebug(state) {
      this.renderer.debug = state === "on";
    },
    select: function select(x, y, w, h) {
      x = parseInt(x, 10);
      y = parseInt(y, 10);
      w = parseInt(w, 10);
      h = parseInt(h, 10);

      if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(w) || Number.isNaN(h)) {
        this.renderer.selectActive = false;
        return;
      }

      this.renderer.selectActive = true;
      this.renderer.selectX = x;
      this.renderer.selectY = y;
      this.renderer.selectW = w;
      this.renderer.selectH = h;
    },
    zone: function zone(type, x, y, w, h) {
      type = parseInt(type || "0", 10);

      x = parseInt(x, 10);
      y = parseInt(y, 10);
      w = parseInt(w, 10);
      h = parseInt(h, 10);

      if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(w) || Number.isNaN(h)) {
        if (!this.renderer.selectActive) {
          return;
        }

        x = this.renderer.selectX;
        y = this.renderer.selectY;
        w = this.renderer.selectW;
        h = this.renderer.selectH;
      }

      for (var i=0;i<w;i++) {
        for (var j=0;j<h;j++) {
          this.map.setZone(x+i, y+j, type);
        }
      }
    },
  };
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

    if (c === "enter" && !self.renderer.inputActive) {
      ev.preventDefault();
      ev.stopPropagation();

      self.renderer.inputActive = true;
      self.renderer.inputText = "";
      self.renderer.inputIndex = 0;

      return;
    }

    if (!self.renderer.inputActive) {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    if (c === "enter") {
      var inputText = self.renderer.inputText;
      self.renderer.inputText = "";
      self.renderer.inputIndex = 0;
      self.commandLine(inputText);
      return;
    }

    if (c === "escape") {
      self.renderer.inputActive = false;
      self.renderer.inputText = "";
      self.renderer.inputIndex = 0;
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

    ev.preventDefault();
    ev.stopPropagation();
  });

  this.renderer.el.addEventListener("mousedown", function(ev) {
    selecting = true;

    self.renderer.selectActive = false;

    originX = self.renderer.cursorX;
    originY = self.renderer.cursorY;

    ev.preventDefault();
    ev.stopPropagation();
  });

  this.renderer.el.addEventListener("mouseup", function(ev) {
    selecting = false;

    ev.preventDefault();
    ev.stopPropagation();
  });

  this.renderer.el.addEventListener("wheel", function(ev) {
    ev.preventDefault();
    ev.stopPropagation();

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

UI.prototype.commandLine = function commandLine(text) {
  var commands = text.split(/;/).map(function(e) {
    return e.trim();
  });

  for (var i=0;i<commands.length;i++) {
    this.command(commands[i]);
  }
};

UI.prototype.command = function command(text) {
  var bits = sq.parse(text);

  console.log(bits);

  if (this.commands[bits[0]]) {
    this.commands[bits[0]].apply(this, bits.slice(1));
  }
};

},{"shell-quote":11}],4:[function(require,module,exports){
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

  window.addEventListener("resize", function() {
    renderer.setDimensions(window.innerWidth - 10, window.innerHeight - 10);
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
  });
});

},{"./map":1,"./renderer":2,"./ui":3}],5:[function(require,module,exports){
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

},{"lodash._objecttypes":6,"lodash.keys":7}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{"lodash._isnative":8,"lodash._shimkeys":9,"lodash.isobject":10}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{"lodash._objecttypes":6}],10:[function(require,module,exports){
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

},{"lodash._objecttypes":6}],11:[function(require,module,exports){
var json = typeof JSON !== undefined ? JSON : require('jsonify');
var map = require('array-map');
var filter = require('array-filter');
var reduce = require('array-reduce');

exports.quote = function (xs) {
    return map(xs, function (s) {
        if (s && typeof s === 'object') {
            return s.op.replace(/(.)/g, '\\$1');
        }
        else if (/["\s]/.test(s) && !/'/.test(s)) {
            return "'" + s.replace(/(['\\])/g, '\\$1') + "'";
        }
        else if (/["'\s]/.test(s)) {
            return '"' + s.replace(/(["\\$`(){}!#&*|])/g, '\\$1') + '"';
        }
        else {
            return String(s).replace(/([\\$`(){}!#&*|])/g, '\\$1');
        }
    }).join(' ');
};

var CONTROL = '(?:' + [
    '\\|\\|', '\\&\\&', ';;', '\\|\\&', '[&;()|<>]'
].join('|') + ')';
var META = '|&;()<> \\t';
var BAREWORD = '(\\\\[\'"' + META + ']|[^\\s\'"' + META + '])+';
var SINGLE_QUOTE = '"((\\\\"|[^"])*?)"';
var DOUBLE_QUOTE = '\'((\\\\\'|[^\'])*?)\'';

var TOKEN = '';
for (var i = 0; i < 4; i++) {
    TOKEN += (Math.pow(16,8)*Math.random()).toString(16);
}

exports.parse = function (s, env) {
    var mapped = parse(s, env);
    if (typeof env !== 'function') return mapped;
    return reduce(mapped, function (acc, s) {
        if (typeof s === 'object') return acc.concat(s);
        var xs = s.split(RegExp('(' + TOKEN + '.*?' + TOKEN + ')', 'g'));
        if (xs.length === 1) return acc.concat(xs[0]);
        return acc.concat(map(filter(xs, Boolean), function (x) {
            if (RegExp('^' + TOKEN).test(x)) {
                return json.parse(x.split(TOKEN)[1]);
            }
            else return x;
        }));
    }, []);
};

function parse (s, env) {
    var chunker = new RegExp([
        '(' + CONTROL + ')', // control chars
        '(' + BAREWORD + '|' + SINGLE_QUOTE + '|' + DOUBLE_QUOTE + ')*'
    ].join('|'), 'g');
    var match = filter(s.match(chunker), Boolean);
    
    if (!match) return [];
    if (!env) env = {};
    return map(match, function (s) {
        if (RegExp('^' + CONTROL + '$').test(s)) {
            return { op: s };
        }

        // Hand-written scanner/parser for Bash quoting rules:
        //
        //  1. inside single quotes, all characters are printed literally.
        //  2. inside double quotes, all characters are printed literally
        //     except variables prefixed by '$' and backslashes followed by
        //     either a double quote or another backslash.
        //  3. outside of any quotes, backslashes are treated as escape
        //     characters and not printed (unless they are themselves escaped)
        //  4. quote context can switch mid-token if there is no whitespace
        //     between the two quote contexts (e.g. all'one'"token" parses as
        //     "allonetoken")
        var SQ = "'";
        var DQ = '"';
        var BS = '\\';
        var DS = '$';
        var quote = false;
        var varname = false;
        var esc = false;
        var out = '';
        var isGlob = false;

        for (var i = 0, len = s.length; i < len; i++) {
            var c = s.charAt(i);
            isGlob = isGlob || (!quote && (c === '*' || c === '?'))
            if (esc) {
                out += c;
                esc = false;
            }
            else if (quote) {
                if (c === quote) {
                    quote = false;
                }
                else if (quote == SQ) {
                    out += c;
                }
                else { // Double quote
                    if (c === BS) {
                        i += 1;
                        c = s.charAt(i);
                        if (c === DQ || c === BS || c === DS) {
                            out += c;
                        } else {
                            out += BS + c;
                        }
                    }
                    else if (c === DS) {
                        out += parseEnvVar();
                    }
                    else {
                        out += c
                    }
                }
            }
            else if (c === DQ || c === SQ) {
                quote = c
            }
            else if (RegExp('^' + CONTROL + '$').test(c)) {
                return { op: s };
            }
            else if (c === BS) {
                esc = true
            }
            else if (c === DS) {
                out += parseEnvVar();
            }
            else out += c;
        }

        if (isGlob) return {op: 'glob', pattern: out};

        return out

        function parseEnvVar() {
            i += 1;
            var varend, varname;
            //debugger
            if (s.charAt(i) === '{') {
                i += 1
                if (s.charAt(i) === '}') {
                    throw new Error("Bad substitution: " + s.substr(i - 2, 3));
                }
                varend = s.indexOf('}', i);
                if (varend < 0) {
                    throw new Error("Bad substitution: " + s.substr(i));
                }
                varname = s.substr(i, varend - i);
                i = varend;
            }
            else if (/[*@#?$!_\-]/.test(s.charAt(i))) {
                varname = s.charAt(i);
                i += 1;
            }
            else {
                varend = s.substr(i).match(/[^\w\d_]/);
                if (!varend) {
                    varname = s.substr(i);
                    i = s.length;
                } else {
                    varname = s.substr(i, varend.index)
                    i += varend.index - 1;
                }
            }
            return getVar(null, '', varname);
        }
    });
    
    function getVar (_, pre, key) {
        var r = typeof env === 'function' ? env(key) : env[key];
        if (r === undefined) r = '';
        
        if (typeof r === 'object') {
            return pre + TOKEN + json.stringify(r) + TOKEN;
        }
        else return pre + r;
    }
};

},{"array-filter":12,"array-map":13,"array-reduce":14,"jsonify":15}],12:[function(require,module,exports){
/**
 * Array#filter.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @return {Array}
 */

module.exports = function (arr, fn) {
  if (arr.filter) return arr.filter(fn);
  var ret = [];
  for (var i = 0; i < arr.length; i++) {
    if (!hasOwn.call(arr, i)) continue;
    if (fn(arr[i], i, arr)) ret.push(arr[i]);
  }
  return ret;
};

var hasOwn = Object.prototype.hasOwnProperty;

},{}],13:[function(require,module,exports){
module.exports = function (xs, f) {
    if (xs.map) return xs.map(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = xs[i];
        if (hasOwn.call(xs, i)) res.push(f(x, i, xs));
    }
    return res;
};

var hasOwn = Object.prototype.hasOwnProperty;

},{}],14:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;

module.exports = function (xs, f, acc) {
    var hasAcc = arguments.length >= 3;
    if (hasAcc && xs.reduce) return xs.reduce(f, acc);
    if (xs.reduce) return xs.reduce(f);
    
    for (var i = 0; i < xs.length; i++) {
        if (!hasOwn.call(xs, i)) continue;
        if (!hasAcc) {
            acc = xs[i];
            hasAcc = true;
            continue;
        }
        acc = f(acc, xs[i], i);
    }
    return acc;
};

},{}],15:[function(require,module,exports){
exports.parse = require('./lib/parse');
exports.stringify = require('./lib/stringify');

},{"./lib/parse":16,"./lib/stringify":17}],16:[function(require,module,exports){
var at, // The index of the current character
    ch, // The current character
    escapee = {
        '"':  '"',
        '\\': '\\',
        '/':  '/',
        b:    '\b',
        f:    '\f',
        n:    '\n',
        r:    '\r',
        t:    '\t'
    },
    text,

    error = function (m) {
        // Call error when something is wrong.
        throw {
            name:    'SyntaxError',
            message: m,
            at:      at,
            text:    text
        };
    },
    
    next = function (c) {
        // If a c parameter is provided, verify that it matches the current character.
        if (c && c !== ch) {
            error("Expected '" + c + "' instead of '" + ch + "'");
        }
        
        // Get the next character. When there are no more characters,
        // return the empty string.
        
        ch = text.charAt(at);
        at += 1;
        return ch;
    },
    
    number = function () {
        // Parse a number value.
        var number,
            string = '';
        
        if (ch === '-') {
            string = '-';
            next('-');
        }
        while (ch >= '0' && ch <= '9') {
            string += ch;
            next();
        }
        if (ch === '.') {
            string += '.';
            while (next() && ch >= '0' && ch <= '9') {
                string += ch;
            }
        }
        if (ch === 'e' || ch === 'E') {
            string += ch;
            next();
            if (ch === '-' || ch === '+') {
                string += ch;
                next();
            }
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
        }
        number = +string;
        if (!isFinite(number)) {
            error("Bad number");
        } else {
            return number;
        }
    },
    
    string = function () {
        // Parse a string value.
        var hex,
            i,
            string = '',
            uffff;
        
        // When parsing for string values, we must look for " and \ characters.
        if (ch === '"') {
            while (next()) {
                if (ch === '"') {
                    next();
                    return string;
                } else if (ch === '\\') {
                    next();
                    if (ch === 'u') {
                        uffff = 0;
                        for (i = 0; i < 4; i += 1) {
                            hex = parseInt(next(), 16);
                            if (!isFinite(hex)) {
                                break;
                            }
                            uffff = uffff * 16 + hex;
                        }
                        string += String.fromCharCode(uffff);
                    } else if (typeof escapee[ch] === 'string') {
                        string += escapee[ch];
                    } else {
                        break;
                    }
                } else {
                    string += ch;
                }
            }
        }
        error("Bad string");
    },

    white = function () {

// Skip whitespace.

        while (ch && ch <= ' ') {
            next();
        }
    },

    word = function () {

// true, false, or null.

        switch (ch) {
        case 't':
            next('t');
            next('r');
            next('u');
            next('e');
            return true;
        case 'f':
            next('f');
            next('a');
            next('l');
            next('s');
            next('e');
            return false;
        case 'n':
            next('n');
            next('u');
            next('l');
            next('l');
            return null;
        }
        error("Unexpected '" + ch + "'");
    },

    value,  // Place holder for the value function.

    array = function () {

// Parse an array value.

        var array = [];

        if (ch === '[') {
            next('[');
            white();
            if (ch === ']') {
                next(']');
                return array;   // empty array
            }
            while (ch) {
                array.push(value());
                white();
                if (ch === ']') {
                    next(']');
                    return array;
                }
                next(',');
                white();
            }
        }
        error("Bad array");
    },

    object = function () {

// Parse an object value.

        var key,
            object = {};

        if (ch === '{') {
            next('{');
            white();
            if (ch === '}') {
                next('}');
                return object;   // empty object
            }
            while (ch) {
                key = string();
                white();
                next(':');
                if (Object.hasOwnProperty.call(object, key)) {
                    error('Duplicate key "' + key + '"');
                }
                object[key] = value();
                white();
                if (ch === '}') {
                    next('}');
                    return object;
                }
                next(',');
                white();
            }
        }
        error("Bad object");
    };

value = function () {

// Parse a JSON value. It could be an object, an array, a string, a number,
// or a word.

    white();
    switch (ch) {
    case '{':
        return object();
    case '[':
        return array();
    case '"':
        return string();
    case '-':
        return number();
    default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
};

// Return the json_parse function. It will have access to all of the above
// functions and variables.

module.exports = function (source, reviver) {
    var result;
    
    text = source;
    at = 0;
    ch = ' ';
    result = value();
    white();
    if (ch) {
        error("Syntax error");
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function' ? (function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value === 'object') {
            for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                    v = walk(value, k);
                    if (v !== undefined) {
                        value[k] = v;
                    } else {
                        delete value[k];
                    }
                }
            }
        }
        return reviver.call(holder, key, value);
    }({'': result}, '')) : result;
};

},{}],17:[function(require,module,exports){
var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    gap,
    indent,
    meta = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },
    rep;

function quote(string) {
    // If the string contains no control characters, no quote characters, and no
    // backslash characters, then we can safely slap some quotes around it.
    // Otherwise we must also replace the offending characters with safe escape
    // sequences.
    
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string' ? c :
            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + string + '"';
}

function str(key, holder) {
    // Produce a string from holder[key].
    var i,          // The loop counter.
        k,          // The member key.
        v,          // The member value.
        length,
        mind = gap,
        partial,
        value = holder[key];
    
    // If the value has a toJSON method, call it to obtain a replacement value.
    if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
        value = value.toJSON(key);
    }
    
    // If we were called with a replacer function, then call the replacer to
    // obtain a replacement value.
    if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
    }
    
    // What happens next depends on the value's type.
    switch (typeof value) {
        case 'string':
            return quote(value);
        
        case 'number':
            // JSON numbers must be finite. Encode non-finite numbers as null.
            return isFinite(value) ? String(value) : 'null';
        
        case 'boolean':
        case 'null':
            // If the value is a boolean or null, convert it to a string. Note:
            // typeof null does not produce 'null'. The case is included here in
            // the remote chance that this gets fixed someday.
            return String(value);
            
        case 'object':
            if (!value) return 'null';
            gap += indent;
            partial = [];
            
            // Array.isArray
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }
                
                // Join all of the elements together, separated with commas, and
                // wrap them in brackets.
                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            
            // If the replacer is an array, use it to select the members to be
            // stringified.
            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            else {
                // Otherwise, iterate through all of the keys in the object.
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            
        // Join all of the member texts together, separated with commas,
        // and wrap them in braces.

        v = partial.length === 0 ? '{}' : gap ?
            '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
            '{' + partial.join(',') + '}';
        gap = mind;
        return v;
    }
}

module.exports = function (value, replacer, space) {
    var i;
    gap = '';
    indent = '';
    
    // If the space parameter is a number, make an indent string containing that
    // many spaces.
    if (typeof space === 'number') {
        for (i = 0; i < space; i += 1) {
            indent += ' ';
        }
    }
    // If the space parameter is a string, it will be used as the indent string.
    else if (typeof space === 'string') {
        indent = space;
    }

    // If there is a replacer, it must be a function or an array.
    // Otherwise, throw an error.
    rep = replacer;
    if (replacer && typeof replacer !== 'function'
    && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
        throw new Error('JSON.stringify');
    }
    
    // Make a fake root object containing our value under the key of ''.
    // Return the result of stringifying the value.
    return str('', {'': value});
};

},{}]},{},[4]);
