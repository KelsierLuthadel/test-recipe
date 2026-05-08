#!/usr/bin/env node
// Walks the repo, parses every recipe markdown file, and writes docs/recipes.json.
// Run from anywhere: node scripts/build-manifest.mjs

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, posix, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_PATH = join(REPO_ROOT, 'docs', 'recipes.json');
const CATEGORIES_PATH = join(REPO_ROOT, 'categories.json');

const SKIP_DIRS = new Set(['.git', 'docs', 'node_modules', 'scripts', 'wip', 'resources']);
const SKIP_FILES = new Set(['README.md', 'RECIPE_TEMPLATE.md', 'LICENSE', 'new.md']);

const LABEL_OVERRIDES = {
  'appetitizer': 'Appetisers',
  'baking': 'Baking',
  'base-ingredients': 'Base Ingredients',
  'bread-pasta': 'Bread & Pasta',
  'coulis': 'Coulis',
  'cuisine': 'World Cuisine',
  'desert': 'Desserts',
  'petit-four': 'Petit Fours',
  'pies': 'Pies',
  'rice': 'Rice',
  'salad': 'Salads',
  'salsa': 'Salsas',
  'sauces': 'Sauces',
  'sides': 'Sides',
  'soup': 'Soups',
  'sponge': 'Sponges',
  'starter': 'Starters',
  'stocks': 'Stocks',
  'tarts': 'Tarts',
  'vinaigrette': 'Vinaigrettes',
  'BIR': 'BIR',
  'Spice-Mixes': 'Spice Mixes',
};

function toPosix(p) {
  return p.split(sep).join(posix.sep);
}

function titleCase(slug) {
  if (LABEL_OVERRIDES[slug]) return LABEL_OVERRIDES[slug];
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function detectRepoBranch() {
  let repo = 'KelsierLuthadel/recipes';
  let branch = 'main';
  let commit = null;
  let version = null;
  try {
    const url = execSync('git config --get remote.origin.url', { cwd: REPO_ROOT }).toString().trim();
    const m = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/i);
    if (m) repo = `${m[1]}/${m[2]}`;
  } catch { /* fall back */ }
  try {
    const b = execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO_ROOT }).toString().trim();
    if (b && b !== 'HEAD') branch = b;
  } catch { /* fall back */ }
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT }).toString().trim() || null;
  } catch { /* unavailable - manifest just won't show a commit */ }
  try {
    // Most recent tag reachable from HEAD. Fails (and we leave version
    // null) if no tags exist yet; the UI falls back to the commit hash.
    version = execSync('git describe --tags --abbrev=0', { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
  } catch { /* no tags - skip */ }
  return { repo, branch, commit, version };
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(full, files);
    } else if (entry.endsWith('.md') && !SKIP_FILES.has(entry)) {
      files.push(full);
    }
  }
  return files;
}

