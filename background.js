// background.js

// 監聽網頁導航過程中發生的錯誤
chrome.webNavigation.onErrorOccurred.addListener((details) => {
  // `onErrorOccurred` 會在頁面載入失敗時觸發
  // `details.error` 包含了錯誤的代碼

  // 我們只關心由擴充功能客戶端本身造成的封鎖
  if (details.error === 'net::ERR_BLOCKED_BY_CLIENT') {
    
    // 為了避免誤關閉使用者正在瀏覽的主分頁 (例如，主分頁中的某個 iframe 被封鎖)
    // 我們需要確認這個錯誤發生在頂層框架 (frameId === 0)
    if (details.frameId === 0) {

      // 使用 chrome.tabs.remove 來關閉引發錯誤的分頁
      // details.tabId 告訴我們是哪一個分頁
      chrome.tabs.remove(details.tabId);

      console.log(`Auto-closed tab ${details.tabId} which tried to load a blocked URL: ${details.url}`);
    }
  }
});