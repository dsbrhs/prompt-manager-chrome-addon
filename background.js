// =============================
// background.js
// =============================

// 拡張インストール時
chrome.runtime.onInstalled.addListener(() => {
    console.log("Prompt Manager installed");
    // 拡張ボタンをクリックしたときにサイドパネルを開く動作を有効化
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true});
});

// ChatGPTページの時だけサイドパネルを有効化する
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab.url) return;

    try {
        const url = new URL(tab.url);

        // ChatGPTページ判定
        const isChatGPT =
            url.hostname === "chat.openai.com" ||
            url.hostname.endsWith(".chatgpt.com");

        if (isChatGPT) {
            chrome.sidePanel.setOptions({
                tabId,
                path: "sidepanel/sidepanel.html",
                enabled: true
            });
        } else {
            chrome.sidePanel.setOptions({
                tabId,
                enabled: false
            });
        }
    } catch (e) {
        // URLがパースできない場合
        console.warn("Invalid URL in tab:", tab.url);
    }
});
