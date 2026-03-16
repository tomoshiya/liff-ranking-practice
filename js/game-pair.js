// ========================================
// ふたりであそぶ / みんなであそぶ 共通ゲームフロー
// Firebase gameRooms ノードを使用
// status遷移: waiting → setting → inputting → guessing → finished
// ========================================

// --- 状態管理 ---
let room = {
    roomId: null,
    role: null,       // 'host' | 'guest'
    mode: null,       // 'pair' | 'multi'
    data: null
};
let roomRef = null;         // Firebase リスナーref
let inputSortable = null;   // ランキング入力SortableJS
let guessSortables = {};    // 予想SortableJS { targetId: Sortable }
let guessCurrentTargetId = null;
let guessDraft = {};        // { targetId: { '1': item, ... } }

const AVATAR_COLORS_ONLINE = ['#5C6BC0','#26A69A','#EF5350','#FFA726','#66BB6A','#AB47BC','#78909C','#8D6E63'];

// ========================================
// トップ画面からのエントリー
// ========================================

function startPairMode() {
    room.mode = 'pair';
    document.getElementById('roomSelectModeLabel').textContent = 'ふたりであそぶ';
    showScreen('roomSelectScreen');
}

function startMultiMode() {
    room.mode = 'multi';
    document.getElementById('roomSelectModeLabel').textContent = 'みんなであそぶ';
    showScreen('roomSelectScreen');
}

// ========================================
// 部屋を作る（ホスト）
// ========================================

async function createRoom() {
    if (!App.userProfile || !database) {
        showToast('ユーザー情報が読み込まれていません', 'error');
        return;
    }

    try {
        const roomsRef = database.ref('gameRooms');
        let roomId = generateRoomCode();
        let retries = 0;
        while (retries < 10) {
            const snap = await roomsRef.child(roomId).once('value');
            if (!snap.exists()) break;
            roomId = generateRoomCode();
            retries++;
        }

        const maxPlayers = room.mode === 'pair' ? 2 : 10;
        const roomData = {
            roomId,
            hostId: App.userProfile.userId,
            hostName: App.displayName,
            maxPlayers,
            gameMode: room.mode,
            status: 'waiting',
            theme: null,
            players: {},
            createdAt: new Date().toISOString(),
            lastActivityAt: Date.now()
        };
        roomData.players[App.userProfile.userId] = {
            displayName: App.displayName,
            firebaseUid: firebase.auth().currentUser.uid,
            status: 'waiting'
        };

        await roomsRef.child(roomId).set(roomData);
        room = { roomId, role: 'host', mode: room.mode, data: roomData };

        renderWaitingRoomHost(roomData);
        showScreen('waitingRoomHostScreen');
        startRoomListener(roomId);

    } catch (err) {
        console.error('部屋作成エラー:', err);
        showToast('部屋の作成に失敗しました', 'error');
    }
}

function generateRoomCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

// ========================================
// 部屋に入る（ゲスト）
// ========================================

function onRoomCodeInput(input) {
    const nameInput = document.getElementById('joinNameInput');
    const btn = document.getElementById('joinRoomBtn');
    btn.disabled = input.value.length < 4 || !nameInput.value.trim();
}

function onJoinNameInput() {
    const codeInput = document.getElementById('roomCodeInput');
    const nameInput = document.getElementById('joinNameInput');
    const btn = document.getElementById('joinRoomBtn');
    btn.disabled = codeInput.value.length < 4 || !nameInput.value.trim();
}

