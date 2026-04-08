// ========================================
// アプリ エントリーポイント・グローバル状態
// ========================================

const LIFF_ID = window.location.hostname.includes('beta--dashing-granita')
    ? '2009531665-WfL81Nvy'   // 公開beta環境 (Netlify beta) ← 新チャンネル
    : window.location.hostname.includes('netlify.app')
    ? '2008911809-43mMnuKh'   // 開発環境 (Netlify develop)
    : '2009531665-30BBFxP7';  // 本番環境 (GitHub Pages)

// グローバル状態
const App = {
    userProfile: null,      // LIFFプロフィール
    currentUser: null,      // Firebaseに保存したユーザー情報
    displayName: '',        // ゲーム内表示名
    deepLinkThemeId: null,  // URLパラメータ ?themeId=xxx
    currentMode: null       // 'pair' | 'multi' | 'local'
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

        // 7. 古い部屋のクリーンアップ & セッション復元チェック（並列実行）
        const [, rejoinData] = await Promise.all([cleanupOldRooms(), checkSessionRestore()]);

        // 8. トップ画面へ
        hideLoading();
        initTopScreen();
        showScreen('topScreen');

        // 9. 復帰モーダル or 強制終了通知
        if (rejoinData === 'stale') {
            showToast('30分以上更新がなかったため、ゲームは強制終了となりました。', 'error');
        } else if (rejoinData) {
            showRejoinModal(rejoinData);
        }

        // 10. 初回訪問（LocalStorageに名前がない）なら名前入力を強制
        if (!savedName) {
            openFirstTimeNameModal();
        }

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

// 放置部屋の自動削除（lastActivityAt が ROOM_TIMEOUT_MS 超過）
const ROOM_TIMEOUT_MS = 30 * 60 * 1000;

async function cleanupOldRooms() {
    try {
        const snap = await database.ref('gameRooms').once('value');
        if (!snap.exists()) return;
        const updates = {};
        snap.forEach(child => {
            const r = child.val();
            if (r.lastActivityAt && (Date.now() - r.lastActivityAt) > ROOM_TIMEOUT_MS) {
                updates[child.key] = null;
            }
        });
        if (Object.keys(updates).length > 0) {
            await database.ref('gameRooms').update(updates);
        }
    } catch (e) {
        console.warn('古い部屋のクリーンアップエラー:', e);
    }
}

// セッション復元チェック（非同期・Firebase確認）
// 戻り値: null（なし）| 'stale'（強制終了済み）| { roomId, data, isHost }（復帰可能）
async function checkSessionRestore() {
    // 旧セッションの1時間超過クリア
    const session = getCurrentSession();
    if (session && Date.now() - (session.savedAt || 0) > 60 * 60 * 1000) {
        clearCurrentSession();
    }

    const roomId = localStorage.getItem('rankq_activeRoom');
    if (!roomId) return null;

    try {
        const snap = await database.ref('gameRooms/' + roomId).once('value');
        if (!snap.exists()) {
            localStorage.removeItem('rankq_activeRoom');
            return null;
        }
        const data = snap.val();
        const userId = App.userProfile.userId;
        const TERMINAL = ['aborted', 'closed'];

        if (!data.players?.[userId] || TERMINAL.includes(data.status)) {
            localStorage.removeItem('rankq_activeRoom');
            return null;
        }

        const TIMEOUT_MS = 30 * 60 * 1000;
        const isStale = (Date.now() - (data.lastActivityAt || 0)) > TIMEOUT_MS;
        const isHost = data.hostId === userId;

        if (isStale) {
            localStorage.removeItem('rankq_activeRoom');
            try {
                if (isHost) {
                    await database.ref('gameRooms/' + roomId).remove();
                } else {
                    await database.ref(`gameRooms/${roomId}/players/${userId}`).remove();
                    const rem = await database.ref(`gameRooms/${roomId}/players`).once('value');
                    if (rem.numChildren() < 3) {
                        await database.ref(`gameRooms/${roomId}/status`).set('aborted');
                    }
                }
            } catch (e) { console.error('stale room cleanup error:', e); }
            return 'stale';
        }

        return { roomId, data, isHost };
    } catch (e) {
        console.error('セッション復元チェックエラー:', e);
        localStorage.removeItem('rankq_activeRoom');
        return null;
    }
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
    const modal = document.getElementById('nameModal');
    modal.querySelector('.modal__title').textContent = 'ゲーム内の名前';
    modal.querySelector('.modal__desc').textContent = 'ゲーム内で他の参加者に表示されます。後からトップ画面で変更できます。';
    document.getElementById('nameCancelBtn').style.display = 'block';
    document.getElementById('nameModalInput').value = App.displayName || '';
    modal.classList.add('modal-overlay--active');
    setTimeout(() => document.getElementById('nameModalInput').focus(), 100);
}

// 初回訪問時：キャンセル不可の強制入力モーダル
function openFirstTimeNameModal() {
    const modal = document.getElementById('nameModal');
    modal.querySelector('.modal__title').textContent = 'ニックネームを設定してください';
    modal.querySelector('.modal__desc').textContent = 'ゲーム内で表示される名前です。10文字以内で入力してください。';
    document.getElementById('nameCancelBtn').style.display = 'none';
    document.getElementById('nameModalInput').value = App.userProfile?.displayName || '';
    modal.classList.add('modal-overlay--active');
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

let helpCurrentSlide = 0;
const HELP_TOTAL = 4;
let _helpTouchStartX = 0;
let _helpTouchStartY = 0;

function openHelpSheet() {
    helpGoTo(0);
    document.getElementById('helpSheet').classList.add('bottomsheet-overlay--active');
}

function closeHelpSheet(e) {
    if (!e || e.target === e.currentTarget) {
        document.getElementById('helpSheet').classList.remove('bottomsheet-overlay--active');
    }
}

function closeHelpSheetDirect() {
    document.getElementById('helpSheet').classList.remove('bottomsheet-overlay--active');
}

function helpGoTo(n) {
    helpCurrentSlide = Math.max(0, Math.min(HELP_TOTAL - 1, n));
    document.getElementById('helpSlides').style.transform = `translateX(-${helpCurrentSlide * 100}%)`;
    document.querySelectorAll('.help-dot').forEach((dot, i) => {
        dot.classList.toggle('help-dot--active', i === helpCurrentSlide);
    });
    const prevBtn = document.getElementById('helpPrevBtn');
    const nextBtn = document.getElementById('helpNextBtn');
    if (prevBtn) prevBtn.disabled = helpCurrentSlide === 0;
    if (nextBtn) nextBtn.disabled = helpCurrentSlide === HELP_TOTAL - 1;
}

function helpTouchStart(e) {
    _helpTouchStartX = e.touches[0].clientX;
    _helpTouchStartY = e.touches[0].clientY;
}

function helpTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - _helpTouchStartX;
    const dy = e.changedTouches[0].clientY - _helpTouchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDy > absDx && dy > 60) {
        // 下スワイプ：現在のスライド内容がトップにある場合のみ閉じる
        const slideBody = document.querySelectorAll('.help-slide-body')[helpCurrentSlide];
        const isAtTop = !slideBody || slideBody.scrollTop < 10;
        if (isAtTop) {
            closeHelpSheetDirect();
        }
    } else if (absDx > 40 && absDx > absDy) {
        // 横スワイプ：カルーセルナビ
        helpGoTo(helpCurrentSlide + (dx < 0 ? 1 : -1));
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
