# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-05-10

### Added

#### Calendar-style meal plan
- The meal plan page is now a full **month calendar**. Each cell is a date; click a cell to see that day's meals and a single-day shopping list, click outside the calendar to return to the month view.
- Free-form, ordered list of meals per day — no fixed lunch/dinner slots, plan as many meals as you like.
- **Per-date storage** (`recipes:plan-dates`). Existing per-week and legacy single-week plans migrate forward on first read.
- **Recipe drawer** above the calendar with three tabs (Recent / Favourites / All). All-tab has a debounced search filtering meal-only recipes (skips spice mixes, sauces, pastes, stocks, coulis, vinaigrettes etc.).
- **Drag-and-drop** everywhere: drag a recipe card from the drawer onto a calendar cell to add; drag a planned card to another cell to move; drag within the day detail panel to reorder.
- **Shopping list scope follows selection**: a selected day shows that day's ingredients only; with no selection the list aggregates the whole visible month. Aisle-grouped (Produce / Meat / Fish & seafood / Dairy & eggs / Bakery / Pantry / Spices & herbs / Other) with persistent tick state and a Reset button.
- **Month navigation** with prev/next arrows, "Today" jump button, and a "Clear month" action.
- **Recipe-page picker** swapped from weekday-and-slot chips to **next 14 days** as date chips ("Mon 12 May" with today bolded).

#### Recipes (around 130 new dishes across 28 cuisines)
- New cuisines added with 3+ recipes each (main / side / dessert): **Cambodian, Somalian, Jewish, Ukrainian, Israeli, Jordanian, Egyptian, Iraqi, Iranian, Turkish, Arabian (Saudi/Gulf), Afghan, Palestinian, Lebanese, American, South American, Creole, North African, Persian, Native North American, Colombian, Chilean**.
- Vegetarian-meal scaffolding across the existing collection — every cuisine now has at least three vegetarian mains. Includes British (Welsh rarebit, Glamorgan sausages, cheese-and-onion pie), Cuban (Moros y Cristianos, Yuca con Mojo, Plátanos Maduros), Ethiopian (Misir Wat, Shiro Wat, Atakilt Wat), Filipino, Hungarian, Indonesian, Irish (Colcannon, Boxty, Champ), Malaysian, Moroccan (Vegetable Tagine, Zaalouk, Bissara), Russian (Vinaigrette Salad, Vegetarian Borscht, Vareniki), Vietnamese (Pho Chay, Goi Cuon Chay, Banh Xeo Chay), and partial top-ups across French, Polish, Spanish, Greek, Mexican, German, Cajun, Chinese, Jamaican, Japanese, Thai.
- New side: **Wagamama-style wok-fried greens**.
- Cuisine overviews added to `categories.json` for every new cuisine.
- Many new images bulk-fetched from Pexels.

#### Wine and side pairings
- Recipe pages for meals and desserts now show a **Wine pairing** callout near the top, suggesting up to 4 wines plus a short pairing note. Driven by 16 rules in `wine-pairings.json`; matches by tags, anyTags, titleAny, plus `pathPrefix` for cuisine-scoped rules.
- Recipe pages for meals also show a **"Pairs well with"** side-dish strip with thumbnails. Driven by 10 rules in `side-pairings.json` (curry → naan/rice/raita; pasta → garlic bread; roasts → roast potatoes etc.). Sides themselves never get pairings.
- New **Settings → Pairings** section with toggles to show/hide each callout. Default on.

#### Similar recipes
- Each recipe page ends with a **"More like this"** section: 4 cards picked by tag overlap (5 points per distinctive tag, 1 per generic), same-category bonus, same-cuisine bonus. Skips building-block recipes (sauces, pastes, stocks). Filters out allergen-blocked recipes.

#### Allergens (since 0.4)
- Added **garlic** as a 12th tracked allergen (alongside gluten, dairy, eggs, tree-nuts, peanuts, soy, sesame, fish, shellfish, mustard, celery, plus the existing 11).
- **Bold-only inline highlight** with a soft accent color. Per-recipe footnote ("Contains: …") sits above prev/next nav. Highlight defaults **on** for new users.

#### Tag groups on Discover
- The chip filter row on Discover (and category-filter rows) now groups tags into three rows with their own subtle accent color: **Diet & speed** (green), **Course & method** (blue), **Ingredients** (red). Unmapped tags fall through to "Other".

