// =============================
// background.js (修正版)
// =============================

// 拡張インストール時
chrome.runtime.onInstalled.addListener(() => {
  console.log("Prompt Manager installed");
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// ChatGPTページのときだけサイドパネルを有効化する
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab?.url) return;

  try {
    const url = new URL(tab.url);
    const host = url.hostname;

    const isChatGPT =
      host === "chat.openai.com" ||
      host === "chatgpt.com" ||
      host === "www.chatgpt.com" ||
      host.endsWith(".chatgpt.com");

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
    console.warn("Invalid URL in tab:", tab?.url);
  }
});


// -----------------------------
// Runtime message handler（単一にまとめる）
// -----------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // 1) sidepanel から「挿入してほしい」と頼まれた場合
  if (msg?.action === "insertPromptBroadcast") {
    // 非同期でタブを検索して contentScript に送信するため sendResponse を later に呼ぶ場合は return true をする
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = (tabs && tabs[0]) ? tabs[0] : null;
      if (!tab) {
        // 送信先が見つからない場合は即レスポンス
        sendResponse({ ok: false, error: "no_active_tab" });
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: "insertPrompt", prompt: msg.prompt }, (resp) => {
        if (chrome.runtime.lastError) {
          console.warn("background -> contentScript 送信エラー:", chrome.runtime.lastError.message);
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true });
        }
      });
    });

    // 非同期で sendResponse を呼ぶから true を返して service worker を生存させる
    return true;
  }

  // 2) 任意のデバッグ用 ping
  if (msg?.action === "ping") {
    sendResponse({ pong: true });
    return;
  }

  // デフォルト応答（必要なら）
  // sendResponse({ ok: false, error: "unknown_action" });
});
