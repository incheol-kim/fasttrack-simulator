// Bucketed wait-time stats.
// Dimensions: time (all|peak|offpeak) × queue (regular|fastpass).
// Failed boarders tracked separately (no wait stat — never boarded).
window.FT = window.FT || {};

FT.StatsCollector = class {
  constructor(params) {
    this.p = params;
    this.peakStartSec = (params.peakStart - params.openTime) * 60;
    this.peakEndSec   = (params.peakEnd   - params.openTime) * 60;
    this.buckets = {};
    for (const t of ['all', 'peak', 'offpeak']) {
      for (const q of ['regular', 'fastpass']) {
        this.buckets[`${t}_${q}`] = { n: 0, sum: 0, sumsq: 0, min: Infinity, max: -Infinity };
      }
    }
    this.failed = { regular: 0, fastpass: 0 };
    this._boardedCursor = 0;
    this._failedCursor = 0;
  }

  // Incrementally pull new records from a simulator's growing arrays.
  // Safe to call repeatedly; advances internal cursors.
  pullFrom(sim) {
    while (this._boardedCursor < sim.boarded.length) {
      this.add(sim.boarded[this._boardedCursor++]);
    }
    while (this._failedCursor < sim.failed.length) {
      this.add(sim.failed[this._failedCursor++]);
    }
  }

  _isPeak(t) {
    return t >= this.peakStartSec && t < this.peakEndSec;
  }

  add(person) {
    if (person.boardingTime == null) {
      this.failed[person.queue]++;
      return;
    }
    const waitMin = (person.boardingTime - person.arrivalTime) / 60;
    const peak = this._isPeak(person.arrivalTime);
    const timeKeys = ['all', peak ? 'peak' : 'offpeak'];
    for (const tk of timeKeys) {
      const b = this.buckets[`${tk}_${person.queue}`];
      b.n++;
      b.sum += waitMin;
      b.sumsq += waitMin * waitMin;
      if (waitMin < b.min) b.min = waitMin;
      if (waitMin > b.max) b.max = waitMin;
    }
  }

  ingestSimulator(sim) {
    for (const p of sim.boarded) this.add(p);
    for (const p of sim.failed)  this.add(p);
  }

  summary() {
    const out = {};
    for (const key in this.buckets) {
      const b = this.buckets[key];
      const n = b.n;
      const mean = n > 0 ? b.sum / n : 0;
      const variance = n > 1 ? Math.max(0, (b.sumsq - n * mean * mean) / (n - 1)) : 0;
      const std = Math.sqrt(variance);
      out[key] = {
        n,
        mean,
        std,
        variance,
        min: n > 0 ? b.min : 0,
        max: n > 0 ? b.max : 0,
      };
    }
    out.failed = { ...this.failed };
    return out;
  }
};
