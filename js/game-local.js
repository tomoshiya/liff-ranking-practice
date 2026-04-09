// ========================================
// 1台であそぶ モード
// ========================================
// TODO: Phase 6-Rebuild で実装

let localGame = {
    players: [],
    theme: null,
    rankings: {},
    guesses: {},
    currentRankingPlayerIdx: 0,
    currentGuessPlayerIdx: 0,
    currentGuessTargetIdx: 0
};

const AVATAR_COLORS = ['#5C6BC0','#26A69A','#EF5350','#FFA726','#66BB6A','#AB47BC','#78909C','#8D6E63'];

function startLocalMode() {
    App.currentMode = 'local';
    localGame = { players: [], theme: null, rankings: {}, guesses: {}, currentRankingPlayerIdx: 0, currentGuessPlayerIdx: 0, currentGuessTargetIdx: 0 };
    renderLocalPlayerInputs();
    showScreen('localSetupScreen');
}

function renderLocalPlayerInputs() {
    const container = document.getElementById('localPlayerInputs');
    container.innerHTML = '';
    localGame.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:8px;';
        div.innerHTML = `
            <div class="avatar" style="background:${AVATAR_COLORS[i % AVATAR_COLORS.length]};">${p.name ? p.name[0] : '?'}</div>
            <input type="text" class="input-field" style="flex:1;" placeholder="${i + 1}人目の名前"
                value="${escapeHtml(p.name)}"
                oninput="localUpdatePlayerName(${i}, this.value)" maxlength="10">
            ${localGame.players.length > 2 ? `<button onclick="localRemovePlayer(${i})" style="color:var(--text-muted);font-size:18px;padding:4px;">×</button>` : ''}
        `;
        container.appendChild(div);
    });

    if (localGame.players.length === 0) {
        localGame.players = [{ id: 1, name: '' }, { id: 2, name: '' }];
        renderLocalPlayerInputs();
    }

    const addBtn = document.getElementById('localAddPlayerBtn');
    if (addBtn) addBtn.style.display = localGame.players.length >= 8 ? 'none' : 'block';

    updateLocalStartBtn();
}

function localUpdatePlayerName(idx, value) {
    localGame.players[idx].name = value.trim();
    const avatar = document.querySelectorAll('#localPlayerInputs .avatar')[idx];
    if (avatar) avatar.textContent = value[0] || '?';
    updateLocalStartBtn();
}

function localAddPlayer() {
    if (localGame.players.length >= 8) return;
    localGame.players.push({ id: Date.now(), name: '' });
    renderLocalPlayerInputs();
}

function localRemovePlayer(idx) {
    if (localGame.players.length <= 2) return;
    localGame.players.splice(idx, 1);
    renderLocalPlayerInputs();
}

function updateLocalStartBtn() {
    const btn = document.getElementById('localStartBtn');
    if (!btn) return;
    btn.disabled = localGame.players.some(p => !p.name);
}

// テーマ選択: 共通画面を使用
function localStartGame() {
    showSharedThemeSelect();
}

// ランキング入力: 共通画面を使用
function localStartRankingInput() {
    const player = localGame.players[localGame.currentRankingPlayerIdx];
    showSharedRankingInput(player.name);
}

