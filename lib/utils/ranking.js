/**
 * Rank items with support for ties
 * Items with the same score get the same rank
 *
 * @param {Array} items - Array of objects to rank
 * @param {string} scoreKey - Key to use for scoring (default: "score")
 * @returns {Array} - Sorted array with rank property added
 */
export function rankWithTies(items, scoreKey = "score") {
  const sorted = items.slice()
    .map(it => ({ ...it, [scoreKey]: Math.max(0, it[scoreKey] || 0) }))
    .sort((a, b) => b[scoreKey] - a[scoreKey]);
  let lastScore = null, lastRank = 0, seen = 0;
  return sorted.map((it) => {
    seen += 1;
    const rank = (lastScore === it[scoreKey]) ? lastRank : seen;
    lastScore = it[scoreKey];
    lastRank = rank;
    return { ...it, rank };
  });
}
