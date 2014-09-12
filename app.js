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
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, this.height - 14, this.width, 14);
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
var UI = module.exports = function UI(options) {
  options = options || {};

  if (!options.renderer) {
    throw Error("renderer option must be supplied");
  }

  this.renderer = options.renderer;
  this.map = options.map;
};

UI.prototype.attachEvents = function attachEvents() {
  var self = this;

  var keycodes = {
    "8":   "backspace",
    "13":  "enter",
    "27":  "escape",
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

    if (ev.keyCode === 192 && !self.renderer.inputActive) {
      self.renderer.inputActive = true;
      self.renderer.inputText = "";
      return;
    }

    if (!self.renderer.inputActive) {
      return;
    }

    if (!keycodes[ev.keyCode]) {
      return;
    }

    ev.preventDefault();
    ev.stopPropagation();

    if (ev.keyCode === 13) {
      console.log(self.renderer.inputText);
      self.renderer.inputText = "";
      return;
    }

    if (ev.keyCode === 13 || ev.keyCode === 27) {
      self.renderer.inputActive = false;
      self.renderer.inputText = "";
      return;
    }

    if (ev.keyCode === 8) {
      if (self.renderer.inputText.length > 0) {
        self.renderer.inputText = self.renderer.inputText.substr(0, self.renderer.inputText.length - 1);
      }

      return;
    }

    var c = keycodes[ev.keyCode];
    if (ev.shiftKey) {
      c = upper[c] || c.toUpperCase();
    }

    self.renderer.inputText += c;
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

},{}],4:[function(require,module,exports){
var Map = require("./map"),
    Renderer = require("./renderer"),
    UI = require("./ui");

window.addEventListener("load", function() {
  var map = new Map();

  var renderer = new Renderer({
    map: map,
    debug: true,
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

  renderer.loadTiles("/tiles.gif", function(err) {
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

},{"lodash._objecttypes":6}]},{},[4]);