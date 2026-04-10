# Rank-Q デバッグログ

このファイルは発生したバグ・修正済み内容・未解決事項を記録します。
今後の開発で同じ轍を踏まないための参照用ドキュメントです。

---

## 凡例
- `[BUG]` 不具合
- `[UX]` UI/UX改善要求
- `[FIXED]` 修正済み
- `[PENDING]` 未対応
- `[WONTFIX]` 対応しない

---

## v0.1（α版）以前の既知問題

### [FIXED] 2回目のゲームでボタンがグレーアウト
- **現象**: ゲーム終了後「もう一回」するとランク入力ボタンが「送信中...」のままグレーアウト
- **原因**: `onlineHandleSubmitRanking()` が `btn.textContent = '送信中...'` に変えた後、次ゲームで `renderRankInputList()` がテキストをリセットしていなかった
- **修正**: `renderRankInputList()` 内でボタンテキストを常に `'あなたのTOP5を確定する'` にリセット
- **関連ファイル**: `js/game-pair.js`

### [FIXED] 修正ボタンを押してもゲームが進行してしまう
- **現象**: ランク送信後「修正する」を押しても入力が空欄・ボタンがグレーアウト。かつFirebase上は送信済みなのでもう一人が完了するとランク予想に進んでしまう
- **原因**: `editMyRanking()` が単にUIを切り替えるだけでFirebaseのデータを撤回していなかった
- **修正**: `editMyRanking()` でFirebaseの `rankings/${userId}` を `null` に更新し、`players/${userId}/status` を `'waiting'` に戻す。その後送信済みデータをプリフィル
- **関連ファイル**: `js/game-pair.js`

### [UX] スワイプ可能になったことが視覚的にわからない
- **現象**: ドラッグハンドルで並び替えができることがわかりにくい
- **修正方針**: SortableJSの `sortable-chosen` クラスにCSSで視覚フィードバックを追加
- **α版参照**: α版の挙動が比較的スムーズだったため参照すること

---

## β版（beta branch）バグ・修正ログ

### 2026-03-17

#### [FIXED] 部屋コード桁数の混乱
- **経緯**: α版は4桁 → βで4桁のまま → 前回フィードバックで「5桁に直して」→ 今回「4桁に戻して」
- **決定**: **4桁で統一**（コード生成・バリデーション・HTML表示すべて4桁）
- **教訓**: 仕様変更はバグログに記録し、変更理由も残すこと

#### [FIXED] テーマカード左端がスクリーンにくっつく
- **現象**: 横スクロールのテーマカードが画面左端にくっついて表示される
- **原因**: `theme-cards-scroll` の `padding-left` が不足
- **修正**: `padding: 10px 20px 6px` → 左右ともに20px確保

#### [BUG][PENDING] 進捗ピル（0/2人が入力完了）のドロップダウンがヒーロー下に被る
- **現象**: タップするとドロップダウンが `overflow:hidden` のヒーロー内でクリップされる
- **原因**: `.hero` に `overflow:hidden` が設定されており、`position:absolute` の子要素が外にはみ出せない
- **暫定対応**: フィックスド位置のオーバーレイモーダルに変更
- **関連ファイル**: `css/beta.css`, `index.html`, `js/game-pair.js`

#### [FIXED] エンターキーで入力が送信されてしまう / 改行が入る
- **現象**: ランク入力欄でEnterキーを押すと改行または送信が発生する
- **修正**: `onkeydown` で Enter を捕捉し、次の入力欄にフォーカス移動する動作に変更

#### [FIXED] 送信後のランクが非表示になる
- **現象**: 「あなたのTOP5を確定する」を押すと送信完了バナーのみ表示され、自分が入力したランキングが消える
- **修正**: 送信後に `submittedRankingPreview` にランキングを表示するよう変更

#### [FIXED] 確認ポップアップでTOP5の内容が見えない
- **現象**: `confirm()` ダイアログにはTOP5の内容が表示されない
- **修正**: カスタムモーダルを実装してTOP5内容を一覧表示した上で確認させる

#### [FIXED] 結果画面のデザインがワイヤーフレームと大きく異なる
- **現象**: ヒーローエリアのランキング表示・個人詳細の構造がワイヤーフレームv5と乖離
- **修正**: ワイヤーフレームv5をベースに、ヒーロー（テーマカード+メタ情報+ランキング）と個人詳細（タブ+詳細パネル）を再設計

#### [UX] 予想画面の「予想を送信する」ボタンが固定表示で誤タップの原因
- **修正**: `position:fixed` の `bottom-bar` から外し、コンテンツの最下部に配置

#### [UX] 個人詳細タブが埋もれて見えにくい
- **修正**: タブのコントラストとパディングを改善

---

## β版デバッグ第3回（2026-03-18）

### 部屋番号

#### [FIXED] ふたり=4桁・みんな=5桁に分ける
- **経緯**: 前回まで「4桁統一」だったが、ユーザーフィードバックでモード別に分けることが決定
- **決定**: ふたりであそぶ=4桁 / みんなであそぶ=5桁
- **修正**: `generateRoomCode()` で `room.mode` を見て桁数を切替。`startPairMode()` / `startMultiMode()` でHTML側の `maxlength` ・`placeholder` ・ラベルを動的に更新
- **関連ファイル**: `js/game-pair.js`, `index.html`
- **教訓**: 決定事項テーブルの「4桁統一」を更新すること

### テーマカード

#### [FIXED] パックラベルの向きが逆（α版既出）
- **現象**: 「BASIC」の文字が左から読める向き（左に傾けて読む）になっていた
- **修正**: `.theme-card__pack` に `transform: rotate(180deg)` を追加 → 右から読める向きに修正
- **関連ファイル**: `css/beta.css`
- **注意**: ランク入力・ランク予想・結果発表画面すべてに共通するテーマカードで反映される

#### [FIXED] テーマカードの文字がストライプ（着色部分）に接触する
- **現象**: 白エリア左端の斜めラインとテーマ文字が接触して見づらい
- **修正**: `.theme-card__white` の `padding-left: 52px → 68px` に増加
- **関連ファイル**: `css/beta.css`

### ランク入力画面

#### [FIXED] ドラッグ後にバッジサイズが元に戻る（α版既出）
- **現象**: ランクを入れ替えると `1st` `2nd`... バッジが大きい数字（17px）から通常サイズに戻ってしまう
- **原因**: `updateInputBadges()` が `el.textContent = badges[i]` でHTMLを上書きし、サイズスタイル付きの `<span>` 構造が消えていた
- **修正**: `updateInputBadges()` を `innerHTML` で更新するよう変更し、`renderRankInputList()` と同じ構造を維持
- **関連ファイル**: `js/game-pair.js`

#### [FIXED] Enterキーがドラッグ後の順序ではなく元の順序で移動する（α版既出）
- **現象**: 1位〜5位のランクをドラッグで並べ替え後、Enterキーを押すと元のID順（`rankInput_1 → rankInput_2...`）で移動してしまう
- **修正**: `onRankKeydown()` を `e.target` から `querySelectorAll('.rank-input')` のDOM順で次のフィールドを検索する方式に変更
- **関連ファイル**: `js/game-pair.js`

#### [FIXED] HTML構造変更（badge-area, 0/50位置, SVGドラッグハンドル）
- **変更内容**:
  - バッジと文字数（0/50）を `.rank-badge-area` でまとめて左カラムに配置（0/50 はバッジ真下）
  - ドラッグハンドルを `⋮⋮` テキストから6点グリッドのSVGに変更（視認性・タップ性向上）
  - `.rank-item { align-items: flex-start }` のまま `.rank-badge-area { padding-top: 2px; gap: 3px; }` で整列
- **関連ファイル**: `js/game-pair.js`, `css/beta.css`

### 2回目ゲームのバグ（重要）

#### [FIXED] 2回目のゲームで前ゲームの入力が二重表示される
- **現象**: 「テーマを変えてもう一度あそぶ」を押して2回目に進むと、前ゲームで確定した内容（`submittedRankingPreview`）が残ったまま新しい入力フォームが追加され、二重表示になる
- **原因**: `renderRankingInputScreen()` が `submittedRankingPreview` をクリアしていなかった
- **修正**: `renderRankingInputScreen()` の先頭で `submittedRankingPreview` の `innerHTML` と `display` を必ずリセット
- **関連ファイル**: `js/game-pair.js`

#### [FIXED] 2回目のゲームで予想画面がリセットされない
- **現象**: 2回目の予想画面で「予想を確定しました！」バナーが残ったまま、予想エリアが消えた状態で表示される
- **修正**: `renderGuessScreen()` の先頭でバナー・ロックプレビュー・ボタンを必ずリセット
- **関連ファイル**: `js/game-pair.js`

### ランク予想画面

#### [FIXED] 各種文言を「送信」→「確定」に変更
- `予想を送信する` → `予想を確定する`
- `予想を送信しました！結果発表を待っています` → `予想を確定しました！全員の予想完了を待っています`
- `0/2人が送信完了` → `0/2人が予想完了`
- 確認モーダル: 「この予想で送信しますか？」→「この予想で確定しますか？」、「確定して送信する」→「確定する」

