# Recipes Web App

The static single-page app served from this directory by GitHub Pages. Renders the markdown recipes in the parent repository as a browseable, mobile-friendly UI.

## Overview

Native ES modules, no build step for the runtime code, no framework, no bundler. The category tree, search index, and recipe metadata are pre-baked into [recipes.json](recipes.json) by [../scripts/build-manifest.mjs](../scripts/build-manifest.mjs); recipe markdown bodies are fetched on demand from `raw.githubusercontent.com` using the `rawBase` field in the manifest.

[index.html](index.html) loads [app.js](app.js) as a `<script type="module">`. `app.js` is a thin dispatcher: imports + the route handler + bootstrap. Everything else lives under [modules/](modules/), grouped by concern.

## Using the App

### Browsing

The left sidebar lists every category with its recipe count. Top-level entries expand to show sub-sections, and the active page's ancestors auto-expand so the current location is always visible. The breadcrumb across the top mirrors the same trail and each segment is a link back up the tree. On mobile the sidebar collapses behind a hamburger; on desktop the topbar's collapse button hides it for more reading width.

**Home** (`#/`) shows your favourites, recently viewed, top-rated, recipes-with-notes, cooked, the full category grid, and 8 random featured cards. Each personal section can be toggled off in Settings.

**Category pages** (`#/c/<path>`) show the section's overview, sub-sections if any, a featured grid, and the full recipe list. The chip row above the recipe grid filters the section by tag.

### Search

Click the search box in the sidebar or hit `Cmd`/`Ctrl + K` to focus it. Searches match against title, overview, ingredients, and category path. Results are debounced and highlighted, with snippets centred on the first match. `#/s?q=<text>` is a direct search URL.

### Tag browsing

Two ways to browse by tag, both faceted (the chip set narrows as you pick).

**Discover** (`#/discover`, sidebar link below "All Recipes") starts from every recipe and offers every tag. Picking a tag drops chips that no longer co-occur, so you naturally drill from a broad facet (e.g. `Meals`) into narrower ones (`Asian`, then `Chicken`, then `Curry`). Tags that would yield no recipes never show. The URL captures every selection: `#/discover?tag=meals,asian,chicken` is a bookmarkable, shareable link to that filter.

**Section-page chips** behave the same on category pages, but with a difference: chips that would yield 0 results stay visible greyed out (instead of disappearing), so you can see what the section *could* offer. Counts on every chip update to "if I added this, how many recipes would remain". Click the **All** chip to clear filters.

The pills painted over recipe cards (Vegetarian / Quick / Spicy) are at-a-glance signals only; full filtering happens through the chip rows.

### Recipe pages

Open any recipe (`#/r/<slug>`) and you get a hero image, title, an overview line, and three meta chips for **Serves**, **Prep**, **Cook**.

- **Serves chip** has `+` / `-` buttons that re-scale every quantity in the ingredients (unicode fractions handled too).
- **Rate chip** is a 1-5 star widget; ratings are saved per-recipe and feed the home **Top rated** section.

The action toolbar above the body has:

- **Save** opens a dropdown of every collection (Favourites first, then your custom ones, then "+ New collection"). Tick rows to add or remove.
- **Cooked** toggles a "I made this" stamp; cooked dates feed the home **Cooked** section.
- **Cook** enters full-screen cooking mode (chrome hidden, larger text, screen wake-lock so the display stays on). `Esc` exits.
- **More** menu groups: **Mise en place** (a modal checklist of every "chop / dice / mince" prep), **QR code**, **Copy**, **Print**, **Share**.

In the body itself:

- **Tap an ingredient line** to strike it through (state lives only on the page; refresh resets it).
- **Method step headings** (`### 1. Sweat the onions`) get a clickable anchor link; copy the URL to deep-link a friend straight to that step.
- **Time phrases inside method steps** (e.g. "Simmer for 20 minutes") become inline timer chips. Click to start; the floating panel shows running timers, beeps and vibrates on completion, and survives navigating around recipes.
- **Notes** is a textarea at the bottom for your own scribbles. Saves debounced to `localStorage`; recipes with notes appear in the home **Notes** section.
- **Table of contents** (desktop only, ≥ 1180 px) sticks to the right and tracks the current section as you scroll.

