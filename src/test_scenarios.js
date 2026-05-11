// Phase 1 validation scenarios.
(function () {
  const out = document.getElementById('out');
  const log = (html) => out.insertAdjacentHTML('beforeend', html);

  function runFullSim(params, seed) {
    const rng = FT.makeRng(seed);
    const { arrivals, flagged, lambdaPeak, lambdaOff } = FT.generateArrivals(params, rng);
    const simL = new FT.Simulator(params, arrivals, 'noFP');
    const simR = new FT.Simulator(params, arrivals, 'withFP');
    const closeSec = FT.operatingSec(params);
    // Run entire day in a single big step (event-driven, so step size irrelevant for correctness)
    while (!simL.done) simL.step(closeSec + 1000);
    while (!simR.done) simR.step(closeSec + 1000);
    const sL = new FT.StatsCollector(params); sL.ingestSimulator(simL);
    const sR = new FT.StatsCollector(params); sR.ingestSimulator(simR);
    return { simL, simR, statsL: sL.summary(), statsR: sR.summary(),
             arrivals, flagged, lambdaPeak, lambdaOff };
  }

  const fmt = (x, d = 1) => (typeof x === 'number' ? x.toFixed(d) : x);

  function statsTable(label, s) {
    const rows = [
      ['전체-일반',    s.all_regular],
      ['전체-패스',    s.all_fastpass],
      ['피크-일반',    s.peak_regular],
      ['피크-패스',    s.peak_fastpass],
      ['비피크-일반',  s.offpeak_regular],
      ['비피크-패스',  s.offpeak_fastpass],
    ];
    let html = `<table><caption>${label}</caption>
      <tr><th style="text-align:left">분할</th><th>N</th><th>평균(분)</th><th>표준편차</th><th>최소</th><th>최대</th></tr>`;
    for (const [name, b] of rows) {
      html += `<tr><td style="text-align:left">${name}</td><td>${b.n}</td>` +
              `<td>${fmt(b.mean)}</td><td>${fmt(b.std)}</td>` +
              `<td>${fmt(b.min)}</td><td>${fmt(b.max)}</td></tr>`;
    }
    html += `<tr><td style="text-align:left">실패</td><td colspan="5">일반 ${s.failed.regular} / 패스 ${s.failed.fastpass}</td></tr>`;
    html += '</table>';
    return html;
  }

  const check = (cond, msg) => cond
    ? `<div class="pass">✓ ${msg}</div>`
    : `<div class="fail">✗ ${msg}</div>`;

  const scenarioParams = (overrides) =>
    FT.clampParams({ ...FT.DEFAULT_PARAMS, ...overrides });

  let passCount = 0, failCount = 0;
  const checkAndCount = (cond, msg) => {
    if (cond) passCount++; else failCount++;
    return check(cond, msg);
  };

  // ───────────────────────────────────────────
  log('<h2>Scenario 1 — FP 판매 0장 → 좌·우 완전 동일</h2>');
  {
    const p = scenarioParams({ dailyFastPassCount: 0 });
    const r = runFullSim(p, 42);
    log(statsTable('좌측 (noFP)', r.statsL));
    log(statsTable('우측 (withFP)', r.statsR));
    log(checkAndCount(
      Math.abs(r.statsL.all_regular.mean - r.statsR.all_regular.mean) < 0.01 &&
      r.statsL.all_regular.n === r.statsR.all_regular.n,
      `좌·우 일반 평균/N 동일 (L=${fmt(r.statsL.all_regular.mean)}, R=${fmt(r.statsR.all_regular.mean)})`));
    log(checkAndCount(
      r.statsL.failed.regular === r.statsR.failed.regular,
      `실패자 수 동일 (L=${r.statsL.failed.regular}, R=${r.statsR.failed.regular})`));
  }

  // ───────────────────────────────────────────
  log('<h2>Scenario 2 — 기본값 (혼잡도 ~1.0, FP 33%) → 우측 일반줄이 더 길게 대기</h2>');
  {
    const p = scenarioParams({});
    const c = FT.congestion(p);
    log(`<pre>혼잡도: ${fmt(c, 3)} (${FT.congestionLabel(FT.congestionLevel(c))})
fastPassSlotsPerCycle: ${FT.fastPassSlotsPerCycle(p)} / ${p.capacityPerCycle}
safeDailyVisitors: ${FT.safeDailyVisitors(p)}</pre>`);
    const r = runFullSim(p, 42);
    log(statsTable('좌측', r.statsL));
    log(statsTable('우측', r.statsR));
    const delta = r.statsR.all_regular.mean - r.statsL.all_regular.mean;
    const fpShort = r.statsL.all_regular.mean - r.statsR.all_fastpass.mean;
    log(checkAndCount(delta > 0, `우측-일반 평균 > 좌측-일반 평균 (Δ=+${fmt(delta)}분)`));
    log(checkAndCount(fpShort > 0, `패스 소지자 단축 (${fmt(fpShort)}분 감소)`));
  }

  // ───────────────────────────────────────────
  log('<h2>Scenario 3 — 한산 (혼잡도 &lt; 0.6) → 양쪽 짧음, 차이 작음</h2>');
  {
    const p = scenarioParams({ dailyVisitors: 2000, dailyFastPassCount: 200, peakMaxWaitMin: 30 });
    log(`<pre>혼잡도: ${fmt(FT.congestion(p), 3)}</pre>`);
    const r = runFullSim(p, 42);
    log(statsTable('좌측', r.statsL));
    log(statsTable('우측', r.statsR));
    log(checkAndCount(r.statsL.all_regular.mean < 15, `좌측 평균 < 15분 (${fmt(r.statsL.all_regular.mean)})`));
    log(checkAndCount(r.statsR.all_regular.mean < 15, `우측-일반 평균 < 15분 (${fmt(r.statsR.all_regular.mean)})`));
    log(checkAndCount(Math.abs(r.statsR.all_regular.mean - r.statsL.all_regular.mean) < 5,
      `차이 < 5분 (${fmt(Math.abs(r.statsR.all_regular.mean - r.statsL.all_regular.mean))})`));
  }

  // ───────────────────────────────────────────
  log('<h2>Scenario 4 — 과부하 (혼잡도 &gt; 1.05) → 탑승 실패 발생</h2>');
  {
    const p = scenarioParams({ dailyVisitors: 15000, dailyFastPassCount: 1500, peakMaxWaitMin: 240 });
    log(`<pre>혼잡도: ${fmt(FT.congestion(p), 3)}</pre>`);
    const r = runFullSim(p, 42);
    log(statsTable('좌측', r.statsL));
    log(statsTable('우측', r.statsR));
    const failL = r.statsL.failed.regular + r.statsL.failed.fastpass;
    const failR = r.statsR.failed.regular + r.statsR.failed.fastpass;
    log(checkAndCount(failL > 0, `좌측 실패자 > 0 (${failL})`));
    log(checkAndCount(failR > 0, `우측 실패자 > 0 (${failR})`));
  }

  // ───────────────────────────────────────────
  log('<h2>Scenario 5 — FP slot 50% but few FP 판매 → 일반줄 차이 거의 없음</h2>');
  {
    const p = scenarioParams({ fastPassPercentPerCycle: 50, dailyFastPassCount: 50 });
    const r = runFullSim(p, 42);
    log(statsTable('좌측', r.statsL));
    log(statsTable('우측', r.statsR));
    const delta = Math.abs(r.statsR.all_regular.mean - r.statsL.all_regular.mean);
    log(checkAndCount(delta < 3, `좌·우 일반줄 차이 < 3분 (${fmt(delta)}분)`));
  }

  // ───────────────────────────────────────────
  log('<h2>Scenario 6 — FP stratified 분포 (시간대별 FP 비율 균등성)</h2>');
  {
    const p = scenarioParams({});
    const rng = FT.makeRng(42);
    const { arrivals } = FT.generateArrivals(p, rng);
    const closeSec = FT.operatingSec(p);
    const hoursOpen = Math.ceil(closeSec / 3600);
    const buckets = Array.from({ length: hoursOpen }, () => ({ total: 0, fp: 0 }));
    for (const a of arrivals) {
      const h = Math.min(hoursOpen - 1, Math.floor(a.arrivalTime / 3600));
      buckets[h].total++;
      if (a.hasFastPass) buckets[h].fp++;
    }
    const overallRatio = p.dailyFastPassCount / p.dailyVisitors;
    let html = `<table><caption>시간 버킷별 FP 비율 (전체 ${fmt(overallRatio * 100)}% 기준)</caption>
      <tr><th>시각(개장+)</th><th>도착</th><th>FP</th><th>FP비율(%)</th><th>편차(%pt)</th></tr>`;
    let maxAbsDevPP = 0;
    for (let h = 0; h < hoursOpen; h++) {
      const b = buckets[h];
      const ratio = b.total > 0 ? b.fp / b.total : 0;
      const devPP = Math.abs(ratio - overallRatio) * 100;
      if (b.total >= 50) maxAbsDevPP = Math.max(maxAbsDevPP, devPP);
      html += `<tr><td>${h}h</td><td>${b.total}</td><td>${b.fp}</td>` +
              `<td>${fmt(ratio * 100)}</td><td>${fmt(devPP)}</td></tr>`;
    }
    html += '</table>';
    log(html);
    log(checkAndCount(maxAbsDevPP < 5,
      `편차 < 5%p (max=${fmt(maxAbsDevPP)}%p)`));
  }

  // ───────────────────────────────────────────
  log(`<h2>완료 — ${passCount} 통과 / ${failCount} 실패</h2>`);
})();