#### [FIXED] 確認モーダルのセクション名を「〇〇さんのランク予想」に変更
- **修正**: `showGuessConfirmModal()` 内の見出しを `「${名前}さんのランク予想」` に変更

#### [FIXED] 予想確定後に予想内容がロック表示される
- **現象**: 確定後は予想エリアが非表示になり何が確定したか確認できなかった
- **修正**: `doSubmitGuess()` 内で `guessLockedPreview` にread-onlyの予想内容を表示
- **関連ファイル**: `js/game-pair.js`, `index.html`

### スコアラベル

#### [FIXED] スコアラベル・アイコンを確定仕様に更新
- **変更内容** (`getScoreLabel()` 関数):

| 距離 | ラベル | 得点 | マーク |
|---|---|---|---|
| ±0 | あたり | 10pt | ◎ |
| ±1 | おしい | 6pt | ○ |
| ±2 | ちかい | 3pt | △ |
| ±3 | かすり | 1pt | ▽（提案: 中空下三角） |
| ±4 | はずれ | 0pt | × |

- **関連ファイル**: `js/ui.js`

### 結果発表

#### [FIXED] スコア凡例が表示されない
- **修正**: コンテンツエリア上部に「◎ あたり 10pt / ○ おしい 6pt ...」の凡例を追加

#### [FIXED] 「テーマを変えてもう一度あそぶ」に確認ダイアログがない
- **修正**: `onclick` に `confirm()` を追加（HOME同様の確認フロー）

---

## β版テスト（2026-03-17〜）で発見されたフィードバック

### 全体

#### [FIXED] ボタンの色が紺色になっている箇所がある
- **現象**: 「みんなであそぶ」「部屋をつくる」などのボタンが紺色（`mode-card--primary`）になっていた
- **修正**: `mode-card--primary` クラスの背景色スタイルを削除し、全モードカードを白ベースに統一

#### [PENDING] ?ボタンの配置がページによって異なる
- **現象**: ヒーロー画面がないページでは?ボタンの位置が一定でない
- **修正方針**: ヒーロー画面がないページには上部に紺色のバー領域を作り、右下に?を配置する

#### [PENDING] モードカードの>マークが左寄り
- **現象**: 「モード選択」「部屋を選ぶ」などのボタン内にある丸+>のアイコンが左寄りになっている
- **修正方針**: `margin-left: auto` で右寄せ（`.mode-arrow` スタイルで対応予定）

---

### TOP画面

#### [FIXED] ?と鉛筆マークが重なっている
- **現象**: ヒーローエリア右下の?ボタンとニックネーム横の鉛筆マークが重なっていた
- **修正**: ?ボタンを `position:absolute; bottom:16px; right:16px` で右下固定、ニックネームは右上に移動

#### [FIXED] ニックネームと鉛筆マークが別々に表示されていた
- **修正**: `profile-name-btn` としてニックネームとSVGアイコンをセットで右上に配置

#### [FIXED] 絵文字の鉛筆マークがダサい
- **修正**: 絵文字をやめてフラットなSVGアイコンに変更

#### [FIXED] 「Rank-Q」のハイフンがQと近く長すぎる
- **修正**: ハイフン部分を `<span style="font-size:0.7em;letter-spacing:-0.05em;opacity:0.7;">` で小さめ・薄めに調整

#### [FIXED] キャッチコピーが短い
- **修正**: 「話題が広がる、仲が深まる<br>ランクを読み合うコミュニケーションゲーム」に変更

#### [FIXED] 「みんなであそぶ」が紺色
- **修正**: `mode-card--primary` クラス削除で白ベースに統一

#### [FIXED] 「みんなであそぶ」のアイコンが複数人に見えない
- **修正**: 複数の人型を表現したSVGアイコンに差し替え

---

### 初回ユーザー体験

#### [PENDING] β版初回アクセスでニックネームが既に入力されている
- **現象**: β版に初めてアクセスしたとき、LINEプロフィールまたは過去のLocalStorageから名前が自動入力される
- **原因**: `firebase.js` の `initUserProfile()` がLINEプロフィール（`liff.getProfile()`）から表示名を取得し、自動的に `displayName` として保存している
- **修正方針**: 初回アクセス時（LocalStorageに `displayName` がない場合）は名前入力モーダルを必ず表示する導線にする
- **関連ファイル**: `js/firebase.js`, `js/app.js`

---

### 遊び方説明（ヘルプシート）

#### [PENDING] ?を押しても下スワイプで閉じられない
- **現象**: ヘルプシートは下からスライドするUIだが、スワイプで閉じる動作が実装されていない
- **修正方針**: スワイプ検知を実装するか、×ボタンで閉じる方式に変更

#### [PENDING] 遊び方説明が1枚のみで情報不足
- **現状**: ヘルプシートは1枚の静的コンテンツ
- **検討案**: 横スワイプで手順を画像つきで説明するカルーセル形式。ただし下スワイプ（閉じる）と横スワイプ（ページめくり）の混在は誤操作の原因になるため、閉じるには×ボタンを使う形式が安全
- **ステータス**: デザイン・実装方針を別途検討

---

### ゲームページ共通

#### [PENDING] ゲームからの途中退出手段がない
- **現象**: ゲーム中にHOMEへ戻る手段がない。ふたりモードでは一方が退出しても部屋が残る
- **修正方針**:
  - ふたりモード: どちらかが退出したら部屋を閉じる（Firebase `onDisconnect` を活用）
  - みんなモード: プレイヤーが2名以下になったら部屋を自動クローズ
  - 全モード: ゲーム中にも「退出」ボタンを設置

#### [FIXED] フェーズ表示のラベル
- **修正**: ステップインジケーターのラベルを「テーマ選択→ランク入力→ランク予想→結果発表」に変更

#### [PENDING] gameRoomsが増え続ける（自動削除なし）
- **現象**: ゲーム途中でブラウザを閉じると部屋データがFirebaseに残り続ける
- **原因**: Firebase無料プランではCloud Functionsが使えないため、タイムアウト自動削除が困難
- **暫定案**: `lastActivityAt` が30分以上前の部屋をアプリ起動時にクライアント側でクリーンアップする処理を追加（ただしアクティブでないと発動しない）
- **根本解決**: Firebase Blaze（有料）プランでCloud Functionsを使う

#### [FIXED] 文字の長押しで文字選択が発生する
- **現象**: テーマカード、ランクバッジ、ドラッグハンドルなど各所でテキスト選択が起きる
- **修正**: CSS `user-select: none` を全要素に適用。`input` / `textarea` のみ `user-select: text` で除外

#### [FIXED] 1st/2nd... バッジの視認性が低い
- **修正**: フォントサイズ増加（数字部分17px）・文字色を `var(--text-secondary)` に変更

---

### テーマ選択画面

#### [FIXED] テーマ選択UIが設計されていなかった
- **修正**: ワイヤーフレーム `wireframe_テーマ選択_v4.html` に基づき全面再設計
  - モード切替トグル（パックから選ぶ / 自分で作る）
  - 横スクロールのパックタブ
  - 横スクロール＋スナップのテーマカード
  - スクロールインジケーター
  - テーマ情報パネル
  - カスタムテーマ入力（文字数バー付き）

#### [PENDING] パックの説明文・テーマタグ・ヒントが表示されない
- **現象**: 選択中パックの説明文、テーマのタグ、ヒントテキストが非表示
- **原因**: Firebaseのテーマデータに該当フィールド（`description`, `tags`, `hint`）が未登録、かつUIも未実装
- **修正方針**: Firebase側データ整備とUI実装をセットで次フェーズで対応

---

### ランク入力画面

#### [FIXED] 進捗ピル（0/2人が入力完了）がボタンとして機能しない
- **修正**: `onclick="toggleProgressDropdown()"` を追加し、タップで入力状況ドロップダウンを表示

#### [FIXED] 文字数が分からない
- **修正**: 常時 `0/50` 形式で表示、40文字以上で警告色、50文字でエラー色

#### [PENDING] 三点リーダー（ドラッグハンドル）の縦位置が中央でない
- **現象**: テキストが複数行になると三点リーダーが上寄りになる
- **修正方針**: `align-self: center` を `.rank-drag-handle` に適用済みだが、複数行時の挙動を再確認

#### [PENDING] ヒーローエリアが広くてランク入力がしにくい
- **現象**: テーマカードが大きいため入力フォームが画面下に押しやられる
- **検討案**: スクロール連動でヒーローが縮小する、またはテーマテキストのみ表示してカードを折りたたむ

#### [FIXED] 「TOP5を送信する」のテキスト
- **修正**: 「あなたのTOP5を確定する」に変更

#### [FIXED] 送信後に修正ボタンを押すと入力欄が空欄・ボタングレーアウト
- **修正**: `editMyRanking()` でFirebaseから送信を撤回し、送信済みデータをプリフィルした状態で入力フォームを再表示

