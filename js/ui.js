// ========================================
// UI共通処理・画面切替
// ========================================

// 画面切替（全screenを非表示にしてtargetのみ表示）
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => {
        el.classList.remove('screen--active');
    });
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('screen--active');
        target.scrollTop = 0;
    } else {
        console.warn(`画面が見つかりません: ${screenId}`);
    }
}

// ローディング表示切替
function showLoading(message = '読み込み中...') {
    const el = document.getElementById('loading');
    if (el) {
        el.querySelector('.loading__message').textContent = message;
        el.style.display = 'flex';
    }
}

function hideLoading() {
    const el = document.getElementById('loading');
    if (el) el.style.display = 'none';
}

// エラー表示
function showError(message) {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    }
}

// トースト通知
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    setTimeout(() => {
        toast.classList.remove('toast--visible');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// モーダル表示・非表示
function showModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('modal--active');
}

function hideModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('modal--active');
}

// ボトムシート表示・非表示
function showBottomSheet(sheetId) {
    const el = document.getElementById(sheetId);
    if (el) el.classList.add('bottomsheet--active');
}

function hideBottomSheet(sheetId) {
    const el = document.getElementById(sheetId);
    if (el) el.classList.remove('bottomsheet--active');
}

// テーマカード描画
function renderThemeCard(themeText, packId = 'basic', container) {
    const PACK_COLORS = {
        basic:  '#2C3E50',
        love:   '#8B3A52',
        secret: '#3A2D6B',
        work:   '#1C3D2E',
        if:     '#5C3A1E',
        myself: '#1C3A5C'
    };
    const color = PACK_COLORS[packId] || PACK_COLORS.basic;

    container.innerHTML = `
        <div class="theme-card" style="background:${color};">
            <div class="theme-card__white">
                <span class="theme-card__text">${escapeHtml(themeText)}</span>
            </div>
            <span class="theme-card__pack">${packId.toUpperCase()}</span>
        </div>
    `;
}

// HTMLエスケープ
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// クリップボードコピー
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('コピーしました！', 'success');
    } catch {
        showToast('コピーに失敗しました', 'error');
    }
}

// スコア計算（確定スコアリング: 10,6,3,1,0）
function calcItemScore(diff) {
    if (diff === 0) return 10;
    if (diff === 1) return 6;
    if (diff === 2) return 3;
    if (diff === 3) return 1;
    return 0;
}

// スコアラベル（5色: 金/銀/銅/ブルー/ネイビー）
function getScoreLabel(diff) {
    if (diff === 0) return { label: 'あたり', icon: '◎', color: '#F59E0B' }; // 金・アンバー
    if (diff === 1) return { label: 'おしい', icon: '○', color: '#8B9BAD' }; // 銀・グレー
    if (diff === 2) return { label: 'ちかい', icon: '△', color: '#9B6A40' }; // 銅・ブラウン
    if (diff === 3) return { label: 'かすり', icon: '▽', color: '#60A5FA' }; // ブルー
    return { label: 'はずれ', icon: '×', color: '#334155' };               // ネイビー
}
