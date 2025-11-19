// =============================
// content/contentScript.js
// =============================
console.log("Content script loaded on ChatGPT");

// sidepanel → contentScript メッセージを受け取る
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("Message received:", msg);
    if (msg.action === 'insertPrompt') {
        insertText(msg.prompt);
    }
});

// ChatGPT の入力欄へ文字を挿入
function insertText(text) {
    // 新UIと旧UIの候補
    const selectors = [
        '#prompt-textarea',
        'div[data-testid="conversation-compose-textarea"]',
        'div[contenteditable="true"]',
        'textarea',
        'form textarea'
    ];

    let inputEl = null;

    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
            inputEl = el;
            break;
        }
    }

    if (!inputEl) {
        console.warn("ChatGPT input element not found.");
        return;
    }

    // contenteditable
    if (inputEl.tagName === 'DIV' && inputEl.getAttribute('contenteditable') === 'true') {
        inputEl.innerText = text;
    } else {
        inputEl.value = text;
    }

    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
}
