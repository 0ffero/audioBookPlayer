let FolderList = class {
    constructor(_folderList) {

        this.preInits();

        this.folderList = _folderList;
        this.updateFolders();
    }

    preInits() {
        this.container = scene.add.container().setName('folderListContainer').setDepth(consts.depths.mainFolderList);
    }

    disableClicks(_disable=true) {
        this.container.getAll().forEach((_c)=> {
            if (_c.name.startsWith('folder_')) {
                _disable ? _c.disableInteractive() : _c.setInteractive();
            };
        });
    }

    drawFolderList() {
        let fV = vars.fonts;
        let font = fV.default;
        let colour = fV.coloursHTML.bright_1;
        let startXY = { x: 10, y: 10 };
        let yInc = 42;

        let width=-Infinity;

        this.folderList.forEach((_f,_i)=> {
            let stateIconTexture = vars.App.getStateIconForFolder(_f);
            let stateIcon = scene.add.image(startXY.x, startXY.y+5,'ui',stateIconTexture).setOrigin(0);

            let folderIcon = scene.add.image(startXY.x+40, startXY.y, 'ui', 'folderIcon').setOrigin(0);
            let folderName = scene.add.text(startXY.x+110, startXY.y+5, _f, font).setName(`folder_${_i}`).setInteractive();
            let w = folderName.x+folderName.width + 20;
            folderName.setColor(colour);
            w>width && (width=w);
            folderName.setData({ folderName: _f });
            
            startXY.y += yInc;
            this.container.add([stateIcon,folderIcon, folderName]);
        });

        
        let height = startXY.y+60;
        this.container.minY = 0;
        this.container.maxY = consts.canvas.height-height;
        
        this.container.setSize(width, height).setInteractive();
        vars.input.enableDrag(this.container);

        this.setContainerSize();

        let bg = this.generateBackGround();
        this.container.add(bg).sendToBack(bg);
    }
    
    generateBackGround() {
        let height = this.container.height < consts.canvas.height ? consts.canvas.height : this.container.height;
        let bg = scene.add.image(0,0,'pixel15').setScale(this.container.width, height).setOrigin(0);
        return bg;
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


    updateFolders(_newFolderList) {
        _newFolderList ? this.folderList = _newFolderList : null; // update the list if a new one was passed

        this.drawFolderList();
    }
};