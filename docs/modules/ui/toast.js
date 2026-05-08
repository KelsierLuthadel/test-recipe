// Bottom-centre toast notification. Lazily creates one shared element on first use.
// Existing toast text is replaced if a new one fires before the previous fades.

let el = null;
let timer = null;

export function showToast(text, kind = 'info') {
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.className = `toast is-visible toast-${kind}`;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (el) el.className = 'toast';
  }, 2200);
}
