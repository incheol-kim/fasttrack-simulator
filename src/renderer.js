// Canvas 2D renderer for a single side (L or R).
// Maintains a Map<personId, visualState> for smooth interpolation.
window.FT = window.FT || {};

(function () {
  // Default fallbacks (used until refreshTheme runs).
  const DEFAULTS = {
    reg: '#3a7dff', fp: '#e6b800', fail: '#666',
    rideBg: '#262626', rideBorder: '#4a4a4a',
    icon: '#bbb', label: '#888', lane: '#2c2c2c',
  };
  const DOT_RADIUS = 3;
  const SPACING = 6;
  const ROW_H = 9;

  // Block compression mode
  const BLOCK_W = 20, BLOCK_H = 14;
  const BLOCK_STRIDE_X = BLOCK_W + 2;
  const BLOCK_STRIDE_Y = BLOCK_H + 2;
  const BLOCK_ENTER = 250;   // switch to block mode when queue > this
  const BLOCK_EXIT  = 200;   // switch back to dot mode when queue < this (hysteresis)

  // Choose people-per-block so block count fits in available area.
  // Round up to nice steps (50/100/200/500/1000/...).
  function peoplePerBlock(queueLen, maxBlocks) {
    if (maxBlocks < 1) return queueLen;
    const min = Math.ceil(queueLen / maxBlocks);
    const NICE = [50, 100, 200, 500, 1000, 2000, 5000];
    for (const n of NICE) if (n >= min) return n;
    return Math.ceil(min / 1000) * 1000;
  }

  FT.Renderer = class {
    constructor(canvas, side) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.side = side;           // 'L' | 'R'
      this.sim = null;
      this.visual = new Map();    // personId → { x, y, tx, ty, color, state, t0 }
      this.boardCursor = 0;
      this.failCursor = 0;
      this.modeReg = 'dots';      // 'dots' | 'blocks'
      this.modeFp  = 'dots';
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.w = 0; this.h = 0;
      this.theme = { ...DEFAULTS };
      this.refreshTheme();
      this.labels = { passLane: 'FastPass', regLane: 'Regular', regLaneAll: 'Regular', closed: 'CLOSED' };
      this.refreshLabels();
      this.resize();
    }

    refreshTheme() {
      const cs = getComputedStyle(document.documentElement);
      const get = (name, def) => (cs.getPropertyValue(name) || '').trim() || def;
      this.theme = {
        reg:        get('--reg',                DEFAULTS.reg),
        fp:         get('--fp',                 DEFAULTS.fp),
        fail:       get('--canvas-fail',        DEFAULTS.fail),
        rideBg:     get('--canvas-ride-bg',     DEFAULTS.rideBg),
        rideBorder: get('--canvas-ride-border', DEFAULTS.rideBorder),
        icon:       get('--canvas-icon',        DEFAULTS.icon),
        label:      get('--canvas-label',       DEFAULTS.label),
        lane:       get('--canvas-lane',        DEFAULTS.lane),
      };
    }

    refreshLabels() {
      const T = (k, p) => (FT.i18n ? FT.i18n.t(k, p) : '');
      this.labels = {
        passLane:    T('canvas.passLane'),
        regLane:     T('canvas.regLane'),
        regLaneAll:  T('canvas.regLaneAll'),
        closed:      T('canvas.closed'),
      };
    }

    _colorFor(role) {
      return role === 'fail' ? this.theme.fail
           : role === 'fp'   ? this.theme.fp
                             : this.theme.reg;
    }

    attachSim(sim) {
      this.sim = sim;
      this.visual.clear();
      this.boardCursor = 0;
      this.failCursor = 0;
      this.modeReg = 'dots';
      this.modeFp  = 'dots';
    }

    _chooseMode(current, queueLen) {
      if (current === 'dots'   && queueLen > BLOCK_ENTER) return 'blocks';
      if (current === 'blocks' && queueLen < BLOCK_EXIT)  return 'dots';
      return current;
    }

    // Mark all personIds in queue as removed from this.visual (mode switch cleanup).
    _purgeVisualsFor(queue) {
      for (const p of queue) this.visual.delete(p.id);
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.w = Math.max(80, r.width);
      this.h = Math.max(80, r.height);
      this.canvas.width  = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this._computeLayout();
    }

    _computeLayout() {
      const PAD = 10;
      // Ride box centered horizontally at top
      const rideW = 96, rideH = 36;
      this.ride = {
        x: (this.w - rideW) / 2,
        y: PAD,
        w: rideW, h: rideH,
      };
      this.ride.cx = this.ride.x + rideW / 2;
      this.ride.cy = this.ride.y + rideH / 2;

      const pathTop  = this.ride.y + rideH + 14;
      const pathLeft = PAD;
      const pathW    = this.w - 2 * PAD;
      const bottomLimit = this.h - PAD;

      if (this.side === 'R') {
        // FP queue: top compact band
        this.fpPath = new FT.SnakePath({
          x0: pathLeft, y0: pathTop,
          width: pathW, rowH: ROW_H, spacing: SPACING,
        });
        const fpBand = 32; // height reserved for FP
        // Separator at pathTop + fpBand + 4
        this.fpBandBottom = pathTop + fpBand;
        // Regular queue below
        this.regPath = new FT.SnakePath({
          x0: pathLeft, y0: this.fpBandBottom + 14,
          width: pathW, rowH: ROW_H, spacing: SPACING,
        });
        this.regBottom = bottomLimit;
      } else {
        this.regPath = new FT.SnakePath({
          x0: pathLeft, y0: pathTop,
          width: pathW, rowH: ROW_H, spacing: SPACING,
        });
        this.regBottom = bottomLimit;
      }
    }

    update(dtReal, simSpeed) {
      if (!this.sim) return;
      const sim = this.sim;
      const now = performance.now();

      // Per-queue dots↔blocks mode transitions.
      const newRegMode = this._chooseMode(this.modeReg, sim.regularQueue.length);
      if (newRegMode !== this.modeReg) {
        this._purgeVisualsFor(sim.regularQueue);
        this.modeReg = newRegMode;
      }
      if (this.side === 'R') {
        const newFpMode = this._chooseMode(this.modeFp, sim.fastQueue.length);
        if (newFpMode !== this.modeFp) {
          this._purgeVisualsFor(sim.fastQueue);
          this.modeFp = newFpMode;
        }
      }

      const upsert = (queue, path) => {
        for (let i = 0; i < queue.length; i++) {
          const p = queue[i];
          const xy = path.posToXY(i);
          let v = this.visual.get(p.id);
          if (!v) {
            v = {
              x: xy.x, y: xy.y + 24,
              tx: xy.x, ty: xy.y,
              colorRole: p.hasFastPass ? 'fp' : 'reg',
              state: 'queuing',
            };
            this.visual.set(p.id, v);
          } else {
            v.tx = xy.x;
            v.ty = xy.y;
            v.state = 'queuing';
          }
        }
      };

      if (this.side === 'R' && this.fpPath && this.modeFp === 'dots') upsert(sim.fastQueue, this.fpPath);
      if (this.modeReg === 'dots') upsert(sim.regularQueue, this.regPath);

      // Newly boarded → fly into ride center
      while (this.boardCursor < sim.boarded.length) {
        const p = sim.boarded[this.boardCursor++];
        const v = this.visual.get(p.id);
        if (v) {
          v.state = 'boarding';
          v.tx = this.ride.cx;
          v.ty = this.ride.cy;
          v.t0 = now;
        }
      }

      // Newly failed → grey out in place
      while (this.failCursor < sim.failed.length) {
        const p = sim.failed[this.failCursor++];
        const v = this.visual.get(p.id);
        if (v) {
          v.state = 'failed';
          v.colorRole = 'fail';
        }
      }

      // Lerp positions
      const tauQ = Math.max(0.15, Math.min(0.6, 4.0 / Math.sqrt(Math.max(1, simSpeed))));
      const tauB = 0.25;
      const toDelete = [];
      for (const [id, v] of this.visual) {
        const tau = v.state === 'boarding' ? tauB : tauQ;
        const a = 1 - Math.exp(-dtReal / tau);
        v.x += (v.tx - v.x) * a;
        v.y += (v.ty - v.y) * a;
        if (v.state === 'boarding' && (now - v.t0) > 350) {
          toDelete.push(id);
        }
      }
      for (const id of toDelete) this.visual.delete(id);
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      const T = this.theme;

      // Ride box
      ctx.fillStyle = T.rideBg;
      ctx.strokeStyle = T.rideBorder;
      ctx.lineWidth = 1;
      ctx.fillRect(this.ride.x, this.ride.y, this.ride.w, this.ride.h);
      ctx.strokeRect(this.ride.x + 0.5, this.ride.y + 0.5, this.ride.w - 1, this.ride.h - 1);
      ctx.fillStyle = T.icon;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cyc = this.sim ? this.sim.cycleCount : 0;
      ctx.fillText('🎢', this.ride.cx, this.ride.cy - 4);
      ctx.fillStyle = T.label;
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(FT.i18n.t('canvas.cycle', { N: cyc }), this.ride.cx, this.ride.cy + 9);

      // Lane separator on R panel
      if (this.side === 'R' && this.fpBandBottom != null) {
        ctx.strokeStyle = T.lane;
        ctx.beginPath();
        ctx.moveTo(8, this.fpBandBottom + 6);
        ctx.lineTo(this.w - 8, this.fpBandBottom + 6);
        ctx.stroke();
        ctx.fillStyle = T.label;
        ctx.font = '9px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.labels.passLane, 8, this.ride.y + this.ride.h + 8);
        ctx.fillText(this.labels.regLane,  8, this.fpBandBottom + 18);
      } else if (this.side === 'L') {
        ctx.fillStyle = T.label;
        ctx.font = '9px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.labels.regLaneAll, 8, this.ride.y + this.ride.h + 8);
      }

      // Blocks (per-queue in block mode)
      const sim = this.sim;
      if (sim) {
        if (this.modeReg === 'blocks') {
          this._drawBlocks(sim.regularQueue, this._regBlockArea());
        }
        if (this.side === 'R' && this.modeFp === 'blocks' && this.fpPath) {
          this._drawBlocks(sim.fastQueue, this._fpBlockArea());
        }
      }

      // Dots (per-person animated)
      let lastColor = null;
      ctx.globalAlpha = 1.0;
      for (const v of this.visual.values()) {
        if (v.state === 'boarding') {
          const age = (performance.now() - v.t0) / 350;
          ctx.globalAlpha = Math.max(0, 1 - age);
        } else if (v.state === 'failed') {
          ctx.globalAlpha = 0.6;
        } else {
          ctx.globalAlpha = 1.0;
        }
        const col = this._colorFor(v.colorRole);
        if (col !== lastColor) {
          ctx.fillStyle = col;
          lastColor = col;
        }
        ctx.beginPath();
        ctx.arc(v.x, v.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // Closed banner overlay
      if (this.sim && this.sim.done) {
        const txt = this.labels.closed;
        const w = Math.max(52, txt.length * 8 + 12);
        ctx.fillStyle = 'rgba(245, 107, 107, 0.85)';
        ctx.fillRect(this.w - w - 8, 6, w, 22);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, this.w - 8 - w/2, 17);
      }
    }

    // Block layout regions (returned per side/queue).
    _regBlockArea() {
      const x0 = this.regPath.x0;
      const y0 = this.regPath.y0;
      const width = this.regPath.width;
      const maxH = this.regBottom - y0 - 14;
      return { x0, y0, width, maxH };
    }
    _fpBlockArea() {
      const x0 = this.fpPath.x0;
      const y0 = this.fpPath.y0;
      const width = this.fpPath.width;
      const maxH = this.fpBandBottom - y0;
      return { x0, y0, width, maxH };
    }

    // Render a queue as colored blocks. Each block shows the FP/Reg ratio
    // as a left-anchored gold band (5% increments, min 1px when > 0).
    _drawBlocks(queue, area) {
      const ctx = this.ctx;
      const blocksPerRow = Math.max(1, Math.floor(area.width / BLOCK_STRIDE_X));
      const maxRows = Math.max(1, Math.floor(area.maxH / BLOCK_STRIDE_Y));
      const maxBlocks = blocksPerRow * maxRows;
      const N = peoplePerBlock(queue.length, maxBlocks);
      const blockCount = Math.min(maxBlocks, Math.ceil(queue.length / N));

      ctx.font = '8.5px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let b = 0; b < blockCount; b++) {
        const start = b * N;
        const end = Math.min(queue.length, start + N);
        const size = end - start;
        // Count FP in this chunk
        let fpCount = 0;
        for (let i = start; i < end; i++) if (queue[i].hasFastPass) fpCount++;
        const p = fpCount / size;
        // 5% rounding-up; min 1px if any FP present
        const fpCells = p > 0 ? Math.max(1, Math.ceil(p * 20)) : 0;
        const goldW = Math.min(BLOCK_W, fpCells);

        // Snake column index
        const row = Math.floor(b / blocksPerRow);
        const inRow = b - row * blocksPerRow;
        const col = (row % 2 === 0) ? inRow : (blocksPerRow - 1 - inRow);
        const x = area.x0 + col * BLOCK_STRIDE_X;
        const y = area.y0 + row * BLOCK_STRIDE_Y;

        // Gold band (FP portion) + blue (regular portion)
        if (goldW > 0) {
          ctx.fillStyle = this.theme.fp;
          ctx.fillRect(x, y, goldW, BLOCK_H);
        }
        if (goldW < BLOCK_W) {
          ctx.fillStyle = this.theme.reg;
          ctx.fillRect(x + goldW, y, BLOCK_W - goldW, BLOCK_H);
        }
      }

      // "N people per block" caption near top-right of the block area
      ctx.fillStyle = this.theme.label;
      ctx.font = '9px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(FT.i18n.t('canvas.perBlock', { N }), area.x0 + area.width, area.y0 - 4);
    }
  };
})();
