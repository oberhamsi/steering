var gamejs = require('gamejs');
var $v = require('gamejs/utils/vectors');
var $o = require('gamejs/utils/objects');
var $m = require('gamejs/utils/math');

var anis = require('./animations');
var sounds = require('./sounds');
var glowRect = require('./draw').glowRect;
var glowCircle = require('./draw').glowCircle;

/**
 * Explosion
 */
var Explosion = exports.Explosion = function (pos, scale) {
   // initial constructor call
   if (!pos) return this;

   Explosion.superConstructor.apply(this, arguments);
   
   scale = scale || [1,1];
   this.draw = function(display) {
      display.blit(animation.image, pos);
   };

   this.update = function(msDuration) {
      animation.update(msDuration);
      if (animation.loopFinished) {
         this.kill();
      }
   };

   var explosionSheet = new anis.SpriteSheet('images/explosion.png', {width: 64, height: 64, scale: scale});
   var animation = new anis.Animation(explosionSheet, {'exploding': [0,15, false]}, 10);
   animation.start('exploding');
   this.rect = new gamejs.Rect(pos, animation.image.getSize());
   sounds.explosion();
   return this;
};
$o.extend(Explosion, gamejs.sprite.Sprite);
// DO NOT EXTEND PROTOTYPE

/**
 * ProjectileCloud
 */
var ProjectileCloud = exports.ProjectileCloud = function (eventHandler, pos, direction) {
   // first constructor call only to get this value
   if (!direction) return this;

   ProjectileCloud.superConstructor.apply(this, arguments);

   var particles = [];
   this.pos = pos;
   this.direction = $v.unit(direction);
   this.lifeDuration = 0;
   // bad this can not be random
   this.maxLife = 3 + (Math.random());

   this.update = function(msDuration) {
      var speed = 80; // pixels per second
      var delta = $v.multiply(this.direction, speed * (msDuration/1000));
      this.rect.moveIp(delta);
      this.lifeDuration += (msDuration / 1000);
      if (this.lifeDuration > this.maxLife && !this.isDead()) {
         eventHandler.custom({type: 'spawnExplosion', arguments: [this.rect.center, [0.25,0.25]]});
         this.kill();
      }
      return;
   };

   this.getForwardPosition = function(target) {
      var delta = $v.subtract(target, this.rect.center);
      var dlen = $v.len(delta);
      delta = $v.unit(delta);
      return $v.add(this.rect.center, $v.multiply(delta, dlen/2));
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
// DO NOT EXTEND PROTOTYPE
