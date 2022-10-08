let FileList = class {
    constructor(_folderList, _fileList, _folderName) {

        this.errors = [];
        this.phaserObjects = {};

        this.preInits(); // on generation we do some pre-inits

        this.initGraphics();

        // initialise the folder and file lists
        this.folderName = '';
        this.folderList = [];
        this.fileList = [];

        this.isCropped = false;

        this.maxContainerWidth=consts.canvas.width/2; // this stops the pop up file lists from being insanely wide when an audio books name is really long
        this.maxContainerHeight=consts.canvas.height*0.75; // this stops the pop up file lists from being insanely long



        // CHECK FOR A VALID FILE OR FOLDER SET
        if (!_folderList.length && !_fileList.length || !checkType(_folderName, 'string')) {
            let msg = 'Both the folder list and files list were empty!\nNothing to do.';
            this.errors.push(msg);
            vars.DEBUG && console.warn(msg);
            return msg;
        };

        
        this.folderName = _folderName;
        vars.App.foldersWithFileLists.push(this.folderName);
        this.folderList = _folderList;
        this.fileList = _fileList;
        // if there are enough files in the file list so that they go off the bottom edge,
        // this var tells the scroller how many should be visible at any one time
        this.filesPerPage = 0;

        this.buildFileList();
    }
    initGraphics() {
        this.graphics = scene.add.graphics();
        this.graphics.lineStyle(4, 0x999999);
        this.graphics.fillStyle(0xffffff,0.025);
    }

    preInits() {
        this.containerID = 'fl_' + generateRandomID();

        this.container = scene.add.container().setName(`fileListContainer`).setDepth(consts.depths.fileListOnTop).setSize(600,600).setInteractive();
        this.container.ID = this.containerID;
        vars.input.enableDrag(this.container);

        this.filesGroup = scene.add.group().setName('files');

        let bg = this.phaserObjects.containerBG = scene.add.image(0,0,'whitepixel').setName('fileListBG').setOrigin(0).setTint(0x222222).setAlpha(0.95);
        this.container.add(bg);

    }

    addAllToContainer(_objects) {
        let is_array = checkType(_objects, 'array');
        let is_object = checkType(_objects, 'object');
        if (!is_array || !is_object) return false;

        vars.DEBUG && console.log(`Adding an ${ is_array ? 'array of objects' : 'object'} to the File List container`);
        this.container.add(_objects);
        return true;
    }

    addScrollBar(_widthOfContainer, _heightOfContainer) {
        // figure out the scale of the scroll bar
        let x = _widthOfContainer + 70;
        let borderTop = 120;
        let borderLower = 0;
        let y = borderTop;
        let width = 30;
        let containersRealHeight = _heightOfContainer+borderTop+borderLower;
        let height = this.maxContainerHeight/containersRealHeight*this.maxContainerHeight;

        let scrollBar = this.phaserObjects.scrollBar = scene.add.image(x,y,'whitepixel').setOrigin(1,0).setScale(width,height).setName('scrollBar').setInteractive();
        scrollBar.minY = borderTop;
        scrollBar.maxY = this.maxContainerHeight-height;
        scrollBar.forContainerID = this.containerID;
        vars.input.enableDrag(scrollBar);

        this.container.add(scrollBar);

    }

    buildFileList(_folderList=[], _fileList=[]) {
        // if a new _folderList was passed empty out the current one
        if (_folderList.length) { this.folderList = _folderList; };
        // same for the file list
        if (_fileList.length) { this.fileList = _fileList; };

        let fV = vars.fonts;
        let font = fV.default;
        let startXY = { x: 60, y: 20 };
        this.yInc = 42;

        let widthOfContainer = 600; // minimum width of the file list container

        // HEADER
        let folderTitle = this.phaserObjects.folderTitle = scene.add.text(startXY.x-30, startXY.y, this.folderName, { ...font, ...{fontSize: 36 }}).setTint(fV.colours.white);
        this.cropObject(folderTitle);
        folderTitle.x + folderTitle.width > widthOfContainer ? widthOfContainer = folderTitle.x + folderTitle.width : null;
        this.container.add(folderTitle);
        startXY.y+=this.yInc*1.5;

        this.listMinY = startXY.y;

        
        // FIRST DEAL WITH FOLDERS FOUND IN THE SUBFOLDER
        let fLPos = 0;
        let itemTint = fV.colours.bright_1;
        this.folderList.forEach((_f,_i)=> {
            let folderIcon = scene.add.image(startXY.x, startXY.y, 'ui', 'folderIcon').setOrigin(0);
            folderIcon.fLPos=fLPos;
            let folderName = scene.add.text(startXY.x+60, startXY.y+5, _f, font).setName(`folder_${_i}`).setData({subFolder: true, parentFolder: this.folderName, folderName: _f }).setTint(itemTint).setInteractive();
            folderName.fLPos=fLPos;
            if (folderName.y+folderName.height>this.maxContainerHeight) {
                folderIcon.setVisible(false); folderName.setVisible(false);
            };
            folderIcon.visible && (this.filesPerPage++);
            this.cropObject(folderName);
            folderName.setData({ folderName: _f });

            folderName.x + folderName.width > widthOfContainer ? widthOfContainer = folderName.x + folderName.width : null;
            
            startXY.y += this.yInc;

            this.addAllToContainer([folderIcon, folderName]);
            this.filesGroup.addMultiple([folderIcon,folderName]);

            fLPos++;
        });


        // NOW DEAL WITH FILES FOUND IN THE SUBFOLDER
        this.fileList.forEach((_f,_i)=> {
            let fileIcon = scene.add.image(startXY.x, startXY.y, 'ui', 'audioFileIcon').setOrigin(0);
            fileIcon.fLPos = fLPos;
            let fileNameSansExt = _f.replace(consts.fileExtensionRegEx,'');
            let fileName = scene.add.text(startXY.x+60, startXY.y+5, fileNameSansExt, font).setName(`file_${_i}`).setTint(itemTint).setInteractive();
            fileName.fLPos = fLPos;
            if (fileName.y+fileName.height>this.maxContainerHeight) {
                fileIcon.setVisible(false); fileName.setVisible(false);
            };
            fileIcon.visible && (this.filesPerPage++);
            this.cropObject(fileName);
            fileName.setData({ fileName: _f, folderName: this.folderName });

            fileName.x + fileName.width > widthOfContainer ? widthOfContainer = fileName.x + fileName.width : null;

            startXY.y += this.yInc;

            this.addAllToContainer([fileIcon, fileName]);
            this.filesGroup.addMultiple([fileIcon,fileName]);

            fLPos++;
        });

        // ADD the "ADD ALL" BUTTON (at the bottom of the file list)
        startXY.y += 15;
        let addAllIcon = scene.add.image(startXY.x-20, startXY.y, 'ui', 'addAllIcon').setOrigin(0);
        addAllIcon.fLPos=fLPos;
        let addAllText = scene.add.text(startXY.x+60, startXY.y+5, 'Add All Files', font).setName(`addAll`).setTint(itemTint).setInteractive();
        addAllText.fLPos=fLPos;
        if (addAllText.y+addAllText.height>this.maxContainerHeight) {
            addAllIcon.setVisible(false); addAllText.setVisible(false);
        };
        addAllIcon.visible && (this.filesPerPage ++);
        addAllText.setData({ files: this.fileList, folder: this.folderName, containerID: this.containerID });
        startXY.y += this.yInc;
        let heightOfContainer = addAllText.y+addAllText.height;

        this.addAllToContainer([addAllIcon, addAllText]);
        this.filesGroup.addMultiple([addAllIcon,addAllText]);

        //                                    //
        // THE LIST HAS BEEN COMPLETELY BUILT //
        ////////////////////////////////////////



        // THE REST OF THE STUFF TO BE ADDED TO THE CONTAINER ARE JUST ICONS ETC
        // FINISH OFF THE LIST CONTAINER - SETTING ITS SIZE, CREATING A BORDER ETC
        heightOfContainer<500 && (heightOfContainer=500);
        // Scroll Bar if needed
        if (heightOfContainer>this.maxContainerHeight) {
            this.addScrollBar(widthOfContainer, heightOfContainer);
            heightOfContainer = this.maxContainerHeight;
        };

        widthOfContainer>this.maxContainerWidth && (widthOfContainer=this.maxContainerWidth);
        this.container.setSize(widthOfContainer+80, heightOfContainer+40);

        // update the bg size
        this.phaserObjects.containerBG.setScale(this.container.width, this.container.height);

        // add the close button
        let closeButton = this.phaserObjects.closeButton = scene.add.image(this.container.width-3, 3, 'ui', 'closeFileList').setOrigin(1,0).setName('close_filelist').setInteractive();
        vars.plugins.add(closeButton);
        closeButton.forContainerID = this.containerID;
        // the move all button
        let moveAll = this.phaserObjects.moveAllButton = scene.add.image(this.container.width-3, 3+48+3, 'ui', 'moveAll').setOrigin(1,0).setName('addAll').setInteractive();
        vars.plugins.add(moveAll);
        moveAll.setData({ files: this.fileList, folder: this.folderName, containerID: this.containerID });
        // ADD the border
        this.graphics.fillRect(20, 20, this.container.width, this.container.height);
        this.graphics.fillStyle(0x111111);
        this.graphics.fillRect(0, 0, this.container.width, this.container.height);
        this.graphics.strokeRect(0, 0, this.container.width, this.container.height);
        this.graphics.fillStyle(0xffffff);

        this.addAllToContainer([this.graphics, closeButton, moveAll]);
        this.container.sendToBack(this.graphics);

        // Place the file list container
        let fLO = vars.containers.fileListOffsets;
        let offset = Object.keys(vars.App.fileLists).length+1;
        this.container.setPosition(offset*fLO.x, offset*fLO.y);

        this.setContainerSize();
    }

    cropObject(_object=null) {
        if (!_object) {
            let msg = `An object must be passed before it can be cropped!`;
            this.errors.splice(0,0,msg);
            console.warn(msg);
            return msg;
        };

        if (_object.x + _object.width > this.maxContainerWidth) { // the objects width is wider than allowed, crop it
            _object.setCrop(0,0,this.maxContainerWidth-_object.x,_object.height);
            this.isCropped = true;
        };
    }

    destroy() {
        let folderName = this.folderName;
        let containerID = this.containerID;
         // remove the container name from the filelistsavailable array
        let fLO = vars.App.fileListAddOrder;
        fLO.splice(fLO.findIndex((m=>m===containerID)),1);
        // and from the folder avail array
        let fWFL = vars.App.foldersWithFileLists;
        fWFL.splice(fWFL.findIndex((m=> m===folderName)),1);

        
        // DESTROYING THE CONTAINER
        if (!vars.animationsEnabled) {
            this.destroyContainer();
            return;
        };

        // if we get here animations are enabled
        let dC = this.destroyContainer;
        scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 500,
            onComplete: ()=> dC
        });
    }

    destroyContainer() {
        // destroy the container and remove it from the active fileLists
        this.container.destroy();
        return true;
    }

    scrollBarShowFiles() {
        let sB = this.phaserObjects.scrollBar;
        let minY = sB.minY;
        let maxY = sB.maxY;
        let currentY = sB.y;
        let yDelta = currentY-minY;
        let percentage = yDelta/(maxY-minY);

        //console.log(`Scroll Bar Percentage: ${percentage}`);

        let startIndex = percentage*(this.fileList.length+1-this.filesPerPage)|0; // as these are array indexes, we need to add 1 to the arrays length
        let lastIndex = startIndex+this.filesPerPage;

        this.updateFilelist(startIndex,lastIndex);
    }

    setContainerSize() {
        let hA      = this.container.input.hitArea;
        hA.width    = this.container.width;
        hA.height   = this.container.height;
        hA.left     = this.container.width/2;
        hA.right    = this.container.width/2 + this.container.width;
        hA.top      = this.container.height/2;
        hA.bottom   = this.container.height/2 + this.container.height;
    }

    updateFilelist(_from=null,_to=null) {
        if (!checkType(_from,'int') || !checkType(_to,'int')) {
            let error = `Invalid _from ${_from} or _to ${_to}. Unable to rebuild the list`;
            this.errors.splice(0,0,error);
            return msg;
        };

        // first, set all the entries to invisible
        this.filesGroup.getChildren().forEach((_c)=> {
            _c.visible=false;
        });

        // now show the entries _from -> _to
        this.filesGroup.getChildren().forEach((_c)=> {
            let fLPos = _c.fLPos;
            if (fLPos>=_from && fLPos<=_to) {
                _c.visible=true; // show it
                _c.y=(fLPos-_from)*this.yInc+this.listMinY; // and move it into position
            };
        });
    }
};