### Collections

**Favourites** is built in and always present. Hit **Save** on any recipe and tick **Favourites**. The list lives at `#/favourites` and in the Saved group at the top of the sidebar.

**Custom collections** are user-created (e.g. "Weeknight dinners", "Sunday brunch"). Either tick "+ New collection" inside the Save dropdown to make one on the fly, or save a recipe to multiple collections at once. Each collection has its own page at `#/saved/<id>` with a `⋯` menu for **Rename** and **Delete**.

**Cooked**, **Recently viewed**, **Top rated**, and **Recipes with notes** are auto-populated views (no manual saving). All four live under their own routes (`#/cooked`, `#/recent`, `#/top-rated`, `#/notes`) and can be toggled on or off the home page in Settings.

All collection state is stored in `localStorage` under the `recipes:` namespace; nothing leaves the browser.

### Sharing recipes

Open a recipe and use the **More** menu:

- **Share** uses the native share sheet on devices that support it (`navigator.share`); otherwise it copies the page URL to the clipboard. Either way the link goes to the canonical hash URL, which any browser will deep-link straight back to the recipe.
- **QR code** opens a modal with a QR for the same URL, handy for handing your phone to someone or pulling the recipe up on a tablet across the kitchen.
- **Copy** writes the rendered recipe (rich text + plain text) to the clipboard so it pastes cleanly into Notes, email, etc.
- **Print** uses a print-stylesheet that strips chrome and adds page-break hints.

### Sharing ingredients

The **Ingredients** heading on every recipe has a **Shopping list** action button next to it. Click it to copy a plain-text + HTML shopping list to the clipboard, with sub-section h3s preserved as section breaks. On mobile it also opens the share sheet so you can fire it straight to Notes / Messages / Reminders.

### Bookmarkable links

Every meaningful state in the app is encoded in the URL hash, so any page can be bookmarked, shared, or pasted straight into a chat. Common shapes:

| URL | Opens |
|---|---|
| `#/r/<path>/<slug>` | A recipe |
| `#/r/<slug>?step=2-sweat-the-onions` | A recipe scrolled to a method step |
| `#/r/<slug>?cook=1` | A recipe, immediately in cooking mode |
| `#/c/<path>` | A category |
| `#/c/<path>?tag=meals,asian` | A category pre-filtered by tags |
| `#/discover?tag=meals,asian,chicken` | The Discover picker pre-narrowed |
| `#/s?q=lamb%20curry` | A search query |
| `#/saved/<id>` | A custom collection |
| `#/favourites` | Built-in favourites |
| `#/recent`, `#/top-rated`, `#/notes`, `#/cooked` | Auto-populated lists |
| `#/settings` | Settings page |

### Settings

`#/settings` (gear icon at the bottom of the sidebar) covers:

- **Theme** (light / dark / follow system) and **Larger text** mode.
- **Home sections** toggles for the five auto-populated views on the home page.
- **Clear all data** wipes everything stored in `localStorage` (favourites, collections, ratings, notes, recently viewed, cooked log, settings).

Light/dark and text-size apply pre-paint via an inline script, so the page never flashes the wrong theme on load.

## Dependencies

Vendored under [vendor/](vendor/):

- `marked.min.js` for markdown -> HTML rendering.
- `qrcode.min.js` for the QR code modal (loaded lazily on first use).
- Source Serif 4 + Inter fonts as self-hosted woff2 with [vendor/fonts.css](vendor/fonts.css).

No runtime npm dependencies. The browser loads everything directly.

## Running Locally

From the repository root:

```sh
# rebuild the manifest after adding or editing recipes
npm run build

# serve the site (Python)
cd docs && python -m http.server 8000

# or serve it (Node, no install)
cd docs && npx --yes http-server -p 8000 -c-1
```

Open http://localhost:8000. Avoid opening `index.html` via `file://`: ES module imports and the `fetch('recipes.json')` call both require a real HTTP origin.

The async Clipboard API requires a secure context for the rich-text path. `localhost` and `https://` qualify; `http://<lan-ip>` falls back to a hidden-textarea + `document.execCommand('copy')` legacy path automatically.

