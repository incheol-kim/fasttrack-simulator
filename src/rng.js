// Seedable PRNG — mulberry32 algorithm by Tommy Ettinger (public domain).
// Reference: https://gist.github.com/tommyettinger/46a3a48b9d4fa1c70e4be4ce5a85ddca
// Used here for reproducible arrival sequences across runs with the same seed.
window.FT = window.FT || {};

FT.makeRng = function(seed) {
  let a = (seed >>> 0) || 1;
  return function() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
