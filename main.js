const { app, BrowserWindow, shell, Tray, Menu, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const windowStateKeeper = require('electron-window-state');

let win;
let tray;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // 既にアプリが起動している (これが2番目のプロセス)
    app.quit(); // 2番目のプロセスを即座に終了
} else {
    // 1番目のプロセス (プライマリインスタンス)

    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // 2番目のプロセスが起動しようとしたときのイベント
        // (タスクバーからクリックされた時など)

        // 既存のウィンドウ (win) があれば、それを表示してフォーカスする
        if (win) {
            if (!win.isVisible()) {
                win.show(); // ウィンドウを表示
                win.setSkipTaskbar(false); // タスクバーに復帰
            }
            if (win.isMinimized()) {
                win.restore(); // 最小化を解除
            }
            win.focus(); // 前面に持ってくる
        }
    });

    app.setAppUserModelId('com.yuukei.kikitai');

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

    // --- トレイを作成する関数 ---
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
                backgroundThrottling: false
            }
        });

        mainWindowState.manage(win);

        // 「×」ボタンの動作 (macOS以外)
        win.on('close', (event) => {
            if (process.platform !== 'darwin') {
                if (!app.isQuitting) {
                    event.preventDefault();
                    win.hide();
                    win.setSkipTaskbar(true);

                    if (Notification.isSupported()) {
                        const iconPath = path.join(__dirname, 'tray-icon.png');
                        new Notification({
                            title: 'Kiite Cafe Desktop',
                            body: 'バックグラウンドで再生中です。終了するにはトレイアイコンを右クリックしてください。',
                            icon: iconPath
                        }).show();
                    }
                }
            }
        });

        // ウィンドウが閉じたら、変数をクリーンアップ
        win.on('closed', () => {
            win = null;
        });

        // window.open() の横取り
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


        // --- イベントリスナー ---
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

        // --- 初期ロード ---
        win.loadURL('https://kiite.jp/');
        // win.webContents.openDevTools(); 
    }

    // --- アプリのライフサイクル ---
    app.whenReady().then(() => {
        createWindow();

        if (process.platform !== 'darwin') {
            createTray();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

}
