// Detects time durations in Method-section text ("10 minutes", "1½ hours",
// "1 hour 30 minutes", "5-6 minutes") and replaces each match with a clickable
// timer button. Clicking starts a single-instance timer rendered in a fixed
// panel at the bottom of the screen, with a screen wake-lock and a chime + vibration
// on completion.

import { escapeHtml } from '../util/dom.js';
import { parseQuantity } from './scaling.js';

// Match standalone time durations, including multi-unit ("1 hour 30 minutes")
// captured as one token and ranges ("5-6 minutes").
const TIMER_RE = /\b(\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔])?(?:\s*(?:to|–|-)\s*\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔])?)?\s*(?:hours?|hrs?|minutes?|mins?)(?:\s+(?:and\s+)?\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔])?\s*(?:hours?|hrs?|minutes?|mins?))?)\b/gi;

function timerTokenToSeconds(token) {
  let totalMin = 0;
  const re = /(\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔])?(?:\s*(?:to|–|-)\s*(\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔])?))?)\s*(hours?|hrs?|minutes?|mins?)/gi;
  let m;
  while ((m = re.exec(token)) !== null) {
    // For ranges, take the upper bound.
    const num = parseQuantity(m[2] || m[1]);
    if (!Number.isFinite(num)) continue;
    totalMin += /hour|hr/i.test(m[3]) ? num * 60 : num;
  }
  return Math.max(0, Math.round(totalMin * 60));
}

export function addMethodTimers(body) {
  let methodH2 = null;
  body.querySelectorAll('h2').forEach(h => {
    const text = (h.firstChild && h.firstChild.nodeType === 3 ? h.firstChild.textContent : h.textContent).trim();
    if (/^method$/i.test(text)) methodH2 = h;
  });
  if (!methodH2) return;
  let sib = methodH2.nextElementSibling;
  while (sib && sib.tagName !== 'H2') {
    sib.querySelectorAll('li, p').forEach(el => annotateTimers(el));
    sib = sib.nextElementSibling;
  }
}

function annotateTimers(el) {
  // Walk text nodes inside this element and replace timer matches with buttons.
  // Skip text that's already inside a button/anchor so we don't double-process.
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (p && p.closest('button, a, .timer-btn, .heading-anchor')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const targets = [];
  let node;
  while ((node = walker.nextNode())) {
    if (/(\d).{0,30}(hour|minute|min|hr)/i.test(node.textContent)) targets.push(node);
  }
  for (const tn of targets) replaceTimersInNode(tn);
}

function replaceTimersInNode(textNode) {
  const text = textNode.textContent;
  const re = new RegExp(TIMER_RE.source, 'gi');
  let m, last = 0;
  const frag = document.createDocumentFragment();
  let added = false;
  while ((m = re.exec(text)) !== null) {
    // Capture per-iteration so closures don't reference the shared `m`.
    const token = m[1];
    const matchIndex = m.index;
    const matchEnd = m.index + m[0].length;
    const seconds = timerTokenToSeconds(token);
    if (seconds <= 0) continue;
    if (matchIndex > last) frag.appendChild(document.createTextNode(text.slice(last, matchIndex)));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'timer-btn';
    btn.dataset.seconds = String(seconds);
    btn.setAttribute('aria-label', `Start a ${token} timer`);
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 15"/><line x1="9" y1="2" x2="15" y2="2"/></svg>${escapeHtml(token)}`;
    btn.addEventListener('click', (e) => { e.stopPropagation(); startTimer(seconds, token); });
    frag.appendChild(btn);
    last = matchEnd;
    added = true;
  }
  if (!added) return;
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  textNode.parentNode.replaceChild(frag, textNode);
}

// ---- panel state (singleton, lazily created) ----

let activeTimer = null;
let timerPanelEl = null;
let timerWakeLock = null;

function ensureTimerPanel() {
  if (timerPanelEl) return timerPanelEl;
  timerPanelEl = document.createElement('div');
  timerPanelEl.className = 'timer-panel';
  timerPanelEl.innerHTML = `
    <div class="timer-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 15"/><line x1="9" y1="2" x2="15" y2="2"/></svg>
    </div>
    <div class="timer-info">
      <div class="timer-value">--:--</div>
      <div class="timer-label"></div>
    </div>
    <button type="button" class="timer-cancel" aria-label="Cancel timer">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  timerPanelEl.querySelector('.timer-cancel').addEventListener('click', cancelTimer);
  document.body.appendChild(timerPanelEl);
  return timerPanelEl;
}

function startTimer(seconds, originalText) {
  if (!seconds) return;
  if (activeTimer) cancelTimer();
  const panel = ensureTimerPanel();
  panel.classList.remove('is-done');
  panel.classList.add('is-open');
  requestTimerWakeLock();
  const endsAt = Date.now() + seconds * 1000;
  activeTimer = {
    endsAt,
    label: originalText,
    intervalId: setInterval(tickTimer, 250),
  };
  tickTimer();
}

function tickTimer() {
  if (!activeTimer || !timerPanelEl) return;
  const remaining = Math.max(0, Math.ceil((activeTimer.endsAt - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timerPanelEl.querySelector('.timer-value').textContent = `${m}:${String(s).padStart(2, '0')}`;
  timerPanelEl.querySelector('.timer-label').textContent = activeTimer.label;
  if (remaining <= 0) finishTimer();
}

function finishTimer() {
  if (!activeTimer) return;
  clearInterval(activeTimer.intervalId);
  activeTimer = null;
  if (timerPanelEl) timerPanelEl.classList.add('is-done');
  ringTimerChime();
  if (navigator.vibrate) try { navigator.vibrate([300, 150, 300, 150, 300]); } catch {}
  releaseTimerWakeLock();
}

function cancelTimer() {
  if (activeTimer && activeTimer.intervalId) clearInterval(activeTimer.intervalId);
  activeTimer = null;
  if (timerPanelEl) timerPanelEl.classList.remove('is-open', 'is-done');
  releaseTimerWakeLock();
}

function ringTimerChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const beep = (when, freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.35, when + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.5);
      osc.start(when);
      osc.stop(when + 0.55);
    };
    const t = ctx.currentTime;
    beep(t,        880);
    beep(t + 0.6,  880);
    beep(t + 1.2,  1175);
  } catch {}
}

async function requestTimerWakeLock() {
  if (!navigator.wakeLock || timerWakeLock) return;
  try { timerWakeLock = await navigator.wakeLock.request('screen'); }
  catch { timerWakeLock = null; }
}

function releaseTimerWakeLock() {
  if (!timerWakeLock) return;
  try { timerWakeLock.release(); } catch {}
  timerWakeLock = null;
}
