// patcher.js (v7 - 共有ボタンの見た目を変更)
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
    function hideModal() {
        const modal = document.getElementById(MODAL_ID);
        const bg = document.getElementById(MODAL_BG_ID);
        if (modal) modal.remove();
        if (bg) bg.remove();
    }

    // 3. モーダルを表示する関数
    function showShareModal(title, artist) {
        hideModal();
        const shareText = `${title} / ${artist} #KiiteCafe`;
        const encodedText = encodeURIComponent(shareText);
        const kiiteURL = encodeURIComponent('https://cafe.kiite.jp/pc/');

        const xURL = `https://twitter.com/intent/tweet?text=${encodedText}&url=${kiiteURL}`;
        const misskeyURL = `https://misskey-hub.net/share?text=${encodedText}&url=${kiiteURL}&visibility=public&localOnly=0`;

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

            console.log('[Kiite Patcher v7] Found unpatched tweet button. Patching...');
            originalButton.setAttribute(PATCHED_ATTR, 'true');

            const newButton = originalButton.cloneNode(true);

            // ★★★
            // ★ 変更 (ボタンの見た目を変更)
            // ★★★
            try {
                // アイコンを変更 (fa-twitter-square -> fas fa-share-square)
                const icon = newButton.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-share-square'; // Font Awesome 5 の標準的な共有アイコン
                }
                // ラベルテキストを変更 (ツイート -> 共有)
                const label = newButton.querySelector('.label');
                if (label) {
                    label.innerText = '共有';
                }
            } catch (e) {
                console.warn('[Kiite Patcher v7] Failed to change button appearance:', e);
            }


            // 2. 元のボタンと入れ替える
            originalButton.parentNode.replaceChild(newButton, originalButton);

            // 3. 新しいボタンに、自作のモーダル表示機能を追加
            newButton.addEventListener('click', (e) => {
                e.stopImmediatePropagation(); // Kiite Cafe 本体のクリックイベントを停止
                const inner = newButton.closest('.inner');
                if (!inner) return;

                const title = inner.querySelector('.title').innerText;
                const artist = inner.querySelector('.artist span').innerText;

                showShareModal(title, artist);
            });

        } catch (e) {
            console.error('[Kiite Patcher v7] Error in patcher interval:', e);
        }
    }, 1000);

})();