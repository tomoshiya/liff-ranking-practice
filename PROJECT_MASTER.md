# 🎮 ふたりのらんきんぐ - プロジェクトマスタードキュメント

**最終更新**: 2026年1月19日 23:00  
**プロジェクト状態**: フェーズ2進行中（ランキング入力機能完成）  
**次回セッション予定**: 2026年1月20日

> 💡 **このドキュメントについて**  
> このファイルは「プロジェクトの全体像」と「AIへの引き継ぎ指示」を兼ねた**唯一の統合ドキュメント**です。  
> すべての進捗、決定事項、次回アクションはこのファイルに集約され、更新されます。  
> 次回開発時は、このファイルを読み込ませることで、AIが現在の状況を完全に把握できます。

> 📂 **ドキュメント管理方針**  
> - **PROJECT_MASTER.md**: 唯一の真実の情報源（常に更新）
> - **docs/ フォルダ**: 過去のドキュメント（参考資料、更新しない）
> - **README.md**: プロジェクト概要（シンプルな案内）

---

## 📍 プロジェクト概要

### コンセプト
> 夫婦・カップルが「お互いのランキング」を予想し合うことで、  
> コミュニケーションを深め、お互いをもっと知るゲーム

### ターゲット
- 夫婦・カップル（2人1組）
- 20代〜40代
- LINEを日常的に使っている

### プラットフォーム
- LINE LIFF（LINEアプリ内で動くWebアプリ）
- GitHub Pages（ホスティング）
- Firebase Realtime Database（データ保存・共有）

---

## 🎯 開発ロードマップ

### ✅ フェーズ1: LIFF環境構築（完了）
- GitHub リポジトリ作成
- LINE Developers 設定
- LIFF アプリ作成
- GitHub Pages デプロイ
- 基本動作確認

### ✅ フェーズ2-A: ランキング入力機能（完了）
- お題データ28個を実装
- お題ランダム表示
- 1位〜5位入力フォーム
- LocalStorageに保存
- 履歴表示機能
- カップル向けデザイン（ピンク基調）

### 📍 フェーズ2-B: UI/UX改善（現在ここ）
- [ ] 下書き保存機能
- [ ] 成功時のアニメーション
- [ ] お題にカテゴリアイコン追加
- [ ] 履歴のフィルター・検索機能
- [ ] 初回チュートリアル
- [ ] エラーハンドリング強化

### 🔜 フェーズ3: Firebase導入（次の大きなステップ）
- [ ] Firebaseアカウント・プロジェクト作成
- [ ] Realtime Database 設定
- [ ] LINE UserID認証の実装
- [ ] データ保存・取得をFirebaseに移行
- [ ] リアルタイム同期のテスト

### 🔜 フェーズ4: ペア機能実装
- [ ] ペアコード生成機能
- [ ] ペアコード入力・検証
- [ ] パートナー情報表示
- [ ] パートナーのランキング表示（条件付き）
- [ ] ペア解除機能

### 🔜 フェーズ5: 予想・答え合わせ機能
- [ ] 予想入力画面（3つ）
- [ ] 答え合わせロジック
- [ ] 結果表示画面
- [ ] スコア計算
- [ ] ゲームフロー管理

### 🔜 フェーズ6: 自動配信（Cloud Functions）
- [ ] LINE Messaging API 設定
- [ ] Cloud Functions 導入
- [ ] 週次スケジュール設定
- [ ] 自動通知機能
- [ ] リマインダー機能

### 🔜 フェーズ7: 磨き上げ・リリース
- [ ] バグフィックス
- [ ] パフォーマンス最適化
- [ ] 利用規約・プライバシーポリシー
- [ ] テストユーザー試用
- [ ] フィードバック反映

---

## 🔧 技術スタック

### フロントエンド
- **言語**: JavaScript (Vanilla JS)
- **マークアップ**: HTML5
- **スタイル**: CSS3（現在は `index.html` 内に記述）
- **LIFF SDK**: v2.x

