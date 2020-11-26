const appConfig = require('electron-settings');

class WindowStateKeeper {
    
    constructor(winName) {
        this.winName = winName;
        this.win = undefined;
        this.winState = undefined;
    }
    
    async setBounds() {
        this.winState = (await appConfig.has(`winState.${this.winName}`)) ? await appConfig.get(`winState.${this.winName}`) : { center: true, height: 720, width: 1280 }
    }
    
    async saveState() {
        if (!this.winState.isMaximized) {
            this.winState = this.win.getBounds();
        }
        this.winState.isMaximized = this.win.isMaximized();
        await appConfig.set(`winState.${this.winName}`, this.winState);
    }
    
    async track(window) {
        this.win = window;
        ['resize', 'move', 'close'].forEach(event => {
            window.on(event, () => this.saveState());
        });
    }
    async bounds() {
        await this.setBounds();
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