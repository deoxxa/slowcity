var LISP = require("LISP.js");

var UI = module.exports = function UI(options) {
  options = options || {};

  if (!options.renderer) {
    throw Error("renderer option must be supplied");
  }

  this.ctx = new LISP.Context();
  for (var k in this.procedures) {
    this.ctx.procedures[k] = this.procedures[k].bind(this);
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
  },
  debug: function debug(args, env) {
    if (args.length > 0) {
      this.renderer.debug = this.ctx.exec(args[0], env);
    }

    return this.renderer.debug;
  },
  mouse: function mouse(args, env) {
    if (args.length > 0) {
      this.mouseEnabled = this.ctx.exec(args[0], env);
    }

    return this.mouseEnabled;
  },
  history: function history(args, env) {
    return this.history;
  },
  cursor: function cursor(args, env) {
    if (args.length === 2) {
      this.renderer.cursorX = this.ctx.exec(args[0], env);
      this.renderer.cursorY = this.ctx.exec(args[1], env);
    }

    return [
      this.renderer.cursorX,
      this.renderer.cursorY,
    ];
  },
  select: function select(args, env) {
    if (args.length === 4) {
      this.renderer.selectActive = true;
      this.renderer.selectX = this.ctx.exec(args[0], env);
      this.renderer.selectY = this.ctx.exec(args[1], env);
      this.renderer.selectW = this.ctx.exec(args[2], env);
      this.renderer.selectH = this.ctx.exec(args[3], env);
    } else if (args.length === 1) {
      this.renderer.selectActive = !!this.ctx.exec(args[0], env);
    }

    return [
      this.renderer.selectActive,
      this.renderer.selectX,
      this.renderer.selectY,
      this.renderer.selectW,
      this.renderer.selectH,
    ];
  },
  zone: function zone(args, env) {
    var x = this.ctx.exec(args[0]),
        y = this.ctx.exec(args[1]),
        w = this.ctx.exec(args[2]),
        h = this.ctx.exec(args[3]),
        type = this.ctx.exec(args[4]);

    for (var i=0;i<w;i++) {
      for (var j=0;j<h;j++) {
        this.map.setZone(x+i, y+j, type);
      }
    }
  },
  road: function road(args, env) {
    var x = this.ctx.exec(args[0]),
        y = this.ctx.exec(args[1]),
        w = this.ctx.exec(args[2]),
        h = this.ctx.exec(args[3]),
        d = this.ctx.exec(args[4]);

    for (var i=0;i<w;i++) {
      for (var j=0;j<h;j++) {
        this.map.setRoad(x+i, y+j, !d);
      }
    }
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
