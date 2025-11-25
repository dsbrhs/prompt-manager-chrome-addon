// =============================
// sidepanel.js
// =============================
document.addEventListener('DOMContentLoaded', init);

let currentEditIndex = null;
let selectedCategory = '';
let selectedTags = new Set();
let selectedFolderId = 'root';
let allFolders = [];
let currentEditFolderId = null;

function init(){
  document.getElementById('refreshBtn').addEventListener('click', loadPrompts);
  document.getElementById('newBtn').addEventListener('click', () => openModal());
  document.getElementById('newFolderBtn').addEventListener('click', () => openFolderModal());
  document.getElementById('search').addEventListener('input', onSearch);
  document.getElementById('category-filter').addEventListener('change', onCategoryFilter);
  document.getElementById('clear-filters').addEventListener('click', clearFilters);
  document.getElementById('toggle-folder-tree').addEventListener('click', toggleFolderTree);
  
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
    if (e.key === 'Escape') {
      const promptModal = document.getElementById('prompt-modal');
      const folderModal = document.getElementById('folder-modal');
      if (promptModal && promptModal.classList.contains('show')) {
        closeModal();
      }
      if (folderModal && folderModal.classList.contains('show')) {
        closeFolderModal();
      }
    }
  });

  // フォルダモーダル関連のイベントリスナー
  const folderModalCloseBtn = document.getElementById('folder-modal-close-btn');
  const folderModalCancelBtn = document.getElementById('folder-modal-cancel-btn');
  const folderModalSaveBtn = document.getElementById('folder-modal-save-btn');
  const folderModalDeleteBtn = document.getElementById('folder-modal-delete-btn');
  const folderModal = document.getElementById('folder-modal');

  if (folderModalCloseBtn && folderModalCancelBtn && folderModalSaveBtn && folderModal) {
    folderModalCloseBtn.addEventListener('click', closeFolderModal);
    folderModalCancelBtn.addEventListener('click', closeFolderModal);
    folderModalSaveBtn.addEventListener('click', saveFolder);
    if (folderModalDeleteBtn) {
      folderModalDeleteBtn.addEventListener('click', deleteFolder);
    }
    folderModal.addEventListener('click', (e) => {
      if (e.target.id === 'folder-modal') {
        closeFolderModal();
      }
    });
  }
  
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
  chrome.storage.sync.get(['prompts', 'folders'], (data) => {
    allPrompts = data.prompts || [];
    allFolders = data.folders || [];
    renderFolderTree();
    updateFilterUI();
    updateFolderSelects();
    applyFilters();
  });
}

