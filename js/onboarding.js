// ========================================
// オンボーディング（初回起動チュートリアル）
// ========================================
// 表示条件: localStorage 'rankq_onboarded' が未設定の場合のみ
// 呼び出し: showOnboarding(onComplete)
//   → 完了 / CTA クリック時に onComplete() を実行して閉じる

const OB_STORAGE_KEY = 'rankq_onboarded';
const OB_RANK_COLORS = ['#A8192B', '#882031', '#6B2F3C', '#4D3C45', '#3A3334'];
const OB_RANK_SUFF   = ['st', 'nd', 'rd', 'th', 'th'];

// パックID → スライド2で使用する行（4行: casual, private, if, love）
const OB_SLIDE2_PACKS = ['casual', 'private', 'if', 'love'];
// Slide2でパックあたり何枚表示するか（×2でループ）
const OB_CARDS_PER_ROW = 6;

let _obOnComplete = null;

// ========================================
// エントリーポイント
// ========================================

function showOnboarding(onComplete) {
    _obOnComplete = onComplete || null;
    _injectStyles();
    _injectHtml();
    _buildSlide2Cards();
    _initNav();
    _startSlide(0);
    requestAnimationFrame(() => {
        const overlay = document.getElementById('obOverlay');
        if (overlay) overlay.classList.add('ob-overlay--visible');
    });
}

function hideOnboarding() {
    const overlay = document.getElementById('obOverlay');
    if (!overlay) return;
    _clearAllTimers();
    overlay.classList.remove('ob-overlay--visible');
    setTimeout(() => {
        overlay.remove();
        document.getElementById('obStyles')?.remove();
    }, 350);
}

// ========================================
// CSS注入
// ========================================

