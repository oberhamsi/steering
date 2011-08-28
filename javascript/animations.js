var gamejs = require('gamejs');

var SpriteSheet = exports.SpriteSheet = function(imagePath, sheetSpec) {
   this.get = function(id) {
      return surfaceCache[id];
   };

   var width = sheetSpec.width;
   var height = sheetSpec.height;
   var image = gamejs.image.load(imagePath);
   if (sheetSpec.scale) {
      image = gamejs.transform.scale(image, sheetSpec.scale);
      width *= sheetSpec.scale[0];
      height *= sheetSpec.scale[1];
   }
   var surfaceCache = [];
   var imgSize = new gamejs.Rect([0,0],[width,height]);
   // extract the single images from big spritesheet image
   for (var i=0; i<image.rect.width; i+=width) {
       for (var j=0;j<image.rect.height;j+=height) {
         var surface = new gamejs.Surface([width, height]);
         var rect = new gamejs.Rect(i, j, width, height);
         surface.blit(image, imgSize, rect);
         surfaceCache.push(surface);
      }
   }
   return this;
};

var Animation = exports.Animation = function(spriteSheet, animationSpec, fps) {
   this.fps = fps || 6;
   this.frameDuration = 1000 / this.fps;
   this.spec = animationSpec;

   this.currentFrame = null;
   this.currentFrameDuration = 0;
   this.currentAnimation = null;

   this.spriteSheet = spriteSheet;

   this.loopFinished = false;

   this.image = null;
   return this;
}

Animation.prototype.start = function(animation) {
   this.currentAnimation = animation;
   this.currentFrame = this.spec[animation][0];
   this.currentFrameDuration = 0;
   this.update(0);
   return;
};

Animation.prototype.update = function(msDuration) {
   if (!this.currentAnimation) {
      throw new Error('No animation started. call start("fooCycle") before updating');
   }

   this.currentFrameDuration += msDuration;
   if (this.currentFrameDuration >= this.frameDuration) {
      this.currentFrame++;
      this.currentFrameDuration = 0;

      // loop back to first frame if animation finished or single frame
      var aniSpec = this.spec[this.currentAnimation];
      if (aniSpec.length == 1 || this.currentFrame > aniSpec[1]) {
         this.loopFinished = true;
         // unless third argument is false, which means: do not loop
         if (aniSpec.length === 3 && aniSpec[2] === false) {
            this.currentFrame--;
         } else {
            this.currentFrame = aniSpec[0];
         }
      }
   }

   this.image = this.spriteSheet.get(this.currentFrame);
   return;
};

Animation.prototype.isFinished = function() {
   if (!this.currentAnimation) return true;
   if (this.currentFrame > this.spec[this.currentAnimation][1]) return true;
   return false;
};

Animation.prototype.clone = function() {
   return new Animation(this.spriteSheet, this.spec, this.fps);
};
