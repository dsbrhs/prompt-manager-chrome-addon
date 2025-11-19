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

    // クリックで挿入（現在アクティブなタブ）
    el.addEventListener('click', () => {
      insertPromptToActiveTab(p.content);
    });

    // 右クリックメニュー風（編集・削除）
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      showContextMenu(ev.clientX, ev.clientY, idx);
    });

    list.appendChild(el);
  });
}

function insertPromptToActiveTab(text){
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'insertPrompt', prompt: text });
  });
}

function createNewPrompt(){
  // シンプルに prompt 作成 UI をブラウザ内で開く代替（例: popup の編集画面を流用する等）
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

/* シンプルなコンテキストメニュー（編集・削除） */
function showContextMenu(x, y, index){
  // 既にメニューがあれば消す
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

  const edit = document.createElement('div'); edit.textContent = '編集'; edit.style.padding = '8px';
  const del  = document.createElement('div'); del.textContent  = '削除';  del.style.padding = '8px';

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

  // クリックどこでもで消す
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
