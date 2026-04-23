/*
 * =================================================================================
 * content.js - 高效能廣告與煩人元素阻擋腳本
 * =================================================================================
 *
 * 此腳本作為 Manifest V3 廣告阻擋引擎的第二支柱，專門處理 declarativeNetRequest API
 * 無法覆蓋的頁面層級阻擋 (外觀過濾)。
 *
 * --- 核心功能 ---
 * 1. 靜態 CSS 注入：在頁面載入初期，快速注入 CSS 規則，以無閃爍的方式隱藏
 * 在初始 DOM 中就存在的廣告框架、橫幅廣告等靜態元素。
 *
 * 2. 動態 DOM 監視：利用 MutationObserver 高效能地監視 DOM 的動態變化，
 * 能夠即時捕捉並隱藏由 JavaScript 腳本在後續動態插入的廣告、彈出視窗、
 * Cookie 通知以及社交媒體小工具等。
 *
 * --- 設計原則 ---
 * - 效能優先：所有操作都經過最佳化，避免阻塞頁面渲染或造成使用者介面的卡頓。
 * - 精準打擊：使用經過策展的 CSS 選擇器列表，精準識別目標元素。
 * - 穩健可靠：確保在各種網站（包括單頁應用 SPA）上都能穩定運行，並防止重複注入。
 *
 * @version 1.0.0
 * @author Gemini
 * =================================================================================
 */

