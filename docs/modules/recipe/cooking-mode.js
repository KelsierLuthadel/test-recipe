// Full-screen "cooking mode": adds .is-cooking-mode to <body> (CSS hides
// chrome and bumps font sizes), requests a screen wake-lock so the device
// doesn't sleep, and shows a floating Exit button. Esc also exits.

let cookingWakeLock = null;
let cookingExitBtn = null;

export async function enterCookingMode() {
  document.body.classList.add('is-cooking-mode');
  if (!cookingExitBtn) {
    cookingExitBtn = document.createElement('button');
    cookingExitBtn.id = 'cook-mode-exit';
    cookingExitBtn.className = 'cook-mode-exit';
    cookingExitBtn.setAttribute('type', 'button');
    cookingExitBtn.setAttribute('aria-label', 'Exit cooking mode');
    cookingExitBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      <span>Exit</span>
    `;
    cookingExitBtn.addEventListener('click', exitCookingMode);
    document.body.appendChild(cookingExitBtn);
  }
  cookingExitBtn.style.display = '';
  if (navigator.wakeLock && !cookingWakeLock) {
    try { cookingWakeLock = await navigator.wakeLock.request('screen'); }
    catch { cookingWakeLock = null; }
  }
  document.addEventListener('keydown', handleCookKey);
}

export function exitCookingMode() {
  document.body.classList.remove('is-cooking-mode');
  if (cookingExitBtn) cookingExitBtn.style.display = 'none';
  if (cookingWakeLock) {
    try { cookingWakeLock.release(); } catch {}
    cookingWakeLock = null;
  }
  document.removeEventListener('keydown', handleCookKey);
}

function handleCookKey(e) {
  if (e.key === 'Escape') exitCookingMode();
}
