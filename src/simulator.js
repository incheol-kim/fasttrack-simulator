// Event-driven simulator. One instance = one side (noFP or withFP).
window.FT = window.FT || {};

FT.Simulator = class {
  constructor(params, arrivals, mode) {
    if (mode !== 'noFP' && mode !== 'withFP') throw new Error('mode must be noFP or withFP');
    this.p = params;
    this.arrivals = arrivals;
    this.mode = mode;
    this.nextArrivalIdx = 0;
    this.regularQueue = [];
    this.fastQueue = [];
    this.simTime = 0;
    this.boarded = [];
    this.failed = [];
    this.cycleCount = 0;
    this.nextCycleTime = params.cycleDurationSec; // first cycle at t=cycleDur
    this.fpSlots  = FT.fastPassSlotsPerCycle(params);
    this.capacity = params.capacityPerCycle;
    this.cycleDur = params.cycleDurationSec;
    this.closeSec = FT.operatingSec(params);
    this.peakStartSec = (params.peakStart - params.openTime) * 60;
    this.peakEndSec   = (params.peakEnd   - params.openTime) * 60;
    // Bucket counts: total arrivals, currently waiting (in queue).
    // After close, "waiting" drains to 0 and the same count moves into stats.failed.
    this.arrived = { peak_regular: 0, offpeak_regular: 0, peak_fastpass: 0, offpeak_fastpass: 0 };
    this.waiting = { peak_regular: 0, offpeak_regular: 0, peak_fastpass: 0, offpeak_fastpass: 0 };
    this.done = false;
  }

  _bucketOf(person) {
    const peak = person.arrivalTime >= this.peakStartSec && person.arrivalTime < this.peakEndSec;
    return `${peak ? 'peak' : 'offpeak'}_${person.queue}`;
  }

  step(dt) {
    if (this.done) return;
    const t1 = this.simTime + dt;

    while (!this.done) {
      const tA = (this.nextArrivalIdx < this.arrivals.length &&
                  this.arrivals[this.nextArrivalIdx].arrivalTime <= this.closeSec)
                 ? this.arrivals[this.nextArrivalIdx].arrivalTime
                 : Infinity;
      const tC = (this.nextCycleTime <= this.closeSec) ? this.nextCycleTime : Infinity;
      const tNext = Math.min(tA, tC);

      if (tNext === Infinity) {
        this.simTime = Math.min(t1, this.closeSec);
        break;
      }
      if (tNext > t1) {
        this.simTime = t1;
        break;
      }

      this.simTime = tNext;
      if (tA <= tC) {
        this._processArrival(this.arrivals[this.nextArrivalIdx]);
        this.nextArrivalIdx++;
      } else {
        this._boardCycle();
        this.nextCycleTime += this.cycleDur;
      }
    }

    if (this.simTime >= this.closeSec && !this.done) {
      this._close();
    }
  }

  _processArrival(a) {
    const person = {
      id: a.id,
      arrivalTime: a.arrivalTime,
      hasFastPass: a.hasFastPass,
      boardingTime: null,
      queue: null,
    };
    if (this.mode === 'withFP' && a.hasFastPass) {
      person.queue = 'fastpass';
      this.fastQueue.push(person);
    } else {
      person.queue = 'regular';
      this.regularQueue.push(person);
    }
    const b = this._bucketOf(person);
    this.arrived[b]++;
    this.waiting[b]++;
  }

  _boardCycle() {
    this.cycleCount++;
    const t = this.simTime;
    let remaining = this.capacity;

    if (this.mode === 'withFP') {
      // 1) Up to fpSlots from FP line
      const fp1 = Math.min(this.fpSlots, this.fastQueue.length, remaining);
      for (let i = 0; i < fp1; i++) this._boardOne(this.fastQueue.shift(), t);
      remaining -= fp1;

      // 2) Fill from regular line
      const reg = Math.min(remaining, this.regularQueue.length);
      for (let i = 0; i < reg; i++) this._boardOne(this.regularQueue.shift(), t);
      remaining -= reg;

      // 3) Fill any leftover seats from remaining FP (avoid empty seats)
      const fp2 = Math.min(remaining, this.fastQueue.length);
      for (let i = 0; i < fp2; i++) this._boardOne(this.fastQueue.shift(), t);
    } else {
      const r = Math.min(remaining, this.regularQueue.length);
      for (let i = 0; i < r; i++) this._boardOne(this.regularQueue.shift(), t);
    }
  }

  _boardOne(person, t) {
    person.boardingTime = t;
    this.waiting[this._bucketOf(person)]--;
    this.boarded.push(person);
  }

  _close() {
    for (const p of this.fastQueue)    { this.waiting[this._bucketOf(p)]--; this.failed.push(p); }
    for (const p of this.regularQueue) { this.waiting[this._bucketOf(p)]--; this.failed.push(p); }
    this.fastQueue = [];
    this.regularQueue = [];
    this.done = true;
  }
};
