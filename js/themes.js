// ========================================
// テーマデータ管理（Firebase取得）
// ========================================

// テーマデータ: { id, text, pack, tags, order }
let themes = [];

async function loadThemes() {
    try {
        const snapshot = await database.ref('themes/items')
            .orderByChild('order').once('value');
        themes = [];
        snapshot.forEach(child => {
            const item = child.val();
            if (item.isActive) {
                themes.push({ id: child.key, ...item });
            }
        });
        console.log(`✅ テーマ ${themes.length}件を読み込みました`);
    } catch (error) {
        console.error('❌ テーマ読み込みエラー:', error);
        themes = [];
    }
}

// ウィークリーテーマを取得
async function loadWeeklyTheme() {
    try {
        const snapshot = await database.ref('themes/weekly').once('value');
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('❌ ウィークリーテーマ読み込みエラー:', error);
        return null;
    }
}

// themeIdからテーマを検索
function findThemeById(themeId) {
    return themes.find(t => t.id === themeId) || null;
}
