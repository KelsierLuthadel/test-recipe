// Clipboard helpers with a non-secure-context fallback. The async Clipboard API
// (navigator.clipboard.*) only exists in secure contexts (https or localhost),
// so on http://<lan-ip> or file://, navigator.clipboard is undefined. We fall
// back to a hidden <textarea> + document.execCommand('copy'), which is
// deprecated but still widely supported and works in any context.

function execCommandCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '0';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, ta.value.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(ta);
  if (!ok) throw new Error('execCommand copy failed');
}

// Plain-text copy with fallback. Throws if both APIs are unavailable/fail.
export async function copyText(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try { await navigator.clipboard.writeText(text); return; }
    catch { /* fall through to legacy path */ }
  }
  execCommandCopy(text);
}

// Rich copy: writes both text/plain and text/html when supported (so Gmail and
// other rich targets keep formatting), else falls back to plain text.
export async function copyRich(text, html) {
  if (window.ClipboardItem && navigator.clipboard && typeof navigator.clipboard.write === 'function') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      return;
    } catch { /* fall through to plain text */ }
  }
  await copyText(text);
}