#### [FIXED] 送信後にランクが非表示になる
- **修正**: 送信後に `submittedRankingPreview` でランキングを継続表示

#### [FIXED] 入力欄で改行が発生する
- **修正**: Enterキーで次の入力欄にフォーカス移動するよう変更（改行は発生しない）

---

### みんなであそぶ

#### [PENDING] ダミーユーザー追加機能がない
- **要望**: テストのためにダミーユーザーを追加するボタンが欲しい
- **実装方針**: 開発モード判定（`location.hostname` が `localhost` または `netlify.app` の場合）でのみ表示

#### [FIXED] 入室番号の桁数（みんなであそぶ）
- **経緯**: α版4桁 → 一時5桁に変更 → 4桁に戻す → 2026-03-18でモード別（ふたり=4桁/みんな=5桁）に決定
- **現在の正式仕様**: ふたりであそぶ=4桁 / みんなであそぶ=5桁

---

## β版デバッグ第4回（2026-03-18）

### [FIXED] .bottom-bar position:fixed による白バー漏洩
- **現象**: ランク予想画面などで、他の画面のfixed bottom-barが重なって「予想を確定する」ボタンが隠れる
- **原因**: `.bottom-bar { position: fixed }` はdisplay:noneの親内でも他画面のz-index上に表示される（環境によって異なるブラウザ挙動）
- **修正**: `position: fixed` → `position: sticky; z-index: 20` に変更。コンテナを超えて漏洩しなくなる
- **関連ファイル**: `css/beta.css`

### [FIXED] submitRanking()がID順でモーダル表示（ドラッグ後に並び順が変わらないバグ）
- **現象**: ランク入力でドラッグ並び替え後に「TOP5を確定する」→確認ポップアップが前の並び順で表示される
- **原因**: `submitRanking()`が `document.getElementById('rankInput_1')` 等ID順で値を取得していた。一方`onlineHandleSubmitRanking()`はDOM順で取得しており不一致。
- **修正**: `submitRanking()` を `querySelectorAll('.rank-item')` によるDOM（視覚）順の読み取りに変更。`onRankInput()`のバリデーションも同様に修正。
- **関連ファイル**: `js/game-pair.js`
- **教訓**: IDで要素を取得する場合、SortableJSによる並び替え後はIDとDOM位置が乖離することに注意

### [FIXED] editMyGuess()で予想ロック表示と入力エリアが2重表示
- **現象**: 予想確定後「修正する」ボタンを押すと、確定済みのロック表示と入力エリアが同時に表示される
- **原因**: `editMyGuess()`が`guessLockedPreview`を非表示にする処理がなく、`guessPersonArea`のみ再表示していた。また`guessDraft`が残っているため古い並び順が表示される
- **修正**: `editMyGuess()`でlockedPreviewを空にして非表示にし、`guessDraft={}`でリセット後に`renderGuessSortList()`を呼び再シャッフル
- **関連ファイル**: `js/game-pair.js`

### [FIXED] 予想進捗ピルのドロップダウンが表示されない
- **現象**: ランク予想画面の「0/2人が予想完了▼」をタップしても何も表示されない
- **原因**: `#guessProgressDropdown`要素がHTMLになく、`toggleGuessProgressDropdown()`関数も未実装だった
- **修正**: index.htmlに`#guessProgressDropdown`追加、`toggleGuessProgressDropdown()`関数実装、`updateGuessProgress()`にドロップダウン内容更新処理追加
- **関連ファイル**: `js/game-pair.js`, `index.html`

### [FIXED] ランク予想の並び替えバッジが小さい・SVGハンドルがない
- **修正**: `renderGuessSortList()`のHTMLをランク入力画面と同一構造（`rank-badge-area` + 17px数字 + SVGハンドル）に統一
- **関連ファイル**: `js/game-pair.js`

### [FIXED] ランク入力カードの縦配置（1行入力時に上寄り）
- **修正**: `.rank-item { align-items: center }` に変更。`.rank-badge-area { justify-content: center }` を追加
- **関連ファイル**: `css/beta.css`

### [FIXED] 修正ボタンが2行になる
- **修正**: `.submitted-banner__edit { white-space: nowrap; flex-shrink: 0; margin-left: 8px }` を追加
- **関連ファイル**: `css/beta.css`

### [FIXED] テーマカード左端にくっつく（長年の懸案）
- **原因**: flexbox横スクロール内の `padding-left` はWebKit系ブラウザでスクロール時に無視されることがある
- **修正**: `padding: 10px 0 6px` に変更し、`::before`/`::after` の疑似要素（width:20px）でスペーサーを追加
- **関連ファイル**: `css/beta.css`

### [FIXED] 各種文言修正
- 確認モーダル説明：「送信後も」→「確定後も」
- 入力バナー：「送信完了！」→「入力完了！」
- 予想バナー：「予想を確定しました！全員の予想完了を待っています」→「予想完了！他の人を待っています」
- テーマ選択タイトル：「テーマを選ぼう」→「テーマ選択」
- モード切替ボタン：「自分で作る」→「自分でつくる」
- 予想進捗ピルデフォルト：「人が送信完了」→「人が予想完了」
- 各ヒーローにページタイトル追加（ランク入力/ランク予想/結果発表）

### [FIXED] 結果発表 全体スクロール化・ヒーロー改修
- **修正**: `#resultScreen { display:block; overflow-y:auto }` で全体スクロール化。ヒーロー内のテーマカードを200×114px中央配置に変更。参加人数・最大PTを削除。
- **関連ファイル**: `js/game-pair.js`, `css/beta.css`

### [FIXED] 結果発表 総合ランキング改修
- 背景削除（`background:rgba(255,255,255,...)` を除去）
- 名前下に内訳テキスト（あたり×N おしい×N...）追加
- アニメーション：下位（最終順位）から上位（1位）の順に順次表示されるよう`delay`を逆順化
- 同立順位対応：同じスコアは`同N位`相当の順位を付与
- スコア表記：`25/50pt`形式に変更
- **関連ファイル**: `js/game-pair.js`

### [FIXED] 結果発表 スコア説明1行・個人詳細フォーマット変更
- スコア説明：「あたり(±0):10pt おしい(±1):6pt ちかい(±2):3pt かすり(±3):1pt はずれ(±4):0pt」の1行表示
- 「個人詳細」ラベルを大きく（16px/bold）に変更
- 「〇〇さんの正解ランキング」→「〇〇さんの正解ランク＆予想」（小さく・薄く）
- 予想結果の表示順：「名前→何位と予想→結果ラベル（icon付き色付き）→得点」に変更
- **関連ファイル**: `js/game-pair.js`

### [FIXED] テーマカードサイズをCSS変数で統一（200×114px）
- `.theme-card { width:200px; height:114px; max-width:none; aspect-ratio:unset }` を追加
- **関連ファイル**: `css/beta.css`

---

### 2026-03-18（リファクタリング・デバッグ第6回・みんなであそぶ着手）

#### [FIXED] CSSクラス統一化（ヒーロー内共通要素）
- **内容**: ヒーロー内タイトル・説明文・もどるボタンのインラインスタイルがHTML/JS全体に重複していた
- **修正**: `.hero-title`、`.hero-desc`、`.hero-back-btn` の3クラスを新設。`index.html`・`js/game-pair.js` のインラインスタイルを全て置換
- **関連ファイル**: `css/beta.css`, `index.html`, `js/game-pair.js`

#### [FIXED] テーマカード内部クラスを1系統に統一
- **現象**: テーマ選択スクロール（`.theme-card-white` 系）とヒーロー（`.theme-card__white` 系）で2種類のクラス実装が存在し、clip-pathの角度・packラベルサイズ・テキスト配置が微妙に異なっていた
- **修正**: `renderThemeCards()` の内部HTMLを `__` 系クラスに統一。旧`.theme-card-white`/`.theme-card-text`/`.theme-card-pack-label` クラスを削除
- **追加**: CSS変数 `--card-text-size: 12px`、`--card-pack-size: 7px` を追加し、フォントサイズも一元管理
- **効果**: テーマ選択・ランク入力・ランク予想・結果発表の全4画面でカードが完全に同一の見た目になった
- **関連ファイル**: `css/beta.css`, `js/game-pair.js`

