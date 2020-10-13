const {BrowserWindow, app, dialog} = require("electron");
const path = require("path");
const debug = require('electron-debug');
const autoUpdater = require('update-electron-app');


debug({showDevTools: false, isEnabled: true});
autoUpdater({repo: "CanCodes/Hiven-Desktop-Builds"});

let loadingScreen;

function createLoadingScreen() {
    loadingScreen = new BrowserWindow({
        width: 300,
        height: 400,
        frame: false,
        transparent: true,
        resizable: false
    })
    loadingScreen.loadFile(path.join(__dirname, '/views/loading.html'))
    loadingScreen.setVisibleOnAllWorkspaces(true);
    loadingScreen.setAlwaysOnTop(true, "floating", 1);
    loadingScreen.on('closed', () => {
        loadingScreen = null;
    })
    loadingScreen.webContents.on('did-finish-load', () => {
        loadingScreen.show();
    })
}


function createHivenClient() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        center: true,
        resizable: true,
        show: false,
        webPreferences: {
            devTools: true
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

    win.setMenu(null)
    win.webContents.on('new-window', function(e, url) {
      e.preventDefault();
      require('electron').shell.openExternal(url);
    });
    win.webContents.on('did-finish-load', () => {
        loadingScreen.close();
    })
    win.show();
}

app.on("ready", () => {
    createLoadingScreen();
    createHivenClient();
    app.on("activate", function() {
        if (BrowserWindow.getAllWindows().length === 0) createHivenClient();
    });

});

app.on("window-all-closed", () => {
    if(process.platform !== "darwin") {
        app.quit();
    }
});


autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    const dialogOpts = {
        type: 'info',
        buttons: ['Install', 'Later'],
        title: 'Application Update',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: 'There is a new version for the Hiven Desktop App. Would you like to install the update?'
    }

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall()
    })
})