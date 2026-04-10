# RankNow モニタリングガイド

Google Sheets のシート構成・列の意味・運用方法をまとめたドキュメントです。

---

## シート命名ルール

| プレフィックス | 種別 | 内容 |
|---|---|---|
| `raw_` | 生データ | Firebase から直接取得、または生データから生成した記録 |
| `stat_` | 統計 | ユーザー・テーマ単位で集計したデータ |
| `sum_` | サマリー | 時系列（日次・週次・月次）で集計したデータ |

---

## シート一覧

| シート名 | 種別 | 更新方式 | 用途 |
|---|---|---|---|
| `raw_events` | 生データ（Firebase直取得） | **差分追記** | 全イベントログ |
| `raw_users` | 生データ（Firebase直取得） | **全件上書き** | ユーザー一覧 |
| `raw_games` | 生データ（raw_eventsから生成） | リセット→再構築 | 1テーマ1行のプレイ記録 |
| `raw_network` | 生データ（raw_gamesから生成） | リセット→再構築 | 誰と誰が遊んだかの記録 |
| `stat_users` | 統計 | リセット→再構築 | ユーザー別プレイ統計 |
| `stat_themes` | 統計 | リセット→再構築 | テーマ別プレイ統計 |
| `sum_daily` | サマリー | リセット→再構築 | 日次サマリー |
| `sum_weekly` | サマリー | リセット→再構築 | 週次サマリー |
| `sum_monthly` | サマリー | リセット→再構築 | 月次サマリー |

> **削除済み（旧シート）**: `theme_ranking`, `network`, `game_log`, `theme_stats`, `network_log`, `user_stats`, `users`, `daily_summary`, `weekly_summary`, `monthly_summary`

---

## 同期の仕組み

```
Firebase RTDB
  analytics/events  →  raw_events（差分追記・蓄積）
  users             →  raw_users（全件上書き）
        ↓
  raw_games（raw_eventsから再構築）
  raw_network（raw_gamesから再構築）
  stat_users（raw_eventsから再構築）
  stat_themes（raw_gamesから再構築）
        ↓
  sum_daily / sum_weekly / sum_monthly（raw_events + raw_gamesから再構築）
```

**ポイント**:
- `raw_events` だけが蓄積される。ここが唯一の「永続するローデータ」
- その他の派生シートはすべて `raw_events` を元に毎回再計算されるため、常に全期間の正確な値が反映される
- `raw_users` は Firebase の現在のユーザー一覧を反映する（削除されたユーザーは消える）

**手動実行メニュー**:

| メニュー | 関数 | 内容 |
|---|---|---|
| 今すぐ同期する | `syncAll()` | Firebase からデータ取得 ＋ 全派生シートを再構築 |
| 集計のみ更新 | `buildAllDerived()` | Firebase へのアクセスなし・既存の raw_events から集計だけ再実行（高速） |

**自動トリガー**: 毎日午前9時に `syncAll()` が自動実行される。

---

## 各シートの詳細

### raw_events（全イベント生ログ）

Firebase RTDB の `analytics/events` ノードから差分取得。アプリで発生した全イベントが蓄積される。**削除禁止**。

| 列 | 項目名 | 意味・定義 |
|---|---|---|
| A | timestamp | イベント発生時刻（UnixミリSecond・UTC） |
| B | date(JST) | イベント発生日時（JST・yyyy/MM/dd HH:mm:ss） |
| C | event | イベント種別（下記参照） |
| D | userId | LINE のユーザーID（U から始まる文字列） |
| E | displayName | LINE の表示名 |
| F | themeId | テーマID（`casual_001` など。オリジナルテーマは空） |
| G | themeText | テーマの文章 |
| H | themeType | テーマの種別（`pack` = テーマパック / `original` = 自作） |
| I | mode | ゲームモード（`pair` / `multi` / `local`） |
| J | playerCount | プレイ人数 |
| K | players | 参加者リスト（JSON形式：uid と name の配列） |
| L | roomId | 部屋ID（オンラインモードのみ。localモードは空） |
| M | hostUid | ホストのユーザーID |
| N | role | このユーザーの役割（`host` / `guest`） |
| O | env | 環境（`beta` = Netlify / `production` = GitHub Pages） |
| P | errorMessage | エラーメッセージ（error イベントのみ） |
| Q | errorSource | エラー発生ファイル（error イベントのみ） |
| R | errorLine | エラー発生行番号（error イベントのみ） |

**イベント種別（C列 event）**

| event | 発生タイミング | 主な用途 |
|---|---|---|
| `user_login` | アプリ起動・LIFF初期化完了時 | DAU 計測 |
| `game_start` | ホストがテーマを確定してゲーム開始時 | セッション開始の記録 |
| `game_complete` | 結果発表画面が表示された時 | プレイ完了数・ゲーム時間の計測 |
| `error` | JavaScript エラー発生時 | バグ・クラッシュの検知 |

---

### raw_users（ユーザー登録情報）

Firebase RTDB の `users` ノードから全件取得。毎回上書き。

| 列 | 項目名 | 意味・定義 |
|---|---|---|
| A | userId | LINE のユーザーID |
| B | displayName | LINE の表示名 |
| C | createdAt(JST) | 初回登録日時（JST） |
| D | lastLoginAt(JST) | 最終ログイン日時（JST） |
| E | env | 最終ログイン時の環境 |
| F | firebaseUid | Firebase 匿名認証 UID（内部管理用） |

---

### raw_games（ゲームプレイ記録）