// local専用: ランキング送信処理（game-pair.jsのsubmitRankingから呼ばれる）
function localHandleSubmitRanking() {
    const player = localGame.players[localGame.currentRankingPlayerIdx];
    const ranking = {};
    const items = document.querySelectorAll('#rankInputList .rank-item');
    for (let i = 0; i < items.length; i++) {
        const input = items[i].querySelector('.rank-input');
        const val = input ? input.value.trim() : '';
        if (!val) { showToast(`${i+1}位を入力してください`, 'error'); return; }
        ranking[String(i + 1)] = val;
    }
    localGame.rankings[player.id] = ranking;

    const nextIdx = localGame.currentRankingPlayerIdx + 1;
    if (nextIdx < localGame.players.length) {
        const nextPlayer = localGame.players[nextIdx];
        document.getElementById('localHandoffTitle').textContent = `次は${nextPlayer.name}さんの番です`;
        document.getElementById('localHandoffMessage').textContent = `${nextPlayer.name}さんが\n以下のボタンを押してください`;
        document.getElementById('localHandoffBtn').textContent = 'はじめる';
        document.getElementById('localHandoffBtn').onclick = () => {
            localGame.currentRankingPlayerIdx = nextIdx;
            localStartRankingInput();
        };
        showScreen('localHandoffScreen');
    } else {
        localGame.currentGuessPlayerIdx = 0;
        localGame.currentGuessTargetIdx = 0;
        localStartGuessPhase();
    }
}

function localHandoffContinue() {
    // localHandoffBtn.onclickで処理
}

function localStartGuessPhase() {
    const guesser = localGame.players[localGame.currentGuessPlayerIdx];
    // 受け渡し画面
    document.getElementById('localHandoffTitle').textContent = `次は${guesser.name}さんの番です`;
    document.getElementById('localHandoffMessage').textContent = `${guesser.name}さんが\n以下のボタンを押してください`;
    document.getElementById('localHandoffBtn').textContent = '予想を始める';
    document.getElementById('localHandoffBtn').onclick = () => localShowGuessScreen();
    showScreen('localHandoffScreen');
}

function localShowGuessScreen() {
    const guesser = localGame.players[localGame.currentGuessPlayerIdx];
    const targets = localGame.players.filter(p => p.id !== guesser.id);

    // テーマカード
    renderThemeCard(localGame.theme.text, localGame.theme.pack || 'basic', document.getElementById('localGuessThemeCard'));

    // タブ
    document.getElementById('localGuessTabs').innerHTML = targets.map((t, i) => `
        <div class="person-tab${i === 0 ? ' person-tab--active' : ''}"
             id="localGuessTab_${t.id}" onclick="localSwitchGuessTab(${t.id})">${t.name}</div>
    `).join('');

    // 最初のターゲットを表示
    localRenderGuessSort(targets[0].id);
    document.getElementById('localGuessTitle').textContent = `${guesser.name}さんが予想中`;

    if (!localGame.guesses[guesser.id]) localGame.guesses[guesser.id] = {};
    showScreen('localGuessScreen');
}

let localSortableInstance = null;
let localGuessCurrentTargetId = null;

function localSwitchGuessTab(targetId) {
    const guesser = localGame.players[localGame.currentGuessPlayerIdx];
    if (localGuessCurrentTargetId !== null) {
        localSaveGuessOrder(guesser.id, localGuessCurrentTargetId);
    }
    localRenderGuessSort(targetId);
    document.querySelectorAll('#localGuessTabs .person-tab').forEach(el => {
        el.classList.remove('person-tab--active');
    });
    document.getElementById(`localGuessTab_${targetId}`)?.classList.add('person-tab--active', 'person-tab--visited');
}

function localRenderGuessSort(targetId) {
    localGuessCurrentTargetId = targetId;
    const guesser = localGame.players[localGame.currentGuessPlayerIdx];
    const target = localGame.players.find(p => p.id === targetId);
    const ranking = localGame.rankings[targetId];
    const savedGuess = localGame.guesses[guesser.id]?.[targetId];

    const items = Object.values(ranking);
    const shuffled = savedGuess ? Object.values(savedGuess) : shuffleArray([...items]);

    const list = document.getElementById('localGuessSortList');
    list.innerHTML = shuffled.map((item, i) => `
        <div class="rank-item" data-item="${escapeHtml(item)}" style="cursor:grab;">
            <div class="rank-badge">${i+1}st</div>
            <div style="flex:1;font-size:14px;font-weight:500;">${escapeHtml(item)}</div>
            <div class="rank-drag-handle">⋮⋮</div>
        </div>
    `).join('');

    if (localSortableInstance) localSortableInstance.destroy();
    localSortableInstance = Sortable.create(list, {
        animation: 150,
        handle: '.rank-drag-handle',
        onEnd: updateLocalGuessBadges
    });
    updateLocalGuessBadges();
}

