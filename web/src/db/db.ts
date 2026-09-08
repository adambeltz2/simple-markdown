import Dexie, { type Table } from 'dexie';
import type { DocumentRecord, LinkRecord } from '../types';

export class WikiDatabase extends Dexie {
  documents!: Table<DocumentRecord, string>;
  links!: Table<LinkRecord, [string, string]>;

  constructor() {
    super('offline-markdown-wiki');
    this.version(1).stores({
      documents: 'id, path, sortIndex, *tags',
      links: '[sourceId+targetPath], targetId',
    });
  }
}

export const db = new WikiDatabase();
