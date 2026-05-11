// DOM renderers: status bar, panel headers, stats panel.
window.FT = window.FT || {};

FT.view = (function () {
  const T = (k, p) => FT.i18n.t(k, p);
  const fmt = (x, d = 1) => (typeof x === 'number' && Number.isFinite(x)) ? x.toFixed(d) : '–';
  const intf = (x) => Number(x).toLocaleString();

  function renderStatus() {
    const s = FT.app.state;
    const p = s.appliedParams;
    const wall = FT.app.simTimeToWallClock(s.simL ? s.simL.simTime : 0, p.openTime);
    const c = FT.congestion(p);
    const level = FT.congestionLevel(c);
    const lLen = s.simL ? s.simL.regularQueue.length : 0;
    const rLenReg = s.simR ? s.simR.regularQueue.length : 0;
    const rLenFp  = s.simR ? s.simR.fastQueue.length : 0;
    const boardL = s.simL ? s.simL.boarded.length : 0;
    const boardR = s.simR ? s.simR.boarded.length : 0;
    const failL = s.simL ? s.simL.failed.length : 0;
    const failR = s.simR ? s.simR.failed.length : 0;

    document.getElementById('statusbar').innerHTML = `
      <span class="sb-item">${T('sb.time')} <b>${wall}</b></span>
      <span class="sb-item">${T('sb.speed')} <b>${s.simSpeed}x</b></span>
      <span class="sb-item">${T('sb.congestion')} <span class="badge ${level}">${T('congestion.' + level)} · ${c.toFixed(2)}</span></span>
      <span class="sb-item">${T('sb.lReg')} <b>${intf(lLen)}</b></span>
      <span class="sb-item">${T('sb.rFp')} <b class="fp-color">${intf(rLenFp)}</b> / ${T('sb.rReg')} <b class="reg-color">${intf(rLenReg)}</b></span>
      <span class="sb-item">${T('sb.boarded')} <b>${intf(boardL)}</b> · ${T('sb.boardedR')} <b>${intf(boardR)}</b></span>
      <span class="sb-item">${T('sb.failed')} <b class="fail-color">${intf(failL)}</b> · ${T('sb.failedR')} <b class="fail-color">${intf(failR)}</b></span>
    `;
  }

  function renderPanels() {
    const s = FT.app.state;
    const p = s.appliedParams;
    const cycleLimit = FT.dailyCycles(p);
    renderOneHeader('panel-header-L', T('panel.left'),  s.simL, cycleLimit, false);
    renderOneHeader('panel-header-R', T('panel.right'), s.simR, cycleLimit, true);
  }

  function renderOneHeader(elId, title, sim, cycleLimit, showFp) {
    if (!sim) return;
    const boardCount = sim.boarded.length;
    const failCount = sim.failed.length;
    const totalArrived = sim.nextArrivalIdx;
    const fpLen = sim.fastQueue.length;
    const regLen = sim.regularQueue.length;
    document.getElementById(elId).innerHTML = `
      <div class="panel-title">${title}</div>
      <div class="panel-stats">
        <div class="stat-row"><span>${T('panel.cycle')}</span><b>${sim.cycleCount} / ${cycleLimit}</b></div>
        <div class="stat-row"><span>${T('panel.joined')}</span><b>${intf(totalArrived)}</b></div>
        <div class="stat-row"><span>${T('panel.boarded')}</span><b>${intf(boardCount)}</b></div>
        <div class="stat-row"><span>${T('panel.failed')}</span><b class="${failCount ? 'fail-color' : ''}">${intf(failCount)}</b></div>
        <div class="stat-row"><span class="reg-color">${T('panel.general')}</span><b>${intf(regLen)}</b></div>
        ${(showFp || fpLen > 0) ? `<div class="stat-row"><span class="fp-color">${T('panel.fastpass')}</span><b>${intf(fpLen)}</b></div>` : ''}
      </div>
    `;
  }

  function renderStats() {
    const s = FT.app.state;
    if (!s.statsL || !s.statsR) return;
    const sumL = s.statsL.summary();
    const sumR = s.statsR.summary();
    const done = s.simL && s.simL.done;

    const lAllReg = sumL.all_regular;
    const rAllReg = sumR.all_regular;
    const rAllFp  = sumR.all_fastpass;
    const regDelta = rAllReg.mean - lAllReg.mean;
    const fpDelta  = rAllFp.mean  - lAllReg.mean;

    const aL = s.simL.arrived, wL = s.simL.waiting;
    const aR = s.simR.arrived, wR = s.simR.waiting;
    const arrivedAll = (a) => a.peak_regular + a.offpeak_regular + a.peak_fastpass + a.offpeak_fastpass;
    const waitingAll = (w) => w.peak_regular + w.offpeak_regular + w.peak_fastpass + w.offpeak_fastpass;

    const cell = (b, arrived, waiting) => {
      if (arrived === 0) return `<span class="muted">${T('cell.dash')}</span>`;
      const remainder = arrived - b.n;
      const tail = done && remainder > 0
        ? `<span class="fail-color">${T('cell.failed', { N: remainder })}</span>`
        : remainder > 0
          ? `<span class="muted">${T('cell.waiting', { N: remainder })}</span>`
          : '';
      if (b.n === 0) return `<span class="muted">${T('cell.boardZero', { N: arrived })}</span>${tail}`;
      return `${T('cell.boardCount', { B: `<b>${b.n}</b>`, N: `<b>${arrived}</b>` })}${tail} · ${T('cell.mean', { MEAN: fmt(b.mean), STD: fmt(b.std) })} <span class="muted">${T('cell.range', { MIN: fmt(b.min), MAX: fmt(b.max) })}</span>`;
    };

    const sign = (v) => (v >= 0 ? '+' : '');
    const deltaHtml = (v, cls) => `<span class="delta ${cls}">${T('cell.delta', { SIGN: sign(v), V: fmt(v) })}</span>`;

    const headline = `
      <div class="headline">
        <div>
          <div class="title" data-tip="${escapeAttr(T('stats.headline.regWait.tip'))}">${T('stats.headline.regWait.title')}<span class="info-icon">ⓘ</span></div>
          <div class="value">${fmt(lAllReg.mean)} → ${fmt(rAllReg.mean)} ${T('unit.min')}
            ${deltaHtml(regDelta, regDelta > 0 ? 'up' : 'down')}
          </div>
        </div>
        <div>
          <div class="title" data-tip="${escapeAttr(T('stats.headline.fpWait.tip'))}">${T('stats.headline.fpWait.title')}<span class="info-icon">ⓘ</span></div>
          <div class="value">${fmt(rAllFp.mean)} ${T('unit.min')}
            ${deltaHtml(fpDelta, fpDelta > 0 ? 'up' : 'down')}
          </div>
        </div>
        <div>
          <div class="title" data-tip="${escapeAttr(T('stats.headline.failed.tip'))}">${T('stats.headline.failed.title')}<span class="info-icon">ⓘ</span></div>
          <div class="value">
            ${T('sb.lReg').split(' ')[0]} <span class="${sumL.failed.regular ? 'fail-color' : ''}">${sumL.failed.regular}</span> ·
            ${T('sb.rFp').split(' ')[0]} <span class="${(sumR.failed.regular+sumR.failed.fastpass) ? 'fail-color' : ''}">${sumR.failed.regular + sumR.failed.fastpass}</span>
          </div>
        </div>
      </div>
    `;

    const rows = [
      [T('stats.row.lReg'), T('stats.row.lReg.tip'),
        [sumL.all_regular,     arrivedAll(aL),                              waitingAll(wL)],
        [sumL.peak_regular,    aL.peak_regular,                             wL.peak_regular],
        [sumL.offpeak_regular, aL.offpeak_regular,                          wL.offpeak_regular]],
      [T('stats.row.rReg'), T('stats.row.rReg.tip'),
        [sumR.all_regular,     aR.peak_regular + aR.offpeak_regular,        wR.peak_regular + wR.offpeak_regular],
        [sumR.peak_regular,    aR.peak_regular,                             wR.peak_regular],
        [sumR.offpeak_regular, aR.offpeak_regular,                          wR.offpeak_regular]],
      [T('stats.row.rFp'), T('stats.row.rFp.tip'),
        [sumR.all_fastpass,    aR.peak_fastpass + aR.offpeak_fastpass,      wR.peak_fastpass + wR.offpeak_fastpass],
        [sumR.peak_fastpass,   aR.peak_fastpass,                            wR.peak_fastpass],
        [sumR.offpeak_fastpass,aR.offpeak_fastpass,                         wR.offpeak_fastpass]],
    ];

    let body = '';
    for (const [label, tip, all, peak, off] of rows) {
      body += `<tr><td class="label-cell" data-tip="${escapeAttr(tip)}">${label}<span class="info-icon">ⓘ</span></td>` +
              `<td>${cell(all[0], all[1], all[2])}</td>` +
              `<td>${cell(peak[0], peak[1], peak[2])}</td>` +
              `<td>${cell(off[0], off[1], off[2])}</td></tr>`;
    }

    document.getElementById('stats').innerHTML = `
      <div class="stats-head">
        <h2>${T('stats.title')} ${done ? `<span class="final-badge">${T('stats.final')}</span>` : ''}</h2>
        <div class="stats-note">${T('stats.note')}</div>
      </div>
      ${headline}
      <table class="stats-table">
        <thead>
          <tr>
            <th></th>
            <th><span data-tip="${escapeAttr(T('stats.col.all.tip'))}">${T('stats.col.all')}<span class="info-icon">ⓘ</span></span></th>
            <th><span data-tip="${escapeAttr(T('stats.col.peak.tip'))}">${T('stats.col.peak')}<span class="info-icon">ⓘ</span></span></th>
            <th><span data-tip="${escapeAttr(T('stats.col.offpeak.tip'))}">${T('stats.col.offpeak')}<span class="info-icon">ⓘ</span></span></th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  return { renderStatus, renderPanels, renderStats };
})();
