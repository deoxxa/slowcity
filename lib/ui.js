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
