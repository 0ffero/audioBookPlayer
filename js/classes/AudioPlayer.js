let AudioPlayer = class {
    constructor(_defaults) {
        this.errors = [];
        if (!_defaults) {
            this.errors.push('No Defaults Sent!');
            return 'No Defaults Sent!';
        };

        this.preInits(_defaults);

        this.init(_defaults);

    }
    preInits(_defaults) {
        // we now always generate the container
        this.container = scene.add.container().setName('audioPlayer').setDepth(consts.depths.player);
        let containerX = _defaults.containerX||0;
        let containerY = _defaults.containerY||0;
        this.container.setPosition(consts.canvas.width+20,containerY);
        this.container.startX = containerX;

        this.addAnimationsToContainer();

        // add the group that holds the track list
        this.trackListGroup = scene.add.group().setName('trackList');

    }

    init(_defaults) {
        // if there set x and y vars ?
        this.startXY = _defaults.x && _defaults.y ? { x: _defaults.x, y: _defaults.y } : { x: 0, y: 0 };

        this.playlist = []; // holds the playlist as an array of objects eg this.playlist = [{ a: 1, b: 2, c: 3}, {a: 4, b: 5, c: 6}]
        this.crcForPlaylist = null;
        this.currentTrackInt = 0;
        this.track = null; // the audio track object
        this.currentTrackTime = 0;

        this.maxFilesPerPage = 25; // this is based on the current font. if we change its size we need to change this. If I ever change it ill create a function to figure out the real amount of files per page

        this.playing = false;

        this.firstTrack=true;

        let frames = 60;
        let seconds = 1;
        this.updatePlaylistTimeout = this.updatePlaylistTimeoutMax = seconds * frames;
        this.flushToLocalStorageTimeout = this.flushToLocalStorageTimeoutMax=consts.flushToDiskTimeout; // this is how many times the local playlist is updated before its flushed to disk (localStorage). The reason for the timeout is in case theres a lot of data to be sent to lS
        this.phaserObjects = {};

        this.moreInfo = null;
        this.minfoPassedToScreenSaver = false;

        this.screenSaverTimeout = this.screenSaverTimeoutMax = 10*frames;

        this.isChangingSeekTime = false; // used while the user is dragging the seek bar

        this.initUI();
    }
    initUI() {
        // set up the fonts we'll be using
        let fV = vars.fonts;
        let font = fV.default;
        let colours = fV.colours;
        let headingFont = { ...font, ...{ fontSize: 32 } };
        let infoFont = { ...font };

        let x = this.startXY.x;
        let y = this.startXY.y;

        let texture = 'player';

        

        // BUILD THE UPPER SECTION OF THE PLAYER
        let upperSectionBG = this.phaserObjects.playerBG = scene.add.image(x, y, texture, 'playerBG').setOrigin(0);
        let upperHeight = 340;
        this.centreX = upperSectionBG.width/2; // needed for positioning the rest of the container contents

        // Header text
        let headerPadding = 45;
        y = this.startXY.y + headerPadding;
        let headerText = scene.add.text(this.centreX, y, 'CURRENTLY PLAYING', headingFont).setOrigin(0.5).setTint(colours.default);
        y+=48;
        let trackIntText = this.phaserObjects.trackInt = scene.add.text(this.centreX, y, `TRACK ${this.currentTrackInt} (0:00:00 / 00:00:00)`, infoFont).setOrigin(0.5).setTint(colours.bright_1);
        y+=40;
        let trackTitleText = this.phaserObjects.trackTitle = scene.add.text(this.centreX, y, `Nothing in playlist`, infoFont).setOrigin(0.5).setTint(colours.bright_1);
        y = trackTitleText.getBottomCenter().y + 60;

        // INTERACTIBLES
        let xOffset = 100;
        // PLAY AND PAUSE BUTTONS
        let playingButton = this.phaserObjects.playingButton  = scene.add.image(this.centreX, y, texture, 'playing').setName('play').setInteractive();
        vars.plugins.add(playingButton);
        let pausedButton = this.phaserObjects.pausedButton   = scene.add.image(this.centreX, y, texture, 'paused').setName('pause').setInteractive();
        vars.plugins.add(pausedButton);

        // SKIP THROUGH TRACK BUTTONS
        let oX = this.centreX-xOffset;
        let back10s     = this.phaserObjects.back10s        = scene.add.image(oX, y, texture, 'skipBack10s').setName('skipBack').setInteractive();
        vars.plugins.add(back10s);
        back10s.skip    = { forward: false, value: 10 };
        let back1m      = this.phaserObjects.back1m         = scene.add.image(oX, y, texture, 'skipBack1m').setName('skipBack').setInteractive();
        vars.plugins.add(back1m);
        back1m.skip     = { forward: false, value: 60 };
        let back5m      = this.phaserObjects.back5m         = scene.add.image(oX, y, texture, 'skipBack5m').setName('skipBack').setInteractive();
        vars.plugins.add(back5m);
        back5m.skip     = { forward: false, value: 300 };
        let back10m     = this.phaserObjects.back10m        = scene.add.image(oX, y, texture, 'skipBack10m').setName('skipBack').setInteractive();
        vars.plugins.add(back10m);
        back10m.skip    = { forward: false, value: 600 };

        oX = this.centreX+xOffset;
        let forward10s  = this.phaserObjects.forward10s     = scene.add.image(oX, y, texture, 'skipForward10s').setName('skipForward').setInteractive();
        vars.plugins.add(forward10s);
        forward10s.skip = { forward: true, value: 10 };
        let forward1m   = this.phaserObjects.forward1m      = scene.add.image(oX, y, texture, 'skipForward1m').setName('skipForward').setInteractive();
        vars.plugins.add(forward1m);
        forward1m.skip  = { forward: true, value: 60 };
        let forward5m   = this.phaserObjects.forward5m      = scene.add.image(oX, y, texture, 'skipForward5m').setName('skipForward').setInteractive();
        vars.plugins.add(forward5m);
        forward5m.skip  = { forward: true, value: 300 };
        let forward10m  = this.phaserObjects.forward10m     = scene.add.image(oX, y, texture, 'skipForward10m').setName('skipForward').setInteractive();
        vars.plugins.add(forward10m);
        forward10m.skip = { forward: true, value: 600 };
        
        // NEXT AND PREVIOUS TRACK BUTTONS
        oX = this.centreX+xOffset*2;
        let nextButton          = this.phaserObjects.nextButton     = scene.add.image(oX, y, texture, 'nextTrack').setName('nextTrack').setInteractive();
        vars.plugins.add(nextButton);
        oX = this.centreX-xOffset*2;
        let previousButton      = this.phaserObjects.previousButton = scene.add.image(oX, y, texture, 'previousTrack').setName('previousTrack').setInteractive();
        vars.plugins.add(previousButton);

        y+=54;
        // TRACK BAR
        let trackPositionBar    = this.phaserObjects.trackPositionBar   = scene.add.image(this.centreX, y, texture, 'trackPositionBar').setName('trackPositionBar');
        trackPositionBar.minX   = trackPositionBar.x - trackPositionBar.width/2 +1;
        trackPositionBar.maxX   = trackPositionBar.x + trackPositionBar.width/2 -1;
        trackPositionBar.delta  = trackPositionBar.maxX - trackPositionBar.minX;

        let trackPosition       = this.phaserObjects.trackPosition  = scene.add.image(trackPositionBar.minX, y, texture, 'trackPositionPointer').setName('trackPositionPointer').setInteractive();
        vars.input.enableDrag(trackPosition);
        trackPosition.minX=trackPositionBar.minX;
        trackPosition.maxX=trackPositionBar.maxX;

        vars.plugins.add(trackPosition);


        // NOW BUILD THE PLAYLIST
        let playlistBG = this.phaserObjects.playlistBG = scene.add.image(0, upperHeight, texture, 'playlistBG').setOrigin(0);

        // FINALLY ADD THE ICONS THAT CONTROL THE CURRENT LIST
        // BIN, SAVE, RECENT AND INFO ICONs
        let bR = playlistBG.getBottomRight();
        this.binIcon = scene.add.image(bR.x, bR.y+40, texture, 'binIcon').setOrigin(1,0).setName('binAllFiles').setAlpha(0.2).setInteractive();
        vars.plugins.add(this.binIcon);
        let savePlaylist = this.savePlaylistIcon = scene.add.image(bR.x-240, bR.y+48, texture, 'savePlaylistIcon').setOrigin(1,0).setName('savePlaylist').setInteractive();
        this.savePlaylistIcon.tween = scene.tweens.add({
            targets: savePlaylist,
            alpha: 0.5,
            onUpdate: ()=> { savePlaylist.frame.name!=='savingIcon' && savePlaylist.setFrame('savingIcon'); },
            onComplete: ()=> { savePlaylist.setFrame('savePlaylistIcon') },
            duration: 125, yoyo: true, repeat: 2,
        });

        let recentFiles = this.phaserObjects.recentFiles = scene.add.image(bR.x-160, bR.y+48, texture, 'historyIcon').setOrigin(1,0).setName('recentButton').setInteractive();
        !vars.localStorage.recentPlaylists.length && recentFiles.setAlpha(0.2);
        
        let infoButton = this.phaserObjects.infoButton = scene.add.image(bR.x-80, bR.y+48, texture, 'infoIcon').setOrigin(1,0).setName('info').setAlpha(0.2).setInteractive();


        // ADD EVERYTHING TO THE CONTAINER
        // THE PLAYER
        this.addAllToContainer([upperSectionBG, playlistBG, headerText, trackIntText, trackTitleText, pausedButton, playingButton, previousButton, nextButton, trackPositionBar, trackPosition, this.binIcon, this.savePlaylistIcon, recentFiles, infoButton]);
        // THE BACK AND FORWARD BUTTONS
        this.addAllToContainer([back10m,back5m,back1m,back10s,forward10m,forward5m,forward1m,forward10s]);
        this.skipsBringToTop();


        // ADD THE SCROLL BAR
        this.addScrollBar();

        // THE ACTUAL PLAY LIST IS ADDED LATER, THIS IS JUST INITIALISING EVERYTHING
    }

    addAllToContainer(_objects) {
        let is_array = checkType(_objects, 'array');
        let is_object = checkType(_objects, 'object');
        if (!is_array || !is_object) return false;

        vars.DEBUG && console.log(`Adding an ${ is_array ? `array of ${_objects.length} objects` : 'object'} to the Audio Player container`);
        this.container.add(_objects);
        return true;
    }

    addAnimationsToContainer() {
        let c = this.container;
        let cC = consts.canvas;
        let showTween = scene.add.tween({
            targets: c,
            x: c.startX,
            duration: 1000,
            ease: 'Quad.easeOut',
            paused: true
        });

        let hideTween = scene.add.tween({
            targets: c,
            x: cC.width+20,
            duration: 1000,
            ease: 'Quad.easeIn',
            onComplete: ()=> { vars.phaserObjects.history.tweens.show.play(); },
            paused: true
        });

        c.tweens = {
            show: showTween,
            hide: hideTween
        };

        
        c.hide = ()=> {
            c.onScreen = false;
            vars.animationsEnabled ? c.tweens.hide.play() : (c.x=cC.width+20, vars.phaserObjects.history.alpha=1 );
        };
        c.show = ()=> {
            c.onScreen = true;
            if (vars.animationsEnabled) {
                vars.phaserObjects.history.tweens.hide.play();
                c.tweens.show.play();
            } else {
                c.x = c.startX;
                vars.phaserObjects.history.alpha=0;
            };
        };

        c.onScreen=false;
        
    }

    // This gets called if more info was found in the cache folder
    // either by the initial http request when passing a file list
    // to the player or by the track changing
    // it pushes the current tracks saved data to the screen saver
    addMinfoDataToScreenSaver() {
        if (!this.moreInfo || !this.currentTrackInt) return false;
        
        if (this.minfoPassedToScreenSaver) return;
        this.minfoPassedToScreenSaver=true;

        let minfo = this.moreInfo;
        let trackName = this.playlist[this.currentTrackInt-1];

        let fileData = minfo[trackName];
        let general = fileData.General;
        let audio = fileData.Audio;
        
        // GENERAL
        let performer = general.Performer===general['Album/Performer'] ? !general.Performer ? '' : `Performer: ${general.Performer}` : general.Performer ? `Performer: ${general.Performer} (${general['Album/Performer']})` : `Performer: ${general['Album/Performer']} (${general.Performer})`;
        let bookName = general.Album;
        let releaseDate = general.Released_Date; // usually empty
        let releaseDateOriginal = general['Original/Released_Date'];
        let released = `Release Date: ${releaseDateOriginal} ${releaseDate && `(${releaseDate})`}`;
        let recordedDate = `Recorded: ${general.Recorded_Date}`;
        let trackRealName = general.Track;
        let comment = `Synopsis:\n${general.Comment}`;
        let duration = `Duration: ${general.Duration}`;
        
        // AUDIO
        let channels = audio['Channel(s)']|0;
        channels = channels===1 ? 'MONO' : channels===2 ? 'STEREO' : 'SURROUND';
        let bitrate = `Bit Rate: ${audio.BitRate}`;
        let sampleRate = 'Sample Rate: ' + audio.SamplingRate/1000 + 'KHz';
        
        let texts = { bookName: bookName, trackName: trackRealName, performer: performer, duration: duration, released: released, recorded: recordedDate, synopsis: comment, channels: channels, bitrate: bitrate, samplerate: sampleRate };
        vars.App.screenSaver.addFileData(texts);
    }

    addScrollBar() {
        let borderTop = 20;
        let borderLower = 20;

        // figure out the scale of the scroll bar
        let bg = this.phaserObjects.playlistBG;
        let bgTR = bg.getTopRight();
        let x = bgTR.x-5;
        let y = bgTR.y+borderTop;
        let width = 20;
        let availableHeight = this.scrollBarMaxHeight = bg.height-borderTop-borderLower; // the max height of the scroll bar
        this.scrollLowerY = bg.y+bg.displayHeight-borderLower;
        let percent = 1;

        let height = percent*availableHeight;
        let scrollBar = this.phaserObjects.scrollBar = scene.add.image(x,y,'whitepixel').setOrigin(1,0).setScale(width,height).setName('scrollBarPlayer').setInteractive();
        vars.webgl ? scrollBar.setTint(0x999999) : scrollBar.setAlpha(0.75);
        scrollBar.minY = scrollBar.y;
        scrollBar.maxY = scrollBar.y + availableHeight;
        scrollBar.maxHeight = scrollBar.displayHeight;
        vars.input.enableDrag(scrollBar);

        this.container.add(scrollBar);

        this.showScrollBar(false);

    }

    albumComplete() {
        vars.DEBUG && console.log(`%cSetting this playlist to complete`,'color: #26ac13');
        this.track && this.track.destroy(); // the track might have auto destroyed by now, this is in case it hasnt
        this.playing=false;
        // update the playlist to completed
        let lV = vars.localStorage;
        let pLs = lV.playlists;
        let pL = pLs[this.crcForPlaylist];
        pL.complete = true;
        pL.completionDate = new Date();
        pL.position = 0;
        pL.currentTrack = 1;
        pL.positionAsText = '';

        lV.updateSavedPlaylist();
        return true;
    }

    cropObject(_object=null) {
        if (!_object) {
            let msg = `An object must be passed before it can be cropped!`;
            this.errors.splice(0,0,msg);
            console.warn(msg);
            return msg;
        };

        let maxWidth = this.phaserObjects.playlistBG.width-64;
        if (_object.x + _object.width > maxWidth) { // the objects width is wider than allowed, crop it
            _object.setCrop(0,0,maxWidth-_object.x,_object.height);
        };
    }

    // RUNS IN THE UPDATE SCRIPT
    decrementPlaylistTimeout() {
        // update the playlist current track and position
        this.updatePlaylistTimeout--;
    }

    // when the user closes the page, this function is called to quickly save the play list entries
    destroy() {
        
    }

    dragEnd() {
        if (!this.track || !this.playing) return false;
        this.isChangingSeekTime=false;
        let seconds = this.tempSeekToVar;
        this.tempSeekToVar=null;
        this.seekTo(seconds);
    }
    dragStart() {
        if (!this.track || !this.playing) return false;
        this.isChangingSeekTime=true;
        this.tempSeekToVar = null;
    }
    dragUpdate(_gameObject, _dragX) {
        if (!this.track || !this.playing) return false;
        // update the track position text
        let dragX = _dragX;
        let minX = _gameObject.minX;
        let maxX = _gameObject.maxX;
        dragX > maxX && (dragX=maxX);
        dragX < minX && (dragX=minX);
        _gameObject.x=dragX;

        // figure out the time as if the user stops dragging here
        let duration = this.track.duration;
        let percent = clamp((dragX-minX)/(maxX-minX),0,1);
        let seconds = percent*duration;
        this.tempSeekToVar = seconds;
        this.updateTrackIntAndTime(seconds,duration);
    }

    drawPlaylist(_folder=null) {
        let x = 20; let intPadding = 60;
        let y = this.phaserObjects.playlistBG.y + intPadding/3;
        let fV = vars.fonts;
        let font = fV.default;
        let colours = fV.colours;

        this.listMinY = y;


        let linePadding = 10;

        let currentTrackInt = 1;
        let height = 0; // set after the first title has been added
        
        let fLPos = 0;
        let l = this.playlist.length;
        let padStart = l<100?2:3;
        let trackTextObjects = [];
        this.playlist.forEach((_entry,_i)=> {
            let vis = _i<this.maxFilesPerPage ? true : false;
            let trackIntText = scene.add.text(x, y, currentTrackInt.toString().padStart(padStart,'0'), font).setVisible(vis); // origin for text objects are always 0 (not 0.5)
            vars.webgl ? trackIntText.setTint(colours.default) : trackIntText.setAlpha(0.25);
            trackIntText.fLPos=fLPos;
            !height && ( height = trackIntText.height );

            let isCurrentTrack = currentTrackInt===this.currentTrackInt ? true : false;
            let tint = isCurrentTrack ? colours.white : colours.default;
            
            let entrySansExt = _entry.replace(consts.fileExtensionRegEx,'');
            let trackText = scene.add.text(x+intPadding, y, entrySansExt, font).setVisible(vis).setName(`player_track_${_i}`).setInteractive();
            trackText.selected = isCurrentTrack;
            vars.webgl ? trackText.setTint(tint) : trackText.setAlpha(isCurrentTrack ? 1: 0.5);
            this.cropObject(trackText);
            trackText.fLPos=fLPos;
            trackTextObjects.push(trackIntText, trackText);
            currentTrackInt++;
            y+=height+linePadding;
            !this.yInc && (this.yInc = height+linePadding);

            fLPos++;
        });

        if (this.playlist.length>this.maxFilesPerPage) {
            this.updateScrollBar(); // the playlist is bigger than the playlist area, update its details
            this.showScrollBar();
        } else {
            this.showScrollBar(false);
        };

        this.addAllToContainer(trackTextObjects);
        this.trackListGroup.addMultiple(trackTextObjects);

        this.updateTrackTitle();

        this.positionAsText && this.positionAsText.includes(':') ? this.phaserObjects.trackInt.setText(`TRACK ${this.currentTrackInt} (${this.positionAsText})`) : this.phaserObjects.trackInt.setText(this.phaserObjects.trackInt.text.replace('TRACK 0', `TRACK ${this.currentTrackInt}`));

        this.sortPlaylistObjects();
    }

    emptyGroup(_hideBin=true) {
        // destroy everything in the tracklist group
        vars.DEBUG && console.log(`🚽 Emptying the current play list`);
        this.trackListGroup.clear(true,true);
        _hideBin && this.binIcon.setAlpha(0.2);
        this.showScrollBar(false);
    }

    emptyPlaylist(_emptyGroup=false) { // called by updatePlayList if the request was to empty it
        this.playlist = [];

        // destroy everything in the tracklist group
        _emptyGroup && this.trackListGroup.clear(true,true);
    }

    flushToLocalStorage() {
        this.savePlaylistIcon.tween.play(); // flash the save icon
        this.flushToLocalStorageTimeout = this.flushToLocalStorageTimeoutMax;
        vars.localStorage.updateSavedPlaylist();
    }

    getNextOrPreviousTrack(_next=true) {
        if (!this.track) return false;
        vars.DEBUG && console.log(`Getting the NEXT track`);

        // kill the current track
        this.stopAndDestroyCurrentTrack();
        scene.cache.audio.entries.entries.currentTrack && delete(scene.cache.audio.entries.entries.currentTrack);

        if (_next) { // get the next track ?
            this.currentTrackInt+1> this.playlist.length ? this.currentTrackInt=1 : this.currentTrackInt++;
        } else { // get the previous track
            this.currentTrackInt-1>0 ? this.currentTrackInt-- : this.currentTrackInt=this.playlist.length;
        };

        this.currentTrackTime=0;
        
        // LOAD the track
        this.loadTrack();
    }

    
    
    
    // THE MAIN FUNCTION, CALLED EXTERNALLY. SETS THE PLAYLIST
    importPlayList(_playlist) { // sending just a playlist will empty the current one. if the new tracks are to be added to the current list, set _empty to false when calling
        // is this the same playlist (crc) as the one currently loaded into the player?
        if (this.crcForPlaylist && this.crcForPlaylist===_playlist.crc) return false;
        
        // NEW PLAYLIST WAS SENT
        this.firstTrack=true; // reset first track to true
        // check that the playlist has files in it
        if (!_playlist.tracks.length) {
            let error = 'No tracks in the playlist!';
            this.errors.splice(0,0,error);
            vars.DEBUG && console.warn(error);
            return error;
        };
        // Before this function is called the playlist is checked for a
        // saved "continue from" point. if it doesnt exist set the defaults
        !this.currentTrackInt && this.setCurrentTrack(); // initialise the current track if it hasnt been set yet

        this.binIcon.setAlpha(1);

        this.emptyPlaylist(); // empty out the playlist (if it exists)

        // TODO: We can probably just set the new playlist, as they cant be joined any more
        this.playlist = _playlist.tracks; // add the new playlist

        // this.FOLDER MUST ALWAYS BE SET NOW. ILL KEEP THE TEST THOUGH TO TEST THAT IT DOES EXIST
        let folder = this.folder = _playlist.folder ? _playlist.folder : null; // was a folder passed (always the case now)
        if (!folder) {
            let msg = `The folder can no longer be empty!`;
            this.errors.splice(0,0,msg);
            console.error(msg);
            return msg;
        };

        // set the internal crc to link back to the playlist
        let crc = this.crcForPlaylist = _playlist.crc;
        // now, with that info we can set the current track and position
        let lV = vars.localStorage;
        let pL = lV.playlists[this.crcForPlaylist];
        this.currentTrackInt = pL.currentTrack;
        let trackName = _playlist.tracks[this.currentTrackInt-1];
        this.currentTrackTime = pL.position;

        let pAT = this.positionAsText = pL.positionAsText ? pL.positionAsText : null;
        
        // update the position of the track bar
        this.setTrackPosition();

        // SCREEN SAVER UI UPDATE
        // Initially we set the screen saver data based on what was saved in the playlist
        // Most of this info will be overwritten if minfo is available
        if (vars.App.screenSaver) {
            let sS = vars.App.screenSaver;
            sS.changeFolder(folder);
            sS.changeTrackNameText(trackName);
            sS.changeCurrentTrackIntAndTime(this.currentTrackInt, pAT);
            sS.updateTimeBar(this.currentTrackTime);
        };

        // REDRAW THE PLAYLIST
        this.playlist.length && this.drawPlaylist(folder);

        // now that the player has been initialised with the default data
        // check if theres minfo for the album
        vars.App.getMoreInfoDataFor(folder,crc);
    }




    loadTrack() {
        let currentTrackName = this.playlist[this.currentTrackInt-1];
        scene.load.audio('currentTrack', `AudioBooks/${this.folder}/${currentTrackName}`, { stream: true });
        scene.load.start();
        this.loadingTrack = true;
    }

    pause() {
        // Update the play button to the pause
        this.container.bringToTop(this.phaserObjects.playingButton);
        this.track.pause();
        this.playing=false;
        this.showInfoButton(false);
    }

    // When the user clicks the play button, this is called
    // What is actually does it gets the current track and loads it
    // once its ready startPlayingTrack is called
    play() {
        vars.DEBUG && console.log(`🎼 Play was clicked`);

        // validate the folder and playlist
        if (!this.folder || !this.playlist.length) {
            let error = `Folder "${this.folder}" or file list is invalid.`;
            this.errors.splice(0,0,error);
            return error;
        };

        // NO ERRORS
        // Update the play button to the pause
        this.container.bringToTop(this.phaserObjects.pausedButton);

        // CHECK FOR A CRC. IF IT DOESNT EXISTS, SINGLE FILES WERE ADDED TO THE PLAYER
        // SO WE NOW HAVE TO GENERATE A PLAYLIST FOR THE SELECTED FILES
        if (!this.crcForPlaylist) {
            console.log(`This playlist has no CRC. Generating a playlist with these files in it.`);
            let crcString = vars.localStorage.generateCRCString(this.folder,this.playlist);
            this.crcForPlaylist = crc32(crcString);

            // check if this set of files has already been saved (unlikely but it can happen)
            let lV = vars.localStorage;
            let crcIsSaved = lV.playlists[crc] ? true : false;

            if (!crcIsSaved) { // looks like we have a new list of files, save the playlist
                lV.playlists[crc] = {
                    folder              : this.folder,
                    tracks              : this.playlist,
                    currentTrack        : 1,
                    currentTrackLength  : 0,
                    position            : 0,
                    positionAsText      : null,
                    complete            : false,
                    dateCreated         : new Date(),
                    dateLastAccessed    : new Date()
                };
                lV.savePlaylist();
            } else { // this crc already exists, get the current track and position
                let pL = lV.playlists[crc];
                this.currentTrackInt = pL.currentTrack;
                this.currentTrackTime = pL.position;
            };
        };

        // Load the current track
        this.loadTrack();
    }

    playlistTimeout() {
        this.updatePlaylistTimeout = this.updatePlaylistTimeoutMax; // reset the timeout

        // get the current position of the track
        let pT = this.track.seek;
        let tD = this.track.duration;
        this.currentTrackTime = pT/tD;
        if (!checkType(this.currentTrackTime,'number')) {
            console.error(`ATTEMPTING TO UPDATE THE CURRENT TIME FOR A TRACK\n\nThe current track time is invalid!\nStopping execution!`); debugger;
            return false;
        };

        // SET TRACK POSITION does several things
        // 1) Updates the track position dot on the player
        // 2) updates "position as text"
        // 3) SCREENSAVER: Updates the track position bar and "current track and time as text"
        this.setTrackPosition();

        // Update the playlist
        let lV = vars.localStorage;
        lV.playlists[this.crcForPlaylist] = { ...lV.playlists[this.crcForPlaylist], ...{ currentTrack: this.currentTrackInt, position: this.currentTrackTime, positionAsText: this.positionAsText }};
    }

    // This function takes the preloaded (next) track and moves it into the current track var
    // it will then destroy the next track (cache)
    // and play the track
    playNextTrack() {
        // kill the current track
        let player = vars.App.player;
        player.stopAndDestroyCurrentTrack();

        // update the current track, and play it
        player.currentTrackInt++;
        player.currentTrackTime=0;
        // update the ui
        player.redrawPlaylist();
        // play the track
        player.startPlayingTrack();
    }


    redrawPlaylist() {
        this.emptyGroup(false);
        this.drawPlaylist();
    }

    reduceFlushTimeout() {
        // reduce the flush to disk timeout
        this.flushToLocalStorageTimeout--;
        if (!this.flushToLocalStorageTimeout) { // if flush timeout is 0
            this.flushToLocalStorage(); // several functions call this, so the reset timeout is inside the function itself instead of above this call
        };
    }

    reduceScreenSaverTimeout() {
        if (!this.screenSaverTimeout) return false;

        this.screenSaverTimeout--;

        if (!this.screenSaverTimeout) {
            // Unlike most timeouts, we dont reset this one. Its only reset after the user closes the screensaver
            vars.containers.fadeIn('screenSaver',true,1);
        };
    }

    resetScreenSaverTimeout() {
        this.screenSaverTimeout = this.screenSaverTimeoutMax;
    }

    resetVars() {
        this.crcForPlaylist=null
        this.currentTrackInt=0;
        this.folder='';
        this.moreInfo = null;
        this.playlist = null;
        this.positionAsText=null;
        this.firstTrack=true;
    }

    scrollBarShowFiles() {
        let sB = this.phaserObjects.scrollBar;
        let minY = sB.minY;
        let maxY = sB.maxY;
        let currentY = sB.y;
        let yDelta = currentY-minY;
        let percentage = yDelta/(maxY-minY);

        //console.log(`Scroll Bar Percentage: ${percentage}`);

        let startIndex = percentage*(this.playlist.length-this.maxFilesPerPage)|0; // as these are array indexes, we need to add 1 to the arrays length
        let lastIndex = startIndex+this.maxFilesPerPage;

        this.updateFilelist(startIndex,lastIndex);
    }

    // used by longBar and player's seek icons
    seekTo(_timeInSeconds) {
        if (!this.track) return `The track is empty`;
        vars.DEBUG && console.log(`Seeking to ${_timeInSeconds}s`);
        if (this.track.duration<_timeInSeconds) {
            let duration = this.track.duration;
            this.currentTrackTime = duration-1;
            this.track.setSeek(this.currentTrackTime);
            this.setTrackPosition();
            return;
        };
        this.currentTrackTime = _timeInSeconds;
        this.track.setSeek(this.currentTrackTime);
        this.setTrackPosition();
        return;
    }

    setCurrentTrack(_trackInt=1, _timeInt=0) { // this is called externally
        vars.DEBUG && console.log(`🎼 Setting current track to ${_trackInt} and position to ${_timeInt}`);
        this.currentTrackInt = _trackInt;
        this.currentTrackTime = _timeInt;
        this.positionAsText=null;

        // update the play list
        !_timeInt && (this.crcForPlaylist && this.updateSavedPlaylist(), this.phaserObjects.trackInt.setText(`TRACK ${this.currentTrackInt} (00:00 / 00:00)`)); // if the user clicked a track the timeInt will be 0, we need to update the saved playlists

        this.emptyGroup(false);

        return true;
    }

    setTrackPosition() {
        if (this.isChangingSeekTime) return false;

        let App = vars.App;
        let percentage = this.currentTrackTime;
        let tPB = this.phaserObjects.trackPositionBar;
        let x = tPB.delta*percentage + tPB.minX;
        this.phaserObjects.trackPosition.x = x;

        // if the longBar exists, update the pointer position
        App.longBar && App.longBar.updatePointerPosition(percentage);

        if (!this.track || this.isChangingSeekTime) return;

        let positionAsText = this.updateTrackIntAndTime();
        // if the screen saver exists update the track and time
        App.screenSaver && App.screenSaver.changeCurrentTrackIntAndTime(this.currentTrackInt,positionAsText,percentage);

    }

    showInfoButton(_show=true) {
        let alpha=_show?1:0.2;
        this.phaserObjects.infoButton.setAlpha(alpha);
    }

    showScrollBar(_show=true) {
        let vis = _show ? true : false;
        this.phaserObjects.scrollBar.setVisible(vis);
    }

    skip(_skipData) {
        if (!this.track) return false;

        vars.DEBUG && console.log(_skipData);
        let currentPositionInSeconds = this.track.seek;
        let trackDuration = this.track.duration;

        currentPositionInSeconds += _skipData.forward ? _skipData.value : -_skipData.value;

        currentPositionInSeconds = clamp(currentPositionInSeconds,0,trackDuration);

        this.track.setSeek(currentPositionInSeconds);

        // update the UI, current position and screen saver
        this.setTrackPosition();
        // save the track data as the position has now changed
        this.playlistTimeout();
        this.flushToLocalStorage();
    }

    skipsBringToTop() {
        // Bring the lS.skip button to the top
        let options = vars.localStorage.options;
        let btns = [];
        let pO = this.phaserObjects;
        switch (options.skipAmount) {
            case 10:  btns = [pO.back10s,pO.forward10s]; break;
            case 60:  btns = [pO.back1m,pO.forward1m];   break;
            case 300: btns = [pO.back5m,pO.forward5m];   break;
            case 600: btns = [pO.back10m,pO.forward10m]; break;
        };
        this.container.bringToTop(btns[0]);
        this.container.bringToTop(btns[1]);
    }

    // AFTER DRAWING THE LIST OF FILES WE NEED TO REORDER
    // THE OBJECTS SO THE FILES ARE BEHIND THE MAIN
    // PLAYER OBJECT AND THE BG IS THEN SENT BEHIND THAT
    sortPlaylistObjects() {
        // SEND THE LIST OF FILES TO THE BACK
        this.trackListGroup.getChildren().forEach((_o)=> {
            this.container.sendToBack(_o);
        });
        // NOW SEND THE BG TO THE BACK
        this.container.sendToBack(this.phaserObjects.playlistBG);
    }

    // this is called after requesting the load of a track
    // but (and heres the key point) ONLY once its appeared in the cache
    startPlayingTrack() {
        vars.DEBUG && console.log(`  🎼 Track is now ready to play. PLAYING`);

        let track = this.track = scene.sound.add('currentTrack');
        track.play();

        // reset the completed and completedDate vars if approp
        let pL = vars.localStorage.playlists[this.crcForPlaylist];
        if (this.firstTrack && pL.complete) { // was completed, delete the date and reset comp var
            pL.complete=false;
            delete(pL.completionDate);
            vars.localStorage.updateSavedPlaylist();
        };

        // only do these if this is NOT the first track
        if (!this.firstTrack) {
            // update the approp info on the screensaver
            this.updateMinfoDataToScreenSaver();
        };

        let App = vars.App;
        // this track is more than [long file length] seconds, show the long bar
        track.duration>consts.longFileLength ? App.generateLongBar(track.duration) : App.destroyLongBar();

        
        // screen saver updates
        let trackName = this.playlist[this.currentTrackInt-1];
        if (this.firstTrack) {
            App.screenSaver.changeTrackNameText(trackName);
            App.screenSaver.updateBookImage(); // this will ignore repeat calls
        };
        
        this.showInfoButton(); // enable the button that gives access to the screen saver
        // PLAYER UI UPDATES
        this.updateTrackTitle();

        // set the duration of this track
        vars.localStorage.playlists[this.crcForPlaylist].currentTrackLength=this.track.duration;
        // update the UI
        this.redrawPlaylist();


        if (this.firstTrack && this.currentTrackTime) { // this is a percent normalised
            let seekTo = this.currentTrackTime*track.duration;
            vars.DEBUG && console.log(`Setting position to ${this.currentTrackTime} (${seekTo}s) of ${track.duration}`);
            track.setSeek(seekTo); // seek to the position in seconds
            this.setTrackPosition(); // update the UI
        } else {
            this.currentTrackTime=0;
        };



        // WHEN THE TRACK ENDS
        track.on('complete', ()=> {
            vars.localStorage.playlists[this.crcForPlaylist].currentTrackLength=0;
            if (this.currentTrackInt+1>this.playlist.length) {
                this.albumComplete();
                return;
            };
            vars.App.player.getNextOrPreviousTrack();
        });

        // after everything has finished updating, set playing to true
        this.playing = true;
        this.firstTrack=false; // and set first track to false which deals with updating the screensaver
    }

    stopAndDestroyCurrentTrack() {
        if (!this.playing && !this.track) return false;
        this.playing = false;
        this.track.stop();
        this.track.destroy();
        this.track = null;
    }

    updateFilelist(_from=null,_to=null) {
        if (!checkType(_from,'int') || !checkType(_to,'int')) {
            let error = `Invalid _from ${_from} or _to ${_to}. Unable to rebuild the list`;
            this.errors.splice(0,0,error);
            return error;
        };

        // first, set all the entries to invisible
        this.trackListGroup.getChildren().forEach((_c)=> {
            _c.visible=false;
        });

        // now show the entries _from -> _to
        this.trackListGroup.getChildren().forEach((_c)=> {
            let fLPos = _c.fLPos;
            if (fLPos>=_from && fLPos<=_to) {
                _c.visible=true; // show it
                _c.y=(fLPos-_from)*this.yInc+this.listMinY; // and move it into position
            };
        });
    }

    updateMinfoDataToScreenSaver() {
        if (!this.moreInfo) return false;

        vars.DEBUG && console.log(`Updating the minfo on the screen saver`);
        let minfo = this.moreInfo;
        debugger;
        let trackName = this.playlist[this.currentTrackInt-1];
        let trackData = minfo[trackName];
        vars.App.screenSaver.updateTrackName(trackData.Track);

    }

    updateSavedPlaylist() { // this is called when we change tracks, it resets the position and currentTrackLength
        let lV = vars.localStorage;
        lV.playlists[this.crcForPlaylist] = { ...lV.playlists[this.crcForPlaylist], ...{ currentTrack: this.currentTrackInt, currentTrackLength: 0, position: 0, positionAsText: null }};
        lV.updateSavedPlaylist();
    }

    updateScrollBar() {
        let sB = this.phaserObjects.scrollBar;
        let height = this.maxFilesPerPage/this.playlist.length*this.scrollBarMaxHeight;
        sB.setScale(sB.displayWidth, height);

        // now update the max y
        sB.maxY = this.scrollLowerY-sB.displayHeight;

        //console.log(`SCROLL BAR minY ${sB.minY}, maxY ${sB.maxY}`);

        this.updateFilelist(0,this.maxFilesPerPage);

        
    }

    updateTrackIntAndTime(_seconds=null,_duration=null) {
        // update the time readout
        let time; let duration;
        if (_seconds) {
            if (!_duration) {
                let error = `Seconds were passed (${_seconds}), but no duration`;
                console.warn(error);
                return error;
            };
            time = convertSecondsToHMS(_seconds);
            duration = convertSecondsToHMS(_duration);
        } else {
            time = convertSecondsToHMS(this.track.seek);
            duration = convertSecondsToHMS(this.track.duration);
        };
        let positionAsText = this.positionAsText = vars.App.generateTimeString(time,duration);
        this.phaserObjects.trackInt.setText(`TRACK ${this.currentTrackInt} (${positionAsText})`);

        return positionAsText;
    }

    updateTrackTitle() {
        let tT = this.phaserObjects.trackTitle;
        tT.setText(this.playlist[this.currentTrackInt-1]);
        // make sure the track title isnt bigger than 400px wide
        let maxW = 500;
        if (tT.width>maxW) { tT.setCrop(0,0,maxW,tT.height); tT.x=380; } else { tT.x=300; };
    }

    update() {
        if (this.loadingTrack) {
            if (scene.cache.audio.entries.entries.currentTrack) {
                this.loadingTrack=false;
                this.startPlayingTrack();
            };
        };

        if (this.track && this.playing) {
            this.decrementPlaylistTimeout();

            this.reduceScreenSaverTimeout();

            if (!this.updatePlaylistTimeout) {
                this.playlistTimeout();
                this.reduceFlushTimeout();
            };
        };
    }
};