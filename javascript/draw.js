var gamejs = require('gamejs');
var $v = require('gamejs/utils/vectors');

var glowRect = exports.glowRect = function (surface, rect, width) {
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

var glowCircle = exports.glowCircle = function (display, rgbaPart, pos, radius, width) {
   gamejs.draw.circle(display, '#ffffff', pos, radius, 1);
   for (var i=0;i<width;i++) {
      var a = 0.6 - (0.48 * (i/width));
      gamejs.draw.circle(display, rgbaPart + a + ')', pos, radius+i, 1);
   };
};


/**
 * draw cross hair at target position
 */
var CROSSHAIR_MOVE = null;
var drawCrossHair = exports.drawCrossHair = function (display, target) {
   if (!CROSSHAIR_MOVE) {
      CROSSHAIR_MOVE = gamejs.image.load('images/circle-02.png');
   }
   display.blit(CROSSHAIR_MOVE, $v.subtract(target, $v.divide(CROSSHAIR_MOVE.getSize(),2)));
   return;
}
