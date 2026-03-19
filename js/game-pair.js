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
let visitedGuessTabs = new Set(); // 訪問済みタブ（全員分訪問でボタン解除）

const AVATAR_COLORS_ONLINE = ['#5C6BC0','#26A69A','#EF5350','#FFA726','#66BB6A','#AB47BC','#78909C','#8D6E63'];

// ========================================
// トップ画面からのエントリー
// ========================================

function startPairMode() {
    App.currentMode = 'pair';
    room.mode = 'pair';
    document.getElementById('roomSelectModeLabel').textContent = 'ふたりであそぶ';
    const ci = document.getElementById('roomCodeInput');
    if (ci) { ci.maxLength = 4; ci.placeholder = '1234'; }
    const lbl = document.getElementById('roomCodeLabel');
    if (lbl) lbl.textContent = '部屋番号（4桁）';
    prefillJoinName();
    showScreen('roomSelectScreen');
}

function startMultiMode() {
    App.currentMode = 'multi';
    room.mode = 'multi';
    document.getElementById('roomSelectModeLabel').textContent = 'みんなであそぶ';
    const ci = document.getElementById('roomCodeInput');
    if (ci) { ci.maxLength = 5; ci.placeholder = '12345'; }
    const lbl = document.getElementById('roomCodeLabel');
    if (lbl) lbl.textContent = '部屋番号（5桁）';
    prefillJoinName();
    showScreen('roomSelectScreen');
}

// Bug6修正: 入室画面に保存済みの名前を事前入力
function prefillJoinName() {
    const nameInput = document.getElementById('joinNameInput');
    if (nameInput && App.displayName) {
        nameInput.value = App.displayName;
        onJoinNameInput();
    }
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
    if (room.mode === 'multi') return String(Math.floor(10000 + Math.random() * 90000)); // 5桁
    return String(Math.floor(1000 + Math.random() * 9000)); // 4桁
}

// ========================================
// 部屋に入る（ゲスト）
// ========================================

function onRoomCodeInput(input) {
    const minLen = room.mode === 'multi' ? 5 : 4;
    const nameInput = document.getElementById('joinNameInput');
    const btn = document.getElementById('joinRoomBtn');
    btn.disabled = input.value.length < minLen || !nameInput.value.trim();
}

function onJoinNameInput() {
    const minLen = room.mode === 'multi' ? 5 : 4;
    const codeInput = document.getElementById('roomCodeInput');
    const nameInput = document.getElementById('joinNameInput');
    const btn = document.getElementById('joinRoomBtn');
    btn.disabled = codeInput.value.length < minLen || !nameInput.value.trim();
}

