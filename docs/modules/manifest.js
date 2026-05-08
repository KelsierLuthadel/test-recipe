// Loads docs/recipes.json and indexes it into the shared state object so
// other modules can do O(1) lookups by slug or category path.

import { state } from './state.js';

export async function loadManifest() {
  const res = await fetch('recipes.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load recipes.json: HTTP ${res.status}`);
  const m = await res.json();
  state.manifest = m;
  indexManifest(m);
}

export function indexManifest(m) {
  state.flatRecipes = [];
  state.nodeByPath.clear();
  state.recipeBySlug.clear();
  const visit = (node) => {
    if (node.path !== undefined) state.nodeByPath.set(node.path, node);
    for (const r of node.recipes || []) {
      state.flatRecipes.push({ ...r, categoryPath: node.path });
      state.recipeBySlug.set(r.slug, { ...r, categoryPath: node.path });
    }
    for (const c of node.subcategories || []) visit(c);
  };
  for (const c of m.categories) visit(c);
}

export function rawUrl(path) { return state.manifest.rawBase + path; }

export function categoryNode(path) {
  if (!path) {
    return {
      subcategories: state.manifest.categories,
      recipes: [],
      label: 'All',
      path: '',
      recipeCount: state.manifest.totalRecipes,
    };
  }
  return state.nodeByPath.get(path) || null;
}

export function ancestors(path) {
  if (!path) return [];
  const parts = path.split('/');
  const out = [];
  for (let i = 1; i <= parts.length; i++) out.push(parts.slice(0, i).join('/'));
  return out;
}

export function flattenRecipes(node) {
  const out = [...(node.recipes || [])];
  for (const sub of node.subcategories || []) out.push(...flattenRecipes(sub));
  return out;
}
