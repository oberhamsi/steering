var gamejs = require('gamejs');
var $v = require('gamejs/utils/vectors');
var $o = require('gamejs/utils/objects');
var $m = require('gamejs/utils/math');

var glowRect = require('./draw').glowRect;
var glowCircle = require('./draw').glowCircle;
var drawCrossHair = require('./draw').drawCrossHair;

/**
 * Vehicle
 */
var Vehicle = exports.Vehicle = function (eventHandler) {
   Vehicle.superConstructor.apply(this, arguments);

   this.health = 1;
   this.mass = 8;
   this.position = [20 + Math.random() * 900, 100 ]; // 20 + Math.random() * 800
   this.velocity = [0, 0];
   this.maxForce = 0.5;
   this.maxSpeed = 1.5; // per second
   // FIXME orientation either as either scalar angle or 2d vector
   this.orientation = 0;
   this.originalImage = gamejs.transform.scale(gamejs.image.load('images/spaceships/Corvette.png'), [0.3, 0.3]);
   this.image = this.originalImage.clone();
   // set by user
   this.behaviour = {
      type: 'seek',
      target: [20 + Math.random() * 800, 20 + Math.random() * 800],
   };
   this.weapons = [
      {
         type: 'ProjectileCloud',
         displayName: 'EMP Cooldown',
         key: gamejs.event.K_SPACE,
         cooldownDuration: 3, // in seconds
         cooldownStatus: 3
      }
   ];

   this.update = function(msDuration) {

      if (this.health <= 0 && !this.isDead()) {
         // explode
         for (var i=0; i<Math.ceil(this.mass);i++) {
            var pos = [
               this.rect.top + Math.random() * this.rect.width,
               this.rect.left + Math.random() * this.rect.height
            ];
            eventHandler.custom({type: 'spawnExplosion', arguments: [pos, [2, 2]]});
         }
         this.kill();
      };

      steeringDirection = [0,0];
      // behaviour model, determines steering direction
      var beh = this.behaviour;
      if (beh.type === 'seek') {
         var desiredVelocity = $v.multiply(
               $v.unit($v.subtract(beh.target, this.position)),
               this.maxSpeed
            );
         steeringDirection = $v.subtract(desiredVelocity, this.velocity);
      } else if (beh.type === 'stop') {
         if ($v.len(this.velocity) > 0.001) {
            steeringDirection = $v.multiply(this.velocity, -1);
         }
      }

      // physical model, determines new velocity and position depending
      // on steering direction, and as limited maxForce and maxSpeed.
      var steeringForce = $v.truncate(steeringDirection, this.maxForce);
      var acceleration = $v.divide(steeringForce, this.mass);
      acceleration = $v.multiply(acceleration, msDuration/1000);
      this.velocity = $v.truncate($v.add(this.velocity, acceleration), this.maxSpeed);
      this.position = $v.add(this.position, this.velocity);
      this.orientation = $m.degrees($v.angle([1,0], this.velocity));

      // weapon cooldown
      this.weapons.forEach(function(w) {
         if (w.cooldownDuration > w.cooldownStatus) {
            w.cooldownStatus += (msDuration/1000);
         }
         if (w.cooldownStatus > w.cooldownDuration) {
            w.cooldownStatus = w.cooldownDuration;
         }
      });
   };

   this.draw = function(display) {
      this.image = gamejs.transform.rotate(this.originalImage, this.orientation);
      var thrustPercent = $v.len(this.velocity) / this.maxSpeed;
      var backProjected = $v.multiply($v.unit(this.velocity), -this.originalImage.rect.width/2 - 3 * thrustPercent);
      gamejs.draw.line(display, 'rgba(248, 15, 15, 10)', this.rect.center,
         $v.add(this.rect.center, backProjected), thrustPercent * (5 + this.maxForce * 65));
      display.blit(this.image, this.rect);
      /*
       debug physics
      var nextPosition = $v.add(this.position, $v.multiply(this.velocity, 10));
      gamejs.draw.line(display, '#ff0000', this.position, nextPosition, 5);
      gamejs.draw.circle(display, '#ff0000', this.position, 10, 3);
      */
   };

   this.drawHud = function(display) {
      glowCircle(display, 'rgba(187,190,255,', this.rect.center, this.rect.width / 1.5, 8);
      if (this.behaviour.type !== 'stop') {
         gamejs.draw.line(display, 'white', this.rect.center, this.behaviour.target, 2);
         drawCrossHair(display, this.behaviour.target);
      }
      /*var thrustPercent = $v.len(this.velocity) / this.maxSpeed;
      var displaySpeed = parseInt(100 * thrustPercent, 10);
      var color = 'white';
      if (thrustPercent > 0.8) {
         color = '#04750b';
      }
      display.blit(HUD_FONT.render('Thrust ' + displaySpeed + '%', color), this.rect.bottomleft);
      */
      var pos = this.rect.bottomleft;
      display.blit(Vehicle.HUD_FONT.render('Health ' + parseInt(100 * this.health, 10)), pos);
      this.weapons.forEach(function(w) {
         pos = $v.add(pos, [0, 15]);
         var displayCooldown = parseInt(100 * w.cooldownStatus / w.cooldownDuration, 10);
         var color = 'white';
         if (w.cooldownStatus >= w.cooldownDuration) {
            color = '#04750b';
         }
         display.blit(Vehicle.HUD_FONT.render(w.displayName + ' ' + displayCooldown + '%', color), pos);
      });
   };

   $o.accessor(this, 'rect', function() {
      return new gamejs.Rect(
         $v.subtract(this.position, $v.divide(this.image.getSize(), 2)),
         this.image.getSize()
      );
   });

   return this;
};
Vehicle.HUD_FONT = new gamejs.font.Font('15px');
$o.extend(Vehicle, gamejs.sprite.Sprite);
