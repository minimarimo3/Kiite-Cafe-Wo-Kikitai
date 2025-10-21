// patcher.js (v6 - イベント伝播を停止)
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
    // (v5から変更なし)
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        #${MODAL_BG_ID} {
            position: fixed; top: 0; left: 0;
            width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 9998; 
        }
        #${MODAL_ID} {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background-color: #333; color: #fff;
            padding: 20px; border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            font-family: sans-serif;
            min-width: 300px;
            text-align: center;
        }
        #${MODAL_ID} h3 { margin-top: 0; margin-bottom: 25px; border-bottom: 1px solid #555; padding-bottom: 10px; }
        .kiite-share-button { display: block; width: 100%; padding: 12px; margin-bottom: 10px; border: none;
            border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; }
        .kiite-share-button:hover { opacity: 0.8; }
        .kiite-share-button.twitter { background-color: #1DA1F2; color: white; }
        .kiite-share-button.misskey { background-color: #86b300; color: white; }
        .kiite-share-button.cancel { background-color: #666; color: white; }
    `;
    document.head.appendChild(style);


    // 2. モーダルを閉じる関数
    // (v5から変更なし)
    function hideModal() {
        const modal = document.getElementById(MODAL_ID);
        const bg = document.getElementById(MODAL_BG_ID);
        if (modal) modal.remove();
        if (bg) bg.remove();
    }

    // 3. モーダルを表示する関数
    // (v5から変更なし)
    function showShareModal(title, artist) {
        hideModal();
        const shareText = `${title} / ${artist} #KiiteCafe`;
        const encodedText = encodeURIComponent(shareText);
        const kiiteURL = encodeURIComponent('https://cafe.kiite.jp/pc/');

        // ★注意: main.js が window.open を横取りするので、
        // このコードを変更しなくても、PCのデフォルトブラウザで開かれるようになります
        const xURL = `https://twitter.com/intent/tweet?text=${encodedText}&url=${kiiteURL}`;
        const misskeyURL = `https://${MISSKEY_INSTANCE}/share?text=${encodedText}&url=${kiiteURL}`;

        const modalHTML = `
            <div id="${MODAL_BG_ID}"></div>
            <div id="${MODAL_ID}">
                <h3>共有する</h3>
                <button id="kiite-share-x" class="kiite-share-button twitter">X (Twitter) で共有</button>
                <button id="kiite-share-misskey" class="kiite-share-button misskey">Misskey で共有</button>
                <button id="kiite-share-cancel" class="kiite-share-button cancel">キャンセル</button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

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
            const originalButton = document.querySelector(`.tweet .button:not([${PATCHED_ATTR}])`);
            if (!originalButton) return;

            console.log('[Kiite Patcher v6] Found unpatched tweet button. Patching...');
            originalButton.setAttribute(PATCHED_ATTR, 'true');

            const newButton = originalButton.cloneNode(true);
            originalButton.parentNode.replaceChild(newButton, originalButton);

            // 3. 新しいボタンに、自作のモーダル表示機能を追加
            newButton.addEventListener('click', (e) => {

                // ★★★
                // ★ 変更 (問題1の対策):
                // これで Kiite Cafe 本体のクリックイベントが発火しなくなります
                e.stopImmediatePropagation();
                // ★★★

                const inner = newButton.closest('.inner');
                if (!inner) return;

                const title = inner.querySelector('.title').innerText;
                const artist = inner.querySelector('.artist span').innerText;

                showShareModal(title, artist);
            });

        } catch (e) {
            console.error('[Kiite Patcher v6] Error in patcher interval:', e);
        }
    }, 1000);

})();