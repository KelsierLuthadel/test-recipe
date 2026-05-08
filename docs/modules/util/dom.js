// DOM-related string utilities: HTML/attr escaping, regex escaping, anchor slugifying.

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export function escapeAttr(s) {
  return escapeHtml(s);
}

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Lower-case, hyphenate non-alphanumerics, trim hyphens, cap at 80 chars.
// Returns null if nothing usable remains.
export function slugifyAnchor(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || null;
}