async function joinRoom() {
    if (!App.userProfile || !database) {
        showToast('ユーザー情報が読み込まれていません', 'error');
        return;
    }

    const roomId = document.getElementById('roomCodeInput').value.trim();
    const guestName = document.getElementById('joinNameInput').value.trim();

    if (!roomId || roomId.length < 4) {
        showToast('部屋番号を入力してください', 'error');
        return;
    }
    if (!guestName) {
        showToast('名前を入力してください', 'error');
        return;
    }

    const btn = document.getElementById('joinRoomBtn');
    btn.disabled = true;
    btn.textContent = '接続中...';

    try {
        const roomRef = database.ref('gameRooms/' + roomId);
        const snap = await roomRef.once('value');

        if (!snap.exists()) {
            showToast('部屋番号が見つかりません', 'error');
            btn.disabled = false;
            btn.textContent = 'この名前で入室する';
            return;
        }

        const roomData = snap.val();

        if (roomData.status !== 'waiting') {
            showToast('このゲームはすでに開始されています', 'error');
            btn.disabled = false;
            btn.textContent = 'この名前で入室する';
            return;
        }

        const playerCount = Object.keys(roomData.players || {}).length;
        const alreadyJoined = roomData.players?.[App.userProfile.userId];

        if (!alreadyJoined && playerCount >= roomData.maxPlayers) {
            showToast('この部屋は満員です', 'error');
            btn.disabled = false;
            btn.textContent = 'この名前で入室する';
            return;
        }

        if (!alreadyJoined) {
            await roomRef.update({
                [`players/${App.userProfile.userId}`]: {
                    displayName: guestName,
                    firebaseUid: firebase.auth().currentUser.uid,
                    status: 'waiting'
                },
                lastActivityAt: Date.now()
            });
        }

        // 名前を保存
        App.displayName = guestName;
        saveDisplayName(guestName);

        room = { roomId, role: 'guest', mode: roomData.gameMode, data: roomData };

        const updatedSnap = await roomRef.once('value');
        renderWaitingRoomGuest(updatedSnap.val());
        showScreen('waitingRoomGuestScreen');
        startRoomListener(roomId);

        btn.disabled = false;
        btn.textContent = 'この名前で入室する';

    } catch (err) {
        console.error('部屋参加エラー:', err);
        showToast('入室に失敗しました', 'error');
        btn.disabled = false;
        btn.textContent = 'この名前で入室する';
    }
}

// ========================================
// 部屋を閉じる / 退出
// ========================================

async function closeRoom() {
    if (!confirm('部屋を閉じますか？\n全員が退出されます。')) return;
    try {
        if (room.roomId && database) {
            await database.ref('gameRooms/' + room.roomId).remove();
        }
    } catch (err) {
        console.error('部屋削除エラー:', err);
    }
    cleanupRoom();
    showScreen('topScreen');
}

function cleanupRoom() {
    if (roomRef) { roomRef.off(); roomRef = null; }
    if (inputSortable) { inputSortable.destroy(); inputSortable = null; }
    Object.values(guessSortables).forEach(s => s.destroy());
    guessSortables = {};
    guessDraft = {};
    guessCurrentTargetId = null;
    room = { roomId: null, role: null, mode: null, data: null };
}

function copyRoomCode() {
    copyToClipboard(room.roomId);
}

// ========================================
// Firebase リアルタイムリスナー（状態遷移エンジン）
// ========================================

function startRoomListener(roomId) {
    if (roomRef) { roomRef.off(); }
    roomRef = database.ref('gameRooms/' + roomId);

    roomRef.on('value', snap => {
        if (!snap.exists()) {
            cleanupRoom();
            showToast('部屋が閉じられました', 'error');
            showScreen('topScreen');
            return;
        }

        const data = snap.val();
        room.data = data;

        const activeId = document.querySelector('.screen--active')?.id || '';

        switch (data.status) {
            case 'waiting':
                if (activeId === 'waitingRoomHostScreen') renderWaitingRoomHost(data);
                if (activeId === 'waitingRoomGuestScreen') renderWaitingRoomGuest(data);

                // 全員揃ったらホストがsettingに遷移
                if (room.role === 'host') {
                    const count = Object.keys(data.players || {}).length;
                    if (room.mode === 'pair' && count >= 2) {
                        database.ref('gameRooms/' + roomId).update({ status: 'setting', lastActivityAt: Date.now() });
                    }
                    // multiモードはホストが手動でゲーム開始
                    if (room.mode === 'multi') {
                        const startBtn = document.getElementById('startGameBtn');
                        if (startBtn) startBtn.disabled = count < 2;
                        renderWaitingRoomHost(data);
                    }
                }
                break;

            case 'setting':
                if (room.role === 'host') {
                    if (activeId !== 'themeSelectScreen') renderThemeSelectScreen();
                } else {
                    if (activeId !== 'themeWaitingScreen') showScreen('themeWaitingScreen');
                }
                break;

            case 'inputting':
                if (activeId !== 'rankingInputScreen') {
                    renderRankingInputScreen(data);
                } else {
                    updateInputProgress(data);
                }
                break;

            case 'guessing':
                if (activeId !== 'rankingGuessScreen') {
                    renderGuessScreen(data);
                } else {
                    updateGuessProgress(data);
                }
                break;

            case 'finished':
                if (activeId !== 'resultScreen') {
                    renderOnlineResultScreen(data);
                }
                break;
        }
    });
}

