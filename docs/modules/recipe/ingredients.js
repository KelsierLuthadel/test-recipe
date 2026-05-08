// Shared utilities for finding the Ingredients section in a rendered recipe body.
// Used by mise/strike/scaling/share-as-shopping-list — anything that needs to
// walk the LIs that come after an "Ingredients" h2.

// Match an h2 whose direct text content (ignoring appended action buttons) is
// exactly "Ingredients" — case-insensitive.
export function isIngredientsHeading(h) {
  let text = '';
  for (const node of h.childNodes) {
    if (node.nodeType === 3) text += node.textContent;
  }
  return /^\s*ingredients\s*$/i.test(text.trim());
}

// All <li>s inside <ul>s that follow the Ingredients heading, up to the next h2.
// Returns a flat array (recipes can have multiple sub-lists, e.g. dressing + main).
export function findIngredientItems(body) {
  const out = [];
  body.querySelectorAll('h2').forEach(h => {
    if (!isIngredientsHeading(h)) return;
    let sib = h.nextElementSibling;
    while (sib && sib.tagName !== 'H2') {
      if (sib.tagName === 'UL') out.push(...sib.querySelectorAll('li'));
      sib = sib.nextElementSibling;
    }
  });
  return out;
}
