/**
 * @fileoverview
 * simple vehicle steering behaviour as desribed in http://www.red3d.com/cwr/steer/gdc99/
 * image: http://opengameart.org/content/spaceships-top-down
 */
var gamejs = require('gamejs');
var $v = require('gamejs/utils/vectors');
var $o = require('gamejs/utils/objects');
var $m = require('gamejs/utils/math');

function ProjectileCloud(pos, direction) {
   ProjectileCloud.superConstructor.apply(this, arguments);

   var particles = [];
   this.pos = pos;
   this.direction = $v.unit(direction);

   this.update = function(msDuration) {
      var speed = 80; // pixels per second
      var delta = $v.multiply(this.direction, speed * (msDuration/1000));
      this.rect.moveIp(delta);
      return;
   };

   this.draw = function(display) {
      display.blit(this.image, this.rect);
   }

   var max = [0, 0];
   var min = [Infinity, Infinity];
   var scatter = 20;
   for (var i=0; i<10; i++) {
      // FIXME not random, make predictable generator
      var p = $v.add(pos, [scatter/2 - Math.random() * scatter, scatter/2 - Math.random() * scatter]);
      min[0] = Math.min(min[0], p[0]);
      max[0] = Math.max(max[0], p[0]);
      min[1] = Math.min(min[1], p[1]);
      max[1] = Math.max(max[1], p[1]);
      particles.push(p);
   };
   var width = max[0] - min[0] || 1;
   var height = max[1] - min[1] || 1;
   var pos = [
      min[0] - 10,
      min[1] - 10
   ];
   var dim = [
      width + 20,
      height + 20
   ];
   this.rect = new gamejs.Rect(pos, dim);
   this.image = new gamejs.Surface(this.rect);
   particles.forEach(function(p) {
      glowCircle(this.image, 'rgba(255, 0, 0,', $v.subtract(p, pos), 1, 3);
   }, this);
   return this;
};
$o.extend(ProjectileCloud, gamejs.sprite.Sprite);

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

