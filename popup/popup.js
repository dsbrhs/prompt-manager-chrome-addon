// =============================
// popup/popup.js
// =============================
document.addEventListener("DOMContentLoaded", () => {

const listEl = document.getElementById("prompt-list");
const addButton = document.getElementById("add");


function render(prompts) {
  listEl.innerHTML = "";
  prompts.forEach((p) => {
    const li = document.createElement("li");

    // タイトル
    const titleSpan = document.createElement("span");
    titleSpan.textContent = p.title;
    titleSpan.className = "prompt-title";
    li.appendChild(titleSpan);

    // 挿入ボタン
    const insertBtn = document.createElement("button");
    insertBtn.textContent = "挿入";
    insertBtn.className = "btn-insert";
    insertBtn.onclick = () => insertPrompt(p.content);
    li.appendChild(insertBtn);

    // 編集ボタン
    const editBtn = document.createElement("button");
    editBtn.textContent = "編集";
    editBtn.className = "btn-edit";
    editBtn.onclick = () => openEditModal(p);
    li.appendChild(editBtn);

    // 削除ボタン
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✖️";
    deleteBtn.className = "btn-delete";
    deleteBtn.onclick = () => deletePrompt(p.id);
    li.appendChild(deleteBtn);

    listEl.appendChild(li);
  });
}

let currentEditingId = null;

function openEditModal(prompt) {
  currentEditingId = prompt.id;
  document.getElementById("editTitle").value = prompt.title;
  document.getElementById("editContent").value = prompt.content;

  document.getElementById("editModal").classList.remove("hidden");
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
  currentEditingId = null;
}

document.getElementById("cancelEditBtn").onclick = closeEditModal;

document.getElementById("saveEditBtn").onclick = () => {
  const newTitle = document.getElementById("editTitle").value.trim();
  const newContent = document.getElementById("editContent").value.trim();

  chrome.storage.sync.get(["prompts"], (result) => {
    const prompts = result.prompts || [];

    const updated = prompts.map((p) =>
      p.id === currentEditingId ? { ...p, title: newTitle, content: newContent } : p
    );

    chrome.storage.sync.set({ prompts: updated }, () => {
      render(updated);
      closeEditModal();
    });
  });
};


function loadPrompts() {
    chrome.storage.sync.get("prompts", (data) => {
    render(data.prompts || []);
    });
}


addButton.onclick = () => {
    const title = prompt("プロンプト名称を登録");
    const content = prompt("プロンプト内容を登録");
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

  function deletePrompt(id) {
    if (!confirm("本当に削除しますか？")) return;

    chrome.storage.sync.get(["prompts"], (result) => {
      const prompts = result.prompts || [];

      const updated = prompts.filter((p) => p.id !== id);

      chrome.storage.sync.set({ prompts: updated }, () => {
        render(updated);
      });
    });
  }

  }); 
