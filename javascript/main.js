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
   this.position = [300 + Math.random() * 100, 300 + Math.random() * 100];
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
      target: [400, 400],
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

/**
 *
 */
function drawVehicleHud(display, vehicle) {
   gamejs.draw.rect(display, '#0c0476', vehicle.rect, 3);
   gamejs.draw.line(display, '#0c0476', vehicle.rect.center, vehicle.behaviour.target, 3);
   drawCrossHair(display, vehicle.behaviour.target);
};

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
   // hackish, attaching class property once ready thus image loaded
   CROSSHAIR_MOVE = gamejs.image.load('images/circle-02.png');
   display.blit(background);
   var backgroundArray = new gamejs.surfacearray.SurfaceArray(display);
   var vehicles = new gamejs.sprite.Group();
   // frigattes
   for (var i=0;i<3; i++) {
      vehicles.add(new Vehicle());
   };
   for (var i=0;i<3;i++) {
      var v = new Vehicle();
      v.mass = 0.1;
      v.originalImage = gamejs.transform.scale(gamejs.image.load('images/spaceships/Fighter1.png'), [0.8, 0.8]);
      vehicles.add(v);
   }
   /**
    * handle events
    */
   var selectedVehicle = null;
   function handle(event) {
      if ((event.type === gamejs.event.MOUSE_UP) &&
           (event.button === 0) ) {
         var pos = event.pos;
         // if not in sea
         var bg = backgroundArray.get(pos[0], pos[1]);
         if (bg[0] + bg[1] + bg[2] + bg[3] === 0) {
            return;
         }
         if (selectedVehicle) {
            selectedVehicle.behaviour.target = pos;
            var soundName = 'sounds/engine_' + Math.round(Math.random() * 1) + '.ogg';
            (new gamejs.mixer.Sound(soundName)).play();
            gamejs.log('Vehicle order confirmed ', pos);
            selectedVehicle = null;
         } else {
            // vehicle select?
            var vehiclesClicked = vehicles.collidePoint(event.pos);
            if (vehiclesClicked.length) {
               selectedVehicle = vehiclesClicked[0];
               var soundName = UNIT_SELECTED_SOUNDS[Math.round(Math.random() * UNIT_SELECTED_SOUNDS.length - 1)];
               (new gamejs.mixer.Sound(soundName)).play();
               gamejs.log('vehicle selected ', selectedVehicle);
            }
         }
      }
   };

   function tick(msDuration) {
      display.fill('#dddddd');
      display.blit(background);
      // game loop
      vehicles.update(msDuration);
      if (selectedVehicle && selectedVehicle.behaviour.target) {
         drawVehicleHud(display, selectedVehicle);
      }
      vehicles.draw(display);
      gamejs.event.get().forEach(handle);
   };
   gamejs.time.fpsCallback(tick, this, 26);
   });
