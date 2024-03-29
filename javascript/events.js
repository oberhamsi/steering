var gamejs = require('gamejs');
var $o = require('gamejs/utils/objects');
var $v = require('gamejs/utils/vectors');
var $m = require('gamejs/utils/math');
var sounds = require('./sounds');

var EventHandler = exports.EventHandler = function(vehicles) {

/**
    * handle events
    */
   var selectedVehicles = null;
   var selectDown = null;
   var selectRect = null;

   var events = [];

   function handle (event) {
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
            sounds.unitSelected();
            gamejs.log('vehicle selected ', selectedVehicles);
         } else if (selectedVehicles) {
            var centers = selectedVehicles.map(function(v) {
               return v.rect.center;
            });
            // put selected vehicles on a line
            var centroid = $m.centroid(centers);
            var path = $v.subtract(centroid, pos);
            var targetDelta = $v.unit($v.rotate(path, Math.PI/2));
            var poses = [];
            if (selectedVehicles.length) {
               for (var i=0;i<selectedVehicles.length;i++) {
                  var f = i - selectedVehicles.length/2;
                  var t = $v.add(pos, $v.multiply(targetDelta, f * 50));
                  poses.push(t);
               }
            }
            selectedVehicles.forEach(function(v, idx) {
               v.behaviour.type = 'arrival';
               v.behaviour.target = poses[idx]
            });
            sounds.unitMove();
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
         sounds.unitDeselect();
      /** KEY UP **/
      } else if((event.type === gamejs.event.KEY_UP)) {
         if (selectedVehicles) {
            var fireWeapon = false;
            selectedVehicles.forEach(function(v) {
               v.weapons.forEach(function(w) {
                  if (w.key === event.key && w.cooldownStatus >= w.cooldownDuration) {
                     if (w.type === 'ProjectileCloud') {
                        custom({type: 'spawnProjectileCloud', arguments: [v.rect.center, v.orientationVector]});
                        w.cooldownStatus = 0;
                        fireWeapon = true;
                     } else if(w.type.indexOf('Laser') > -1) {
                        // FIXME custom({type: '
                        w.cooldownStatus = 0;
                        w.isActive = true;
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

   var custom = this.custom = function(event) {
      events.push(event);
   };
   this.getCustom = function() {
      return events.splice(0);
   }

   this.update =function(msDuration) {
      gamejs.event.get().forEach(handle);
   }

   this.draw = function(display) {
      if (selectRect) {
         gamejs.draw.rect(display, '#0c0476', selectRect, 2);
      }
   };

   $o.accessor(this, 'selectedVehicles', function() {
      return selectedVehicles;
   });

   return this;
};
