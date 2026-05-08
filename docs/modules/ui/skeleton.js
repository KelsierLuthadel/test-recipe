// First-paint skeleton loader for the home page while recipes.json fetches.
// Replaces the contents of #content with a header bar and 8 placeholder cards.

const SKELETON_CARD = `
  <div class="card skeleton-card" aria-hidden="true">
    <div class="card-media skel"></div>
    <div class="card-body">
      <div class="skel skel-title"></div>
      <div class="skel skel-line"></div>
      <div class="skel skel-line short"></div>
    </div>
  </div>
`;

export function showSkeleton(targetEl) {
  const target = targetEl || document.getElementById('content');
  if (!target) return;
  const cards = Array.from({ length: 8 }, () => SKELETON_CARD).join('');
  target.innerHTML = `
    <div class="skeleton-shell">
      <div class="skel skel-h1"></div>
      <div class="skel skel-line wide"></div>
      <div class="card-grid">${cards}</div>
    </div>
  `;
}
