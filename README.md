# STUDIES

学習の可視化・管理を行うシンプルなWebアプリです。HTML / CSS / バニラJavaScriptのみで構築されており、Node.jsはローカルサーバー起動用途にのみ使用しています。

## セットアップ・起動方法

```bash
npm start
```

起動後、ブラウザで `http://localhost:3000` を開いてください。

## 画面構成

| ファイル | 内容 |
|---|---|
| `index.html` | ホーム画面（目標・今日の予定・勉強履歴の表示） |
| `goal.html` | 目標設定画面（日次目標・予定To-Doの登録） |
| `timer.html` | タイマー画面（カウントアップ／カウントダウン、全画面表示対応） |

## データ保存

すべてのデータはブラウザの `localStorage` に保存されます。ホーム画面から他デバイス・他ユーザーとの共有用にJSON形式でのエクスポート／インポートが可能です。

## ディレクトリ構成

```
studies/
├── index.html / goal.html / timer.html
├── css/
│   ├── common.css   共通デザイントークン・ベーススタイル
│   ├── index.css / goal.css / timer.css
├── js/
│   ├── common.js    localStorage操作・共通ユーティリティ
│   ├── index.js / goal.js / timer.js
├── server.js        Node標準httpモジュールのみで動く静的配信サーバー
└── package.json
```
