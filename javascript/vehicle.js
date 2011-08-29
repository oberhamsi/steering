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
   this.slowingDistance = 100;
   this.orientation = 0;

   // FIXME orientation either as either scalar angle or 2d vector
   this.originalImage = gamejs.image.load('images/spaceships/Corvette.png');
   this.image = this.originalImage.clone();
   // set by user
   this.behaviour = {
      type: 'arrival',
      target: [1024/2, 786/2],
   };
   this.weapons = [
      {
         type: 'ProjectileCloud',
         displayName: 'Torpedo',
         key: gamejs.event.K_SPACE,
         cooldownDuration: 3, // in seconds
         cooldownStatus: 3
      },
      {
         type: 'FrontLaser',
         displayName: 'Laser',
         key: gamejs.event.K_w,
         cooldownDuration: 3,
         cooldownStatus: 3,
         isActive: false,
         activeDuration: 2.5,
         activeStatus: 0,
         strength: 1
      }
   ];

   this.update = function(msDuration) {

      // explode when dead
      if (this.health <= 0 && !this.isDead()) {
         for (var i=0; i<Math.ceil(this.mass);i++) {
            var pos = [
               this.rect.left + Math.random() * this.rect.width - 64,
               this.rect.top + Math.random() * this.rect.height - 64
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
         } else {
            beh.type = 'stopped';
         }
      } else if (beh.type === 'arrival') {
         var targetOffset = $v.subtract(beh.target, this.position);
         var distance = $v.len(targetOffset);
         if (distance < 5) {
            beh.type = 'stop';
         }
         var rampedSpeed = this.maxSpeed * (distance / this.slowingDistance);
         var clippedSpeed = Math.min(rampedSpeed, this.maxSpeed);
         var desiredVelocity = $v.multiply(targetOffset, (clippedSpeed / distance));
         var steeringDirection = $v.subtract(desiredVelocity, this.velocity);
      }

      // seperation
      if (beh.type == 'stopped') {
         var repulsive = [0,0];
         // temporary circle radius for collision detection
         this.groups.forEach(function(group) {
            group.forEach(function(sprite) {
               if (this.mass > sprite.mass) return;

               var delta = $v.subtract(this.rect.center, sprite.rect.center);
               if ($v.len(delta) <= (this.radius + sprite.radius)/2) {
                  delta = $v.multiply($v.unit(delta), 1/this.radius);
                  repulsive = $v.add(repulsive, delta);
               };
            }, this);
         }, this);
         steeringDirection = $v.subtract(repulsive, this.velocity);
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
         if (w.isActive) {
            w.activeStatus += msDuration/1000;
            if (w.activeStatus >= w.activeDuration) {
               w.isActive = false;
               w.activeStatus = 0;
            }
         } else {
            if (w.cooldownDuration > w.cooldownStatus) {
               w.cooldownStatus += (msDuration/1000);
            }
            if (w.cooldownStatus > w.cooldownDuration) {
               w.cooldownStatus = w.cooldownDuration;
            }
         }
      });
   };

   this.draw = function(display) {
      // thrust
      var thrustPercent = $v.len(this.velocity) / this.maxSpeed;
      var backProjected = $v.multiply($v.unit(this.velocity), -this.originalImage.rect.width/2 - 3 * thrustPercent);
      gamejs.draw.line(display, 'rgba(204, 255, 51, 1)', this.rect.center,
      $v.add(this.rect.center, backProjected), thrustPercent * (2 + this.maxForce * 65));

      // lasers
      this.weapons.forEach(function(w) {
         if (w.type.indexOf('Laser') < 0 || !w.isActive) return;

         if (w.type === 'FrontLaser') {
            var forwardPoint = $v.add(this.rect.center, $v.multiply($v.unit(this.velocity), w.strength * 500));
            gamejs.draw.line(display, 'rgba(255,51,0,0.6)', this.rect.center, forwardPoint, w.strength * 10);
         }
      }, this);

      // sprite
      this.image = gamejs.transform.rotate(this.originalImage, this.orientation);
      display.blit(this.image, this.rect);

      /*
       debug physics
      var nextPosition = $v.add(this.position, $v.multiply(this.velocity, 10));
      gamejs.draw.line(display, '#ff0000', this.position, nextPosition, 5);
      gamejs.draw.circle(display, '#ff0000', this.position, 10, 3);
      */
   };

   this.drawHud = function(display) {
      glowCircle(display, 'rgba(187,190,255,', this.rect.center, this.radius, 8);
      if (this.behaviour.type === 'arrival') {
         //gamejs.draw.line(display, 'white', this.rect.center, this.behaviour.target, 1);
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
         pos = $v.add(pos, [0, 10]);
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

   $o.accessor(this, 'radius', function() {
      var s = this.image.getSize()
      return Math.max(s[0], s[1]);
   });
   $o.accessor(this, 'orientationVector', function() {
      return $v.rotate([1, 0], $m.radians(this.orientation));
   });
   return this;
};
Vehicle.HUD_FONT = new gamejs.font.Font('5px');
$o.extend(Vehicle, gamejs.sprite.Sprite);