// ========================================
// 待機室
// ========================================

function renderWaitingRoomHost(data) {
    document.getElementById('waitingRoomCode').textContent = data.roomId;
    const players = Object.entries(data.players || {});
    const isMulti = data.gameMode === 'multi';

    document.getElementById('waitingRoomPlayerList').innerHTML = players.map(([uid, p], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface);border:1.5px solid var(--border);border-radius:10px;">
            <div class="avatar" style="background:${AVATAR_COLORS_ONLINE[i % AVATAR_COLORS_ONLINE.length]};">${p.displayName?.[0] || '?'}</div>
            <span style="flex:1;font-size:13px;font-weight:700;">${escapeHtml(p.displayName)}</span>
            ${uid === data.hostId ? '<span class="badge badge--host">ホスト</span>' : ''}
        </div>
    `).join('');

    document.getElementById('waitingRoomCount').textContent =
        `${players.length} / ${data.maxPlayers} 人が参加中`;

    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.disabled = isMulti ? players.length < 2 : true; // pairは自動遷移
        startBtn.style.display = isMulti ? 'block' : 'none';
    }
}

function renderWaitingRoomGuest(data) {
    document.getElementById('waitingRoomCodeGuest').textContent = data.roomId;
    const players = Object.entries(data.players || {});

    document.getElementById('waitingRoomPlayerListGuest').innerHTML = players.map(([uid, p], i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface);border:1.5px solid var(--border);border-radius:10px;">
            <div class="avatar" style="background:${AVATAR_COLORS_ONLINE[i % AVATAR_COLORS_ONLINE.length]};">${p.displayName?.[0] || '?'}</div>
            <span style="flex:1;font-size:13px;font-weight:700;">${escapeHtml(p.displayName)}</span>
            ${uid === data.hostId ? '<span class="badge badge--host">ホスト</span>' : ''}
        </div>
    `).join('');
}

// みんなモード：ホストがゲーム開始ボタンを押したとき
async function hostStartGame() {
    if (room.role !== 'host' || !room.roomId) return;
    try {
        await database.ref('gameRooms/' + room.roomId).update({ status: 'setting', lastActivityAt: Date.now() });
    } catch (err) {
        showToast('開始に失敗しました', 'error');
    }
}

// ========================================
// テーマ選択（ホスト）
// ========================================

let onlineSelectedThemeIdx = -1;

