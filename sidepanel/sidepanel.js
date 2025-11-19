// =============================
// sidepanel.js
// =============================
document.addEventListener('DOMContentLoaded', init);

function init(){
  document.getElementById('refreshBtn').addEventListener('click', loadPrompts);
  document.getElementById('newBtn').addEventListener('click', createNewPrompt);
  document.getElementById('search').addEventListener('input', onSearch);
  loadPrompts();
}

let allPrompts = [];

function loadPrompts(){
  chrome.storage.sync.get(['prompts'], (data) => {
    allPrompts = data.prompts || [];
    renderList(allPrompts);
  });
}

function renderList(prompts){
  const list = document.getElementById('prompt-list');
  list.innerHTML = '';

  if (prompts.length === 0){
    list.innerHTML = '<div style="color:#666">プロンプトがありません</div>';
    return;
  }

  prompts.forEach((p, idx) => {
    const el = document.createElement('div');
    el.className = 'prompt-item';
    el.dataset.index = idx;

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = p.title || '(無題)';

    const snippet = document.createElement('div');
    snippet.className = 'snippet';
    snippet.textContent = (p.content || '').slice(0, 120).replace(/\n/g, ' ') + (p.content && p.content.length>120 ? '…' : '');

    el.appendChild(title);
    el.appendChild(snippet);

    // 左クリック：挿入
    el.addEventListener('click', () => {
      insertPromptToActiveTab(p.content);
    });

    // 右クリック：編集 / 削除
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      showContextMenu(ev.clientX, ev.clientY, idx);
    });

    list.appendChild(el);
  });
}

function insertPromptToActiveTab(text){
  // background に中継を頼む（sidepanel -> background）
  chrome.runtime.sendMessage(
    { action: 'insertPromptBroadcast', prompt: text },
    (resp) => {
      if (chrome.runtime.lastError) {
        console.warn("Sidepanel -> Background 送信エラー:", chrome.runtime.lastError.message);
      } else {
        console.log("Sidepanel -> Background 応答:", resp);
      }
    }
  );
}

function createNewPrompt(){
  const title = prompt('新しいプロンプトのタイトルを入力');
  if (title === null) return;
  const content = prompt('プロンプト本文を入力');
  if (content === null) return;

  chrome.storage.sync.get(['prompts'], (data) => {
    const arr = data.prompts || [];
    arr.unshift({ title, content });
    chrome.storage.sync.set({ prompts: arr }, () => {
      loadPrompts();
    });
  });
}

function onSearch(e){
  const q = e.target.value.trim().toLowerCase();
  if (!q){ renderList(allPrompts); return; }
  const filtered = allPrompts.filter(p => (p.title||'').toLowerCase().includes(q) || (p.content||'').toLowerCase().includes(q));
  renderList(filtered);
}

function showContextMenu(x, y, index){
  const existing = document.getElementById('sp-ctxmenu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'sp-ctxmenu';
  menu.style.position = 'fixed';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.background = '#fff';
  menu.style.border = '1px solid #ccc';
  menu.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)';
  menu.style.zIndex = 9999;

  const edit = document.createElement('div');
  edit.textContent = '編集';
  edit.style.padding = '8px';

  const del = document.createElement('div');
  del.textContent = '削除';
  del.style.padding = '8px';

  edit.addEventListener('click', () => {
    menu.remove();
    editPrompt(index);
  });
  del.addEventListener('click', () => {
    menu.remove();
    deletePrompt(index);
  });

  menu.appendChild(edit);
  menu.appendChild(del);
  document.body.appendChild(menu);

  const onBodyClick = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.body.removeEventListener('click', onBodyClick);
    }
  };
  setTimeout(()=> document.body.addEventListener('click', onBodyClick), 0);
}

function editPrompt(index){
  chrome.storage.sync.get(['prompts'], (data) => {
    const arr = data.prompts || [];
    const p = arr[index];
    if (!p) return;
    const newTitle = prompt('タイトル編集', p.title);
    if (newTitle === null) return;
    const newContent = prompt('内容編集', p.content);
    if (newContent === null) return;
    arr[index] = { title: newTitle, content: newContent };
    chrome.storage.sync.set({ prompts: arr }, loadPrompts);
  });
}

function deletePrompt(index){
  if (!confirm('このプロンプトを削除しますか？')) return;
  chrome.storage.sync.get(['prompts'], (data) => {
    const arr = data.prompts || [];
    arr.splice(index, 1);
    chrome.storage.sync.set({ prompts: arr }, loadPrompts);
  });
}