function generateFolderId() {
  return 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
      prompt.category === p.category &&
      prompt.folderId === p.folderId
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
  const folderSelect = document.getElementById('prompt-folder-select');
  const modalTitle = document.getElementById('modal-title');
  
  if (!modal || !titleInput || !contentInput || !categoryInput || !tagsInput || !folderSelect || !modalTitle) {
    console.error('モーダル要素が見つかりません');
    return;
  }
  
  updateFolderSelects();
  
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
        folderSelect.value = prompt.folderId || '';
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
    folderSelect.value = selectedFolderId === 'root' ? '' : selectedFolderId;
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
  const folderSelect = document.getElementById('prompt-folder-select');
  
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const category = categoryInput.value.trim();
  const tags = parseTags(tagsInput.value);
  const folderId = folderSelect.value || undefined;
  
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
      tags: tags.length > 0 ? tags : undefined,
      folderId: folderId
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
    // フォルダフィルタ
    if (selectedFolderId === 'root') {
      // ルート選択時はフォルダなしのプロンプトのみ表示
      if (p.folderId) {
        return false;
      }
    } else if (selectedFolderId) {
      // 特定フォルダ選択時はそのフォルダのプロンプトのみ表示
      if (p.folderId !== selectedFolderId) {
        return false;
      }
    }
    
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
  updateFolderCounts();
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

// =============================
// フォルダ管理機能
// =============================

function renderFolderTree() {
  const folderList = document.getElementById('folder-list');
  if (!folderList) return;
  
  folderList.innerHTML = '';
  
  // ルートフォルダのカウント更新
  const rootCount = allPrompts.filter(p => !p.folderId).length;
  const rootCountEl = document.getElementById('root-count');
  if (rootCountEl) {
    rootCountEl.textContent = rootCount;
  }
  
  // ルートフォルダのクリックイベント
  const rootItem = document.querySelector('.folder-item[data-folder-id="root"]');
  if (rootItem) {
    rootItem.onclick = () => selectFolder('root');
    if (selectedFolderId === 'root') {
      rootItem.classList.add('active');
    } else {
      rootItem.classList.remove('active');
    }
  }
  
  // フォルダを階層構造で表示
  const rootFolders = allFolders.filter(f => !f.parentId);
  rootFolders.forEach(folder => {
    renderFolderItem(folder, folderList, 0);
  });
}

function renderFolderItem(folder, container, depth) {
  const item = document.createElement('div');
  item.className = 'folder-item' + (depth > 0 ? ' folder-nested' : '');
  item.dataset.folderId = folder.id;
  
  if (selectedFolderId === folder.id) {
    item.classList.add('active');
  }
  
  const icon = document.createElement('span');
  icon.className = 'folder-icon';
  icon.textContent = '📁';
  
  const name = document.createElement('span');
  name.className = 'folder-name';
  name.textContent = folder.name;
  
  const count = document.createElement('span');
  count.className = 'folder-count';
  const promptCount = allPrompts.filter(p => p.folderId === folder.id).length;
  count.textContent = promptCount;
  
  const actions = document.createElement('div');
  actions.className = 'folder-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'folder-action-btn';
  editBtn.textContent = '編集';
  editBtn.onclick = (e) => {
    e.stopPropagation();
    openFolderModal(folder.id);
  };
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'folder-action-btn';
  deleteBtn.textContent = '削除';
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    if (confirm(`フォルダ「${folder.name}」を削除しますか？\n（フォルダ内のプロンプトは削除されませんが、フォルダの割り当てが解除されます）`)) {
      deleteFolderById(folder.id);
    }
  };
  
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  
  item.appendChild(icon);
  item.appendChild(name);
  item.appendChild(count);
  item.appendChild(actions);
  
  item.onclick = () => selectFolder(folder.id);
  
  container.appendChild(item);
  
  // 子フォルダを再帰的に表示
  const children = allFolders.filter(f => f.parentId === folder.id);
  children.forEach(child => {
    renderFolderItem(child, container, depth + 1);
  });
}

function selectFolder(folderId) {
  selectedFolderId = folderId;
  renderFolderTree();
  applyFilters();
}

function updateFolderCounts() {
  // ルートフォルダのカウント
  const rootCount = allPrompts.filter(p => !p.folderId).length;
  const rootCountEl = document.getElementById('root-count');
  if (rootCountEl) {
    rootCountEl.textContent = rootCount;
  }
  
  // 各フォルダのカウント
  allFolders.forEach(folder => {
    const count = allPrompts.filter(p => p.folderId === folder.id).length;
    const folderItem = document.querySelector(`.folder-item[data-folder-id="${folder.id}"]`);
    if (folderItem) {
      const countEl = folderItem.querySelector('.folder-count');
      if (countEl) {
        countEl.textContent = count;
      }
    }
  });
}

function toggleFolderTree() {
  const content = document.getElementById('folder-tree-content');
  const toggleBtn = document.getElementById('toggle-folder-tree');
  if (content && toggleBtn) {
    content.classList.toggle('collapsed');
    toggleBtn.textContent = content.classList.contains('collapsed') ? '+' : '−';
  }
}

function updateFolderSelects() {
  const promptFolderSelect = document.getElementById('prompt-folder-select');
  const folderParentSelect = document.getElementById('folder-parent-select');
  
  const updateSelect = (select) => {
    if (!select) return;
    
    // 「フォルダなし」または「ルート（最上位）」以外のオプションをクリア
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }
    
    // フォルダを階層的に追加
    const addFolderOptions = (folders, parentId = null, prefix = '') => {
      const children = folders.filter(f => f.parentId === parentId);
      children.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = prefix + folder.name;
        select.appendChild(option);
        
        // 子フォルダを再帰的に追加
        addFolderOptions(folders, folder.id, prefix + '  ');
      });
    };
    
    addFolderOptions(allFolders);
  };
  
  if (promptFolderSelect) updateSelect(promptFolderSelect);
  if (folderParentSelect) updateSelect(folderParentSelect);
}

