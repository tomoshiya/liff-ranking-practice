# RankNow モニタリングガイド

Google Sheets のシート構成・列の意味・運用方法をまとめたドキュメントです。

---

## シート一覧

| シート名 | 種別 | 用途 |
|---|---|---|
| `raw_events` | 生データ | Firebase に記録された全イベントのログ |
| `users` | 生データ | ユーザー登録情報の一覧 |
| `user_stats` | 集計 | ユーザーごとのプレイ統計 |
| `game_log` | 生データ | 1テーマのプレイ = 1行のゲーム記録 |
| `theme_stats` | 生データ | テーマ別の詳細プレイ記録（game_log の絞り込み版） |
| `network_log` | 生データ | 誰と誰が遊んだかのネットワーク記録 |
| `daily_summary` | 集計 | 日次サマリー |
| `weekly_summary` | 集計 | 週次サマリー |
| `monthly_summary` | 集計 | 月次サマリー |

> **削除済み（旧シート）**: `theme_ranking`, `network` → それぞれ `theme_stats`, `network_log` に置き換え済み

---

## 各シートの詳細

### raw_events（全イベント生ログ）

Firebase RTDB の `analytics/events` ノードから取得した生データ。アプリで発生した全イベントが蓄積される。

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
| L | roomId | 部屋ID（オンラインモードのみ） |
| M | hostUid | ホストのユーザーID |
| N | role | このユーザーの役割（`host` / `guest`） |
| O | env | 環境（`beta` = Netlify / `production` = GitHub Pages） |
| P | errorMessage | エラーメッセージ（errorイベントのみ） |
| Q | errorSource | エラー発生ファイル（errorイベントのみ） |
| R | errorLine | エラー発生行（errorイベントのみ） |

**イベント種別（event列）**

| event | 発生タイミング | 主な用途 |
|---|---|---|
| `user_login` | アプリ起動・LIFF初期化完了時 | DAU計測 |
| `game_start` | ホストがテーマを確定してゲーム開始時 | セッション計測 |
| `game_complete` | 結果発表画面が表示された時 | プレイ完了数・ゲーム時間計測 |
| `error` | JavaScript エラー発生時 | バグ・クラッシュ検知 |

---

### users（ユーザー登録情報）

Firebase RTDB の `users` ノードから取得。毎回全件上書き。

| 列 | 項目名 | 意味・定義 |
|---|---|---|
| A | userId | LINE のユーザーID |
| B | displayName | LINE の表示名 |
| C | createdAt(JST) | 初回登録日時（JST） |
| D | lastLoginAt(JST) | 最終ログイン日時（JST） |
| E | env | 初回登録 / 最終ログイン時の環境 |
| F | firebaseUid | Firebase 匿名認証 UID（内部管理用） |

---

### user_stats（ユーザー別プレイ統計）

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

### game_log（ゲームプレイ記録）

**1テーマのプレイ = 1行**。`raw_events` の `game_start` と `game_complete` を突合して生成。ホストの `game_complete` イベントを優先（重複排除）。

| 列 | 項目名 | 意味・定義 |
|---|---|---|
| A | date(JST) | プレイ日（JST・yyyy/MM/dd） |
| B | roomId | 部屋ID（localモードは空） |
| C | themeId | テーマID（オリジナルテーマは空） |
| D | themeText | テーマの文章 |
| E | themeType | `pack` / `original` |
| F | mode | `pair` / `multi` / `local` |
| G | playerCount | プレイ人数 |
| H | hostUid | ホストのユーザーID |
| I | hostName | ホストの表示名 |
| J | players | 参加者リスト（JSON形式） |
| K | duration_sec | ゲーム時間（秒）※game_start〜game_completeの経過時間 |
| L | env | 環境（`beta` / `production`） |

**プレイ数の定義**

> 1つの部屋（セッション）で3テーマ遊んだ場合：
> - **セッション数** = 1（部屋の数）
> - **プレイ数（テーマ）** = 3（テーマをプレイした回数）

---

### theme_stats（テーマ別詳細記録）

`game_log` から生成。テーマの人気・利用状況を分析するためのローデータ。

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

### network_log（ネットワーク記録）

`game_log` から生成。誰が誰と遊んだかを追跡するためのローデータ。

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

### daily_summary / weekly_summary / monthly_summary（サマリー）

集計期間が異なるだけで列構成は同じ。`raw_events` と `game_log` から生成。

| 列 | 項目名 | 意味・定義 |
|---|---|---|
| A | 期間 | 集計日 / 週開始日 / 年月 |
| B | プレイ数(テーマ) | その期間にプレイされたテーマ数（game_logの行数） |
| C | セッション数(部屋) | その期間に使われた部屋の数 |
| D | DAU(ログイン数) | user_loginイベントのユニークユーザー数 |
| E | 新規ユーザー数 | その期間に初めてアプリを起動したユーザー数 |
| F | 累計ユーザー数 | その期間までの累計登録ユーザー数 |
| G | pairプレイ数 | ふたりであそぶのプレイ数（テーマ単位） |
| H | multiプレイ数 | みんなであそぶのプレイ数（テーマ単位） |
| I | localプレイ数 | 1台であそぶのプレイ数（テーマ単位） |
| J | pairセッション数 | ふたりであそぶの部屋数 |
| K | multiセッション数 | みんなであそぶの部屋数 |

---

## 同期の仕組み

```
Firebase RTDB (analytics/events, users)
    ↓ Google Apps Script
raw_events（差分追記）, users（全件上書き）
    ↓ 集計処理
user_stats, game_log, theme_stats, network_log
    ↓ サマリー処理
daily_summary, weekly_summary, monthly_summary
```

**自動トリガー**: 毎日午前9時に `syncAll()` が実行される。

**手動実行**:

| メニュー | 関数 | 用途 |
|---|---|---|
| 今すぐ同期する | `syncAll()` | Firebase からデータ取得 ＋ 集計シート全再構築 |
| 集計のみ更新 | `buildAllDerived()` | Firebase へのアクセスなし・集計だけ再実行（高速） |

---

## env の定義

| 値 | 環境 | URL |
|---|---|---|
| `production` | 本番（GitHub Pages） | `tomoshiya.github.io/...` |
| `beta` | 開発（Netlify） | `beta--dashing-granita-b6aef3.netlify.app/...` |
| `local` | ローカル開発 | `localhost` |

env はサーバー設定ではなく、**ブラウザがアクセスしているドメイン名**で自動判定されます。同じコードを本番にプッシュすると `production` になります。

---

## データの鮮度

- `raw_events`: 前回同期以降の新規イベントが追記される（累積）
- `users`: 常に最新の全件が上書きされる
- その他の集計シート: 同期のたびに全件クリア・再生成される

---

## トラブルシューティング

### 集計シートの列がズレている

**原因**: 旧バージョンのスクリプトで書き込まれたデータが残っている。  
**対処**: 下記シートの内容を全削除してから `syncAll()` を実行する。
- `raw_events`, `game_log`, `theme_stats`, `network_log`
- `daily_summary`, `weekly_summary`, `monthly_summary`
- `user_stats`（存在する場合）

### プレイ数が0になっている

`game_log` が正しく生成されていない可能性が高い。`raw_events` を全削除して再同期する。

### theme_stats / network_log が空

`game_log` の列ズレが原因。`raw_events` から再同期することで解決する。
