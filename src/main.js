const { BrowserWindow, app, dialog, ipcMain } = require("electron");
const path = require("path");
const debug = require('electron-debug');
const appConfig = require('electron-settings');
const request = require('request')
const {autoUpdater} = require("electron-updater");
debug({ showDevTools: false, isEnabled: true });

const winStateKeeper = require("./scripts/windowStateKeeper")

// app.disableHardwareAcceleration(); // Users were experiencing some freezes due to gpu rendering requiring more resources to run. 

// Disables errors dialogs on production. Check console to Debug.
dialog.showErrorBox = function (title, content) {
    console.log(`${title}\n${content}`);
};

let loadingScreen, hivenClient; // This is here for diasbling the window later on.

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
    hivenClient = new BrowserWindow({
        width: winState.width,
        height: winState.height,
        center: true,
        resizable: true,
        darkTheme: true,
        frame: false,
        show: false,
        webPreferences: {
            devTools: true,
            enableRemoteModule:true,
            nodeIntegration: true
        }
    });

    winState.isMaximized ? hivenClient.maximize() : null;
    // ScreenShare Feature
    hivenClient.webContents.session.setPreloads([path.join(__dirname, '/scripts/pgdmp.js')])
    hivenClient.webContents.session.setPermissionCheckHandler(async (webContents, permission, details) => {
        return true
    })
    hivenClient.webContents.session.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
        callback(true)
    })

    // Loading Hiven
    hivenClient.loadURL("https://canary.hiven.io");
    hivenClient.setMenu(null)

    await mainWinStateKeeper.track(hivenClient); // Track window size to save it.
    // Loading Screen Check and Disable
    hivenClient.webContents.on('did-finish-load', () => {
        loadingScreen.close();
        hivenClient.show();
    })


    // Invite Link Check
    hivenClient.webContents.on('new-window', async function (e, url) {
        e.preventDefault();
        if (url.includes('hiven.house/') || url.includes('hiven.io/invites/')) {
            let key = await hivenClient.webContents.executeJavaScript("localStorage.getItem('hiven-auth')", true);
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
                        return hivenClient.loadURL(`https://canary.hiven.io/houses/${house_id}`)
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

ipcMain.on("nativeLinkCommand", (_, name) => {
    switch (name) {
        case "close":
            hivenClient.close();
            break;

        case "minimize":
            hivenClient.minimize();
            break;

        case "maximize":
            hivenClient.isMaximized() ? hivenClient.unmaximize() : hivenClient.maximize();
            break;
    }
});

// First, create the loading screen and then the hiven client.
app.on("ready", () => {
    createLoadingScreen();
    // autoUpdater.checkForUpdates()
    createHivenClient();
    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createHivenClient();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});