#### [FIXED] デバッグ第6回 - 各種UI修正
| 項目 | 内容 |
|---|---|
| iPhone白い固定表示 | `viewport-fit=cover` を追加、`.bottom-bar` の `padding-bottom` を `max(16px, env(safe-area-inset-bottom))` に変更 |
| ランク入力 説明文 | 「テーマをもとに自分のランクを完成させてください」→「テーマをもとに自分のTOP5を完成させてください」 |
| ランク予想 説明文 | 「バラバラな順番の他の参加者のランクを正しく並び替えてください」→「参加者のランダムなTOP5を予想して並べ替えてください」（1行に収まる長さに変更） |
| 「My rank is...」 | ランク入力リスト先頭に薄いキャプションを表示（入力完了後の待機画面には非表示） |
| 「Your rank is...」 | ランク予想リスト先頭に薄いキャプションを表示（予想完了後の待機画面には非表示） |
| ドラッグハンドル | `padding` を `10px 6px 10px 14px` に拡大、SVGを 12×18→14×20 に拡大。左側ヒットエリアを広く確保 |
| テーマカード影 | ヒーロー内の `.theme-card` に `box-shadow: 0 8px 28px rgba(0,0,0,0.45)` を追加して立体感を演出 |
| 個人詳細タイトル | 「〇〇さんの正解ランク＆予想」→「〇〇さんの正しいランク＆参加者の予想」 |
| 予想者名の配置 | `flex:1` を削除し `justify-content:flex-end` で全要素右寄せに統一。名前色を `text-primary` に変更 |
| スコアラベル色変更 | あたり:#EF4444（赤）/ おしい:#F87171（薄赤）/ ちかい:#9CA3AF（グレー）/ かすり:#60A5FA（薄青）/ はずれ:#1D4ED8（濃青） |
- **関連ファイル**: `css/beta.css`, `index.html`, `js/game-pair.js`, `js/ui.js`

#### [FIXED] ダミープレイヤー追加機能（P-04 解決）
- **内容**: 「みんなであそぶ」の待機室ホスト画面に「＋ ダミー追加」ボタンを追加
- **表示条件**: `gameMode === 'multi'` かつ最大人数未満のときのみ表示
- **動作**: ダミープレイヤー（テスト太郎〜テスト春子）がFirebaseに参加登録 → `inputting` 状態になると自動でランク送信（1.5〜3.5秒後） → `guessing` 状態になると自動で予想送信
- **Sortable対策**: `draggable: '.rank-item'` を追加し、`.rank-caption` がドラッグ対象にならないよう修正
- **関連ファイル**: `js/game-pair.js`, `index.html`

#### [FIXED] 「予想を確定する」ボタンのグレーアウト条件を修正
- **背景**: もともとボタンが即時有効化されていた。Firebaseの全員提出完了を条件にする実装を一度行ったが、設計の意図が違っていた
- **正しい設計**: 「ユーザーが全員分のタブを1回ずつ開いた」ことをトリガーにする（UI操作ベース）
  - ふたりであそぶ：最初のタブが自動で開くため → 即解除
  - みんなであそぶ（3人以上）：全員のタブを手動で開くまでグレーアウト
- **仕組み**: `visitedGuessTabs`（Set）でタブ訪問状況を追跡。`onlineSwitchGuessTab()` 実行のたびに記録し、`visitedGuessTabs.size === targets.length` で解除
- **関連ファイル**: `js/game-pair.js`

---

### 2026-03-19（スワイプバグ根本解決・CSS統一化続き・みんなであそぶ制限）

#### [FIXED] SortableJS：タブ切替後スワイプ不能（モバイル実機）
- **現象**: ランク予想でタブを切り替えると2人目以降のスワイプが一切効かなくなる。PC(マウス)では発生しない
- **根本原因**: `guessSortables[targetId]` という「タブIDでインスタンスをキャッシュする」設計が誤り。タブを切り替えるたびに**同じDOMノード（`#guessSortList`）に新インスタンスが追加され続け**、タブ1・タブ2・タブ3のインスタンスが全て同一要素に重複する。PCのマウスイベントは偶然耐えるがモバイルのタッチイベントは競合してフリーズする
- **修正**: `renderGuessSortList()` の冒頭で `Object.values(guessSortables).forEach(s => s.destroy())` → `guessSortables = {}` で全インスタンス一括破棄してから新インスタンスを1つだけ生成する
- **原則**: 「1つのDOM要素にSortableインスタンスは常に1つ」を守ること（→ 設計上の決定事項に記載）
- **関連ファイル**: `js/game-pair.js`

#### [FIXED] SortableJS：`My rank is...` / `Your rank is...` がスワイプ対象になる
- **現象**: ランク入力・ランク予想画面のキャプション文言がドラッグで動かせてしまう
- **根本原因**: `.rank-caption` を SortableJS コンテナ（`#rankInputList` / `#guessSortList`）の `innerHTML` 内に生成していたため、SortableJSの管理対象に含まれていた。`draggable:'.rank-item'` でフィルタしていたが、削除後に顕在化
- **修正**: `index.html` にキャプションを静的要素として**コンテナの外（直前）**に配置し直す。JSのテンプレートからは削除
- **原則**: 「SortableJSコンテナ内には並び替え対象の要素のみ入れる。見出し・キャプション等は外側に置く」
- **関連ファイル**: `index.html`, `js/game-pair.js`

#### [FIXED] `My rank is...` / `Your rank is...` が大文字で表示される
- **現象**: `MY RANK IS...` と全大文字になっていた
- **原因**: `.rank-caption` に `text-transform: uppercase` を設定していた
- **修正**: `text-transform` を削除し、英文法に沿った大文字小文字をそのまま表示
- **関連ファイル**: `css/beta.css`

#### [FIXED] テキスト折り返し：ローマ字の長い文字列が1行になる問題（残存箇所）
- **現象**: 以下3箇所でローマ字等の長い文字列がはみ出して折り返されなかった
  1. ランク入力後の待機画面（`submittedRankingPreview`）
  2. ランク予想の確定ポップアップ（`showGuessConfirmModal`）
  3. ランク予想後のロック表示（`guessLockedPreview`）
- **原因**: インラインスタイルで `word-break` が指定されておらず、画面によって適用の有無がバラバラ
- **修正**: CSS クラス `.rank-text`（`word-break:break-all; overflow-wrap:break-word; flex:1; min-width:0`）と `.rank-row` / `.rank-row--card` を新設し、上記3箇所のインラインスタイルを全て置き換え
- **原則**: ランクアイテムの表示テキストは必ず `.rank-text` クラスを使う。インライン直書き禁止
- **関連ファイル**: `css/beta.css`, `js/game-pair.js`

#### [FIXED] みんなであそぶ：2人でもゲーム開始できてしまう
- **修正**: 待機室「ゲームを始める」ボタンの有効化条件を `players.length >= 2` → `players.length >= 3` に変更
- **関連ファイル**: `js/game-pair.js`

---

### 2026-03-20（みんなモード結果発表リデザイン・ゲストテーマ閲覧）

#### [NEW] テーマ選択：ゲストに読み取り専用テーマ閲覧画面を表示（P-07 完了）
- **背景**: `setting` 状態でゲストに `themeWaitingScreen`（Tips説明のみ）が表示されていたが、ゲストもテーマを事前に確認できる体験を実現したい
- **実装**: `showGuestThemeBrowse()` 関数を新設。`isGuestReadOnlyTheme` フラグで動作を分岐
  - ホストと同じ `renderThemeCards()` / `renderPackTabs()` を再利用（コード重複なし）
  - 「このテーマでスタート」ボタン・「自分でつくる」タブを非表示
  - `selectTheme()` にフラグガードを追加してカードタップでも選択不可に
  - ヒーローに「ホストと同じテーマ一覧を表示中です。テーマ選びの参考にしてください。」バナーを表示
- **関連ファイル**: `index.html`, `js/game-pair.js`

#### [NEW] みんなであそぶ：結果発表のリデザイン（4タブ切替ランキング＋理解度ランキング）
- **背景**: 「ふたりであそぶ」と「みんなであそぶ」は同じ `renderOnlineResultScreen()` を使っていたが、みんなモードでは「当てた/当てられた」の二軸評価が重要なため専用画面を実装
- **スコア分離設計** (`calcMultiScores()`):
  - **ヨミpt**: 他の参加者のランクを当てたpt（最大 `(n-1)×50pt`）
  - **ミエpt**: 自分のランクが当てられたpt（最大 `(n-1)×50pt`）
  - **総合pt**: ヨミ＋ミエ（最大 `(n-1)×100pt`）
  - **ヨミミエgap**: `|ヨミpt - ミエpt|`（偏りの大きさ）
- **UI**:
  - 4タブ切替（総合 / ヨミpt / ミエpt / ヨミミエgap）
  - 各タブの下に説明文を表示（何のランキングか一目でわかる）
  - gapタブは1位/2位/3位バッジなし、偏り大/中/小ラベルで偏りを可視化
  - 総合タブでは名前下にヨミpt・ミエptの内訳を表示
  - 下位→上位の順に現れるアニメーション付き（既存と統一）
- **個人詳細の強化** (`showMultiPersonResult()` + `calcUnderstandingRanking()`):
  - 人物ボタンと1stカードの間に「〇〇さんの理解度ランキング」を追加
  - 理解度 = そのターゲットの1〜5位を予想して獲得した合計pt（参加者間でソート）
  - 1st〜5thカードの参加者表示順を理解度ランキング順にソート
- **関連ファイル**: `css/beta.css`, `js/game-pair.js`

---

## 2026-03-24（続き）

### [NEW] テーマカードUIの改善

