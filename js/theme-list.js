// theme-list.js — テーマ一覧・過去回答確認・編集ページのロジック

'use strict';

let tlCurrentPack = 'all';
let tlExpandedThemeId = null;
let tlEditingCell = null; // { histId, lineUserId, index }

// ─── 画面を開く ────────────────────────────────────────────

function showThemeListScreen() {
    tlCurrentPack = getFirstPackId();
    tlExpandedThemeId = null;
    tlEditingCell = null;
    renderTLPackTabs();
    renderTLThemeList();
    showScreen('themeListScreen');
}

// ─── パックタブ ──────────────────────────────────────────────

function renderTLPackTabs() {
    const usedPacks = [...new Set(themes.filter(t => t.pack).map(t => t.pack))];
    const sortedPacks = usedPacks.sort((a, b) => {
        return (packMeta[a]?.order ?? 99) - (packMeta[b]?.order ?? 99);
    });
    const packs = [...sortedPacks, 'all'];

    document.getElementById('tlPackTabsRow').innerHTML = packs.map(p => {
        const label = p === 'all' ? 'すべて' : (packMeta[p]?.label || p);
        const isActive = p === tlCurrentPack;
        const bgColor = (p !== 'all' && packMeta[p]?.color) ? packMeta[p].color : '#1A1917';
        const activeStyle = isActive ? `background:${bgColor};border-color:${bgColor};` : '';
        return `<div class="pack-tab-item ${isActive ? 'pack-tab-item--active' : ''}"
                    style="${activeStyle}"
                    onclick="switchTLPack('${p}')">${label}</div>`;
    }).join('');

    renderTLPackDesc(tlCurrentPack);
}

function renderTLPackDesc(pack) {
    const area = document.getElementById('tlPackDescArea');
    if (!area) return;
    if (pack === 'all' || !packMeta[pack]) {
        area.style.display = 'none';
        return;
    }
    const meta = packMeta[pack];
    const color = meta.color || '#1A1917';
    area.style.display = 'block';
    area.style.background = color;
    area.innerHTML = `<div class="pack-desc__title">${escapeHtml(meta.label || pack)}</div>
        <div class="pack-desc__text">${escapeHtml(meta.description || '').replace(/\n/g, '<br>')}</div>`;
}

function switchTLPack(packId) {
    tlCurrentPack = packId;
    tlExpandedThemeId = null;
    tlEditingCell = null;
    renderTLPackTabs();
    renderTLThemeList();
}

// ─── テーマリスト ────────────────────────────────────────────

function renderTLThemeList() {
    const filtered = tlCurrentPack === 'all'
        ? themes
        : themes.filter(t => t.pack === tlCurrentPack);

    const history = getGameHistory();
    const container = document.getElementById('tlThemeList');

    if (filtered.length === 0) {
        container.innerHTML = '<div class="tl-empty">テーマがありません</div>';
        return;
    }

    container.innerHTML = filtered.map(theme => {
        const themeHistory = history.filter(h => h.themeId === theme.id);
        const hasHistory = themeHistory.length > 0;
        const isExpanded = tlExpandedThemeId === theme.id;
        const color = getPackColor(theme.pack);

        return `<div class="tl-theme-item ${isExpanded ? 'tl-theme-item--expanded' : ''}" id="tlItem_${theme.id}">
            <div class="tl-theme-header" onclick="toggleTLTheme('${theme.id}')">
                <div class="tl-theme-color-bar" style="background:${color}"></div>
                <div class="tl-theme-header-text">
                    <span class="tl-theme-name">${escapeHtml(theme.text)}</span>
                    ${hasHistory
                        ? `<span class="tl-history-badge">${themeHistory.length}回プレイ済み</span>`
                        : `<span class="tl-no-history-badge">未プレイ</span>`
                    }
                </div>
                <div class="tl-chevron ${isExpanded ? 'tl-chevron--open' : ''}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
            </div>
            ${isExpanded ? `<div class="tl-theme-detail">${renderTLDetail(theme, themeHistory)}</div>` : ''}
        </div>`;
    }).join('');
}

function toggleTLTheme(themeId) {
    tlEditingCell = null;
    tlExpandedThemeId = (tlExpandedThemeId === themeId) ? null : themeId;
    renderTLThemeList();
}

