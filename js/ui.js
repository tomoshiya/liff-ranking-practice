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
    // フッターリンクはTOP画面のみ表示
    const footer = document.getElementById('topFooterLinks');
    if (footer) footer.style.display = screenId === 'topScreen' ? 'flex' : 'none';
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

/**
 * スコアラベル定義（ソース・オブ・トゥルース）
 *
 * diff = |予想順位 - 正解順位|
 *
 * | diff | label  | icon | color   | 得点 | 線スタイル             |
 * |------|--------|------|---------|------|------------------------|
 * |  0   | あたり  | ◎   | #EF4444 | 10pt | 実線  sw=3.5           |
 * |  1   | おしい  | ○   | #F87171 |  6pt | 実線  sw=2.5           |
 * |  2   | ちかい  | △   | #9CA3AF |  3pt | 実線  sw=1.5           |
 * |  3   | かすり  | ▽   | #60A5FA |  1pt | 破線(6,4) sw=1.5       |
 * | 4+   | はずれ  | ×   | #1D4ED8 |  0pt | 破線(2,5) sw=1.5       |
 *
 * 結果発表の接続線の「色」は左カード（正しいランク）のヘッダー色を基準とする。
 * 線の「太さ・破線スタイル」は上表の diff に基づく。
 * → getScoreLineStyle(diff) 参照
 *
 * ランクヘッダー色（左カード / 右カード共通）:
 *   1st: #A8192B / 2nd: #882031 / 3rd: #6B2F3C / 4th: #4D3C45 / 5th: #3A3334
 */
function getScoreLabel(diff) {
    if (diff === 0) return { label: 'あたり', icon: '◎', color: '#EF4444' };
    if (diff === 1) return { label: 'おしい', icon: '○', color: '#F87171' };
    if (diff === 2) return { label: 'ちかい', icon: '△', color: '#9CA3AF' };
    if (diff === 3) return { label: 'かすり', icon: '▽', color: '#60A5FA' };
    return { label: 'はずれ', icon: '×', color: '#1D4ED8' };
}

/**
 * 結果発表の接続線スタイル（strokeWidth・dasharray）
 * 線の「色」は呼び出し元で左カードのランクヘッダー色を指定すること。
 */
function getScoreLineStyle(diff) {
    if (diff === 0) return { strokeWidth: 3.5, dashArray: '' };
    if (diff === 1) return { strokeWidth: 2.5, dashArray: '' };
    if (diff === 2) return { strokeWidth: 1.5, dashArray: '' };
    if (diff === 3) return { strokeWidth: 1.5, dashArray: '6,4' };
    return { strokeWidth: 1.5, dashArray: '2,5' };
}
