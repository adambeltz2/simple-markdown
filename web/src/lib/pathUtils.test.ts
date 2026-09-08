import { describe, expect, it } from 'vitest';
import type { DocumentRecord } from '../types';
import { basename, buildTree, dirname, isDescendantPath, joinPath, titleFromPath } from './pathUtils';

describe('dirname', () => {
  it('returns the parent folder path', () => {
    expect(dirname('/Projects/Wiki.md')).toBe('/Projects');
  });

  it('returns "/" for a top-level path', () => {
    expect(dirname('/Wiki.md')).toBe('/');
  });
});

describe('basename', () => {
  it('returns the last path segment', () => {
    expect(basename('/Projects/Wiki.md')).toBe('Wiki.md');
  });

  it('returns the whole string when there is no slash', () => {
    expect(basename('Wiki.md')).toBe('Wiki.md');
  });
});

describe('titleFromPath', () => {
  it('strips the folder and the .md extension', () => {
    expect(titleFromPath('/Projects/Wiki.md')).toBe('Wiki');
  });

  it('is case-insensitive about the extension', () => {
    expect(titleFromPath('/Notes.MD')).toBe('Notes');
  });
});

describe('joinPath', () => {
  it('joins onto the root folder', () => {
    expect(joinPath('/', 'Wiki.md')).toBe('/Wiki.md');
  });

  it('joins onto a nested folder', () => {
    expect(joinPath('/Projects', 'Wiki.md')).toBe('/Projects/Wiki.md');
  });
});

describe('isDescendantPath', () => {
  it('is true for the folder itself', () => {
    expect(isDescendantPath('/Projects', '/Projects')).toBe(true);
  });

  it('is true for a nested child', () => {
    expect(isDescendantPath('/Projects/Wiki.md', '/Projects')).toBe(true);
  });

  it('is false for a sibling with a shared prefix', () => {
    expect(isDescendantPath('/Projects2/Wiki.md', '/Projects')).toBe(false);
  });
});

describe('buildTree', () => {
  function doc(overrides: Partial<DocumentRecord>): DocumentRecord {
    return {
      id: overrides.path ?? 'id',
      path: '/',
      title: '',
      isFolder: false,
      content: '',
      tags: [],
      properties: {},
      sortIndex: 0,
      createdAt: 0,
      updatedAt: 0,
      ...overrides,
    };
  }

  it('nests documents under their parent folder', () => {
    const docs = [
      doc({ path: '/Projects', isFolder: true, sortIndex: 0 }),
      doc({ path: '/Projects/Wiki.md', sortIndex: 0 }),
      doc({ path: '/Standalone.md', sortIndex: 1 }),
    ];

    const tree = buildTree(docs);

    expect(tree.map((n) => n.path)).toEqual(['/Projects', '/Standalone.md']);
    expect(tree[0].children.map((n) => n.path)).toEqual(['/Projects/Wiki.md']);
  });

  it('sorts siblings by sortIndex, recursively', () => {
    const docs = [
      doc({ path: '/B.md', sortIndex: 1 }),
      doc({ path: '/A.md', sortIndex: 0 }),
    ];

    const tree = buildTree(docs);

    expect(tree.map((n) => n.path)).toEqual(['/A.md', '/B.md']);
  });

  it('treats a document whose parent is missing (or not a folder) as a root', () => {
    const docs = [doc({ path: '/Orphan/Note.md', sortIndex: 0 })];

    const tree = buildTree(docs);

    expect(tree.map((n) => n.path)).toEqual(['/Orphan/Note.md']);
  });
});