// ─── テーマ詳細（プレイ履歴一覧） ──────────────────────────────

function renderTLDetail(theme, themeHistory) {
    if (themeHistory.length === 0) {
        return `<div class="tl-detail-empty">まだプレイ履歴がありません</div>`;
    }

    return themeHistory.map((entry, entryIdx) => {
        const myUid = entry.myLineUserId;
        const myAnswers = (entry.answers && entry.answers[myUid]) || [];
        const date = new Date(entry.playedAt);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const MODE_LABEL = { pair: 'ふたりで', multi: 'みんなで', local: '1台で' };
        const modeLabel = MODE_LABEL[entry.mode] || entry.mode;

        return `<div class="tl-play-entry">
            <div class="tl-play-entry__header">
                <span class="tl-play-date">${dateStr} · ${modeLabel}</span>
                <button class="tl-delete-btn" onclick="confirmDeleteTLEntry('${entry.id}','${theme.id}')">削除</button>
            </div>
            <div class="tl-play-answers">
                ${myAnswers.length === 0
                    ? `<div class="tl-answer-empty">回答データがありません</div>`
                    : myAnswers.map((ans, i) => renderTLAnswerRow(entry.id, myUid, i, ans)).join('')
                }
            </div>
        </div>`;
    }).join('');
}

function renderTLAnswerRow(histId, lineUserId, index, text) {
    const isEditing = tlEditingCell
        && tlEditingCell.histId === histId
        && tlEditingCell.lineUserId === lineUserId
        && tlEditingCell.index === index;

    if (isEditing) {
        return `<div class="tl-answer-row tl-answer-row--editing">
            <span class="tl-answer-num">${index + 1}</span>
            <input class="tl-answer-input" id="tlAnswerInput_${histId}_${index}"
                   value="${escapeHtml(text)}" maxlength="40"
                   onkeydown="if(event.key==='Enter')saveTLAnswer('${histId}','${lineUserId}',${index})">
            <div class="tl-answer-actions">
                <button class="tl-save-btn" onclick="saveTLAnswer('${histId}','${lineUserId}',${index})">保存</button>
                <button class="tl-cancel-btn" onclick="cancelTLEdit()">取消</button>
            </div>
        </div>`;
    }

    return `<div class="tl-answer-row">
        <span class="tl-answer-num">${index + 1}</span>
        <span class="tl-answer-text">${escapeHtml(text)}</span>
        <button class="tl-edit-btn" onclick="startTLEdit('${histId}','${lineUserId}',${index})">編集</button>
    </div>`;
}

// ─── 編集 ────────────────────────────────────────────────────

function startTLEdit(histId, lineUserId, index) {
    tlEditingCell = { histId, lineUserId, index };
    renderTLThemeList();
    // フォーカス
    setTimeout(() => {
        const input = document.getElementById(`tlAnswerInput_${histId}_${index}`);
        if (input) { input.focus(); input.select(); }
    }, 50);
}

function cancelTLEdit() {
    tlEditingCell = null;
    renderTLThemeList();
}

function saveTLAnswer(histId, lineUserId, index) {
    const input = document.getElementById(`tlAnswerInput_${histId}_${index}`);
    if (!input) return;
    const newText = input.value.trim();
    if (newText === '') {
        input.focus();
        return;
    }
    updateHistoryAnswer(histId, lineUserId, index, newText);
    tlEditingCell = null;
    renderTLThemeList();
}

// ─── 削除 ────────────────────────────────────────────────────

function confirmDeleteTLEntry(histId, themeId) {
    showConfirmModal(
        'この履歴を削除しますか？',
        'この操作は取り消せません。',
        [
            {
                label: '削除する',
                style: 'danger',
                action: `doDeleteTLEntry('${histId}','${themeId}')`
            },
            {
                label: 'キャンセル',
                style: 'cancel',
                action: 'closeConfirmModal()'
            }
        ]
    );
}

function doDeleteTLEntry(histId, themeId) {
    closeConfirmModal();
    deleteHistoryEntry(histId);
    tlEditingCell = null;
    renderTLThemeList();
}
