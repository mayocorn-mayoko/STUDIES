# STUDIES — 技術者向けREADME

学習管理アプリ STUDIES の技術ドキュメント。利用者向けの説明は `README.md` を参照。

## 技術スタック

- フロントエンド: HTML / CSS / Vanilla JavaScript(フレームワーク・ビルドツール不使用)
- サーバー: Node.js標準の`http`/`fs`モジュールのみで実装した静的ファイル配信サーバー(`server.js`)。外部パッケージへの依存なし
- データ永続化: ブラウザの`localStorage`のみ。バックエンドDB・APIは存在しない
- バージョン管理: Git

## セットアップ・起動

```bash
npm start
# または
node server.js
```

デフォルトで `http://localhost:3000` で待ち受ける(`PORT`環境変数で変更可能)。`index.html`がルート(`/`)にマッピングされる。

## ディレクトリ構成

```
studies/
├── index.html / goal.html / timer.html / record.html / export.html / viewer.html / guide.html
├── css/
│   ├── common.css      デザイントークン(CSS変数)・ベーススタイル・タグ(.tag--*)の共通定義
│   └── <page>.css      各ページ固有のスタイル
├── js/
│   ├── common.js        localStorage操作・データ操作関数・ユーティリティ(全ページ共通で読み込む)
│   └── <page>.js        各ページ固有のロジック(DOMContentLoadedでイベントバインド)
├── server.js             静的配信サーバー
└── package.json
```

ページとスクリプトは1対1対応。共通処理は`common.js`に集約し、各ページは`<script src="js/common.js">`の後に自身の`<script src="js/<page>.js">`を読み込む構成。ビルドステップなし(ブラウザがそのまま解釈する)。

## データモデル (localStorage)

### ストレージキー

`js/common.js`内の`STORAGE_KEYS`で定義。

| キー | 用途 |
|---|---|
| `studies_records` | 勉強履歴 |
| `studies_goal` | 目標(日付をキーにしたオブジェクト) |
| `studies_schedule` | 勉強予定(To-Do) |

### スキーマ

```ts
// studies_records: Record[]
type Record = {
  id: string;            // generateId()で採番
  date: string;           // "YYYY-MM-DD"
  subject: string;
  duration: number;       // 秒
  memo: string;
  source: "timer" | "manual";
  imported?: true;        // インポートで取り込まれた項目にのみ付与
  createdAt: string;      // ISO8601
};

// studies_goal: { [date: string]: Goal[] }
type Goal = {
  id: string;
  rangeStart: string;     // 必須
  rangeEnd: string;        // 任意。空文字の場合は "〜" を付けず開始のみ表示する(各pageのrender関数側の分岐)
  memo: string;
  imported?: true;
};

// studies_schedule: ScheduleItem[]
type ScheduleItem = {
  id: string;
  date: string;
  content: string;
  done: boolean;
  imported?: true;
};
```

`imported`フラグは自分で入力したデータには存在しない(キー自体が無い)。インポート時のみ`true`が付与される。

## common.js の主要API

- `generateId()`: `id-<timestamp36>-<random6>`形式のID生成
- `getTodayString()`: `YYYY-MM-DD`
- `formatDuration(seconds)`: `H:MM:SS`(1時間以上) / `MM:SS`
- `readStorage(key, fallback)` / `writeStorage(key, value)`: JSON.parse/stringifyのラッパー。例外時は`fallback`を返す
- 履歴: `getRecords` / `saveRecords` / `addRecord` / `deleteRecord` / `getRecordsByDate`
- 目標: `getAllGoals` / `getGoalsByDate` / `saveGoalsByDate` / `addGoal` / `deleteGoal` / `getTodayGoals`
- 予定: `getSchedule` / `saveSchedule` / `addScheduleItem` / `toggleScheduleItem` / `deleteScheduleItem` / `getScheduleByDate`
- 全削除: `resetAllData()` — 3つのストレージキーを`removeItem`
- 書き出し: `exportFilteredData({ startDate, endDate, includeGoals, includeSchedule, includeRecords })` / `downloadJSON(data, filename)` / `exportAllData()`(フィルタなしの全件書き出し、後方互換用ラッパー) / `isDateInRange(date, start, end)`
- 読み込み(自分のデータへ統合): `importAllData(file, onComplete)` — 既存データを**上書きせず追加**。取り込んだ全項目のidを`generateId()`で再採番し、`imported: true`を付与してから既存配列/オブジェクトにconcat/マージする
- 読み込み(表示専用・保存なし): `readExternalFile(file, onComplete)` — `viewer.html`専用。パース結果をコールバックに渡すのみで、いかなるstorageへの書き込みも行わない

## 各ページの実装メモ

### timer.html / js/timer.js

状態machine: `idle → running ⇄ paused`、`running/paused → idle`(停止時)。`state`変数で管理し、`setState()`がボタンの表示・活性/非活性をまとめて更新する。

