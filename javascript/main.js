/**
 * @fileoverview
 * simple vehicle steering behaviour as desribed in http://www.red3d.com/cwr/steer/gdc99/
 * image: http://opengameart.org/content/spaceships-top-down
 */
var gamejs = require('gamejs');
var $v = require('gamejs/utils/vectors');
var $o = require('gamejs/utils/objects');
var $m = require('gamejs/utils/math');

var Vehicle = require('./vehicle').Vehicle;
var Explosion = require('./sprites').Explosion;
var ProjectileCloud = require('./sprites/').ProjectileCloud;
var EventHandler = require('./events').EventHandler;
var sounds = require('./sounds');

// disable normal browser mouse select
function disableMouseSelect() {
   // no text select on drag
   document.body.style.webkitUserSelect = 'none';
   // non right clickery
   document.body.oncontextmenu = function() { return false; };
}

/**
 *
 */
// disable normal browser mouse select
function disableMouseSelect() {
   // no text select on drag
   document.body.style.webkitUserSelect = 'none';
   // non right clickery
   document.body.oncontextmenu = function() { return false; };
}
/**
 * MAIN
 */

gamejs.preload([
   'images/spaceships/Battleship.png',
   'images/spaceships/Corvette.png',
   'images/spaceships/Fighter1.png',

   'images/spaceships/BattleshipC.png',
   'images/spaceships/CorvetteC.png',
   'images/spaceships/Fighter1C.png',
   'images/spaceships/BomberC.png',


   'images/explosion.png',
   'images/background.png',
   'images/triangle-03-whole.png',
   'images/cross-01-whole.png',
   'images/circle-02.png',
].concat(sounds.PRELOAD));
gamejs.ready(function() {

   /**
    * mainloop
    *
    */
   function tick(msDuration) {
      display.fill('#dddddd');
      display.blit(background);
      // game loop
      eventHandler.update(msDuration);
      clouds.update(msDuration);
      vehicles.update(msDuration);
      enemies.update(msDuration);
      explosions.update(msDuration);
      eventHandler.getCustom().forEach(function(event) {
         if (event.type === 'spawnExplosion') {
            // double constructor call to correctly emulate
            var ex = new Explosion();
            Explosion.apply(ex, event.arguments);
            explosions.add(ex);
         } else if (event.type == 'spawnProjectileCloud') {
            event.arguments.unshift(eventHandler)
            var pc = new ProjectileCloud();
            ProjectileCloud.apply(pc, event.arguments);
            clouds.add(pc);
         }
      });
      // kill out of bounds clouds
      clouds.forEach(function(c) {
         if (!display.rect.collideRect(c.rect)) {
            c.kill();
            gamejs.log('Killed ', c);
         }
      });
      // weapon effect

      gamejs.sprite.groupCollide(clouds, enemies, true, false).forEach(function(coll) {
         coll.b.health -= (0.3 * msDuration/1000);
         eventHandler.custom({type: 'spawnExplosion', arguments: [coll.a.getForwardPosition(coll.b.rect.center)]});
      });
      gamejs.sprite.groupCollide(explosions, enemies).forEach(function(coll) {
         coll.b.health -= (0.1 * msDuration/1000);
      });
      gamejs.sprite.groupCollide(explosions, vehicles).forEach(function(coll) {
         coll.b.health -= (0.1 * msDuration/1000);
      });

      // draw
      enemies.draw(display);
      vehicles.draw(display);
      clouds.draw(display);
      explosions.draw(display);
      eventHandler.draw(display);
      if (eventHandler.selectedVehicles && eventHandler.selectedVehicles.length) {
         eventHandler.selectedVehicles.forEach(function(v) {
            v.drawHud(display);
         });
      }
   };

   /**
    * main constructor
    */
   var vehicles = new gamejs.sprite.Group();
   var enemies = new gamejs.sprite.Group();
   var clouds = new gamejs.sprite.Group();
   var explosions = new gamejs.sprite.Group();
   var eventHandler = new EventHandler(vehicles);
   var background = gamejs.image.load('images/background.png');
   var SCREEN_DIMENSION = background.getSize();
   var display = gamejs.display.setMode(SCREEN_DIMENSION);
   display.blit(background);

   // hackish, disable right click
   disableMouseSelect();
   // frigattes
   for (var i=0;i<5; i++) {
      var v = new Vehicle(eventHandler);
      v.mass = 4;
      v.maxForce = 0.1;
      v.maxSpeed = 0.3; // per second
      v.health = 1.2;
      v.originalImage = gamejs.transform.scale(gamejs.image.load('images/spaceships/Corvette.png'), [0.5, 0.5]);
      vehicles.add(v);
   };
   // fighter
   for (var i=0;i<10;i++) {
      var v = new Vehicle(eventHandler);
      v.mass = 0.06;
      v.maxForce = 0.005;
      v.maxSpeed = 0.7;
      v.health = 0.5;
      v.originalImage = gamejs.transform.scale(gamejs.image.load('images/spaceships/Fighter1.png'), [1, 1]);
      vehicles.add(v);
   }
   // battleship
   for (var i=0;i<1;i++) {
      var v = new Vehicle(eventHandler);
      v.mass = 24;
      v.maxForce = 0.2;
      v.maxSpeed = 0.15;
      v.health = 3;
      v.originalImage = gamejs.transform.scale(gamejs.image.load('images/spaceships/Battleship.png'), [0.5, 0.5]);
      vehicles.add(v);
   }
   // enemies
   // FIXME different
   for (var i=0;i<10; i++) {
      var v = new Vehicle(eventHandler);
      v.mass = 4;
      v.maxForce = 0.1;
      v.maxSpeed = 0.3; // per second
      v.originalImage = gamejs.transform.scale(gamejs.image.load('images/spaceships/BomberC.png'), [1, 1]);
      v.position = [20 + Math.random() * 900, 500 ]; // 20 + Math.random() * 800
      enemies.add(v);
   };
   gamejs.time.fpsCallback(tick, this, 26);
   });