**1テーマのプレイ = 1行**。`raw_events` の `game_start` と `game_complete` を突合して生成。ホストの `game_complete` を優先（ゲストの重複を除去）。

| 列 | 項目名 | 意味・定義 |
|---|---|---|
| A | date(JST) | プレイ日（JST・yyyy/MM/dd） |
| B | roomId | 部屋ID（local モードは空） |
| C | themeId | テーマID（オリジナルテーマは空） |
| D | themeText | テーマの文章 |
| E | themeType | `pack` / `original` |
| F | mode | `pair` / `multi` / `local` |
| G | playerCount | プレイ人数 |
| H | hostUid | ホストのユーザーID |
| I | hostName | ホストの表示名 |
| J | players | 参加者リスト（JSON形式） |
| K | duration_sec | ゲーム時間（秒）※ game_start〜game_complete の経過時間 |
| L | env | 環境（`beta` / `production`） |

**プレイ数・セッション数の定義**

> 1つの部屋（セッション）で3テーマ遊んだ場合：
> - **セッション数** = 1（部屋の数）
> - **プレイ数（テーマ）** = 3（テーマをプレイした回数）

---

### raw_network（ネットワーク記録）

`raw_games` から生成。誰が誰と遊んだかを追跡するためのローデータ。

| 列 | 項目名 | 意味・定義 |
|---|---|---|
| A | date(JST) | プレイ日（JST） |
| B | roomId | 部屋ID |
| C | mode | `pair` / `multi` / `local` |
| D | themeText | テーマの文章 |
| E | themeType | `pack` / `original` |
| F | hostUid | ホストのユーザーID |
| G | hostName | ホストの表示名 |
| H | participants | ゲスト参加者の表示名（スラッシュ区切り） |
| I | playerCount | プレイ人数 |
| J | duration_sec | ゲーム時間（秒） |
| K | env | 環境 |

---

### stat_users（ユーザー別プレイ統計）

`raw_events` から集計。ユーザーごとの行動サマリー。

| 列 | 項目名 | 意味・定義 |
|---|---|---|
| A | userId | LINE のユーザーID |
| B | displayName | LINE の表示名 |
| C | loginCount | 累計ログイン回数 |
| D | gamesHosted | ホストとしてプレイ完了したテーマ数 |
| E | gamesJoined | ゲストとしてプレイ完了したテーマ数 |
| F | themesPlayed | 累計プレイテーマ数（gamesHosted + gamesJoined） |
| G | firstSeen(JST) | 初回イベント記録日時（JST） |
| H | lastSeen(JST) | 最終イベント記録日時（JST） |
| I | env | 最後にアクセスした環境 |

---

### stat_themes（テーマ別プレイ統計）

`raw_games` から生成。テーマの人気・利用状況を分析するためのローデータ。

| 列 | 項目名 | 意味・定義 |
|---|---|---|
| A | date(JST) | プレイ日（JST） |
| B | themeId | テーマID |
| C | themeText | テーマの文章 |
| D | themeType | `pack` / `original` |
| E | mode | `pair` / `multi` / `local` |
| F | playerCount | プレイ人数 |
| G | duration_sec | ゲーム時間（秒） |
| H | env | 環境 |

---

### sum_daily / sum_weekly / sum_monthly（サマリー）

集計期間が異なるだけで列構成は同じ。`raw_events` と `raw_games` から生成。

| 列 | 項目名 | 意味・定義 |
|---|---|---|
| A | 期間 | 集計日（`yyyy/MM/dd`）/ 週開始日（`yyyy/MM/dd週`）/ 年月（`yyyy/MM`） |
| B | プレイ数(テーマ) | その期間にプレイされたテーマ数（raw_games の行数） |
| C | セッション数(部屋) | その期間に使われた部屋の数（ユニーク roomId 数） |
| D | DAU(ログイン数) | `user_login` イベントのユニークユーザー数（アプリを開いた人） |
| E | ゲームプレイ人数 | `game_complete` イベントのユニークユーザー数（実際にゲームをプレイした人） |
| F | 新規ユーザー数 | その期間に初めてアプリを起動したユーザー数 |
| G | 累計ユーザー数 | その期間までの累計登録ユーザー数 |
| H | pairプレイ数 | ふたりであそぶのプレイ数（テーマ単位） |
| I | multiプレイ数 | みんなであそぶのプレイ数（テーマ単位） |
| J | localプレイ数 | 1台であそぶのプレイ数（テーマ単位） |
| K | pairセッション数 | ふたりであそぶの部屋数 |
| L | multiセッション数 | みんなであそぶの部屋数 |

---

## env の定義

| 値 | 環境 | URL |
|---|---|---|
| `production` | 本番（GitHub Pages） | `tomoshiya.github.io/...` |
| `beta` | 開発（Netlify） | `beta--dashing-granita-b6aef3.netlify.app/...` |
| `local` | ローカル開発 | `localhost` |

env はブランチではなく、**ブラウザがアクセスしているドメイン名**で自動判定されます。同じコードを main にプッシュすると `production` になります。

---

## トラブルシューティング

### 列がズレている・データが空

旧バージョンのスクリプトで書き込まれたデータが残っている可能性があります。

**対処**: 下記シートの内容を全削除してから `今すぐ同期する` を実行する。
- `raw_events`（内容のみ削除・シートは残す）
- `raw_games`, `raw_network`, `stat_users`, `stat_themes`
- `sum_daily`, `sum_weekly`, `sum_monthly`

### プレイ数・セッション数が0になっている

`raw_games` が正しく生成されていない可能性が高い。`raw_events` を全削除して再同期する。
