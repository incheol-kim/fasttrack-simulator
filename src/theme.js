// Theme manager: dark (default) ↔ light. Persists to localStorage.
window.FT = window.FT || {};

FT.theme = (function () {
  const STORAGE_KEY = 'ft-theme';
  const subscribers = [];

  function current() {
    return document.documentElement.dataset.theme || 'dark';
  }

  function apply(name) {
    const t = (name === 'light') ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(STORAGE_KEY, t); } catch (_) { /* ignore */ }
    for (const fn of subscribers) {
      try { fn(t); } catch (_) { /* ignore */ }
    }
  }

  function toggle() {
    apply(current() === 'light' ? 'dark' : 'light');
  }

  function init() {
    let saved = 'dark';
    try { saved = localStorage.getItem(STORAGE_KEY) || 'dark'; } catch (_) {}
    apply(saved);
  }

  function onChange(fn) {
    subscribers.push(fn);
  }

  return { current, apply, toggle, init, onChange };
})();
