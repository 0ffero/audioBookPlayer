let HTTPRequest = class {
    constructor(_endpoint, _rqVars={}) {

        this.SERVER_IP = '192.168.0.20';

        this.errors = [];
        if (!checkType(_endpoint,'string') || !_endpoint.length) {
            this.errors.splice(0,0, 'Invalid endpoint');
            return false;
        };

        this.endpoint = _endpoint;

        let postVars;

        switch (this.endpoint) {
            case 'getFolder.php':
                this.folder = _rqVars.folderName ? _rqVars.folderName : '';
                postVars = this.folder ? `folder=${this.folder}` : null;
                this.doRequest(postVars ? postVars : null);
            break;

            case 'getMinfo.php':
                if (!_rqVars.folderName || !_rqVars.crc) return false;

                this.folder = _rqVars.folderName;

                postVars = `folder=${this.folder}&crc=${_rqVars.crc}`;
                this.doRequest(postVars);
            break;

            case 'getBookImagesForFolder.php':
                if (!_rqVars.folderName) return false;

                this.folder = _rqVars.folderName;

                postVars = `folder=${this.folder}`;
                this.doRequest(postVars);
            break;
        };



        this.directoryTree = {}

    }

    doRequest(_post=null) {
        let method = 'POST';

        let http = new XMLHttpRequest();
        let url = `endpoints/${this.endpoint}`;

        // OPEN THE ENDPOINT
        http.open(method, url, true);
        
        http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

        // when the response comes back, which function should be called?
        let rsFn;
        let delay = true; // this delay is sometimes needed when the pop up is shown
        if (url.includes('getFolder.php')) {
            rsFn = !_post ? this.dealWithGetFolderResponse : this.dealWithGetSubFolderResponse;
            let msg = _post && _post.includes('folder=') ? `Loading File List for\n\n${_post.replace('folder=','')}\n\nPlease Wait` : 'Loading Main File List\n\nPlease Wait';
            vars.UI.showPopup(true,msg);
        } else if (url.includes('getMinfo.php')) {
            rsFn = this.dealWithMinfoResponse;
            delay = false;
        } else if (url.includes('getBookImagesForFolder.php')) {
            rsFn = this.dealWithBookImageResponse;
            delay = false;
        };

        if (!rsFn) {
            this.errors.splice(0,0, 'This endpoint has no function to deal with the response.\nExiting.');
            return false;
        };

        http.onreadystatechange = function() { // when state changes.
            if (http.readyState == 4 && http.status == 200) { // we have a valid response, send it to the parser function
                if (!http.responseText) {
                    console.error('The reponse was empty!');
                    debugger;
                };

                let rs = JSON.parse(http.responseText);
                rsFn(rs);
            };
        };

        // DO THE REQUEST
        if (delay) {
            scene.tweens.addCounter({
                from: 0, to: 1, duration: 500,
                onComplete: ()=> { _post ? http.send(_post) : http.send(); }
            });
        } else {
            _post ? http.send(_post) : http.send();
        };
    }

    dealWithBookImageResponse(_rs) {
        if (_rs['ERROR']) {
            console.error(_rs['ERROR']);
            return false;
        };
        vars.App.screenSaver.imageArray = _rs.images;
    }

    dealWithGetFolderResponse(_rs) {
        // show the FOLDER list
        let App = vars.App;
        if (!App.folderList) {
            App.folderList = new FolderList(_rs['folders']);
            App.ready = true;
        } else {
            App.folderList.updateFolders(_rs['folders']);
        };

        vars.UI.showPopup(false);
    }

    dealWithGetSubFolderResponse(_rs) {
        // show the FILE list
        let fileList = new FileList(_rs['folders'], _rs['files'], _rs['requested_folder']);
        vars.containers.bringFileListToTop(fileList.container);
        let App = vars.App;
        App.fileLists[fileList.containerID] = fileList;
        App.fileListAddOrder.push(fileList.containerID);

        // pass the images array to the screen saver
        App.screenSaver.imageArray = _rs.images;

        vars.UI.showPopup(false);
    }

    dealWithMinfoResponse(_rs) {
        if (_rs['ERROR'] || _rs['WARNING']) {
            console.log('Response from moreInfo endpoint',_rs);
            return false;
        };
        vars.App.player.moreInfo = _rs;
        vars.App.player.addMinfoDataToScreenSaver();
    }

    dealWithResponse(_response) {// default response handler --- should NEVER be used as each endpoint has its own response handler
        debugger;
    }

};