#### Themes
- Six named themes replace the old binary light/dark toggle: three light (**Linen**, **Mint**, **Blush**) and three dark (**Cast Iron**, **Midnight**, **Plum**).
- New **Settings → Appearance** picker with colour swatches, theme labels, and a Light/Dark family tag.
- The topbar day/night button now flips to the *counterpart* of the current theme — Linen ↔ Cast Iron, Mint ↔ Midnight, Blush ↔ Plum — so picking Mint and toggling gives you Midnight instead of resetting to a generic dark.
- Mint and Blush use pastel cool-green and warm-rose palettes; Midnight (deep navy with soft pastel-blue accent) and Plum (deep aubergine with dusty lavender) are pastel-coordinated dark counterparts. Linen and Cast Iron are the renamed originals (sage on cream / sage on warm brown-black).
- Stored value migrates from the legacy `'light'` / `'dark'` strings to the new theme keys on first read.

#### Authoring
- New `AUTHORING.md` covering the recipe template, where files live, image fetch, how tags are derived (and how to fix false positives), adding a new cuisine, the pairing/substitution JSON files, and the four scripts to run.

### Changed
- Day-grid meal plan layout briefly experimented with lunch/dinner slots and a sticky right shopping list before settling on the calendar redesign. Both intermediate shapes' data migrates forward.
- **Pizza** folder moved from `cuisine/pizza/` to `cuisine/italian/pizza/`. All 21 pizza/calzone recipes and their images now live under Italian. `categories.json` overview updated.
- **Thai** recipes reshuffled into their proper sub-folders: `thai-green-curry-vegetarian` → `cuisine/thai/curry/`, `pad-pak-ruam` → `cuisine/thai/stir-fries/`.

### Fixed
- **Multi-word search** ("chilli con carne", "lemon chicken") was clobbering the input on every keystroke because the input handler trimmed before navigating; the trim mismatched the route's query and `syncSearchInput` rubber-banded the input. Trim is now done after the empty-check; sync also bails when the input has focus.
- **Meat / seafood detection false positives**:
  - "kidney beans" → triggered meat (kidney as offal). Removed `kidney` from the broad pattern; offal recipes still match via the primary protein word.
  - "mushroom mince" → triggered meat. Removed `mince` from the broad pattern; minced-meat recipes still match via the primary protein word.
  - "oyster mushrooms" / "oyster sauce" → triggered seafood. Negative lookahead added: `\boysters?\b(?!\s+(?:mushroom|sauce))`.
  - "beef tomato" → triggered beef. Negative lookahead: `\bbeef\b(?!\s+tomato)`.
  - "prawn crackers" → triggered prawn. Negative lookahead: `\bprawns?\b(?!\s+crackers?)`.
  - "Glamorgan sausages" / "veggie sausages" → triggered pork. Negative lookbehind: `(?<!(?:glamorgan|veggie|vegetarian|vegan)\s)`.
  - Common beef cuts (rib-eye, sirloin, t-bone, ribeye, short rib, etc.) added to MEAT_PATTERNS so dishes that name only the cut still register.
  - Plurals (`prawns`, `oysters`, `sausages`, etc.) handled.

### Internal
- New modules: `docs/modules/util/iso-date.js` (ISO date and month helpers, calendar grid generation), `docs/modules/aisles.js` (canonical-name → supermarket-aisle mapping), `docs/modules/recipe/side-pairings.js`, `docs/modules/recipe/similar.js`, `docs/modules/themes.js` (theme registry, families, counterparts, legacy migration).
- A `data-theme-family` attribute is now set on `<html>` alongside `data-theme`. The seven existing CSS rules previously keyed off `[data-theme="dark"]` were migrated to `[data-theme-family="dark"]` so they apply to all three dark themes.
- New stylesheets: `docs/css/recipe/side-pairings.css`, `docs/css/recipe/similar.css`. `docs/css/pages/plan.css` rewritten for the calendar layout.
- New data files: `side-pairings.json` (10 rules) at the repo root.
- New storage namespaces: `recipes:plan-dates`, `recipes:plan-shopping-ticks`, `recipes:wine`, `recipes:sides`. Old `recipes:plan` (single week) and `recipes:plan-weeks` (per-week) keys read once for migration.
- Total recipes: **871** across **22** top-level categories. **559** ingredient names indexed (≥3 recipes). **40** substitution entries. **16** wine-pairing rules. **10** side-pairing rules; **336** recipes paired. **96 tests pass.**

[0.5.0]: https://github.com/KelsierLuthadel/recipes/releases/tag/0.5.0

## [0.4.0] - 2026-05-10

### Added

