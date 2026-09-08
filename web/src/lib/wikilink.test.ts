import { describe, expect, it } from 'vitest';
import { extractWikiLinkTargets, findWikiLinks, renameWikiLinksInContent } from './wikilink';

describe('findWikiLinks', () => {
  it('finds a simple link', () => {
    const matches = findWikiLinks('See [[Wiki Home]] for details.');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ target: 'Wiki Home', label: 'Wiki Home' });
  });

  it('finds an aliased link and keeps the alias as the label', () => {
    const matches = findWikiLinks('See [[Wiki Home|the home page]] for details.');
    expect(matches[0]).toMatchObject({ target: 'Wiki Home', label: 'the home page' });
  });

  it('finds multiple links in the same text', () => {
    const matches = findWikiLinks('[[A]] and [[B]]');
    expect(matches.map((m) => m.target)).toEqual(['A', 'B']);
  });

  it('returns an empty array when there are no links', () => {
    expect(findWikiLinks('no links here')).toEqual([]);
  });
});

describe('extractWikiLinkTargets', () => {
  it('deduplicates repeated targets', () => {
    const targets = extractWikiLinkTargets('[[A]] and again [[A]], plus [[B]]');
    expect(targets).toEqual(['A', 'B']);
  });
});

describe('renameWikiLinksInContent', () => {
  it('renames a matching link, case-insensitively', () => {
    const out = renameWikiLinksInContent('See [[wiki home]] please', 'Wiki Home', 'Wiki Landing');
    expect(out).toBe('See [[Wiki Landing]] please');
  });

  it('preserves an alias when renaming the target', () => {
    const out = renameWikiLinksInContent('[[Wiki Home|home]]', 'Wiki Home', 'Wiki Landing');
    expect(out).toBe('[[Wiki Landing|home]]');
  });

  it('leaves non-matching links untouched', () => {
    const out = renameWikiLinksInContent('[[Other Page]]', 'Wiki Home', 'Wiki Landing');
    expect(out).toBe('[[Other Page]]');
  });
});