- **テキスト左寄せ修正**: `.theme-card__white` の `justify-content: center` → `flex-start` に変更。カードごとにテキスト左端がバラついていた問題を解消
- **clip-path調整**: 斜め部分の頂点(63px)→(55px)に縮小、padding-left 68px→55pxに変更。テキストが斜め頂点に揃うように
- **選択中テーマの改行除去**: `themeInfoText` に表示する際 `theme.text.replace(/\n/g, '')` で改行スペースを非表示に
- **パック説明エリアとカードの余白**: `pack-desc-area` の `margin-bottom: 0 → 8px` に拡大

### [NEW] パック説明文のカード型デザイン化

- `renderPackDesc()` をカード型（パックカラー背景＋タイトル＋説明文）に刷新
- `renderPackTabs()` でアクティブタブの背景色もパックカラーをインラインで適用
- 関連クラス: `.pack-desc-area`, `.pack-desc__title`, `.pack-desc__text`

### [NEW] パックカラー更新

| パック | 変更前 | 変更後 |
|---|---|---|
| casual | #3D2010（暗い茶）| #1E2D3D（ネイビー）|
| basic | #1E2D3D（ネイビー）| #5A3015（ウォームブラウン）|
| now | #1A3B2A（暗すぎ）| #1F5C3C（明るめグリーン）|

### [NEW] ゲーム安定性改善（P-03/P-08/P-09）

**← HOMEボタンの統一配置**
- 全ゲーム画面（待機室・テーマ選択/待機・ランク入力・ランク予想・結果発表）のhero内先頭に `.hero-back-btn` で統一配置
- 部屋選択・入室画面の「← もどる」テキストも「← HOME」に統一
- 当初 `position:absolute` で実装したが他要素と重なる問題が発生 → `hero-back-btn`（通常フロー）に変更

**退出処理の一元管理 (`handleExitRequest()`)**
- 全 `← HOME` ボタンが共通の `handleExitRequest()` を呼ぶ設計
- 3パターンに集約:
  - A: ふたりモード（どちらでも）or みんなモードのホスト →「退出しますか？全員のゲームが終了します。」→ 部屋削除
  - B: みんなモードのゲスト →「退出しますか？人数が3名に満たない場合はゲームが終了します。」→ players削除→人数チェック
  - C: 結果発表（finished）→「HOMEに戻りますか？」→ ローカルクリアのみ
- カスタムボトムシート型確認モーダル（`.confirm-sheet`）を新設
- 他プレイヤーへの通知: 部屋削除検知時「ホストが抜けたため、ゲームが強制終了となりました。」/ `aborted`時「最低人数に満たないため、ゲームが強制終了となりました。」

**ログイン時の部屋復帰チェック (P-08)**
- 入室時に `localStorage.setItem('rankq_activeRoom', roomId)` を保存
- 意図的退出時は `localStorage.removeItem()` でクリア（意図しない離脱はクリアしないことで復帰可能）
- `checkSessionRestore()` を非同期実装: Firebase照合 → セキュリティチェック（部屋存在・players内・status確認）→ 30分チェック
  - 30分超: ホストなら部屋削除、ゲストなら退出処理 → 「30分以上更新がなかったため、ゲームは強制終了となりました。」トースト
  - 30分以内: 復帰モーダル表示（参加者名・フェーズ表示）→ 「ゲームに戻る」or「新しくはじめる」

**放置部屋の自動削除 (P-03)**
- `cleanupOldRooms()` をログイン時に実行（`cleanupOldRooms` と `checkSessionRestore` を `Promise.all` で並列実行）
- `lastActivityAt` が `ROOM_TIMEOUT_MS`（30分・定数化）超過の部屋を一括削除
- **副作用**: Firebase読み込み処理が増えるため起動時の初期化が若干遅くなる（想定済み）

---

## 2026-03-25

### [BUG→FIXED] 部屋が削除されないバグ（退出処理の根本的欠陥）

- **現象**: HOMEボタンから退出しても、Firebase上の部屋が残り続ける
- **原因**: `doExitHost()` / `doExitGame()` で `status: aborted/closed` を `set()` した瞬間に `startRoomListener` が発火 → `cleanupRoom()` が呼ばれ `room.roomId = null` になる → その後の `remove()` が `null` を参照して削除されない
- **修正**: `doExit()` を新設し、**先に `cleanupRoom()` + `showScreen()` を実行**してから、ローカル変数 `const roomId = room.roomId` で保存済みのIDでFirebase操作を実行する順序に変更
- **関連ファイル**: `js/game-pair.js`

### [BUG→FIXED] みんなモード4人以上でゲストが結果発表から退出するとゲームが終了してしまう

- **現象**: `handleExitRequest()` の `isFinished` チェックが `isMultiGuest` より優先されていたため、みんなモードのゲストも `doExitGame()`（全員終了）に誘導されていた
- **修正**: 退出処理を `doExitHost()` / `doExitGuest()` / `doExitGame()` の3関数から **`doExit()` 1関数に統一**。内部でホスト/ゲスト・モード・フェーズを判定して適切な処理を実行
- **関連ファイル**: `js/game-pair.js`

### [BUG→FIXED] 復帰モーダルの参加者リストが重複・順序がおかしい

- **現象**: `Object.values(data.players)` で取得した player オブジェクトには `userId` プロパティがないため、`p.userId === data.hostId` が常に `false` → 全員をゲストとして重複列挙
- **修正**: `Object.entries(data.players)` に変更し、キー（userId）とホストIDを正しく比較 → ホスト→ゲストの順に正しく表示
- **関連ファイル**: `js/game-pair.js`

### [BUG→FIXED] 復帰モーダルの確認ポップアップが背面に隠れる

- **現象**: 「復帰せずに新しくあそぶ」押下時に `showConfirmModal()` が `rejoinOverlay` の下に表示されて操作できなかった
- **修正**: `confirmCancelRejoin()` で先に `rejoinOverlay` を非表示にしてから確認ポップアップを表示。「もどる」押下時は `backToRejoinModal()` で復帰モーダルを再表示
- **関連ファイル**: `js/game-pair.js`

### [NEW] 退出処理の統一設計（`doExit()` 関数）

| 条件 | 動作 |
|---|---|
| ホスト（全モード）| pair なら `aborted` セット → 部屋削除（対向に正しいトーストを届けてから削除） |
| ゲスト + pair | players削除 → 残り1人（< 2）→ `aborted` → 部屋削除 |
| ゲスト + multi（ゲーム中）| players削除 → 残り < 3 なら `aborted` → 部屋削除 |
| ゲスト + multi（結果発表）| ローカル終了のみ（他プレイヤーの結果画面は維持） |

- **設計方針**: ゲスト + multi + 結果発表でのローカル退出は意図的。ゲームは終了済みのため他者を強制終了させることは不適切。放置部屋は30分後に `cleanupOldRooms()` で処理される

### [NEW] ポップアップ文言の整理

| 条件 | ポップアップ本文 |
|---|---|
| ホスト or pair | 「あなたが退出すると、全員のゲームが終了します。」 |
| multi + ゲスト（ゲーム中）| 「退出後の人数が3名に満たない場合、全員のゲームが終了します。」 |
| multi + ゲスト（結果発表）| 「結果画面を閉じてHOMEに戻ります。」 |

### [NEW] その他の改善（デバッグで発覚）

- **ゲスト待機室HOMEボタン左寄せ**: `text-align:center` を除去
- **ホスト待機室「部屋を閉じる」ボタン削除**: HOMEボタンで代替できるため不要と判断
- **待機室レイアウト変更**: 「部屋番号」ラベル→数字→コピーボタン（右横）→説明文（下）の構成に
- **部屋番号入力**: 半角数字以外を自動除去（`/[^0-9]/g`）
- **復帰モーダル**: タイトル・ボタン名・メタ情報（モード/役割/参加者/フェーズ）を刷新
- **復帰モーダル「OK」ボタン**: 「新しくあそぶ」→「OK」に変更
- **`checkSessionRestore()` の TERMINAL**: `finished` を除外（結果発表からも復帰可能に）
- **startRoomListener**: `finished` ケースから `localStorage.removeItem()` を除去、`closed` ケースを新設

---

## 2026-03-26

### [BUG→FIXED] トーストが表示されない・間違ったトーストが表示される

- **現象①**: 結果発表でホストが退出したとき、残ったプレイヤーが何も通知なくHOMEに飛ばされる
- **現象②**: pairモードでの退出時に「ホストが抜けたため」という誤ったトーストが出ることがある
- **原因①**: `closed` ステータスのリスナーケースにトーストの記述がなかった
- **原因②**: `aborted` → `remove()` の連続実行を「競合リスクあり」と誤判断し `remove()` を外した。これによりトーストの競合は解消したが部屋が削除されなくなった
- **修正**: `closed` ケースに `showToast('ゲームが終了しました。', 'info')` を追加。`remove()` は復活（後述の根本原因が別にあるため競合は問題なし）
- **関連ファイル**: `js/game-pair.js`

### [BUG→FIXED] 部屋がFirebaseに残り続ける（退出処理の根本原因）

