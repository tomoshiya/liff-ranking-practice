---
name: RankQuest 開発計画（β版〜）
overview: |
  α版（Phase 1〜4）は完了。β公開に向けてバックエンド基盤整備を優先し、
  その後フロントエンドUX改善（ワイヤーフレームから）に取り組む方針。
  開発環境（Netlify/develop）と本番環境（GitHub Pages/main）を分離済み。
todos:
  # ===== 完了済み =====
  - id: css-split
    content: "Phase 1: CSS分割リファクタリング"
    status: completed
  - id: phase2a-html
    content: "Phase 2a: 部屋選択・作成・参加のHTML画面追加"
    status: completed
  - id: phase2a-firebase
    content: "Phase 2a: gameRoomsノードのFirebaseロジック"
    status: completed
  - id: phase2b-game-flow
    content: "Phase 2b: テーマ選択→入力→予想のゲーム進行ロジック"
    status: completed
  - id: phase2c-result
    content: "Phase 2c: スコア計算・結果表示・再戦機能"
    status: completed
  - id: phase3-impl
    content: "Phase 3: みんなでランクエ（multiモード）実装"
    status: completed
  - id: local-mode-impl
    content: "Phase 4: 端末1つでランクエ（localモード）実装"
    status: completed
  - id: local-mode-fixes
    content: "Phase 4: localモード細部修正"
    status: completed
  - id: security-api-key
    content: "セキュリティ: Firebase APIキーにHTTPリファラー制限・Gemini API無効化"
    status: completed
  - id: branch-management
    content: "Phase 5a: ブランチ管理（develop/main分離）+ Netlify開発環境構築"
    status: completed

  - id: firebase-security-rules
    content: "Phase 5b: Firebase Security Rules v3.0適用（users自分のみ・analytics書き込みのみ・pictureUrl廃止・firebaseUid導入）"
    status: completed

  # ===== β版バックエンド整備（進行中） =====
  - id: themes-firebase
    content: "Phase 5c: テーマデータをFirebaseに移行（Consoleで管理可能に）"
    status: completed
  - id: firebase-rules-bugfix
    content: "Phase 5b補足: Security Rules v3.4 - gameRoomsのvalidateルール削除（ランキング送信エラー修正）"
    status: completed
  - id: local-storage-history
    content: "Phase 5d: LocalStorageでゲーム履歴保存（設計確定・実装はβリビルド時）"
    status: pending
  - id: gas-firebase-sync
    content: "Phase 5e: Google Sheets→Firebase同期（テーマ管理の利便性向上）"
    status: pending

  # ===== β版リビルド（優先） =====
  - id: beta-rebuild-design
    content: "Phase 6-Rebuild: β版ファイル構成設計（HTML/CSS/JS分割）"
    status: completed
  - id: beta-rebuild-impl
    content: "Phase 6-Rebuild: β版フロントエンド実装（ワイヤーフレームベース）"
    status: completed
  - id: beta-rebuild-debug
    content: "Phase 6-Rebuild: β版テスト・デバッグ・修正（実機確認）"
    status: in_progress

  # ===== β版フロントエンド改善（後回し） =====
  - id: ux-wireframe
    content: "Phase 6a: UIワイヤーフレーム設計（全11画面確定済み）"
    status: completed
  - id: score-partial
    content: "Phase 6d: スコア部分点の仕組み → 新スコアリング(10,6,3,1,0)で確定"
    status: completed

  # ===== 将来（β公開後） =====
  - id: paid-theme-packs
    content: "Phase 7a: 有料テーマパック・アクセス制御の実装"
    status: pending
  - id: payment-flow
    content: "Phase 7b: 決済フロー実装（LINE Pay or Stripe）"
    status: pending
  - id: history-ui
    content: "Phase 7c: ゲーム履歴閲覧画面"
    status: pending
---

# RankQuest 開発計画（β版〜）

