// ========================================
// テーマデータ管理（Firebase取得）
// ========================================

// テーマデータ: { id, text, pack, tags, order }
let themes = [];

// パックメタデータ: { [packId]: { label, labelEn, color, description, order } }
let packMeta = {};

async function loadThemes() {
    try {
        // items と packs を並列取得
        const [itemsSnap, packsSnap] = await Promise.all([
            database.ref('themes/items').orderByChild('order').once('value'),
            database.ref('themes/packs').once('value')
        ]);

        // packs
        packMeta = {};
        if (packsSnap.exists()) {
            packsSnap.forEach(child => {
                const p = child.val();
                if (p.isActive !== false) {
                    packMeta[child.key] = { id: child.key, ...p };
                }
            });
        }
        console.log(`✅ パック ${Object.keys(packMeta).length}件を読み込みました`);

        // items
        themes = [];
        itemsSnap.forEach(child => {
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

// packIdからカード色を取得（フォールバックあり）
function getPackColor(packId) {
    return packMeta[packId]?.color || '#2C3E50';
}

// packIdから表示名を取得
function getPackLabel(packId) {
    if (packId === 'custom') return 'ORIGINAL';
    return packMeta[packId]?.labelEn || (packId || 'BASIC').toUpperCase();
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
