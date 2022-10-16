let ScreenSaver = class {
    constructor() {
        
        this.phaserObjects = {};

        this.folder = null;
        this.safeFolderName = null;
        this.imageArray = []; // this is filled by the dealWithGetSubFolderResponse in HTTPRequest
        this.imagesLoading = [];
        this.imagesLoaded = [];
        this.imageForCurrentBookLoaded = false;
        this.extended = false;
        this.init();
    }

    init() {
        this.group = scene.add.group().setName('fileData'); // only used if file data was available
        this.container = scene.containers.screenSaver = scene.add.container().setName('ScreenSaver').setDepth(consts.depths.screensaver);
        let cC = consts.canvas;
        let fV = vars.fonts;
        let fontLarge = { ...fV.default, ...{ fontSize: '52px', color: '#999999'}};
        let fontSmall = { ...fV.default, ...{ fontSize: '42px', color: '#666666'}};
        let pO = this.phaserObjects;
        pO.bg = scene.add.image(cC.cX, cC.cY,'blackpixel').setScale(cC.width,cC.height).setName('screenSaverBG').setInteractive();
        
        let x = 100;
        pO.folderText = scene.add.text(x,  cC.height*0.1, 'FOLDERNAME GOES HERE', fontLarge);

        pO.trackNameText = scene.add.text(x,  cC.height*0.2, 'CURRENT FILENAME GOES HERE', fontSmall);

        pO.currentTrackIntAndTime = scene.add.text(x,  cC.height*0.3, 'Current track # 00:00 of 00:00', fontSmall);

        pO.timeBar = scene.add.image(0,cC.height,'positionBarPixel').setScale(cC.width,30).setOrigin(0,1);
        let tBSheen = pO.timeBarSheen = scene.add.image(0,cC.height,'screenSaver','positionBarSheen').setOrigin(0,1).setAlpha(0);
        let sheenTimeOut = 5*60;
        tBSheen.timer = {
            current: sheenTimeOut,
            max: sheenTimeOut,
            timerDecrement: ()=> {
                if (!tBSheen.timer.current) return false;
                tBSheen.timer.current--;
                if (!tBSheen.timer.current) { tBSheen.timer.animate(); };
            },
            timerStart: ()=> {
                tBSheen.timer.current=tBSheen.timer.max;
            },
            timerStop: ()=> {
                if (!tBSheen.timer.current) return false;
                tBSheen.timer.current=0;
                return true;
            },
            animate: ()=> {
                let tB = pO.timeBar;
                if (tB.displayWidth>tBSheen.width*2){
                    // reset the sheens x and show it
                    tBSheen.x=0;
                    tBSheen.alpha=0.3;
                    let maxX = tB.displayWidth-tBSheen.width;
                    scene.tweens.add({
                        targets: tBSheen, x: maxX, duration: 1000, // tween to maxX
                        onComplete: ()=> { // hide it again
                            scene.tweens.add({ targets: tBSheen, alpha: 0, duration: 500, onComplete: ()=> { tBSheen.timer.timerStart(); } });
                        }
                    });
                };
            }
        };

        pO.coverImage = scene.add.image(cC.width*0.75,cC.cY,'screenSaver','noBooksImages').setName('screenSaverBookImage');
        let cR = pO.coverImage.getRightCenter();
        pO.internetSearch = scene.add.image(cR.x-80,cR.y,'screenSaver','internetIcon').setOrigin(1,0.6).setName('internetSearch').setInteractive();


        this.container.add([pO.bg,pO.folderText,pO.trackNameText,pO.currentTrackIntAndTime,pO.timeBar,pO.timeBarSheen,pO.coverImage,pO.internetSearch]);

        this.container.alpha=0;

    }

    // this is called from AudioPlayer
    // only if there is file data available
    // if there isnt, the group simply contains the Folder Text, Track Name Text, Track Int and Current Time
    addFileData(_fileData) {
        this.extended = true;
        let cC = consts.canvas;
        let fV = vars.fonts;
        let fontLarge = { ...fV.default, ...{ fontSize: '52px', color: '#999999'}};
        let fontSmall = { ...fV.default, ...{ fontSize: '42px', color: '#666666'}};
        // empty the groups current contents
        this.group.clear(true,true);

        let x = 100;
        let y = cC.height*0.05;
        let padding = 24;
        
        // delete any of the data that we wont be using
        // move the audio stuff into its own object and delete it from the file data
        let audioObject = { samplerate: _fileData.samplerate, channels: _fileData.channels, bitrate: _fileData.bitrate };
        ['samplerate', 'channels', 'bitrate'].forEach(e => delete(_fileData[e]));
        // and show the new details
        let keyList = ['bookName', 'trackName', 'performer', 'duration', 'released', 'recorded', 'synopsis'];
        keyList.forEach((_k)=> {
            if (_k!=='duration') {
                let font = _k==='bookName' ? fontLarge : fontSmall;
                let textObject = this.phaserObjects[_k] = scene.add.text(x, y, _fileData[_k], font);
                _k==='synopsis' && (textObject.setWordWrapWidth(1400));
                this.container.add(textObject);
                this.group.add(textObject);

                y = textObject.y+textObject.height + padding;
            } else {
                let pO = this.phaserObjects;
                pO.currentTrackIntAndTime.y=y;
                y = pO.currentTrackIntAndTime.y+pO.currentTrackIntAndTime.height + padding;
            };
        });
        // and the audio details
        y = cC.height-60;
        let audioText = scene.add.text(x,y,`${audioObject.samplerate}, ${audioObject.bitrate}`,fontSmall).setOrigin(0,1);
        this.container.add(audioText);
        this.group.add(audioText);

        let channelFrame = `${audioObject.channels.toLowerCase()}Icon`;
        if (channelFrame!=='Icon') {
            x = audioText.x+audioText.width+32;
            let channelsIcon = scene.add.image(x,y-5,'screenSaver',channelFrame).setOrigin(0,1);
            this.container.add(channelsIcon);
            this.group.add(channelsIcon);
        };

        // and hide the old data that isnt needed anymore
        ['folderText','trackNameText'].forEach((_pO)=> {
            this.phaserObjects[_pO].alpha=0;
        });
    }

    addLoadHandler(_key) {
        scene.load.on(`filecomplete-image-${_key}`, function (key, type, data) {
            vars.DEBUG && console.log(`  💻 🖼 ${key} loaded`);
            let App = vars.App.screenSaver;
            let index = App.imagesLoading.findIndex((m=>m===key));
            App.imagesLoaded.push(App.imagesLoading.splice(index,1)[0]);
            if (App.imagesLoaded.length===1) { // first image has loaded, update the screen savers book image
                vars.DEBUG && console.log(`  >> Book image 1 (of ${App.imagesLoading.length+1}) loaded. Updating the book image`);
                App.showBookImage();
            } else if (App.imagesLoaded.length>1) {
                vars.DEBUG && console.log(`    >> Book image ${App.imagesLoaded.length} loaded`);
                App.enableBookImageSwitch();
            };
        });
    }

    changeFolder(_folder) {
        this.folder = _folder;
        this.safeFolderName = vars.App.generateSafeFolderName(this.folder); // this is used when loading the image
        this.changeFolderText();
    }

    changeFolderText(_folder) {
        this.phaserObjects.folderText.setText(this.folder);
    }

    changeTrackNameText(_trackName) {
        this.phaserObjects.trackNameText.setText(_trackName);
    }

    changeCurrentTrackIntAndTime(_trackInt,_trackTimes,_percent) { // _trackTimes = position as text
        this.phaserObjects.currentTrackIntAndTime.setText(`Current track ${_trackInt} ${_trackTimes}`);
        this.updateTimeBar(_percent);
    }

    destroyCurrentBookImage() {
        this.phaserObjects.coverImage.destroy();
        this.phaserObjects.coverImage = null;
    }

    // When the images are loading in, if only one is loaded
    // (because there is either only 1 image or the others failed)
    // the image will not be clickable.
    // However, if more than 1 image is loaded this will allow the user
    // to click on the current image to switch to the next available
    enableBookImageSwitch() {
        this.phaserObjects.coverImage.setInteractive();
    }

    foldernameToURLSafe() {
        let safe = this.folder.replaceAll(' ','+');
        return safe;
    }

    hide() { // the screen saver can ONLY be hidden IF its ALPHA is 1
        if (this.container.alpha===1) {
            let sheen = this.phaserObjects.timeBarSheen;
            let delay = vars.containers.fadeIn('screenSaver', false);
            scene.tweens.addCounter({ from: 0, to: 1, duration: delay, onComplete: ()=> { sheen.timer.timerStop(); vars.App.player.resetScreenSaverTimeout; } })
        };
    }

    loadBookImages() {
        // set the images to loaded
        // this will stop the current album attempting to
        // load a new image every time the track changes
        this.imageForCurrentBookLoaded=true;
        // LOAD THE IMAGES
        this.imagesLoading = [];
        this.imagesLoaded = [];
        this.imageArray.forEach((_imageName,_i)=> {
            let key = `${this.safeFolderName}_${_i}`;
            this.imagesLoading.push(key);
            scene.load.image(key, `AudioBooks/${this.folder}/${_imageName}`);
            // load handler
            this.addLoadHandler(key);
        });
        scene.load.start();
    }

    showBookImage(_imageIndex=0) {
        let cC = consts.canvas;
        let border = 20;
        let maxW = 1000-border*2;       // maxW = 960
        let maxH = cC.height-border*2;  // maxH = 1400 (1440-20*2)

        this.destroyCurrentBookImage();
        let totalImages = this.imagesLoaded.length;
        let imageKey = this.imagesLoaded[_imageIndex];
        let cI = this.phaserObjects.coverImage = scene.add.image(cC.cX, cC.cY, imageKey).setName('screenSaverBookImage');
        if (totalImages>1) { cI.imageIndex = _imageIndex; cI.setInteractive(); }

        let w = cI.width;
        let h = cI.height;

        let scale; let hMod = true;
        let minScale = maxH/maxW;
        if (w*minScale>h) { scale = maxW/w; hMod=false; } else { scale = maxH/h; }; // the width should never be more than 960. instead of doing 2 or 3 operations Ive joined them into one using a scalar that normalises the w and h
        cI.setScale(scale);

        // now place it based on what set the scale (w || h)
        hMod ? cI.setOrigin(1,0).setPosition(cC.width-border,border) : cI.setOrigin(1,0.5).setPosition(cC.width-border,cC.cY);

        this.container.add(cI);
    }

    showNextBookImage() {
        let iL = this.imagesLoaded;
        if (!iL || !iL.length) return false;

        let nextIndex = this.phaserObjects.coverImage.imageIndex+1;
        nextIndex===iL.length && (nextIndex=0);
        this.showBookImage(nextIndex);
    }

    searchForBookImages() {
        let url = `https://www.google.com/search?q=${this.folder}+audiobook+image&tbm=isch`;
        window.open(url);
    }


    update() {
        let sheen = this.phaserObjects.timeBarSheen;
        if (this.container.alpha===1) {
            sheen.timer.current && sheen.timer.timerDecrement();
        } else {
            sheen && sheen.timer.current && sheen.timer.timerStop();
        };
        // NOTE: THE PLAYER UPDATES THE CURRENT TRACK NUMBER AND TIME, SO ITS NOT NEEDED HERE
    }

    updateBookImage() {
        if (!this.imageArray.length) return false;
        if (this.imageForCurrentBookLoaded) return;
        vars.DEBUG && console.log(`Loading the cover image(s) for the screen saver`);

        this.loadBookImages();
    }

    updateTimeBar(_percent) {
        let tB = this.phaserObjects.timeBar;
        let widthOfScreen = consts.canvas.width;

        tB.setScale(widthOfScreen*_percent, tB.scaleY);
    }

    updateTrackName(_trackName=null) {
        if (!this.extended || !_trackName) return false;

        this.phaserObjects.trackName.setText(_trackName);
    }

};