const { BrowserWindow, app, dialog } = require("electron");
const path = require("path");
const debug = require('electron-debug');
const appConfig = require('electron-settings');
const request = require('request')
const {autoUpdater} = require("electron-updater");
debug({ showDevTools: false, isEnabled: true });

const winStateKeeper = require("./scripts/windowStateKeeper")

// Disables errors dialogs on production. Check console to Debug.
dialog.showErrorBox = function (title, content) {
    console.log(`${title}\n${content}`);
};

let loadingScreen; // This is here for diasbling the window later on.

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
    loadingScreen.on('closed', () => {
        loadingScreen = null;
    })
    loadingScreen.webContents.on('did-finish-load', () => {
        loadingScreen.show();
    })
}


async function createHivenClient() {
    let mainWinStateKeeper = new winStateKeeper("main"); // Loads windows size and place from the electron-settings.
    winState = await mainWinStateKeeper.bounds() // Gets the bound data 
    const win = new BrowserWindow({
        width: winState.width,
        height: winState.height,
        center: true,
        resizable: true,
        darkTheme: true,
        show: false,
        webPreferences: {
            devTools: true,
            enableRemoteModule:true
        }
    });

    // ScreenShare Feature
    win.webContents.session.setPreloads([path.join(__dirname, '/scripts/pgdmp.js')])
    win.webContents.session.setPermissionCheckHandler(async (webContents, permission, details) => {
        return true
    })
    win.webContents.session.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
        callback(true)
    })

    // Loading Hiven
    win.loadURL("https://canary.hiven.io");
    win.setMenu(null)

    await mainWinStateKeeper.track(win); // Track window size to save it.
    // Loading Screen Check and Disable
    win.webContents.on('did-finish-load', () => {
        loadingScreen.close();
        win.show();
    })


    // Invite Link Check
    win.webContents.on('new-window', async function (e, url) {
        e.preventDefault();
        if (url.includes('hiven.house/') || url.includes('hiven.io/invites/')) {
            let key = await win.webContents.executeJavaScript("localStorage.getItem('hiven-auth')", true);
            let link = `https://api.hiven.io/v1/invites/${url.split("/").pop()}`;
            await request.get(link, (a, b, c) => {
                let house_id = JSON.parse(c).data.house.id
                request.post({
                    url: link,
                    headers: {
                        "Authorization": key
                    },
                    method: 'POST'
                }, (e, r, body) => {
                    return win.loadURL(`https://canary.hiven.io/houses/${house_id}`)
                })
            })
            return;
        }
        require('electron').shell.openExternal(url);
    });
}

autoUpdater.on('update-not-available', (info) => {
    loadingScreen.webContents.executeJavaScript(`updateText('Loading Client...')`)
    createHivenClient()
})

autoUpdater.on('download-progress', (progress) => {
    loadingScreen.webContents.executeJavaScript(`updateText('Downloaded ${Math.floor(progress.percent)}%')`)
})

autoUpdater.on('update-downloaded', (info) => {
    loadingScreen.webContents.executeJavaScript(`updateText('Installing version ${info.version}')`)
    autoUpdater.quitAndInstall();
})

// First, create the loading screen and then the hiven client.
app.on("ready", () => {
    createLoadingScreen();
    autoUpdater.checkForUpdates()
    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createHivenClient();
    });

});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});