### バックエンド（予定）
- **Firebase Realtime Database**: データ保存・同期
- **Firebase Cloud Functions**: 自動配信・スケジュール実行
- **LINE Messaging API**: プッシュ通知

### ホスティング
- **GitHub Pages**: 静的サイトホスティング
- **カスタムドメイン**: 将来検討

### 開発環境
- **エディタ**: Cursor / VSCode
- **バージョン管理**: Git / GitHub
- **デバッグ**: Chrome DevTools, LIFF Inspector

---

## 📂 現在のファイル構成

```
liff-ranking-practice/
├─ index.html                    ← LIFFアプリ本体（HTML+CSS+JS統合）
├─ PROJECT_MASTER.md             ← ★プロジェクト統合管理（唯一の情報源）
├─ README.md                     ← プロジェクト概要（シンプルな案内）
└─ docs/                         ← 参考資料（過去のドキュメント、更新しない）
    ├─ README.md                 ← 旧README（環境構築手順）
    ├─ チェックリスト.md
    ├─ 全体設計_壁打ち.md
    ├─ 次回セッション_クイックスタート.md
    └─ 開発進捗と引き継ぎ.md
```

**ファイルの役割：**
- **index.html**: アプリケーション本体
- **PROJECT_MASTER.md**: すべての情報が集約される唯一のドキュメント（常に最新）
- **README.md**: 初めて見る人向けの簡単な案内
- **docs/**: 過去の経緯を知りたい時に参照する資料

### 将来の構成（フェーズ3以降）
```
liff-ranking-practice/
├─ index.html                    ← HTMLのみ
├─ css/
│   └─ style.css                 ← スタイル分離
├─ js/
│   ├─ app.js                    ← メインロジック
│   ├─ firebase.js               ← Firebase関連
│   └─ themes.js                 ← お題データ
├─ PROJECT_MASTER.md             ← プロジェクト管理
├─ README.md                     ← プロジェクト概要
└─ docs/                         ← 参考資料
```

---

## 🔗 重要な情報

### GitHub
- **リポジトリ**: https://github.com/tomoshiya/liff-ranking-practice
- **GitHub Pages URL**: https://tomoshiya.github.io/liff-ranking-practice/
- **ユーザー名**: tomoshiya

### LINE Developers
- **プロバイダー**: 練習用
- **チャネル名**: ランキングアプリ練習
- **チャネルタイプ**: LINEログイン
- **LIFF ID**: 2008911809-CBLKsbT1
- **LIFF URL**: https://liff.line.me/2008911809-CBLKsbT1
- **エンドポイントURL**: https://tomoshiya.github.io/liff-ranking-practice/
- **Scope**: openid, profile, chat_message.write
- **管理画面**: https://developers.line.biz/console/

### ローカル環境
- **プロジェクトフォルダ**: `C:\Users\rshio\Documents\liff-ranking-practice\`
- **OS**: Windows 10
- **シェル**: PowerShell

---

## 📊 現在実装されている機能

### 1. お題システム
- **お題数**: 28個
- **カテゴリ**: 
  - エモーション系（8個）：最近の感情や出来事
  - Year系（2個）：この1年の振り返り
  - パーソナリティ系（15個）：好き嫌い、夢、宝物など
  - カップル系（3個）：パートナーについて
- **表示方法**: ランダム選択

### 2. ランキング入力
- **入力欄**: 1位〜5位（5つ）
- **バリデーション**: 全ての欄が必須
- **保存先**: LocalStorage
- **保存データ**: お題、ランキング、日時、ユーザー名

### 3. 履歴表示
- **表示件数**: 最大50件
- **表示内容**: お題、ランキング、日時、作成者
- **並び順**: 新しい順

### 4. UI/UX
- **カラー**: ピンク基調（#FF6B9D メイン、#6BCBFF サブ）
- **レスポンシブ**: スマホ向け（max-width: 600px）
- **画面数**: 3画面（メイン、入力、履歴）
- **アニメーション**: ボタンホバー効果

---

## 🎮 目指すゲームフロー（理想形）

### 週次スケジュール
```
月曜日 8:00
  ↓ Cloud Functions（自動）
📢 お題公開
「今週のお題：好きな食べ物TOP5」
「水曜日までにランキングを入力してね！」
  ↓
火曜日〜水曜日
  ↓ ユーザー操作
📝 各自がランキングを入力
  ↓
水曜日 23:59
  ↓ 自動締切
🔒 ランキング入力締切
「パートナーも入力完了しました！」
「金曜日までに予想を入力してね！」
  ↓
木曜日〜金曜日
  ↓ ユーザー操作
🤔 パートナーのランキングを3つ予想
  ↓
金曜日 23:59
  ↓ 自動締切
🔒 予想締切
「明日の朝、結果を発表します！」
  ↓
土曜日 8:00
  ↓ Cloud Functions（自動）
🎉 結果発表
「あなた: 2個正解、パートナー: 3個正解」
「詳細はアプリで確認してね！」
  ↓
土曜日〜日曜日
  ↓ ユーザー操作
💬 お互いのランキングを見て会話
  ↓
次の月曜日へ...
```

### ゲーム内フロー
```
【ユーザーA】              【ユーザーB】
    |                          |
ランキング入力              ランキング入力
    |                          |
    └──────┬──────┘
           ↓
     両者入力完了
           ↓
    ┌──────┴──────┐
    |                          |
予想入力（3つ）            予想入力（3つ）
    |                          |
    └──────┬──────┘
           ↓
     両者予想完了
           ↓
       答え合わせ
           ↓
    ┌──────┴──────┐
    |                          |
結果表示                    結果表示
お互いのランキング公開      お互いのランキング公開
正解数表示                  正解数表示
```

---

## 🗄️ データ設計（Firebase移行後）

### users（ユーザー情報）
```javascript
users: {
  "LINE_USER_ID_1": {
    displayName: "たろう",
    pictureUrl: "https://...",
    partnerId: "LINE_USER_ID_2",  // null if no partner
    pairCode: "ABC123",            // 自分が生成したコード
    createdAt: "2026-01-19T10:00:00Z",
    lastLoginAt: "2026-01-19T15:30:00Z"
  }
}
```

### rankings（ランキングデータ）
```javascript
rankings: {
  "ranking_001": {
    userId: "LINE_USER_ID_1",
    themeId: "theme_001",
    theme: "好きな食べ物TOP5",
    ranking: {
      "1": "寿司",
      "2": "ラーメン",
      "3": "カレー",
      "4": "ピザ",
      "5": "ハンバーグ"
    },
    status: "submitted",  // submitted | revealed
    weekId: "2026-W03",   // 週の識別子
    createdAt: "2026-01-19T11:00:00Z"
  }
}
```

### guesses（予想データ）
```javascript
guesses: {
  "guess_001": {
    rankingId: "ranking_001",
    guesserId: "LINE_USER_ID_2",
    targetUserId: "LINE_USER_ID_1",
    guesses: ["寿司", "ラーメン", "焼肉"],
    result: {
      correctCount: 2,
      details: [
        { guess: "寿司", actualRank: 1, isCorrect: true },
        { guess: "ラーメン", actualRank: 2, isCorrect: true },
        { guess: "焼肉", actualRank: null, isCorrect: false }
      ]
    },
    createdAt: "2026-01-19T12:00:00Z"
  }
}
```

### themes（お題マスタ）※将来的にDB化
```javascript
themes: {
  "theme_001": {
    title: "好きな食べ物TOP5",
    category: "パーソナリティ",
    icon: "🍽️",
    color: "#FF6B9D",
    description: "あなたの好きな食べ物・料理を教えてください",
    isActive: true
  }
}
```

### weeks（週次ゲーム管理）
```javascript
weeks: {
  "2026-W03": {
    weekId: "2026-W03",
    themeId: "theme_001",
    theme: "好きな食べ物TOP5",
    startDate: "2026-01-20",
    rankingDeadline: "2026-01-22T23:59:59Z",
    guessDeadline: "2026-01-24T23:59:59Z",
    revealDate: "2026-01-25T08:00:00Z",
    status: "active"  // active | closed
  }
}
```

---

## 🔐 セキュリティとプライバシー

### データアクセス制御
- ✅ 自分のランキングは自分だけが編集可能
- ✅ パートナーのランキングは予想入力後のみ閲覧可能
- ❌ 他人のランキングは閲覧不可

### Firebase セキュリティルール（案）
```javascript
{
  "rules": {
    "users": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid"
      }
    },
    "rankings": {
      "$rankingId": {
        ".read": "auth.uid === data.child('userId').val() || auth.uid === root.child('users').child(data.child('userId').val()).child('partnerId').val()",
        ".write": "auth.uid === data.child('userId').val()"
      }
    }
  }
}
```

### プライバシーポリシー
- 正式リリース前に作成必須
- 保存するデータ: LINE UserID、表示名、ランキング内容
- データの利用目的: ゲーム機能の提供
- データの保存期間: アカウント削除まで
- 第三者提供: なし

---

## 💰 コストとスケーリング

### Firebase 無料枠（Sparkプラン）
- **Realtime Database**: 1GB保存、10GB/月転送
- **Cloud Functions**: 200万回/月実行、40万GB秒/月
- **Authentication**: 無制限

### 想定利用量（100ペア = 200ユーザー）
- **保存**: 約5MB（1GBの0.5%）
- **転送**: 約500MB/月（10GBの5%）
- **Functions実行**: 約3,200回/月（200万の0.16%）

→ **当面は完全無料で運用可能**

### 有料化検討ライン
- 1,000ペア（2,000ユーザー）を超えたら
- 画像アップロード機能を追加したら
- リアルタイム通信が大幅に増えたら

---

## ⚠️ 既知の課題と制約

### 技術的課題
1. **LINE UserIDでのFirebase認証方法**
   - カスタム認証トークンが必要
   - Cloud Functionsでトークン生成が必要
   - 実装がやや複雑

2. **非同期処理の理解**
   - データ取得に時間がかかる
   - `.then()` を使った処理が必要
   - エラーハンドリングが重要

3. **ペア認証のタイミング**
   - 片方が入力しない場合の対応
   - リマインダー機能が必須

### UX課題
1. **初めてのユーザー導線**
   - チュートリアルの必要性
   - 空状態のメッセージ

2. **継続利用の促進**
   - 通知のタイミング
   - モチベーション維持の仕組み

### ビジネス課題
1. **テストユーザーの獲得**
   - 友人・知人に依頼
   - SNSでの募集

2. **フィードバック収集方法**
   - Googleフォーム
   - アプリ内フィードバック機能

---

## ✅ 完了事項（実績）

### 2026年1月17日（初日）
- ✅ LIFF環境構築完了
- ✅ 基本アプリ作成
- ✅ 動作確認成功
- ✅ 設計ドキュメント作成

### 2026年1月19日
- ✅ ランキング入力機能完成
  - お題データ28個実装
  - ランダム表示機能
  - 1〜5位入力フォーム
  - LocalStorage保存
  - 履歴表示機能
- ✅ デザイン改善（ピンク基調）
- ✅ 実機動作確認
- ✅ 壁打ち実施
  - 開発順序の整理
  - Firebase理解
  - 非同期処理の理解
  - Cloud Functionsの重要性確認
  - LIFF/LINEの使い分け理解
  - プロジェクト整理方針の決定
- ✅ ドキュメント統合・整理
  - PROJECT_MASTER.md 作成（唯一の情報源）
  - README.md 刷新（シンプルな案内）
  - 既存ドキュメントをdocs/に移動（参考資料化）
  - 情報の一元管理体制確立

---

## 🎯 次回アクション（優先順位順）

### 完了済み ✅
1. ✅ **プロジェクトマスタードキュメント作成**
2. ✅ **ドキュメント統合・整理**

### 最優先（今週中）
3. ⬜ **GitHubでのファイル移動**
   - `docs/` フォルダ作成
   - 既存ドキュメント5件を `docs/` に移動
   - 新しい `README.md` をアップロード
   - `PROJECT_MASTER.md` をアップロード

4. ⬜ **実際に使ってみる**（重要！）
   - 毎日1つお題に答える
   - 使いづらい点をメモ
   - パートナーに見せて反応を確認
   - フィードバックを PROJECT_MASTER.md に記録

5. ⬜ **小さなUI改善**
   - 下書き保存機能
   - 成功時のアニメーション
   - お題にカテゴリアイコン追加

### 重要（来週〜）
6. ⬜ **Firebase学習開始**
   - 公式チュートリアル（1〜2時間）
   - Googleアカウント作成（持っていれば不要）
   - Firebaseアカウント作成
   - サンプルプロジェクトで練習

7. ⬜ **index.html のコメント充実**
   - 各関数に説明コメント追加
   - セクション分けを明確化
   - 将来のコード分割に備える

### できたら（2週間後〜）
8. ⬜ **Firebase本格導入**
9. ⬜ **ペア機能の詳細設計**
10. ⬜ **ファイル分割の実施**

---

## 📝 重要な決定事項

### 技術選定
| 項目 | 決定内容 | 理由 |
|------|---------|------|
| データベース | Firebase Realtime Database | 無料枠が大きい、初心者向け、リアルタイム |
| ホスティング | GitHub Pages | 無料、簡単、自動デプロイ |
| フロントエンド | Vanilla JavaScript | シンプル、学習コスト低 |
| ペア認証 | ペアコード方式 | 実装が簡単、確実 |
| 自動配信 | Cloud Functions | サーバーレス、スケジュール実行 |

### 開発方針
| 項目 | 決定内容 |
|------|---------|
| 開発スタイル | MVP → 段階的リリース |
| ゲームフロー | 週次スケジュール（月曜お題公開） |
| スコアリング | 最初は正解数のみ、後で順位考慮追加 |
| お題管理 | ハードコード → JSON → DB |
| リリース目標 | 2026年3月中旬〜4月上旬 |

### UX方針
| 項目 | 決定内容 |
|------|---------|
| 通知 | LINE通知（Cloud Functions） |
| 入力 | LIFFアプリ（Webフォーム） |
| 結果表示 | LIFF + LINE通知（概要） |
| カラー | ピンク基調（#FF6B9D） |

---

## 📝 このドキュメントの更新ルール

### いつ更新するか
- ✅ 新機能を実装した時
- ✅ 重要な決定をした時
- ✅ 壁打ち・相談をした時
- ✅ バグを修正した時
- ✅ 次回アクションが変わった時

### 更新する場所
1. **完了事項**: `## ✅ 完了事項（実績）`
   - 日付ごとに箇条書きで追加
   
2. **次回アクション**: `## 🎯 次回アクション（優先順位順）`
   - 完了したら ✅ に変更
   - 新しいアクションを追加
   
3. **重要な決定事項**: `## 📝 重要な決定事項`
   - 技術選定、方針決定などを記録
   
4. **既知の課題**: `## ⚠️ 既知の課題と制約`
   - 新しい課題が見つかったら追加

5. **最終更新日**: 一番上の日時を更新

### 更新しない場所
- プロジェクト概要（変わらない）
- 技術スタック（大きな変更のみ）
- データ設計（確定するまで）

---

## 🤖 AI引き継ぎ用プロンプト

次回開発セッションでは、以下のように伝えてください：

```
【引き継ぎ】ふたりのらんきんぐ LIFFアプリ開発の続きです

@PROJECT_MASTER.md を読み込んで、現在の状況を把握してください。

## 今回やりたいこと
[ここに具体的な作業内容を記入]

例：
- 「下書き保存機能を実装したい」
- 「Firebase導入を始めたい」
- 「ペアコード機能を作りたい」
- 「コードをリファクタリングしたい」
- 「壁打ちをしたい（テーマ：〇〇）」

## 質問・相談
[あれば記入]

---
非エンジニアなので、丁寧に説明してください。
作業完了後、PROJECT_MASTER.md を更新してください。
```

---

## 🚀 次回セッション用プロンプト（コピー用）

**次回開始時に以下をコピー&ペーストしてください：**

```
【引き継ぎ】ふたりのらんきんぐ LIFFアプリ開発の続きです

@PROJECT_MASTER.md を読み込んで、現在の状況を把握してください。

## 今回やりたいこと
1. GitHubでのファイル移動を完了させたい
   - docs/ フォルダ作成
   - 既存ドキュメントを移動
   - 新しいREADME.mdとPROJECT_MASTER.mdをアップロード

2. その後、次のステップについて相談したい
   - 下書き保存機能の実装
   - または、実際に使ってみたフィードバックの共有
   - または、Firebase学習の開始

## 質問・相談
特になし（進めながら相談します）

---
非エンジニアなので、丁寧に説明してください。
作業完了後、PROJECT_MASTER.md を更新してください。
```

**📝 メモ：**
上記のプロンプトは、現在の次回アクションに基づいています。
状況が変わったら、この部分を更新してください。

---

## 📚 参考リンク

### 公式ドキュメント
- **LIFF**: https://developers.line.biz/ja/docs/liff/
- **LINE Messaging API**: https://developers.line.biz/ja/docs/messaging-api/
- **Firebase**: https://firebase.google.com/docs
- **Firebase Realtime Database**: https://firebase.google.com/docs/database
- **Cloud Functions**: https://firebase.google.com/docs/functions

### チュートリアル
- **LIFF入門**: https://developers.line.biz/ja/docs/liff/getting-started/
- **Firebase + LIFF**: https://firebase.google.com/docs/auth/web/line-oauth
- **JavaScript基礎**: https://developer.mozilla.org/ja/docs/Web/JavaScript

### コミュニティ
- **LINE Developers Community**: https://www.line-community.me/
- **Firebase日本語コミュニティ**: https://firebase-community.jp/

---

## 📖 用語集（初心者向け）

### LIFF
LINE Front-end Framework。LINEアプリ内でWebページを表示する機能。

### LocalStorage
ブラウザの中にデータを保存する仕組み。他の人とは共有できない。

### Firebase
Googleが提供するクラウドサービス。データベース、認証、自動実行などができる。

### 非同期処理
時間がかかる処理を「後で」実行する仕組み。データ取得などで使う。

### Cloud Functions
決まった時間や条件で自動的に実行されるプログラム。

### Messaging API
LINEにメッセージを送信するためのAPI。プッシュ通知に使う。

### GitHub Pages
GitHubが提供する無料のホスティングサービス。静的サイトを公開できる。

### MVP
Minimum Viable Product。最小限の機能で動く製品。

---

## 📞 サポート情報

### 開発者
- **名前**: tomoshiya
- **GitHub**: https://github.com/tomoshiya
- **プロジェクト**: 非エンジニア、学習しながら開発中

### 開発ペース
- **週5〜10時間**
- **主に夜間・週末**

### 相談・質問
- **AI（このセッション）**: 開発全般の相談
- **LINE Developers Community**: 技術的な質問
- **Firebase公式**: Firebase関連

---

**最終更新**: 2026年1月19日  
**次回更新**: 主要な進捗があった時