> ## AIへの引き継ぎ指示
>
> ### このファイルの位置づけ
> このファイルは **β版以降（2026年3月〜）の主ドキュメント** です。
> 新しいAIセッションを始めるときは、**まずこのファイルを読んでください。**
>
> ### ドキュメント構成
>
> | ファイル | 役割 | 更新 |
> |---|---|---|
> | **`_plan.md`（このファイル）** | 現在のTODO・環境情報・β版ロードマップ | ✅ 毎セッション更新 |
> | **`PROJECT_MASTER.md`** | α版までの技術決定・セーブポイントの記録 | 🔒 更新しない |
> | **`firebase-security-rules-simple.json`** | Firebaseルールの管理ファイル | ✅ 変更時に更新 |
>
> ### セッション開始時のチェックリスト
> 1. このファイルのTODOリストで現在地を確認する
> 2. 「現在の環境構成」セクションでURL・LIFF IDを確認する
> 3. α版以前の経緯が必要なら `PROJECT_MASTER.md` を参照する
>
> ### 開発ルール（必読）
> - 指示された箇所以外のコードは触らない
> - 既存ロジックを勝手に変更しない
> - 新しいライブラリを勝手に追加しない
> - コミットは明示的に依頼されたときのみ行う
> - 作業後は必ずこのファイルのTODOを更新する
>
> ### ブランチ・デプロイルール（必読）
> - **β版作業は `beta` ブランチで行う。α版の修正は `develop` ブランチで行う**
> - `git push` の前に必ずブランチ名を確認・明示してから実行する
> - `main` への直接プッシュは GitHub の Branch Protection により物理的に禁止済み
> - `main` への反映はユーザーが「本番に反映して」と明示的に指示した場合のみ PR を作成する
>
> ### 本番反映フロー
> ```
> develop で開発・テスト（Netlify / 開発LIFF）
>     ↓ 動作確認OK
>     ↓ ユーザーが「本番に反映して」と指示
> GitHub で develop → main の PR を作成
>     ↓ ユーザーがPRをマージ（またはAIがマージ依頼）
> GitHub Pages に自動反映（本番LIFF）
> ```
>
> ### Firebase Security Rules の注意
> - Firebase（DB・Rules）は本番・開発で**共通**（同一プロジェクト）
> - Rules を変更したら**両環境で動作確認**が必要
> - テストデータも共通DBに入るため、本番DBを汚染しないよう注意

## 全体方針（2026年3月時点）

### α版→β版への移行ロードマップ

```
【完了】Phase 1〜4: α版機能の実装
    ↓
【進行中】Phase 5: バックエンド基盤整備（β公開の前提条件）
    ↓
【予定】Phase 6: フロントエンドUX改善（ワイヤーフレームから設計）
    ↓
【将来】Phase 7: マネタイズ基盤（有料テーマパック・決済）
```

### β公開の方針

- **公開形態**: 誰でもアクセス可能（URL知っている人）
- **拡散方針**: SNSで大々的には広めない。バイラル（ユーザーがユーザーを呼ぶ）効果を検証
- **公開タイミング**: Phase 5のバックエンド整備完了後

---

## 現在の環境構成

### ブランチ戦略

| ブランチ | 役割 | デプロイ先 | LIFF |
|---|---|---|---|
| `main` | 本番リリース | GitHub Pages | RankQuest（α版）`2008911809-CBLKsbT1` |
| `develop` | α版の開発・テスト用 | Netlify (develop) | RankQuest Dev `2008911809-43mMnuKh` |
| `beta` | β版リビルド専用 | Netlify (beta) | Rank-Q beta `2008911809-x8vw37eD` |

### 開発フロー

```
developブランチで開発
    ↓ git push → Netlifyが自動デプロイ（1〜2分）
    ↓ https://liff.line.me/2008911809-43mMnuKh でスマホテスト
    ↓ 問題なければ main にマージ（PR推奨）
    ↓ GitHub Pages に反映（本番）
```

### URL一覧

