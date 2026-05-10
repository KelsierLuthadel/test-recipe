// Pop-up panel triggered from the recipe page's More menu entry
// "Add to meal plan". Lists the next 14 days as toggleable chips
// (with weekday + date label); tapping a chip adds or removes the
// current recipe from that date.

import { escapeHtml, escapeAttr } from '../util/dom.js';
import { toggleOnDay, loadDayPlan } from '../plan.js';
import { nextNDays, dateChipLabel, isToday } from '../util/iso-date.js';

let panelEl = null;
let outsideHandler = null;
let escHandler = null;

function ensurePanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement('div');
  panelEl.className = 'plan-picker';
  panelEl.hidden = true;
  document.body.appendChild(panelEl);
  return panelEl;
}

function close() {
  if (!panelEl) return;
  panelEl.hidden = true;
  panelEl.classList.remove('is-open');
  if (outsideHandler) {
    document.removeEventListener('mousedown', outsideHandler);
    outsideHandler = null;
  }
  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandler = null;
  }
}

function renderPanel(recipe) {
  const dates = nextNDays(14);
  const chipsHtml = dates.map(iso => {
    const on = loadDayPlan(iso).includes(recipe.slug);
    const today = isToday(iso);
    return `<button type="button" class="plan-picker-chip ${on ? 'is-on' : ''} ${today ? 'is-today' : ''}" data-date="${escapeAttr(iso)}" aria-pressed="${on}">${escapeHtml(dateChipLabel(iso))}</button>`;
  }).join('');

  panelEl.innerHTML = `
    <div class="plan-picker-head">Add to meal plan</div>
    <div class="plan-picker-row plan-picker-row-dates">${chipsHtml}</div>
    <div class="plan-picker-foot"><a href="#/plan">Open meal plan &rarr;</a></div>
  `;

  panelEl.querySelectorAll('.plan-picker-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const iso = chip.dataset.date;
      const isNowOn = toggleOnDay(iso, recipe.slug);
      chip.classList.toggle('is-on', isNowOn);
      chip.setAttribute('aria-pressed', String(isNowOn));
    });
  });
}

function position(anchor) {
  const rect = anchor.getBoundingClientRect();
  const panel = panelEl;
  panel.style.top = `${rect.bottom + window.scrollY + 6}px`;
  panel.style.left = `${rect.left + window.scrollX}px`;
  panel.style.right = 'auto';
  requestAnimationFrame(() => {
    const pr = panel.getBoundingClientRect();
    if (pr.right > window.innerWidth - 12) {
      panel.style.left = 'auto';
      panel.style.right = `${window.innerWidth - rect.right + 8}px`;
    }
  });
}

export function openPlanPicker(anchor, recipe) {
  ensurePanel();
  renderPanel(recipe);
  panelEl.hidden = false;
  panelEl.classList.add('is-open');
  position(anchor);

  outsideHandler = (e) => {
    if (panelEl.contains(e.target) || (anchor && anchor.contains(e.target))) return;
    close();
  };
  escHandler = (e) => { if (e.key === 'Escape') close(); };
  setTimeout(() => {
    document.addEventListener('mousedown', outsideHandler);
    document.addEventListener('keydown', escHandler);
  }, 0);
}