function _injectStyles() {
    if (document.getElementById('obStyles')) return;
    const style = document.createElement('style');
    style.id = 'obStyles';
    style.textContent = `
/* ===== オンボーディング オーバーレイ ===== */
.ob-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.3s;
  pointer-events: none;
}
.ob-overlay--visible { opacity: 1; pointer-events: auto; }

.ob-phone {
  width: min(390px, 100vw); height: min(844px, 100vh);
  background: var(--bg); border-radius: min(44px, 5vw);
  overflow: hidden; display: flex; flex-direction: column;
  box-shadow: 0 40px 80px rgba(0,0,0,0.35);
  position: relative;
}
.ob-status {
  background: var(--hero); padding: 14px 28px 8px;
  display: flex; justify-content: space-between;
  font-size: 12px; font-weight: 600;
  color: rgba(255,255,255,0.45); flex-shrink: 0;
}
.ob-wrap { flex: 1; overflow: hidden; position: relative; }
.ob-slides-row {
  display: flex; height: 100%;
  transition: transform 0.36s cubic-bezier(0.4,0,0.2,1);
}
.ob-slide {
  min-width: 100%; height: 100%;
  display: flex; flex-direction: column; overflow: hidden;
  pointer-events: none;
}
.ob-footer {
  flex-shrink: 0; background: #fff; padding: 6px 20px 28px;
  border-top: 1px solid var(--border); pointer-events: auto;
}
.ob-footer * { pointer-events: auto; }
.ob-dots { display: flex; justify-content: center; gap: 6px; padding: 4px 0 8px; }
.ob-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--border); transition: all 0.25s;
}
.ob-dot--on { width: 20px; border-radius: 4px; background: var(--text-primary); }
.ob-btn-row { display: flex; align-items: center; gap: 10px; }
.ob-back {
  flex-shrink: 0; font-size: 13px; font-weight: 700;
  color: var(--text-secondary); background: none; border: none;
  cursor: pointer; padding: 0 2px; white-space: nowrap;
  font-family: 'Noto Sans JP', sans-serif;
}
.ob-back:disabled { opacity: 0.2; cursor: default; }
.ob-next {
  flex: 1; height: 48px; border-radius: 14px; border: none;
  cursor: pointer; font-size: 14px; font-weight: 900;
  font-family: 'Noto Sans JP', sans-serif;
  background: var(--text-primary); color: #fff;
}
.ob-cta {
  flex: 1; height: 48px; border-radius: 14px; border: none;
  cursor: pointer; font-size: 12px; font-weight: 900;
  font-family: 'Noto Sans JP', sans-serif;
  background: linear-gradient(135deg, #7C4DFF, #5c35cc); color: #fff;
  display: none;
}

/* ===== 共通ヒーロー ===== */
.ob-hero {
  background: var(--hero); flex-shrink: 0;
  padding: 10px 20px 14px; position: relative; overflow: hidden;
}
.ob-hero__bg {
  position: absolute; border-radius: 50%; pointer-events: none;
  width: 160px; height: 160px; top: -60px; right: -40px;
  background: rgba(255,255,255,0.04);
}
.ob-badge {
  display: inline-block; background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2); border-radius: 50px;
  padding: 2px 10px; font-size: 10px; font-weight: 700;
  color: rgba(255,255,255,0.85); letter-spacing: .06em; margin-bottom: 5px;
}
.ob-step  { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 3px; }
.ob-title { font-size: 20px; font-weight: 900; color: #fff; line-height: 1.3; }
.ob-title em { font-style: normal; }
.ob-desc  { font-size: 11px; color: rgba(255,255,255,0.7); line-height: 1.65; margin-top: 6px; }
.ob-header-row { display: flex; align-items: flex-start; justify-content: space-between; }
.ob-header-left { flex: 1; }

/* ===== Slide 1: コンセプト ===== */
.ob-s1 { background: var(--hero); }
.ob-s1-visual {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 0 28px; position: relative; overflow: hidden;
}
.ob-s1-bg1 { position: absolute; width: 300px; height: 300px; top: -120px; right: -80px; border-radius: 50%; background: rgba(124,77,255,0.07); pointer-events: none; }
.ob-s1-bg2 { position: absolute; width: 160px; height: 160px; bottom: -40px; left: -50px; border-radius: 50%; background: rgba(255,255,255,0.03); pointer-events: none; }
.ob-bars { display: flex; align-items: flex-end; gap: 10px; }
.ob-bar-wrap { display: flex; flex-direction: column; align-items: center; }
.ob-bar-num { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 900; font-style: italic; margin-bottom: 6px; line-height: 1; }
.ob-bar-num small { font-size: 7px; font-style: normal; opacity: 0.8; }
.ob-bar { width: 46px; border-radius: 8px 8px 0 0; transform-origin: bottom; }
.ob-bar--anim { animation: obGrowBar 0.7s cubic-bezier(0.2,0.8,0.3,1) both; }
.ob-podium-base { width: 280px; height: 3px; background: rgba(255,255,255,0.18); border-radius: 2px; }
@keyframes obGrowBar { from{transform:scaleY(0);opacity:0.3} to{transform:scaleY(1);opacity:1} }
.ob-s1-text { background: #fff; border-radius: 24px 24px 0 0; padding: 20px 28px 16px; flex-shrink: 0; }
.ob-s1-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #7C4DFF; margin-bottom: 8px; }
.ob-s1-title { font-size: 22px; font-weight: 900; line-height: 1.3; color: var(--text-primary); margin-bottom: 6px; white-space: nowrap; }
.ob-s1-title em { font-style: normal; color: #7C4DFF; }
.ob-s1-subdesc { font-size: 12px; color: var(--text-secondary); line-height: 1.7; }

/* ===== Slide 2: テーマ選び ===== */
.ob-s2 { background: var(--bg); }
.ob-s2-rows {
  flex: 1; display: flex; flex-direction: column;
  justify-content: space-evenly; padding: 6px 0;
  overflow: hidden; background: var(--bg);
}
.ob-s2-row { padding: 4px 0; }
.ob-s2-inner { display: flex; gap: 12px; width: max-content; padding: 5px 20px; align-items: flex-start; }
.ob-s2-inner .theme-card { box-shadow: 0 3px 12px rgba(0,0,0,0.2), 0 1px 4px rgba(0,0,0,0.1); }
.ob-s2-row--l  .ob-s2-inner { animation: obMLeft  28s linear infinite; }
.ob-s2-row--r  .ob-s2-inner { animation: obMRight 32s linear infinite; }
.ob-s2-row--l2 .ob-s2-inner { animation: obMLeft2 26s linear infinite; }
.ob-s2-row--r2 .ob-s2-inner { animation: obMRight2 30s linear infinite; }
@keyframes obMLeft   { 0%{transform:translateX(0)}     100%{transform:translateX(-50%)} }
@keyframes obMRight  { 0%{transform:translateX(-50%)}  100%{transform:translateX(0)} }
@keyframes obMLeft2  { 0%{transform:translateX(-10%)}  100%{transform:translateX(-60%)} }
@keyframes obMRight2 { 0%{transform:translateX(-40%)}  100%{transform:translateX(10%)} }

/* ===== Slide 3 / 4: ランク入力・予想 ===== */
.ob-s34 { background: var(--bg); overflow: hidden; }
.ob-tc {
  width: 158px; height: 86px; border-radius: 11px;
  position: relative; overflow: hidden; flex-shrink: 0;
  box-shadow: 0 6px 20px rgba(0,0,0,0.4); margin-left: 12px;
}
.ob-tc__white {
  position: absolute; clip-path: polygon(40px 0%,100% 0%,100% 100%,22px 100%);
  inset: 0; background: rgba(255,255,255,0.94);
  display: flex; align-items: center; padding: 6px 9px 6px 40px;
}
.ob-tc__text { font-size: 9.5px; font-weight: 700; color: #1A1917; line-height: 1.45; word-break: break-all; white-space: pre-line; }
.ob-tc__pack {
  position: absolute; bottom: 8px; left: 12px;
  font-family: 'DM Sans', sans-serif; font-size: 6px; font-weight: 800;
  color: rgba(255,255,255,0.42); text-transform: uppercase; letter-spacing: .08em;
  writing-mode: vertical-rl; transform: rotate(180deg);
}
.ob-rank-body {
  flex: 1; padding: 10px 16px 6px; display: flex;
  flex-direction: column; position: relative; overflow: hidden;
}
.ob-rank-label { font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: .05em; margin-bottom: 7px; }
.ob-rank-body .rank-char-count { display: none !important; }
.ob-rank-body .rank-item { margin-bottom: 6px; }
.ob-cursor {
  display: inline-block; width: 1.5px; height: 14px;
  background: var(--text-primary); margin-left: 1px;
  animation: obBlink 1s step-end infinite; vertical-align: middle;
}
@keyframes obBlink { 0%,100%{opacity:1} 50%{opacity:0} }
.ob-confirm-btn {
  width: 100%; height: 46px; border-radius: 12px; border: none;
  font-size: 13px; font-weight: 900; font-family: 'Noto Sans JP', sans-serif;
  background: var(--surface-2); color: var(--text-muted); margin-top: 4px;
  flex-shrink: 0; transition: background 0.3s, color 0.3s; cursor: default;
}
.ob-confirm-btn--active { background: var(--hero); color: #fff; }
.ob-confirm-btn--pressed { transform: scale(0.97); opacity: 0.85; }
.ob-touch-dot {
  position: absolute; width: 26px; height: 26px; border-radius: 50%;
  background: rgba(210,40,40,0.55); box-shadow: 0 0 0 8px rgba(210,40,40,0.15);
  pointer-events: none; opacity: 0; z-index: 50;
  transition: top 0.5s cubic-bezier(0.4,0,0.2,1), left 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.25s;
}
@keyframes obDotTap { 0%,100%{transform:scale(1)} 40%{transform:scale(0.82)} }
.ob-touch-dot--tap { animation: obDotTap 0.3s ease; }

/* ===== Slide 5: 結果発表 ===== */
.ob-s5 { background: var(--bg); }
.ob-s5-hero { background: var(--hero); padding: 10px 20px 10px; flex-shrink: 0; position: relative; overflow: hidden; }
.ob-s5-hero-bg { position: absolute; width: 200px; height: 200px; top: -80px; right: -60px; border-radius: 50%; background: rgba(255,255,255,0.03); pointer-events: none; }
.ob-s5-tc-center { display: flex; justify-content: center; margin: 8px 0 10px; }
.ob-s5-score1 { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.09); border-radius: 12px; padding: 8px 14px; }
.ob-s5-score1-name { font-size: 13px; font-weight: 900; color: #fff; }
.ob-s5-score1-pt { margin-left: auto; font-family: 'DM Sans',sans-serif; font-size: 19px; font-weight: 900; font-style: italic; color: #FFD700; }
.ob-s5-score1-pt small { font-size: 10px; font-style: normal; font-weight: 500; color: rgba(255,255,255,0.35); }
.ob-s5-score2 { display: flex; align-items: center; gap: 12px; padding: 6px 14px 0; }
.ob-s5-score2-name { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.6); }
.ob-s5-score2-pt { margin-left: auto; font-family: 'DM Sans',sans-serif; font-size: 14px; font-weight: 900; font-style: italic; color: rgba(255,255,255,0.45); }
.ob-s5-score2-pt small { font-size: 9px; font-style: normal; color: rgba(255,255,255,0.25); }
.ob-s5-content { flex: 1; overflow: hidden; padding: 8px 14px 4px; position: relative; }
.ob-col-headers { display: flex; gap: 0; margin-bottom: 6px; }
.ob-col-header { flex: 1; font-size: 10px; font-weight: 700; color: var(--text-muted); line-height: 1.35; text-align: center; }
.ob-pair-area { display: flex; position: relative; }
.ob-pair-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.ob-pair-spacer { width: 28px; flex-shrink: 0; position: relative; }
.ob-lines-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; z-index: 5; }
.ob-pcard { height: 64px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; flex-direction: column; flex-shrink: 0; background: var(--surface); }
.ob-pcard__hd { height: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 7px; gap: 3px; }
.ob-pcard__rank { font-family: 'DM Sans',sans-serif; font-size: 11px; font-weight: 900; font-style: italic; color: #fff; line-height: 1; }
.ob-pcard__rank small { font-size: 7px; font-style: normal; }
.ob-pcard__tag { font-size: 7.5px; font-weight: 700; color: rgba(255,255,255,0.9); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ob-pcard__body { flex: 1; padding: 2px 7px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.ob-pcard__text { font-size: 10px; font-weight: 600; color: var(--text-primary); line-height: 1.3; text-align: center; word-break: break-all; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; width: 100%; overflow: hidden; }

/* ===== Slide 6: 最後 ===== */
.ob-s6 { background: var(--hero); }
.ob-s6-visual { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 28px 10px; position: relative; overflow: hidden; }
.ob-s6-bg1 { position: absolute; width: 280px; height: 280px; top: -80px; left: -80px; border-radius: 50%; background: rgba(255,255,255,0.03); pointer-events: none; }
.ob-s6-bg2 { position: absolute; width: 140px; height: 140px; bottom: 10px; right: -30px; border-radius: 50%; background: rgba(124,77,255,0.08); pointer-events: none; }
.ob-s6-catch { font-size: 22px; font-weight: 900; color: #fff; line-height: 1.4; text-align: center; margin-bottom: 5px; position: relative; z-index: 1; }
.ob-s6-catch em { font-style: normal; background: linear-gradient(90deg,#a78bfa,#7C4DFF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.ob-s6-sub { font-size: 12px; color: rgba(255,255,255,0.5); text-align: center; line-height: 1.7; margin-bottom: 20px; position: relative; z-index: 1; }
.ob-s6-section { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.35); letter-spacing: .1em; text-transform: uppercase; margin-bottom: 8px; width: 100%; text-align: center; position: relative; z-index: 1; }
.ob-s6-modes { display: flex; gap: 10px; width: 100%; margin-bottom: 16px; position: relative; z-index: 1; }
.ob-s6-mode { flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 11px 10px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.ob-s6-mode__icon { width: 32px; height: 32px; background: rgba(255,255,255,0.12); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.ob-s6-mode__name { font-size: 11px; font-weight: 900; color: #fff; }
.ob-s6-mode__count { font-size: 9px; color: rgba(255,255,255,0.4); }
.ob-s6-scenes { display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; position: relative; z-index: 1; }
.ob-s6-scene { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 50px; padding: 6px 13px; font-size: 11px; color: rgba(255,255,255,0.85); display: flex; align-items: center; gap: 5px; }
.ob-s6-text { background: #fff; border-radius: 24px 24px 0 0; padding: 18px 28px 14px; flex-shrink: 0; }
.ob-s6-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #7C4DFF; margin-bottom: 6px; }
.ob-s6-title { font-size: 19px; font-weight: 900; color: var(--text-primary); line-height: 1.3; margin-bottom: 4px; }
.ob-s6-subdesc { font-size: 12px; color: var(--text-secondary); line-height: 1.7; }
`;
    document.head.appendChild(style);
}

