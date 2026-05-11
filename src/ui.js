// Controls panel + scenario presets + help modal renderer.
// All user-visible strings come from FT.i18n.
window.FT = window.FT || {};

FT.ui = (function () {
  const T = (k, p) => FT.i18n.t(k, p);

  // Control definitions: labels and tips are i18n keys.
  const CONTROLS = [
    { id: 'openTime',                 kind: 'time',   min: 360,  max: 720,   step: 5 },
    { id: 'closeTime',                kind: 'time',   min: 1080, max: 1440,  step: 5 },
    { id: 'dailyVisitors',            kind: 'number', min: 100,  max: 50000, step: 100,
      hint: () => T('hint.safeVisitors', { N: FT.safeDailyVisitors(FT.app.state.pendingParams).toLocaleString() }) },
    { id: 'dailyFastPassCount',       kind: 'number', min: 0,    max: 50000, step: 100 },
    { id: 'capacityPerCycle',         kind: 'number', min: 4,    max: 100,   step: 1 },
    { id: 'fastPassPercentPerCycle',  kind: 'number', min: 0,    max: 100,   step: 1,
      hint: () => T('hint.fpSlots', {
        SLOTS: FT.fastPassSlotsPerCycle(FT.app.state.pendingParams),
        CAP:   FT.app.state.pendingParams.capacityPerCycle,
      }) },
    { id: 'cycleDurationSec',         kind: 'number', min: 30,   max: 900,   step: 10 },
    { id: 'peakStart',                kind: 'time',   min: 360,  max: 1440,  step: 15 },
    { id: 'peakEnd',                  kind: 'time',   min: 360,  max: 1440,  step: 15 },
    { id: 'peakMaxWaitMin',           kind: 'number', min: 10,   max: 300,   step: 10 },
  ];

  const SPEEDS = [1, 10, 60, 300, 600];

  const PRESETS = [
    { id: 'calm',    params: { dailyVisitors: 2500,  dailyFastPassCount: 200,  peakMaxWaitMin: 30,  fastPassPercentPerCycle: 33 } },
    { id: 'normal',  params: { dailyVisitors: 6000,  dailyFastPassCount: 800,  peakMaxWaitMin: 90,  fastPassPercentPerCycle: 33 } },
    { id: 'busy',    params: { dailyVisitors: 10000, dailyFastPassCount: 1500, peakMaxWaitMin: 180, fastPassPercentPerCycle: 33 } },
    { id: 'fpheavy', params: { dailyVisitors: 6000,  dailyFastPassCount: 3000, peakMaxWaitMin: 120, fastPassPercentPerCycle: 60 } },
  ];

  // ── Time/duration formatters for dynamic speed tooltips ──
  function fmtRealDuration(sec) {
    sec = Math.round(sec);
    if (sec < 60)   return T('dur.seconds', { S: sec });
    if (sec < 3600) {
      const m = Math.floor(sec / 60), s = sec % 60;
      return s === 0 ? T('dur.minutes', { M: m })
                     : T('dur.minSec',  { M: m, S: s });
    }
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    return m === 0 ? T('dur.hours',    { H: h })
                   : T('dur.hoursMin', { H: h, M: m });
  }
  function fmtOpHours(params) {
    const min = params.closeTime - params.openTime;
    const h = Math.floor(min / 60), m = min % 60;
    return m === 0 ? T('op.hours', { H: h }) : T('op.hoursMin', { H: h, M: m });
  }
  function fmtSimPerSec(speed) {
    if (speed >= 60 && speed % 60 === 0) return T('sim.minutes', { M: speed / 60 });
    if (speed >= 60) return T('sim.minutesFrac', { M: (speed / 60).toFixed(1) });
    return T('sim.seconds', { S: speed });
  }
  function speedTipFor(speed, params) {
    const opSec = (params.closeTime - params.openTime) * 60;
    const op = fmtOpHours(params);
    if (speed === 1) return T('speed.tip.1x', { OP: op });
    const real = fmtRealDuration(opSec / speed);
    const defaultSuffix = speed === 60 ? T('speed.tip.defaultSuffix') : '';
    return T('speed.tip.other', { X: speed, DEFAULT: defaultSuffix, SIM: fmtSimPerSec(speed), OP: op, REAL: real });
  }

  // ── Build ──
  function build() {
    const root = document.getElementById('controls');
    root.innerHTML = '';

    const head = document.createElement('div');
    head.innerHTML = `
      <h1 class="app-title">
        <span>${T('app.title')}</span>
        <span class="title-actions">
          <button class="icon-btn" id="btn-help" data-tip="${T('btn.help.tip')}">?</button>
          <button class="icon-btn" id="btn-lang" data-tip="${T('btn.lang.tip')}">${FT.i18n.shortLabel(FT.i18n.current())}</button>
          <button class="icon-btn" id="btn-theme" data-tip="${T('btn.theme.tip')}">${FT.theme.current() === 'light' ? '🌙' : '☀'}</button>
        </span>
      </h1>
      <h2 class="section-title">${T('section.presets')}</h2>
      <div class="preset-row" id="preset-row">
        ${PRESETS.map(pr =>
          `<button class="preset-btn" data-preset="${pr.id}" data-tip="${T('preset.' + pr.id + '.desc')}">${T('preset.' + pr.id + '.label')}</button>`
        ).join('')}
      </div>
      <h2 class="section-title">${T('section.params')}</h2>
    `;
    root.appendChild(head);

    for (const def of CONTROLS) root.appendChild(renderControl(def));

    const actions = document.createElement('div');
    actions.style.marginTop = '16px';
    actions.innerHTML = `
      <button class="primary" id="btn-apply" style="width:100%" data-tip="${T('btn.apply.tip')}">${T('btn.apply')}</button>
      <div style="margin-top:10px;display:flex;gap:6px">
        <button id="btn-play" style="flex:1" data-tip="${T('btn.play.tip')}">${T('btn.play')}</button>
        <button id="btn-reset" style="flex:1" data-tip="${T('btn.reset.tip')}">${T('btn.reset')}</button>
      </div>
      <div style="margin-top:14px">
        <div class="control-label"><span class="label" data-tip="${T('speed.group.tip')}">${T('section.speed')}<span class="info-icon">ⓘ</span></span></div>
        <div class="speed-toggle" id="speed-toggle">
          ${SPEEDS.map(s => `<button data-speed="${s}">${s}x</button>`).join('')}
        </div>
      </div>
      <div style="margin-top:16px">
        <div class="control-label"><span class="label" data-tip="${T('congestion.tip')}">${T('section.congestion')}<span class="info-icon">ⓘ</span></span></div>
        <div><span id="congestion-badge" class="badge" data-tip="${T('congestion.tip')}"></span></div>
      </div>
      <div id="warn-banner" style="margin-top:8px;color:var(--warn);font-size:11px;display:none"></div>
    `;
    root.appendChild(actions);
  }

  function renderControl(def) {
    const v = FT.app.state.pendingParams[def.id];
    const row = document.createElement('div');
    row.className = 'control';
    const labelText = T('param.' + def.id + '.label');
    const labelTip  = T('param.' + def.id + '.tip');
    const labelHtml = `<span class="label" data-tip="${escapeAttr(labelTip)}">${labelText}<span class="info-icon">ⓘ</span></span>`;
    if (def.kind === 'time') {
      row.innerHTML = `
        <div class="control-label">
          ${labelHtml}
          <span class="value" data-display="${def.id}">${FT.app.minToTime(v)}</span>
        </div>
        <div class="control-input">
          <input type="range" data-id="${def.id}" min="${def.min}" max="${def.max}" step="${def.step}" value="${v}">
        </div>
        <div class="control-hint" data-hint="${def.id}"></div>
      `;
    } else {
      row.innerHTML = `
        <div class="control-label">
          ${labelHtml}
          <span class="value" data-display="${def.id}">${formatNumber(v)}</span>
        </div>
        <div class="control-input">
          <input type="range" data-id="${def.id}" min="${def.min}" max="${def.max}" step="${def.step}" value="${v}">
          <input type="number" data-id="${def.id}-num" min="${def.min}" max="${def.max}" step="${def.step}" value="${v}">
        </div>
        <div class="control-hint" data-hint="${def.id}">${def.hint ? def.hint() : ''}</div>
      `;
    }
    return row;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }
  function formatNumber(v) { return Number(v).toLocaleString(); }

  // ── Event binding (event delegation; bind once) ──
  function bindEvents() {
    document.body.addEventListener('input', (e) => onInputChange(e));
    document.body.addEventListener('click', (e) => {
      const apply = e.target.closest('#btn-apply'); if (apply) return FT.app.applyAndRestart();
      const play  = e.target.closest('#btn-play');  if (play)  return FT.app.togglePlay();
      const reset = e.target.closest('#btn-reset'); if (reset) return FT.app.reset();
      const theme = e.target.closest('#btn-theme'); if (theme) return FT.theme.toggle();
      const lang  = e.target.closest('#btn-lang');  if (lang)  return FT.i18n.toggle();
      const help  = e.target.closest('#btn-help');  if (help)  return openHelp();
      const hclose= e.target.closest('#btn-help-close'); if (hclose) return closeHelp();
      const speed = e.target.closest('button[data-speed]'); if (speed) return FT.app.setSpeed(Number(speed.dataset.speed));
      const preset= e.target.closest('button[data-preset]');
      if (preset) {
        const pr = PRESETS.find(p => p.id === preset.dataset.preset);
        if (pr) { FT.app.state.pendingParams = FT.clampParams({ ...FT.DEFAULT_PARAMS, ...pr.params }); FT.app.applyAndRestart(); }
        return;
      }
      const modal = document.getElementById('help-modal');
      if (modal && e.target === modal) closeHelp();
    });
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('help-modal');
      if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) closeHelp();
    });
  }

  function onInputChange(e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.id) return;
    const rawId = el.dataset.id;
    const id = rawId.replace(/-num$/, '');
    const def = CONTROLS.find(c => c.id === id);
    if (!def) return;
    const newVal = Number(el.value);
    FT.app.state.pendingParams[id] = newVal;
    if (def.kind === 'number') {
      const partner = rawId.endsWith('-num')
        ? document.querySelector(`input[data-id="${id}"]`)
        : document.querySelector(`input[data-id="${id}-num"]`);
      if (partner && Number(partner.value) !== newVal) partner.value = newVal;
    }
    const disp = document.querySelector(`[data-display="${id}"]`);
    if (disp) disp.textContent = def.kind === 'time' ? FT.app.minToTime(newVal) : formatNumber(newVal);
    refreshDerived();
  }

  function refreshFromPending() {
    const p = FT.app.state.pendingParams;
    for (const def of CONTROLS) {
      const disp = document.querySelector(`[data-display="${def.id}"]`);
      if (disp) disp.textContent = def.kind === 'time' ? FT.app.minToTime(p[def.id]) : formatNumber(p[def.id]);
      if (def.kind === 'time') {
        const inp = document.querySelector(`input[data-id="${def.id}"]`);
        if (inp) inp.value = p[def.id];
      } else {
        const r = document.querySelector(`input[data-id="${def.id}"]`);
        const n = document.querySelector(`input[data-id="${def.id}-num"]`);
        if (r) r.value = p[def.id];
        if (n) n.value = p[def.id];
      }
    }
  }

  function refreshDerived() {
    const p = FT.app.state.pendingParams;
    for (const def of CONTROLS) {
      if (!def.hint) continue;
      const hintEl = document.querySelector(`[data-hint="${def.id}"]`);
      if (hintEl) hintEl.textContent = def.hint();
    }
    const c = FT.congestion(p);
    const level = FT.congestionLevel(c);
    const badge = document.getElementById('congestion-badge');
    if (badge) {
      badge.className = `badge ${level}`;
      badge.textContent = `${T('congestion.' + level)} · ${c.toFixed(2)}`;
    }
    const warn = document.getElementById('warn-banner');
    const issues = FT.validateParams(p);
    if (warn) {
      if (issues.length) {
        warn.style.display = 'block';
        warn.textContent = T('warn.label') + ' ' + issues.map(k => T(k)).join(', ');
      } else {
        warn.style.display = 'none';
      }
    }
  }

  function updateSpeedButtons() {
    const cur = FT.app.state.simSpeed;
    document.querySelectorAll('#speed-toggle button').forEach(b => {
      b.classList.toggle('active', Number(b.dataset.speed) === cur);
    });
  }

  function updatePlayButton() {
    const b = document.getElementById('btn-play');
    if (!b) return;
    const done = FT.app.state.simL && FT.app.state.simL.done;
    b.textContent = done ? T('btn.completed') : (FT.app.state.playing ? T('btn.pause') : T('btn.play'));
    b.disabled = !!done;
  }

  function updateSpeedTooltips() {
    const p = FT.app.state.appliedParams;
    document.querySelectorAll('#speed-toggle button[data-speed]').forEach(b => {
      b.dataset.tip = speedTipFor(Number(b.dataset.speed), p);
    });
  }

  // ── Help modal ──
  function openHelp() {
    renderHelp();
    document.getElementById('help-modal').removeAttribute('hidden');
  }
  function closeHelp() {
    document.getElementById('help-modal').setAttribute('hidden', '');
  }
  function renderHelp() {
    const body = document.getElementById('help-body');
    if (!body) return;
    const S = {
      behavior: T('help.section.behavior'),
      layout:   T('help.section.layout'),
      insight:  T('help.section.insight'),
      tips:     T('help.section.tips'),
    };
    const html = T('help.html').replace(/\{\{S\.(\w+)\}\}/g, (_, k) => S[k] || '');
    body.innerHTML = `
      <h2 id="help-title">${T('help.title')}</h2>
      <div class="modal-subtitle">${T('help.subtitle')}</div>
      <h3>${T('help.section.question')}</h3>
      ${html}
    `;
    // Close button aria
    const close = document.getElementById('btn-help-close');
    if (close) close.setAttribute('aria-label', T('help.close'));
  }

  // ── Refresh all UI text after language change (without losing event listeners) ──
  function rebuildAll() {
    build();
    refreshDerived();
    refreshFromPending();
    updateSpeedTooltips();
    updatePlayButton();
    updateSpeedButtons();
    renderHelp();
  }

  return { build, bindEvents, refreshDerived, refreshFromPending,
           updateSpeedButtons, updatePlayButton, updateSpeedTooltips,
           openHelp, closeHelp, renderHelp, rebuildAll, T };
})();
