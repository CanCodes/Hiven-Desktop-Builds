const appConfig = require('electron-settings');

class WindowStateKeeper {
    
    constructor(winName) {
        this.winName = winName;
        this.win = undefined;
        this.winState = undefined;
    }
    
    setBounds() {
        this.winState = (appConfig.hasSync(`winState.${this.winName}`)) ? appConfig.getSync(`winState.${this.winName}`) : { center: true, height: 720, width: 1280 }
    }
    
    saveState() {
        if (!this.winState.isMaximized) {
            this.winState = this.win.getBounds();
        }
        this.winState.isMaximized = this.win.isMaximized();
        appConfig.set(`winState.${this.winName}`, this.winState);
    }
    
    track(window) {
        this.win = window;
        ['resize', 'move', 'close'].forEach(event => {
            window.on(event, () => this.saveState());
        });
    }
    bounds() {
        this.setBounds();
        return ({
            x: this.winState.x,
            y: this.winState.y,
            width: this.winState.width,
            height: this.winState.height,
            isMaximized: this.winState.isMaximized
        });
    }
}

module.exports = WindowStateKeeper