function renderThemeSelectScreen() {
    onlineSelectedThemeIdx = -1;
    document.getElementById('selectedThemePreview').style.display = 'none';
    document.getElementById('confirmThemeBtn').disabled = true;

    document.getElementById('themeList').innerHTML = themes.map((t, i) => `
        <div class="card" style="cursor:pointer;transition:border-color 0.15s;" id="onlineThemeItem_${i}"
             onclick="onlineSelectTheme(${i})">
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);">${escapeHtml(t.text)}</div>
            ${t.pack ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${escapeHtml(t.pack)}</div>` : ''}
        </div>
    `).join('');

    showScreen('themeSelectScreen');
}

function onlineSelectTheme(idx) {
    onlineSelectedThemeIdx = idx;
    document.querySelectorAll('#themeList .card').forEach((el, i) => {
        el.style.borderColor = i === idx ? 'var(--text-primary)' : 'var(--border)';
    });
    const theme = themes[idx];
    const preview = document.getElementById('selectedThemePreview');
    preview.style.display = 'flex';
    renderThemeCard(theme.text, theme.pack || 'basic', preview);
    document.getElementById('confirmThemeBtn').disabled = false;
}

async function confirmTheme() {
    if (onlineSelectedThemeIdx < 0 || room.role !== 'host') return;
    const theme = themes[onlineSelectedThemeIdx];
    try {
        await database.ref('gameRooms/' + room.roomId).update({
            status: 'inputting',
            theme: theme.text,
            themeId: theme.id || '',
            themePack: theme.pack || 'basic',
            rankings: null,
            guesses: null,
            lastActivityAt: Date.now()
        });
    } catch (err) {
        showToast('テーマの確定に失敗しました', 'error');
    }
}

// ========================================
// ランキング入力
// ========================================

function renderRankingInputScreen(data) {
    // テーマカード
    renderThemeCard(data.theme, data.themePack || 'basic', document.getElementById('inputThemeCard'));

    // 進捗
    updateInputProgress(data);

    // 送信済みチェック
    const alreadySubmitted = data.rankings?.[App.userProfile.userId];
    document.getElementById('inputSubmittedBanner').style.display = alreadySubmitted ? 'flex' : 'none';
    document.getElementById('rankingInputForm').style.display = alreadySubmitted ? 'none' : 'block';

    if (!alreadySubmitted) {
        renderRankInputList();
    }

    showScreen('rankingInputScreen');
}

function renderRankInputList() {
    const badges = ['1st','2nd','3rd','4th','5th'];
    document.getElementById('rankInputList').innerHTML = badges.map((b, i) => `
        <div class="rank-item">
            <div class="rank-badge">${b}</div>
            <textarea class="rank-input" rows="1" id="onlineInput_${i+1}"
                placeholder="${i+1}位を入力"
                oninput="onOnlineRankInput(); autoResize(this)"></textarea>
        </div>
    `).join('');

    // SortableJS（ドラッグ並べ替え）
    if (inputSortable) { inputSortable.destroy(); inputSortable = null; }
    inputSortable = Sortable.create(document.getElementById('rankInputList'), {
        animation: 150,
        handle: '.rank-item',
        onEnd: updateOnlineInputBadges
    });

    document.getElementById('submitRankingBtn').disabled = true;
    setTimeout(() => document.getElementById('onlineInput_1')?.focus(), 100);
}

function updateOnlineInputBadges() {
    const badges = ['1st','2nd','3rd','4th','5th'];
    document.querySelectorAll('#rankInputList .rank-badge').forEach((el, i) => {
        el.textContent = badges[i] || `${i+1}位`;
    });
    onOnlineRankInput();
}

function onOnlineRankInput() {
    const all = [1,2,3,4,5].every(r => {
        const el = document.getElementById(`onlineInput_${r}`);
        return el && el.value.trim().length > 0;
    });
    document.getElementById('submitRankingBtn').disabled = !all;
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

async function submitRanking() {
    if (!room.roomId) return;

    const rankingData = {};
    const items = document.querySelectorAll('#rankInputList .rank-item');
    for (let i = 0; i < items.length; i++) {
        const input = items[i].querySelector('.rank-input');
        const val = input ? input.value.trim() : '';
        if (!val) { showToast(`${i+1}位を入力してください`, 'error'); return; }
        rankingData[String(i + 1)] = val;
    }

    const btn = document.getElementById('submitRankingBtn');
    btn.disabled = true;
    btn.textContent = '送信中...';

    try {
        const ref = database.ref('gameRooms/' + room.roomId);
        await ref.update({
            [`rankings/${App.userProfile.userId}`]: rankingData,
            [`players/${App.userProfile.userId}/status`]: 'completed',
            lastActivityAt: Date.now()
        });

        // 全員送信済みチェック
        const snap = await ref.once('value');
        const d = snap.val();
        const allSubmitted = Object.keys(d.players || {}).every(id => d.rankings?.[id]);
        if (allSubmitted) {
            await ref.update({ status: 'guessing', lastActivityAt: Date.now() });
        }

        document.getElementById('rankingInputForm').style.display = 'none';
        document.getElementById('inputSubmittedBanner').style.display = 'flex';

    } catch (err) {
        console.error('ランキング送信エラー:', err);
        showToast('送信に失敗しました', 'error');
        btn.disabled = false;
        btn.textContent = 'TOP5を送信する';
    }
}

function editMyRanking() {
    document.getElementById('inputSubmittedBanner').style.display = 'none';
    document.getElementById('rankingInputForm').style.display = 'block';
    renderRankInputList();
}

function updateInputProgress(data) {
    const players = Object.keys(data.players || {});
    const submitted = players.filter(id => data.rankings?.[id]).length;
    document.getElementById('inputProgressText').textContent = `${submitted} / ${players.length} 人が入力完了`;
}

// ========================================
// ランキング予想
// ========================================

function renderGuessScreen(data) {
    renderThemeCard(data.theme, data.themePack || 'basic', document.getElementById('guessThemeCard'));
    updateGuessProgress(data);

    const players = Object.entries(data.players || {});
    const targets = players.filter(([id]) => id !== App.userProfile.userId);

    // タブ
    document.getElementById('guessTabs').innerHTML = targets.map(([id, p], i) => `
        <div class="person-tab${i === 0 ? ' person-tab--active' : ''}"
             id="guessTab_${id}" onclick="onlineSwitch GuessTab('${id}')">${escapeHtml(p.displayName)}</div>
    `).join('').replace(/onlineSwitch GuessTab/g, 'onlineSwitchGuessTab');

    // 最初のターゲットを表示
    guessDraft = {};
    guessCurrentTargetId = null;
    onlineSwitchGuessTab(targets[0][0]);

    document.getElementById('submitGuessBtn').disabled = false;

    // 送信済みチェック
    const alreadyGuessed = data.guesses?.[App.userProfile.userId];
    if (alreadyGuessed) {
        document.getElementById('guessSubmittedBanner').style.display = 'flex';
        document.getElementById('submitGuessBtn').style.display = 'none';
    }

    showScreen('rankingGuessScreen');
}

function onlineSwitchGuessTab(targetId) {
    // 現在のタブのドラフトを保存
    if (guessCurrentTargetId) {
        saveGuessDraft(guessCurrentTargetId);
    }

    guessCurrentTargetId = targetId;

    document.querySelectorAll('#guessTabs .person-tab').forEach(el => el.classList.remove('person-tab--active'));
    document.getElementById(`guessTab_${targetId}`)?.classList.add('person-tab--active');

    renderGuessSortList(targetId);
}

function renderGuessSortList(targetId) {
    const data = room.data;
    const ranking = data.rankings?.[targetId];
    if (!ranking) return;

    const items = Object.values(ranking);
    const shuffled = guessDraft[targetId]
        ? Object.values(guessDraft[targetId])
        : shuffleArray([...items]);

    const badges = ['1st','2nd','3rd','4th','5th'];
    document.getElementById('guessSortList').innerHTML = shuffled.map((item, i) => `
        <div class="rank-item" data-item="${escapeHtml(item)}" style="cursor:grab;">
            <div class="rank-badge">${badges[i]}</div>
            <div style="flex:1;font-size:14px;font-weight:500;">${escapeHtml(item)}</div>
            <div class="rank-drag-handle">⋮⋮</div>
        </div>
    `).join('');

    if (guessSortables[targetId]) { guessSortables[targetId].destroy(); }
    guessSortables[targetId] = Sortable.create(document.getElementById('guessSortList'), {
        animation: 150,
        handle: '.rank-drag-handle',
        onEnd: () => updateGuessBadges()
    });
}

function updateGuessBadges() {
    const badges = ['1st','2nd','3rd','4th','5th'];
    document.querySelectorAll('#guessSortList .rank-badge').forEach((el, i) => {
        el.textContent = badges[i] || `${i+1}位`;
    });
}

function saveGuessDraft(targetId) {
    const items = document.querySelectorAll('#guessSortList [data-item]');
    const draft = {};
    items.forEach((el, i) => { draft[String(i + 1)] = el.getAttribute('data-item'); });
    guessDraft[targetId] = draft;
}

async function submitGuess() {
    if (!room.roomId) return;

    // 現在のタブを保存
    if (guessCurrentTargetId) saveGuessDraft(guessCurrentTargetId);

    const data = room.data;
    const targets = Object.keys(data.players || {}).filter(id => id !== App.userProfile.userId);

    // 全ターゲットの予想が埋まっているか確認
    for (const tid of targets) {
        if (!guessDraft[tid]) {
            showToast(`${data.players[tid].displayName}さんの予想が未入力です`, 'error');
            onlineSwitchGuessTab(tid);
            return;
        }
    }

    const btn = document.getElementById('submitGuessBtn');
    btn.disabled = true;
    btn.textContent = '送信中...';

    try {
        const ref = database.ref('gameRooms/' + room.roomId);
        const updates = { lastActivityAt: Date.now() };
        targets.forEach(tid => {
            updates[`guesses/${App.userProfile.userId}/${tid}`] = guessDraft[tid];
        });
        await ref.update(updates);

        // 全員予想完了チェック
        const snap = await ref.once('value');
        const d = snap.val();
        const allGuessed = Object.keys(d.players || {}).every(id => d.guesses?.[id]);
        if (allGuessed) {
            await ref.update({ status: 'finished', lastActivityAt: Date.now() });
        }

        document.getElementById('guessSubmittedBanner').style.display = 'flex';
        btn.style.display = 'none';

    } catch (err) {
        console.error('予想送信エラー:', err);
        showToast('送信に失敗しました', 'error');
        btn.disabled = false;
        btn.textContent = '予想を送信する';
    }
}

function updateGuessProgress(data) {
    const players = Object.keys(data.players || {});
    const guessed = players.filter(id => data.guesses?.[id]).length;
    document.getElementById('guessProgressText').textContent = `${guessed} / ${players.length} 人が送信完了`;
}

// ========================================
// 結果画面
// ========================================

function renderOnlineResultScreen(data) {
    // テーマカード
    renderThemeCard(data.theme, data.themePack || 'basic', document.getElementById('resultThemeCard'));

    const players = Object.entries(data.players || {});

    // スコア計算
    const scores = {};
    players.forEach(([guesserId, g]) => {
        let totalScore = 0, perfect = 0, close1 = 0;
        players.forEach(([targetId]) => {
            if (targetId === guesserId) return;
            const correct = data.rankings?.[targetId];
            const guess = data.guesses?.[guesserId]?.[targetId];
            if (!correct || !guess) return;
            for (let rank = 1; rank <= 5; rank++) {
                const item = correct[String(rank)];
                let gRank = 0;
                for (let r = 1; r <= 5; r++) {
                    if (guess[String(r)] === item) { gRank = r; break; }
                }
                if (gRank > 0) {
                    const diff = Math.abs(gRank - rank);
                    totalScore += calcItemScore(diff);
                    if (diff === 0) perfect++;
                    else if (diff === 1) close1++;
                }
            }
        });
        scores[guesserId] = { totalScore, perfect, close1 };
    });

    // ランキング表示
    const sorted = [...players]
        .map(([id, p]) => ({ id, name: p.displayName, ...scores[id] }))
        .sort((a, b) => b.totalScore - a.totalScore);

    const targetCount = players.length - 1;
    const maxScore = targetCount * 50;
    const medals = ['🥇','🥈','🥉'];

    document.getElementById('resultRanking').innerHTML = sorted.map((p, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,0.08);border-radius:8px;margin-bottom:4px;">
            <span style="font-size:20px;min-width:28px;text-align:center;">${medals[i] || `${i+1}`}</span>
            <span style="flex:1;font-size:14px;font-weight:700;color:#fff;">${escapeHtml(p.name)}</span>
            <span style="font-family:'DM Sans',sans-serif;font-size:20px;font-weight:900;font-style:italic;color:#fff;">
                ${p.totalScore}<span style="font-size:11px;opacity:0.5;">/${maxScore}</span>
            </span>
        </div>
    `).join('');

    // 個人詳細タブ
    document.getElementById('resultTabs').innerHTML = players.map(([id, p], i) => `
        <div class="person-tab${i === 0 ? ' person-tab--active' : ''}"
             id="resultTab_${id}" onclick="showOnlinePersonResult('${id}')">${escapeHtml(p.displayName)}</div>
    `).join('');
    showOnlinePersonResult(players[0][0]);

    // 履歴保存
    const myId = App.userProfile.userId;
    saveGameHistory(createHistoryEntry({
        themeId: data.themeId || '',
        themeText: data.theme,
        mode: data.gameMode,
        players: players.map(([id, p]) => ({ lineUserId: id, displayName: p.displayName })),
        myLineUserId: myId,
        myScore: scores[myId]?.totalScore || 0,
        maxScore,
        totalScore: sorted.reduce((s, p) => s + p.totalScore, 0),
        totalMaxScore: maxScore * players.length,
        answers: data.rankings || {}
    }));

    showScreen('resultScreen');
}