| 環境 | URL |
|---|---|
| 本番アプリ | `https://tomoshiya.github.io/liff-ranking-practice/` |
| 本番LIFF | `https://liff.line.me/2008911809-CBLKsbT1` |
| 開発アプリ | `https://dashing-granita-b6aef3.netlify.app/` |
| 開発LIFF | `https://liff.line.me/2008911809-43mMnuKh` |

---

## Phase 5: β版バックエンド整備

### 5a: ブランチ管理 ✅ 完了（2026年3月4日）

- `develop`ブランチ作成・GitHubにプッシュ
- Netlifyと連携（developブランチの自動デプロイ）
- LINE DevelopersにRankQuest Dev用LIFFアプリを登録
- ホスト名によるLIFF ID自動切り替えを実装

### 5b: Firebase Security Rules強化 ✅ 完了（2026年3月4日）

**実施内容（v3.0）**:

| ノード | 変更前 | 変更後 |
|---|---|---|
| `users` | auth != null（全員読み書き） | 自分のデータのみ（firebaseUid照合） |
| `analytics` | auth != null（全員読み書き） | 書き込みのみ（読み取り禁止） |
| `gameRooms` | auth != null | auth != null（変更なし・ゲームに必要） |

**解決した技術的問題**:
- Firebase匿名認証UID（auth.uid）とLINE UserID（DBキー）が別物のため、従来の`auth.uid == $uid`ルールが機能しなかった
- 解決策：`users`レコードに`firebaseUid`（Firebase匿名認証UID）を保存し、`data.child('firebaseUid').val() == auth.uid`で照合

**併せて実施したコード変更**:
- `pictureUrl`をFirebaseに保存しない設計に変更（個人情報削減）
- `firebaseUid`を`users`レコードに保存する処理を追加

**既知の影響**:
- 旧モード（開発用・ペア設定）が他ユーザーのusersデータを読む処理で失敗するようになった
- beta/multi/localモードへの影響はなし（gameRoomsノードを使用しており、usersノードを参照しない）
- 旧モードは廃止予定のため修正しない方針（意図的）

**次のステップ（v3.1）**:
- `gameRooms`の参加者のみ読み書き可能にする
- `players`にも`firebaseUid`を保存し、Security Rulesで照合する設計に変更

### 5b補足: Security Rules バグ修正 ✅ 完了（2026年3月6日）

**発生した問題**：
- v3.1で追加した `gameRooms/rankings/$uid` の `.validate` ルールが原因でランキング送信が PERMISSION_DENIED に
- 原因①：ダミーユーザーは `users/` にレコードがないため `.validate` が常に false
- 原因②：LINE WebView は Firebase Anonymous Auth の UID をセッション間でリセットする可能性があり、DB に保存した `firebaseUid` と一致しない

**対応（v3.4）**：
- `gameRooms` の `.validate` ルールを削除、`auth != null` のみに戻す
- `users` の `.write` ルールは v3.3 のまま維持（`firebaseUid` が null の場合も書き込み許可）

**今後の方針**：
- より細かいアクセス制御は Phase 7 以降で再設計
- 本格的な認証統合は LINE IDトークン → Firebase Custom Token 方式（Cloud Functions 必要・有料）

---

### 5c: テーマデータのFirebase移行 ✅ 完了（2026年3月6日）

**実施内容**:
- 29テーマを `themes/items/` に移行（`themes-seed.json` でインポート）
- `themes/packs/basic` にパックメタデータを追加
- `themes/weekly` にウィークリーテーマ構造を追加
- `THEMES` ハードコード定数を削除、`loadThemes()` による動的取得に変更
- `deepLinkThemeId` 変数と `checkUrlParameters()` に `?themeId=` 処理を追加（ソロ入力UIはPhase 6）
- Firebase Security Rules v3.2 で `themes/` ノードのアクセス制御を追加

