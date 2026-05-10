// localStorage I/O for all per-user state. Every key lives under the `recipes:` namespace
// so clearAll() can wipe site state without touching unrelated keys.
//
// Each helper returns sensible defaults on parse error or when storage is unavailable
// (private mode, quota, etc.) so callers do not need their own try/catch.

export const KEYS = {
  favourites: 'recipes:favourites',
  recent: 'recipes:recent',
  theme: 'recipes:theme',
  textSize: 'recipes:text-size',
  notesPrefix: 'recipes:notes:',
  cooked: 'recipes:cooked',
  ratings: 'recipes:ratings',
  homeSections: 'recipes:home-sections',
  sidebarCollapsed: 'recipes:sidebar-collapsed',
  // User-created collections (Favourites lives in its own legacy key above).
  collections: 'recipes:collections',
  // Legacy single-week meal plan key (pre-Phase-3). Migrated to
  // planWeeks on first read; the load helpers below handle the
  // hand-off transparently.
  plan: 'recipes:plan',
  // Per-ISO-week meal plans (legacy; migrated into planDates on first
  // read of the calendar plan).
  planWeeks: 'recipes:plan-weeks',
  // Per-ISO-date meal plans: { "2026-05-14": [slug, ...], ... }.
  // The list is ordered (lunch first, dinner second by tradition, but
  // free-form for the calendar UI).
  planDates: 'recipes:plan-dates',
  // Allergen prefs: { hide: [allergen,...], highlight: bool }.
  allergens: 'recipes:allergens',
  // Wine-pairing prefs: { visible: bool }.
  wine: 'recipes:wine',
  // Side-pairing prefs: { visible: bool }.
  sides: 'recipes:sides',
  // Shopping-list ticks (set of canonical ingredient names).
  shoppingTicks: 'recipes:plan-shopping-ticks',
};

export const RECENT_LIMIT = 12;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch { return fallback; }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function readString(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeString(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

export const favourites = {
  load() {
    const arr = readJSON(KEYS.favourites, []);
    return new Set(Array.isArray(arr) ? arr : []);
  },
  save(set) {
    writeJSON(KEYS.favourites, [...set]);
  },
};

export const recent = {
  load() {
    const arr = readJSON(KEYS.recent, []);
    return Array.isArray(arr) ? arr.slice(0, RECENT_LIMIT) : [];
  },
  save(arr) {
    writeJSON(KEYS.recent, arr);
  },
};

export const ratings = {
  load() {
    const map = readJSON(KEYS.ratings, {});
    return map && typeof map === 'object' ? map : {};
  },
  save(map) {
    writeJSON(KEYS.ratings, map);
  },
};

export const cooked = {
  load() {
    const map = readJSON(KEYS.cooked, {});
    return map && typeof map === 'object' ? map : {};
  },
  save(map) {
    writeJSON(KEYS.cooked, map);
  },
};

export const notes = {
  get(slug) {
    return readString(KEYS.notesPrefix + slug) || '';
  },
  set(slug, value) {
    writeString(KEYS.notesPrefix + slug, value);
  },
  remove(slug) {
    try { localStorage.removeItem(KEYS.notesPrefix + slug); } catch {}
  },
  // Walk localStorage and return the set of slugs that have non-empty notes.
  allSlugs() {
    const set = new Set();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(KEYS.notesPrefix)) {
          const value = localStorage.getItem(key);
          if (value && value.trim()) set.add(key.slice(KEYS.notesPrefix.length));
        }
      }
    } catch {}
    return set;
  },
};

export const theme = {
  load() { return readString(KEYS.theme); },
  save(value) { writeString(KEYS.theme, value); },
};

export const textSize = {
  load() { return readString(KEYS.textSize); },
  save(value) { writeString(KEYS.textSize, value); },
};

export const sidebarCollapsed = {
  load() { return readString(KEYS.sidebarCollapsed) === '1'; },
  save(collapsed) { writeString(KEYS.sidebarCollapsed, collapsed ? '1' : '0'); },
};

// User-created collections. Each entry: { id, name, slugs: [...] }.
// The built-in Favourites collection lives in `recipes:favourites` (KEYS.favourites)
// for backward compatibility, so it is NOT stored here.
export const collections = {
  load() {
    const arr = readJSON(KEYS.collections, []);
    return Array.isArray(arr) ? arr : [];
  },
  save(arr) {
    writeJSON(KEYS.collections, arr);
  },
};