- **現象**: HOMEボタンで退出してもgameRoomsノードが削除されない（multiホスト退出のみ正常）
- **根本原因**: 旧実装 `doExitHost()` では `room.roomId` を直接参照していたため、以下の競合が発生していた
  ```
  1. set('aborted') を実行
  2. → 自分自身のリスナーが即座に発火（Firebase はローカル書き込みを即反映）
  3. → cleanupRoom() が呼ばれ room.roomId = null になる
  4. → remove('gameRooms/' + null) → 削除失敗
  ```
- **修正**: `doExit()` 冒頭で `const roomId = room.roomId` としてローカル変数に退避。`cleanupRoom()` を先に呼んでも以降の Firebase 操作は `null` を参照しない
- **なぜ Firebase のイベント順序は保証されるか**: Firebase Realtime Database は WebSocket ベースで、サーバーからのイベントはキュー順に届く。`aborted`（value変更）は必ず `null`（削除）より先に届くため、相手側リスナーでは `aborted` → `cleanupRoom()` → `roomRef.off()` の順で処理され、後続の `!snap.exists()` は無視される
- **関連ファイル**: `js/game-pair.js`

### [NEW] 強制終了トーストの確定した分岐仕様

```
startRoomListener 内のトリガー
├── !snap.exists()（部屋が削除された）
│   └── 「ホストが抜けたため、ゲームが強制終了となりました。」
│       → multiホストが退出した場合のみここに到達（他ケースは aborted が先に届く）
│
├── status === 'aborted'（人数不足）
│   └── 「最低人数に満たないため、ゲームが強制終了となりました。」
│       → pairホスト退出 / pairゲスト退出 / multiゲスト退出（人数不足）
│
└── status === 'closed'（結果発表後の終了）
    └── 「ゲームが終了しました。」（infoトースト）
        → ホストが結果発表画面から退出した場合
```

### [NEW] doExit() の確定した Firebase 操作パターン

| 退出ケース | Firebase操作 | 相手のトースト |
|---|---|---|
| pairホスト退出 | `aborted` → `remove` | 「最低人数に満たないため」|
| pairゲスト退出 | `aborted` → `remove` | 「最低人数に満たないため」|
| multiホスト退出 | `remove` のみ | 「ホストが抜けたため」|
| multiゲスト（人数不足）| `aborted` → `remove` | 「最低人数に満たないため」|
| multiゲスト（人数充足）| playersから削除のみ | なし（ゲーム継続）|
| 結果発表からの退出（host/pair）| `closed` → `remove` | 「ゲームが終了しました。」|
| 結果発表（multiゲスト）| Firebase操作なし（ローカル終了のみ）| なし |

### [NEW] トーストのCSS統一

- **問題**: `white-space: nowrap` で長いトーストが画面をはみ出していた
- **修正**: `white-space: normal` + `max-width: calc(100vw - 48px)` + `text-align: center` に変更
- **色の統一**:
  - `.toast--error`（赤）: 強制終了など否定的な通知
  - `.toast--success`（緑）: コピー成功など肯定的な通知
  - `.toast--info`（ダークグレー）: 中立的な通知
  - デフォルト（`var(--text-primary)`）: 上記以外
- **関連ファイル**: `css/beta.css`

### 【設計ノート】Firebase Realtime DB の非同期処理が難しい理由

フロントエンド（見た目）のバグは「画面を見れば即わかる」のに対し、Firebase連携のバグは以下の理由で発見・修正が困難：

1. **非同期・並列**: `await` の順序とリスナーの発火タイミングが絡み合う。書いた順序通りに動かないことがある
2. **双方向・マルチデバイス**: 自分の操作が相手の画面に影響する。1台で確認できない
3. **状態の持ち方が複雑**: `room.roomId` のようなグローバル変数が非同期処理の途中で変わる（今回の根本原因）
4. **再現が難しい**: タイミングによって起きたり起きなかったりするレースコンディションは「たまに起きる」バグになりやすい
5. **ロールバックがない**: DBに書いた後にコードが失敗しても、中途半端な状態がDBに残る

→ **今回の教訓**: 非同期処理の前に参照する値は必ずローカル変数に退避する。Firebase操作の前後でどのリスナーが発火するかを常に意識する

---

---

## 2026年4月7日（月）の作業記録

### [FIXED] みんなモード結果発表：「総合」タブ説明文が初期表示でズレていた
- **現象**: 初回表示時に「ヨミpt＋ミエptの合計で競います」（旧テキスト）が表示される。別タブ→戻ると正しく表示される
- **原因**: `renderMultiResultScreen()` が `renderMultiRankingList('total',...)` を直接呼んでいたため、`descs`オブジェクトを参照する `switchMultiResultTab()` を経由していなかった
- **修正**: `renderMultiResultScreen()` 内で `switchMultiResultTab('total')` を呼ぶよう変更。`multiTabDesc` の初期HTMLも空に修正
- **関連ファイル**: `js/game-pair.js`

### [FIXED] みんなモード結果発表：スコアラベルが1行に収まらない
- **現象**: スマホ画面でスコアラベル（あたり/おしい...）が2列になり「はずれ」が表示されない
- **修正経緯**:
  1. `display:grid` → `display:flex` + `gap:5px` + `9px`（「はずれ」が切れる）
  2. `±N：ラベル Xpt` 形式 + `|`区切り（まだ切れる）
  3. 半角コロン `:` + `·`（中点）区切り + `gap:3px` + `font-size:8px` + テンプレートリテラル改行を除去して最終解決
- **関連ファイル**: `js/game-pair.js`

### [UX] 結果発表タブ説明文テキスト更新
| タブ | 新テキスト |
|------|----------|
| 総合 | 当てた（ヨミpt）＆当てられた（ミエpt）の総合評価 |
| ヨミpt | みんなのことを読めているのは、誰？ |
| ミエpt | 自分のことを見せているのは、誰？ |
| ヨミミエgap | ヨミptとミエptの偏りが大きいのは、誰？ |

### [UX] ヨミミエgapラベル表示を方向付きに変更
- `ヨミ＞＞ミエ` / `ヨミ＞ミエ` / `ヨミ≒ミエ` / `ミエ＞ヨミ` / `ミエ＞＞ヨミ` の5段階に変更
- 閾値: maxYomiMie × 0.4以上で`＞＞`、0.15以上で`＞`、以下で`≒`

### [UX] 理解度ランキングカード改善
- 見出し: `〇〇さんの理解度ランキング` → `🏆 〇〇さんを分かっているのは、誰？`
- デザイン: 背景を `linear-gradient(135deg,#1a1a2e,#2d1b4e)` のダーク系グラデーションに変更
- 順位表示: `1` → `1st` / `2` → `2nd` / `3` → `3rd` 形式に変更
- 同点処理: 同スコアに同じ順位を付与するロジックを追加
- テキスト位置: 「〇〇さんの正しいランク＆参加者の予想」を紫カードの下に移動

### [UX] ランキングアニメーション改善
- 4→3→2→1の順にフェードイン（`animation:su 0.5s Xs cubic-bezier(0.34,1.2,0.64,1) both`）
- gapタブはアニメーション不要（方向ラベル表示のため除外）

### [UX] 遊び方説明をカルーセル化（4スライド）
- スライド構成: ①RankNowとは？ ②モードの違い ③遊び方 ④得点ルール
- 操作: 横スワイプ / 前後ナビボタン / ドットインジケーター
- 閉じ方: ✕ボタン（右上）/ 下スワイプ（`scrollTop < 10` の場合のみ閉じる）
- 得点ルールの記号を正しいものに修正: ◎ / ○ / △ / ▽ / ✕
- 「💡楽しむポイント」セクションを削除
- **関連ファイル**: `index.html`, `css/beta.css`, `js/app.js`

### [SECURITY] Firebaseセキュリティルール v3.5
- `gameSessions` / `rankings`（root直下）/ `pairCodes` を削除（未使用ノード除去）
- `gameRooms` に `.validate` ルール追加（`hostId` / `status` / `gameMode` の必須チェック、statusの値制限）
- `$other` catch-allで未定義パスへのアクセスを明示的に拒否
- Firebase Rule Playground でテスト完了（wait/submit/read の3ケース確認）

### [SECURITY] GitHub 2FA（二要素認証）有効化
- GitHubアカウントへの2FA設定完了
- コード改ざん・不正ログインリスクをほぼ完全に排除

### [SECURITY] Firebase APIキー ドメイン制限
- HTTPリファラー制限設定済み（Netlifyドメイン・liff.line.me以外からのAPI利用をブロック）

### [INFO] LINE公式アカウント＆Messaging API設定完了
- 公式LINE: RankNow \| ランクナウ（@646wiuer）
- LIFFアプリ開発 Provider に Messaging API チャネルを作成・リンク
- botPrompt（友だち追加強制）の準備完了。Aggressive設定は後日実施

---

## 2026年4月8日（火）の作業記録