// ========================================
// HTML注入
// ========================================

function _injectHtml() {
    const existing = document.getElementById('obOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'obOverlay';
    overlay.className = 'ob-overlay';
    overlay.innerHTML = `
<div class="ob-phone">
  <div class="ob-status"><span>9:41</span><span>●●●</span></div>
  <div class="ob-wrap" id="obWrap">
    <div class="ob-slides-row" id="obSlidesRow">

      <!-- S1: コンセプト -->
      <div class="ob-slide ob-s1" id="obSlide0">
        <div class="ob-s1-visual">
          <div class="ob-s1-bg1"></div><div class="ob-s1-bg2"></div>
          <div style="display:flex;flex-direction:column;align-items:center;width:100%;">
            <div class="ob-bars" id="obBars">
              <div class="ob-bar-wrap"><div class="ob-bar-num" style="color:rgba(255,255,255,0.45);">5<small>th</small></div><div class="ob-bar ob-bar--anim" style="height:42px;background:rgba(255,255,255,0.28);animation-delay:0.36s;"></div></div>
              <div class="ob-bar-wrap"><div class="ob-bar-num" style="color:rgba(255,255,255,0.65);">3<small>rd</small></div><div class="ob-bar ob-bar--anim" style="height:88px;background:rgba(255,255,255,0.55);animation-delay:0.18s;"></div></div>
              <div class="ob-bar-wrap"><div class="ob-bar-num" style="color:rgba(255,255,255,0.95);">1<small>st</small></div><div class="ob-bar ob-bar--anim" style="height:148px;background:rgba(255,255,255,0.90);animation-delay:0s;"></div></div>
              <div class="ob-bar-wrap"><div class="ob-bar-num" style="color:rgba(255,255,255,0.80);">2<small>nd</small></div><div class="ob-bar ob-bar--anim" style="height:114px;background:rgba(255,255,255,0.72);animation-delay:0.09s;"></div></div>
              <div class="ob-bar-wrap"><div class="ob-bar-num" style="color:rgba(255,255,255,0.52);">4<small>th</small></div><div class="ob-bar ob-bar--anim" style="height:62px;background:rgba(255,255,255,0.40);animation-delay:0.27s;"></div></div>
            </div>
            <div class="ob-podium-base"></div>
          </div>
        </div>
        <div class="ob-s1-text">
          <div class="ob-s1-eyebrow">What is RankNow?</div>
          <div class="ob-s1-title">あなたの<em>価値観</em>がクイズになる</div>
          <div class="ob-s1-subdesc">あなたの好き・嫌いや体験談をランキングにして、<br>お互いに読み合うコミュニケーションゲームです</div>
        </div>
      </div>

      <!-- S2: テーマを選ぶ（JSで動的生成） -->
      <div class="ob-slide ob-s34" id="obSlide1">
        <div class="ob-hero">
          <div class="ob-hero__bg"></div>
          <div class="ob-badge">ゲームの流れ</div>
          <div class="ob-step">STEP 1 / 4</div>
          <div class="ob-title">テーマを<em>選ぶ</em></div>
          <div class="ob-desc">気になるテーマを選んでゲームスタート。アプリが用意したテーマだけでなく、オリジナルのテーマで遊ぶことも。</div>
        </div>
        <div class="ob-s2-rows" id="obS2Rows">
          <div class="ob-s2-row ob-s2-row--l"><div class="ob-s2-inner" id="obS2Row0"></div></div>
          <div class="ob-s2-row ob-s2-row--r"><div class="ob-s2-inner" id="obS2Row1"></div></div>
          <div class="ob-s2-row ob-s2-row--l2"><div class="ob-s2-inner" id="obS2Row2"></div></div>
          <div class="ob-s2-row ob-s2-row--r2"><div class="ob-s2-inner" id="obS2Row3"></div></div>
        </div>
      </div>

      <!-- S3: TOP5を書く -->
      <div class="ob-slide ob-s34" id="obSlide2">
        <div class="ob-hero">
          <div class="ob-hero__bg"></div>
          <div class="ob-header-row">
            <div class="ob-header-left">
              <div class="ob-badge">ゲームの流れ</div>
              <div class="ob-step">STEP 2 / 4</div>
              <div class="ob-title">TOP5を<em>自由に書く</em></div>
              <div class="ob-desc">テーマに沿って、自分のTOP5を自由に入力しよう。</div>
            </div>
            <div class="ob-tc" style="background:#5A3015;">
              <div class="ob-tc__white"><span class="ob-tc__text">お金を出し惜しみ\nしたくないもの・こと\nTOP5</span></div>
              <span class="ob-tc__pack">PRIVATE</span>
            </div>
          </div>
        </div>
        <div class="ob-rank-body" id="obS3Body">
          <div class="ob-rank-label">My rank is...</div>
          ${_rankItemsHtml('ob3', ['','','','',''])}
          <button class="ob-confirm-btn" id="obS3Btn">あなたのTOP5を確定する</button>
          <div class="ob-touch-dot" id="obS3Dot"></div>
        </div>
      </div>

      <!-- S4: 予想する -->
      <div class="ob-slide ob-s34" id="obSlide3">
        <div class="ob-hero">
          <div class="ob-hero__bg"></div>
          <div class="ob-header-row">
            <div class="ob-header-left">
              <div class="ob-badge">ゲームの流れ</div>
              <div class="ob-step">STEP 3 / 4</div>
              <div class="ob-title">相手のTOP5を<em>予想</em></div>
              <div class="ob-desc">バラバラに表示された相手のTOP5を正しい順番に並び替えよう</div>
            </div>
            <div class="ob-tc" style="background:#5A3015;">
              <div class="ob-tc__white"><span class="ob-tc__text">お金を出し惜しみ\nしたくないもの・こと\nTOP5</span></div>
              <span class="ob-tc__pack">PRIVATE</span>
            </div>
          </div>
        </div>
        <div class="ob-rank-body" id="obS4Body">
          <div class="ob-rank-label">Your rank is...</div>
          ${_rankItemsHtml('ob4', ['旅行', '自己研鑽', 'ゲーム', 'アウトドア用品', 'カフェ'])}
          <button class="ob-confirm-btn ob-confirm-btn--active" style="margin-top:4px;">予想を確定する</button>
          <div class="ob-touch-dot" id="obS4Dot"></div>
        </div>
      </div>

      <!-- S5: 結果発表 -->
      <!-- たくの予想: 美容(1→あたり◎+10), カフェ(2→かすり▽+1), 本(3→おしい○+6), 旅行(4→ちかい△+3), 飲み会(5→ちかい△+3) = 23pt -->
      <!-- ゆか 34pt (1位), たく 23pt (2位) -->
      <div class="ob-slide ob-s5" id="obSlide4">
        <div class="ob-s5-hero">
          <div class="ob-s5-hero-bg"></div>
          <div class="ob-badge">ゲームの流れ</div>
          <div class="ob-step" style="margin-bottom:2px;">STEP 4 / 4</div>
          <div class="ob-title" style="margin-bottom:4px;">結果発表！</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.62);line-height:1.55;margin-bottom:0;">正しいランクと予想とのズレが少ないほど高いスコアに。<br>結果をもとに会話を楽しもう！</div>
          <div class="ob-s5-tc-center">
            <div class="ob-tc" style="background:#5A3015;margin:0;">
              <div class="ob-tc__white"><span class="ob-tc__text">お金を出し惜しみ\nしたくないもの・こと\nTOP5</span></div>
              <span class="ob-tc__pack">PRIVATE</span>
            </div>
          </div>
          <div class="ob-s5-score1">
            <div>🏆</div>
            <div><div class="ob-s5-score1-name">ゆか</div></div>
            <div class="ob-s5-score1-pt">34<small>pt</small></div>
          </div>
          <div class="ob-s5-score2">
            <div class="ob-s5-score2-name">たく</div>
            <div class="ob-s5-score2-pt">23<small>pt</small></div>
          </div>
        </div>
        <div class="ob-s5-content">
          <div class="ob-col-headers">
            <div class="ob-col-header">ゆかの<br>正しいランク</div>
            <div style="width:28px;flex-shrink:0;"></div>
            <div class="ob-col-header">たくの<br>予想＆スコア</div>
          </div>
          <div class="ob-pair-area" id="obS5PairArea">
            <div class="ob-pair-col" id="obS5Left">
              ${_pcardHtml('obL1','1st',OB_RANK_COLORS[0],'美容','')}
              ${_pcardHtml('obL2','2nd',OB_RANK_COLORS[1],'旅行','')}
              ${_pcardHtml('obL3','3rd',OB_RANK_COLORS[2],'飲み会','')}
              ${_pcardHtml('obL4','4th',OB_RANK_COLORS[3],'本','')}
              ${_pcardHtml('obL5','5th',OB_RANK_COLORS[4],'カフェ','')}
            </div>
            <div class="ob-pair-spacer" id="obS5Spacer">
              <svg class="ob-lines-svg" id="obS5Svg" xmlns="http://www.w3.org/2000/svg"></svg>
            </div>
            <div class="ob-pair-col" id="obS5Right">
              ${_pcardHtml('obR1','1st',OB_RANK_COLORS[0],'美容','◎あたり +10pt')}
              ${_pcardHtml('obR2','2nd',OB_RANK_COLORS[4],'カフェ','▽かすり +1pt')}
              ${_pcardHtml('obR3','3rd',OB_RANK_COLORS[3],'本','○おしい +6pt')}
              ${_pcardHtml('obR4','4th',OB_RANK_COLORS[1],'旅行','△ちかい +3pt')}
              ${_pcardHtml('obR5','5th',OB_RANK_COLORS[2],'飲み会','△ちかい +3pt')}
            </div>
          </div>
        </div>
      </div>

      <!-- S6: さあ始めよう -->
      <div class="ob-slide ob-s6" id="obSlide5">
        <div class="ob-s6-visual">
          <div class="ob-s6-bg1"></div><div class="ob-s6-bg2"></div>
          <div class="ob-s6-catch">お互いのこと、<br><em>本当にわかってる？</em></div>
          <div class="ob-s6-sub">正解しても外れても、それが話題になる。<br>意外な一面を見つけよう。</div>
          <div class="ob-s6-section">プレイ人数</div>
          <div class="ob-s6-modes">
            <div class="ob-s6-mode">
              <div class="ob-s6-mode__icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="7" r="3"/><path d="M22 21v-2a3 3 0 0 0-2-2.83"/></svg></div>
              <div class="ob-s6-mode__name">ふたりで</div>
              <div class="ob-s6-mode__count">2人専用</div>
            </div>
            <div class="ob-s6-mode">
              <div class="ob-s6-mode__icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="8" r="2.5"/><circle cx="12" cy="6" r="2.5"/><circle cx="18.5" cy="8" r="2.5"/><path d="M2 21v-1.5A3.5 3.5 0 0 1 5.5 16h1"/><path d="M22 21v-1.5A3.5 3.5 0 0 0 18.5 16h-1"/><path d="M9 21v-2a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v2"/></svg></div>
              <div class="ob-s6-mode__name">みんなで</div>
              <div class="ob-s6-mode__count">3〜10人</div>
            </div>
          </div>
          <div class="ob-s6-section">利用シーン</div>
          <div class="ob-s6-scenes">
            <div class="ob-s6-scene">💑 デート</div>
            <div class="ob-s6-scene">🍺 飲み会・合コン</div>
            <div class="ob-s6-scene">✈️ 旅行・おでかけ</div>
            <div class="ob-s6-scene">🤝 自己紹介・交流</div>
          </div>
        </div>
        <div class="ob-s6-text">
          <div class="ob-s6-eyebrow">Let's start!</div>
          <div class="ob-s6-title">まずニックネームを設定しよう</div>
          <div class="ob-s6-subdesc">あとからいつでも変更できます。</div>
        </div>
      </div>

    </div>
  </div>
  <div class="ob-footer">
    <div class="ob-dots" id="obDots">
      <div class="ob-dot ob-dot--on"></div>
      <div class="ob-dot"></div><div class="ob-dot"></div>
      <div class="ob-dot"></div><div class="ob-dot"></div>
      <div class="ob-dot"></div>
    </div>
    <div class="ob-btn-row">
      <button class="ob-back" id="obBackBtn" onclick="obGoTo(_obCurrent-1)" disabled>← 戻る</button>
      <button class="ob-next" id="obNextBtn" onclick="obGoTo(_obCurrent+1)">次へ →</button>
      <button class="ob-cta"  id="obCtaBtn"  onclick="_obFinish()">ニックネームを設定して始める！</button>
    </div>
  </div>
</div>
`;
    document.body.appendChild(overlay);
}

// ランクアイテムHTML生成ヘルパー
function _rankItemsHtml(prefix, texts) {
    const suff = ['st','nd','rd','th','th'];
    return texts.map((t, i) => {
        const n = i + 1;
        const textHtml = t
            ? `<span style="font-size:13px;font-weight:500;">${t}</span>`
            : `<span style="font-size:13px;color:var(--text-muted);">${n}位を入力</span>`;
        return `<div class="rank-item" id="${prefix}r${n}">
          <div class="rank-badge-area">
            <div class="rank-badge" id="${prefix}b${n}">
              <span style="font-size:17px;line-height:1;">${n}</span>
              <span style="font-size:9px;opacity:0.6;">${suff[i]}</span>
            </div>
          </div>
          <div id="${prefix}t${n}" style="flex:1;min-width:0;padding:1px 0;">${textHtml}</div>
          <div class="rank-drag-handle"><svg width="14" height="20" viewBox="0 0 12 18" fill="currentColor" style="display:block;"><circle cx="3.5" cy="3.5" r="1.6"/><circle cx="8.5" cy="3.5" r="1.6"/><circle cx="3.5" cy="9" r="1.6"/><circle cx="8.5" cy="9" r="1.6"/><circle cx="3.5" cy="14.5" r="1.6"/><circle cx="8.5" cy="14.5" r="1.6"/></svg></div>
        </div>`;
    }).join('');
}

// 結果カードHTML生成ヘルパー
function _pcardHtml(id, rankLabel, bgColor, text, tag) {
    return `<div class="ob-pcard" id="${id}">
      <div class="ob-pcard__hd" style="background:${bgColor};">
        <span class="ob-pcard__rank">${rankLabel.replace(/(\d+)/,'$1<small>').replace(/(st|nd|rd|th)/,'$1</small>')}</span>
        ${tag ? `<span class="ob-pcard__tag">${tag}</span>` : ''}
      </div>
      <div class="ob-pcard__body"><div class="ob-pcard__text">${text}</div></div>
    </div>`;
}

// ========================================
// Slide 2: テーマカード動的生成
// ========================================

function _buildSlide2Cards() {
    OB_SLIDE2_PACKS.forEach((packId, rowIdx) => {
        const el = document.getElementById(`obS2Row${rowIdx}`);
        if (!el) return;
        const meta = packMeta[packId];
        if (!meta) return;
        const items = themes.filter(t => t.pack === packId).slice(0, OB_CARDS_PER_ROW);
        if (items.length === 0) return;
        let html = '';
        for (let r = 0; r < 2; r++) {
            items.forEach(item => {
                html += `<div class="theme-card" style="background:${meta.color};flex-shrink:0;">
                  <div class="theme-card__white"><span class="theme-card__text">${item.text}</span></div>
                  <span class="theme-card__pack">${meta.labelEn}</span>
                </div>`;
            });
        }
        el.innerHTML = html;
    });
}

// ========================================
// ナビゲーション
// ========================================

let _obCurrent = 0;
const OB_TOTAL = 6;

function _initNav() {
    _obCurrent = 0;
    _updateNav();
}

function obGoTo(n) {
    n = Math.max(0, Math.min(OB_TOTAL - 1, n));
    _obCurrent = n;
    const row = document.getElementById('obSlidesRow');
    if (row) row.style.transform = `translateX(-${n * 100}%)`;
    _updateNav();
    _startSlide(n);
}

function _updateNav() {
    const n = _obCurrent;
    const dots = document.querySelectorAll('#obDots .ob-dot');
    dots.forEach((d, i) => d.classList.toggle('ob-dot--on', i === n));
    const backBtn = document.getElementById('obBackBtn');
    const nextBtn = document.getElementById('obNextBtn');
    const ctaBtn  = document.getElementById('obCtaBtn');
    if (backBtn) backBtn.disabled = (n === 0);
    const isLast = (n === OB_TOTAL - 1);
    if (nextBtn) nextBtn.style.display = isLast ? 'none' : '';
    if (ctaBtn)  ctaBtn.style.display  = isLast ? '' : 'none';
}

function _obFinish() {
    localStorage.setItem(OB_STORAGE_KEY, '1');
    hideOnboarding();
    if (typeof _obOnComplete === 'function') _obOnComplete();
}

// ========================================
// スライドごとのアニメーション起動
// ========================================

function _startSlide(n) {
    if (n === 0) _startS1();
    if (n === 2) _startS3();
    if (n === 3) _startS4();
    if (n === 4) _startS5();
}

// ========================================
// Slide 1: 棒グラフアニメーション
// ========================================

function _startS1() {
    document.querySelectorAll('#obSlide0 .ob-bar').forEach(bar => {
        bar.style.animation = 'none';
        void bar.offsetHeight;
        bar.style.animation = '';
    });
}

// ========================================
// Slide 3: タイピング + スワップ アニメーション
// ========================================

const _S3_TEXTS = ['美容', '旅行', '飲み会', '本', 'カフェ'];
let _s3Timers = [];

function _clearS3() { _s3Timers.forEach(clearTimeout); _s3Timers = []; }
function _s3At(fn, ms) { const id = setTimeout(fn, ms); _s3Timers.push(id); return id; }

function _startS3() { _clearS3(); _resetS3(); _s3At(_runS3, 300); }

function _resetS3() {
    for (let i = 1; i <= 5; i++) {
        const tEl = document.getElementById(`ob3t${i}`);
        const rEl = document.getElementById(`ob3r${i}`);
        const bEl = document.getElementById(`ob3b${i}`);
        if (tEl) tEl.innerHTML = `<span style="font-size:13px;color:var(--text-muted);">${i}位を入力</span>`;
        if (rEl) { rEl.style.transition = 'none'; rEl.style.transform = ''; rEl.style.borderColor = ''; rEl.style.opacity = '1'; }
        if (bEl) bEl.innerHTML = `<span style="font-size:17px;line-height:1;">${i}</span><span style="font-size:9px;opacity:0.6;">${OB_RANK_SUFF[i-1]}</span>`;
    }
    const btn = document.getElementById('obS3Btn');
    if (btn) btn.className = 'ob-confirm-btn';
    const dot = document.getElementById('obS3Dot');
    if (dot) { dot.style.transition = 'none'; dot.style.opacity = '0'; }
}

function _runS3() {
    _clearS3();
    let delay = 0;

    // タイピングフェーズ
    for (let i = 0; i < 5; i++) {
        const text = _S3_TEXTS[i];
        const tId = `ob3t${i+1}`;
        const rId = `ob3r${i+1}`;
        _s3At(() => {
            for (let j = 1; j <= 5; j++) { const r = document.getElementById(`ob3r${j}`); if (r) r.style.borderColor = ''; }
            const rEl = document.getElementById(rId);
            if (rEl) rEl.style.borderColor = 'var(--text-primary)';
            const tEl = document.getElementById(tId);
            if (tEl) tEl.innerHTML = '<span class="ob-cursor"></span>';
        }, delay);
        for (let c = 0; c < text.length; c++) {
            _s3At(((ch, id, full) => () => {
                const tEl = document.getElementById(id);
                if (!tEl) return;
                const cur = tEl.querySelector('[data-typed]')?.textContent || '';
                tEl.innerHTML = `<span data-typed style="font-size:13px;font-weight:500;">${cur}${ch}</span><span class="ob-cursor"></span>`;
            })(text[c], tId, text), delay + 100 + c * 120);
        }
        _s3At(() => {
            const tEl = document.getElementById(tId);
            if (tEl) tEl.innerHTML = `<span style="font-size:13px;font-weight:500;">${text}</span>`;
            const rEl = document.getElementById(rId);
            if (rEl) rEl.style.borderColor = '';
        }, delay + 100 + text.length * 120 + 100);
        delay += 100 + text.length * 120 + 260;
    }

    // 確定ボタン活性
    _s3At(() => {
        const btn = document.getElementById('obS3Btn');
        if (btn) btn.classList.add('ob-confirm-btn--active');
    }, delay);
    delay += 400;

    // スワップ1: 2↔3
    _s3At(() => _showDot('obS3Dot', 'ob3r3', 'obS3Body'), delay);
    _s3At(() => _doSwap('ob3', 2, 3, 'obS3Dot', 'obS3Body'), delay + 300);
    delay += 300 + 520 + 350;

    // スワップ2: 4↔5
    _s3At(() => _showDot('obS3Dot', 'ob3r5', 'obS3Body'), delay);
    _s3At(() => _doSwap('ob3', 4, 5, 'obS3Dot', 'obS3Body'), delay + 300);
    delay += 300 + 520 + 400;

    // 確定ボタンタッチ
    _s3At(() => _tapConfirmBtn('obS3Dot', 'obS3Btn', 'obS3Body'), delay);

    // フェードアウト
    _s3At(() => {
        const dot = document.getElementById('obS3Dot');
        if (dot) { dot.style.transition = 'opacity 0.3s'; dot.style.opacity = '0'; }
        for (let i = 1; i <= 5; i++) {
            const rEl = document.getElementById(`ob3r${i}`);
            if (rEl) { rEl.style.transition = 'opacity 0.35s'; rEl.style.opacity = '0'; }
        }
    }, delay + 400);

    // リセット & ループ
    _s3At(() => {
        _resetS3();
        for (let i = 1; i <= 5; i++) {
            const rEl = document.getElementById(`ob3r${i}`); if (rEl) rEl.style.opacity = '0';
        }
        requestAnimationFrame(() => {
            for (let i = 1; i <= 5; i++) {
                const rEl = document.getElementById(`ob3r${i}`);
                if (rEl) { rEl.style.transition = 'opacity 0.4s'; rEl.style.opacity = '1'; }
            }
        });
        _s3At(_runS3, 600);
    }, delay + 850);
}

// ========================================
// Slide 4: スワップ アニメーション
// ========================================

const _S4_TEXTS = ['旅行', '自己研鑽', 'ゲーム', 'アウトドア用品', 'カフェ'];
let _s4Timers = [];

function _clearS4() { _s4Timers.forEach(clearTimeout); _s4Timers = []; }
function _s4At(fn, ms) { const id = setTimeout(fn, ms); _s4Timers.push(id); return id; }

function _startS4() { _clearS4(); _resetS4(); _s4At(_runS4, 400); }

function _resetS4() {
    _S4_TEXTS.forEach((text, i) => {
        const n = i + 1;
        const rEl = document.getElementById(`ob4r${n}`);
        const bEl = document.getElementById(`ob4b${n}`);
        const tEl = document.getElementById(`ob4t${n}`);
        if (rEl) { rEl.style.cssText = ''; }
        if (tEl) tEl.innerHTML = `<span style="font-size:13px;font-weight:500;">${text}</span>`;
        if (bEl) bEl.innerHTML = `<span style="font-size:17px;line-height:1;">${n}</span><span style="font-size:9px;opacity:0.6;">${OB_RANK_SUFF[i]}</span>`;
    });
    const dot = document.getElementById('obS4Dot');
    if (dot) { dot.style.transition = 'none'; dot.style.opacity = '0'; }
}

function _runS4() {
    _clearS4();
    _s4At(() => _showDot('obS4Dot', 'ob4r2', 'obS4Body'), 0);
    _s4At(() => _doSwap('ob4', 1, 2, 'obS4Dot', 'obS4Body'), 300);
    _s4At(() => _showDot('obS4Dot', 'ob4r4', 'obS4Body'), 1450);
    _s4At(() => _doSwap('ob4', 3, 4, 'obS4Dot', 'obS4Body'), 1750);
    _s4At(() => _tapConfirmBtn('obS4Dot', null, 'obS4Body', document.querySelector('#obSlide3 .ob-confirm-btn')), 2750);
    _s4At(() => {
        const dot = document.getElementById('obS4Dot');
        if (dot) { dot.style.transition = 'opacity 0.3s'; dot.style.opacity = '0'; }
        for (let i = 1; i <= 5; i++) {
            const rEl = document.getElementById(`ob4r${i}`);
            if (rEl) { rEl.style.transition = 'opacity 0.35s'; rEl.style.opacity = '0'; }
        }
    }, 3150);
    _s4At(() => {
        _resetS4();
        for (let i = 1; i <= 5; i++) {
            const rEl = document.getElementById(`ob4r${i}`); if (rEl) rEl.style.opacity = '0';
        }
        requestAnimationFrame(() => {
            for (let i = 1; i <= 5; i++) {
                const rEl = document.getElementById(`ob4r${i}`);
                if (rEl) { rEl.style.transition = 'opacity 0.4s'; rEl.style.opacity = '1'; }
            }
        });
        _s4At(_runS4, 600);
    }, 3600);
}

// ========================================
// 共通アニメーションヘルパー
// ========================================

function _showDot(dotId, itemId, bodyId) {
    const dot  = document.getElementById(dotId);
    const rEl  = document.getElementById(itemId);
    const body = document.getElementById(bodyId);
    if (!dot || !rEl || !body) return;
    const br  = body.getBoundingClientRect();
    const rr  = rEl.getBoundingClientRect();
    const dh  = rEl.querySelector('.rank-drag-handle');
    const dhr = dh ? dh.getBoundingClientRect() : rr;
    dot.style.cssText = `opacity:1;left:${dhr.left - br.left + dhr.width/2 - 13}px;top:${rr.top - br.top + rr.height/2 - 13}px;transition:opacity 0.2s;`;
    dot.classList.add('ob-touch-dot--tap');
    setTimeout(() => dot.classList.remove('ob-touch-dot--tap'), 300);
}

/**
 * コンテンツスワップ（DOMの並び替えなし）
 * - アニメ前: バッジを視覚位置に合わせ更新
 * - 520ms後: transform解除 → テキスト入れ替え → バッジをDOM位置に戻す
 */
function _doSwap(prefix, idxA, idxB, dotId, bodyId) {
    const rA  = document.getElementById(`${prefix}r${idxA}`);
    const rB  = document.getElementById(`${prefix}r${idxB}`);
    const bA  = document.getElementById(`${prefix}b${idxA}`);
    const bB  = document.getElementById(`${prefix}b${idxB}`);
    const dot  = document.getElementById(dotId);
    const body = document.getElementById(bodyId);
    if (!rA || !rB) return;

    const itemH = rA.offsetHeight + 6;
    const diff  = idxB - idxA;

    // バッジを視覚的な移動先の位置に更新
    if (bA) bA.innerHTML = `<span style="font-size:17px;line-height:1;">${idxB}</span><span style="font-size:9px;opacity:0.6;">${OB_RANK_SUFF[idxB-1]}</span>`;
    if (bB) bB.innerHTML = `<span style="font-size:17px;line-height:1;">${idxA}</span><span style="font-size:9px;opacity:0.6;">${OB_RANK_SUFF[idxA-1]}</span>`;

    // アニメーション開始
    rA.style.transition = rB.style.transition = 'transform 0.5s ease, border-color 0.2s';
    rA.style.transform  = `translateY(${diff * itemH}px)`;
    rB.style.transform  = `translateY(${-diff * itemH}px)`;
    rA.style.borderColor = rB.style.borderColor = 'var(--text-primary)';

    if (dot && body) {
        const br  = body.getBoundingClientRect();
        const rAr = rA.getBoundingClientRect();
        dot.style.transition = 'top 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.2s';
        dot.style.top = `${rAr.top - br.top + rAr.height/2 - 13}px`;
    }

    // 520ms後: transform解除・テキスト入れ替え・バッジ復元
    const tid = setTimeout(() => {
        rA.style.transition = rB.style.transition = 'none';
        rA.style.transform  = rB.style.transform  = '';
        rA.style.borderColor = rB.style.borderColor = '';

        const tA = document.getElementById(`${prefix}t${idxA}`);
        const tB = document.getElementById(`${prefix}t${idxB}`);
        if (tA && tB) { const tmp = tA.innerHTML; tA.innerHTML = tB.innerHTML; tB.innerHTML = tmp; }

        if (bA) bA.innerHTML = `<span style="font-size:17px;line-height:1;">${idxA}</span><span style="font-size:9px;opacity:0.6;">${OB_RANK_SUFF[idxA-1]}</span>`;
        if (bB) bB.innerHTML = `<span style="font-size:17px;line-height:1;">${idxB}</span><span style="font-size:9px;opacity:0.6;">${OB_RANK_SUFF[idxB-1]}</span>`;
        if (dot) { dot.style.transition = 'opacity 0.25s'; dot.style.opacity = '0'; }
    }, 520);
    _s3Timers.push(tid);
    _s4Timers.push(tid);
}

function _tapConfirmBtn(dotId, btnId, bodyId, btnEl) {
    const dot  = document.getElementById(dotId);
    const btn  = btnEl || document.getElementById(btnId);
    const body = document.getElementById(bodyId);
    if (!dot || !btn || !body) return;
    const br   = body.getBoundingClientRect();
    const btnR = btn.getBoundingClientRect();
    dot.style.cssText = `opacity:1;left:${btnR.left - br.left + btnR.width/2 - 13}px;top:${btnR.top - br.top + btnR.height/2 - 13}px;transition:opacity 0.2s;`;
    dot.classList.add('ob-touch-dot--tap');
    setTimeout(() => dot.classList.remove('ob-touch-dot--tap'), 300);
    btn.classList.add('ob-confirm-btn--pressed');
    setTimeout(() => btn.classList.remove('ob-confirm-btn--pressed'), 300);
}

// ========================================
// Slide 5: ペア結果 SVG接続線
// 線の色 = 左カード（正しいランク）のヘッダー色
// 線の太さ・破線 = getScoreLineStyle(diff) 準拠
// ========================================

function _startS5() {
    setTimeout(_drawS5Lines, 120);
}

function _drawS5Lines() {
    const svg = document.getElementById('obS5Svg');
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const spacer = document.getElementById('obS5Spacer');
    if (!spacer) return;

    // 左カード色を基準色として使用。線スタイルはdiffで決定。
    const connections = [
        { lId:'obL1', rId:'obR1', color: OB_RANK_COLORS[0], sw:3.5,  dash:''    }, // 美容 diff=0 あたり
        { lId:'obL2', rId:'obR4', color: OB_RANK_COLORS[1], sw:1.5,  dash:''    }, // 旅行 diff=2 ちかい
        { lId:'obL3', rId:'obR5', color: OB_RANK_COLORS[2], sw:1.5,  dash:''    }, // 飲み会 diff=2 ちかい
        { lId:'obL4', rId:'obR3', color: OB_RANK_COLORS[3], sw:2.5,  dash:''    }, // 本 diff=1 おしい
        { lId:'obL5', rId:'obR2', color: OB_RANK_COLORS[4], sw:1.5,  dash:'6,4' }, // カフェ diff=3 かすり（破線）
    ];

    const svgRect = spacer.getBoundingClientRect();

    connections.forEach(({ lId, rId, color, sw, dash }) => {
        const lEl = document.getElementById(lId);
        const rEl = document.getElementById(rId);
        if (!lEl || !rEl) return;
        const lr = lEl.getBoundingClientRect();
        const rr = rEl.getBoundingClientRect();
        const x1 = lr.right  - svgRect.left;
        const y1 = lr.top + lr.height/2 - svgRect.top;
        const x2 = rr.left   - svgRect.left;
        const y2 = rr.top + rr.height/2 - svgRect.top;

        const NS = 'http://www.w3.org/2000/svg';
        const c1 = document.createElementNS(NS,'circle');
        c1.setAttribute('cx',x1);c1.setAttribute('cy',y1);c1.setAttribute('r','3.5');
        c1.setAttribute('fill',color);c1.setAttribute('opacity','0.85');
        svg.appendChild(c1);

        const line = document.createElementNS(NS,'line');
        line.setAttribute('x1',x1);line.setAttribute('y1',y1);
        line.setAttribute('x2',x2);line.setAttribute('y2',y2);
        line.setAttribute('stroke',color);line.setAttribute('stroke-width',sw);
        line.setAttribute('stroke-opacity','0.8');
        if (dash) line.setAttribute('stroke-dasharray',dash);
        svg.appendChild(line);

        const c2 = document.createElementNS(NS,'circle');
        c2.setAttribute('cx',x2);c2.setAttribute('cy',y2);c2.setAttribute('r','3.5');
        c2.setAttribute('fill',color);c2.setAttribute('opacity','0.85');
        svg.appendChild(c2);
    });
}

// ========================================
// タイマー全クリア（hideOnboarding用）
// ========================================

function _clearAllTimers() {
    _clearS3();
    _clearS4();
}

// ========================================
// 開発・テスト用ユーティリティ
// ブラウザコンソールから呼び出し可能
// ========================================

/**
 * オンボーディングをリセットして再表示する
 * コンソールから: resetOnboarding()
 */
function resetOnboarding() {
    localStorage.removeItem(OB_STORAGE_KEY);
    const existing = document.getElementById('obOverlay');
    if (existing) hideOnboarding();
    setTimeout(() => showOnboarding(null), existing ? 400 : 0);
    console.log('[Onboarding] リセットしました。再表示します。');
}
