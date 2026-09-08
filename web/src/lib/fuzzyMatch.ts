/**
 * Subsequence fuzzy matching for the [[wiki-link]] autocomplete: every character of the query
 * must appear in the target, in order, but not necessarily contiguously. Ranks by how tight and
 * how early the match is, so "wiki" scores "Wiki Home" above "Write-up: Kickoff".
 */
export interface FuzzyMatchResult {
  matched: boolean;
  score: number;
}

export function fuzzyMatch(query: string, target: string): FuzzyMatchResult {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (q.length === 0) return { matched: true, score: 0 };

  let queryIndex = 0;
  let score = 0;
  let previousMatchIndex = -1;
  let consecutiveRun = 0;

  for (let targetIndex = 0; targetIndex < t.length && queryIndex < q.length; targetIndex++) {
    if (t[targetIndex] !== q[queryIndex]) continue;

    const isConsecutive = previousMatchIndex === targetIndex - 1;
    consecutiveRun = isConsecutive ? consecutiveRun + 1 : 1;

    // Consecutive runs score more than the same characters scattered apart, and an earlier
    // match position (closer to the start of the target) scores more than a later one.
    score += 10 + consecutiveRun * 5 - Math.min(targetIndex, 20);

    previousMatchIndex = targetIndex;
    queryIndex++;
  }

  if (queryIndex < q.length) return { matched: false, score: -Infinity };

  // An exact prefix match is the strongest possible signal.
  if (t.startsWith(q)) score += 100;

  return { matched: true, score };
}

export function fuzzyFilterAndSort<T>(query: string, items: T[], getText: (item: T) => string, limit?: number): T[] {
  const scored = items
    .map((item) => ({ item, result: fuzzyMatch(query, getText(item)) }))
    .filter(({ result }) => result.matched)
    .sort((a, b) => b.result.score - a.result.score)
    .map(({ item }) => item);

  return limit === undefined ? scored : scored.slice(0, limit);
}
