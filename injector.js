// injector.js
(function () {
    'use strict';
    try {
        // --- バックグラウンド再生を妨害するAPIを無効化 ---

        Object.defineProperty(Document.prototype, 'hidden', { get: () => false, configurable: true });
        Object.defineProperty(Document.prototype, 'visibilityState', { get: () => 'visible', configurable: true });
        Object.defineProperty(Document.prototype, 'hasFocus', { get: () => true, configurable: true });

        document.addEventListener('visibilitychange', (e) => { e.stopImmediatePropagation(); }, true);
        window.addEventListener('blur', (e) => { e.stopImmediatePropagation(); }, true);

        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function (callback) { return originalRAF(callback); };

        console.log('[Kiite Injector] All hooks SUCCEEDED.');
    } catch (e) {
        console.error('[Kiite Injector] Failed to hook prototype:', e);
    }
})();