(() => {
  // 使用一個全域標記來防止腳本在同一個頁面中（例如 SPA 導航）被重複執行。
  if (window.advancedAdBlockerScriptLoaded) {
    return;
  }
  window.advancedAdBlockerScriptLoaded = true;

  // -----------------------------------------------------------------------------
  // 1. 過濾規則選擇器 (Selector Curation)
  // -----------------------------------------------------------------------------
  // 在生產環境中，這個列表應由建構腳本根據多個過濾清單
  // (如 EasyList, EasyPrivacy, AdGuard Annoyances) 自動生成和更新。
  const cosmeticFilterSelectors = [
    // --- 通用廣告選擇器 (General Ads) ---
    '.ad',
    '.ads',
    '.adsbox',
    '.ad-banner',
    '.ad-container',
    '.ad-wrapper',
    '.advert',
    '.advertisement',
    '.advertising',
    '.google-ad',
    '.sponsored-post',
    '.text-ad',
    '#ad',
    '#ads',
    '#advert',
    '#advertisement',
    '#advertising',
    'a[href*="/ads/"]',
    'a[href*="?ad_id="]',
    '[id^="ad_"]',
    '[id*="_ad_"]',
    '[class^="ad-"]',
    '[class*=" ad-"]',
    '[class*="-ad "]',
    '[class*="_ad_"]',
    '[data-ad-format]',
    '[data-ad-layout-key]',
    '[data-ad-id]',

    // --- 煩人元素選擇器 (Annoyances) ---
    // Cookie 通知
    '#cookie-notice',
    '#cookie-bar',
    '#cookie-banner',
    '.cookie-consent',
    '.cookie-policy',
    '.cookie-notification',
    '#gdpr-consent',
    '.gdpr-banner',
    // 訂閱彈窗與覆蓋層
    '#newsletter-signup',
    '.modal-dialog[data-ad-content]',
    '.popup-overlay',
    '.splash-ad',
    // 社交媒體按鈕與小工具
    '.social-buttons',
    '.social-sharing',
    '.fb-like',
    '.twitter-share-button',
    // 「在 App 中開啟」橫幅
    '.open-in-app-banner',

    // --- 特定網站選擇器 (Site-Specific) ---
    // YouTube
    'ytd-promoted-sparkles-web-renderer',
    'ytd-display-ad-renderer',
    'ytd-video-masthead-ad-v3-renderer',
    '.ytd-ad-slot-renderer',
    // Facebook
    '[data-pagelet*="FeedUnit_"] [aria-label="贊助"]',
    // Twitter / X
    '[data-testid="placementTracking"]',
    // Google 搜尋
    '#tads',
    '#bottomads',
    // Twitch
    '.player-ad-overlay',
  ];

  // 將選擇器陣列轉換為單一的、高效能的 CSS 規則字串
  const cssToInject = cosmeticFilterSelectors.join(',\n') + ' { display: none!important; }';

  // -----------------------------------------------------------------------------
  // 2. 靜態 CSS 注入模組 (Static CSS Injection Module)
  // -----------------------------------------------------------------------------
  /**
   * 創建並注入一個 <style> 標籤。
   * 這是最快、最高效的隱藏靜態元素的方法，它在瀏覽器解析 DOM 時就開始生效，
   * 能有效防止「元素閃爍」(FOUC - Flash of Unstyled Content)。
   */
  const injectStaticCss = () => {
    try {
      const styleElement = document.createElement('style');
      styleElement.textContent = cssToInject;
      // 盡快將 style 標籤插入到 head 或 documentElement 的開頭
      (document.head || document.documentElement).appendChild(styleElement);
    } catch (e) {
      console.error('AdBlocker: Failed to inject static CSS.', e);
    }
  };

  // -----------------------------------------------------------------------------
  // 3. 動態 DOM 監視模組 (Dynamic DOM Observer Module)
  // -----------------------------------------------------------------------------
  /**
   * 處理 DOM 變動的核心回呼函式。此函式經過最佳化，以批次方式處理變動。
   * @param {MutationRecord[]} mutationsList - 一個包含所有變動記錄的陣列。
   */
  const handleDomMutations = (mutationsList) => {
    for (const mutation of mutationsList) {
      // 我們只關心節點的添加，這是廣告和彈窗最常見的插入方式
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          // 確保處理的是元素節點(nodeType 1)，忽略文字節點等
          if (node.nodeType === 1) {
            // 檢查被添加的節點本身及其所有後代節點是否匹配我們的過濾規則
            hideMatchingElements(node);
          }
        }
      }
    }
  };

  /**
   * 檢查一個節點及其後代是否匹配過濾規則，如果匹配則立即隱藏。
   * @param {Element} element - 要檢查的 DOM 元素。
   */
  const hideMatchingElements = (element) => {
    const selectors = cosmeticFilterSelectors.join(',');
    // 1. 檢查元素本身
    if (element.matches(selectors)) {
      element.style.setProperty('display', 'none', 'important');
    }
    // 2. 檢查其所有後代
    // 使用 querySelectorAll 進行一次性、高效的查詢
    const descendants = element.querySelectorAll(selectors);
    descendants.forEach(el => el.style.setProperty('display', 'none', 'important'));
  };

  /**
   * 初始化並啟動 MutationObserver。
   */
  const startDynamicObserver = () => {
    // 觀察者選項：
    // - childList: 監視目標節點的子節點的添加與刪除。
    // - subtree: 監視所有後代節點，這是必需的，因為廣告可能被插入到 DOM 的任何深度。
    const observerConfig = {
      childList: true,
      subtree: true,
    };

    // 創建觀察者實例
    const observer = new MutationObserver(handleDomMutations);

    // 開始監視 document.body 的變化。
    // 我們監視 body，因為絕大多數可見內容都在 body 內，且此時 body 已確認存在。
    observer.observe(document.body, observerConfig);
  };


  // -----------------------------------------------------------------------------
  // 4. 執行入口 (Execution Entry Point)
  // -----------------------------------------------------------------------------

  // 立即注入靜態 CSS，這是第一道防線，必須盡快執行。
  injectStaticCss();

  // 接下來，我們需要設定動態觀察者。
  // 我們需要等待 DOM 至少載入到 body 存在才能開始觀察。
  // 檢查 `document.readyState` 來決定是立即執行還是等待事件。
  if (document.readyState === 'loading') {
    // 如果文件仍在載入中，我們等待 DOMContentLoaded 事件，
    // 這確保 `document.body` 已經可用。
    document.addEventListener('DOMContentLoaded', startDynamicObserver, { once: true });
  } else {
    // 如果 DOM 已經載入完成（'interactive' 或 'complete' 狀態），
    // 則可以直接啟動觀察者。
    startDynamicObserver();
  }

})();