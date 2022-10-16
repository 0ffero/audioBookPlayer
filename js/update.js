function update() {
    // DEAL WITH THE PLAYER
    if (vars.App.player) {
        let App = vars.App;
        let player = App.player;

        player.update();

        App.screenSaver && App.screenSaver.update();
        App.longBar && App.longBar.update();
    };
};