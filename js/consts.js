const consts = {

    canvas: {
        width: 2560, height: 1440,
        cX: 2560/2, cY: 1440/2
    },

    console: {
        colours: {
            bad         : '#FF0000',
            functionCall: '#4DA6FF',
            good        : '#63E763',
            important   : '#FFFF00',
            warn        : '#FF0000'
        },

        defaults: 'font-weight: bold; font-size: 14px; font: \'consolas\'; color:'
    },

    depths: {
        mainFolderList  :  10,
        player          :  20,
        fileList        :  30,
        fileListOnTop   :  40,
        fullNamePopup   :  50,
        recent          :  60,
        screensaver     :  70,
        longBar         :  80,
        popup           :  90,
        volume          : 100,

        loadingScreen   : 200
    },

    fileExtensionRegEx: /\.m[p4][ab34]/,
    flushToDiskTimeout: 10, // when a file is playing, the current time stamp is saved every x seconds (in this case 10)
    foldersScrollScaler: 1, // <1 = faster, >1 = slower (0.5 = 2x as fast, 2 = half as fast etc)

    longFileLength: 60*60, // default minimum file length (in seconds) before the long bar is generated

    mouse: {
        buttons: {
            LEFT        : 0,
            MIDDLE      : 1,
            RIGHT       : 2,
            THUMB_1     : 3,
            THUMB_2     : 4
        },
        buttonNames: {
            0           : 'LEFT',
            1           : 'MIDDLE',
            2           : 'RIGHT',
            3           : 'THUMB_1',
            4           : 'THUMB_2'
        }
    }
};

// for easy access as I used them a lot
var mouseButtons = consts.mouse.buttons;
var mouseButtonNames = consts.mouse.buttonNames;