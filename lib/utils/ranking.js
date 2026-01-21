/**
 * Rank items with support for ties
 * Items with the same score get the same rank
 *
 * @param {Array} items - Array of objects to rank
 * @param {string} scoreKey - Key to use for scoring (default: "score")
 * @returns {Array} - Sorted array with rank property added
 */
export function rankWithTies(items, scoreKey = "score") {
  const sorted = items.slice().sort((a, b) => (b[scoreKey] || 0) - (a[scoreKey] || 0));
  let lastScore = null, lastRank = 0, seen = 0;
  return sorted.map((it) => {
    seen += 1;
    const sc = it[scoreKey] || 0;
    const rank = (lastScore === sc) ? lastRank : seen;
    lastScore = sc;
    lastRank = rank;
    return { ...it, rank };
  });
}
