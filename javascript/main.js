/**
 * @fileoverview
 * simple vehicle steering behaviour as desribed in http://www.red3d.com/cwr/steer/gdc99/
 * image: http://opengameart.org/content/spaceships-top-down
 */
var gamejs = require('gamejs');
var $v = require('gamejs/utils/vectors');
var $o = require('gamejs/utils/objects');
var $m = require('gamejs/utils/math');
/**
 *
 */
function Vehicle() {
   Vehicle.superConstructor.apply(this, arguments);

   this.mass = 8;
   this.position = [20 + Math.random() * 900, 100 ]; // 20 + Math.random() * 800
   this.velocity = [0, 0];
   this.maxForce = 0.5;
   this.maxSpeed = 1.5; // per second
   // FIXME orientation either as either scalar angle or 2d vector
   this.orientation = 0;
   this.originalImage = gamejs.transform.scale(gamejs.image.load('images/spaceships/Frigate.png'), [0.3, 0.3]);
   this.image = this.originalImage.clone();
   // set by user
   this.behaviour = {
      type: 'seek',
      target: [20 + Math.random() * 800, 20 + Math.random() * 800],
   };

   this.update = function(msDuration) {
      steeringDirection = [0,0];
      // behaviour model, determines steering direction
      var beh = this.behaviour;
      if (beh.type === 'seek') {
         var desiredVelocity = $v.multiply(
               $v.unit($v.subtract(beh.target, this.position)),
               this.maxSpeed
            );
         steeringDirection = $v.subtract(desiredVelocity, this.velocity);
      };

      // physical model, determines new velocity and position depending
      // on steering direction, and as limited maxForce and maxSpeed.
      var steeringForce = $v.truncate(steeringDirection, this.maxForce);
      var acceleration = $v.divide(steeringForce, this.mass);
      acceleration = $v.multiply(acceleration, msDuration/1000);
      this.velocity = $v.truncate($v.add(this.velocity, acceleration), this.maxSpeed);
      this.position = $v.add(this.position, this.velocity);
      this.orientation = $m.degrees($v.angle([1,0], this.velocity));
   };

   this.draw = function(display) {
      this.image = gamejs.transform.rotate(this.originalImage, this.orientation);
      display.blit(this.image, this.rect);
      /*
       debug physics
      var nextPosition = $v.add(this.position, $v.multiply(this.velocity, 10));
      gamejs.draw.line(display, '#ff0000', this.position, nextPosition, 5);
      gamejs.draw.circle(display, '#ff0000', this.position, 10, 3);
      */
   };

   $o.accessor(this, 'rect', function() {
      return new gamejs.Rect(
         $v.subtract(this.position, $v.divide(this.image.getSize(), 2)),
         this.image.getSize()
      );
   });

   return this;
};
$o.extend(Vehicle, gamejs.sprite.Sprite);

/**
 * draw cross hair at target position
 */
var CROSSHAIR_MOVE;
function drawCrossHair(display, target) {
   display.blit(CROSSHAIR_MOVE, $v.subtract(target, $v.divide(CROSSHAIR_MOVE.getSize(),2)));
   return;
}

// disable normal browser mouse select
function disableMouseSelect() {
   // no text select on drag
   document.body.style.webkitUserSelect = 'none';
   // non right clickery
   document.body.oncontextmenu = function() { return false; };
}

function glowRect(display, rect, width) {
   var r = rect.clone();
   var STEP_SIZE = 1;
   gamejs.draw.rect(display, '#ffffff', rect, STEP_SIZE * 2);
   for (var i=0;i<width;i++) {
      r.left -= STEP_SIZE;
      r.top -= STEP_SIZE;

      r.width += STEP_SIZE*2;
      r.height += STEP_SIZE*2;
      var a = 0.5 - ( 0.48 *  (i/width) );
      gamejs.draw.rect(display, 'rgba(12,4,118,' + a + ')', r, STEP_SIZE);
   }
   return;
}

function glowCircle(display, rgbaPart, pos, radius, width) {
   gamejs.draw.circle(display, '#ffffff', pos, radius, 1);
   for (var i=0;i<width;i++) {
      var a = 0.6 - (0.48 * (i/width));
      gamejs.draw.circle(display, rgbaPart + a + ')', pos, radius+i, 1);
   };
};

/**
 *
 */
