// QR code modal. Lazily injects the qrcode-generator vendor script the
// first time it's needed (avoids loading ~21KB on every page) and renders
// the SVG into the shared modal so users can scan the URL on a phone.

import { openModal } from '../ui/modal.js';
import { escapeHtml } from '../util/dom.js';

let qrLibPromise = null;

function loadQrLib() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!qrLibPromise) {
    qrLibPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/qrcode.min.js';
      s.onload = () => resolve(window.qrcode);
      s.onerror = () => reject(new Error('qrcode lib failed to load'));
      document.head.appendChild(s);
    });
  }
  return qrLibPromise;
}

export async function openQrCode(recipe) {
  const url = window.location.href;
  const placeholder = '<div class="qr-loading">Generating QR…</div>';
  openModal('Scan to open', `<p class="qr-url">${escapeHtml(url)}</p><div id="qr-target">${placeholder}</div>`);
  try {
    const qrcode = await loadQrLib();
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    const target = document.getElementById('qr-target');
    if (target) target.innerHTML = qr.createSvgTag({ scalable: true, margin: 2 });
  } catch (err) {
    const target = document.getElementById('qr-target');
    if (target) target.innerHTML = `<div class="qr-loading">Could not generate QR code.</div>`;
  }
}