Cache-bust the JS in development by bumping the `?v=` query in [index.html](index.html), or use `http-server -c-1` to disable caching entirely.

## Folder Tree

```
docs/
├── README.md                      this file
├── index.html                     app shell + topbar + sidebar markup, loads app.js as a module
├── app.js                         dispatcher: imports + route() + init() + DOMContentLoaded boot
├── styles.css                     thin entrypoint: only @import lines for everything in css/
├── recipes.json                   pre-built manifest, generated by scripts/build-manifest.mjs
├── CNAME                          GitHub Pages custom domain configuration
├── IMAGE_CREDITS.md               attributions for recipe images sourced from Unsplash
│
├── vendor/                        third-party assets (no npm dependencies at runtime)
│   ├── fonts.css                  @font-face declarations for Source Serif 4 + Inter
│   ├── fonts/                     self-hosted woff2 font files
│   ├── marked.min.js              markdown -> HTML renderer
│   └── qrcode.min.js              QR code generator (loaded on demand)
│
├── css/                           split stylesheet, mirrors modules/ by feature
│   ├── tokens.css                 :root design tokens + dark theme overrides
│   ├── reset.css                  element reset, sr-only, skip-link, :focus-visible
│   ├── layout.css                 sidebar + main column + sidebar-collapsed override
│   ├── content.css                .content / page-header / section / .tag-filters
│   ├── cards.css                  recipe card grid + card body + tag pills
│   ├── category.css               category overview tile grid
│   ├── typography.css             markdown body baseline + [data-text-size="large"] block
│   ├── responsive.css             tablet / mobile / tiny-mobile @media overrides
│   ├── print.css                  print-mode chrome stripping + page-break hints
│   │
│   ├── nav/
│   │   ├── sidebar.css            sidebar header + search + recursive nav tree
│   │   └── topbar.css             sticky topbar + breadcrumb + hamburger + scrim
│   │
│   ├── ui/
│   │   ├── empty-state.css        plain + rich empty / loading / error blocks
│   │   ├── transitions.css        page-render fade-in animation
│   │   ├── toast.css              bottom-centre toast notification
│   │   ├── back-to-top.css        floating scroll-to-top button
│   │   ├── skeleton.css           first-paint shimmer cards
│   │   └── modal.css              generic modal scrim/dialog + mise + qr contents
│   │
│   ├── pages/
│   │   ├── search.css             search results meta line + global <mark>
│   │   └── settings.css           settings rows + toggles + clear-data button
│   │
│   └── recipe/
│       ├── detail.css             detail layout, action toolbar, action buttons, hero
│       ├── chips.css              info-chip / serves-chip / rating-chip
│       ├── markdown.css           markdown h1/h2/h3/p/ul/table/code/section-action-btn
│       ├── toc.css                desktop TOC (>= 1180px)
│       ├── actions.css            More-overflow menu + Cooked button on-state
│       ├── ingredients.css        tap-to-strike on ingredient lines
│       ├── timers.css             inline timer pills + floating timer panel
│       ├── anchors.css            Method-step h3 anchor link + :target highlight
│       ├── notes.css              personal notes textarea + status line
│       └── cooking-mode.css       full-screen cooking mode (chrome hidden, text bumped)
│
└── modules/
    ├── state.js                   singleton state object, els (DOM refs), favourite/cooked/rating mutators, setContent
    ├── storage.js                 localStorage I/O for every persisted key under the recipes: namespace
    ├── manifest.js                loadManifest, indexManifest, categoryNode, ancestors, rawUrl, flattenRecipes
    ├── routes.js                  parseRoute (hash -> route object), navigate, categoryHash/recipeHash/searchHash/collectionHash/discoverHash
    ├── theme.js                   light/dark theme, larger-text mode, sidebar collapse: init/bind/setters
    ├── meta.js                    per-route document.title + OG/Twitter/description meta tags
    ├── cards.js                   recipe cards + category tiles + featured pickers + private search-highlight helpers
    ├── tags.js                    TAG_LABELS / TAG_ORDER + tagFilterHtml chip row
    │
    ├── util/
    │   ├── dom.js                 escapeHtml, escapeAttr, escapeRegex, slugifyAnchor
    │   ├── time.js                parseToMinutes, shortFormat, formatMinutes
    │   ├── arrays.js              shuffleAndTake (Fisher-Yates), parseTagsParam
    │   └── clipboard.js           copyText / copyRich with secure-context + execCommand fallback
    │
    ├── ui/
    │   ├── modal.js               generic modal with scrim + close button + Escape handling
    │   ├── toast.js               bottom-centre toast (single instance, 2.2s)
    │   ├── skeleton.js            first-paint skeleton card grid for the home page
    │   ├── back-to-top.js         floating button visible after scrollY > 600
    │   └── empty-state.js         emptyStateHtml + 5 ICON_* SVG constants for list-page empty states
    │
    ├── nav/
    │   ├── sidebar.js             recursive category nav tree with expand/collapse
    │   ├── breadcrumb.js          topbar trail (Recipes > category > sub > leaf)
    │   ├── search.js              search input binding, syncSearchInput, Cmd/Ctrl+K shortcut
    │   └── mobile.js              hamburger drawer toggle + scrim + close handler
    │
    ├── collections.js             saved collections (Favourites + custom): list/find/add/remove/rename
    │
    ├── pages/                     one module per top-level route
    │   ├── home.js                home page: enabled section bar + category grid + 8 featured cards
    │   ├── discover.js            faceted tag picker (#/discover); chips narrow as tags are picked
    │   ├── lists.js               recent / top-rated / notes / cooked auto-populated views
    │   ├── collection.js          single-collection page (Favourites + user collections); rename / delete
    │   ├── settings.js            appearance toggles + section toggles + clear-all-data
    │   ├── category.js            category page: back, header, faceted tag filter, sub-tiles, featured, recipes
    │   ├── search.js              search results page + searchRecipes ranking
    │   ├── recipe.js              recipe page orchestrator: toolbar shell + body + enhancement passes
    │   └── not-found.js           generic Not Found block used by category + recipe routes
    │
    └── recipe/                    recipe-page features, each loaded by pages/recipe.js
        ├── markdown.js            fetchRecipeMarkdown + renderMarkdown (img/href rewriting)
        ├── ingredients.js         findIngredientItems / isIngredientsHeading shared helpers
        ├── chips.js               metadata chips (Serves +/- / Prep / Cook / 5-star Rate)
        ├── scaling.js             servings scaler + parseQuantity (used by timers too) + line rescaler
        ├── strike.js              tap-to-strike on ingredient lines
        ├── timers.js              method-step timer detection, panel, wake-lock, chime
        ├── notes.js               personal notes textarea with debounced autosave
        ├── anchors.js             Method h3 step anchors + maybeScrollToStep on ?step=
        ├── toc.js                 desktop sticky table of contents (>= 1180px)
        ├── mise.js                "mise en place" modal (chopped/diced/etc. checklist)
        ├── qr.js                  QR code modal (lazy-loads vendor/qrcode.min.js)
        ├── share.js               Shopping list button on Ingredients heading (clipboard + share sheet)
        ├── save-picker.js         Save-button dropdown: tick collections to add/remove + "+ New collection"
        ├── cooking-mode.js        full-screen cooking mode with screen wake-lock and Esc-to-exit
        └── actions.js             toolbar buttons + handlers (save/cooked/cook/copy/print/share + overflow)
```

## Architecture Notes

- `state` (in [modules/state.js](modules/state.js)) is a singleton mutable object imported by anything that needs it. There is no observable / reactivity layer; every render is a one-shot `setContent(html)` call followed by event-handler binding.
- `route()` in [app.js](app.js) is the only place that dispatches between pages. Each page module exports a single `render*()` function it calls.
- Every page render terminates in `setContent()` (see [modules/state.js](modules/state.js)), which sets `#content.innerHTML` and resets scroll position.
- The pre-paint inline script in [index.html](index.html) reads `recipes:theme` and `recipes:text-size` from `localStorage` and applies them as data attributes on `<html>` *before* CSS is parsed, so the page never flashes the wrong theme on load.
- Recipe markdown is fetched lazily and cached in `state.recipeContent` keyed by slug, so revisiting a recipe is instant.
