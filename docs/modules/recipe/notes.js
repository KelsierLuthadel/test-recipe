// Personal notes section appended to the bottom of every recipe page.
// Two modes:
//   - Preview: notes rendered as markdown via window.marked. Default
//     when notes are non-empty and the user isn't editing.
//   - Edit: a plain textarea over the same content. Triggered by a
//     click on the preview (or focus on an empty notes section).
// Auto-saves 350ms after the user stops typing. Empty notes remove the
// localStorage key and clear the slug from state.notesSlugs so the
// "note saved" pill on cards goes away too.

import { state } from '../state.js';
import * as storage from '../storage.js';

export function insertPersonalNotes(body, recipe) {
  const initial = storage.notes.get(recipe.slug);

  const section = document.createElement('section');
  section.className = 'recipe-notes';
  section.innerHTML = `
    <h2>My notes</h2>
    <div class="recipe-notes-preview" role="button" tabindex="0" aria-label="Edit notes" hidden></div>
    <textarea class="recipe-notes-input" rows="4" placeholder="Personal notes - adjustments, substitutions, what worked. Markdown supported. Saved automatically in this browser." hidden></textarea>
    <span class="recipe-notes-status" aria-live="polite"></span>
  `;
  body.appendChild(section);

  const textarea = section.querySelector('textarea');
  const preview = section.querySelector('.recipe-notes-preview');
  const status = section.querySelector('.recipe-notes-status');
  textarea.value = initial;

  function renderPreview() {
    const value = textarea.value.trim();
    if (!value) { preview.innerHTML = ''; return; }
    // Standard markdown collapses a single newline into a space; appending
    // three trailing spaces before each \n promotes it to a hard line break
    // so notes render the way they were typed.
    const withBreaks = value.replace(/\n/g, '   \n');
    if (window.marked && typeof window.marked.parse === 'function') {
      preview.innerHTML = window.marked.parse(withBreaks);
    } else {
      preview.textContent = value;
    }
  }

  function showEditor() {
    preview.hidden = true;
    textarea.hidden = false;
    textarea.focus();
  }
  function showPreview() {
    if (!textarea.value.trim()) { showEditor(); return; }
    renderPreview();
    preview.hidden = false;
    textarea.hidden = true;
  }

  // Initial state: preview if there's content, editor if empty.
  if (initial && initial.trim()) showPreview();
  else { textarea.hidden = false; }

  preview.addEventListener('click', showEditor);
  preview.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showEditor(); }
  });
  textarea.addEventListener('blur', () => {
    // Defer so a save fires first if the user blurred mid-debounce.
    setTimeout(() => { if (textarea.value.trim()) showPreview(); }, 0);
  });

  let saveTimer = null;
  let lastSaved = initial;
  textarea.addEventListener('input', () => {
    clearTimeout(saveTimer);
    status.textContent = 'Saving…';
    saveTimer = setTimeout(() => {
      try {
        if (textarea.value.trim()) {
          storage.notes.set(recipe.slug, textarea.value);
          state.notesSlugs.add(recipe.slug);
        } else {
          storage.notes.remove(recipe.slug);
          state.notesSlugs.delete(recipe.slug);
        }
        lastSaved = textarea.value;
        status.textContent = 'Saved';
        setTimeout(() => { if (textarea.value === lastSaved) status.textContent = ''; }, 1200);
      } catch {
        status.textContent = 'Could not save';
      }
    }, 350);
  });
}