export const plan = {
  load() {
    const obj = readJSON(KEYS.plan, {});
    return obj && typeof obj === 'object' ? obj : {};
  },
  save(obj) {
    writeJSON(KEYS.plan, obj);
  },
};

// Per-ISO-date meal plans. Each date holds an ordered array of recipe
// slugs. Writes go through here; the calendar plan page is the main
// reader. A year of full daily plans is still well under localStorage
// limits.
export const planDates = {
  load() {
    const obj = readJSON(KEYS.planDates, {});
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  },
  save(obj) {
    writeJSON(KEYS.planDates, obj);
  },
  loadDate(iso) {
    const all = this.load();
    return Array.isArray(all[iso]) ? all[iso] : [];
  },
  saveDate(iso, list) {
    const all = this.load();
    if (!list || !list.length) {
      delete all[iso];
    } else {
      all[iso] = list;
    }
    this.save(all);
  },
};

// Per-ISO-week meal plans (legacy). Reads still work for migration;
// nothing in the live UI calls saveWeek anymore.
export const planWeeks = {
  load() {
    const obj = readJSON(KEYS.planWeeks, {});
    return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
  },
  save(obj) {
    writeJSON(KEYS.planWeeks, obj);
  },
  loadWeek(iso) {
    const all = this.load();
    return all[iso] && typeof all[iso] === 'object' ? all[iso] : null;
  },
  saveWeek(iso, weekShape) {
    const all = this.load();
    all[iso] = weekShape;
    this.save(all);
  },
  removeWeek(iso) {
    const all = this.load();
    if (iso in all) {
      delete all[iso];
      this.save(all);
    }
  },
};

// Wine-pairing visibility. Defaults to true so new users see the pairings
// the build emitted; the user can hide them from Settings.
export const wine = {
  load() {
    const obj = readJSON(KEYS.wine, null);
    if (!obj || typeof obj !== 'object') return { visible: true };
    return { visible: obj.visible !== false };
  },
  save(obj) {
    writeJSON(KEYS.wine, { visible: !!obj.visible });
  },
};

// Shopping-list tick state. Stored as a set of canonical ingredient
// names (the same names planned recipes' ingredientNames carry). The
// plan page strikes through ticked items; "Reset" clears them.
export const shoppingTicks = {
  load() {
    const arr = readJSON(KEYS.shoppingTicks, []);
    return new Set(Array.isArray(arr) ? arr : []);
  },
  save(set) {
    writeJSON(KEYS.shoppingTicks, [...(set || [])]);
  },
};

// Side-pairing visibility. Same shape as wine; defaults to visible.
export const sides = {
  load() {
    const obj = readJSON(KEYS.sides, null);
    if (!obj || typeof obj !== 'object') return { visible: true };
    return { visible: obj.visible !== false };
  },
  save(obj) {
    writeJSON(KEYS.sides, { visible: !!obj.visible });
  },
};

// Allergen prefs. `hide` is the set of allergens whose recipes should be
// excluded from list pages; `highlight` toggles the inline mark on the
// recipe page. Highlight defaults ON so new users see the per-recipe
// "Contains" footnote and bolded ingredient words without opting in;
// hide defaults empty so we never silently filter recipes by surprise.
export const allergens = {
  load() {
    const obj = readJSON(KEYS.allergens, null);
    if (!obj || typeof obj !== 'object') return { hide: [], highlight: true };
    return {
      hide: Array.isArray(obj.hide) ? obj.hide : [],
      highlight: obj.highlight !== false,
    };
  },
  save(obj) {
    writeJSON(KEYS.allergens, {
      hide: Array.isArray(obj.hide) ? obj.hide : [],
      highlight: obj.highlight !== false,
    });
  },
};

export const homeSections = {
  // Returns null when nothing is stored, so callers can apply their own defaults.
  load() {
    try {
      const raw = localStorage.getItem(KEYS.homeSections);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return null; }
  },
  save(set) {
    writeJSON(KEYS.homeSections, [...set]);
  },
};

// Wipes every key under the `recipes:` namespace. Used by Settings → Clear all data.
export function clearAll() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('recipes:')) keys.push(k);
    }
    keys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
  } catch {}
}
