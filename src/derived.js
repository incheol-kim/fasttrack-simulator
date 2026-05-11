// Derived values — pure functions of params.
window.FT = window.FT || {};

FT.cyclesPerHour       = (p) => 3600 / p.cycleDurationSec;
FT.operatingSec        = (p) => (p.closeTime - p.openTime) * 60;
FT.dailyCycles         = (p) => Math.floor(FT.operatingSec(p) / p.cycleDurationSec);
FT.dailyTotalSeats     = (p) => FT.dailyCycles(p) * p.capacityPerCycle;
FT.fastPassSlotsPerCycle = (p) => Math.floor(p.capacityPerCycle * p.fastPassPercentPerCycle / 100);
FT.safeDailyVisitors   = (p) => Math.floor(FT.dailyTotalSeats(p) * 0.85);
FT.congestion          = (p) => p.dailyVisitors / FT.dailyTotalSeats(p);

FT.congestionLevel = function(c) {
  if (c < 0.6)   return 'calm';
  if (c < 0.9)   return 'normal';
  if (c < 1.05)  return 'busy';
  return 'overload';
};

// Returns the level key. Translate via FT.i18n.t('congestion.' + level).
FT.congestionLabel = function(level) { return level; };
