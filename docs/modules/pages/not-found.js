// Generic "not found" content. Used when a category path or recipe slug
// in the URL doesn't match anything in the manifest.

import { setContent } from '../state.js';
import { escapeHtml } from '../util/dom.js';

export function renderNotFound(msg) {
  setContent(`
    <div class="empty-state fade-in">
      <div class="empty-state-title">Not found</div>
      <p>${escapeHtml(msg)}</p>
      <p style="margin-top:1rem"><a href="#/" style="color:var(--accent)">Back to home</a></p>
    </div>
  `);
}
