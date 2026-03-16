// ========================================
// みんなであそぶ モード
// ========================================
// TODO: Phase 6-Rebuild で実装

function startMultiMode() {
    pairMode = 'multi';
    document.getElementById('roomSelectModeLabel').textContent = 'みんなであそぶ';
    showScreen('roomSelectScreen');
}
