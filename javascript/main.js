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

   this.mass = 1;
   this.position = [20 + Math.random() * 800, 20 + Math.random() * 800];
   this.velocity = [0, 0];
   this.maxForce = 2;
   this.maxSpeed = 5; // per second
   // FIXME orientation either as either scalar angle or 2d vector
   this.orientation = 0;
   // set by user
   this.behaviour = {
      type: 'seek',
      target: [200, 200],
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
      var image = gamejs.transform.rotate(Vehicle.image, this.orientation);
      var center = $v.subtract(this.position, $v.divide(image.getSize(), 2));
      display.blit(image, center);
      /*
       debug physics
      var nextPosition = $v.add(this.position, $v.multiply(this.velocity, 10));
      gamejs.draw.line(display, '#ff0000', this.position, nextPosition, 5);
      gamejs.draw.circle(display, '#ff0000', this.position, 10, 3);
      */
   };

   return this;
};
$o.extend(Vehicle, gamejs.sprite.Sprite);

function drawCrossHair(display, target) {
   gamejs.draw.circle(display, 'rgb(245,12,156)', target, 10, 2);
   gamejs.draw.line(
      display,
      'rgb(245,12,156)',
      $v.subtract(target, [10,10]),
      $v.add(target, [10,10]),
      2
   );
   return;
}

gamejs.preload([
   'images/6.png'
]);
gamejs.ready(function() {

   var SCREEN_DIMENSION = [window.innerWidth-20, window.innerHeight-20];
   var display = gamejs.display.setMode(SCREEN_DIMENSION);
   // hackish, attaching class property once ready thus image loaded
   Vehicle.image = gamejs.image.load('images/6.png');

   var vehicles = new gamejs.sprite.Group();
   for (var i=0;i<20; i++) {
      vehicles.add(new Vehicle());
   };
   function tick(msDuration) {
      display.clear();
      // game loop
      vehicles.update(msDuration);
      vehicles.draw(display);
      drawCrossHair(display, vehicles.sprites()[0].behaviour.target);
      gamejs.event.get().forEach(function(event) {
         if (event.type === gamejs.event.MOUSE_UP) {
            vehicles.forEach(function(v) {
               v.behaviour.target = event.pos;
            });
         };
      });
   };
   gamejs.time.fpsCallback(tick, this, 26);
   });
