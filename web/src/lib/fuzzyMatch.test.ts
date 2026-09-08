import { describe, expect, it } from 'vitest';
import { fuzzyFilterAndSort, fuzzyMatch } from './fuzzyMatch';

describe('fuzzyMatch', () => {
  it('matches an empty query against anything', () => {
    expect(fuzzyMatch('', 'Wiki Home').matched).toBe(true);
  });

  it('matches a contiguous substring', () => {
    expect(fuzzyMatch('wiki', 'Wiki Home').matched).toBe(true);
  });

  it('matches a scattered subsequence, case-insensitively', () => {
    expect(fuzzyMatch('wh', 'Wiki Home').matched).toBe(true);
  });

  it('does not match when a query character is missing from the target', () => {
    expect(fuzzyMatch('wz', 'Wiki Home').matched).toBe(false);
  });

  it('does not match out-of-order characters', () => {
    expect(fuzzyMatch('hw', 'Wiki Home').matched).toBe(false);
  });

  it('scores a contiguous prefix match higher than a scattered match', () => {
    const prefix = fuzzyMatch('wiki', 'Wiki Home');
    const scattered = fuzzyMatch('wiki', 'Write-up: Kickoff');
    expect(prefix.matched).toBe(true);
    expect(scattered.matched).toBe(true);
    expect(prefix.score).toBeGreaterThan(scattered.score);
  });

  it('scores an earlier match higher than the same text appearing later', () => {
    const early = fuzzyMatch('wiki', 'Wiki notes and more Wiki stuff');
    const late = fuzzyMatch('wiki', 'Some long preamble before the word wiki shows up');
    expect(early.score).toBeGreaterThan(late.score);
  });
});

describe('fuzzyFilterAndSort', () => {
  const titles = ['Wiki Home', 'Write-up: Kickoff', 'Grocery List', 'Home Renovation Wiki'];

  it('drops items that do not match', () => {
    const results = fuzzyFilterAndSort('wiki', titles, (t) => t);
    expect(results).not.toContain('Grocery List');
  });

  it('ranks a tighter/earlier match first', () => {
    const results = fuzzyFilterAndSort('wiki', titles, (t) => t);
    expect(results[0]).toBe('Wiki Home');
  });

  it('respects the limit', () => {
    const results = fuzzyFilterAndSort('', titles, (t) => t, 2);
    expect(results).toHaveLength(2);
  });

  it('returns everything, unfiltered order, for an empty query with no limit', () => {
    const results = fuzzyFilterAndSort('', titles, (t) => t);
    expect(results).toEqual(titles);
  });
});
