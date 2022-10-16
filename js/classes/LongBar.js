let LongBar = class {
    constructor(_defaults={}) {
        this.errors = [];

        this.width = _defaults.width||consts.canvas.width*0.8;
        this.height = _defaults.height||50;

        if (!_defaults || !_defaults.totalTimeInSeconds) {
            let error = 'Invalid totalTimeInSeconds.\nUnable to generate long bar';
            this.errors.push(error);
            vars.DEBUG && console.error(error);
            return error;
        };

        this.totalTimeInSeconds = _defaults.totalTimeInSeconds;

        this.phaserObjects = {};
        this.timeInSeconds = 0;
        this.fadeOutDelay = this.fadeOutDelayMax = 2*60;

        this.isChangingSeekTime = false; // used while the user is dragging the seek bar, to stop it from updating the pointer position

        this.initUI();
    }

    initUI() {
        let width = this.width;
        let height = this.height;

        // get the xInc from the time in seconds
        let totalTimeInSeconds = this.totalTimeInSeconds;

        let time = convertSecondsToHMS(totalTimeInSeconds);
        let xInc = width / (time.h + (time.m/60));

        this.font = { ...vars.fonts.default, ...{ fontSize: '24px', color: '#000000' }};
        this.smallFont = { ...vars.fonts.default, ...{ fontSize: '18px' }};
        this.smallerFont = { ...this.smallFont, ...{ fontSize: '16px', color: '#666666' }};

        let cC = consts.canvas;
        let alpha = 1;
        let container = this.container = scene.add.container().setName('longFileBar').setDepth(consts.depths.longBar).setAlpha(alpha);
        container.setPosition((cC.width-width)/2, cC.height*0.8);
        let fadeInTween = scene.add.tween({
            targets: container,
            alpha: alpha,
            duration: 125,
            paused: true
        });
        let fadeOutTween = scene.add.tween({
            targets: container,
            alpha: 0.2,
            duration: 125,
            paused: true
        });
        container.tweens = {
            fadeIn: fadeInTween,
            fadeOut: fadeOutTween
        };

        // Background for the bar
        let x = 0;
        let y = 0;
        let longBarPointer = this.phaserObjects.longBarPointer = scene.add.image(x,y,'ui','longBarPointer').setName('longBarPointer').setOrigin(0.5,0).setInteractive();
        vars.input.enableDrag(longBarPointer);
        longBarPointer.minX = 0;
        longBarPointer.maxX = width;
        
        y = longBarPointer.height + 5;

        // if webgl isnt enabled, we have to add a black background as we cant tint it (hence alpha change is required, but the BG cant be transparent);
        let bgbgWidth = width+40;
        let barBGBG = scene.add.image(-20,-20,'blackpixel').setScale(bgbgWidth,1).setOrigin(0); // scaleY will be set when we know the height of the container
        let barBG = scene.add.image(x,y,'pixel6').setScale(width,height).setOrigin(0);
        let seekTime = this.phaserObjects.seekTime = scene.add.text(this.width/2, barBG.y + barBG.displayHeight/2, '0:00:00', this.font).setOrigin(0.5);
        container.add([barBGBG,longBarPointer,barBG,seekTime]);

        // draw the position spikes and times
        let longBar = {w:1,h:10};
        let shortBar = {w:1,h:5};
        let smallXInc = xInc/4;
        let hours = time.h+1;

        y+=height;
        let bgHeight = 0;
        while (hours) {
            let h = time.h+1-hours;
            let bigLine = scene.add.image(x,y,'whitepixel').setScale(longBar.w,longBar.h).setOrigin(0.5,0);
            let text = scene.add.text(x,y+longBar.h+10, `${h}h`,this.smallFont).setOrigin(0.5,0);
            !bgHeight && (bgHeight=text.y+text.height);
            container.add([bigLine,text]);

            for (let sL=1; sL<=3; sL++) {
                let littleX = x+(sL*smallXInc);
                let smallLine = scene.add.image(littleX,y,'whitepixel').setScale(shortBar.w,shortBar.h).setOrigin(0.5,0);
                let text = scene.add.text(littleX,y+shortBar.h+10, sL*15,this.smallerFont).setOrigin(0.5,0);
                container.add([smallLine,text]);
            };
            x+=xInc;
            hours--;
        };

        barBGBG.setScale(barBGBG.displayWidth,bgHeight+30);

        this.container.setSize(bgbgWidth,bgHeight).setInteractive();
        this.setContainerSize();

        this.disableFadeOut();
    }

    destroy() {
        this.container.destroy();
    }

    disableFadeOut() {
        this.fadeOutDelay = 0;
    }

    dragEnd() {
        this.isChangingSeekTime = false;
        this.setPlayerSeek();
    }
    dragStart() {
        this.isChangingSeekTime = true;
        this.disableFadeOut();
    }
    dragUpdate() {
        this.updateSetToTime();
    }

    HMSToTimeString(_hms) {
        return `${_hms.h}:${_hms.m.toString().padStart(2,'0')}:${_hms.s.toString().padStart(2,'0')}`;
    }

    setContainerSize() {
        let hA      = this.container.input.hitArea;
        hA.width    = this.container.width;
        hA.height   = this.container.height;
        hA.left     = this.container.width/2-20;
        hA.right    = this.container.width/2 + this.container.width+20;
        hA.top      = this.container.height/2;
        hA.bottom   = this.container.height/2 + this.container.height;
    }

    // called when dragging the long bar pointer ends
    setPlayerSeek() {
        //this.startFadeOutDelay(); // should this be reseting the timeout now (which stops it), as leaving the container now starts the fade out delay??? POSSIBLE TODO
        vars.App.player.seekTo(this.timeInSeconds);
    }

    startFadeOutDelay() {
        this.fadeOutDelay = this.fadeOutDelayMax;
    }

    update() {
        this.fadeOutDelay && this.updateFadeOutDelay();
    }

    updateFadeOutDelay() {
        if (!this.fadeOutDelay || this.isChangingSeekTime) return false;

        this.fadeOutDelay--;

        // fade the container out
        !this.fadeOutDelay && this.container.tweens.fadeOut.play();
    }

    updatePointerPosition(_percentage) {
        if (this.isChangingSeekTime) return false;

        let lBP = this.phaserObjects.longBarPointer;
        lBP.x = lBP.maxX*_percentage;

        this.updatePositionTimer();
    }

    updatePositionTimer() {
        this.updateSetToTime();
    }

    // called externally when draggin the long bar pointer
    updateSetToTime() {
        this.timeInSeconds = this.totalTimeInSeconds*(this.phaserObjects.longBarPointer.x/this.width);
        let hms = convertSecondsToHMS(this.timeInSeconds);
        let hmsString = this.HMSToTimeString(hms);
        this.phaserObjects.seekTime.setText(hmsString);
    }
};