function glowRect(surface, rect, width) {
   var r = rect.clone();
   var STEP_SIZE = 1;
   gamejs.draw.rect(surface, '#ffffff', rect, STEP_SIZE * 2);
   for (var i=0;i<width;i++) {
      r.left -= STEP_SIZE;
      r.top -= STEP_SIZE;

      r.width += STEP_SIZE*2;
      r.height += STEP_SIZE*2;
      var a = 0.5 - ( 0.48 *  (i/width) );
      gamejs.draw.rect(surface, 'rgba(12,4,118,' + a + ')', r, STEP_SIZE);
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
      glowCircle(display, 'rgba(187,190,255,', vehicle.rect.center, vehicle.rect.width / 1.5, 8);
   if (vehicle.behaviour.type !== 'stop') {
      gamejs.draw.line(display, 'white', vehicle.rect.center, vehicle.behaviour.target, 2);
      drawCrossHair(display, vehicle.behaviour.target);
   }
   var thrustPercent = $v.len(vehicle.velocity) / vehicle.maxSpeed;
   var displaySpeed = parseInt(100 * thrustPercent, 10);
   var color = 'white';
   if (thrustPercent > 0.8) {
      color = '#04750b';
   }
   display.blit(HUD_FONT.render('Thrust ' + displaySpeed + '%', color), vehicle.rect.bottomleft);
   var pos = vehicle.rect.bottomleft;
   vehicle.weapons.forEach(function(w) {
      pos = $v.add(pos, [0, 15]);
      var displayCooldown = parseInt(100 * w.cooldownStatus / w.cooldownDuration, 10);
      var color = 'white';
      if (w.cooldownStatus >= w.cooldownDuration) {
         color = '#04750b';
      }
      display.blit(HUD_FONT.render(w.displayName + ' ' + displayCooldown + '%', color), pos);
   });

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

   'sounds/negative_2.ogg',

].concat(UNIT_SELECTED_SOUNDS));
gamejs.ready(function() {

   /**
    * handle events
    */
   var selectedVehicles = null;
   var selectDown = null;
   var selectRect = null;
   function handle(event) {
      /** MOUSE 0 DOWN **/
      if ((event.type === gamejs.event.MOUSE_DOWN) &&
         (event.button === 0)) {
         selectDown = event.pos;
      /** MOUSE 0 UP **/
      } else if ((event.type === gamejs.event.MOUSE_UP) &&
           (event.button === 0) ) {
         var pos = event.pos;
         var vehiclesClicked = vehicles.collidePoint(event.pos);
         if (selectRect) {
            selectedVehicles = vehicles.sprites().filter(function(v) {
               return (v.rect.collideRect(selectRect));
            });
         } else if (vehiclesClicked && vehiclesClicked.length) {
            // vehicle select?
            selectedVehicles = [vehiclesClicked[0]];
            var soundName = UNIT_SELECTED_SOUNDS[parseInt(Math.random() * UNIT_SELECTED_SOUNDS.length - 1)];
            (new gamejs.mixer.Sound(soundName)).play();
            gamejs.log('vehicle selected ', selectedVehicles);
         } else if (selectedVehicles) {
            selectedVehicles.forEach(function(v) {
               v.behaviour.type = 'seek';
               v.behaviour.target = pos;
            });
            var soundName = 'sounds/engine_' + Math.round(Math.random() * 1) + '.ogg';
            (new gamejs.mixer.Sound(soundName)).play();
            gamejs.log('Vehicle order confirmed ', pos);
         }
         selectRect = null;
         selectDown = null;
      /** MOUSE MOTION **/
      } else if ((event.type === gamejs.event.MOUSE_MOTION) && selectDown) {
         var delta = [event.pos[0] - selectDown[0], event.pos[1] - selectDown[1]];
         if ($v.len(delta) > 10) {
            selectRect = new gamejs.Rect(selectDown, [event.pos[0] - selectDown[0], event.pos[1] - selectDown[1]]);
            selectedVehicles = null;
         } else {
            selectRect = null;
         }
      /** MOUSE 0 UP **/
      } else if((event.type === gamejs.event.MOUSE_UP) && event.button === 2) {
         selectRect = null;
         selectDown = null;
         selectedVehicles = null;
         (new gamejs.mixer.Sound('sounds/negative_2.ogg')).play();
      } else if((event.type === gamejs.event.KEY_UP)) {
         if (selectedVehicles) {
            var fireWeapon = false;
            selectedVehicles.forEach(function(v) {
               v.weapons.forEach(function(w) {
                  if (w.key === event.key && w.cooldownStatus >= w.cooldownDuration) {
                     if (w.type === 'ProjectileCloud') {
                        w.cooldownStatus = 0;
                        clouds.add(new ProjectileCloud(v.rect.center, v.velocity));
                        fireWeapon = true;
                     }
                  }
               });
            });
            if (!fireWeapon) {
               if (event.key == gamejs.event.K_s) {
                  selectedVehicles.forEach(function(v) {
                     v.behaviour.type = 'stop';
                  });
               }
            }
         }
      }
   };

   /**
    * mainloop
    *
    */
   function tick(msDuration) {
      display.fill('#dddddd');
      display.blit(background);
      // game loop
      clouds.update(msDuration);
      vehicles.update(msDuration);
      // kill out of bounds clouds
      clouds.forEach(function(c) {
         if (!display.rect.collideRect(c.rect)) {
            c.kill();
            gamejs.log('Killed ', c);
         }
      });
      if (selectedVehicles && selectedVehicles.length) {
         selectedVehicles.forEach(function(v) {
            drawVehicleHud(display, v);
         });
      }
      if (selectRect) {
         gamejs.draw.rect(display, '#0c0476', selectRect, 2);
      }
      vehicles.draw(display);
      clouds.draw(display);
      gamejs.event.get().forEach(handle);
   };

   /**
    * main constructor
    */

   var background = gamejs.image.load('images/background.png');
   var SCREEN_DIMENSION = background.getSize();
   var display = gamejs.display.setMode(SCREEN_DIMENSION);
   // hackish, disable right click
   disableMouseSelect();
   // hackish, attaching class property once ready thus image loaded
   CROSSHAIR_MOVE = gamejs.image.load('images/circle-02.png');
   display.blit(background);
   var vehicles = new gamejs.sprite.Group();
   var clouds = new gamejs.sprite.Group();
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
   gamejs.time.fpsCallback(tick, this, 26);
   });
