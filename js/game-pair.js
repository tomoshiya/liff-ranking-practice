// ========================================
// ふたりであそぶ モード
// ========================================
// TODO: Phase 6-Rebuild で実装

let pairMode = 'multi'; // 'pair' | 'multi'

function startPairMode() {
    pairMode = 'pair';
    document.getElementById('roomSelectModeLabel').textContent = 'ふたりであそぶ';
    showScreen('roomSelectScreen');
}

function createRoom() {
    // TODO: Firebase gameRooms にルームを作成
    console.log('createRoom - TODO');
    showToast('部屋作成機能を実装中です', 'info');
}

function joinRoom() {
    // TODO: ルームに参加
    console.log('joinRoom - TODO');
}

function onRoomCodeInput(input) {
    const btn = document.getElementById('joinRoomBtn');
    const nameInput = document.getElementById('joinNameInput');
    btn.disabled = input.value.length < 4 || nameInput.value.trim().length === 0;
}

function copyRoomCode() {
    const code = document.getElementById('waitingRoomCode').textContent;
    copyToClipboard(code);
}

function hostStartGame() {
    // TODO: ゲーム開始フラグをFirebaseに書き込み
    console.log('hostStartGame - TODO');
}

function closeRoom() {
    // TODO: ルームを削除してトップへ
    showScreen('topScreen');
}

function confirmTheme() {
    // TODO: テーマをFirebaseに書き込み
    console.log('confirmTheme - TODO');
}

function submitRanking() {
    // TODO: ランキングをFirebaseに送信
    console.log('submitRanking - TODO');
}

function editMyRanking() {
    document.getElementById('inputSubmittedBanner').style.display = 'none';
    document.getElementById('rankingInputForm').style.display = 'block';
}

function submitGuess() {
    // TODO: 予想をFirebaseに送信
    console.log('submitGuess - TODO');
}

function toggleProgressAccordion() {
    // TODO: 進捗アコーディオン展開
}

function playAgain() {
    // TODO: 同じメンバーで再戦
    showScreen('themeSelectScreen');
}

function changeTheme() {
    showScreen('themeSelectScreen');
}
