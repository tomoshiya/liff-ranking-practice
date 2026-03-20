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
    // パック色・ラベルは themes.js の getPackColor() / getPackLabel() で一元管理
    const color = getPackColor(packId);
    const packLabel = getPackLabel(packId);
    container.innerHTML = `
        <div class="theme-card" style="background:${color};">
            <div class="theme-card__white">
                <span class="theme-card__text">${escapeHtml(themeText)}</span>
            </div>
            <span class="theme-card__pack">${packLabel}</span>
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

// スコアラベル（5色: 赤系/グレー/青系）
function getScoreLabel(diff) {
    if (diff === 0) return { label: 'あたり', icon: '◎', color: '#EF4444' }; // 赤
    if (diff === 1) return { label: 'おしい', icon: '○', color: '#F87171' }; // 薄い赤
    if (diff === 2) return { label: 'ちかい', icon: '△', color: '#9CA3AF' }; // グレー
    if (diff === 3) return { label: 'かすり', icon: '▽', color: '#60A5FA' }; // 薄い青
    return { label: 'はずれ', icon: '×', color: '#1D4ED8' };               // 濃い青
}