**経過時間の計算方式(重要)**: tickごとのインクリメント(`elapsedSeconds += 1`)ではなく、開始/再開時刻(`segmentStartTime = Date.now()`)と確定済み秒数(`accumulatedSeconds`)から`getElapsedSeconds()`が都度再計算する方式。

```js
function getElapsedSeconds() {
  if (state !== 'running' || segmentStartTime === null) return accumulatedSeconds;
  return accumulatedSeconds + Math.floor((Date.now() - segmentStartTime) / 1000);
}
```

理由: `setInterval`はバックグラウンドタブ/非フォーカスウィンドウでブラウザにスロットリングされる(Chromeは特に強く間引く)。tick回数ベースだと間引かれた分だけ実経過時間より少なく記録されるバグがあった(2026-10-06修正)。wall-clock差分方式ならtickが間引かれても、次に呼ばれた時点で正しい値に自動的に追いつく。

あわせて`visibilitychange`イベントで`!document.hidden && state === 'running'`の場合に`tick()`を直接呼び、タブ復帰時に即座に表示を最新化・カウントダウン終了判定を行う。

カウントダウンの終了判定も同様に`elapsed >= countdownTotal`で判定しており(残り秒数のデクリメントではない)、バックグラウンド中に時間切れを迎えていたケースも`visibilitychange`復帰時に検知できる。

開始/再開ボタンは統合済み(`btn-start`一つ)。稼働中は非表示にせず`disabled = true`にして暗く表示する(`common.css`の`.btn:disabled { opacity: 0.4 }`)。連打によるinterval多重生成は`state === 'running'`ならreturnするガードで防止。

### hidden属性とCSSの競合に関する既知のパターン

`.modal-overlay`や`.duration-setting`のように`display: flex`を直接指定しているクラスは、HTML側の`hidden`属性(UAスタイルの`display: none`)より**後勝ち**で上書きしてしまう(author stylesheetがUAスタイルより優先されるため)。該当箇所は

```css
.foo[hidden] { display: none; }
.foo:not([hidden]) { display: flex; }
```

のパターンで対処している(`timer.css`参照)。新たに`hidden`属性と`display`を併用するクラスを追加する場合はこのパターンに倣うこと。

### goal.html / js/goal.js

- 目標は日付配列への追加のみ(1つの入力フォームが常にadd用)。`rangeStart`必須・`rangeEnd`任意で、空の場合はrender側で`〜`を付けない分岐がある(`index.js`・`goal.js`・`viewer.js`の3箇所に同一ロジックが重複しているので、変更時は3箇所とも直すこと)
- `btn-reset-all`から`resetAllData()`を呼ぶ。`confirm()`でガードしており、キャンセル時は何もしない

### export.html / js/export.js

`exportFilteredData`への橋渡しのみ。日付範囲は文字列比較(`YYYY-MM-DD`はゼロ埋めされているため辞書順比較で日付順と一致する)。開始日>終了日、全項目未選択の場合はクライアント側バリデーションで`alert`して送信を止める。

### viewer.html / js/viewer.js

`readExternalFile`で読み込んだJSONをその場でDOMに描画するのみで、`localStorage`への書き込みは一切行わない。自分のデータとは独立したレンダリング関数(`renderViewerGoals`等)を持ち、`index.js`/`goal.js`の同等関数とは別実装(意図的に非共通化。誤って自分のデータに書き込む経路を作らないため)。

### record.html / js/record.js

`addRecord`に`source: 'manual'`を明示して渡すのみの薄いフォーム。バリデーションは科目名必須・学習時間(時/分/秒合計)が0より大きいことの2点。

## タグ表示の一元化

`.tag--timer` / `.tag--manual` / `.tag--imported`は`common.css`で定義している。各ページで個別に再定義しないこと(過去に`index.css`/`goal.css`に重複定義され、`viewer.html`が未読み込みのため表示が崩れるバグがあった)。新しいタグ種別を追加する場合も`common.css`に追加する。

## 既知の制約・今後の拡張余地

- 目標達成判定(目標と実績の自動突き合わせ)は未実装
- 勉強予定はTo-Do形式のみ。時間指定でのカレンダー管理は未実装(データモデル上は`date`のみで時刻情報を持たない)
- マルチユーザー・サーバー同期なし。端末間共有は書き出し/読み込み(JSONファイル経由)が前提
- `server.js`はローカル開発用の簡易配信サーバーであり、本番運用(HTTPS・認証・キャッシュ制御等)は考慮していない

## 動作確認の方法

ブラウザ自動化ツールがない環境でのロジック検証は、`js/common.js`・`js/timer.js`等をNode上で`eval`し、`document`/`localStorage`/`setInterval`等を最小限のモックに差し替えて行う(過去のセッションで実施)。`let`/`const`のトップレベル宣言は`eval`のスコープに閉じ込められるため、動作確認用に読み込む際は`var`に置換してから`eval`する必要がある点に注意。
