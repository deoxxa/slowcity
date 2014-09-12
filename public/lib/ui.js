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