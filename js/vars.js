"use strict"
var vars = {
    DEBUG: false,

    version: 1.01,
    edition: 'ABP101',

    webgl: false,

    versions: [
        ['1.0', 'Everything is working properly (pretty sure).\
                 Some minor bugs remain, probably. Now defaults\
                 to NOT using webgl (as it uses about 35% of my\
                 GTX980Tis power o.0). Typing webgl at any time\
                 will switch between on and off'
        ],
        ['1.01', 'Added a sheen to the screen savers time bar']
    ],

    TODO: [
        ['The tracks stop playing when moving on to the next if\
          the browser is minimised. Howler appears to be able to\
          stream a playlist without this pause, however Ive not\
          checked the source code to see if its simply loading all\
          tracks at once.\
          I dont think theres a way to fix this in phaser as the\
          problem occurs when the old track is destroyed, then\
          filled with the new one and is played. Chrome doesnt\
          like that kind of thing, so I doubt theres a real way around it.'],
        
        ['Reducing the amount of stuff that requires webgl (tints etc).\
          Just have to change the way text is highlighted now!\
          Eventually there will be no reason to use the webgl edition']
    ],

    animationsEnabled: true,

    fonts: {
        default:  { fontFamily: 'Consolas', fontSize: '24px', color: '#ffffff' },
        stroke : { stroke: '#000000', strokeThickness: 3 },
        colours: {
            default: 0x666666,
            bright_1: 0x999999,
            white: 0xffffff
        }
    },

    init: (_phase)=> {
        switch (_phase) {
            case 'PRELOAD': // PRELOADS
                vars.files.loadAssets();
                vars.localStorage.init();
                break;
            case 'CREATE': // CREATES
                vars.anims.init();
                vars.audio.init();
                vars.containers.init();
                vars.groups.init();
                vars.input.init();
                vars.UI.init();
                break;
            case 'STARTAPP': // GAME IS READY TO PLAY
                vars.App.init();
            break;

            default:
                console.error(`Phase (${_phase}) was invalid!`);
                return false;
            break;
        }
    },

    files: {
        audio: {
            load: ()=> {
                scene.load.audio('whooshIn','audio/whooshIn.ogg');
                scene.load.audio('whooshOut','audio/whooshOut.ogg');
            }
        },

        fonts: {
            load: ()=> {
                //scene.load.bitmapFont('default', 'fonts/defaultFont.png','fonts/defaultFont.xml');
            }
        },

        images: {
            load: ()=> {
                let f = 'images';
                ['whitepixel','pixel15','pixel2','pixel3','pixel6','pixel9','pixelC'].forEach((_key)=> {
                    scene.load.image(_key, `${f}/${_key}.png`);
                });
                scene.load.image('positionBarPixel', `${f}/positionBarPixel.png`); // needed for non webgl version
                // PLAYER
                scene.load.atlas('player', `${f}/player.png`, `${f}/player.json`);
                // SCREEN SAVER
                scene.load.atlas('screenSaver', `${f}/screenSaver.png`, `${f}/screenSaver.json`);
                // UI
                scene.load.atlas('ui', `${f}/ui.png`, `${f}/ui.json`);
            }
        },

        loadAssets: ()=> {
            scene.load.setPath('assets');

            let fV = vars.files;
            fV.audio.load();
            fV.images.load();
            scene.load.setPath('');
        }
    },

    containers: {
        fileListOffsets: { x: 120, y: 60 },

        init: ()=> {
            let depths = consts.depths;
            !scene.containers && (scene.containers = {});
            scene.containers.popup = scene.add.container().setName('popup').setDepth(depths.popup);
        },

        bringFileListToTop: (_container)=> {
            let depths = consts.depths;
            // THIS NEXT LINE DOESNT WORK FOR SOME REASON!
            //if (_container.depth===depths.fileListOnTop) return false;
            let containerID = _container.ID;
            vars.DEBUG && console.log(`📦 Bringing the container with ID ${containerID} top top.`);

            let fLs = vars.App.fileLists;
            let fLO = vars.App.fileListAddOrder;
            for (let fL in fLs) {
                let depth = fL===containerID ? depths.fileListOnTop : depths.fileList;
                fLs[fL].container.depth=depth;
                if (depths.fileListOnTop) {                             // update the fLOs
                    let index = fLO.findIndex((m=>m===containerID));    // find the index of this container
                    let val = fLO.splice(index,1)[0];                   // grab the value at that index
                    fLO.push(val);                                      // and push it back ontothe end of the array
                };
            };

        },

        closeFileListContainer: (_container)=> {
            let containerID = _container.ID;
            vars.DEBUG && console.log(`Closing File List container with the ID ${containerID}`);

            // destroy the container, remove its name from the filelistsAvail array
            let fL = vars.App.fileLists[containerID];
            fL.destroy();
            delete(vars.App.fileLists[containerID]); // and remove it from fileLists

            let fLO = vars.App.fileListAddOrder;
            if (!fLO.length) return false; // no containers left? exit.



            // find the next container on top and set it to "actually" on top
            let containerName = fLO.pop();
            fLO.push(containerName);
            let container = vars.App.fileLists[containerName].container;
            if (!container) {
                console.warn(`Unable to find the container with ID ${containerName}`);
                return false;
            };
            vars.containers.bringFileListToTop(container);
        },

        fadeIn: (_containerName='', _in=true, _alpha=null, _duration=500)=> {
            let alpha = _in ? (_alpha ? _alpha : 0.95) : 0;
            if (!scene.containers[_containerName]) return false;

            let container = scene.containers[_containerName];
            if (container.alpha===alpha) return; // make sure the containers current alpha isnt already the requested alpha

            // if animations are disabled we simply set the new alpha
            if (!vars.animationsEnabled) {
                container.setAlpha(alpha);
                return 0;
            }

            // make sure theres not already a tween
            if (container.tween) { // there is, remove it
                container.tween.remove();
                delete(container.tween);
            };

            // tween the container to the required alpha
            container.tween = scene.tweens.add({
                targets: container, alpha: alpha, duration: _duration,
                onComplete: (_t,_o)=> { delete(_o[0].tween); }
            });
            return _duration;
        }
    },

    groups: {
        init: ()=> {
            scene.groups = { };
        }
    },

    localStorage: {
        pre: 'ABP_',
        recentPlaylists: [],

        // Example play list
        /*  REAL EXAMPLE
            playlists[574397742789] = 
            {
                folder: 'Aliens',
                tracks: [
                    '01 - Intro.mp4',
                    '02 - Chapter 1.mp4',
                    '03 - Chapter 2.mp4',
                    'etc',
                    '18 - Chapter 19.mp4',
                    'etc'
                ],
                currentTrack: 0, // '18 - Chapter 19.mp4',
                currentTrackLength: 283412, // length in seconds
                images: [], // initially null
                position: 0.8041,
                positionAsText: '08:05 / 10:06',
                complete: false,
                dateCreated: Date(Mon Oct 03 2022 10:03:54 GMT+0100 (British Summer Time))
                dateLastAccessed: Date(Mon Oct 03 2022 22:03:54 GMT+0100 (British Summer Time)),
            }
        */
        playlists: {},

        init: ()=> {
            let lS = window.localStorage;
            let lV = vars.localStorage;

            let pre = lV.pre;

            !lS[pre + 'playlists'] && (lS[pre + 'playlists'] = '{}');
            lV.playlists = JSON.parse(lS[pre + 'playlists']);
            JSON.stringify(lV.playlists)!=='{}' && lV.generateRecentList();


            !lS[pre + 'options'] && (lS[pre + 'options'] = JSON.stringify({ skipAmount: 10, volume: 0.4, webgl: true }));
            lV.options = JSON.parse(lS[pre + 'options']);
            vars.App.lowSpecCheck();

        },

        generateCRCString: (_folder=null, _files=null)=> {
            vars.DEBUG && console.log(`💾 Generating CRC String`);
            return `${_folder}±` + _files.join('º');
        },

        generateRecentList: ()=> {
            let lV = vars.localStorage;
            let list = lV.playlists;
            let oneMil = 1000000;
            let orderedList = [];
            let now = new Date();
            for (let crc in list) {
                if (!list[crc].dateLastAccessed) { // date last accessed doesnt exist, create it
                    list[crc].dateLastAccessed = new Date();
                    list[crc].dateCreated = new Date();
                    //                fake the hms rs val and attach it to the other details
                    orderedList.push({...{h:0,m:0,s:0}, ...{ crc: crc, folder: list[crc].folder, time: 0, trackCount: list[crc].tracks.length, currentTrack: list[crc].currentTrack, currentTrackLength: list[crc].currentTrackLength, position: (list[crc].position*oneMil|0)/oneMil }});
                } else {
                    let tS = (now - new Date(list[crc].dateLastAccessed))/1000;
                    let rs=convertSecondsToHMS(tS,true);
                    orderedList.push({...rs, ...{ crc: crc, folder: list[crc].folder, time: tS, trackCount: list[crc].tracks.length, currentTrack: list[crc].currentTrack, currentTrackLength: list[crc].currentTrackLength, position: (list[crc].position*oneMil|0)/oneMil }});
                };
            };

            lV.recentPlaylists = arraySortByKey(orderedList,'time');
        },

        saveOptions: ()=> {
            let lS = window.localStorage;
            let lV = vars.localStorage;
            let pre = lV.pre;

            lS[pre + 'options'] = JSON.stringify(lV.options);
        },

        savePlaylist: ()=> {
            vars.DEBUG && console.log(`💾 Saving playlist`);
            let lS = window.localStorage;
            let lV  = vars.localStorage;

            let pre = lV.pre;
            lS[pre + 'playlists'] = JSON.stringify(lV.playlists);
        },

        updateSavedPlaylist: ()=> {
            vars.DEBUG && console.log(`💾 Updating playlist \n(this now simply calls savePlaylist as each playlist is modified on the fly, hence they just need saving)`);
            if (Object.keys(vars.localStorage.playlists).includes('null')) {
                let error = `updateSavedPlaylist was called but theres an invalid (null) entry.\nPausing execution.\nThis can happen when a playlist is saved without a crc (not sure why, hence the error popup)`;
                alert(error);
                console.error(error);
                debugger;
                return false;
            }
            vars.localStorage.savePlaylist();
        }
    },



    App: {
        ready: false,

        folderList: null,
        folderRequested: null, // this holds the folder that was requested. its used when the response is empty. if this happens its because json_encode failed when going through the folders entries
        foldersWithFileLists: [],
        fileListAddOrder: [],
        fileLists: {
            
        },
        longBar: null, // populated if the book is greater than 90m

        player: null,

        init: ()=> {
            vars.DEBUG && console.log(`🟩🟩🟩🟩🟩🟩🟩🟩\n%c FN: App > init\n%c🟩🟩🟩🟩🟩🟩🟩🟩\n`, `${consts.console.defaults} ${consts.console.colours.important}`, 'font: default' );

            new HTTPRequest('getFolder.php'); // these requests are self contianed, so we dont have to set them to a variable

            let App = vars.App;
            App.player = new AudioPlayer({ x: 0, y: 0, containerX: 1940, containerY: 20 } ); // create the audio player
            App.screenSaver = new ScreenSaver(); // create the screen saver
        },

        destroyLongBar: ()=> {
            let App = vars.App;
            if (App.longBar) {
                // a long bar exists, destroy it
                App.longBar.destroy();
                App.longBar = null;
            };
        },

        // used when files are longer than 90 minutes
        generateLongBar: (_totalTimeInSeconds=0)=> {
            if (!_totalTimeInSeconds) return false;
            vars.DEBUG && console.log(`Generating Long Bar for this file`);
            let App = vars.App;
            App.destroyLongBar();

            App.longBar = new LongBar({totalTimeInSeconds: _totalTimeInSeconds});
        },

        generateSafeFolderName: (_folderName)=> {
            let safeFolderName = '';
            _folderName.split('').forEach((_l)=> {
                if ((_l.charCodeAt(0) >= 48 && _l.charCodeAt(0) <= 58) || (_l.charCodeAt(0) >= 65 && _l.charCodeAt(0) <= 90) || (_l.charCodeAt(0) >= 97 && _l.charCodeAt(0) <= 122)) { safeFolderName+=_l; };
            });
            return safeFolderName;
        },

        generateTimeString: (_cPos, _fPos)=> {
            let position = '';
            let cPos = _cPos; let fPos = _fPos;
            cPos.h && (position += `${cPos.h}:`);
            position+=`${cPos.m.toString().padStart(2,'0')}:${cPos.s.toString().padStart(2,'0')} / `;
            fPos.h && (position += `${fPos.h}:`);
            position+=`${fPos.m.toString().padStart(2,'0')}:${fPos.s.toString().padStart(2,'0')}`;

            return position;
        },

        getMoreInfoDataFor: (_folder=null, _crc=null)=> {
            if (!_folder || !_crc) return false;

            new HTTPRequest('getMinfo.php', { folderName: _folder, crc: _crc });
        },

        getStateIconForFolder: (_folderName)=> {
            let _f = _folderName;
            let entry = Object.entries(vars.localStorage.playlists).find(m=>m[1].folder===_f || m[1].folder.includes(_f));
            
            let texture;
            if (entry && entry.length===2) {
                texture = Object.entries(vars.localStorage.playlists).find(m=> m[1].folder!==_f && m[1].folder.includes(_f)) ? 'subFolderAccessed' : entry[1].complete ? 'complete' : 'incomplete';
            } else {
                texture = 'neverAccessed';
            };

            return texture;
        },

        lowSpecCheck: ()=> {
            let lV = vars.localStorage;
            if (!lV.options.webgl) return; // webgl is already disabled, which means the low spec test has already been done and was confirmed
            let lowSpecs = ['android','iPhone','kindle','windowsPhone'];
            let lowSpec=false;
            let os = game.device.os;
            lowSpecs.forEach((_ls)=> { if (os[_ls] && !lowSpec) { lowSpec=true; }; });

            // if low spec machine was found: set webgl to false, save the options and reload
            if (lowSpec) { lV.options.webgl=false; lV.saveOptions(); window.location.reload(); };
        }
    },

    // GAME/APP
    anims: {
        init: ()=> {
            vars.DEBUG ? console.log(`%cFN: anims > init`, `${consts.console.defaults} ${consts.console.colours.functionCall}`) : null;
            
        }
    },

    audio: {
        available: [],

        init: ()=> {
            vars.DEBUG ? console.log(`%cFN: audio > init`, `${consts.console.defaults} ${consts.console.colours.functionCall}`) : null;

            scene.sound.volume = vars.localStorage.options.volume||0.4; // NOTE: this will ignore the saved volume if its 0 and reset it back to 0.4. This saves the user wondering why they cant hear their book
        },

        changeVolume: (_increase=true)=> {
            switch (_increase) {
                case true: scene.sound.volume=clamp(((scene.sound.volume*10)+1)/10,0,1); break;
                case false: scene.sound.volume=clamp(((scene.sound.volume*10)-1)/10,0,1); break;
            };

            vars.UI.updateVolumePosition();
            let lV = vars.localStorage;
            lV.options.volume=scene.sound.volume;
            lV.saveOptions();
        },

        playSound: (_key)=> {
            vars.DEBUG ? console.log(`%c .. FN: audio > playSound`, `${consts.console.defaults} ${consts.console.colours.functionCall}`) : null;

            scene.sound.play(_key);
        },
    },

    camera: {
        panning: false,

        // cameras
        mainCam: null,

        init: ()=> {
            vars.DEBUG ? console.log(`%cFN: camera > init`, `${consts.console.defaults} ${consts.console.colours.functionCall}`) : null;
            vars.camera.mainCam = scene.cameras.main;
        }
    },

    input: {
        cursors: null,
        locked: false,

        init: ()=> {
            vars.DEBUG ? console.log(`%cFN: input > init`, `${consts.console.defaults} ${consts.console.colours.functionCall}`) : null;

            scene.input.on('pointermove', function (pointer) {
                if (scene.input.mouse.locked) {
                    let gameObject = vars.App.folderList.container;

                    let mY = pointer.movementY;
                    if (gameObject.y+mY>0) { gameObject.y=0; return; };
                    if (gameObject.y+mY<gameObject.maxY) { gameObject.y=gameObject.maxY; return; };
                    gameObject.y+=pointer.movementY/consts.foldersScrollScaler;
                };

                // reset the screensaver timeout in player
                vars.App.player.resetScreenSaverTimeout();
            });

            vars.input.initKeys();
            vars.input.initCombos();

            // phaser objects
            scene.input.on('gameobjectdown', function (pointer, gameObject) {
                if (gameObject.alpha!==1) return false;

                let name = gameObject.name;

                let ignoreList = ['fileListContainer','folderListContainer','scrollBar','scrollBarPlayer','popupBG','longBarPointer'];
                if (ignoreList.includes(name)) {
                    if (name==='folderListContainer') { vars.input.lockCursorSwitch(); return false; };
                    if (pointer.button===mouseButtons.RIGHT) {
                        vars.input.closeFileList(gameObject);
                        return;
                    };
                    return false;
                };


                // MAIN INTERFACE
                // FOLDER LIST
                if (name.startsWith('folder_')) {
                    vars.input.folderClick(gameObject);
                    return;
                };
                // END OF FOLDER LIST BUTTONS


                // FILE LIST
                if (name.startsWith('file_')) {
                    let folderName = gameObject.getData('folderName');
                    let fileName = gameObject.getData('fileName');

                    vars.DEBUG && console.log(`Folder Name: ${folderName}\nFile Name: ${fileName}`);
                    vars.input.addFileToPlayer(fileName,folderName);
                    return;
                };
                if (name === 'addAll') {
                    vars.UI.showPopup(true, 'Adding all files to player\n\nPlease Wait.');

                    scene.tweens.addCounter({
                        from: 0, to: 1, duration: 500,
                        onComplete: ()=> { vars.input.addAllFilesToPlayer(gameObject); }
                    });

                    return true;
                };
                if (name==='close_filelist') {
                    let container = vars.App.fileLists[gameObject.forContainerID].container;

                    if (!container) {
                        console.warn(`Unable to find the container with ID ${gameObject.forContainerID}`);
                        return false;
                    };

                    vars.input.closeFileList(container);
                    return true;
                };
                // END OF FILE LIST


                // PLAYER BUTTONS
                if (name==='binAllFiles') {
                    let player = vars.App.player;
                    player.emptyGroup();
                    player.stopAndDestroyCurrentTrack();
                    player.resetVars();
                    player.container.hide(); // hide the player

                    vars.App.longBar && vars.App.longBar.destroy(), vars.App.longBar=null;
                    return true;
                };
                if (name==='info') { // only shows the screen saver (book over view) if a track is playing
                    let player = vars.App.player;
                    if (player.track && player.playing) {
                        let sS = vars.App.screenSaver;
                        if (!sS.container.alpha) { // is the container hidden?
                            let delay = vars.containers.fadeIn('screenSaver',true,1); // show it
                            delay*=1.1; // just making sure the screensaver fades in completely before starting the sheen timer
                            scene.tweens.addCounter({
                                from: 0, to: 1, duration: delay, onComplete: ()=> { sS.phaserObjects.timeBarSheen.timer.timerStart(); }
                            })
                        };
                    };
                    return;
                };
                if (name==='pause') {
                    vars.App.player.pause();
                    return true;
                };
                if (name==='play') {
                    vars.App.player.play();
                    return true;
                };
                if (name.startsWith('player_track_')) {
                    let trackIndex = name.replace('player_track_','')|0;
                    let player = vars.App.player;
                    player.setCurrentTrack(trackIndex+1,0);
                    player.drawPlaylist(player.folder);
                    return;
                };
                if (name==='recentButton') {
                    if (gameObject.alpha!==1) return false;
                    vars.containers.fadeIn('recentList',true,1);
                    return;
                };
                if (name==='skipBack' || name==='skipForward') {
                    vars.DEBUG && console.log(`${name} clicked`);
                    if (pointer.button===mouseButtons.LEFT) { vars.App.player.skip(gameObject.skip); }
                    if (pointer.button===mouseButtons.RIGHT) { vars.input.rightClickSkip(gameObject); } // right click on a skip button (changes the skip amount)
                    return true;
                };
                if (name.includes('Track')) {
                    let player = vars.App.player;

                    switch (name) {
                        case 'nextTrack':
                            player.getNextOrPreviousTrack();
                        break;

                        case 'previousTrack':
                            player.getNextOrPreviousTrack(false);
                        break;
                    };
                    return;
                };
                // END OF PLAYER BUTTONS


                // RECENT CONTAINER buttons
                if (name==='loadRecent') {
                    let fD = gameObject.folderData;
                    let crc = fD.crc;
                    let files = vars.localStorage.playlists[crc].tracks;
                    let folder = fD.folder;
                    // fade out the recents list
                    vars.containers.fadeIn('recentList',false);
                    // if the folder is already loaded, dont reload it
                    if (folder===vars.App.player.folder) return false;

                    gameObject.setData({ files: files, folder: folder, crc: crc });
                    vars.input.addAllFilesToPlayer(gameObject);
                    // as this skips the file list pop up we need to get the images from the playlist
                    new HTTPRequest('getBookImagesForFolder.php', { folderName: folder});
                    return;
                };
                if (name==='recentBG') {
                    vars.containers.fadeIn('recentList',false);
                    return;
                };
                // END OF RECENT CONTAINER BUTTONS
                

                // SCREEN SAVER BUTTONS
                if (name==='internetSearch') {
                    vars.App.screenSaver.searchForBookImages();
                    return true;
                };
                if (name==='screenSaverBG') {
                    vars.App.screenSaver.hide();
                    return;
                };
                if (name==='screenSaverBookImage') {
                    vars.App.screenSaver.showNextBookImage();
                    return;
                }
                // END OF SCREEN SAVER BUTTONS
                

                console.warn(`Unknown object with name ${name} clicked.`)
            });
            scene.input.on('gameobjectup', function (pointer, gameObject) {
                let name = gameObject.name;

                if (name==='folderListContainer') {
                    vars.input.lockCursorSwitch(false);
                };
            });

            scene.input.on('gameobjectover', function (pointer, gameObject) {
                let name = gameObject.name;
                name.includes('Container') ? (game.canvas.style.cursor='grab') : name=='recentBG' ? (game.canvas.style.cursor='default') : (game.canvas.style.cursor='crosshair');
                if (name.startsWith('folder_')) {
                    vars.webgl ? gameObject.setTint(vars.fonts.colours.white) : gameObject.setAlpha(1);
                };

                if (name.startsWith('player_track_')) {
                    !vars.webgl && gameObject.setAlpha(1);
                    vars.App.player.showFullName(gameObject);
                };

                if (name==='longFileBar') {
                    let lB = vars.App.longBar;
                    // make sure the container has full alpha
                    if (lB.container.alpha===0.2) {
                        lB.container.tweens.fadeIn.play();
                    };
                    vars.App.longBar.disableFadeOut();
                };
            });

            scene.input.on('gameobjectout', function (pointer, gameObject) {
                let name = gameObject.name;
                game.canvas.style.cursor='default';
                if (name.startsWith('folder_')) {
                    vars.webgl ? gameObject.setTint(vars.fonts.colours.bright_1) : gameObject.setAlpha(0.5);
                };

                if (name.startsWith('player_track_')) {
                    !vars.webgl && gameObject.setAlpha(gameObject.selected ? 1: 0.5);
                    vars.App.player.showFullNamePopup(false);
                };

                if (name==='longFileBar') {
                    vars.App.longBar.startFadeOutDelay();
                };
            });

            vars.input.initDrags();
        },
        initCombos: ()=> {
             // COMBOS
             let sIK = scene.input.keyboard;

             sIK.createCombo('webgl', { resetOnMatch: true });
             sIK.on('keycombomatch', function (event) {
                 let comboName = '';
                 event.keyCodes.forEach( (cC)=> { comboName += String.fromCharCode(cC); });
                 switch (comboName) { case 'WEBGL': vars.input.switchWEBGL(); break; };
             });
        },
        initDrags: ()=> {
            scene.input.on('dragstart', function (pointer, gameObject) {

                let oName = gameObject.name;

                if (oName.startsWith('scrollBar')) return false;

                switch (oName) {
                    case 'fileListContainer': case 'folderListContainer':
                        gameObject.isDragging=true;
                        oName==='fileListContainer' && vars.containers.bringFileListToTop(gameObject);
                        oName==='folderListContainer' && vars.App.folderList.disableClicks();
                    break;

                    case 'longBarPointer':
                        vars.App.longBar.dragStart();
                        return;
                    break;

                    case 'trackPositionPointer':
                        vars.App.player.dragStart();
                        return;
                    break;

                    default:
                        console.error(`DRAG START for ${oName} not found!`);
                        debugger;
                    break;
                };
            });

            scene.input.on('drag', function (pointer, gameObject, dragX, dragY) {
                let oName = gameObject.name;
                switch (oName) {
                    case 'fileListContainer':
                        //dragX < gameObject.minX ? dragX=gameObject.minX : dragX > gameObject.maxX ? dragX=gameObject.maxX : dragX;
                        gameObject.setPosition(dragX,dragY);
                        return true;
                    break;

                    case 'longBarPointer':
                        dragX > gameObject.maxX && (dragX=gameObject.maxX);
                        dragX < 0 && (dragX=0);
                        gameObject.x=dragX;
                        vars.App.longBar.dragUpdate();
                        return true;
                    break;

                    case 'scrollBar':
                        dragY < gameObject.minY ? dragY=gameObject.minY : dragY > gameObject.maxY ? dragY=gameObject.maxY : dragY;
                        gameObject.y = dragY;
                        // now we have to show the appropriate set of files
                        vars.App.fileLists[gameObject.forContainerID].scrollBarShowFiles();
                        return true;
                    break;

                    case 'scrollBarPlayer':
                        dragY < gameObject.minY ? dragY=gameObject.minY : dragY > gameObject.maxY ? dragY=gameObject.maxY : dragY;
                        gameObject.y = dragY;
                        vars.App.player.scrollBarShowFiles();
                        return true;
                    break;

                    case 'trackPositionPointer':
                        vars.App.player.dragUpdate(gameObject, dragX);
                        return true;
                    break;

                    case 'volumeSlider':
                        
                    break;

                    default:
                        vars.DEBUG && console.error(`DRAG for ${oName} not found!`);
                    break;
                };
            });

            scene.input.on('dragend', function (pointer, gameObject, dragX, dragY) {
                let oName = gameObject.name;

                switch (oName) {
                    case 'fileListContainer': case 'folderListContainer':
                        oName==='folderListContainer' && vars.App.folderList.disableClicks(false);
                        gameObject.isDragging = false;
                        game.canvas.style.cursor='default';
                    break;

                    case 'longBarPointer':
                        vars.App.longBar.dragEnd();
                        return;
                    break;

                    case 'trackPositionPointer':
                        vars.App.player.dragEnd();
                        return;
                    break;
                }
            });
        },
        initKeys: ()=> {
            let iV = vars.input;
            // initialise cursors
            iV.cursors = scene.input.keyboard.createCursorKeys();

            // all keys are defined here
            scene.input.keyboard.on('keydown-DELETE', ()=> {
                vars.DEBUG && console.log(`Closing top most file list`);
                let fLs = vars.App.fileLists;
                if (!Object.keys(fLs)) return false; // there are no file lists, exiting gracefully

                let found=false;
                for (let fL in fLs) {
                    if (!found && fLs[fL].container.depth===consts.depths.fileListOnTop) {
                        iV.closeFileList(fLs[fL].container);
                        found = true;
                    };
                };
            });
            
            scene.input.keyboard.on('keydown-UP', ()=> {
                vars.audio.changeVolume();
            });
            scene.input.keyboard.on('keydown-DOWN', ()=> {
                vars.audio.changeVolume(false);
            });
            scene.input.keyboard.on('keydown-SPACE', ()=> { });

            scene.input.keyboard.on('keyup-SPACE', ()=> { });


        },

        addAllFilesToPlayer: (_gameObject)=> {
            let gameObject = _gameObject;
            let files = gameObject.getData('files');
            let folder = gameObject.getData('folder');
            if (vars.App.player.folder===folder) { vars.UI.showPopup(false); return false; };
            // GENERATE A CRC FOR THIS LIST AND ITS FOLDER
            let lV = vars.localStorage;
            let crcString = vars.localStorage.generateCRCString(folder,files);
            let crc = crc32(crcString);

            // CHECK IF THIS CRC IS ALREADY SAVED
            let crcIsSaved = lV.playlists[crc] ? true : false;
            let track = 1; let position = 0;
            let date = new Date();
            if (!crcIsSaved) { // It doesnt. Create the playlist and save it
                lV.playlists[crc] = {
                    folder: folder,
                    tracks: files,
                    currentTrack: track,
                    currentTrackLength: 0, // when the track loads it will populate this field
                    position: position,
                    complete: false,
                    dateCreated: date,
                    dateLastAccessed: date
                };
                lV.savePlaylist();
            } else { // this crc already exists, grab the info we need (current track and position)
                vars.DEBUG && console.log(`💾 CRC already exists.\n  Loading the data`);
                let pL = lV.playlists[crc];
                pL.dateLastAccessed = date;
                track = pL.currentTrack;
                position = pL.position;
                lV.updateSavedPlaylist();
            };

            let player = vars.App.player; // grab the player
            player.container.show(); // show it

            // set the track and position (whether thats 1 and 0 or an actual file and position previously saved)
            player.setCurrentTrack(track, position); // set the track and position
            
            vars.DEBUG && ( console.log(`Folder: ${folder}\nFiles:`), console.log(files) );
            
            // Send the playlist to the player
            let playListVars = {
                crc: crc,
                tracks: files,
                folder: folder
            };
            player.importPlayList(playListVars);

            // Hide the pop up
            vars.UI.showPopup(false);
        },

        addFileToPlayer: (_file=null, _folder=null)=> {
            // single files can no longer be sent to the player
            return false;
            if (!_file || !_folder) {
                console.error(`File "${_file}" or folder "${_folder}" was invalid`);
                return false;
            };

            let aP = vars.App.player;
            aP.updatePlayListSingleFile(_folder, _file);
        },

        closeFileList: (_container)=> {
            vars.containers.closeFileListContainer(_container);
        },

        enableDrag: (_object)=> {
            scene.input.setDraggable(_object);
            _object.isDragging=false;
            return true;
        },

        folderClick: (_gameObject)=> {
            let folderName = _gameObject.getData('folderName');
            if (vars.App.foldersWithFileLists.includes(folderName)) return false; // is the folder contents already visible? if so, exit.

            if (!_gameObject.getData('subFolder')) {
                vars.DEBUG && console.log(`Folder with the name "${folderName}" clicked.`);

                new HTTPRequest('getFolder.php', { folderName: folderName });
                return;
            };

            // if we get here we have a subfolder
            let parentFolder = _gameObject.getData('parentFolder');
            new HTTPRequest('getFolder.php', { folderName: `${parentFolder}/${folderName}` });
        },

        lockCursorSwitch: (_lock=true)=> {
            let mouse = scene.input.mouse;
            _lock ? mouse.requestPointerLock() : mouse.releasePointerLock();
        },

        rightClickSkip: (_gameObject)=> {
            let gameObject = _gameObject;
            let player = vars.App.player;
            let container = player.container;
            
            let objects = { back: null, forward: null };
            let skipInSeconds;
            switch (gameObject.skip.value) {
                case 10:
                    objects = { forward: player.phaserObjects.forward1m, back: player.phaserObjects.back1m };
                    skipInSeconds=60;
                break;

                case 60:
                    objects = { forward: player.phaserObjects.forward5m, back: player.phaserObjects.back5m };
                    skipInSeconds=300;
                break;

                case 300:
                    objects = { forward: player.phaserObjects.forward10m, back: player.phaserObjects.back10m };
                    skipInSeconds=600;
                break;

                case 600:
                    objects = { forward: player.phaserObjects.forward10s, back: player.phaserObjects.back10s };
                    skipInSeconds=10;
                break;
            };

            // UPDATE the UI
            if (objects.back && objects.forward) {
                container.bringToTop(objects.back);
                container.bringToTop(objects.forward);
            };

            // SAVE the new skip val
            let lV = vars.localStorage;
            lV.options.skipAmount=skipInSeconds;
            lV.saveOptions();
        },

        switchWEBGL: ()=> {
            let o = vars.localStorage.options;
            o.webgl = !o.webgl;
            vars.localStorage.saveOptions();
            vars.UI.showPopup(true, `WebGL has been ${o.webgl ? 'enabled' : 'disabled' }\n\nRestarting the app in 3 seconds.`);
            scene.tweens.addCounter({ from: 0, to: 1, duration: 3000, onComplete: ()=> { window.location.reload(); }})
        },
    },

    phaserObjects: {},

    plugins: {
        add: (_gameObjects)=> {
            return false;

            if (!checkType(_gameObjects,'array')) _gameObjects = [_gameObjects];

            if (!_gameObjects.length) return false;

            _gameObjects.forEach((_gameObject)=> {
                _gameObject.glow = scene.plugins.get('rexglowfilterpipelineplugin').add(_gameObject);
            });
        }
    },

    UI: {

        init: ()=> {
            vars.DEBUG ? console.log(`%cFN: ui > init`, `${consts.console.defaults} ${consts.console.colours.functionCall}`) : null;

            let UI = vars.UI;
            
            UI.initPopup();
            UI.initRecentList();
            UI.initVolumePopup();

            let cC = consts.canvas;
            let history = vars.phaserObjects.history = scene.add.image(cC.width-20, cC.height-60 , 'ui', 'historyImage').setOrigin(1).setName('recentButton').setInteractive();
            let hide = scene.add.tween({
                targets: history,
                alpha: 0,
                duration: 500,
                paused: true,
            });
            let show = scene.add.tween({
                targets: history,
                alpha: 1,
                duration: 500,
                paused: true,
            });
            history.tweens = { hide: hide, show: show };
            let vText = scene.add.text(cC.width-10, cC.height-10, `VERSION: ${vars.version}${vars.version<0.999 ? 'β': vars.version<1 ? 'RC' : vars.version} (${vars.edition})`,vars.fonts.default).setDepth(999).setAlpha(0.1).setOrigin(1);
            vars.webgl && scene.add.image(cC.width*0.75, cC.height-10, 'ui','webgl').setOrigin(0.5,1).setDepth(consts.depths.player-1);
            let seconds = 1000;
            let delay = 30*seconds;
            vText.tween = scene.add.tween({ targets: vText, delay: delay, duration: 1000, alpha: 0.8, yoyo: true, loop: true});
        },

        initPopup: ()=> {
            let cC = consts.canvas;
            let container = scene.containers.popup;

            let bg = vars.UI.generateBackground();
            bg.setName('popupBG').setInteractive();

            let fV = vars.fonts;
            let font = { ...fV.default, ...fV.stroke, ...{fontSize: 48, align: 'center' } };
            let popupText = vars.phaserObjects.popupText = scene.add.text(cC.cX, cC.cY, 'PRELOADING THE NEXT FILE\n\nPlease Wait', font).setOrigin(0.5);

            container.add([bg,popupText]).setAlpha(0);
        },

        initRecentList: ()=> {
            let cC = consts.canvas;
            // container and its background
            let container = scene.containers.recentList = scene.add.container().setName('recent').setDepth(consts.depths.recent)
            let bg = vars.UI.generateBackground();
            bg.setName('recentBG').setInteractive();
            container.add(bg);

            let y = cC.height*0.05;
            // container contents
            let fV = vars.fonts;
            let font = fV.default;
            // MAIN HEADING
            let headingFont = { ...font, ... { fontSize: '48px'}};
            let heading = scene.add.text(cC.cX, y, 'Recent Play Lists', headingFont).setOrigin(0.5).setTint(fV.colours.bright_1);
            container.add(heading);

            // HEADINGS
            let headings = ['Book Title / Folder', 'Track', 'Position', 'Last Accessed'];
            let xOffsets = [80,1630,1770,2470];
            y+=80;
            headings.forEach((_h,_i)=> {
                let origin = _i<headings.length-1 ? 0 : 1;
                let title = scene.add.text(xOffsets[_i], y, _h, font).setOrigin(origin,0);
                _i===1 && (xOffsets[1] = title.x+title.width/2);
                container.add(title);
            });


            let group = scene.groups.recentBooks = scene.add.group().setName('recentBooks');
            y+=50;
            let padding=15;
            let recents = vars.localStorage.recentPlaylists;

            container.alpha=0;

            if (!recents.length) { return false; };

            // we have a recents list
            recents.forEach((_f)=> {
                let folder = _f.folder;
                let lastAccessedString = `${_f.d}d ${_f.h}h ${_f.m.toString().padStart(2,'0')}m ${_f.s.toString().padStart(2,'0')}s`;
                let track = `${_f.currentTrack}/${_f.trackCount}`;
                let position = _f.position;
                let trackLengthInSeconds = _f.currentTrackLength;
                if (trackLengthInSeconds) { // we have a valid track length, figure out the current position and redefine the position var to something nicer to read
                    let cPos = convertSecondsToHMS(position*trackLengthInSeconds);
                    let fPos = convertSecondsToHMS(trackLengthInSeconds);
                    position = vars.App.generateTimeString(cPos,fPos);
                };
                checkType(position,'number') && (position=`${(position*10000|0)/100}%`);
                _f.positionAsText = position;
                vars.localStorage.playlists[_f.crc].positionAsText = _f.positionAsText; // add position as text to the playlist

                // console.log(`${folder} was last accessed ${lastAccessedString}. Current track and position ${track} @ ${position}`);
                let trackData = [folder, track, position, lastAccessedString];
                let height = 0;
                trackData.forEach((_d,_i)=> {
                    let origin = _i===1 ? 0.5 : _i<headings.length-1 ? 0 : 1;
                    let title = scene.add.text(xOffsets[_i], y, _d, font).setOrigin(origin,0).setTint(fV.colours.default);
                    !height && (height=title.height);
                    !_i && (title.setName('loadRecent').setInteractive(), title.folderData = { folder: folder, currentTrack: track, position: position, crc: _f.crc });
                    container.add(title);
                    group.add(title);
                });
                y+=height+padding;
            });
        },

        initVolumePopup() {
            let cC = consts.canvas;
            let container = scene.containers.volume = scene.add.container().setName('volume').setDepth(consts.depths.volume);
            let volume = vars.phaserObjects.volumeImage = scene.add.image(cC.cX,cC.cY,'ui','volumeImage');
            let bL = volume.getBottomLeft();
            volume.minX = bL.x+2;
            let volumePosition = vars.phaserObjects.volumePosition = scene.add.image(volume.minX, bL.y-2, 'whitepixel').setScale(45,26).setOrigin(0,1);
            volume.maxX = volume.minX+volume.width-2 - volumePosition.displayWidth;
            volume.delta = volume.maxX - volume.minX;
            container.add([volume,volumePosition]).setAlpha(0);
            container.tween = scene.tweens.add({
                targets: container,
                alpha: 0,
                delay: 2000,
                duration: 500
            });
        },

        destroyLoadingScreen: ()=> {
            scene.containers.loadingScreen.destroy(true);
            delete(scene.containers.loadingScreen);
        },

        generateBackground: ()=> {
            let cC = consts.canvas;
            let bg = scene.add.image(cC.cX, cC.cY, 'blackpixel').setScale(cC.width, cC.height);
            return bg;
        },

        generateLoadingScreen: ()=> {
            !scene.containers && (scene.containers = {});
            let container = scene.containers.loadingScreen =  scene.add.container().setName('loadingContainer').setDepth(consts.depths.loadingScreen);
            container.fadeOut = scene.add.tween({
                targets: container, alpha: 0, delay: 500, duration: 1000, paused: true, onComplete: vars.UI.destroyLoadingScreen
            });
            let cC = consts.canvas;
            let bg = vars.UI.generateBackground();
            let loadingImage = scene.add.image(cC.cX,cC.cY,'loadingScreen');
            container.add([bg,loadingImage]);
        },

        showPopup: (_show=true, _msg='')=> {
            if (_show && !_msg) {
                console.warn(`No message was set!`);
                return false;
            };

            vars.DEBUG && console.log(`${_show ? 'Showing' : 'Hiding'} popup`);

            _show && vars.phaserObjects.popupText.setText(_msg);
            vars.containers.fadeIn('popup',_show);
        },

        updateVolumePosition: ()=> {
            let container = scene.containers.volume;
            if (container.tween.isPlaying()) {
                container.tween.restart();
            } else {
                container.tween.play();
            };
            container.alpha=1;
            let volume = scene.sound.volume;
            let pO = vars.phaserObjects;
            let volumeBG = pO.volumeImage;
            let minX = volumeBG.minX;
            let delta = volumeBG.delta;
            let newX = delta*volume+minX;
            pO.volumePosition.x = newX;
        }
    }
};