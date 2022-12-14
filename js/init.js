vars.DEBUG && console.log('Initialising...');

// if the lS options doesnt exist - assume webgl, else load the value from lS
var config = {
    title: "Audio Book Player",
    type: Phaser.CANVAS,
    version: vars.version,
    url: window.location.href,

    banner: false,

    // web audio needs to be disabled to allow streaming of tracks
    audio: { disableWebAudio: true },

    backgroundColor: '#111111',
    disableContextMenu: true,

    height: consts.canvas.height,
    width: consts.canvas.width,

    fps: {
        min: 15,
        target: 60,
        smoothStep: true
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: consts.canvas.width,
        height: consts.canvas.height
    },

    scene: {
        preload: preload,
        create: create,
        update: update,
        pack: { files: [ { type: 'image', key: 'loadingScreen', url: 'assets/images/loadingScreen.png' }, {type: 'image', key: 'blackpixel', url: 'assets/images/blackpixel.png'} ] }
    }
};

var game = new Phaser.Game(config);
// give ourselves quick access to the clamp function
var clamp = Phaser.Math.Clamp;
/*
█████ ████  █████ █      ███  █████ ████  
█   █ █   █ █     █     █   █ █   █ █   █ 
█████ ████  ████  █     █   █ █████ █   █ 
█     █   █ █     █     █   █ █   █ █   █ 
█     █   █ █████ █████  ███  █   █ ████  
*/
function preload() {
    scene = this;
    scene.sound.pauseOnBlur = false; // stop audio pausing when the page loses focus (ie when another tab takes focus or the browser is minimised)
    vars.UI.generateLoadingScreen();
    vars.init('PRELOAD');
};



/*
█████ ████  █████ █████ █████ █████ 
█     █   █ █     █   █   █   █     
█     ████  ████  █████   █   ████  
█     █   █ █     █   █   █   █     
█████ █   █ █████ █   █   █   █████ 
*/
function create() {
    vars.init('CREATE'); // build the phaser objects, scenes etc
    vars.init('STARTAPP'); // start the app
    scene.tweens.addCounter({
        from: 0, to: 1, duration: 250,
        onComplete: ()=> { scene.containers.loadingScreen.fadeOut.play() }
    });
};