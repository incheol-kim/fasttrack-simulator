// Phase 1: parameter defaults + clamping
window.FT = window.FT || {};

FT.DEFAULT_PARAMS = {
  openTime: 600,                    // minutes from midnight (10:00)
  closeTime: 1320,                  // 22:00
  dailyVisitors: 6000,
  dailyFastPassCount: 800,          // always sold out
  capacityPerCycle: 24,
  cycleDurationSec: 180,            // 3 min
  fastPassPercentPerCycle: 33,      // % of capacity reserved for FP
  peakStart: 720,                   // 12:00
  peakEnd: 960,                     // 16:00
  peakMaxWaitMin: 120,
};

FT.clampParams = function(raw) {
  const p = { ...raw };
  p.capacityPerCycle = Math.max(4, Math.min(60, Math.round(p.capacityPerCycle)));
  p.cycleDurationSec = Math.max(30, Math.min(900, Math.round(p.cycleDurationSec)));
  p.fastPassPercentPerCycle = Math.max(0, Math.min(100, Math.round(p.fastPassPercentPerCycle)));
  p.dailyVisitors = Math.max(100, Math.min(50000, Math.round(p.dailyVisitors)));
  p.dailyFastPassCount = Math.max(0, Math.min(p.dailyVisitors, Math.round(p.dailyFastPassCount)));
  p.peakMaxWaitMin = Math.max(10, Math.min(300, Math.round(p.peakMaxWaitMin)));
  p.openTime = Math.max(360, Math.min(720, Math.round(p.openTime)));
  p.closeTime = Math.max(p.openTime + 60, Math.min(1440, Math.round(p.closeTime)));
  p.peakStart = Math.max(p.openTime, Math.min(p.closeTime - 60, Math.round(p.peakStart)));
  p.peakEnd = Math.max(p.peakStart + 30, Math.min(p.closeTime, Math.round(p.peakEnd)));
  return p;
};

// Returns i18n keys; views.js translates them.
FT.validateParams = function(p) {
  const issues = [];
  if (p.openTime >= p.closeTime) issues.push('issue.openClose');
  if (p.peakStart >= p.peakEnd) issues.push('issue.peakOrder');
  if (p.peakStart < p.openTime || p.peakEnd > p.closeTime) issues.push('issue.peakOutside');
  if (p.dailyFastPassCount > p.dailyVisitors) issues.push('issue.fpOverflow');
  return issues;
};