var HUD_FONT = new gamejs.font.Font('15px');
function drawVehicleHud(display, vehicle) {
   //glowRect(display, vehicle.rect, 5);
   glowCircle(display, 'rgba(187,190,255,', vehicle.rect.center, vehicle.rect.width / 1.5, 8);
   gamejs.draw.line(display, '#0c0476', vehicle.rect.center, vehicle.behaviour.target, 3);
   drawCrossHair(display, vehicle.behaviour.target);
   display.blit(HUD_FONT.render('Speed ' + (''+$v.len(vehicle.velocity)).substring(0,5)), vehicle.rect.bottomleft);

};
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
var UNIT_SELECTED_SOUNDS = [
   'sounds/unit_selected.ogg',
   'sounds/unit_ready.ogg',
   'sounds/unit_selected_2.ogg',
   'sounds/unit_ready_2.ogg'
];
gamejs.preload([
   'images/spaceships/Battleship.png',
   'images/spaceships/Frigate.png',
   'images/spaceships/Fighter1.png',

   'images/background.png',
   'images/triangle-03-whole.png',
   'images/cross-01-whole.png',
   'images/circle-02.png',

   'sounds/engine_0.ogg',
   'sounds/engine_1.ogg',

].concat(UNIT_SELECTED_SOUNDS));
gamejs.ready(function() {

   var background = gamejs.image.load('images/background.png');
   var SCREEN_DIMENSION = background.getSize();
   var display = gamejs.display.setMode(SCREEN_DIMENSION);
   // hackish, disable right click
   disableMouseSelect();
   // hackish, attaching class property once ready thus image loaded
   CROSSHAIR_MOVE = gamejs.image.load('images/circle-02.png');
   display.blit(background);
   var backgroundArray = new gamejs.surfacearray.SurfaceArray(display);
   var vehicles = new gamejs.sprite.Group();
   // frigattes
   for (var i=0;i<5; i++) {
      var v = new Vehicle();
      v.mass = 4;
      v.maxForce = 0.1;
      v.maxSpeed = 0.3; // per second
      v.originalImage = gamejs.transform.scale(gamejs.image.load('images/spaceships/Frigate.png'), [0.5, 0.5]);
      vehicles.add(v);
   };
   // fighter
   for (var i=0;i<10;i++) {
      var v = new Vehicle();
      v.mass = 0.06;
      v.maxForce = 0.005;
      v.maxSpeed = 0.7;
      v.originalImage = gamejs.transform.scale(gamejs.image.load('images/spaceships/Fighter1.png'), [1, 1]);
      vehicles.add(v);
   }
   // battleship
   for (var i=0;i<1;i++) {
      var v = new Vehicle();
      v.mass = 24;
      v.maxForce = 0.2;
      v.maxSpeed = 0.15;
      v.originalImage = gamejs.transform.scale(gamejs.image.load('images/spaceships/Battleship.png'), [0.5, 0.5]);
      vehicles.add(v);
   }
   /**
    * handle events
    */
   var selectedVehicle = null;
   var multiSelectedVehicles = null;
   var selectDown = null;
   var selectRect = null;
   function handle(event) {
      if ((event.type === gamejs.event.MOUSE_DOWN) &&
         (event.button === 0)) {
         if (!selectedVehicle && !multiSelectedVehicles) {
            selectDown = event.pos;
         }
      } else if ((event.type === gamejs.event.MOUSE_UP) &&
           (event.button === 0) ) {
         var pos = event.pos;
         // if not in sea
         var bg = backgroundArray.get(pos[0], pos[1]);
         if (bg[0] + bg[1] + bg[2] + bg[3] === 0) {
            return;
         }
         var vehiclesClicked = vehicles.collidePoint(event.pos);
         if (selectRect) {
            multiSelectedVehicles = vehicles.sprites().filter(function(v) {
               return (v.rect.collideRect(selectRect));
            });
         } else if (vehiclesClicked && vehiclesClicked.length) {
            // vehicle select?
            selectedVehicle = vehiclesClicked[0];
            var soundName = UNIT_SELECTED_SOUNDS[parseInt(Math.random() * UNIT_SELECTED_SOUNDS.length - 1)];
            (new gamejs.mixer.Sound(soundName)).play();
            gamejs.log('vehicle selected ', selectedVehicle);
         } else if (selectedVehicle || multiSelectedVehicles) {
            (selectedVehicle && [selectedVehicle] || multiSelectedVehicles).forEach(function(v) {
               v.behaviour.target = pos;
            });
            var soundName = 'sounds/engine_' + Math.round(Math.random() * 1) + '.ogg';
            (new gamejs.mixer.Sound(soundName)).play();
            gamejs.log('Vehicle order confirmed ', pos);
            selectedVehicle = null;
            multiSelectedVehicles = null;
         }
         selectRect = null;
         selectDown = null;
      } else if ((event.type === gamejs.event.MOUSE_MOTION) && selectDown) {
         var delta = [event.pos[0] - selectDown[0], event.pos[1] - selectDown[1]];
         if ($v.len(delta) > 10) {
            selectRect = new gamejs.Rect(selectDown, [event.pos[0] - selectDown[0], event.pos[1] - selectDown[1]]);
         } else {
            selectRect = null;
         }
      } else if((event.type === gamejs.event.MOUSE_UP) && event.button === 2) {
         selectRect = null;
         selectDown = null;
         selectedVehicle = null;
         multiSelectedVehicles = null;
      }
   };

   function tick(msDuration) {
      display.fill('#dddddd');
      display.blit(background);
      // game loop
      vehicles.update(msDuration);
      if (selectedVehicle && selectedVehicle.behaviour.target) {
         drawVehicleHud(display, selectedVehicle);
      } else if (multiSelectedVehicles && multiSelectedVehicles.length) {
         multiSelectedVehicles.forEach(function(v) {
            drawVehicleHud(display, v);
         });
      }
      if (selectRect) {
         gamejs.draw.rect(display, '#0c0476', selectRect, 2);
      }
      vehicles.draw(display);
      gamejs.event.get().forEach(handle);
   };
   gamejs.time.fpsCallback(tick, this, 26);
   });