### [INFRA] 本番環境構築完了
- Firebase APIキーの許可ドメインに `tomoshiya.github.io/*` を追加
- 本番LIFF作成：LIFF ID `2009531665-30BBFxP7`、エンドポイント = GitHub Pages URL、botPrompt = Aggressive
- betaブランチをmainにマージしGitHub Pages（本番）へpush
- **本番URL**: `https://liff.line.me/2009531665-30BBFxP7`

### [FEAT] βモーダル実装
- 初回アクセス時に自動表示（LocalStorage `rankq_beta_shown` で管理）
- **中央モーダル**形式（ボトムシートからの変更）
- BETAボタン：`position:fixed; top:14px; right:16px` で**全画面常時表示**
- 閉じ方：右上✕ボタン or 背景タップ
- Googleフォームリンク（https://forms.gle/Js5FmEs8gcmtSLDW6）を設置

### [FEAT] 利用規約・プライバシーポリシー作成
- `privacy-policy.html` / `terms-of-service.html` をリポジトリに追加
- 運営者: 灯し屋 / 連絡先: contact@tomoshiya.com
- α版（RankQuest）から内容を刷新（pictureUrl削除・ペアコード削除・Messaging API追記）
- 「← 戻る」ボタンはLIFF仕様（新規ブラウザ起動）のため削除

### [FEAT] TOP画面フッターリンク
- 「利用規約 | プライバシーポリシー | 運営元」を画面底部固定表示
- topScreen表示時のみ visible（showScreen関数で制御）
- 履歴FABは `bottom: 40px` に調整

### [UX] TOP画面デザイン変更
- キャッチコピー：「ランクで知り合うコミュニケーションゲーム」→ **「価値観を読み合うコミュニケーションゲーム」**
- ヒーロー上部：ニックネームを左上に移動、BETAボタンを右上固定に
- ロゴ横のBETAバッジは削除（fixed BETAボタンに統一）

### [ENV] 開発フロー確定
- コード変更 → `git push origin beta` → Netlify自動反映 → 動作確認
- 確認OK後 → GitHubでbeta→mainへPR作成 → マージ → GitHub Pages反映
- mainへの直接pushは禁止（ブランチ保護ルール適用）

### [INFO] ニックネームとFirebase usersの関係（仕様メモ）
- ニックネーム表示/初回入力の判定は **localStorage（端末内）** で行っている
- Firebase usersを削除しても、localStorageが残っていればニックネーム入力画面は表示されない
- 別端末・キャッシュクリア時のみ入力画面が出る
- Firebase usersはLIFFプロフィールから自動生成される（initializeUserInFirebase関数）

---

## 2026年4月9日（水）の作業記録

### テーマ一覧ページ（theme-list.js）新設

#### [NEW] テーマ一覧ページ実装
- **概要**: ゲーム外でテーマ一覧を確認・過去TOP5履歴を閲覧できる画面を新設
- **LocalStorageキー**: `ranknow_history_beta`
- **機能**: テーマ別の過去TOP5履歴表示・削除（削除確認モーダルつき）
- **関連ファイル**: `js/theme-list.js`, `index.html`, `css/beta.css`

#### [FIXED] テーマ一覧画面がブランク表示されていた
- **原因**: `#themeListScreen` に `style="display:none;"` がインラインで設定されていた
- **修正**: インラインスタイルを削除
- **関連ファイル**: `index.html`

#### [FIXED] テーマ選択を縦スクロール化 → 横スワイプカルーセルに戻した
- **経緯**: テーマ一覧ページ追加時に誤って縦スクロールに変更してしまった
- **修正**: 横スワイプカルーセル（scroll-snap-type）に戻し、CSSとJSも元の状態に復元
- **関連ファイル**: `css/beta.css`, `js/game-pair.js`

#### [FIXED] カルーセルのループグリッチ（15/60 と表示される問題）
- **現象**: カードのループ処理で先頭から末尾へ戻るとき、インジケーターが「15/60」などの誤値になる
- **原因**: クローン順序が逆（末尾クローンが先に並んでいた）＋ `CARD_W` のハードコードが実際の要素幅とズレていた
- **修正**: クローン挿入に `document.createDocumentFragment()` を使い正しい順序を保証。スクロール位置とインジケーター計算を `offsetLeft` ベースに変更（実要素の座標を直接参照）
- **関連ファイル**: `js/game-pair.js`

#### [FIXED] 履歴の1位が空白になる・順位がずれる
- **原因**: FirebaseはJSオブジェクトを1-indexedで保存するため、配列変換時に `[0]` が空になる
- **修正**: `renderTLHistory()` 内で `raw[0]` が空の場合に `raw.slice(1)` を適用
- **関連ファイル**: `js/theme-list.js`

#### [FIXED] 日付フォーマットが `4/9` 形式になっていた
- **修正**: `YYYY/MM/DD` 形式（ゼロ埋め）に変更
- **関連ファイル**: `js/theme-list.js`

#### [FIXED] 各種表示修正
- モードラベルを `みんなであそぶ` / `ふたりであそぶ` に変更
- 参加者表示を追加：`参加者：A、B、C` 形式
- プレースホルダーテキストを `テーマを選択すると過去の履歴が表示されます` に変更
- **関連ファイル**: `js/theme-list.js`

#### [FIXED] 削除確認モーダルのUX不具合
- **現象①**: 「削除する」「キャンセル」ボタンが機能しない
- **原因**: `confirmDeleteTLEntry()` が `showConfirmModal()` に `style` と `action` を渡していたが、正しい引数は `cls` と `fn`
- **修正**: 引数を `cls`（`danger`）と `fn`（削除処理）に修正
- **現象②**: モーダル外タップでキャンセルできない・ボタンが小さい
- **修正**: オーバーレイの `onclick` にキャンセル処理を追加。ボタンサイズをモーダル全幅に変更
- **関連ファイル**: `js/theme-list.js`

---

### モニタリング環境構築

#### [NEW] Firebase Analytics (GA4) 統合
- `index.html` に `firebase-analytics-compat.js` SDK を追加
- `js/firebase.js` に `measurementId: "G-N364EXJQV8"` を追加
- `initializeFirebase()` 内で `firebase.analytics()` を呼び出し
- **効果**: DAU・セッション数をFirebase Consoleで確認可能に

#### [NEW] trackEvent ユーティリティ実装（`js/firebase.js`）
- Firebase RTDB の `analytics/events` ノードにカスタムイベントを書き込む関数
- 各イベントに `event`, `userId`, `displayName`, `env`, `data`, `timestamp`, `date` を記録
- `getEnv()` でドメインに基づき `beta` / `production` を自動判定
- `App.currentUser` が未設定でも `database` があれば動作するよう堅牢化

#### [NEW] 主要トラッキングイベント追加
| イベント名 | 追加箇所 | 主な payload |
|---|---|---|
| `user_login` | `js/app.js` の `onLiffReady()` | displayName |
| `game_start` | `js/game-pair.js` / `js/game-local.js` | themeId, themeText, themeType, mode, roomId |
| `game_complete` | `js/game-pair.js` / `js/game-local.js` | themeId, themeText, themeType, mode, roomId, hostUid, role, playerCount, players |
| `error` | `js/app.js` の `window.onerror` | message, source, lineno, error |

#### [NEW] Analytics / Security Rules 追加対応
- `analytics/events` に `.indexOn: ["timestamp"]` を追加（Apps Script REST API クエリ最適化）
- **関連ファイル**: `firebase-security-rules-simple.json`

#### [NEW] Google Apps Script 全面刷新
- `syncEvents()`: Firebase RTDB から `analytics/events` を取得 → `raw_events` シートに追記
- `syncUsers()`: `users` ノードを取得 → `users` シートを上書き
- `buildGameLog()`: `game_start`/`game_complete` を突合し1テーマ1行の `game_log` を生成
- `buildThemeStats()`: テーマID・テーマ内容・モード・themeType・人数・時間を `theme_stats` に記録
- `buildNetworkLog()`: ホストUID・参加者・ゲーム時間を `network_log` に記録
- `buildSummary()`: 日次・週次・月次で プレイ数・DAU・新規ユーザー数・モード別集計 を生成
- 必要シート: `raw_events`, `users`, `game_log`, `theme_stats`, `network_log`, `daily_summary`, `weekly_summary`, `monthly_summary`

---

### Firebase Security Rules 修正

#### [FIXED] users の `lastLoginAt` が更新されない根本原因を修正（v3.7）
- **現象**: Security Rules を緩和しても `lastLoginAt` が更新されない
- **根本原因**: `initializeUserInFirebase()` は `once('value')` の READ から始まる。READ ルールも `firebaseUid` 照合チェックが残っていたため、LIFF セッションをまたぐと READ 時点で `PERMISSION_DENIED` になり `catch` に飛んで UPDATE が実行されなかった
- **修正経緯**:
  - v3.6: `.write` のみ `auth != null` に緩和 → 不十分（READ で弾かれていた）
  - v3.7: `.read` も `auth != null` に緩和 → 解決
