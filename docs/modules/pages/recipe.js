// Recipe detail page (#/r/<slug>). Renders the toolbar shell synchronously,
// then asynchronously fetches the recipe markdown and runs each enhancement
// pass over the rendered body in a deterministic order:
//
//   chips → ingredients-share → step-anchors → strike → timers → notes → toc
//
// Order matters: chips need to insert above the first h2 before strike sees
// the DOM; timers insert <button>s inside method paragraphs that the strike
// pass should ignore; toc only runs once headings are stable.

import { state, recordRecent, setContent } from '../state.js';
import { categoryNode } from '../manifest.js';
import { categoryHash } from '../routes.js';
import { escapeHtml } from '../util/dom.js';
import { renderNotFound } from './not-found.js';
import { fetchRecipeMarkdown, renderMarkdown } from '../recipe/markdown.js';
import { favouriteButtonHtml, cookedButtonHtml, bindRecipeActions } from '../recipe/actions.js';
import { enterCookingMode, exitCookingMode } from '../recipe/cooking-mode.js';
import { insertRecipeChips } from '../recipe/chips.js';
import { insertIngredientsShareButton } from '../recipe/share.js';
import { insertPlanAheadCallout } from '../recipe/plan-ahead.js';
import { addStepAnchors, maybeScrollToStep } from '../recipe/anchors.js';
import { bindIngredientStrike } from '../recipe/strike.js';
import { addSubstitutionHints } from '../recipe/substitutions.js';
import { markAllergens, appendAllergenFootnote } from '../recipe/allergen-marks.js';
import { insertWinePairings } from '../recipe/wine-pairings.js';
import { insertSidePairings } from '../recipe/side-pairings.js';
import { insertSimilarRecipes } from '../recipe/similar.js';
import { addMethodTimers } from '../recipe/timers.js';
import { addBackToIngredients } from '../recipe/back-to-ingredients.js';
import { insertPersonalNotes } from '../recipe/notes.js';
import { insertSiblingNavigation } from '../recipe/siblings.js';
import { buildRecipeToc } from '../recipe/toc.js';

export async function renderRecipe(slug) {
  const recipe = state.recipeBySlug.get(slug);
  if (!recipe) return renderNotFound(`Recipe "${slug}" not found.`);

  recordRecent(slug);
  // Every recipe transition resets cooking mode unless explicitly requested.
  if (state.route.cook) enterCookingMode();
  else exitCookingMode();

  setContent(`
    <article class="recipe-detail fade-in">
      <div class="recipe-toolbar">
        <a class="back-button" href="${categoryHash(recipe.categoryPath)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to ${escapeHtml(categoryNode(recipe.categoryPath)?.label || 'category')}
        </a>
        <div class="recipe-actions" role="toolbar" aria-label="Recipe actions">
          ${favouriteButtonHtml(recipe)}
          ${cookedButtonHtml(recipe)}
          <button type="button" class="action-btn" data-action="cook-mode" aria-label="Start cooking mode">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
            <span class="action-label">Cook</span>
          </button>
          <div class="recipe-overflow">
            <button type="button" class="action-btn action-overflow-toggle" aria-label="More actions" aria-haspopup="true" aria-expanded="false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
              <span class="action-label">More</span>
            </button>
            <div class="recipe-overflow-menu" role="menu" hidden>
              <button type="button" class="overflow-item" data-action="plan" role="menuitem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Add to meal plan
              </button>
              <button type="button" class="overflow-item" data-action="mise" role="menuitem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>
                Mise en place
              </button>
              <button type="button" class="overflow-item" data-action="qr" role="menuitem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="17"/><line x1="14" y1="20" x2="17" y2="20"/><line x1="20" y1="14" x2="20" y2="20"/><line x1="17" y1="14" x2="17" y2="17"/></svg>
                Show QR code
              </button>
              <button type="button" class="overflow-item" data-action="copy" role="menuitem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy recipe
              </button>
              <button type="button" class="overflow-item" data-action="print" role="menuitem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print
              </button>
              <button type="button" class="overflow-item" data-action="share" role="menuitem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="recipe-body" class="markdown"><div class="loading-state"><span class="spinner" aria-hidden="true"></span><div>Loading recipe…</div></div></div>
    </article>
  `);

  bindRecipeActions(recipe);

  try {
    const md = await fetchRecipeMarkdown(recipe);
    const body = document.getElementById('recipe-body');
    if (!body) return;
    body.innerHTML = renderMarkdown(md, recipe);
    insertRecipeChips(body, recipe);
    insertIngredientsShareButton(body, recipe);
    insertPlanAheadCallout(body);
    insertWinePairings(body, recipe);
    insertSidePairings(body, recipe);
    addStepAnchors(body);
    bindIngredientStrike(body);
    markAllergens(body, recipe);
    addSubstitutionHints(body);
    addMethodTimers(body);
    appendAllergenFootnote(body, recipe);
    insertSimilarRecipes(body, recipe);
    insertSiblingNavigation(body, recipe);
    insertPersonalNotes(body, recipe);
    buildRecipeToc(body);
    addBackToIngredients(body);
    maybeScrollToStep();
  } catch (err) {
    const body = document.getElementById('recipe-body');
    if (body) body.innerHTML = `<div class="error-state"><div class="error-state-title">Couldn't load recipe</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}
