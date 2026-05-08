// Array / collection helpers.

// Fisher-Yates shuffle, returns a new array of the first `n` elements. The input
// array is not mutated.
export function shuffleAndTake(arr, n) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

// Parse a comma-separated tag query parameter (e.g. "vegetarian,quick") into a
// trimmed array, dropping empty entries.
export function parseTagsParam(s) {
  if (!s) return [];
  return s.split(',').map(t => t.trim()).filter(Boolean);
}
