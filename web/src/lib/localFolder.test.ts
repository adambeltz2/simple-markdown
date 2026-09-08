import { describe, expect, it } from 'vitest';
import {
  mirrorDeleteFromFolder,
  mirrorWriteToFolder,
  scanMarkdownFiles,
  type MinimalDirectoryHandle,
  type MinimalFileHandle,
} from './localFolder';

/**
 * A minimal in-memory fake of the File System Access API, implementing just the surface
 * localFolder.ts uses (MinimalDirectoryHandle / MinimalFileHandle). Lets the filesystem-facing
 * logic be exercised without a real browser.
 */
class FakeFile implements MinimalFileHandle {
  readonly kind = 'file' as const;
  name: string;
  content: string;

  constructor(name: string, content = '') {
    this.name = name;
    this.content = content;
  }

  async getFile() {
    return { text: async () => this.content };
  }

  async createWritable() {
    let pending = '';
    return {
      write: async (data: string) => {
        pending = data;
      },
      close: async () => {
        this.content = pending;
      },
    };
  }
}

class FakeDirectory implements MinimalDirectoryHandle {
  readonly kind = 'directory' as const;
  name: string;
  children = new Map<string, FakeFile | FakeDirectory>();

  constructor(name: string) {
    this.name = name;
  }

  async *entries(): AsyncIterableIterator<[string, MinimalFileHandle | MinimalDirectoryHandle]> {
    for (const [name, handle] of this.children) yield [name, handle];
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MinimalDirectoryHandle> {
    const existing = this.children.get(name);
    if (existing) {
      if (existing.kind !== 'directory') throw new Error(`${name} is a file, not a directory`);
      return existing;
    }
    if (!options?.create) throw new Error(`Directory not found: ${name}`);
    const dir = new FakeDirectory(name);
    this.children.set(name, dir);
    return dir;
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MinimalFileHandle> {
    const existing = this.children.get(name);
    if (existing) {
      if (existing.kind !== 'file') throw new Error(`${name} is a directory, not a file`);
      return existing;
    }
    if (!options?.create) throw new Error(`File not found: ${name}`);
    const file = new FakeFile(name);
    this.children.set(name, file);
    return file;
  }

  async removeEntry(name: string): Promise<void> {
    this.children.delete(name);
  }
}

describe('scanMarkdownFiles', () => {
  it('reads .md files at the root', async () => {
    const root = new FakeDirectory('root');
    root.children.set('Home.md', new FakeFile('Home.md', '# Home'));

    const entries = await scanMarkdownFiles(root);

    expect(entries).toEqual([{ path: '/Home.md', isFolder: false, content: '# Home' }]);
  });

  it('ignores non-markdown files', async () => {
    const root = new FakeDirectory('root');
    root.children.set('notes.txt', new FakeFile('notes.txt', 'ignored'));

    expect(await scanMarkdownFiles(root)).toEqual([]);
  });

  it('recurses into subfolders, emitting a folder entry plus its files', async () => {
    const root = new FakeDirectory('root');
    const projects = new FakeDirectory('Projects');
    projects.children.set('Wiki.md', new FakeFile('Wiki.md', 'content'));
    root.children.set('Projects', projects);

    const entries = await scanMarkdownFiles(root);

    expect(entries).toEqual([
      { path: '/Projects', isFolder: true, content: '' },
      { path: '/Projects/Wiki.md', isFolder: false, content: 'content' },
    ]);
  });

  it('emits an entry for an empty subfolder', async () => {
    const root = new FakeDirectory('root');
    root.children.set('Empty', new FakeDirectory('Empty'));

    expect(await scanMarkdownFiles(root)).toEqual([{ path: '/Empty', isFolder: true, content: '' }]);
  });
});

describe('mirrorWriteToFolder', () => {
  it('creates a file at the root', async () => {
    const root = new FakeDirectory('root');

    await mirrorWriteToFolder(root, { path: '/Note.md', isFolder: false, content: 'hello', tags: [], properties: {} });

    const file = root.children.get('Note.md');
    expect(file?.kind).toBe('file');
    expect((file as FakeFile).content).toBe('hello');
  });

  it('creates missing parent folders on the way to a nested file', async () => {
    const root = new FakeDirectory('root');

    await mirrorWriteToFolder(root, {
      path: '/Projects/Sub/Note.md',
      isFolder: false,
      content: 'nested',
      tags: [],
      properties: {},
    });

    const projects = root.children.get('Projects') as FakeDirectory;
    const sub = projects.children.get('Sub') as FakeDirectory;
    const file = sub.children.get('Note.md') as FakeFile;
    expect(file.content).toBe('nested');
  });

  it('overwrites an existing file rather than duplicating it', async () => {
    const root = new FakeDirectory('root');
    root.children.set('Note.md', new FakeFile('Note.md', 'old'));

    await mirrorWriteToFolder(root, { path: '/Note.md', isFolder: false, content: 'new', tags: [], properties: {} });

    expect(root.children.size).toBe(1);
    expect((root.children.get('Note.md') as FakeFile).content).toBe('new');
  });

  it('serializes tags/properties as frontmatter', async () => {
    const root = new FakeDirectory('root');

    await mirrorWriteToFolder(root, {
      path: '/Note.md',
      isFolder: false,
      content: 'body',
      tags: ['a'],
      properties: { author: 'Ada' },
    });

    const content = (root.children.get('Note.md') as FakeFile).content;
    expect(content).toContain('body');
    expect(content).toContain('---');
  });

  it('creates a real (sub)folder for a folder document', async () => {
    const root = new FakeDirectory('root');

    await mirrorWriteToFolder(root, { path: '/Projects', isFolder: true, content: '', tags: [], properties: {} });

    expect(root.children.get('Projects')?.kind).toBe('directory');
  });
});

describe('mirrorDeleteFromFolder', () => {
  it('removes a file', async () => {
    const root = new FakeDirectory('root');
    root.children.set('Note.md', new FakeFile('Note.md'));

    await mirrorDeleteFromFolder(root, '/Note.md');

    expect(root.children.has('Note.md')).toBe(false);
  });

  it('removes a nested file without touching siblings', async () => {
    const root = new FakeDirectory('root');
    const projects = new FakeDirectory('Projects');
    projects.children.set('A.md', new FakeFile('A.md'));
    projects.children.set('B.md', new FakeFile('B.md'));
    root.children.set('Projects', projects);

    await mirrorDeleteFromFolder(root, '/Projects/A.md');

    expect(projects.children.has('A.md')).toBe(false);
    expect(projects.children.has('B.md')).toBe(true);
  });

  it('silently no-ops when the path is already gone', async () => {
    const root = new FakeDirectory('root');
    await expect(mirrorDeleteFromFolder(root, '/Never/Existed.md')).resolves.toBeUndefined();
  });
});
