// yt_ad_killer.js (v1.5 - 修正對 inline-playback 廣告的處理)
// 專為 YouTube 設計的輕量級廣告攔截腳本

// 檢查當前頁面是否為 YouTube
if (window.location.hostname.includes('youtube.com')) {
  
  /**
   * 處理並移除 YouTube 上的各種廣告。
   * - 加速影片廣告。
   * - 自動點擊「略過廣告」按鈕。
   * - 尋找並隱藏廣告的「整個容器」，以徹底消除空白區域。
   */
  const handleYouTubeAds = () => {
    // 1. 加速影片播放器中的廣告
    const adVideo = document.querySelector('.ad-showing .html5-main-video');
    if (adVideo) {
      adVideo.muted = true;
      adVideo.currentTime = adVideo.duration || 9999; 
    }

    // 2. 自動點擊「略過廣告」按鈕
    const skipButtons = [
        '.ytp-ad-skip-button', 
        '.ytp-ad-skip-button-modern',
    ];
    document.querySelectorAll(skipButtons.join(', ')).forEach(button => button.click());

    // 3. 移除頁面上的各種廣告版位與其容器
    const adSelectors = [
      // 通用模式匹配
      '[id*="-ad"]',
      '[class*="-ad"]',
      '[id*="-ads"]',
      '[class*="-ads"]',
      '[id*="-promoted-"]',
      '[class*="-promoted-"]',
      // 明確加入已知的廣告模組選擇器，增加穩健性
      'ytd-ad-slot-renderer', 
      'ytp-ad-module',
      // (v1.5 新增) 根據回報，明確加入行內播放廣告的容器
      'ytd-ad-inline-playback-renderer' 
    ];
    
    document.querySelectorAll(adSelectors.join(', ')).forEach(adElement => {
      // (v1.5 更新) 在 closest 中也加入新的廣告容器類型
      // 這樣即使腳本是先偵測到廣告的某個子元件，也能往上找到整個廣告框並將其隱藏
      const container = adElement.closest(
        'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-ad-inline-playback-renderer'
      );
      
      if (container) {
        container.style.setProperty('display', 'none', 'important');
      } else {
        adElement.style.setProperty('display', 'none', 'important');
      }
    });
  };

  // 使用 MutationObserver 來監控頁面的動態變化
  const observer = new MutationObserver(handleYouTubeAds);
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'hidden', 'class']
  });

  // 初始執行一次
  handleYouTubeAds();
  
  console.log('YouTube Ad Killer v1.5 is active.');
}