function showOnlinePersonResult(targetId) {
    document.querySelectorAll('#resultTabs .person-tab').forEach(el => el.classList.remove('person-tab--active'));
    document.getElementById(`resultTab_${targetId}`)?.classList.add('person-tab--active');

    const data = room.data;
    const target = data.players?.[targetId];
    const correct = data.rankings?.[targetId];
    if (!correct || !target) return;

    const guessers = Object.entries(data.players || {}).filter(([id]) => id !== targetId);

    let html = `<div style="margin-bottom:12px;font-size:13px;font-weight:700;">${escapeHtml(target.displayName)}さんの正解ランキング</div>`;

    for (let rank = 1; rank <= 5; rank++) {
        const item = correct[String(rank)];
        html += `<div class="card" style="margin-bottom:6px;">
            <div style="display:flex;align-items:center;margin-bottom:8px;">
                <span style="background:var(--text-primary);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:10px;margin-right:8px;">${rank}位</span>
                <span style="font-size:13px;font-weight:700;">${escapeHtml(item)}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                ${guessers.map(([gId, g]) => {
                    const guess = data.guesses?.[gId]?.[targetId];
                    let gRank = 0;
                    if (guess) for (let r = 1; r <= 5; r++) { if (guess[String(r)] === item) { gRank = r; break; } }
                    const diff = gRank > 0 ? Math.abs(gRank - rank) : 99;
                    const { icon, color } = gRank > 0 ? getScoreLabel(diff) : { icon: '×', color: 'var(--text-muted)' };
                    const pt = gRank > 0 ? calcItemScore(diff) : 0;
                    return `<div style="display:flex;align-items:center;font-size:12px;gap:6px;">
                        <span style="color:${color};font-weight:700;min-width:14px;text-align:center;">${icon}</span>
                        <span style="flex:1;color:var(--text-secondary);">${escapeHtml(g.displayName)}</span>
                        <span style="color:var(--text-muted);">${gRank > 0 ? gRank + '位' : '-'}</span>
                        <span style="color:${color};font-weight:700;min-width:28px;text-align:right;">${pt}pt</span>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }
    document.getElementById('resultPersonDetail').innerHTML = html;
}

// ========================================
// リプレイ
// ========================================

async function playAgain() {
    if (!room.roomId || room.role !== 'host') {
        showToast('ホストがテーマを選択しています', 'info');
        return;
    }
    try {
        await database.ref('gameRooms/' + room.roomId).update({
            status: 'setting',
            theme: null,
            themeId: null,
            rankings: null,
            guesses: null,
            lastActivityAt: Date.now()
        });
        // 全員のステータスをリセット
        const updates = {};
        Object.keys(room.data.players || {}).forEach(id => {
            updates[`players/${id}/status`] = 'waiting';
        });
        await database.ref('gameRooms/' + room.roomId).update(updates);
    } catch (err) {
        showToast('もう一回の開始に失敗しました', 'error');
    }
}

async function changeTheme() {
    await playAgain();
}

// ========================================
// ユーティリティ
// ========================================

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
