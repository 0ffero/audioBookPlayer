function update() {
    // DEAL WITH THE PLAYER
    if (vars.App.player) {
        let player = vars.App.player;

        player.update();
    };
};