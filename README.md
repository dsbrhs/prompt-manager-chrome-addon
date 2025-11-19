---

# 📘 Prompt Manager Chrome Extension

Chrome Extension for managing reusable prompts and inserting them directly into ChatGPT with one click.

---

## 🚀 Overview

**Prompt Manager Chrome Extension** は、ChatGPT を頻繁に使うユーザー向けの
「プロンプト管理ツール」です。

* 繰り返し使うプロンプトを保存
* Popup で一覧表示
* クリックするだけで ChatGPT の入力欄に自動挿入
* Chrome Sync Storage を使って、PC 間で内容同期

最小限の構成で実装された α 版（プロトタイプ）です。

---

## ✨ Features

### ✔️ プロンプトの保存

* タイトル
* 内容
  （Chrome Sync Storage に保存され、Google アカウントに紐づき同期されます）

### ✔️ プロンプト一覧表示（Popup）

* popup.html で簡易 UI を表示
* タップすると ChatGPT の入力欄へ自動挿入

### ✔️ ChatGPT への挿入機能

* 新旧 UI を判別して、適切な入力欄へ入力
* React の仕組みに合わせて input イベントを発火

### ✔️ Content Script

* ChatGPT のページに読み込まれ、必要な動作をサポート

### ✔️ Background Service Worker

* 拡張インストール時の処理を担当

---

## 📂 Directory Structure

```
prompt-manager-alpha/
├── manifest.json
├── background.js
├── content/
│   └── contentScript.js
└── popup/
    ├── popup.html
    ├── popup.css
    └── popup.js
```

---

## 🧩 How It Works

### 1. プロンプトを追加

Popup → Add ボタン
→ タイトル & 内容を入力
→ `chrome.storage.sync` に保存

### 2. プロンプトをクリックして挿入

Popup のリストからプロンプトをクリックすると
`insertPrompt()` が ChatGPT タブにコードを注入し、入力欄に挿入します。

---

## 💻 Installation (for development)

1. このリポジトリをクローン

```
git clone https://github.com/yourname/prompt-manager-alpha.git
```

2. Chrome を開き、以下へアクセス

```
chrome://extensions/
```

3. 右上で **デベロッパーモード** ON

4. **「パッケージ化されていない拡張機能を読み込む」** から
   本プロジェクトのフォルダを選択

5. ブラウザ右上にアイコンが表示されれば準備完了！

---

## 🛠️ Development Notes

### 🔍 デバッグ方法

* **Popupの検証**
  Popup → 右クリック →「検証」
* **Background（Service Worker）のログ確認**
  chrome://extensions/ → 拡張機能 →「Service Worker」を開く
* **contentScript のログ**
  ChatGPT ページの DevTools → Console

### 🔄 ChatGPT UI による変更

現在の実装では、複数の入力欄 CSS セレクタをチェックして対応しています。
UI 変更が発生した場合は、selectors を更新する必要があります。

---

## 📦 Roadmap (v1 以降)

* タグ / カテゴリ分類
* サイドパネル UI（より大きな編集画面）
* カーソル位置への挿入
* 共有用のエクスポート / インポート
* GPTs / Claude / Perplexity などマルチ対応

---

## 🤝 Contributing

Issue や Pull Request は歓迎します。
小さな改善でもお気軽にどうぞ。

---

## 👤 Author

**ぼるへす** (X: [@dsbrhs](https://x.com/dsbrhs))


## 📄 License

MIT License

---
