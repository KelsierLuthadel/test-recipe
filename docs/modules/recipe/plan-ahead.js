// Surfaces method steps that involve advance preparation (overnight rest,
// day-before marinade, multi-hour chill, etc.) into a "Plan ahead"
// callout above the Method heading. Pure derivation from the rendered
// body, no markdown source changes needed.
//
// The cues mirror MAKE_AHEAD_PATTERNS in scripts/build-manifest.mjs;
// keep the two in sync if you tune one.

const PREP_AHEAD_RE = new RegExp(
  [
    'make[- ]ahead',
    'day before',
    'overnight',
    'chill(?:s|ed|ing)?\\s+overnight',
    'refrigerate(?:s|d)?\\s+overnight',
    'prepare\\s+(?:a|the)\\s+day\\s+(?:in\\s+advance|before)',
    '\\d+\\s*hours?\\s+(?:in advance|before|ahead)',
    '24\\s*hours?',
    'prep\\s+ahead',
    'in advance',
  ].join('|'),
  'i',
);

function findMethodHeading(body) {
  for (const h of body.querySelectorAll('h2')) {
    if (h.textContent.trim().toLowerCase() === 'method') return h;
  }
  return null;
}

// Walk siblings between ## Method and the next ## heading, picking up
// list items / paragraphs that mention an advance-prep cue. Tracks the
// most recent ### subheading so each item carries its stage label.
function extractPrepItems(methodH2) {
  const items = [];
  let stage = null;
  for (let el = methodH2.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) {
    if (el.tagName === 'H3') {
      stage = el.textContent.trim();
      continue;
    }
    if (el.tagName === 'OL' || el.tagName === 'UL') {
      for (const li of el.querySelectorAll(':scope > li')) {
        const text = li.textContent.replace(/\s+/g, ' ').trim();
        if (PREP_AHEAD_RE.test(text)) items.push({ stage, text });
      }
    } else if (el.tagName === 'P') {
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (PREP_AHEAD_RE.test(text)) items.push({ stage, text });
    }
  }
  return items;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

export function insertPlanAheadCallout(body) {
  const methodH2 = findMethodHeading(body);
  if (!methodH2) return;
  const items = extractPrepItems(methodH2);
  if (!items.length) return;

  const callout = document.createElement('aside');
  callout.className = 'plan-ahead';
  callout.setAttribute('aria-label', 'Plan ahead');
  callout.innerHTML = `
    <div class="plan-ahead-head">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span>Plan ahead</span>
    </div>
    <ul class="plan-ahead-list">
      ${items.map(i => `<li>${i.stage ? `<span class="plan-ahead-stage">${escapeHtml(i.stage)}</span> ` : ''}${escapeHtml(i.text)}</li>`).join('')}
    </ul>
  `;
  methodH2.parentNode.insertBefore(callout, methodH2);
}
