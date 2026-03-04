---
name: RankQuest 開発計画
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

  # ===== β版バックエンド整備（進行中） =====
  - id: firebase-security-rules
    content: "Phase 5b: Firebase Security Rules強化（β公開前の安全確認）"
    status: pending
  - id: themes-firebase
    content: "Phase 5c: テーマデータをFirebaseに移行（Consoleで管理可能に）"
    status: pending
  - id: local-storage-history
    content: "Phase 5d: LocalStorageでゲーム履歴保存（プライバシー重視）"
    status: pending
  - id: gas-firebase-sync
    content: "Phase 5e: Google Sheets→Firebase同期（テーマ管理の利便性向上）"
    status: pending

  # ===== β版フロントエンド改善（後回し） =====
  - id: ux-wireframe
    content: "Phase 6a: UIワイヤーフレーム設計（改善方針合意後に実装）"
    status: pending
  - id: input-multiline
    content: "Phase 6b: 入力フォームのマルチライン対応"
    status: pending
  - id: theme-hints
    content: "Phase 6c: テーマ入力時のヒント・候補表示"
    status: pending
  - id: score-partial
    content: "Phase 6d: スコア部分点の仕組み（粒度改善）"
    status: pending

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

# RankQuest 開発計画

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
| `develop` | 開発・テスト用 | Netlify | RankQuest Dev `2008911809-43mMnuKh` |

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

### 5b: Firebase Security Rules強化

**目的**: β公開に向けて不正アクセス・データ改ざんを防ぐ

現状の課題：
- ルールが `auth != null`（認証済みなら何でもできる）で緩すぎる
- 他ユーザーのデータを書き換えられる可能性がある

強化方針：
```javascript
// 例：自分のデータしか書けないように
"users": {
  "$uid": {
    ".read": "auth != null && auth.uid == $uid",
    ".write": "auth != null && auth.uid == $uid"
  }
},
"gameRooms": {
  "$roomId": {
    // ホストのみ部屋の状態を変更できる
    ".write": "auth != null && (
      !data.exists() ||
      data.child('hostId').val() == auth.uid
    )"
  }
}
```

### 5c: テーマデータのFirebase移行

**目的**: コード変更・コミットなしでテーマを追加・変更できるようにする

**データ構造**:
```
themes/
  packs/
    basic/            ← 無料（認証済み全員）
      001: { text: "最近ハマっていること", category: "日常" }
      002: { text: "ストレス発散法TOP5", category: "日常" }
    gokon/            ← 将来の有料パック
      101: { text: "理想のデートプランTOP5", category: "恋愛" }
  packMeta/           ← パック一覧（誰でも読める）
    basic:  { name: "基本テーマ", price: 0, count: 20 }
    gokon:  { name: "合コン用パック", price: 380, count: 20 }
```

**移行後の管理方法（段階的）**:
- **近い将来**: Firebase Consoleから直接編集（コード不要）
- **将来**: Google Sheets → GAS → Firebase同期（スプシで直感的に管理）

### 5d: LocalStorageでゲーム履歴保存

**目的**: ユーザーが過去の結果を振り返れるようにする（プライバシー重視）

**方針**:
- Firebaseには保存しない（端末内のみ）
- 保存するデータ: 日時・テーマ・参加者・スコア
- 容量制限を考慮して最新N件のみ保持

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

## Phase 6: フロントエンドUX改善

**方針**: ワイヤーフレームから設計し、合意してから実装する

### 改善候補（トライアルユーザーフィードバックより）

| フィードバック | 対応案 | 優先度 |
|---|---|---|
| ゼロから入力が難しい | テーマ入力時にヒント・例文を表示 | 高 |
| 長いテキストが入力しづらい | 入力フォームをtextareaに変更 | 中 |
| スコアの粒度が厳しい | 部分点の仕組みを導入 | 中 |
| グループプレイの開始が難しい | 「みんなでランクエ」の入口UX改善 | 中 |

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
