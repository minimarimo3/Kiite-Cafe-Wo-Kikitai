// patcher.js (v5 - ツイートボタン乗っ取り)
(function () {
    'use strict';

    // ★★★ 
    // ↓↓ ここをあなたのMisskeyインスタンスのドメイン名に書き換えてください ↓↓
    // ★★★
    const MISSKEY_INSTANCE = 'misskey.io';

    const MODAL_ID = 'kiite-share-modal';
    const MODAL_BG_ID = 'kiite-share-modal-bg';
    const PATCHED_ATTR = 'data-kiite-patched';

    // 1. 共有モーダル用のスタイル(CSS)を<head>に追加
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        /* モーダルの背景 (画面全体を暗くする) */
        #${MODAL_BG_ID} {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 9998; /* KiiteCafeのUIより手前に */
        }
        /* モーダルの本体 */
        #${MODAL_ID} {
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background-color: #333; /* KiiteCafeのUIに合わせる */
            color: #fff;
            padding: 20px;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            font-family: sans-serif;
            min-width: 300px;
            text-align: center;
        }
        #${MODAL_ID} h3 {
            margin-top: 0;
            margin-bottom: 25px;
            border-bottom: 1px solid #555;
            padding-bottom: 10px;
        }
        /* 共有ボタン */
        .kiite-share-button {
            display: block;
            width: 100%;
            padding: 12px;
            margin-bottom: 10px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .kiite-share-button:hover { opacity: 0.8; }
        .kiite-share-button.twitter { background-color: #1DA1F2; color: white; }
        .kiite-share-button.misskey { background-color: #86b300; color: white; }
        .kiite-share-button.cancel { background-color: #666; color: white; }
    `;
    document.head.appendChild(style);


    // 2. モーダルを閉じる関数
    function hideModal() {
        const modal = document.getElementById(MODAL_ID);
        const bg = document.getElementById(MODAL_BG_ID);
        if (modal) modal.remove();
        if (bg) bg.remove();
    }

    // 3. モーダルを表示する関数
    function showShareModal(title, artist) {
        // 既に開いていたら閉じる
        hideModal();

        // 共有テキストとURLを準備
        const shareText = `${title} / ${artist} #KiiteCafe`;
        const encodedText = encodeURIComponent(shareText);
        const kiiteURL = encodeURIComponent('https://cafe.kiite.jp/pc/');

        // 各種共有URLを生成
        const xURL = `https://twitter.com/intent/tweet?text=${encodedText}&url=${kiiteURL}`;
        const misskeyURL = `https://${MISSKEY_INSTANCE}/share?text=${encodedText}&url=${kiiteURL}`;

        // モーダルのHTMLを生成
        const modalHTML = `
            <div id="${MODAL_BG_ID}"></div>
            <div id="${MODAL_ID}">
                <h3>共有する</h3>
                <button id="kiite-share-x" class="kiite-share-button twitter">X (Twitter) で共有</button>
                <button id="kiite-share-misskey" class="kiite-share-button misskey">Misskey で共有</button>
                <button id="kiite-share-cancel" class="kiite-share-button cancel">キャンセル</button>
            </div>
        `;

        // モーダルをページに追加
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // 各ボタンにイベントリスナーを設定
        document.getElementById(MODAL_BG_ID).addEventListener('click', hideModal);
        document.getElementById('kiite-share-cancel').addEventListener('click', hideModal);

        document.getElementById('kiite-share-x').addEventListener('click', () => {
            window.open(xURL, '_blank', 'width=600,height=400');
            hideModal();
        });

        document.getElementById('kiite-share-misskey').addEventListener('click', () => {
            window.open(misskeyURL, '_blank', 'width=600,height=400');
            hideModal();
        });
    }


    // 4. 1秒ごとにUIの状態を監視
    setInterval(() => {
        try {
            // まだ改造していないツイートボタンを探す
            // :not([${PATCHED_ATTR}]) が重要
            const originalButton = document.querySelector(`.tweet .button:not([${PATCHED_ATTR}])`);

            // 対象がなければ何もしない
            if (!originalButton) return;

            console.log('[Kiite Patcher v5] Found unpatched tweet button. Patching...');

            // 改造済みの印を付ける
            originalButton.setAttribute(PATCHED_ATTR, 'true');

            // --- [核心] イベントリスナーの乗っ取り ---
            // 1. ボタンを複製して、KiiteCafeのイベントリスナーを剥がす
            const newButton = originalButton.cloneNode(true);

            // 2. 元のボタンと入れ替える
            originalButton.parentNode.replaceChild(newButton, originalButton);

            // 3. 新しいボタンに、自作のモーダル表示機能を追加
            newButton.addEventListener('click', (e) => {
                e.preventDefault(); // 念のため元の動作を止める

                // 曲情報を取得
                const inner = newButton.closest('.inner');
                if (!inner) return;

                const title = inner.querySelector('.title').innerText;
                const artist = inner.querySelector('.artist span').innerText;

                // モーダルを表示
                showShareModal(title, artist);
            });

        } catch (e) {
            console.error('[Kiite Patcher v5] Error in patcher interval:', e);
        }
    }, 1000); // 1秒(1000ms)ごとにチェック

})();