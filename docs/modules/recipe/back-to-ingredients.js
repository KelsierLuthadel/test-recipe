// Floating "Back to ingredients" button shown on long recipes once the
// user has scrolled past the Ingredients heading. Click scrolls back.
// Uses IntersectionObserver on the heading itself; the button is only
// visible when the heading is offscreen above the viewport.

let observer = null;
let activeBtn = null;

function findIngredientsHeading(body) {
  for (const h of body.querySelectorAll('h2')) {
    if (h.textContent.trim().toLowerCase() === 'ingredients') return h;
  }
  return null;
}

export function addBackToIngredients(body) {
  // Tear down anything from the previous recipe page render.
  if (observer) { observer.disconnect(); observer = null; }
  if (activeBtn) { activeBtn.remove(); activeBtn = null; }

  const heading = findIngredientsHeading(body);
  if (!heading) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'back-to-ingredients';
  btn.setAttribute('aria-label', 'Back to ingredients');
  btn.hidden = true;
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
    <span>Ingredients</span>
  `;
  btn.addEventListener('click', () => {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.body.appendChild(btn);
  activeBtn = btn;

  observer = new IntersectionObserver(([entry]) => {
    // Heading is "above" the viewport when it's not intersecting AND
    // its bounding box top is negative. We only want the button when
    // scrolled past, not when the heading is below the viewport.
    const offscreenAbove = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    btn.hidden = !offscreenAbove;
  }, { rootMargin: '0px 0px 0px 0px', threshold: 0 });
  observer.observe(heading);
}
