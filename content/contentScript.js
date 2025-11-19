// =============================
// content/contentScript.js
// =============================

console.log("Content script loaded on ChatGPT");

// ChatGPT の入力欄へ文字を挿入する処理
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "insertPrompt") {
    const textarea = document.querySelector("textarea");

    if (textarea) {
      textarea.value = msg.content;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
});
