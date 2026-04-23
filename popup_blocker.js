// popup_blocker.js (v2 - Smarter)

(function() {
  'use strict';

  // 預設不允許彈出視窗
  let canOpenWindow = false;

  // 當使用者「按下」滑鼠時，我們暫時授予頁面彈出視窗的權限。
  // 我們監聽 'mousedown' 而不是 'click'，因為它更早觸發。
  window.addEventListener('mousedown', () => {
    canOpenWindow = true;
  }, { capture: true, passive: true });

  // 當使用者「放開」滑鼠時，權限立刻收回。
  // 這確保只有在極短的點擊時間內觸發的 window.open 才被允許。
  window.addEventListener('mouseup', () => {
    canOpenWindow = false;
  }, { capture: true, passive: true });

  const originalWindowOpen = window.open;

  // 用我們自己的版本覆寫 window.open
  window.open = function(...args) {
    // 只有在剛剛發生過使用者點擊的情況下，才允許執行原始的 window.open
    if (canOpenWindow) {
      // 執行後立刻將權限設回 false，防止後續的腳本利用這次點擊的許可權。
      canOpenWindow = false;
      return originalWindowOpen.apply(window, args);
    } else {
      // 如果不是由使用者直接點擊觸發 (例如由計時器或廣告腳本觸發)，則阻止它。
      console.log('My EasyList AdBlocker: Blocked a non-user-initiated popup.', args);
      return null; // 回傳 null 來阻止彈窗
    }
  };
})();