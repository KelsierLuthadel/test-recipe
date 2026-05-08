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