function openFolderModal(folderId = null) {
  currentEditFolderId = folderId;
  const modal = document.getElementById('folder-modal');
  const nameInput = document.getElementById('folder-name-input');
  const parentSelect = document.getElementById('folder-parent-select');
  const modalTitle = document.getElementById('folder-modal-title');
  const deleteBtn = document.getElementById('folder-modal-delete-btn');
  
  if (!modal || !nameInput || !parentSelect || !modalTitle) {
    console.error('フォルダモーダル要素が見つかりません');
    return;
  }
  
  updateFolderSelects();
  
  if (folderId) {
    // 編集モード
    const folder = allFolders.find(f => f.id === folderId);
    if (folder) {
      nameInput.value = folder.name;
      parentSelect.value = folder.parentId || '';
      modalTitle.textContent = 'フォルダを編集';
      if (deleteBtn) {
        deleteBtn.style.display = 'block';
      }
    }
  } else {
    // 新規作成モード
    nameInput.value = '';
    parentSelect.value = '';
    modalTitle.textContent = '新規フォルダ';
    if (deleteBtn) {
      deleteBtn.style.display = 'none';
    }
  }
  
  modal.classList.add('show');
  modal.style.display = 'flex';
  setTimeout(() => nameInput.focus(), 100);
}

function closeFolderModal() {
  const modal = document.getElementById('folder-modal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
  currentEditFolderId = null;
}

function saveFolder() {
  const nameInput = document.getElementById('folder-name-input');
  const parentSelect = document.getElementById('folder-parent-select');
  
  if (!nameInput || !parentSelect) return;
  
  const name = nameInput.value.trim();
  if (!name) {
    alert('フォルダ名を入力してください。');
    return;
  }
  
  chrome.storage.sync.get(['folders'], (data) => {
    const folders = data.folders || [];
    
    if (currentEditFolderId) {
      // 編集モード
      const folder = folders.find(f => f.id === currentEditFolderId);
      if (folder) {
        // 循環参照チェック
        if (parentSelect.value && isCircularReference(currentEditFolderId, parentSelect.value, folders)) {
          alert('親フォルダに自分自身や子フォルダを選択することはできません。');
          return;
        }
        folder.name = name;
        folder.parentId = parentSelect.value || undefined;
      }
    } else {
      // 新規作成モード
      const newFolder = {
        id: generateFolderId(),
        name: name,
        parentId: parentSelect.value || undefined
      };
      folders.push(newFolder);
    }
    
    chrome.storage.sync.set({ folders: folders }, () => {
      loadPrompts();
      closeFolderModal();
    });
  });
}

function isCircularReference(folderId, parentId, folders) {
  if (!parentId) return false;
  if (parentId === folderId) return true;
  
  let currentParentId = parentId;
  while (currentParentId) {
    const parent = folders.find(f => f.id === currentParentId);
    if (!parent || !parent.parentId) break;
    if (parent.parentId === folderId) return true;
    currentParentId = parent.parentId;
  }
  return false;
}

function deleteFolder() {
  if (!currentEditFolderId) return;
  
  const folder = allFolders.find(f => f.id === currentEditFolderId);
  if (!folder) return;
  
  if (!confirm(`フォルダ「${folder.name}」を削除しますか？\n（フォルダ内のプロンプトは削除されませんが、フォルダの割り当てが解除されます）`)) {
    return;
  }
  
  deleteFolderById(currentEditFolderId);
  closeFolderModal();
}

function deleteFolderById(folderId) {
  chrome.storage.sync.get(['folders', 'prompts'], (data) => {
    const folders = data.folders || [];
    const prompts = data.prompts || [];
    
    // フォルダを削除
    const filteredFolders = folders.filter(f => f.id !== folderId);
    
    // 子フォルダも削除（再帰的）
    const deleteChildren = (parentId) => {
      const children = filteredFolders.filter(f => f.parentId === parentId);
      children.forEach(child => {
        const index = filteredFolders.findIndex(f => f.id === child.id);
        if (index > -1) {
          filteredFolders.splice(index, 1);
          deleteChildren(child.id);
        }
      });
    };
    deleteChildren(folderId);
    
    // プロンプトのフォルダ割り当てを解除
    const updatedPrompts = prompts.map(p => {
      if (p.folderId === folderId) {
        const { folderId, ...rest } = p;
        return rest;
      }
      return p;
    });
    
    chrome.storage.sync.set({ folders: filteredFolders, prompts: updatedPrompts }, () => {
      loadPrompts();
    });
  });
}