function updateLocalGuessBadges() {
    const badges = ['1st','2nd','3rd','4th','5th'];
    document.querySelectorAll('#localGuessSortList .rank-badge').forEach((el, i) => {
        el.textContent = badges[i] || `${i+1}位`;
    });
}

function localSaveGuessOrder(guesserId, targetId) {
    const items = document.querySelectorAll('#localGuessSortList [data-item]');
    const guess = {};
    items.forEach((el, i) => { guess[i + 1] = el.getAttribute('data-item'); });
    if (!localGame.guesses[guesserId]) localGame.guesses[guesserId] = {};
    localGame.guesses[guesserId][targetId] = guess;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function localSubmitGuess() {
    const guesser = localGame.players[localGame.currentGuessPlayerIdx];
    localSaveGuessOrder(guesser.id, localGuessCurrentTargetId);

    const nextIdx = localGame.currentGuessPlayerIdx + 1;
    if (nextIdx < localGame.players.length) {
        localGame.currentGuessPlayerIdx = nextIdx;
        localStartGuessPhase();
    } else {
        showScreen('localPreResultScreen');
    }
}

function localShowResult() {
    localCalcResults();
    localRenderResultScreen();
    trackEvent('game_complete', {
        themeId: localGame.theme?.id || '',
        themeText: localGame.theme?.text || '',
        mode: 'local',
        playerCount: (localGame.players || []).length,
        players: (localGame.players || []).map(p => ({ uid: p.id, name: p.name }))
    });
    showScreen('localResultScreen');
}

function localCalcResults() {
    localGame.results = {};
    localGame.players.forEach(guesser => {
        let totalScore = 0, totalPerfect = 0, totalClose = 0;
        let targetCount = 0;
        localGame.players.forEach(target => {
            if (target.id === guesser.id) return;
            const correct = localGame.rankings[target.id];
            const guess = localGame.guesses[guesser.id]?.[target.id];
            if (!correct || !guess) return;
            targetCount++;
            for (let rank = 1; rank <= 5; rank++) {
                const item = correct[rank];
                let gRank = 0;
                for (let r = 1; r <= 5; r++) {
                    if (guess[r] === item) { gRank = r; break; }
                }
                if (gRank > 0) {
                    const diff = Math.abs(gRank - rank);
                    const pt = calcItemScore(diff);
                    totalScore += pt;
                    if (diff === 0) totalPerfect++;
                    else if (diff === 1) totalClose++;
                }
            }
        });
        localGame.results[guesser.id] = { totalScore, totalPerfect, totalClose, targetCount };
    });
}

function localRenderResultScreen() {
    // テーマカード
    renderThemeCard(localGame.theme.text, localGame.theme.pack || 'basic', document.getElementById('localResultThemeCard'));

    // ランキング
    const sorted = [...localGame.players]
        .map(p => ({ ...p, ...localGame.results[p.id] }))
        .sort((a, b) => b.totalScore - a.totalScore);
    const maxPossible = (sorted[0]?.targetCount || 1) * 50;
    const medals = ['🥇','🥈','🥉'];

    document.getElementById('localResultRanking').innerHTML = sorted.map((p, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(255,255,255,0.08);border-radius:8px;margin-bottom:4px;">
            <span style="font-size:20px;min-width:28px;text-align:center;">${medals[i] || `${i+1}位`}</span>
            <span style="flex:1;font-size:14px;font-weight:700;color:#fff;">${escapeHtml(p.name)}</span>
            <span style="font-family:'DM Sans',sans-serif;font-size:20px;font-weight:900;font-style:italic;color:#fff;">
                ${p.totalScore}<span style="font-size:11px;opacity:0.5;">/${maxPossible}</span>
            </span>
        </div>
    `).join('');

    // タブ
    document.getElementById('localResultTabs').innerHTML = localGame.players.map((p, i) => `
        <div class="person-tab${i === 0 ? ' person-tab--active' : ''}"
             id="localResultTab_${p.id}" onclick="localShowPersonResult(${p.id})">${escapeHtml(p.name)}</div>
    `).join('');
    localShowPersonResult(localGame.players[0].id);

    // 履歴保存
    saveGameHistory(createHistoryEntry({
        themeId: localGame.theme.id || '',
        themeText: localGame.theme.text,
        mode: 'local',
        players: localGame.players.map(p => ({ lineUserId: String(p.id), displayName: p.name })),
        myLineUserId: String(localGame.players[0].id),
        myScore: localGame.results[localGame.players[0].id]?.totalScore || 0,
        maxScore: maxPossible,
        totalScore: sorted.reduce((s, p) => s + p.totalScore, 0),
        totalMaxScore: maxPossible * localGame.players.length,
        answers: (() => {
            const a = {};
            localGame.players.forEach(p => { a[String(p.id)] = localGame.rankings[p.id] || {}; });
            return a;
        })()
    }));
}

function localShowPersonResult(targetId) {
    document.querySelectorAll('#localResultTabs .person-tab').forEach(el => {
        el.classList.remove('person-tab--active');
    });
    document.getElementById(`localResultTab_${targetId}`)?.classList.add('person-tab--active');

    const target = localGame.players.find(p => p.id === targetId);
    const correct = localGame.rankings[targetId];
    if (!correct) return;

    const guessers = localGame.players.filter(p => p.id !== targetId);
    let html = `<div style="margin-bottom:12px;font-size:13px;font-weight:700;color:var(--text-primary);">${escapeHtml(target.name)}さんの正解ランキング</div>`;

    for (let rank = 1; rank <= 5; rank++) {
        const item = correct[rank];
        html += `<div class="card" style="margin-bottom:6px;">
            <div style="display:flex;align-items:center;margin-bottom:8px;">
                <span style="background:var(--text-primary);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:10px;margin-right:8px;">${rank}位</span>
                <span style="font-size:13px;font-weight:700;">${escapeHtml(item)}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                ${guessers.map(g => {
                    const guess = localGame.guesses[g.id]?.[targetId];
                    let gRank = 0;
                    if (guess) for (let r = 1; r <= 5; r++) { if (guess[r] === item) { gRank = r; break; } }
                    const diff = gRank > 0 ? Math.abs(gRank - rank) : 99;
                    const { icon, color } = gRank > 0 ? getScoreLabel(diff) : { icon: '×', color: 'var(--text-muted)' };
                    const pt = gRank > 0 ? calcItemScore(diff) : 0;
                    return `<div style="display:flex;align-items:center;font-size:12px;gap:6px;">
                        <span style="color:${color};font-weight:700;min-width:14px;text-align:center;">${icon}</span>
                        <span style="flex:1;color:var(--text-secondary);">${escapeHtml(g.name)}</span>
                        <span style="color:var(--text-muted);">${gRank > 0 ? gRank + '位' : '-'}</span>
                        <span style="color:${color};font-weight:700;min-width:28px;text-align:right;">${pt}pt</span>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }
    document.getElementById('localResultPersonDetail').innerHTML = html;
}

function localPlayAgain() {
    localGame.rankings = {};
    localGame.guesses = {};
    localGame.results = null;
    localGame.currentRankingPlayerIdx = 0;
    localGame.currentGuessPlayerIdx = 0;
    localGame.currentGuessTargetIdx = 0;
    showSharedThemeSelect();
}

function localChangeTheme() {
    localPlayAgain();
}

function localChangeMembers() {
    startLocalMode();
}
