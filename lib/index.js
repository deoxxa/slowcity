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