**テーマの構造**:
```
themes/
  packs/basic:  { name, price: 0, isFree: true }
  weekly:       { themeId, startDate, endDate, message }
  items/001〜029: { text, pack, tags: {シーン: true}, order, isActive }
```

**運用方法**:
- テーマ追加・変更：Firebase Consoleから直接編集（コード不要）
- `isActive: false` にすれば即時非公開
- ウィークリーテーマ：`themes/weekly.themeId` を更新するだけ

### 5d: LocalStorageでゲーム履歴保存（設計確定）

**目的**: ゲーム振り返り・WEEKLYモード活用・将来の再エンゲージメント設計の土台

**LocalStorageキー構成**:

| キー名 | 内容 | 上限 |
|--------|------|------|
| `rankq_history` | ゲーム全履歴（全員のTOP5含む） | 最大50件 |
| `rankq_soloHistory` | WEEKLYモード用ソロ入力履歴 | 最大50件 |
| `currentSession` | ゲーム中断時の復元用一時データ | 1件のみ |

**`rankq_history` 1件のデータ構造**:
```json
{
  "id": "uuid",
  "playedAt": "2026-03-12T10:00:00",
  "themeId": "001",
  "themeText": "最近、嬉しかったことTOP5",
  "mode": "pair | multi | local",
  "players": [
    { "lineUserId": "U...", "displayName": "太郎" }
  ],
  "myLineUserId": "U...",
  "myScore": 32,
  "maxScore": 50,
  "totalScore": 68,
  "totalMaxScore": 100,
  "answers": {
    "U太郎": { "1": "家族", "2": "旅行", "3": "...", "4": "...", "5": "..." },
    "U花子": { "1": "仕事", "2": "趣味", "3": "...", "4": "...", "5": "..." }
  }
}
```

**設計方針**:
- 他者のTOP5も保存する（ゲームで共有された情報として、LocalStorage端末内保存はリスク低）
- β版では「記録として残す」まで実装。将来の再アプローチ機能（通知等）は正式版対応
- Firebase移行を想定した構造で設計しておく

**データ保存方式の選択肢まとめ**:
| 方式 | 用途 | 揮発性 |
|------|------|--------|
| JavaScriptメモリ（変数） | ゲーム中の一時状態管理 | ページ閉じると消える |
| SessionStorage | タブセッション中のみ保持 | タブ閉じると消える |
| **LocalStorage** | **β版の履歴・設定保存** | **端末に永続保存** |
| IndexedDB | 大量データ・複雑クエリ | 端末に永続保存 |
| Firebase | 正式版の全履歴保存・通知連携 | サーバー永続保存 |

**セッション復元（currentSession）について**:
- 現状の課題：ゲーム中にブラウザを閉じると状態がリセットされHOMEに戻る
- 解決策：ゲームの進行状態（部屋ID・フェーズ・入力内容等）をLocalStorageに随時保存し、再アクセス時に復元
- β版リビルド時に実装予定

### 5e: Google Sheets → Firebase同期（テーマ管理）

**目的**: 非エンジニアでもテーマ追加・編集ができる仕組み

**構成**:
```
Googleスプレッドシート（テーマ一覧を編集）
    ↓ Google Apps Script（GAS）が自動でFirebaseに書き込み
Firebase DB（アプリの本番データ・Security Rulesで保護）
    ↓
RankQuestアプリ（認証済みユーザーが取得）
```

---

## Phase 6: β版リビルド

**方針**: 既存の7700行超モノリシックコードを廃棄し、ワイヤーフレームベースで新規構築する

### リビルドの背景

- 現行コード（`index.html`）は7700行超のHTML/CSS/JS混在で保守性が低い
- UIフル刷新・LocalStorage設計・新スコアリング等を一括実装するため、継ぎ足しより新規構築が効率的
- LINEのWebViewキャッシュ問題もファイル分割により軽減できる

### 新ファイル構成（予定）

