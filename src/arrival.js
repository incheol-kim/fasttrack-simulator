// Arrival generation: non-homogeneous Poisson via inverse CDF,
// stratified sampling for visitor times AND fast pass holder assignment.
window.FT = window.FT || {};

FT.generateArrivals = function(params, rng) {
  const p = params;
  const closeSec = FT.operatingSec(p);
  const peakStartSec = (p.peakStart - p.openTime) * 60;
  const peakEndSec   = (p.peakEnd   - p.openTime) * 60;
  const peakSec      = peakEndSec - peakStartSec;
  const offPeakSec   = closeSec - peakSec;

  // Distribute dailyVisitors uniformly across the operating window first,
  // then BOOST the peak by α and PULL DOWN off-peak by β so the total is
  // preserved. This guarantees λ_peak > λ_off (no inversion) regardless of
  // demand level.
  //
  //   λ_avg = N / opSec
  //   α     = peakMaxWaitMin*60 / peakSec   (larger peakMaxWait → spikier peak)
  //   β     = α * peakSec / offPeakSec       (total-arrivals invariant)
  //   λ_peak = λ_avg * (1 + α)
  //   λ_off  = λ_avg * (1 - β)
  //
  // β ≤ 1 must hold (no negative rate). If user-requested α would push β past
  // 0.95, clamp and flag (peak window is too long relative to off-peak).
  const lambdaAvg = p.dailyVisitors / closeSec;
  let lambdaPeak, lambdaOff;
  let flagged = false;

  if (peakSec <= 0 || offPeakSec <= 0) {
    // Degenerate: peak fills the whole day (or none). Fall back to uniform.
    lambdaPeak = lambdaAvg;
    lambdaOff  = lambdaAvg;
  } else {
    let alpha = (p.peakMaxWaitMin * 60) / peakSec;
    const alphaMax = (offPeakSec / peakSec) * 0.95;  // keep β ≤ 0.95
    if (alpha > alphaMax) { alpha = alphaMax; flagged = true; }
    const beta = alpha * peakSec / offPeakSec;
    lambdaPeak = lambdaAvg * (1 + alpha);
    lambdaOff  = lambdaAvg * (1 - beta);
  }

  const RAMP = 900; // 15 min cosine ramp at peak boundaries
  function lambdaAt(t) {
    if (t < peakStartSec - RAMP) return lambdaOff;
    if (t < peakStartSec) {
      const phase = (t - (peakStartSec - RAMP)) / RAMP;
      const eased = (1 - Math.cos(phase * Math.PI)) / 2;
      return lambdaOff + (lambdaPeak - lambdaOff) * eased;
    }
    if (t < peakEndSec) return lambdaPeak;
    if (t < peakEndSec + RAMP) {
      const phase = (t - peakEndSec) / RAMP;
      const eased = (1 + Math.cos(phase * Math.PI)) / 2;
      return lambdaOff + (lambdaPeak - lambdaOff) * eased;
    }
    return lambdaOff;
  }

  // Build cumulative CDF on a coarse grid (30 sec).
  const GRID = 30;
  const grid = [];
  const cdf = [];
  let cum = 0;
  for (let t = 0; t <= closeSec; t += GRID) {
    grid.push(t);
    cdf.push(cum);
    cum += lambdaAt(t) * GRID;
  }
  if (grid[grid.length - 1] < closeSec) {
    grid.push(closeSec);
    cdf.push(cum);
  }
  const totalArea = cum;

  const N = p.dailyVisitors;
  const arrivals = new Array(N);
  for (let i = 0; i < N; i++) {
    const u = (i + rng()) / N;       // stratified uniform in [i/N, (i+1)/N)
    const target = u * totalArea;
    // Binary search in cdf for target
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cdf[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const idx = Math.max(1, lo);
    const prev = cdf[idx - 1];
    const next = cdf[idx];
    const frac = (next - prev) > 0 ? (target - prev) / (next - prev) : 0;
    let t = grid[idx - 1] + frac * GRID;
    // Jitter ±30 sec
    t += (rng() - 0.5) * 60;
    if (t < 0) t = 0;
    if (t >= closeSec) t = closeSec - 0.001;
    arrivals[i] = { id: i, arrivalTime: t, hasFastPass: false };
  }
  arrivals.sort((a, b) => a.arrivalTime - b.arrivalTime);
  for (let i = 0; i < N; i++) arrivals[i].id = i;

  // Stratified FP assignment — K passes evenly spaced across N sorted arrivals.
  const K = p.dailyFastPassCount;
  if (K > 0 && K <= N) {
    for (let k = 0; k < K; k++) {
      const idx = Math.floor((k + 0.5) * N / K);
      if (idx >= 0 && idx < N) arrivals[idx].hasFastPass = true;
    }
  }

  return { arrivals, flagged, lambdaPeak, lambdaOff };
};
