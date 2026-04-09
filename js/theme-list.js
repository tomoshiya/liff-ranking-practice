// theme-list.js — テーマ一覧・過去回答確認・削除ページのロジック

'use strict';

// ─── コンテキスト定義 ──────────────────────────────────────────
// game-pair.js の renderPackTabs / renderThemeCards に渡す設定
const TL_CTX = {
    tabsRowId: 'tlPackTabsRow',
    descAreaId: 'tlPackDescArea',
    scrollId:   'tlThemeCardsScroll',
    counterId:  'tlScrollCounterText',
    fillId:     'tlScrollBarFill',
    idPrefix:   'tlCard',
    switchFn:   'switchTLPack',
    onClickFn:  'selectTLTheme',
};

let tlCurrentPack       = 'all';
let tlSelectedThemeIdx  = null;

// ─── 画面を開く ────────────────────────────────────────────────

function showThemeListScreen() {
    tlCurrentPack      = getFirstPackId();
    tlSelectedThemeIdx = null;

    renderPackTabs({ ...TL_CTX, activePack: tlCurrentPack });
    renderThemeCards(tlCurrentPack, TL_CTX);
    renderTLHistory(null);

    showScreen('themeListScreen');
    setupCarouselLoop('tlThemeCardsScroll');
}

// ─── パック切替 ────────────────────────────────────────────────

function switchTLPack(pack) {
    tlCurrentPack      = pack;
    tlSelectedThemeIdx = null;

    renderPackTabs({ ...TL_CTX, activePack: tlCurrentPack });
    renderThemeCards(tlCurrentPack, TL_CTX);
    renderTLHistory(null);
    setupCarouselLoop('tlThemeCardsScroll');
}

// ─── テーマカード選択 ──────────────────────────────────────────

function selectTLTheme(idx) {
    tlSelectedThemeIdx = idx;

    // テーマ一覧画面内のカードのみ選択状態を変更
    document.querySelectorAll('#themeListScreen .theme-card-item').forEach(el => {
        el.classList.remove('theme-card-item--selected');
    });
    document.getElementById(`tlCard_${idx}`)?.classList.add('theme-card-item--selected');

    renderTLHistory(idx);
}

// ─── スクロールインジケーター更新 ─────────────────────────────

function onTLThemeCardsScroll() {
    updateCarouselIndicator('tlThemeCardsScroll', 'tlScrollCounterText', 'tlScrollBarFill', tlCurrentPack);
}

// ─── 履歴セクション描画 ────────────────────────────────────────

function renderTLHistory(themeIdx) {
    const section = document.getElementById('tlHistorySection');
    if (!section) return;

    if (themeIdx === null) {
        section.innerHTML = '<div class="tl-history-placeholder">テーマを選択すると過去の履歴が表示されます</div>';
        return;
    }

    const theme = themes[themeIdx];
    if (!theme) return;

    const history = getGameHistory().filter(h => h.themeId === theme.id);

    if (history.length === 0) {
        section.innerHTML = `<div class="tl-history-theme-name">${escapeHtml(theme.text)}</div>
            <div class="tl-history-empty">まだ履歴がありません</div>`;
        return;
    }

    const MODE_LABEL = { pair: 'ふたりであそぶ', multi: 'みんなであそぶ', local: '1台であそぶ' };

    section.innerHTML = `<div class="tl-history-theme-name">${escapeHtml(theme.text)}</div>` +
        history.map(entry => {
            const d = new Date(entry.playedAt);
            const yyyy = d.getFullYear();
            const mm   = String(d.getMonth() + 1).padStart(2, '0');
            const dd   = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}/${mm}/${dd}`;
            const modeLabel = MODE_LABEL[entry.mode] || entry.mode || '';
            const myUid  = entry.myLineUserId;

            // 参加者表示（playersデータがある場合のみ）
            const players = entry.players;
            const playersHtml = (Array.isArray(players) && players.length > 0)
                ? `<div class="tl-entry__players">参加者：${players.map(p => escapeHtml(p.displayName || p.lineUserId || '')).join('、')}</div>`
                : '';

            // Firebase が {1:'v',...} を [null,'v',...] に変換する場合があるため
            // インデックス0がnull/空の場合は除去して1始まりに揃える
            let raw = (entry.answers && entry.answers[myUid]) || [];
            const answers = Array.isArray(raw) && raw.length > 0 && (raw[0] === null || raw[0] === '' || raw[0] === undefined)
                ? raw.slice(1)
                : raw;

            return `<div class="tl-entry">
                <div class="tl-entry__header">
                    <div class="tl-entry__header-left">
                        <span class="tl-entry__date">${dateStr} · ${modeLabel}</span>
                        ${playersHtml}
                    </div>
                    <button class="tl-entry__delete-btn"
                            onclick="confirmDeleteTLEntry('${entry.id}',${themeIdx})">削除</button>
                </div>
                <div class="tl-entry__answers">
                    ${answers.length === 0
                        ? '<div class="tl-entry__no-data">回答データなし</div>'
                        : answers.map((ans, i) => `
                            <div class="tl-entry__row">
                                <span class="tl-entry__rank">${i + 1}</span>
                                <span class="tl-entry__text">${escapeHtml(ans || '（空白）')}</span>
                            </div>`).join('')
                    }
                </div>
            </div>`;
        }).join('');
}

// ─── 削除 ──────────────────────────────────────────────────────

function confirmDeleteTLEntry(histId, themeIdx) {
    showConfirmModal(
        'この履歴を削除しますか？',
        'この操作は取り消せません。',
        [
            {
                label: '削除する',
                cls: 'btn btn--danger',
                fn: `doDeleteTLEntry('${histId}',${themeIdx})`
            },
            {
                label: 'キャンセル',
                cls: 'btn btn--outline',
                fn: 'closeConfirmModal()'
            }
        ]
    );
}

function doDeleteTLEntry(histId, themeIdx) {
    closeConfirmModal();
    deleteHistoryEntry(histId);
    renderTLHistory(themeIdx);
}
