import Dexie, { type Table } from 'dexie';
import type { DocumentRecord, LinkRecord } from '../types';

export interface SettingRecord {
  key: string;
  value: unknown;
}

export class WikiDatabase extends Dexie {
  documents!: Table<DocumentRecord, string>;
  links!: Table<LinkRecord, [string, string]>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super('offline-markdown-wiki');
    this.version(1).stores({
      documents: 'id, path, sortIndex, *tags',
      links: '[sourceId+targetPath], targetId',
    });
    // v2: adds `settings`, a small key/value table — currently used to remember the
    // FileSystemDirectoryHandle a user connected (see src/lib/localFolder.ts). Handles are
    // structured-clonable, so IndexedDB can store them directly.
    this.version(2).stores({
      documents: 'id, path, sortIndex, *tags',
      links: '[sourceId+targetPath], targetId',
      settings: 'key',
    });
  }
}

export const db = new WikiDatabase();
