// ========================================
// LocalStorage 管理
// ========================================

const STORAGE_KEYS = {
    HISTORY: 'ranknow_history_beta',
    SOLO_HISTORY: 'ranknow_solo_history_beta',
    CURRENT_SESSION: 'rankq_currentSession',
    DISPLAY_NAME: 'rankq_displayName'
};

const HISTORY_MAX = 50;

// --- ゲーム履歴 ---

function saveGameHistory(entry) {
    const history = getGameHistory();
    history.unshift(entry);
    if (history.length > HISTORY_MAX) history.splice(HISTORY_MAX);
    try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
        console.warn('履歴保存エラー（容量超過の可能性）:', e);
    }
}

function getGameHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
    } catch {
        return [];
    }
}

// --- WEEKLYソロ履歴 ---

function saveSoloHistory(entry) {
    const history = getSoloHistory();
    history.unshift(entry);
    if (history.length > HISTORY_MAX) history.splice(HISTORY_MAX);
    try {
        localStorage.setItem(STORAGE_KEYS.SOLO_HISTORY, JSON.stringify(history));
    } catch (e) {
        console.warn('ソロ履歴保存エラー:', e);
    }
}

function getSoloHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SOLO_HISTORY)) || [];
    } catch {
        return [];
    }
}

// --- セッション復元 ---

function saveCurrentSession(sessionData) {
    try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(sessionData));
    } catch (e) {
        console.warn('セッション保存エラー:', e);
    }
}

function getCurrentSession() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION));
    } catch {
        return null;
    }
}

function clearCurrentSession() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
}

// --- 表示名 ---

function saveDisplayName(name) {
    localStorage.setItem(STORAGE_KEYS.DISPLAY_NAME, name);
}

function getSavedDisplayName() {
    return localStorage.getItem(STORAGE_KEYS.DISPLAY_NAME) || '';
}

// --- 履歴エントリ生成ヘルパー ---

function createHistoryEntry({ themeId, themeText, mode, players, myLineUserId, myScore, maxScore, totalScore, totalMaxScore, answers }) {
    return {
        id: generateId(),
        playedAt: new Date().toISOString(),
        themeId,
        themeText,
        mode,
        players,
        myLineUserId,
        myScore,
        maxScore,
        totalScore,
        totalMaxScore,
        answers
    };
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- 履歴の削除・編集 ---

function deleteHistoryEntry(id) {
    const history = getGameHistory().filter(h => h.id !== id);
    try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
        console.warn('履歴削除エラー:', e);
    }
}

function deleteAllHistory() {
    try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
    } catch (e) {
        console.warn('全履歴削除エラー:', e);
    }
}

function updateHistoryAnswer(histId, lineUserId, index, newText) {
    const history = getGameHistory();
    const entry = history.find(h => h.id === histId);
    if (!entry || !entry.answers || !entry.answers[lineUserId]) return;
    entry.answers[lineUserId][index] = newText;
    try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
        console.warn('履歴更新エラー:', e);
    }
}
