// Tap-to-strike on ingredient lines: each <li> in the Ingredients section
// becomes clickable, and tapping toggles a strikethrough class. Skips clicks
// on links or buttons inside the line so other interactive bits keep working.

import { findIngredientItems } from './ingredients.js';

export function bindIngredientStrike(body) {
  findIngredientItems(body).forEach(li => {
    li.classList.add('ingredient-tappable');
    li.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      li.classList.toggle('is-struck');
    });
  });
}
