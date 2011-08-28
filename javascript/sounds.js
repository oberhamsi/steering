var gamejs = require('gamejs');

var UNIT_SELECTED_SOUNDS = [
   'sounds/unit_selected.ogg',
   'sounds/unit_ready.ogg',
   'sounds/unit_selected_2.ogg',
   'sounds/unit_ready_2.ogg'
];
var EXPLOSION_SOUNDS = [
   'sounds/explode.ogg',
   'sounds/explodemini.ogg'
];

exports.PRELOAD = [
   'sounds/engine_0.ogg',
   'sounds/engine_1.ogg',

   'sounds/negative_2.ogg'
].concat(UNIT_SELECTED_SOUNDS).concat(EXPLOSION_SOUNDS);

exports.explosion = function() {
   var soundName = EXPLOSION_SOUNDS[parseInt(Math.random() * EXPLOSION_SOUNDS.length - 1)];
   (new gamejs.mixer.Sound(soundName)).play();
};

exports.unitSelected = function() {
   var soundName = UNIT_SELECTED_SOUNDS[parseInt(Math.random() * UNIT_SELECTED_SOUNDS.length - 1)];
   (new gamejs.mixer.Sound(soundName)).play();

};

exports.unitMove = function() {
   var soundName = 'sounds/engine_' + Math.round(Math.random() * 1) + '.ogg';
   (new gamejs.mixer.Sound(soundName)).play();
};

exports.unitDeselect = function() {
   (new gamejs.mixer.Sound('sounds/negative_2.ogg')).play();
};
