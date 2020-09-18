const {BrowserWindow, app} = require("electron");
const path = require("path")
const debug = require('electron-debug');

debug({showDevTools: false});

function build() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        center: true,
        resizable: true,
        webPreferences: {
            devTools: true,
            menubar:false
        }
    });
    win.webContents.session.setPreloads([path.join(__dirname, '/scripts/pgdmp.js')])
    win.webContents.session.setPermissionCheckHandler(async (webContents, permission, details) => {
        return true
    })
    win.webContents.session.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
        callback(true)
    })
    win.loadURL("https://canary.hiven.io");

    // win.setAutoHideMenuBar(true);
    win.setMenu(null)
    win.webContents.on('new-window', function(e, url) {
      e.preventDefault();
      require('electron').shell.openExternal(url);
    });
}

app.on("ready", () => {
    build()
    app.on("activate", function() {
        if(BrowserWindow.getAllWindows().length === 0) build();
    });

});

app.on("window-all-closed", () => {
    if(process.platform !== "darwin") {
        app.quit();
    }
});


