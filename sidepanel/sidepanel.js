// =============================
// sidepanel.js
// =============================
document.addEventListener('DOMContentLoaded', init);

let currentEditIndex = null;
let selectedCategory = '';
let selectedTags = new Set();

function init(){
  document.getElementById('refreshBtn').addEventListener('click', loadPrompts);
  document.getElementById('newBtn').addEventListener('click', () => openModal());
  document.getElementById('search').addEventListener('input', onSearch);
  document.getElementById('category-filter').addEventListener('change', onCategoryFilter);
  document.getElementById('clear-filters').addEventListener('click', clearFilters);
  
  // モーダル関連のイベントリスナー
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalSaveBtn = document.getElementById('modal-save-btn');
  const modal = document.getElementById('prompt-modal');
  
  if (!modalCloseBtn || !modalCancelBtn || !modalSaveBtn || !modal) {
    console.error('モーダル要素が見つかりません');
    return;
  }
  
  modalCloseBtn.addEventListener('click', closeModal);
  modalCancelBtn.addEventListener('click', closeModal);
  modalSaveBtn.addEventListener('click', savePrompt);
  
  // モーダル背景クリックで閉じる
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'prompt-modal') {
      closeModal();
    }
  });
  
  // ESCキーでモーダルを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
    }
  });
  
  // タグ入力のEnterキー処理
  const tagsInput = document.getElementById('prompt-tags-input');
  if (tagsInput) {
    tagsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // カンマ区切りで処理（視覚的な確認のため）
        const tags = parseTags(tagsInput.value);
        tagsInput.value = tags.join(', ');
      }
    });
  }
  
  loadPrompts();
}

let allPrompts = [];

function loadPrompts(){
  chrome.storage.sync.get(['prompts'], (data) => {
    allPrompts = data.prompts || [];
    updateFilterUI();
    applyFilters();
  });
}

function renderList(prompts){
  const list = document.getElementById('prompt-list');
  list.innerHTML = '';

  if (prompts.length === 0){
    list.innerHTML = '<div style="color:#666; padding: 20px; text-align: center;">プロンプトがありません</div>';
    return;
  }

  // 実際のインデックスを保持するため、allPromptsから検索
  prompts.forEach((p) => {
    const actualIndex = allPrompts.findIndex(prompt => 
      prompt.title === p.title && 
      prompt.content === p.content &&
      JSON.stringify(prompt.tags || []) === JSON.stringify(p.tags || []) &&
      prompt.category === p.category
    );
    
    const el = document.createElement('div');
    el.className = 'prompt-item';
    el.dataset.index = actualIndex;

    // カテゴリ表示
    if (p.category) {
      const categoryEl = document.createElement('span');
      categoryEl.className = 'prompt-category';
      categoryEl.textContent = p.category;
      el.appendChild(categoryEl);
    }

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = p.title || '(無題)';

    const snippet = document.createElement('div');
    snippet.className = 'snippet';
    snippet.textContent = (p.content || '').slice(0, 120).replace(/\n/g, ' ') + (p.content && p.content.length>120 ? '…' : '');

    // タグ表示
    if (p.tags && p.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'prompt-tags';
      p.tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'prompt-tag';
        tagEl.textContent = tag;
        tagsContainer.appendChild(tagEl);
      });
      el.appendChild(tagsContainer);
    }

    el.appendChild(title);
    el.appendChild(snippet);

    // 左クリック：挿入
    el.addEventListener('click', () => {
      insertPromptToActiveTab(p.content);
    });

    // 右クリック：編集 / 削除
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      showContextMenu(ev.clientX, ev.clientY, actualIndex);
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

function openModal(index = null) {
  currentEditIndex = index;
  const modal = document.getElementById('prompt-modal');
  const titleInput = document.getElementById('prompt-title-input');
  const contentInput = document.getElementById('prompt-content-input');
  const categoryInput = document.getElementById('prompt-category-input');
  const tagsInput = document.getElementById('prompt-tags-input');
  const modalTitle = document.getElementById('modal-title');
  
  if (!modal || !titleInput || !contentInput || !categoryInput || !tagsInput || !modalTitle) {
    console.error('モーダル要素が見つかりません');
    return;
  }
  
  if (index !== null) {
    // 編集モード
    chrome.storage.sync.get(['prompts'], (data) => {
      const arr = data.prompts || [];
      const prompt = arr[index];
      if (prompt) {
        titleInput.value = prompt.title || '';
        contentInput.value = prompt.content || '';
        categoryInput.value = prompt.category || '';
        tagsInput.value = (prompt.tags || []).join(', ');
        modalTitle.textContent = 'プロンプトを編集';
      }
      modal.classList.add('show');
      modal.style.display = 'flex';
      // フォーカスをタイトル入力欄に設定
      setTimeout(() => titleInput.focus(), 100);
    });
  } else {
    // 新規作成モード
    titleInput.value = '';
    contentInput.value = '';
    categoryInput.value = '';
    tagsInput.value = '';
    modalTitle.textContent = '新規プロンプト';
    modal.classList.add('show');
    modal.style.display = 'flex';
    // フォーカスをタイトル入力欄に設定
    setTimeout(() => titleInput.focus(), 100);
  }
}

function closeModal() {
  const modal = document.getElementById('prompt-modal');
  modal.classList.remove('show');
  modal.style.display = 'none';
  currentEditIndex = null;
}

function parseTags(tagsString) {
  return tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

function savePrompt() {
  const titleInput = document.getElementById('prompt-title-input');
  const contentInput = document.getElementById('prompt-content-input');
  const categoryInput = document.getElementById('prompt-category-input');
  const tagsInput = document.getElementById('prompt-tags-input');
  
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const category = categoryInput.value.trim();
  const tags = parseTags(tagsInput.value);
  
  if (!title && !content) {
    alert('タイトルまたは内容のいずれかを入力してください。');
    return;
  }
  
  chrome.storage.sync.get(['prompts'], (data) => {
    const arr = data.prompts || [];
    
    const promptData = {
      title,
      content,
      category: category || undefined,
      tags: tags.length > 0 ? tags : undefined
    };
    
    if (currentEditIndex !== null) {
      // 編集モード
      arr[currentEditIndex] = promptData;
    } else {
      // 新規作成モード
      arr.unshift(promptData);
    }
    
    chrome.storage.sync.set({ prompts: arr }, () => {
      loadPrompts();
      closeModal();
    });
  });
}

function onSearch(e){
  applyFilters();
}

function updateFilterUI() {
  // カテゴリ一覧を取得
  const categories = [...new Set(allPrompts.map(p => p.category).filter(c => c))].sort();
  const categoryFilter = document.getElementById('category-filter');
  
  // 既存のオプションをクリア（「すべて」以外）
  while (categoryFilter.children.length > 1) {
    categoryFilter.removeChild(categoryFilter.lastChild);
  }
  
  // カテゴリオプションを追加
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
  
  // タグ一覧を取得
  const allTags = new Set();
  allPrompts.forEach(p => {
    if (p.tags && Array.isArray(p.tags)) {
      p.tags.forEach(tag => allTags.add(tag));
    }
  });
  
  const tagFilters = document.getElementById('tag-filters');
  tagFilters.innerHTML = '';
  
  [...allTags].sort().forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-filter-btn';
    btn.textContent = tag;
    btn.dataset.tag = tag;
    if (selectedTags.has(tag)) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => toggleTagFilter(tag));
    tagFilters.appendChild(btn);
  });
}

