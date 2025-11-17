// =============================
// popup/popup.js
// =============================
const listEl = document.getElementById("prompt-list");
const addButton = document.getElementById("add");


function render(prompts) {
    listEl.innerHTML = "";
    prompts.forEach((p) => {
        const li = document.createElement("li");
        li.textContent = p.title;
    li.onclick = () => insertPrompt(p.content);
    listEl.appendChild(li);
    });
}


function loadPrompts() {
    chrome.storage.sync.get("prompts", (data) => {
    render(data.prompts || []);
    });
}


addButton.onclick = () => {
    const title = prompt("Title?");
    const content = prompt("Content?");
    if (!title || !content) return;

    chrome.storage.sync.get("prompts", (data) => {
        const prompts = data.prompts || [];
        prompts.push({ id: Date.now(), title, content });
    chrome.storage.sync.set({ prompts }, loadPrompts);
    });
};


loadPrompts();


function insertPrompt(text) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (content) => {
          // ChatGPT の新旧 UI に対応した入力欄候補
          const selectors = [
            '#prompt-textarea',
            'div[data-testid="conversation-compose-textarea"]',
            'div[contenteditable="true"]',       // 新UI
            'textarea',                          // 旧UI
            'form textarea',                     // fallback
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
  
          // contenteditable（新UI）対応
          if (inputEl.tagName === 'DIV' && inputEl.getAttribute('contenteditable') === 'true') {
            inputEl.innerText = content;
          } else {
            inputEl.value = content;
          }
  
          // React への反映を保証するため input イベントを発火
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        },
        args: [text]
      });
    });
  }
  
