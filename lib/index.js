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