function onCategoryFilter(e) {
  selectedCategory = e.target.value;
  applyFilters();
}

function toggleTagFilter(tag) {
  if (selectedTags.has(tag)) {
    selectedTags.delete(tag);
  } else {
    selectedTags.add(tag);
  }
  updateFilterUI();
  applyFilters();
}

function clearFilters() {
  selectedCategory = '';
  selectedTags.clear();
  document.getElementById('category-filter').value = '';
  document.getElementById('search').value = '';
  updateFilterUI();
  applyFilters();
}

function applyFilters() {
  const searchQuery = document.getElementById('search').value.trim().toLowerCase();
  
  let filtered = allPrompts.filter(p => {
    // カテゴリフィルタ
    if (selectedCategory && p.category !== selectedCategory) {
      return false;
    }
    
    // タグフィルタ
    if (selectedTags.size > 0) {
      const promptTags = p.tags || [];
      const hasSelectedTag = Array.from(selectedTags).some(tag => promptTags.includes(tag));
      if (!hasSelectedTag) {
        return false;
      }
    }
    
    // 検索フィルタ
    if (searchQuery) {
      const matchesTitle = (p.title || '').toLowerCase().includes(searchQuery);
      const matchesContent = (p.content || '').toLowerCase().includes(searchQuery);
      const matchesCategory = (p.category || '').toLowerCase().includes(searchQuery);
      const matchesTags = (p.tags || []).some(tag => tag.toLowerCase().includes(searchQuery));
      if (!matchesTitle && !matchesContent && !matchesCategory && !matchesTags) {
        return false;
      }
    }
    
    return true;
  });
  
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
  openModal(index);
}

function deletePrompt(index){
  if (!confirm('このプロンプトを削除しますか？')) return;
  chrome.storage.sync.get(['prompts'], (data) => {
    const arr = data.prompts || [];
    arr.splice(index, 1);
    chrome.storage.sync.set({ prompts: arr }, loadPrompts);
  });
}
