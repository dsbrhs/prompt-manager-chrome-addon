---
# 📘 Prompt Manager Chrome Extension

Chrome Extension for managing reusable prompts and inserting them directly into ChatGPT with one click.
---

## 🚀 Overview

**Prompt Manager Chrome Extension** は、ChatGPT を頻繁に使うユーザー向けの
「プロンプト管理ツール」です。

- 繰り返し使うプロンプトを保存
- Popup で一覧表示
- クリックするだけで ChatGPT の入力欄に自動挿入
- Chrome Sync Storage を使って、PC 間で内容同期

最小限の構成で実装された α 版（プロトタイプ）です。

---

## ✨ Features

### ✔️ プロンプトの保存

- タイトル
- 内容
  （Chrome Sync Storage に保存され、Google アカウントに紐づき同期されます）

### ✔️ プロンプト一覧表示（Popup）

- popup.html で簡易 UI を表示
- タップすると ChatGPT の入力欄へ自動挿入

### ✔️ ChatGPT への挿入機能

- 新旧 UI を判別して、適切な入力欄へ入力
- React の仕組みに合わせて input イベントを発火

### ✔️ Content Script

- ChatGPT のページに読み込まれ、必要な動作をサポート

### ✔️ Background Service Worker

- 拡張インストール時の処理を担当

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

- **Popup の検証**
  Popup → 右クリック →「検証」
- **Background（Service Worker）のログ確認**
  chrome://extensions/ → 拡張機能 →「Service Worker」を開く
- **contentScript のログ**
  ChatGPT ページの DevTools → Console

### 🔄 ChatGPT UI による変更

現在の実装では、複数の入力欄 CSS セレクタをチェックして対応しています。
UI 変更が発生した場合は、selectors を更新する必要があります。

---

## 📦 改善の方向性

### 🎨 UI/UX 改善

- **キーボードショートカット**

  - プロンプト挿入のショートカット（例: Cmd/Ctrl + 数字キー）
  - 検索フォーカスのショートカット（Cmd/Ctrl + F）
  - モーダルの開閉ショートカット

- **視覚的改善**

  - プロンプト一覧のカードデザイン改善
  - ドラッグ&ドロップによる並び替え
  - お気に入り機能（星マーク）
  - 使用頻度の可視化

- **操作性向上**
  - カーソル位置への挿入（現在は入力欄の先頭/末尾）
  - 複数プロンプトの一括操作（削除、エクスポート）
  - プロンプトプレビュー機能

### 🚀 機能拡張

- **分類・整理機能**

  - タグ / カテゴリ分類
  - フォルダ階層構造
  - カスタムソート（作成日、使用頻度、タイトル順など）

- **テンプレート機能**

  - 変数プレースホルダー（例: `{{name}}`, `{{date}}`）
  - 変数入力フォーム
  - よく使う変数の保存

- **共有・同期機能**

  - エクスポート / インポート（JSON 形式）
  - プロンプトの URL 共有
  - チーム共有機能（将来）

- **検索・フィルタ強化**
  - 高度な検索（正規表現対応）
  - タグ・カテゴリでのフィルタ
  - 保存日時でのフィルタ

### 🌐 マルチプラットフォーム対応

- **AI サービス対応拡張**

  - Claude（Anthropic）対応
  - Perplexity 対応
  - Google Gemini 対応
  - その他の LLM サービス対応

- **ブラウザ対応**
  - Firefox 拡張機能版
  - Edge 拡張機能版
  - Safari 拡張機能版（将来）

### 💾 データ管理

- **ストレージ改善**

  - ローカルストレージとの併用（大量データ対応）
  - データの自動バックアップ
  - バージョン管理（プロンプトの履歴）

- **データ移行**
  - 他ツールからのインポート機能
  - データのエクスポート形式拡張（CSV、Markdown 等）

### 🔒 セキュリティ・信頼性

- **プライバシー強化**

  - 暗号化オプション（機密プロンプト用）
  - パスワード保護機能
  - データの完全削除機能

- **エラーハンドリング**
  - より詳細なエラーメッセージ
  - 自動リトライ機能
  - オフライン対応

### ⚡ パフォーマンス

- **高速化**

  - 大量プロンプト対応（仮想スクロール）
  - 検索結果のキャッシュ
  - ストレージ操作の最適化

- **リソース管理**
  - メモリ使用量の最適化
  - バックグラウンド処理の効率化

### 🛠️ 開発者体験

- **開発ツール**

  - デバッグモードの強化
  - ログ出力の改善
  - パフォーマンスモニタリング

- **テスト**
  - 自動テストの追加
  - E2E テストの実装
  - クロスブラウザテスト

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
