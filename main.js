// main.js (v11 - バックグラウンド通知)
const { app, BrowserWindow, shell, Tray, Menu, nativeImage, Notification } = require('electron'); // ★ 変更: Notification を追加
const path = require('path');
const fs = require('fs');
const windowStateKeeper = require('electron-window-state');

let win;
let tray;

// --- 自動再生フラグ (コメントアウトのまま) ---
try {
    // app.commandLine.appendSwitch('disable-features', 'MediaEngagementBypassAutoplayPolicies');
    // app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
} catch (e) {
    console.error('Failed to append command line switch:', e);
}

// --- 注入するJSコードを外部ファイルから読み込む (変更なし) ---
let injectorScript = '';
let patcherScript = '';
try {
    const injectorPath = path.join(__dirname, 'injector.js');
    injectorScript = fs.readFileSync(injectorPath, 'utf8');
    const patcherPath = path.join(__dirname, 'patcher.js');
    patcherScript = fs.readFileSync(patcherPath, 'utf8');
} catch (e) {
    console.error('Failed to read injector.js or patcher.js:', e);
    app.quit();
}

// --- トレイを作成する関数 (変更なし) ---
function createTray() {
    const iconPath = path.join(__dirname, 'tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    tray.setToolTip('Kiite Cafe Desktop');
    tray.on('click', () => {
        if (win.isVisible()) {
            win.hide();
            win.setSkipTaskbar(true);
        } else {
            win.show();
            win.setSkipTaskbar(false);
        }
    });
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '表示 / 非表示',
            click: () => {
                if (win.isVisible()) {
                    win.hide();
                    win.setSkipTaskbar(true);
                } else {
                    win.show();
                    win.setSkipTaskbar(false);
                }
            }
        },
        { type: 'separator' },
        {
            label: '終了',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);
    tray.setContextMenu(contextMenu);
}


function createWindow() {
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1200,
        defaultHeight: 800
    });

    win = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        webPreferences: {
            // (変更なし)
        }
    });

    mainWindowState.manage(win);

    // ★ 変更: 
    // ウィンドウの「×」ボタンが押されたときの動作を上書き
    win.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            win.hide();
            win.setSkipTaskbar(true);

            // ★★★
            // ★ 変更: ここに通知機能を追加
            // ★★★
            if (Notification.isSupported()) {
                const iconPath = path.join(__dirname, 'tray-icon.png'); // タスクトレイと同じアイコンを使用

                new Notification({
                    title: 'Kiite Cafe Desktop',
                    body: 'バックグラウンドで再生中です。終了するにはトレイアイコンを右クリックしてください。',
                    icon: iconPath // Windowsではiconが正しく表示されない場合があるが、macOSでは表示される
                }).show();
            }
        }
    });

    // (問題2の対策) window.open() の呼び出しをすべて横取りする (変更なし)
    win.webContents.setWindowOpenHandler(({ url }) => {
        try {
            if (url.startsWith('https://')) {
                shell.openExternal(url);
            }
        } catch (e) {
            console.error('Failed to open external URL:', e);
        }
        return { action: 'deny' };
    });


    // --- イベントリスナー (変更なし) ---
    win.webContents.on('did-frame-navigate', (event, url, httpResponseCode, httpStatusText, isMainFrame) => {
        if (!isMainFrame && url.includes('embed.nicovideo.jp')) {
            win.webContents.executeJavaScript(injectorScript)
                .catch(err => console.error('Failed to execute script:', err));
        }
    });
    win.webContents.on('did-finish-load', () => {
        const currentURL = win.webContents.getURL();
        if (currentURL === 'https://kiite.jp/' || currentURL === 'https://kiite.jp/index.html') {
            win.loadURL('https://cafe.kiite.jp/pc/');
        }
        if (currentURL.startsWith('https://cafe.kiite.jp/')) {
            win.webContents.executeJavaScript(patcherScript)
                .catch(err => console.error('Failed to execute patcher script:', err));
        }
    });

    // --- 初期ロードとデバッグ (変更なし) ---
    win.loadURL('https://kiite.jp');
    // win.webContents.openDevTools(); 
}

// --- アプリのライフサイクル (変更なし) ---
app.whenReady().then(() => {
    createWindow();
    createTray();
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        if (win) {
            win.show();
            win.setSkipTaskbar(false);
        } else {
            createWindow();
        }
    } else {
        win.show();
        win.setSkipTaskbar(false);
    }
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});