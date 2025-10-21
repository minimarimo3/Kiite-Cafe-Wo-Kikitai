// main.js (v9 - ウィンドウサイズを記憶)
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const windowStateKeeper = require('electron-window-state');

// --- 自動再生フラグ (アプリ起動前に設定) ---
try {
    app.commandLine.appendSwitch('disable-features', 'MediaEngagementBypassAutoplayPolicies');
    app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
} catch (e) {
    console.error('Failed to append command line switch:', e);
}

// --- 注入するJSコードを外部ファイルから読み込む ---
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


function createWindow() {

    // 前回のウィンドウサイズと位置をロード (なければデフォルト値を設定)
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1200,
        defaultHeight: 800
    });

    const win = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        webPreferences: {
        }
    });

    // ウィンドウの状態 (サイズ、位置、最大化) を自動で保存・管理させる
    mainWindowState.manage(win);


    // (問題2の対策) window.open() の呼び出しをすべて横取りする
    win.webContents.setWindowOpenHandler(({ url }) => {
        try {
            if (url.startsWith('https://')) {
                console.log(`[WindowHandler] Opening external URL: ${url}`);
                shell.openExternal(url);
            }
        } catch (e) {
            console.error('Failed to open external URL:', e);
        }
        return { action: 'deny' };
    });



    // (対策A) Niconicoのiframeが読み込まれたら、injector.js を注入する
    win.webContents.on('did-frame-navigate', (event, url, httpResponseCode, httpStatusText, isMainFrame) => {
        if (!isMainFrame && url.includes('embed.nicovideo.jp')) {
            console.log(`[Kiite Injector] Target iframe found: ${url}. Injecting hooks...`);
            win.webContents.executeJavaScript(injectorScript)
                .catch(err => console.error('Failed to execute script:', err));
        }
    });

    // (自動リダイレクト & Patcher注入) ページの読み込みが完了したら発火
    win.webContents.on('did-finish-load', () => {
        const currentURL = win.webContents.getURL();

        if (currentURL === 'https://kiite.jp/' || currentURL === 'https://kiite.jp/index.html') {
            console.log('[Kiite Auto-Redirect] Main page loaded. Redirecting to cafe...');
            win.loadURL('https://cafe.kiite.jp/pc/');
        }

        if (currentURL.startsWith('https://cafe.kiite.jp/')) {
            console.log('[Kiite Patcher] Cafe page loaded. Injecting UI patcher...');
            win.webContents.executeJavaScript(patcherScript)
                .catch(err => console.error('Failed to execute patcher script:', err));
        }
    });

    // --- 初期ロードとデバッグ (変更なし) ---
    win.loadURL('https://kiite.jp');
    // win.webContents.openDevTools(); 
}

// --- アプリのライフサイクル (変更なし) ---
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});