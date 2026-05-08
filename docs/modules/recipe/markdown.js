// Fetches recipe markdown from the raw GitHub URL and renders it via marked.
// Markdown text is cached in state.recipeContent (keyed by slug) so flipping
// between recipes doesn't re-hit the network.
//
// Two post-processing passes:
//   - relative <img src="…"> resolved against the recipe's directory + rawBase
//   - relative <a href="…/foo.md"> rewritten to in-app routes (#/r/<slug>)

import { state } from '../state.js';
import { rawUrl } from '../manifest.js';
import { escapeHtml, escapeAttr } from '../util/dom.js';

export async function fetchRecipeMarkdown(recipe) {
  if (state.recipeContent.has(recipe.slug)) return state.recipeContent.get(recipe.slug);
  const url = rawUrl(recipe.path);
  const promise = (async () => {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${recipe.path}`);
    return await res.text();
  })();
  state.recipeContent.set(recipe.slug, promise);
  try {
    const text = await promise;
    state.recipeContent.set(recipe.slug, text);
    return text;
  } catch (e) {
    state.recipeContent.delete(recipe.slug);
    throw e;
  }
}

export function renderMarkdown(md, recipe) {
  const recipeDir = recipe.path.split('/').slice(0, -1).join('/');
  // Strip Serves / Prep Time / Cook Time lines (rendered as chips instead)
  const cleaned = md
    .replace(/^\*\*Serves:\*\*[^\r\n]*\r?\n?/im, '')
    .replace(/^\*\*Prep Time:\*\*[^\r\n]*\r?\n?/im, '')
    .replace(/^\*\*Cook Time:\*\*[^\r\n]*\r?\n?/im, '');
  if (typeof window.marked === 'undefined') {
    // marked failed to load — show raw text
    return `<pre style="white-space:pre-wrap">${escapeHtml(cleaned)}</pre>`;
  }
  window.marked.setOptions({ gfm: true, breaks: false });
  const html = window.marked.parse(cleaned);
  // Resolve relative <img src> against the recipe's directory using rawBase
  const withImgs = html.replace(/<img\s+([^>]*?)src="([^"]+)"/gi, (m, attrs, src) => {
    if (/^https?:/i.test(src)) return m;
    const resolved = resolveRelative(recipeDir, src);
    return `<img ${attrs}src="${escapeAttr(rawUrl(resolved))}" loading="lazy"`;
  });
  // Rewrite relative .md anchors to recipe routes; leave external/anchor/mailto links alone
  return withImgs.replace(/<a\s+([^>]*?)href="([^"]+)"/gi, (m, attrs, href) => {
    if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) return m;
    if (!/\.md(?:#.*)?$/i.test(href)) return m;
    const [pathPart, frag] = href.split('#');
    const resolved = resolveRelative(recipeDir, pathPart);
    const slug = resolved.replace(/\.md$/i, '');
    const encoded = slug.split('/').map(encodeURIComponent).join('/');
    const newHref = `#/r/${encoded}${frag ? '#' + frag : ''}`;
    return `<a ${attrs}href="${escapeAttr(newHref)}"`;
  });
}

function resolveRelative(base, target) {
  const parts = (base + '/' + target).split('/');
  const out = [];
  for (const p of parts) {
    if (!p || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}