async function joinRoom() {
    if (!App.userProfile || !database) {
        showToast('ユーザー情報が読み込まれていません', 'error');
        return;
    }

    const roomId = document.getElementById('roomCodeInput').value.trim();
    const guestName = document.getElementById('joinNameInput').value.trim();

    const minLen = room.mode === 'multi' ? 5 : 4;
    if (!roomId || roomId.length < minLen) {
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
    visitedGuessTabs = new Set();
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
                // Bug9修正: 二重レンダーを解消
                if (activeId === 'waitingRoomHostScreen') renderWaitingRoomHost(data);
                if (activeId === 'waitingRoomGuestScreen') renderWaitingRoomGuest(data);

                if (room.role === 'host') {
                    const count = Object.keys(data.players || {}).length;
                    if (room.mode === 'pair' && count >= 2) {
                        database.ref('gameRooms/' + roomId).update({ status: 'setting', lastActivityAt: Date.now() });
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
    const players = Object.entries(data.players || {})
        .sort(([a], [b]) => a === data.hostId ? -1 : b === data.hostId ? 1 : 0);
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
        startBtn.disabled = isMulti ? players.length < 3 : true; // pairは自動遷移、multiは3人以上必須
        startBtn.style.display = isMulti ? 'block' : 'none';
    }

    // ダミー追加ボタン（multiのみ・上限未達時のみ表示）
    const dummyArea = document.getElementById('dummyBtnArea');
    if (dummyArea) {
        dummyArea.style.display = (isMulti && players.length < data.maxPlayers) ? 'block' : 'none';
    }
}

function renderWaitingRoomGuest(data) {
    document.getElementById('waitingRoomCodeGuest').textContent = data.roomId;
    const players = Object.entries(data.players || {})
        .sort(([a], [b]) => a === data.hostId ? -1 : b === data.hostId ? 1 : 0);

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
// テーマ選択（全モード共通・ワイヤーフレームベース）
// ========================================

let sharedSelectedThemeIdx = -1;
let themeInputMode = 'pack'; // 'pack' | 'custom'
let currentPackFilter = 'all';
let customThemeText = '';

const PACK_COLORS = {
    'basic': '#2C3E50',
    'ベーシック': '#2C3E50',
    'love': '#8B3A52',
    'ラブ': '#8B3A52',
    'secret': '#3A2D6B',
    'シークレット': '#3A2D6B',
    'work': '#1C3D2E',
    'ワーク': '#1C3D2E',
};
const DEFAULT_PACK_COLOR = '#2C3E50';

// 全モード共通: テーマ選択画面を表示
function showSharedThemeSelect() {
    sharedSelectedThemeIdx = -1;
    customThemeText = '';
    currentPackFilter = 'all';
    themeInputMode = 'pack';
    document.getElementById('confirmThemeBtn').disabled = true;

    renderPackTabs();
    renderThemeCards('all');
    setThemeInputMode('pack');

    showScreen('themeSelectScreen');
}

// onlineホスト用（Firebase listenerから呼ばれる）
function renderThemeSelectScreen() {
    showSharedThemeSelect();
}

// パックタブ描画
function renderPackTabs() {
    const packs = ['all', ...new Set(themes.filter(t => t.pack).map(t => t.pack))];
    const PACK_LABELS = { all: 'すべて', basic: 'ベーシック', ベーシック: 'ベーシック', love: 'ラブ', ラブ: 'ラブ', secret: 'シークレット', シークレット: 'シークレット', work: 'ワーク', ワーク: 'ワーク' };
    document.getElementById('packTabsRow').innerHTML = packs.map(p => `
        <div class="pack-tab-item ${p === currentPackFilter ? 'pack-tab-item--active' : ''}"
             onclick="switchPackFilter('${p}')">${PACK_LABELS[p] || p}</div>
    `).join('');
}

// パックフィルター切替
function switchPackFilter(pack) {
    currentPackFilter = pack;
    sharedSelectedThemeIdx = -1;
    document.getElementById('confirmThemeBtn').disabled = true;
    document.getElementById('themeInfoPanel').style.display = 'none';
    renderPackTabs();
    renderThemeCards(pack);
}

// テーマカード横スクロール描画
function renderThemeCards(pack) {
    const filtered = pack === 'all' ? themes : themes.filter(t => t.pack === pack);
    const scroll = document.getElementById('themeCardsScroll');
    scroll.innerHTML = filtered.map(t => {
        const origIdx = themes.indexOf(t);
        const color = PACK_COLORS[t.pack] || DEFAULT_PACK_COLOR;
        const packLabel = t.pack === 'custom' ? 'ORIGINAL' : (t.pack || 'BASIC');
        return `<div class="theme-card-item" id="themeCardItem_${origIdx}"
                     onclick="selectTheme(${origIdx})"
                     style="background:${color};">
            <div class="theme-card__white">
                <span class="theme-card__text">${escapeHtml(t.text)}</span>
            </div>
            <div class="theme-card-check"><div class="theme-card-check-circle">✓</div></div>
            <span class="theme-card__pack">${escapeHtml(packLabel.toUpperCase())}</span>
        </div>`;
    }).join('');

    const counter = document.getElementById('scrollCounterText');
    const fill = document.getElementById('scrollBarFill');
    counter.textContent = filtered.length > 0 ? `1 / ${filtered.length}` : '0 / 0';
    fill.style.width = filtered.length > 1 ? `${100 / filtered.length}%` : '100%';

    scroll.scrollLeft = 0;
}

// スクロールインジケーター更新
function onThemeCardsScroll() {
    const scroll = document.getElementById('themeCardsScroll');
    const pack = currentPackFilter;
    const filtered = pack === 'all' ? themes : themes.filter(t => t.pack === pack);
    const total = filtered.length;
    if (total <= 1) return;

    const cardWidth = 200 + 12;
    const current = Math.min(Math.round(scroll.scrollLeft / cardWidth) + 1, total);
    document.getElementById('scrollCounterText').textContent = `${current} / ${total}`;
    document.getElementById('scrollBarFill').style.width = `${(current / total) * 100}%`;
}

// テーマ選択
function selectTheme(idx) {
    sharedSelectedThemeIdx = idx;
    document.querySelectorAll('.theme-card-item').forEach(el => el.classList.remove('theme-card-item--selected'));
    document.getElementById(`themeCardItem_${idx}`)?.classList.add('theme-card-item--selected');

    const theme = themes[idx];
    const panel = document.getElementById('themeInfoPanel');
    document.getElementById('themeInfoText').textContent = theme.text;
    panel.style.display = 'block';

    document.getElementById('confirmThemeBtn').disabled = false;
}

// テーマ入力モード切替（パック/カスタム）
function setThemeInputMode(mode) {
    themeInputMode = mode;
    document.querySelectorAll('.theme-mode-btn').forEach((b, i) => {
        b.classList.toggle('theme-mode-btn--active', (i === 0 && mode === 'pack') || (i === 1 && mode === 'custom'));
    });
    document.getElementById('themePackSection').style.display = mode === 'pack' ? 'flex' : 'none';
    document.getElementById('themeCustomSection').style.display = mode === 'custom' ? 'block' : 'none';

    if (mode === 'custom') {
        sharedSelectedThemeIdx = -1;
        const val = document.getElementById('customThemeInput').value.trim();
        document.getElementById('confirmThemeBtn').disabled = !val;
        setTimeout(() => document.getElementById('customThemeInput').focus(), 50);
    } else {
        document.getElementById('confirmThemeBtn').disabled = sharedSelectedThemeIdx < 0;
    }
}

// カスタムテーマ入力
function onCustomThemeInput(el) {
    customThemeText = el.value.trim();
    const len = el.value.length;
    const pct = (len / 50) * 100;
    document.getElementById('customCharBarFill').style.width = Math.min(pct, 100) + '%';
    const lbl = document.getElementById('customCharLbl');
    lbl.textContent = `${len} / 50`;
    lbl.className = 'custom-char-lbl' + (len >= 50 ? ' rank-char-count--over' : len >= 40 ? ' rank-char-count--warn' : '');
    document.getElementById('confirmThemeBtn').disabled = !customThemeText;
}

// 全モード共通: テーマ確定（モードで処理を分岐）
async function confirmTheme() {
    let theme;
    if (themeInputMode === 'custom') {
        const text = document.getElementById('customThemeInput').value.trim();
        if (!text) { showToast('テーマを入力してください', 'error'); return; }
        theme = { text, pack: 'custom', id: '' };
    } else {
        if (sharedSelectedThemeIdx < 0) return;
        theme = themes[sharedSelectedThemeIdx];
    }

    if (App.currentMode === 'local') {
        localGame.theme = theme;
        localGame.currentRankingPlayerIdx = 0;
        localStartRankingInput();
        return;
    }

    if (room.role !== 'host') return;
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
// ランキング入力（全モード共通）
// ========================================

// online Firebase listenerから呼ばれる
function renderRankingInputScreen(data) {
    renderThemeCard(data.theme, data.themePack || 'basic', document.getElementById('inputThemeCard'));
    updateInputProgress(data);

    const alreadySubmitted = data.rankings?.[App.userProfile.userId];
    document.getElementById('inputSubmittedBanner').style.display = alreadySubmitted ? 'flex' : 'none';
    document.getElementById('rankingInputForm').style.display = alreadySubmitted ? 'none' : 'block';

    // 2回目ゲーム対策: 前ゲームのプレビューを必ずクリア
    const preview = document.getElementById('submittedRankingPreview');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }

    // online時: プレイヤー名非表示、進捗表示
    document.getElementById('inputPlayerName').style.display = 'none';
    document.getElementById('inputProgressArea').style.display = 'block';

    if (!alreadySubmitted) renderRankInputList();
    else {
        // 送信済みの場合もプレビューを再表示
        const rankingData = data.rankings[App.userProfile.userId];
        if (rankingData && preview) {
            const SUFFIXES = ['st','nd','rd','th','th'];
            preview.innerHTML = Object.entries(rankingData)
                .sort(([a],[b]) => parseInt(a)-parseInt(b))
                .map(([r, v]) => `
                    <div style="display:flex;align-items:center;gap:10px;padding:7px 12px;background:#fff;border:1px solid var(--border);border-radius:10px;margin-bottom:5px;">
                        <span style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:900;font-style:italic;color:var(--text-secondary);min-width:30px;">${parseInt(r)}<span style="font-size:9px;">${SUFFIXES[parseInt(r)-1]}</span></span>
                        <span style="font-size:13px;font-weight:700;">${escapeHtml(v)}</span>
                    </div>`).join('');
            preview.style.display = 'block';
        }
    }
    showScreen('rankingInputScreen');
}

// 全モード共通: ランキング入力画面を表示（localモード用エントリー）
function showSharedRankingInput(playerName = null) {
    const isLocal = App.currentMode === 'local';

    // プレイヤー名表示切替
    const nameEl = document.getElementById('inputPlayerName');
    if (playerName) {
        nameEl.textContent = `${playerName}さんの番`;
        nameEl.style.display = 'block';
    } else {
        nameEl.style.display = 'none';
    }

    // 進捗ピル: onlineのみ表示
    document.getElementById('inputProgressArea').style.display = isLocal ? 'none' : 'block';

    // 送信バナーリセット
    document.getElementById('inputSubmittedBanner').style.display = 'none';
    document.getElementById('rankingInputForm').style.display = 'block';

    // テーマカード
    if (isLocal && localGame.theme) {
        renderThemeCard(localGame.theme.text, localGame.theme.pack || 'basic', document.getElementById('inputThemeCard'));
    }

    renderRankInputList();
    showScreen('rankingInputScreen');
}

const DRAG_HANDLE_SVG = `<svg width="14" height="20" viewBox="0 0 12 18" fill="currentColor" style="display:block;"><circle cx="3.5" cy="3.5" r="1.6"/><circle cx="8.5" cy="3.5" r="1.6"/><circle cx="3.5" cy="9" r="1.6"/><circle cx="8.5" cy="9" r="1.6"/><circle cx="3.5" cy="14.5" r="1.6"/><circle cx="8.5" cy="14.5" r="1.6"/></svg>`;

// 全モード共通: 入力リスト描画（オプションで事前データを挿入）
function renderRankInputList(prefillData = null) {
    const SUFFIXES = ['st','nd','rd','th','th'];
    document.getElementById('rankInputList').innerHTML = [1,2,3,4,5].map(r => `
        <div class="rank-item">
            <div class="rank-badge-area">
                <div class="rank-badge"><span style="font-size:17px;line-height:1;">${r}</span><span style="font-size:9px;opacity:0.6;">${SUFFIXES[r-1]}</span></div>
                <span class="rank-char-count" id="rankCharCount_${r}">0/50</span>
            </div>
            <textarea class="rank-input" rows="1" id="rankInput_${r}"
                placeholder="${r}位を入力"
                maxlength="50"
                oninput="onRankInput(); autoResize(this); updateRankCharCount(${r}, this.value)"
                onkeydown="onRankKeydown(event, ${r})"></textarea>
            <div class="rank-drag-handle">${DRAG_HANDLE_SVG}</div>
        </div>
    `).join('');

    // 事前データ挿入（修正時）
    if (prefillData) {
        [1,2,3,4,5].forEach(r => {
            const el = document.getElementById(`rankInput_${r}`);
            const val = prefillData[String(r)] || '';
            if (el && val) {
                el.value = val;
                autoResize(el);
                updateRankCharCount(r, val);
            }
        });
        onRankInput();
    }

    if (inputSortable) { inputSortable.destroy(); inputSortable = null; }
    inputSortable = Sortable.create(document.getElementById('rankInputList'), {
        animation: 150,
        handle: '.rank-drag-handle',
        onEnd: updateInputBadges
    });

    // 常にボタンテキストをリセット（2回目ゲームのバグ対策）
    const btn = document.getElementById('submitRankingBtn');
    if (btn) {
        btn.textContent = 'あなたのTOP5を確定する';
        btn.disabled = !prefillData;
    }
    if (!prefillData) setTimeout(() => document.getElementById('rankInput_1')?.focus(), 100);
}

// エンターキーで次フィールドへ（ドラッグ後の視覚順で移動）
function onRankKeydown(e, rank) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const allInputs = Array.from(document.querySelectorAll('#rankInputList .rank-input'));
        const idx = allInputs.findIndex(el => el === e.target);
        if (idx >= 0 && idx < allInputs.length - 1) allInputs[idx + 1].focus();
        return false;
    }
}

// 文字数カウンター更新（常時表示）
function updateRankCharCount(rank, value) {
    const el = document.getElementById(`rankCharCount_${rank}`);
    if (!el) return;
    const len = value.length;
    el.textContent = `${len}/50`;
    el.className = 'rank-char-count' + (len >= 50 ? ' rank-char-count--over' : len >= 40 ? ' rank-char-count--warn' : '');
}

// 全モード共通: ドラッグ後バッジ更新（サイズ・スタイルを維持）
function updateInputBadges() {
    const SUFFIXES = ['st','nd','rd','th','th'];
    document.querySelectorAll('#rankInputList .rank-badge').forEach((el, i) => {
        el.innerHTML = `<span style="font-size:17px;line-height:1;">${i+1}</span><span style="font-size:9px;opacity:0.6;">${SUFFIXES[i]}</span>`;
    });
    // プレースホルダーも視覚順で更新
    document.querySelectorAll('#rankInputList .rank-input').forEach((el, i) => {
        el.placeholder = `${i+1}位を入力`;
    });
    onRankInput();
}

// 全モード共通: 入力バリデーション（DOM順で全件確認）
function onRankInput() {
    const inputs = document.querySelectorAll('#rankInputList .rank-input');
    const all = inputs.length === 5 && Array.from(inputs).every(el => el.value.trim().length > 0);
    document.getElementById('submitRankingBtn').disabled = !all;
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

// 全モード共通: 送信ボタンのディスパッチャー（カスタム確認モーダル）
// ※ ID順でなくDOM(視覚)順で読む（ドラッグ後の不整合バグ対策）
function submitRanking() {
    const items = {};
    const domItems = document.querySelectorAll('#rankInputList .rank-item');
    let allFilled = true;
    domItems.forEach((el, i) => {
        const input = el.querySelector('.rank-input');
        const val = input ? input.value.trim() : '';
        if (!val) allFilled = false;
        items[i + 1] = val;
    });
    if (!allFilled) { showToast('全ての順位を入力してください', 'error'); return; }

    showRankConfirmModal(items, () => {
        if (App.currentMode === 'local') localHandleSubmitRanking();
        else onlineHandleSubmitRanking();
    });
}

// 送信確認モーダルを表示
function showRankConfirmModal(items, onConfirm) {
    const SUFFIXES = ['st','nd','rd','th','th'];
    document.getElementById('rankConfirmList').innerHTML = [1,2,3,4,5].map(r => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);">
            <span style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:900;font-style:italic;color:var(--text-secondary);min-width:32px;flex-shrink:0;">${r}<span style="font-size:9px;">${SUFFIXES[r-1]}</span></span>
            <span style="font-size:13px;font-weight:700;color:var(--text-primary);flex:1;min-width:0;word-break:break-all;overflow-wrap:break-word;">${escapeHtml(items[r] || '')}</span>
        </div>
    `).join('');
    document.getElementById('rankConfirmModal').classList.add('modal-overlay--active');
    document.getElementById('rankConfirmOkBtn').onclick = () => {
        document.getElementById('rankConfirmModal').classList.remove('modal-overlay--active');
        onConfirm();
    };
}

// online専用: Firebase送信処理
async function onlineHandleSubmitRanking() {
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

        const snap = await ref.once('value');
        const d = snap.val();
        const allSubmitted = Object.keys(d.players || {}).every(id => d.rankings?.[id]);
        if (allSubmitted) {
            await ref.update({ status: 'guessing', lastActivityAt: Date.now() });
        }

        document.getElementById('rankingInputForm').style.display = 'none';
        document.getElementById('inputSubmittedBanner').style.display = 'flex';

        // 送信後ランキングを表示
        const SUFFIXES = ['st','nd','rd','th','th'];
        const preview = document.getElementById('submittedRankingPreview');
        if (preview) {
            preview.innerHTML = Object.entries(rankingData)
                .sort(([a],[b]) => parseInt(a)-parseInt(b))
                .map(([r, v]) => `
                    <div class="rank-row--card">
                        <span class="rank-num">${parseInt(r)}<span style="font-size:9px;">${SUFFIXES[parseInt(r)-1]}</span></span>
                        <span class="rank-text">${escapeHtml(v)}</span>
                    </div>`).join('');
            preview.style.display = 'block';
        }

    } catch (err) {
        console.error('ランキング送信エラー:', err);
        showToast('送信に失敗しました', 'error');
        btn.disabled = false;
        btn.textContent = 'あなたのTOP5を確定する';
    }
}

// 修正：Firebaseから送信を撤回してプリフィル状態で再表示
async function editMyRanking() {
    const submittedData = room.data?.rankings?.[App.userProfile?.userId] || null;
    try {
        await database.ref('gameRooms/' + room.roomId).update({
            [`rankings/${App.userProfile.userId}`]: null,
            [`players/${App.userProfile.userId}/status`]: 'waiting',
            lastActivityAt: Date.now()
        });
    } catch (err) {
        showToast('修正の準備に失敗しました', 'error');
        return;
    }
    document.getElementById('inputSubmittedBanner').style.display = 'none';
    const preview = document.getElementById('submittedRankingPreview');
    if (preview) preview.style.display = 'none';
    document.getElementById('rankingInputForm').style.display = 'block';
    renderRankInputList(submittedData);
}

function updateInputProgress(data) {
    const players = Object.entries(data.players || {});
    const submitted = players.filter(([id]) => data.rankings?.[id]).length;
    document.getElementById('inputProgressText').textContent = `${submitted} / ${players.length} 人が入力完了`;

    // ドロップダウン内容を更新
    const dropdown = document.getElementById('inputProgressDropdown');
    if (dropdown) {
        dropdown.innerHTML = players.map(([id, p]) => {
            const done = !!data.rankings?.[id];
            return `<div class="progress-dropdown__item">
                <span style="color:${done ? 'var(--success)' : 'var(--text-muted)'};">${done ? '✓' : '○'}</span>
                <span style="color:var(--text-primary);font-weight:700;">${escapeHtml(p.displayName)}</span>
                <span style="color:var(--text-muted);font-size:10px;margin-left:auto;">${done ? '入力済' : '未入力'}</span>
            </div>`;
        }).join('');
    }
}

function toggleProgressDropdown() {
    const dropdown = document.getElementById('inputProgressDropdown');
    if (dropdown) dropdown.classList.toggle('progress-dropdown--open');
}

// ========================================
// ランキング予想
// ========================================

function renderGuessScreen(data) {
    renderThemeCard(data.theme, data.themePack || 'basic', document.getElementById('guessThemeCard'));
    updateGuessProgress(data);

    // 2回目ゲーム対策: guessエリアをリセット
    document.getElementById('guessSubmittedBanner').style.display = 'none';
    document.getElementById('guessPersonArea').style.display = 'block';
    const lockedPreview = document.getElementById('guessLockedPreview');
    if (lockedPreview) { lockedPreview.innerHTML = ''; lockedPreview.style.display = 'none'; }
    const submitBtn = document.getElementById('submitGuessBtn');
    if (submitBtn) { submitBtn.style.display = 'block'; submitBtn.disabled = true; submitBtn.textContent = '予想を確定する'; }

    const players = Object.entries(data.players || {});
    const targets = players.filter(([id]) => id !== App.userProfile.userId);

    // タブ（Bug3修正: 関数名を直接記述）
    document.getElementById('guessTabs').innerHTML = targets.map(([id, p], i) => `
        <div class="person-tab${i === 0 ? ' person-tab--active' : ''}"
             id="guessTab_${id}" onclick="onlineSwitchGuessTab('${id}')">${escapeHtml(p.displayName)}</div>
    `).join('');

    // 最初のターゲットを表示（訪問済みタブをリセット、Sortable全破棄）
    Object.values(guessSortables).forEach(s => { try { s.destroy(); } catch(e) {} });
    guessSortables = {};
    guessDraft = {};
    guessCurrentTargetId = null;
    visitedGuessTabs = new Set();
    onlineSwitchGuessTab(targets[0][0]); // ← ここで最初のタブを訪問済みに記録

    // ボタン状態: 全タブ訪問済みのときのみ解除（1人なら即解除）
    updateGuessSubmitBtnState(targets);

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
    visitedGuessTabs.add(targetId); // 訪問済みとして記録

    document.querySelectorAll('#guessTabs .person-tab').forEach(el => el.classList.remove('person-tab--active'));
    document.getElementById(`guessTab_${targetId}`)?.classList.add('person-tab--active');

    renderGuessSortList(targetId);

    // 全タブを訪問済みならボタン解除
    const data = room.data;
    if (data) {
        const targets = Object.entries(data.players || {}).filter(([id]) => id !== App.userProfile?.userId);
        updateGuessSubmitBtnState(targets);
    }
}

function renderGuessSortList(targetId) {
    const data = room.data;
    const ranking = data.rankings?.[targetId];
    if (!ranking) return;

    const items = Object.values(ranking);
    const shuffled = guessDraft[targetId]
        ? Object.values(guessDraft[targetId])
        : shuffleArray([...items]);

    const SUFFIXES = ['st','nd','rd','th','th'];
    document.getElementById('guessSortList').innerHTML = shuffled.map((item, i) => `
        <div class="rank-item" data-item="${escapeHtml(item)}" style="cursor:grab;">
            <div class="rank-badge-area">
                <div class="rank-badge"><span style="font-size:17px;line-height:1;">${i+1}</span><span style="font-size:9px;opacity:0.6;">${SUFFIXES[i]}</span></div>
            </div>
            <div style="flex:1;min-width:0;font-size:14px;font-weight:500;padding:1px 0;word-break:break-all;overflow-wrap:break-word;">${escapeHtml(item)}</div>
            <div class="rank-drag-handle">${DRAG_HANDLE_SVG}</div>
        </div>
    `).join('');

    // 同じDOMに複数インスタンスが重複しないよう全て破棄してから1つ生成
    Object.values(guessSortables).forEach(s => { try { s.destroy(); } catch(e) {} });
    guessSortables = {};
    guessSortables[targetId] = Sortable.create(document.getElementById('guessSortList'), {
        animation: 150,
        handle: '.rank-drag-handle',
        onEnd: () => updateGuessBadges()
    });
}

function updateGuessBadges() {
    const SUFFIXES = ['st','nd','rd','th','th'];
    document.querySelectorAll('#guessSortList .rank-badge').forEach((el, i) => {
        el.innerHTML = `<span style="font-size:17px;line-height:1;">${i+1}</span><span style="font-size:9px;opacity:0.6;">${SUFFIXES[i]}</span>`;
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

    // カスタム確認モーダルを表示
    showGuessConfirmModal(data, targets, async () => {
        await doSubmitGuess(data, targets);
    });
}

// 予想確認モーダルを表示
function showGuessConfirmModal(data, targets, onConfirm) {
    const SUFFIXES = ['st','nd','rd','th','th'];
    let html = '';
    targets.forEach(tid => {
        const draft = guessDraft[tid] || {};
        const targetName = data.players[tid]?.displayName || '不明';
        html += `<div style="margin-bottom:14px;">
            <div style="font-size:12px;font-weight:800;color:var(--text-muted);margin-bottom:8px;">${escapeHtml(targetName)}さんのランク予想</div>
            ${[1,2,3,4,5].map(r => `
                <div class="rank-row">
                    <span class="rank-num rank-num--sm">${r}<span style="font-size:8px;">${SUFFIXES[r-1]}</span></span>
                    <span class="rank-text rank-text--sm">${escapeHtml(draft[String(r)] || '')}</span>
                </div>`).join('')}
        </div>`;
    });
    document.getElementById('guessConfirmList').innerHTML = html;
    document.getElementById('guessConfirmModal').classList.add('modal-overlay--active');
    document.getElementById('guessConfirmOkBtn').onclick = () => {
        document.getElementById('guessConfirmModal').classList.remove('modal-overlay--active');
        onConfirm();
    };
}

async function doSubmitGuess(data, targets) {
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

        const snap = await ref.once('value');
        const d = snap.val();
        const allGuessed = Object.keys(d.players || {}).every(id => d.guesses?.[id]);
        if (allGuessed) {
            await ref.update({ status: 'finished', lastActivityAt: Date.now() });
        }

        document.getElementById('guessSubmittedBanner').style.display = 'flex';
        document.getElementById('guessPersonArea').style.display = 'none';
        btn.style.display = 'none';

        // 予想内容をロック表示（guessSortListの内容をread-onlyで再描画）
        const lockedPreview = document.getElementById('guessLockedPreview');
        if (lockedPreview) {
            const SUFFIXES = ['st','nd','rd','th','th'];
            let previewHtml = '';
            targets.forEach(tid => {
                const draft = guessDraft[tid] || {};
                const targetName = data.players[tid]?.displayName || '';
                previewHtml += `<div style="margin-bottom:10px;">
                    <div style="font-size:11px;font-weight:800;color:var(--text-muted);margin-bottom:6px;">${escapeHtml(targetName)}さんへの予想</div>
                    ${[1,2,3,4,5].map(r => `
                        <div class="rank-row--card">
                            <span class="rank-num">${r}<span style="font-size:9px;">${SUFFIXES[r-1]}</span></span>
                            <span class="rank-text">${escapeHtml(draft[String(r)] || '')}</span>
                        </div>`).join('')}
                </div>`;
            });
            lockedPreview.innerHTML = previewHtml;
            lockedPreview.style.display = 'block';
        }

    } catch (err) {
        console.error('予想送信エラー:', err);
        showToast('送信に失敗しました', 'error');
        btn.disabled = false;
        btn.textContent = '予想を送信する';
    }
}

// 予想の修正（Firebaseから撤回、確定済み順番を保持して再描画）
async function editMyGuess() {
    const userId = App.userProfile?.userId;
    // Firebase削除前に送信済みデータを保存（順番保持のため）
    const prevGuesses = room.data?.guesses?.[userId] || {};
    try {
        await database.ref(`gameRooms/${room.roomId}/guesses/${userId}`).remove();
    } catch (err) {
        showToast('修正の準備に失敗しました', 'error');
        return;
    }
    document.getElementById('guessSubmittedBanner').style.display = 'none';
    const lockedPreview = document.getElementById('guessLockedPreview');
    if (lockedPreview) { lockedPreview.innerHTML = ''; lockedPreview.style.display = 'none'; }
    document.getElementById('guessPersonArea').style.display = 'block';
    // 確定済みの順番をドラフトに復元（再シャッフルしない）
    guessDraft = { ...prevGuesses };
    if (guessCurrentTargetId) renderGuessSortList(guessCurrentTargetId);
    const btn = document.getElementById('submitGuessBtn');
    btn.style.display = 'block';
    btn.disabled = false;
    btn.textContent = '予想を確定する';
}

function updateGuessProgress(data) {
    const players = Object.entries(data.players || {});
    const guessed = players.filter(([id]) => data.guesses?.[id]).length;
    document.getElementById('guessProgressText').textContent = `${guessed} / ${players.length} 人が予想完了`;

    const dropdown = document.getElementById('guessProgressDropdown');
    if (dropdown) {
        dropdown.innerHTML = players.map(([id, p]) => {
            const done = !!data.guesses?.[id];
            return `<div class="progress-dropdown__item">
                <span style="color:${done ? 'var(--success)' : 'var(--text-muted)'};">${done ? '✓' : '○'}</span>
                <span style="color:var(--text-primary);font-weight:700;">${escapeHtml(p.displayName)}</span>
                <span style="color:var(--text-muted);font-size:10px;margin-left:auto;">${done ? '予想済' : '未予想'}</span>
            </div>`;
        }).join('');
    }

}

// 全タブ訪問済みのときのみ「予想を確定する」を解除
function updateGuessSubmitBtnState(targets) {
    const submitBtn = document.getElementById('submitGuessBtn');
    if (!submitBtn || submitBtn.style.display === 'none') return;
    const allVisited = targets.every(([id]) => visitedGuessTabs.has(id));
    submitBtn.disabled = !allVisited;
}

function toggleGuessProgressDropdown() {
    const dropdown = document.getElementById('guessProgressDropdown');
    if (dropdown) dropdown.classList.toggle('progress-dropdown--open');
}

// ========================================
// 結果画面
// ========================================

function renderOnlineResultScreen(data) {
    const players = Object.entries(data.players || {});

    // スコア計算（内訳も集計）
    const scores = {};
    players.forEach(([guesserId]) => {
        let totalScore = 0;
        const breakdown = { 0: 0, 1: 0, 2: 0, 3: 0, miss: 0 };
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
                    if (diff <= 3) breakdown[diff]++;
                    else breakdown.miss++;
                } else {
                    breakdown.miss++;
                }
            }
        });
        scores[guesserId] = { totalScore, breakdown };
    });

    const sorted = [...players]
        .map(([id, p]) => ({ id, name: p.displayName, score: scores[id]?.totalScore || 0, breakdown: scores[id]?.breakdown || {} }))
        .sort((a, b) => b.score - a.score);

    // 順位付け（同点=同立対応）
    sorted.forEach((p, i) => {
        if (i === 0) p.rank = 1;
        else if (p.score === sorted[i - 1].score) p.rank = sorted[i - 1].rank;
        else p.rank = i + 1;
    });

    const targetCount = players.length - 1;
    const maxScore = targetCount * 50;
    const packColor = PACK_COLORS[data.themePack] || DEFAULT_PACK_COLOR;
    const isHost = room.role === 'host';

    // ヒーロー描画（テーマカード中央配置、参加人数・最大PT削除）
    const heroEl = document.getElementById('resultHero');
    heroEl.innerHTML = `
        <div class="hero__bubble hero__bubble--1"></div>
        <div class="hero__bubble hero__bubble--2"></div>
        <div class="hero-title" style="margin-bottom:12px;">結果発表</div>
        <div class="hero__theme" style="margin-bottom:16px;">
            <div class="theme-card" style="background:${packColor};box-shadow:0 4px 16px rgba(0,0,0,0.4);">
                <div class="theme-card__white">
                    <span class="theme-card__text">${escapeHtml(data.theme)}</span>
                </div>
                <span class="theme-card__pack">${escapeHtml(data.themePack === 'custom' ? 'ORIGINAL' : (data.themePack || 'basic').toUpperCase())}</span>
            </div>
        </div>
        <div style="font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:8px;">ランキング</div>
        <div style="display:flex;flex-direction:column;gap:4px;">
            ${sorted.map((p, i) => {
                const is1st = p.rank === 1;
                const rankBadgeBg = is1st ? '#F59E0B' : p.rank===2 ? 'rgba(255,255,255,0.2)' : p.rank===3 ? 'rgba(180,100,30,0.45)' : 'rgba(255,255,255,0.08)';
                const rankBadgeColor = p.rank<=3 ? '#fff' : 'rgba(255,255,255,0.4)';
                const rankBadgeShadow = is1st ? 'box-shadow:0 0 0 3px rgba(245,158,11,0.35),0 0 14px rgba(245,158,11,0.5);' : '';
                const rankBadgeSize = is1st ? '24px' : '20px';
                const scoreColor = is1st ? '#F59E0B' : 'rgba(255,255,255,0.7)';
                const nameSz = is1st ? '14px' : '12px';
                const scoreSz = is1st ? '18px' : '14px';
                // 内訳テキスト（はずれ除く）
                const bd = p.breakdown || {};
                const bdText = `あたり×${bd[0]||0} おしい×${bd[1]||0} ちかい×${bd[2]||0} かすり×${bd[3]||0}`;
                // 下位から上位の順にアニメーション（最後のアイテムが先に表示）
                const delay = (sorted.length - 1 - i) * 0.10;
                return `<div style="display:flex;align-items:center;gap:8px;padding:${is1st?'9px':'7px'} 10px;border-radius:8px;animation:su 0.4s ${delay}s both;">
                    <div style="display:flex;flex-direction:column;align-items:center;min-width:${is1st?'32px':'28px'};flex-shrink:0;">
                        <div style="width:${rankBadgeSize};height:${rankBadgeSize};border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-size:${is1st?'11px':'9px'};font-weight:900;font-style:italic;background:${rankBadgeBg};color:${rankBadgeColor};${rankBadgeShadow}">${p.rank}</div>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:${nameSz};font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.name)}</div>
                        <div style="font-size:9px;color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${bdText}</div>
                    </div>
                    <span style="font-family:'DM Sans',sans-serif;font-size:${scoreSz};font-weight:900;font-style:italic;color:${scoreColor};flex-shrink:0;">${p.score}<span style="font-size:9px;opacity:0.5;">/${maxScore}pt</span></span>
                </div>`;
            }).join('')}
        </div>`;

    // コンテンツ描画
    const contentEl = document.getElementById('resultContent');
    contentEl.innerHTML = `
        <div style="padding:10px 20px 6px;">
            <div style="font-size:10px;font-weight:600;color:var(--text-secondary);white-space:nowrap;overflow-x:auto;">
                あたり(±0):10pt&emsp;おしい(±1):6pt&emsp;ちかい(±2):3pt&emsp;かすり(±3):1pt&emsp;はずれ(±4):0pt
            </div>
        </div>
        <div style="padding:8px 20px;">
            <div style="font-size:16px;font-weight:900;color:var(--text-primary);margin-bottom:8px;">個人詳細</div>
            <div class="person-tabs" id="resultTabs" style="margin-bottom:12px;"></div>
            <div id="resultPersonDetail"></div>
        </div>
        <div style="padding:0 20px;margin-top:8px;display:flex;flex-direction:column;gap:8px;padding-bottom:60px;">
            ${isHost ? `<button class="btn btn--primary" onclick="if(confirm('テーマを変えてもう一度あそびますか？'))playAgain()">テーマを変えてもう一度あそぶ</button>` : ''}
            <button class="btn btn--outline" onclick="confirmGoHome()">HOMEにもどる</button>
        </div>`;

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
        totalScore: sorted.reduce((s, p) => s + p.score, 0),
        totalMaxScore: maxScore * players.length,
        answers: data.rankings || {}
    }));

    showScreen('resultScreen');
}

function confirmGoHome() {
    if (confirm('HOMEに戻りますか？\nゲームを終了します。')) {
        cleanupRoom();
        showScreen('topScreen');
    }
}

function showOnlinePersonResult(targetId) {
    document.querySelectorAll('#resultTabs .person-tab').forEach(el => el.classList.remove('person-tab--active'));
    document.getElementById(`resultTab_${targetId}`)?.classList.add('person-tab--active');

    const data = room.data;
    const target = data.players?.[targetId];
    const correct = data.rankings?.[targetId];
    if (!correct || !target) return;

    const guessers = Object.entries(data.players || {}).filter(([id]) => id !== targetId);

    let html = `<div style="margin-bottom:10px;font-size:11px;font-weight:700;color:var(--text-secondary);">${escapeHtml(target.displayName)}さんの正しいランク＆参加者の予想</div>`;

    const SUFFIXES = ['st','nd','rd','th','th'];
    for (let rank = 1; rank <= 5; rank++) {
        const item = correct[String(rank)];
        html += `<div class="card" style="margin-bottom:6px;">
            <div style="display:flex;align-items:center;margin-bottom:8px;gap:8px;">
                <span style="font-family:'DM Sans',sans-serif;font-size:16px;font-weight:900;font-style:italic;color:var(--text-primary);min-width:28px;">${rank}<span style="font-size:10px;">${SUFFIXES[rank-1]}</span></span>
                <span style="font-size:14px;font-weight:700;word-break:break-all;overflow-wrap:break-word;">${escapeHtml(item)}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--border);padding-top:6px;">
                ${guessers.map(([gId, g]) => {
                    const guess = data.guesses?.[gId]?.[targetId];
                    let gRank = 0;
                    if (guess) for (let r = 1; r <= 5; r++) { if (guess[String(r)] === item) { gRank = r; break; } }
                    const diff = gRank > 0 ? Math.abs(gRank - rank) : 99;
                    const { icon, label, color } = gRank > 0 ? getScoreLabel(diff) : { icon: '×', label: 'はずれ', color: '#334155' };
                    const pt = gRank > 0 ? calcItemScore(diff) : 0;
                    const rankDisplay = gRank > 0 ? `${gRank}${SUFFIXES[gRank-1]}` : '-';
                    const ptDisplay = pt > 0 ? `+${pt}pt` : `${pt}pt`;
                    // 全要素右寄せ: 名前 → 何位と予想 → ラベル → +pt
                    return `<div style="display:flex;align-items:center;justify-content:flex-end;font-size:12px;gap:6px;">
                        <span style="font-weight:700;color:var(--text-primary);">${escapeHtml(g.displayName)}</span>
                        <span style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;font-style:italic;color:var(--text-primary);">${rankDisplay}</span>
                        <span style="color:${color};font-weight:700;font-size:11px;">${icon} ${label}</span>
                        <span style="color:${color};font-weight:800;min-width:36px;text-align:right;">${ptDisplay}</span>
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
    await playAgain(); // playAgain と同じフローでテーマ選択に戻る
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

// ========================================
// ダミープレイヤー（テスト用）
// ========================================
const DUMMY_NAMES = ['テスト太郎', 'テスト花子', 'テスト次郎', 'テスト三郎', 'テスト春子'];
let dummyCount = 0;

async function addDummyPlayer() {
    if (!room.roomId) return;
    const roomRef = database.ref('gameRooms/' + room.roomId);
    const snap = await roomRef.once('value');
    const data = snap.val();
    const playerCount = Object.keys(data.players || {}).length;
    if (playerCount >= data.maxPlayers) {
        showToast('最大人数に達しています', 'error');
        return;
    }
    const dummyId = 'dummy_' + Date.now() + '_' + dummyCount;
    const name = DUMMY_NAMES[dummyCount % DUMMY_NAMES.length];
    dummyCount++;
    await roomRef.update({
        ['players/' + dummyId]: { displayName: name, status: 'waiting', isDummy: true },
        lastActivityAt: Date.now()
    });
    startDummyListener(dummyId, roomRef);
}

function startDummyListener(dummyId, roomRef) {
    roomRef.on('value', async (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        if (!data.players || !data.players[dummyId]) return;

        if (data.status === 'inputting' && !(data.rankings && data.rankings[dummyId])) {
            await dummySubmitRanking(dummyId, roomRef, data);
        }
        if (data.status === 'guessing' && !(data.guesses && data.guesses[dummyId])) {
            await dummySubmitGuess(dummyId, roomRef, data);
        }
    });
}

async function dummySubmitRanking(dummyId, roomRef, data) {
    const items = ['テスト①', 'テスト②', 'テスト③', 'テスト④', 'テスト⑤'];
    shuffleArray(items);
    const ranking = {};
    items.forEach((item, i) => { ranking[String(i + 1)] = item; });

    setTimeout(async () => {
        try {
            await roomRef.update({
                ['rankings/' + dummyId]: ranking,
                ['players/' + dummyId + '/status']: 'completed',
                lastActivityAt: Date.now()
            });
            // 全員提出済みならguessingへ
            const snap = await roomRef.once('value');
            const d = snap.val();
            const allPlayers = Object.keys(d.players || {});
            if (allPlayers.every(id => d.rankings && d.rankings[id])) {
                await roomRef.update({ status: 'guessing', lastActivityAt: Date.now() });
            }
        } catch (e) { console.error('ダミーランキング提出エラー:', e); }
    }, 1500 + Math.random() * 2000);
}

async function dummySubmitGuess(dummyId, roomRef, data) {
    const allPlayers = Object.keys(data.players || {});
    const targets = allPlayers.filter(id => id !== dummyId);
    const guessData = {};
    targets.forEach(targetId => {
        const correct = data.rankings?.[targetId];
        if (!correct) return;
        const items = Object.values(correct);
        shuffleArray(items);
        const guess = {};
        items.forEach((item, i) => { guess[String(i + 1)] = item; });
        guessData[targetId] = guess;
    });

    setTimeout(async () => {
        try {
            await roomRef.update({
                ['guesses/' + dummyId]: guessData,
                ['players/' + dummyId + '/status']: 'guessed',
                lastActivityAt: Date.now()
            });
            // 全員提出済みならfinishedへ
            const snap = await roomRef.once('value');
            const d = snap.val();
            const allPlayers2 = Object.keys(d.players || {});
            if (allPlayers2.every(id => d.guesses && d.guesses[id])) {
                await roomRef.update({ status: 'finished', finishedAt: Date.now(), lastActivityAt: Date.now() });
            }
        } catch (e) { console.error('ダミー予想提出エラー:', e); }
    }, 1500 + Math.random() * 2000);
}