```
index.html          ← HTML構造のみ（β版）
css/
  style.css         ← 全スタイル
js/
  firebase.js       ← Firebase初期化・認証（既存から移植）
  themes.js         ← テーマ取得（既存から移植）
  game-pair.js      ← ふたりモードのロジック
  game-multi.js     ← みんなモードのロジック
  game-local.js     ← ローカルモードのロジック
  storage.js        ← LocalStorage管理（新規）
  ui.js             ← 画面切替・共通UI
  app.js            ← エントリーポイント
```

### ブランチ戦略（リビルド時）

```
main      → α版（本番）。触らない
develop   → α版の保守用に残す
beta      ← β版リビルドブランチ（新規作成）
```

### ゲームモード（β版）

β版で実装する3モード（旧αモードは廃棄）：
| モード | 概要 |
|--------|------|
| ふたりであそぶ | Firebase gameRooms使用 |
| みんなであそぶ | Firebase gameRooms使用 |
| 1台であそぶ | ローカル処理のみ |

### 確定済みスコアリング（2026年3月）

| 距離 | ラベル | 得点 |
|------|--------|:----:|
| ±0 | あたり | 10pt |
| ±1 | おしい | 6pt |
| ±2 | かすり | 3pt |
| ±3 | ちかい | 1pt |
| ±4 | はずれ | 0pt |

- **1人満点：50pt**（5問 × 10pt）
- **ペア合計：100pt**（パーセント換算が直感的）
- **みんなモードのみ**：当てた率 / 当てられた率を追加表示

### 既存コードから移植するもの

| 内容 | 対応 |
|------|------|
| Firebase初期化・認証 | コピー移植 |
| LIFF初期化・ユーザー取得 | コピー移植 |
| `loadThemes()`関数 | コピー移植 |
| スコア計算ロジック | 新スコアリングで再実装 |
| HTMLデザイン | ワイヤーフレームから新規作成 |

---

## Phase 7: マネタイズ基盤（β公開後）

### テーマパックのビジネスモデル

| モデル | 内容 |
|---|---|
| 無料 | 基本テーマ（〜20種）が使い放題 |
| サブスク | 全テーマ使い放題（月額制・有効期限フラグで管理） |
| 買い切り | 特定パックのみ購入（パックIDフラグで管理） |

### ユーザー×購入情報のデータ構造

```
users/
  LINE_USER_ID/
    purchases/
      plan: "subscription"     // "free" | "subscription"
      planExpiry: 1780000000   // サブスク有効期限（Unixtime）
      packs/
        gokon: true            // 買い切りパック購入済み
        family: true
```

### アクセス制御（Firebase Security Rules）

```javascript
"themes/packs/gokon": {
  ".read": "auth != null && (
    root.child('users').child(auth.uid).child('purchases/plan').val() == 'subscription'
    || root.child('users').child(auth.uid).child('purchases/packs/gokon').val() == true
  )"
}
```

### 決済フロー（将来）

- **暫定**: Firebase Consoleで手動フラグON（β期間中のテスト用）
- **正式**: LINE Pay または Stripe を導入

---

## 実装済み機能一覧（α版）

### ゲームモード

| モード | 概要 | 状態 |
|---|---|---|
| ふたりでランクエ（betaモード） | 2人がそれぞれの端末でFirebase経由でプレイ | ✅ |
| みんなでランクエ（multiモード） | 3人以上がそれぞれの端末でFirebase経由でプレイ | ✅ |
| 端末1つでランクエ（localモード） | 1台をまわして遊ぶパス&プレイ（Firebase不使用） | ✅ |

### 技術スタック

| 項目 | 内容 |
|---|---|
| フロントエンド | Vanilla HTML / CSS / JavaScript |
| スタイル | `css/style.css` に分離済み |
| ドラッグ&ドロップ | SortableJS |
| バックエンド | Firebase Realtime Database + Anonymous Auth |
| 本番ホスティング | GitHub Pages（mainブランチ） |
| 開発ホスティング | Netlify（developブランチ・自動デプロイ） |
| LIFF | LINE Front-end Framework |
