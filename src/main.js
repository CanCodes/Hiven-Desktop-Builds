const { BrowserWindow, app, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

const winStateKeeper = require("./scripts/windowStateKeeper")

// We need this to check if user is trying to open another instance ~DEVLOOSKIE
const instanceLock = app.requestSingleInstanceLock();

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
        resizable: false,
        webPreferences: {
            devTools: false
        }
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


function createHivenClient() {
    let mainWinStateKeeper = new winStateKeeper("main"); // Loads windows size and place from the electron-settings.
    let winState = mainWinStateKeeper.bounds() // Gets the bound data
    hivenClient = new BrowserWindow({
        width: winState.width,
        height: winState.height,
        minHeight: 600,
        minWidth: 980,
        center: true,
        resizable: true,
        frame: false,
        show: false,
        webPreferences: {
            devTools: true,
            enableRemoteModule: true,
            nodeIntegration: true,
            preload: path.join(__dirname, '/scripts/pgdmp.js')
        }
    });

    // ScreenShare Feature
    hivenClient.webContents.session.setPermissionCheckHandler(async (webContents, permission, details) => {
        return true
    })
    hivenClient.webContents.session.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
        callback(true)
    })

    // Loading Hiven
    hivenClient.loadURL("https://canary.hiven.io");

    mainWinStateKeeper.track(hivenClient); // Track window size to save it.

    // LoadingScreen Check and Disable
    hivenClient.webContents.on('did-finish-load', () => {
        loadingScreen.close();
        winState.isMaximized ? hivenClient.maximize() : null;
        hivenClient.show();
    })


    // Invite Link Check
    hivenClient.webContents.on('new-window', async function (e, url) {
        e.preventDefault();
        if (url.includes('hiven.house/') || url.includes('hiven.io/invites/')) {
            let key = await hivenClient.webContents.executeJavaScript("localStorage.getItem('hiven-auth')", true);
            let link = `https://api.hiven.io/v1/invites/${url.split("/").pop()}`;
            let request = require('request');
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
    loadingScreen.webContents.executeJavaScript(Math.floor(progress.percent))
})

autoUpdater.on('update-downloaded', (info) => {
    loadingScreen.webContents.executeJavaScript(`updateText('Installing version ${info.version}')`);
    autoUpdater.quitAndInstall();
})

require("electron").ipcMain.on("nativeLinkCommand", (_, name) => {
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

// Check if user already has an instance open.
if (!instanceLock) {
  app.quit();
} else {
  app.on("second-instance", (e, cL, wD) => {
    if (hivenClient) {
      hivenClient.show();
      hivenClient.focus();
    }
  });
}

// First, create the loading screen and then the hiven client.
app.on("ready", () => {
    createLoadingScreen();
    autoUpdater.checkForUpdates();
    if (process.platform === "win32") app.setAppUserModelId("Hiven Canary");
    app.on("activate", function () {
        if (BrowserWindow.getAllWindows().length === 0) createHivenClient();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});