function extractTitle(md) {
  const m = md.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

function extractServes(md) {
  const m = md.match(/^\*\*Serves:\*\*\s*(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

function extractPrepTime(md) {
  const m = md.match(/^\*\*Prep Time:\*\*\s*(.+?)\s*$/mi);
  return m ? m[1].trim() : null;
}

function extractCookTime(md) {
  const m = md.match(/^\*\*Cook Time:\*\*\s*(.+?)\s*$/mi);
  return m ? m[1].trim() : null;
}

function extractIngredientText(md) {
  const m = md.match(/^##\s+Ingredients\s*\n([\s\S]*?)(?=^##\s|$(?![\r\n]))/m);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/).filter(l => /^-\s/.test(l));
  if (!lines.length) return null;
  return lines
    .map(l => l
      .replace(/^-\s+/, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // strip markdown links
      .replace(/\*\*([^*]+)\*\*/g, '$1')          // strip bold
      .replace(/\*([^*]+)\*/g, '$1')              // strip italic
      .replace(/\([^)]*\)/g, '')                  // drop parentheticals (chopped, sliced, etc.)
      .replace(/\s+/g, ' ')
      .trim()
    )
    .filter(Boolean)
    .join(' • ');
}

// Pull canonical ingredient names from each bullet under ## Ingredients.
// Used by the pantry picker to score recipes by overlap with what the
// user has on hand. Canonicalisation is intentionally light: we strip
// quantity + unit + parentheticals + trailing comma clauses, lowercase
// and trim. Plurals are left alone; runtime matching uses substring,
// so "onion" picks up recipes that list "onions" / "red onion" too.
const QTY_RE  = /^\s*(?:\d+(?:[.,/]\d+)?(?:\s+\d+\/\d+)?(?:\s*[½¼¾⅓⅔⅛⅜⅝⅞])?(?:\s*[-–]\s*\d+(?:[.,/]\d+)?(?:\s*[½¼¾⅓⅔⅛⅜⅝⅞])?)?|[½¼¾⅓⅔⅛⅜⅝⅞]|half|quarter|a)\s+/i;
const UNIT_RE = /^(?:tablespoons?|teaspoons?|tbsps?|tsps?|cups?|kilograms?|grams?|millilitres?|milliliters?|litres?|liters?|ounces?|pounds?|kg|g|mg|ml|fl\s*oz|oz|lb|lbs|pints?|cloves?|sticks?|pieces?|slices?|sprigs?|handfuls?|pinch(?:es)?|dashes?|knobs?|drops?|splash(?:es)?|cans?|jars?|packets?)\b\.?\s+/i;
const LEADING_OF_RE = /^of\s+/i;
const LEADING_MOD_RE = /^(?:fresh|dried|finely\s+chopped|chopped|crushed|grated|ground|whole|cooked|raw|frozen|tinned|canned)\s+/i;
const TRAILING_NOISE_RE = /\s+(?:to\s+taste|for\s+(?:serving|garnish|frying|drizzling|dusting|sprinkling)|as\s+(?:needed|required))\s*$/i;

function canonicaliseIngredient(line) {
  let s = line
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;
  s = s.replace(QTY_RE, '');
  s = s.replace(UNIT_RE, '');
  s = s.replace(LEADING_OF_RE, '');
  s = s.replace(LEADING_MOD_RE, '');
  s = s.split(',')[0];
  s = s.replace(TRAILING_NOISE_RE, '');
  s = s.toLowerCase().trim();
  // Drop very short strings (single letters or single short syllables);
  // they're almost always parsing residue ("a", "g") rather than a real
  // ingredient name.
  if (s.length < 3) return null;
  return s;
}

function extractIngredientNames(md) {
  const m = md.match(/^##\s+Ingredients\s*\n([\s\S]*?)(?=^##\s|$(?![\r\n]))/m);
  if (!m) return [];
  const lines = m[1].split(/\r?\n/).filter(l => /^-\s/.test(l));
  const seen = new Set();
  const out = [];
  for (const l of lines) {
    const name = canonicaliseIngredient(l.replace(/^-\s+/, ''));
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

const MEAT_PATTERNS = /\b(chicken|beef|pork|lamb|mutton|turkey|duck|goose|venison|rabbit|veal|bacon|sausage|sausagemeat|salami|pepperoni|pancetta|chorizo|prosciutto|nduja|ham\b|mince|fillet|steak|cutlet|chop|gammon|brisket|oxtail|liver|kidney|tripe)\b/i;
const SEAFOOD_PATTERNS = /\b(fish|salmon|tuna|cod|trout|mackerel|haddock|plaice|sole|seabass|sea bass|bream|snapper|shrimp|prawn|lobster|crab|oyster|mussel|clam|scallop|squid|octopus|calamari|anchov|sardine|kipper|monkfish|halibut|crayfish)\b/i;
const SPICY_PATTERNS = /\b(chill?i(?:es)?|cayenne|jalape[ñn]o|sambal|harissa|sriracha|tabasco|gochujang|piri.?piri|scotch bonnet|bird'?s.?eye|habanero|chipotle|nduja|curry powder|curry paste)\b/i;
const SPICE_LINK_PATTERN = /\/(?:spice-mixes|curry-paste|curry-powder)\//i;
// Animal products beyond meat / seafood — used to disqualify a recipe
// from the "vegan" tag. Eggs / dairy are common edge cases.
const DAIRY_PATTERNS = /\b(milk|butter|buttermilk|cream|cr[eè]me|yogurt|yoghurt|cheese|fromage|paneer|ghee|kefir|quark|skyr|curd|curds|whey|casein|lactose|feta|mozzarella|parmesan|ricotta|mascarpone|cheddar|brie|gruy[èe]re|halloumi|stilton|gorgonzola)\b/i;
const EGG_PATTERNS = /\beggs?\b/i;
const HONEY_PATTERN = /\bhoney\b/i;
// Wheat / gluten-bearing ingredients. Naïve but catches most cases.
const GLUTEN_PATTERNS = /\b(flour|wheat|bread|breadcrumbs?|pasta|noodles|spaghetti|fettuccine|tagliatelle|penne|fusilli|ravioli|tortellini|gnocchi|lasagne|lasagna|barley|bulgur|couscous|semolina|farro|rye|seitan|pastry|cake|biscuits?|crackers?|filo|phyllo|pita)\b/i;
// "make ahead" / "the day before" / "overnight" cues anywhere in the body
// (Method, Notes, Storage). These are recipes that benefit from prep
// the night before or that explicitly note advance preparation.
const MAKE_AHEAD_PATTERNS = /\b(make[- ]ahead|day before|overnight|chill(?:s)?\s+overnight|refrigerate\s+overnight|prepare\s+(?:a|the)\s+day\s+(?:in\s+advance|before)|24\s*hours?|prep\s+ahead)\b/i;
// Single-pan / one-pot / sheet-pan keywords in the title or method intro.
const ONE_PAN_PATTERNS = /\b(one[- ](?:pan|pot|skillet|tray|sheet)|sheet[- ]pan|single[- ]pan|single[- ]pot)\b/i;
// "No cook" / "no-bake" recipes. Scoped to title or notes to keep the
// signal clean (lots of method steps mention "no need to cook" etc.).
const NO_COOK_PATTERNS = /\b(no[- ](?:cook|bake)|raw\b)\b/i;
// Path segments under cuisine/ that mean "this is a building block, not a
// finished meal". Folder slugs are already lowercased before matching.
const CUISINE_NON_MEAL_SEGMENT = /^(?:base|breads?|pastes?|sauces?|pickles?|sauces-pickles|side-dishes?|spices?|mixes?|spice-mixes?|stocks?)$/;
// Top-level cuisine folders that get the 'asian' regional tag.
const ASIAN_CUISINES = new Set(['indian', 'chinese', 'thai', 'vietnamese', 'indonesian', 'malaysian']);
// Specific main-protein tags. Each pattern only fires when the protein
// is in the ingredients block, same heuristic as MEAT_PATTERNS / SEAFOOD_PATTERNS.
// Kept narrow on purpose: a chip that matches 1-2 recipes is just noise
// on the discover picker. Pork covers cured / processed pork products
// (bacon, sausage, chorizo) since those rarely live alongside fresh pork
// in the same recipe and the user mostly cares "is there pig in this".
const PROTEIN_PATTERNS = {
  chicken: /\bchicken\b/i,
  beef:    /\b(?:beef|brisket|oxtail|steak)\b/i,
  pork:    /\b(?:pork|bacon|pancetta|gammon|chorizo|salami|pepperoni|sausage|sausagemeat|nduja|prosciutto|ham)\b/i,
  lamb:    /\b(?:lamb|mutton)\b/i,
  duck:    /\b(?:duck|goose)\b/i,
  prawn:   /\b(?:prawn|shrimp)\b/i,
  salmon:  /\bsalmon\b/i,
};

function timeStringToMinutes(str) {
  if (!str) return 0;
  let total = 0;
  const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*hour/i);
  const minMatch = str.match(/(\d+(?:\.\d+)?)\s*min/i);
  if (hourMatch) total += parseFloat(hourMatch[1]) * 60;
  if (minMatch) total += parseFloat(minMatch[1]);
  return total;
}

function extractIngredientsBlock(md) {
  const m = md.match(/^##\s+Ingredients\s*\n([\s\S]*?)(?=^##\s|$(?![\r\n]))/m);
  return m ? m[1] : '';
}

function deriveTags(recipe, md) {
  // Diet / spice tags scan ONLY the Ingredients section + title to avoid
  // false positives from prose ("chilli can be added", "serve with bread").
  // Method / make-ahead tags scan the whole document where the signal lives.
  const ingredients = extractIngredientsBlock(md);
  const ingredientsHay = (recipe.title + '\n' + ingredients).toLowerCase();
  const fullHay = (recipe.title + '\n' + md).toLowerCase();
  const tags = [];

  const hasMeat = MEAT_PATTERNS.test(ingredientsHay);
  const hasSeafood = SEAFOOD_PATTERNS.test(ingredientsHay);
  const hasDairy = DAIRY_PATTERNS.test(ingredientsHay);
  const hasEgg = EGG_PATTERNS.test(ingredientsHay);
  const hasHoney = HONEY_PATTERN.test(ingredientsHay);
  const hasGluten = GLUTEN_PATTERNS.test(ingredientsHay);

  if (!hasMeat && !hasSeafood) tags.push('vegetarian');
  if (!hasMeat && !hasSeafood && !hasDairy && !hasEgg && !hasHoney) tags.push('vegan');
  if (!hasDairy) tags.push('dairy-free');
  if (!hasGluten) tags.push('gluten-free');
  if (SPICY_PATTERNS.test(ingredientsHay) || SPICE_LINK_PATTERN.test(ingredientsHay)) tags.push('spicy');

  const total = timeStringToMinutes(recipe.prepTime) + timeStringToMinutes(recipe.cookTime);
  if (total > 0 && total <= 30) tags.push('quick');

  // Folder convention: anything under desert/ is a sweet ending. Spelled
  // "desert" in this repo's existing tree, so we accept either form.
  if (/^(?:desert|dessert)\//.test(recipe.path) || /\/(?:desert|dessert)\//.test(recipe.path)) {
    tags.push('dessert');
  }

  if (MAKE_AHEAD_PATTERNS.test(fullHay)) tags.push('make-ahead');
  if (ONE_PAN_PATTERNS.test(fullHay)) tags.push('one-pan');
  if (NO_COOK_PATTERNS.test(recipe.title.toLowerCase())) tags.push('no-cook');

  // Path / category-driven tags. Folder names are stable and unambiguous,
  // so these are very low-noise signals.
  const path = recipe.path.toLowerCase();
  const segments = path.split('/');
  if (path.startsWith('baking/')) tags.push('baking');
  if (path.startsWith('sides/')) tags.push('sides');
  if (path.startsWith('salsa/')) tags.push('salsa');
  // Meals: anything under cuisine/ is a meal, unless a path segment names
  // a building-block category (sauces, pickles, pastes, spices, breads,
  // stocks, side dishes, mixes, base ingredients). Recipes living
  // explicitly under a 'meals' folder anywhere are always meals.
  const inCuisine = segments[0] === 'cuisine';
  const hasNonMealSegment = segments.some(s => CUISINE_NON_MEAL_SEGMENT.test(s));
  if (segments.some(s => s === 'meals') || (inCuisine && !hasNonMealSegment)) {
    tags.push('meals');
  }
  // Asian: regional umbrella covering the south / south-east / east Asian
  // sub-cuisines we keep under cuisine/.
  if (inCuisine && ASIAN_CUISINES.has(segments[1])) tags.push('asian');
  if (segments.some(s => /^spices?$/.test(s) || /^spice-mixe?s?$/.test(s))) tags.push('spices');
  if (segments.some(s => s.includes('paste'))) tags.push('pastes');

  // Ingredient-driven main-protein tags. Reuse the meat / seafood
  // detection we already did for vegetarian / vegan above so the
  // signal stays consistent.
  if (hasMeat) tags.push('meat');
  if (hasSeafood) tags.push('fish');
  // Specific protein chips for the discover picker: chicken, beef,
  // pork, lamb, duck, prawn, salmon. Multiple may fire on the same
  // recipe (e.g. surf-and-turf gets beef + prawn).
  for (const [tag, pattern] of Object.entries(PROTEIN_PATTERNS)) {
    if (pattern.test(ingredientsHay)) tags.push(tag);
  }

  // Curry: title says so, the path lives under a curry-named folder,
  // or the recipe calls for curry powder / paste / leaves.
  const titleLower = recipe.title.toLowerCase();
  if (
    /\bcurry\b/.test(titleLower) ||
    segments.some(s => s.includes('curry')) ||
    /\b(?:curry\s+powder|curry\s+paste|curry\s+leaves)\b/.test(ingredientsHay)
  ) {
    tags.push('curry');
  }

  // Complex: a recipe that takes serious time OR has a long ingredient
  // list. Either signal alone is enough - a 25-ingredient assembly is
  // complex even if it cooks fast, and a 4-hour braise is complex even
  // with 6 ingredients.
  const totalMinutes = timeStringToMinutes(recipe.prepTime) + timeStringToMinutes(recipe.cookTime);
  const ingredientLineCount = (ingredients.match(/^-\s/gm) || []).length;
  if (totalMinutes > 90 || ingredientLineCount > 15) tags.push('complex');

  return tags;
}

function extractImage(md, recipeDir) {
  const m = md.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (!m) return null;
  let p = m[1].trim();
  if (/^https?:/i.test(p)) return p;
  const segments = [];
  for (const part of (recipeDir + '/' + p).split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') segments.pop();
    else segments.push(part);
  }
  return segments.join('/');
}

function extractOverview(md) {
  const m = md.match(/^##\s+Overview\s*\n([\s\S]*?)(?=^##\s|$(?![\r\n]))/m);
  if (!m) return null;
  const block = m[1].trim();
  const firstPara = block.split(/\n\s*\n/)[0] || '';
  return firstPara.replace(/\s+/g, ' ').trim() || null;
}

function ensureNode(root, segments) {
  let node = root;
  const trail = [];
  for (const seg of segments) {
    trail.push(seg);
    let child = node.subcategories.find(c => c.slug === seg);
    if (!child) {
      child = {
        slug: seg,
        path: trail.join('/'),
        label: titleCase(seg),
        subcategories: [],
        recipes: [],
      };
      node.subcategories.push(child);
    }
    node = child;
  }
  return node;
}

function sortTree(node) {
  node.subcategories.sort((a, b) => a.label.localeCompare(b.label));
  node.recipes.sort((a, b) => a.title.localeCompare(b.title));
  for (const c of node.subcategories) sortTree(c);
}

function countRecipes(node) {
  let n = node.recipes.length;
  for (const c of node.subcategories) n += countRecipes(c);
  node.recipeCount = n;
  return n;
}

function loadCategoryOverviews() {
  try {
    return JSON.parse(readFileSync(CATEGORIES_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function attachOverviews(node, overviews) {
  if (node.path && overviews[node.path]) node.overview = overviews[node.path];
  for (const c of node.subcategories || []) attachOverviews(c, overviews);
}

function main() {
  const { repo, branch, commit, version } = detectRepoBranch();
  const rawBase = `https://raw.githubusercontent.com/${repo}/${branch}/`;
  const overviews = loadCategoryOverviews();

  const files = walk(REPO_ROOT);
  const root = { slug: '', path: '', label: 'All', subcategories: [], recipes: [] };

  let total = 0;
  for (const file of files) {
    const rel = toPosix(relative(REPO_ROOT, file));
    const md = readFileSync(file, 'utf8');
    const title = extractTitle(md);
    if (!title) continue;

    const recipeDir = rel.split('/').slice(0, -1).join('/');
    const slug = rel.replace(/\.md$/, '');

    const recipe = {
      slug,
      title,
      path: rel,
      image: extractImage(md, recipeDir),
      overview: extractOverview(md),
      serves: extractServes(md),
      prepTime: extractPrepTime(md),
      cookTime: extractCookTime(md),
      ingredients: extractIngredientText(md),
      ingredientNames: extractIngredientNames(md),
    };
    recipe.tags = deriveTags(recipe, md);

    const segments = rel.split('/').slice(0, -1);
    const node = ensureNode(root, segments);
    node.recipes.push(recipe);
    total++;
  }

  sortTree(root);
  countRecipes(root);
  for (const c of root.subcategories) attachOverviews(c, overviews);

  // Global ingredient frequency map: { 'onion': 543, ... }. Drives the
  // pantry picker's autocomplete (most common first) so users see useful
  // ingredients to pick from instead of one-off oddities. Limited to
  // entries that appear in 3+ recipes to keep noise out.
  const globalCounts = new Map();
  const visit = (node) => {
    for (const r of node.recipes || []) {
      for (const name of r.ingredientNames || []) {
        globalCounts.set(name, (globalCounts.get(name) || 0) + 1);
      }
    }
    for (const c of node.subcategories || []) visit(c);
  };
  visit(root);
  const ingredientIndex = [...globalCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  const manifest = {
    repo,
    branch,
    commit,
    version,
    rawBase,
    generatedAt: new Date().toISOString(),
    totalRecipes: total,
    categories: root.subcategories,
    ingredientIndex,
  };

  writeFileSync(OUT_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  ${total} recipes across ${root.subcategories.length} top-level categories`);
  console.log(`  ${ingredientIndex.length} ingredient names indexed (>=3 recipes)`);
}

main();
