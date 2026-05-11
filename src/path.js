// Snake-fold queue path. Index 0 = front (next to board), increasing → tail.
// Rows alternate horizontal direction. y grows downward.
window.FT = window.FT || {};

FT.SnakePath = class {
  constructor(opts) {
    this.x0 = opts.x0;
    this.y0 = opts.y0;
    this.width = Math.max(20, opts.width);
    this.rowH = opts.rowH;
    this.spacing = opts.spacing;
  }

  posToXY(i) {
    const dist = i * this.spacing;
    const row = Math.floor(dist / this.width);
    const inRow = dist - row * this.width;
    const x = (row % 2 === 0)
      ? this.x0 + inRow                       // L → R
      : this.x0 + this.width - inRow;         // R → L
    const y = this.y0 + row * this.rowH;
    return { x, y, row };
  }
};