#### Allergens
- Allergen detection at build time across 12 categories: gluten, dairy, eggs, tree-nuts, peanuts, soy, sesame, fish, shellfish, mustard, celery, and garlic. Patterns scan each recipe's title and ingredients block.
- New **Settings → Allergens** section with:
  - A "Highlight allergens on recipe page" toggle.
  - Per-allergen "Hide recipes with X" toggles. Hidden allergens remove matching recipes from every list page (home, category, discover, pantry, search, collections, top-rated, notes, cooked, recently viewed) and from prev/next navigation.
- When highlighting is on, matching ingredient words render in **bold** and a "Contains: ..." footnote appears above the prev/next nav, listing each detected allergen.

#### Wine pairings
- New **Wine pairing** callout near the top of every meal and dessert recipe, suggesting up to four wines with a short pairing note.
- 16 rules in `wine-pairings.json` covering beef and lamb, beef stews, chicken, pork, duck, fish, shellfish, spicy/curry, Italian, Asian, vegetarian, plus chocolate, fruit, citrus, creamy, and sponge/pastry desserts.
- Default fallbacks for meals and desserts that no rule matches.
- New **Settings → Wine pairings** toggle to show or hide the callout (defaults to on).

#### Discover and category filters
- Tag chips on the Discover page and category-filter rows are now grouped into three labelled rows:
  - **Diet & speed** (green) — vegetarian, vegan, gluten-free, dairy-free, quick, complex, spicy.
  - **Course & method** (blue) — meals, baking, dessert, sides, salsa, curry, asian, no-cook, make-ahead, one-pan, spices, pastes.
  - **Ingredients** (red) — meat, chicken, beef, pork, lamb, duck, fish, prawn, salmon.
- Each group has its own resting, hover, and active palette in light and dark themes.
- Unknown tags fall through to a generic "Other" group so newly-emitted build tags surface without code changes.

#### Recipes
- ~150 new recipes added across 11 new cuisines and 3 new top-level sections:
  - **Cuisines**: British, Ethiopian, Filipino, German, Greek, Hungarian, Korean, Middle Eastern, Moroccan, Polish, Russian (joining the existing French, Italian, Spanish, Mexican, Japanese, Chinese, and others).
  - **Top-level**: Breakfast, Snacks, Starters, plus expanded Sides.
- Each new cuisine has an overview paragraph in the same style as the existing ones, used by category tile descriptions.

### Changed
- The build script's `package.json` version sync is now forward-only: a manually-bumped `package.json` ahead of the latest git tag is preserved instead of being overwritten on every build.
- Pre-paint inline script in `index.html` now also reads allergen and wine-pairing prefs so highlight and visibility classes are applied before first paint, avoiding a flash of incorrect state.

### Fixed
- `parseToMinutes` (`docs/modules/util/time.js`) and the build script's `timeStringToMinutes` silently dropped Unicode fractions (½, ¼, ¾, ⅓, ⅔, ⅛, etc.), so recipes whose times read as `1½ hours` or `3½ hours` were parsed as zero. Doro Wat, Kare-Kare, and the starter version of French Onion Soup were among the recipes mistakenly tagged `quick`. Both functions now normalise the full Unicode fraction block before regex matching.
- 17 recipes had Unicode-fraction times affected by the bug above; all are now tagged correctly.
- Regression test added in `tests/time.test.mjs` covering `1½ hours`, `1¼ hours`, `3½ hours`, bare `½ hour`, and mixed `1¾ hours 10 minutes`.

### Internal
- New helper modules: `docs/modules/allergens.js`, `docs/modules/recipe/allergen-marks.js`, `docs/modules/recipe/wine-pairings.js`.
- New stylesheets: `docs/css/recipe/allergen-marks.css`, `docs/css/recipe/wine-pairings.css`.
- New data files: `wine-pairings.json` at the repo root, alongside `substitutions.json` and `categories.json`.
- New storage namespaces: `recipes:allergens` (`{ hide: [], highlight: bool }`) and `recipes:wine` (`{ visible: bool }`). Both are wiped by Settings → Clear all data.
- Tag taxonomy in `docs/modules/tags.js` now exports `TAG_GROUPS`, `TAG_GROUP_ORDER`, and `TAG_GROUP_LABELS`.
- Total recipes: **743** across **22** top-level categories. **470** ingredient names indexed (≥3 recipes). **40** substitution entries. **16** wine-pairing rules.
- Tests: **96 pass**.

[0.4.0]: https://github.com/KelsierLuthadel/recipes/releases/tag/0.4.0
