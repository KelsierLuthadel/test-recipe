# Recipes

An open source recipe collection dedicated to sharing a wide range of dishes from around the world. This repository brings together recipes from diverse cuisines, organized into clearly defined categories such as appetizers, main courses, sides, desserts, breads, and sauces. Each recipe follows a consistent and straightforward format to support ease of use and accessibility.

### Purpose of Open Source Recipes

Open access to recipes provides several key benefits:

**Knowledge Sharing**  
Recipes represent cultural knowledge that can be made widely accessible. Open sourcing enables individuals to explore and learn about different cuisines regardless of location.

**Community Collaboration**  
An open repository allows contributors to refine and improve recipes over time. Suggestions, adaptations, and shared techniques help enhance quality and accommodate a variety of dietary needs.

**Preservation of Traditions**  
Documenting recipes in a shared space helps preserve culinary practices that might otherwise be lost, ensuring they remain available for future generations.

**Accessibility and Inclusion**  
Standardized formatting and clear instructions support a broad range of users, including beginners and those with specific accessibility needs.

**Innovation and Creativity**  
Open recipes provide a foundation for experimentation. They can be adapted, combined, or reinterpreted to inspire new dishes and approaches to cooking.

**Educational Value**  
Recipes offer insight into cultural practices, nutrition, and scientific principles. Open access ensures these learning opportunities are available to all.

**Sustainability**  
Sharing knowledge about ingredient use and meal preparation can support more efficient cooking practices and help reduce food waste.

This repository reflects the principles of open collaboration, inclusivity, and shared learning, with the goal of making culinary knowledge widely available.

## Web App

A browseable companion site lives in [docs/](docs/) and is published via GitHub Pages. It reads the markdown recipes in this repository and renders them as a fast, mobile-friendly UI.

### Overview

The site is a static, single-page app written as native ES modules. There is no build step for the JavaScript or CSS, no framework, and no `npm install` needed to run it. The category tree, search index, and recipe metadata are pre-built from the markdown files into a single [docs/recipes.json](docs/recipes.json) manifest by [scripts/build-manifest.mjs](scripts/build-manifest.mjs); recipe bodies are fetched on demand from the raw GitHub URL.

### Features

- Hash-based routing across home, category, recipe, search, favourites, recently viewed, top-rated, notes, cooked, and settings pages.
- Search across title, overview, ingredients and category path with snippet highlighting, debounced typing, and `Cmd`/`Ctrl + K` focus shortcut.
- Per-recipe: serves scaler with quantity rescaling (handles unicode fractions), tap-to-strike ingredients, mise en place modal, QR code, cooking mode with a screen wake-lock, method-step timer chips with chime + vibration, table of contents (desktop), copyable step anchors, personal notes textarea (autosaved), shopping-list export.
- Tag filters (vegetarian / quick / spicy) and 0-5 star ratings.
- Light / dark theme, larger-text mode, and home-section toggles, all saved in `localStorage`.
- Skeleton loader, toast notifications, back-to-top button, mobile hamburger drawer, collapsible desktop sidebar.
- OG / Twitter / description meta tags updated per route for clean link previews.

### Dependencies

**Vendored** (in [docs/vendor/](docs/vendor/)):

- [marked](https://github.com/markedjs/marked) for markdown -> HTML rendering.
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) for the QR code modal (loaded lazily).
- Source Serif 4 + Inter fonts as self-hosted woff2.

**Build / test tooling** (Node):

- [scripts/build-manifest.mjs](scripts/build-manifest.mjs) generates [docs/recipes.json](docs/recipes.json) from the markdown tree.
- Unit tests under [tests/](tests/) run via Node's built-in `node --test` runner. No external test dependencies.

### Running Locally

```sh
# rebuild the manifest after adding or editing recipes
npm run build

# run the unit tests
npm test

# serve the site (Python)
cd docs && python -m http.server 8000

# or serve the site (Node, no install)
cd docs && npx --yes http-server -p 8000 -c-1
```

Open http://localhost:8000 in a browser. The site uses `localStorage` and the async Clipboard API, so for clipboard-related features (Copy recipe, Share, Shopping list) a secure context is required: `localhost` and `https://` both qualify, but `http://<lan-ip>` does not.

For more detail on the directory layout and per-file purposes, see [docs/README.md](docs/README.md).

## Types of Recipes

The collection spans many culinary traditions, including:

- **Appetizers and Starters**: Perfect for kicking off a meal, like [Chicken Satay](cuisine/thai/starters/chicken-satay.md) or [Falafel](appetizer/falafel.md).
- **Main Courses**: Hearty dishes from around the globe, such as [Butter Chicken](cuisine/indian/Meals/butter-chicken.md) from India, [Pad Thai](cuisine/thai/stir-fries/pad-thai.md) from Thailand, or [Beef Pho](soup/beef-pho.md) with Vietnamese inspiration.
- **Sides and Accompaniments**: Great additions to any meal, like [Bombay Potatoes](sides/bombay-potato.md) or [Caesar Salad](salad/caesar-salad.md).
- **Desserts and Sweets**: Sweet treats to end on a high note, such as [Chocolate Roulade](desert/chocolate/chocolate-roulade.md) or [Tiramisu](desert/creamy/tiramisu.md).
- **Breads and Pastries**: Baking adventures including [Brioches](bread-pasta/brioches.md) and [Croissant Dough](baking/pastry/croissant-dough.md).
- **Sauces and Bases**: Essential building blocks like [Tomato Sauce](sauces/sauce-savory/tomato-sauce.md) or [Curry Base](base-ingredients/curry-paste/curry-base.md).
- **Soups and Stews**: Cozy comfort food options like [French Onion Soup](soup/french-onion-soup.md) or [Tom Yum Gai](cuisine/thai/soup/tom-yum-gai-soup.md).

All recipes draw from authentic traditions but are adapted for home cooking, with straightforward instructions and ingredient lists.

## Recipe Template Format

To keep things consistent and easy to read, all of the recipes follow a simple markdown template. If you're thinking of adding a new recipe, here's the format to use:

```
# Recipe Title

**Serves:** Number of servings

**Prep time:** Preparation time (e.g., 15 mins)

**Cooking time:** Cooking time (e.g., 30 mins)

## Overview
A short description of the dish, its background, and any special notes.

## Ingredients
### Category (e.g., Protein, Vegetables, Seasonings)
- Ingredient 1 (quantity)
- Ingredient 2 (quantity)

## Method
### Stage 1: Description
1. Step-by-step instructions.
1. Continue with numbered steps.

### Stage 2: Next phase
1. More steps.

## Notes
Any extra tips, variations, or warnings.

## Serving
How to serve the dish.

## Storage
How to store leftovers and how long they last.
```

This setup makes recipes super easy to follow. Ingredients are grouped nicely, methods are broken into clear stages, and every section gives you all the info you need.

## Contributing

 If you have a recipe to share:

1. Make sure it follows the template above.
2. Put it in the right category folder (or create a new one if needed).
3. Try the recipe yourself and include accurate times and serving sizes.
4. Send a pull request with a clear description.

Got questions or ideas? Just open an issue. Let's cook up something amazing together!



