(function () {
    'use strict';

    const MODAL_ID = 'kiite-share-modal';
    const MODAL_BG_ID = 'kiite-share-modal-bg';
    const PATCHED_ATTR = 'data-kiite-patched';

    // 1. 共有モーダル用のスタイル(CSS)を<head>に追加
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        #${MODAL_BG_ID} { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); z-index: 9998; }
        #${MODAL_ID} { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: #333; color: #fff;
            padding: 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 15px rgba(0,0,0,0.5); font-family: sans-serif;
            min-width: 300px; text-align: center; }
        #${MODAL_ID} h3 { margin-top: 0; margin-bottom: 25px; border-bottom: 1px solid #555; padding-bottom: 10px; }
        .kiite-share-button { display: block; width: 100%; padding: 12px; margin-bottom: 10px; border: none; border-radius: 5px; 
            font-size: 16px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; }
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
    function showShareModal(title, video_id) {
        hideModal();

        let shareText = `♪ ${title} #${video_id} #Kiite\n`;
        shareText += "Kiite Cafeできいてます https://cafe.kiite.jp/pc/\n";

        const encodedText = encodeURIComponent(shareText);
        const videoURL = encodeURIComponent(`https://nicovideo.jp/watch/${video_id}`);

        const xURL = `https://twitter.com/intent/tweet?text=${encodedText}&url=${videoURL}`;
        const misskeyURL = `https://misskey-hub.net/share?text=${encodedText}&url=${videoURL}&visibility=public&localOnly=0`;

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
            if (!originalButton) return; // ボタンがまだない

            // D3.datum() ではなく、Kiite Cafeのグローバルインスタンスから直接データを取得
            let nowPlayingData = null;

            // Kiite Cafe は window.cafe_music にインスタンスを保持していると仮定
            if (typeof window.cafe_music !== 'undefined' && window.cafe_music && window.cafe_music.now_playing) {
                nowPlayingData = window.cafe_music.now_playing;
            }

            // データがまだ読み込まれていない (曲が始まる前など)
            if (!nowPlayingData || !nowPlayingData.video_id || !nowPlayingData.title) {
                console.warn('[Kiite Patcher v9] Data not yet available (window.cafe_music.now_playing is null). Waiting...');
                return;
            }

            const { title, video_id } = nowPlayingData;

            console.log(`[Kiite Patcher v9] Found unpatched button for: ${video_id}`);
            originalButton.setAttribute(PATCHED_ATTR, 'true');

            const newButton = originalButton.cloneNode(true);

            // ボタンの見た目を変更
            try {
                const icon = newButton.querySelector('i');
                if (icon) icon.className = 'fas fa-share-square';
                const label = newButton.querySelector('.label');
                if (label) label.innerText = '共有';
            } catch (e) {
                console.warn('[Kiite Patcher v9] Failed to change button appearance:', e);
            }

            originalButton.parentNode.replaceChild(newButton, originalButton);

            newButton.addEventListener('click', (e) => {
                e.stopImmediatePropagation(); // Kiite Cafe 本体のクリックイベントを停止

                showShareModal(title, video_id);
            });

        } catch (e) {
            // window.cafe_music が存在しない場合のエラーもキャッチ
            console.error('[Kiite Patcher v9] Error in patcher interval:', e);
        }
    }, 1000);

})();
