// ========================================
// アプリ エントリーポイント・グローバル状態
// ========================================

const LIFF_ID = window.location.hostname.includes('beta--dashing-granita')
    ? '2008911809-x8vw37eD'   // beta環境 (Netlify beta)
    : window.location.hostname.includes('netlify.app')
    ? '2008911809-43mMnuKh'   // 開発環境 (Netlify develop)
    : '2008911809-CBLKsbT1';  // 本番環境 (GitHub Pages)

// グローバル状態
const App = {
    userProfile: null,      // LIFFプロフィール
    currentUser: null,      // Firebaseに保存したユーザー情報
    displayName: '',        // ゲーム内表示名
    deepLinkThemeId: null   // URLパラメータ ?themeId=xxx
};

// ========================================
// LIFF初期化
// ========================================

window.addEventListener('load', () => {
    initializeLiff();
});

function initializeLiff() {
    liff.init({ liffId: LIFF_ID })
        .then(() => {
            if (liff.isLoggedIn()) {
                onLiffReady();
            } else {
                liff.login();
            }
        })
        .catch(err => {
            console.error('LIFF初期化エラー:', err);
            hideLoading();
            document.getElementById('loadingError').style.display = 'block';
        });
}

async function onLiffReady() {
    try {
        // 1. LIFFプロフィール取得
        App.userProfile = await liff.getProfile();

        // 2. 表示名（LocalStorage保存済みのものを優先）
        const savedName = getSavedDisplayName();
        App.displayName = savedName || App.userProfile.displayName;

        // 3. Firebase初期化・認証
        initializeFirebase();
        await firebase.auth().signInAnonymously();
        console.log('✅ Firebase認証成功');

        // 4. Firebaseにユーザー情報を保存
        await initializeUserInFirebase();

        // 5. テーマデータ取得
        await loadThemes();

        // 6. URLパラメータチェック
        checkUrlParameters();

        // 7. セッション復元チェック
        checkSessionRestore();

        // 8. トップ画面へ
        hideLoading();
        initTopScreen();
        showScreen('topScreen');

    } catch (err) {
        console.error('初期化エラー:', err);
        hideLoading();
        document.getElementById('loadingError').style.display = 'block';
    }
}

// URLパラメータチェック
function checkUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const themeId = params.get('themeId');
    if (themeId) App.deepLinkThemeId = themeId;

    const roomId = params.get('roomId');
    if (roomId) App.deepLinkRoomId = roomId;
}

// セッション復元チェック
function checkSessionRestore() {
    const session = getCurrentSession();
    if (!session) return;

    const elapsed = Date.now() - (session.savedAt || 0);
    const ONE_HOUR = 60 * 60 * 1000;

    if (elapsed > ONE_HOUR) {
        clearCurrentSession();
        return;
    }

    // TODO: セッション復元ダイアログを表示
    console.log('📦 復元可能なセッションがあります:', session.mode, session.roomId);
}

// ========================================
// トップ画面
// ========================================

function initTopScreen() {
    const name = App.displayName || App.userProfile?.displayName || '---';
    document.getElementById('topName').textContent = name;
    document.getElementById('topAvatar').textContent = name ? name[0] : '？';

    // deepLinkチェック
    if (App.deepLinkThemeId) {
        const theme = findThemeById(App.deepLinkThemeId);
        if (theme) {
            console.log('📌 deepLink theme:', theme.text);
        }
    }

    // 履歴FABの表示切替
    const history = getGameHistory();
    document.getElementById('historyFab').style.display = history.length > 0 ? 'flex' : 'none';
}

// ========================================
// 名前変更
// ========================================

function openNameModal() {
    document.getElementById('nameModalInput').value = App.displayName || '';
    document.getElementById('nameModal').classList.add('modal-overlay--active');
    setTimeout(() => document.getElementById('nameModalInput').focus(), 100);
}

function saveDisplayName_() {
    const name = document.getElementById('nameModalInput').value.trim();
    if (!name) return;
    App.displayName = name;
    saveDisplayName(name);
    document.getElementById('nameModal').classList.remove('modal-overlay--active');
    initTopScreen();
}

// ========================================
// ヘルプ・履歴ボトムシート
// ========================================

function openHelpSheet() {
    document.getElementById('helpSheet').classList.add('bottomsheet-overlay--active');
}

function closeHelpSheet(e) {
    if (e.target === e.currentTarget) {
        document.getElementById('helpSheet').classList.remove('bottomsheet-overlay--active');
    }
}

function openHistorySheet() {
    renderHistorySheetList();
    document.getElementById('historySheet').classList.add('bottomsheet-overlay--active');
}

function closeHistorySheet(e) {
    if (e.target === e.currentTarget) {
        document.getElementById('historySheet').classList.remove('bottomsheet-overlay--active');
    }
}

function renderHistorySheetList() {
    const history = getGameHistory();
    const container = document.getElementById('historySheetList');
    if (history.length === 0) {
        container.innerHTML = '<div style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px 0;">まだゲーム履歴がありません</div>';
        return;
    }
    const MODE_LABEL = { pair: 'ふたりで', multi: 'みんなで', local: '1台で' };
    container.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;">` +
        history.map(h => {
            const date = new Date(h.playedAt);
            const label = `${date.getMonth()+1}/${date.getDate()} · ${MODE_LABEL[h.mode] || h.mode}`;
            return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface-2);border-radius:10px;">
                <div style="flex:1;">
                    <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:2px;">${escapeHtml(h.themeText)}</div>
                    <div style="font-size:10px;color:var(--text-muted);">${label}</div>
                </div>
                <div style="font-family:'DM Sans',sans-serif;font-size:20px;font-weight:900;font-style:italic;color:var(--text-primary);">
                    ${h.myScore}<span style="font-size:11px;opacity:0.5;">/${h.maxScore}</span>
                </div>
            </div>`;
        }).join('') + `</div>`;
}

// ========================================
// ライブ（フェイクドア）
// ========================================

function onLiveTap() {
    showToast('ライブモードは近日公開予定です', 'info');
}
