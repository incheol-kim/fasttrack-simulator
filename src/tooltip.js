// Lightweight tooltip: single floating element with position:fixed,
// shown on hover over any [data-tip] element. Bound once via event delegation
// so it survives DOM re-renders.
window.FT = window.FT || {};

FT.tooltip = (function () {
  let el = null;

  function ensure() {
    if (!el) {
      el = document.createElement('div');
      el.className = 'ft-tooltip';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    return el;
  }

  function show(target, text) {
    const tip = ensure();
    tip.textContent = text;
    tip.style.display = 'block';
    tip.style.left = '-9999px';     // off-screen for measurement
    tip.style.top  = '-9999px';
    const rect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const margin = 8;
    // Default: below the target, left-aligned.
    let left = rect.left;
    let top  = rect.bottom + 6;
    // Clamp horizontally inside viewport.
    if (left + tipRect.width > window.innerWidth - margin) {
      left = window.innerWidth - tipRect.width - margin;
    }
    if (left < margin) left = margin;
    // If overflowing bottom, place above instead.
    if (top + tipRect.height > window.innerHeight - margin) {
      top = rect.top - tipRect.height - 6;
      if (top < margin) top = margin;
    }
    tip.style.left = left + 'px';
    tip.style.top  = top  + 'px';
  }

  function hide() {
    if (el) el.style.display = 'none';
  }

  function bind(root) {
    root.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-tip]');
      if (t) show(t, t.dataset.tip);
    });
    root.addEventListener('mouseout', (e) => {
      const t = e.target.closest('[data-tip]');
      if (t) hide();
    });
    // Hide on scroll within #stats (positioning could go stale)
    window.addEventListener('scroll', hide, true);
  }

  return { bind, show, hide };
})();