- **セキュリティ水準**: displayName・lastLoginAt・envのみ保存。beta少人数テストの許容範囲（v2.0相当）
- **関連ファイル**: `firebase-security-rules-simple.json`

#### [NEW] `users` ノードに `env` フィールドを追加
- 新規ユーザー登録時・ログイン時に `env: getEnv()` を保存
- beta / production どちらの環境から登録・アクセスしているかを記録
- **関連ファイル**: `js/firebase.js`

---

## 2026-04-10 作業ログ（β版公開直前・UI整備・テーマデータ更新）

### [FIXED] プログレスピルのドロップダウンが白いコンテンツエリアに隠れる
- **現象**: ランク入力・予想画面で「〇/〇人が入力完了 ▼」を開くと、ドロップダウンがコンテンツエリアの白背景の下に隠れて見えない
- **原因**: `.progress-dropdown` が `position: absolute` で `.hero` 内に配置されており、`.hero { overflow: hidden }` に切られていた
- **修正**: `.progress-dropdown` を `position: fixed` に変更。`toggleProgressDropdown()` / `toggleGuessProgressDropdown()` 内でpillの `getBoundingClientRect()` から座標を取得してtop/leftをJSでセット
- **関連ファイル**: `css/beta.css`, `js/game-pair.js`

### [FIXED] ゲスト側の結果画面に「テーマを変えてもう一度あそぶ」ボタンがなかった
- **現象**: ホスト側の結果画面にはボタンがあるが、ゲスト側にはなく、画面左上の「← HOME」を押して退出してしまう可能性があった
- **修正**: ゲスト側にも同ボタンを表示。押すと `showGuestWaitModal()` が呼ばれ「テーマの変更はホストのみが操作できます。ホストが新しいテーマを選ぶまでお待ちください。」のモーダルを表示
- **関連ファイル**: `js/game-pair.js`

### [UX] 公開版でダミー追加ボタンが表示されていた
- **対応**: `App._devMode` フラグを導入。デフォルトは `false`（非表示）。待機室の部屋番号を**7回素早くタップ**するとON/OFFが切り替わる（部屋番号が一瞬薄くなってフィードバック）
- **関連ファイル**: `js/game-pair.js`, `index.html`

### [UX] テーマ一覧の全履歴削除ボタンをBETAバッジと重なる位置に配置していた
- **対応**: `help-btn` クラスと同スタイル（右下・丸形）でゴミ箱SVGアイコンに変更
- **関連ファイル**: `index.html`

### [NEW] β版公開前UI整備（2026-04-10）
- TOPから「1台であそぶ」「ライブであそぶ」ボタンを削除（beta対象外モード）
- テーマ一覧画面の右下に全履歴削除ボタン（ゴミ箱アイコン）を追加
- `deleteAllHistory()` を `js/storage.js` に追加、`confirmDeleteAllHistory()` / `doDeleteAllHistory()` を `js/theme-list.js` に追加

### [NEW] テーマデータ全面更新（2026-04-10）
- パック名変更: `basic` → `private`（プライベート）、`now` → `news`（ニュース）
- 新パック追加: `work`（仕事 / `#2E3818`）、`love`（ラブ / `#5C1A35`）
- カジュアルパックの色を `#1E2D3D` → `#1B4A72`（明るめネイビー）に変更
- 全テーマのテキストを最新データに更新（88アイテム）
- `docs/firebase_packs.json` / `docs/firebase_items.json` 更新済み
- Firebase Console への手動インポートが必要（`themes/packs` / `themes/items`）

### [NEW] beta → main PR作成・マージ（2026-04-10）
- PR #2 `feat: beta版リリース準備 - UI整備・モニタリング・テーマデータ更新`
- bypass rules and merge で main にマージ完了
- 本番環境（GitHub Pages）への反映開始

---

## 未解決・ペンディング事項

| ID | 内容 | 優先度 | 備考 |
|---|---|---|---|
| ~~P-01~~ | ~~遊び方説明を横スワイプ形式に改善~~ | ~~中~~ | **[FIXED 2026-04-07]** カルーセル4スライド形式で実装。スワイプ・ナビボタン・ドット・✕ボタン・下スワイプ閉じる |
| P-13 | 下スワイプでハーフモーダルを閉じる | 低 | LIFF WebViewがネイティブスクロールを優先するためtouchendが確実に拾えない。ハンドルバー（棒）を削除して誤認を防ぐ対処済み |
| P-02 | ヒーローエリアのスクロール縮小 | 中 | スクロール連動でカードが縮む挙動 |
| ~~P-03~~ | ~~gameRoomsの30分自動削除~~ | ~~低~~ | **[FIXED 2026-03-24]** `cleanupOldRooms()` をログイン時に実行。`ROOM_TIMEOUT_MS` 定数で30分設定 |
| ~~P-04~~ | ~~テスト用ダミーユーザー追加ボタン~~ | ~~低~~ | **[FIXED 2026-03-18]** みんなであそぶ待機室ホスト画面に実装済み |
| ~~P-05~~ | ~~初回ニックネーム入力の強制導線~~ | ~~高~~ | **[FIXED 2026-03-19]** 初回ログイン時にニックネーム入力を強制するモーダル実装済み |
| P-06 | テーマパックの説明バナー+タグ+ヒント | 中 | Firebaseデータ整備とセットで実装 |
| ~~P-07~~ | ~~テーマ選択待機画面：テーマ一覧プレビュー（読み取り専用）~~ | ~~中~~ | **[FIXED 2026-03-20]** `showGuestThemeBrowse()` で実装済み |
| ~~P-08~~ | ~~ゲームから途中退出する方法がない・復帰できない~~ | ~~高~~ | **[FIXED 2026-03-24〜25]** `doExit()` 統一化・`checkSessionRestore()` 改善で退出・復帰フローを完成 |
| ~~P-09~~ | ~~「みんなであそぶ」で3名以下になったら部屋を閉じる~~ | ~~中~~ | **[FIXED 2026-03-24〜25]** `doExit()` 内でmode別minPlayersチェック実装 |
| ~~P-10~~ | ~~結果発表：ズレ幅・正解した率・正解され率タブ切替~~ | ~~低~~ | **[FIXED 2026-03-20]** みんなモードで総合/ヨミpt/ミエpt/ヨミミエgapの4タブ実装済み |
| ~~P-11~~ | ~~テーマ選択：最後のカードから最初に戻るループUI~~ | ~~低~~ | **[FIXED 2026-04-09]** カルーセルクローン＋offsetLeftベースのループ実装済み。15/60グリッチも解消 |
| P-12 | 「自分でつくる」のカード直接入力体験 | 中 | カード上にtextareaを重ねて直接入力するUI（画像14参照） |

---

## 設計上の決定事項（変更禁止）

| 項目 | 決定内容 | 理由 |
|---|---|---|
| 部屋コード桁数 | **ふたりであそぶ=4桁 / みんなであそぶ=5桁** | モード別に分けることで混同を防ぐ。2026-03-18決定 |
| スコアリング | **10/6/3/1/0pt（±0/1/2/3/4位）** | 当てることへの価値を重視 |
| データ保存 | **LocalStorage（β版）** | Firebase有料機能を使わずユーザーデータ保護 |
| 入力文字数制限 | **50文字（ランク入力）** | スマホ入力の実用的な上限 |
| 改行 | **不可（ランク入力・テーマ入力）** | カードUI表示の崩れ防止 |
| カード統一規格 | **200×114px、テキスト12px、packラベル7px** | CSS変数（--card-w/h/text-size/pack-size）で管理。全4画面で同一の見た目を維持すること |
| 予想確定ボタン解除条件 | **全員タブを1回ずつ開いた時点で解除**（UI操作ベース） | Firebase提出状態ではなくユーザー操作をトリガーにする。ふたりの場合は即解除 |
| CSSクラス設計 | **ヒーロー内要素は `.hero-title`/`.hero-desc`/`.hero-back-btn` を使用** | インラインスタイル禁止。将来のUI変更コストを下げるため |
| ランクアイテムテキスト | **必ず `.rank-text` / `.rank-num` クラスを使用** | `word-break:break-all` の抜け漏れを防ぐため。`.rank-row` / `.rank-row--card` で行レイアウトも統一 |
| SortableJS インスタンス管理 | **1つのDOM要素に対してインスタンスは常に1つ** | 複数インスタンスはPC(マウス)では動いてもモバイル(タッチ)で競合・フリーズする。再生成時は必ず全インスタンスを先に `destroy()` すること |
| SortableJS コンテナ内容 | **並び替え対象要素のみを入れる。見出し・キャプションはコンテナ外に置く** | コンテナ内の非ソート要素は `draggable` フィルタで除外できるが、モバイルタッチ判定に副作用が出やすい。外に出すのが最も安全 |
| CSSインライン禁止方針 | **JSテンプレート内の `style=""` は原則禁止。必ずCSSクラスを先に定義して `class=""` で参照** | 例外：`display:none/block` 等の表示制御トグル、JSで計算した動的な値のみ許可 |
