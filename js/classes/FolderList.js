let FolderList = class {
    constructor(_folderList) {

        this.preInits();

        this.folderList = _folderList;
        this.updateFolders()
    }

    preInits() {
        this.container = scene.add.container().setName('folderListContainer').setDepth(consts.depths.mainFolderList);
    }

    drawFolderList() {
        let fV = vars.fonts;
        let font = fV.default;
        let tint = fV.colours.bright_1;
        let startXY = { x: 10, y: 10 };
        let yInc = 42;

        this.folderList.forEach((_f,_i)=> {
            let folderIcon = scene.add.image(startXY.x, startXY.y, 'ui', 'folderIcon').setOrigin(0);
            let folderName = scene.add.text(startXY.x+70, startXY.y+5, _f, font).setTint(tint).setName(`folder_${_i}`).setInteractive();
            folderName.setData({ folderName: _f });
            
            startXY.y += yInc;
            this.container.add([folderIcon, folderName]);
        });

        
        let height = startXY.y+60;
        this.container.minY = 0;
        this.container.maxY = consts.canvas.height-height;
        
        this.container.setSize(2560/2, height).setInteractive();
        vars.input.enableDrag(this.container);

        this.setContainerSize();
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
}