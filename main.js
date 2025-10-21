// main.js (UI Patcher版)
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// --- 自動再生フラグ (アプリ起動前に設定) ---
try {
    app.commandLine.appendSwitch('disable-features', 'MediaEngagementBypassAutoplayPolicies');
    app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
} catch (e) {
    console.error('Failed to append command line switch:', e);
}

// --- 注入するJSコードを外部ファイルから読み込む ---
let injectorScript = '';
let patcherScript = ''; // ★ 変更: Patcherスクリプト用変数を追加

try {
    const injectorPath = path.join(__dirname, 'injector.js');
    injectorScript = fs.readFileSync(injectorPath, 'utf8');

    // ★ 変更: patcher.js も読み込む
    const patcherPath = path.join(__dirname, 'patcher.js');
    patcherScript = fs.readFileSync(patcherPath, 'utf8');

} catch (e) {
    console.error('Failed to read injector.js or patcher.js:', e); // ★ 変更
    app.quit();
}


function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
        }
    });

    // --- イベントリスナー ---

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

        // 1. 自動リダイレクト
        if (currentURL === 'https://kiite.jp/' || currentURL === 'https://kiite.jp/index.html') {
            console.log('[Kiite Auto-Redirect] Main page loaded. Redirecting to cafe...');
            win.loadURL('https://cafe.kiite.jp/pc/');
        }

        // ★ 変更: カフェのページが読み込まれたらPatcherを注入
        if (currentURL.startsWith('https://cafe.kiite.jp/')) {
            console.log('[Kiite Patcher] Cafe page loaded. Injecting UI patcher...');
            win.webContents.executeJavaScript(patcherScript)
                .catch(err => console.error('Failed to execute patcher script:', err));
        }
    });

    // --- 初期ロードとデバッグ ---

    win.loadURL('https://kiite.jp');

    // デバッグツールを自動で開く (不要になったらこの行を削除かコメントアウト)
    win.webContents.openDevTools(); // ← デバッグが終わったらコメントアウト推奨
}

// --- アプリのライフサイクル ---
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