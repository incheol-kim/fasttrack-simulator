// Central application state + lifecycle.
window.FT = window.FT || {};

FT.app = {
  state: {
    // Two snapshots of params: what UI shows (pending) vs what sim runs on (applied).
    pendingParams: null,
    appliedParams: null,
    seed: 42,

    arrivals: null,
    simL: null,
    simR: null,
    statsL: null,
    statsR: null,
    rendererL: null,
    rendererR: null,

    playing: false,
    simSpeed: 60,

    lastFrameTime: 0,
    lastStatsRender: 0,
  },

  // Time helpers ──────────────────────────────────────────
  timeToMin(s) {
    if (!s || typeof s !== 'string') return 0;
    const parts = s.split(':');
    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  },
  minToTime(m) {
    const h = Math.floor(m / 60), mm = Math.floor(m) % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  },
  simTimeToWallClock(simSec, openMin) {
    const totalMin = openMin + simSec / 60;
    return FT.app.minToTime(totalMin);
  },

  // Lifecycle ─────────────────────────────────────────────
  init() {
    FT.theme.init();
    FT.i18n.init();
    this.state.pendingParams = { ...FT.DEFAULT_PARAMS };
    this.state.appliedParams = FT.clampParams({ ...FT.DEFAULT_PARAMS });
    this.buildSim();
    FT.ui.build();
    FT.ui.bindEvents();
    FT.ui.updateSpeedTooltips();
    FT.tooltip.bind(document.body);
    this._setupRenderers();
    FT.i18n.onChange(() => {
      FT.ui.rebuildAll();
      if (this.state.rendererL) {
        this.state.rendererL.refreshLabels();
        this.state.rendererR.refreshLabels();
      }
      FT.view.renderStatus();
      FT.view.renderPanels();
      FT.view.renderStats();
    });
    FT.view.renderStatus();
    FT.view.renderPanels();
    FT.view.renderStats();
    FT.ui.refreshDerived();
    FT.loop.start();
  },

  _setupRenderers() {
    const cvL = document.getElementById('canvas-L');
    const cvR = document.getElementById('canvas-R');
    this.state.rendererL = new FT.Renderer(cvL, 'L');
    this.state.rendererR = new FT.Renderer(cvR, 'R');
    this.state.rendererL.attachSim(this.state.simL);
    this.state.rendererR.attachSim(this.state.simR);
    window.addEventListener('resize', () => {
      this.state.rendererL.resize();
      this.state.rendererR.resize();
    });
    FT.theme.onChange(() => {
      this.state.rendererL.refreshTheme();
      this.state.rendererR.refreshTheme();
      const btn = document.getElementById('btn-theme');
      if (btn) btn.textContent = FT.theme.current() === 'light' ? '🌙' : '☀';
    });
  },

  buildSim() {
    const p = this.state.appliedParams;
    const rng = FT.makeRng(this.state.seed);
    const { arrivals } = FT.generateArrivals(p, rng);
    this.state.arrivals = arrivals;
    this.state.simL = new FT.Simulator(p, arrivals, 'noFP');
    this.state.simR = new FT.Simulator(p, arrivals, 'withFP');
    this.state.statsL = new FT.StatsCollector(p);
    this.state.statsR = new FT.StatsCollector(p);
  },

  applyAndRestart() {
    this.state.appliedParams = FT.clampParams({ ...this.state.pendingParams });
    this.state.pendingParams = { ...this.state.appliedParams };
    this.buildSim();
    this.state.playing = false;
    FT.ui.refreshFromPending();
    FT.ui.refreshDerived();
    FT.ui.updatePlayButton();
    FT.ui.updateSpeedTooltips();
    if (this.state.rendererL) {
      this.state.rendererL.attachSim(this.state.simL);
      this.state.rendererR.attachSim(this.state.simR);
    }
    FT.view.renderStatus();
    FT.view.renderPanels();
    FT.view.renderStats();
  },

  reset() {
    // Same applied params + same seed → reproducible
    this.buildSim();
    this.state.playing = false;
    FT.ui.updatePlayButton();
    if (this.state.rendererL) {
      this.state.rendererL.attachSim(this.state.simL);
      this.state.rendererR.attachSim(this.state.simR);
    }
    FT.view.renderStatus();
    FT.view.renderPanels();
    FT.view.renderStats();
  },

  togglePlay() {
    if (this.state.simL && this.state.simL.done) return;
    this.state.playing = !this.state.playing;
    FT.ui.updatePlayButton();
  },

  setSpeed(s) {
    this.state.simSpeed = s;
    FT.ui.updateSpeedButtons();
  },
};

window.addEventListener('DOMContentLoaded', () => FT.app.init());
