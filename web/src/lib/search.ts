import { Document as FlexDocument } from 'flexsearch';
import type { DocumentRecord } from '../types';

interface IndexedDoc {
  id: string;
  title: string;
  content: string;
  tags: string;
  [key: string]: string;
}

type WikiSearchIndex = FlexDocument<IndexedDoc, false>;

let index: WikiSearchIndex | null = null;

function createIndex(): WikiSearchIndex {
  return new FlexDocument<IndexedDoc, false>({
    document: {
      id: 'id',
      index: [
        { field: 'title', tokenize: 'forward' },
        { field: 'content', tokenize: 'forward' },
        { field: 'tags', tokenize: 'strict' },
      ],
    },
  });
}

function toIndexedDoc(doc: DocumentRecord): IndexedDoc {
  return { id: doc.id, title: doc.title, content: doc.content, tags: doc.tags.join(' ') };
}

export function buildSearchIndex(documents: DocumentRecord[]): void {
  index = createIndex();
  for (const doc of documents) {
    if (doc.isFolder) continue;
    index.add(toIndexedDoc(doc));
  }
}

export function updateSearchIndex(doc: DocumentRecord): void {
  if (!index || doc.isFolder) return;
  index.update(toIndexedDoc(doc));
}

export function removeFromSearchIndex(id: string): void {
  index?.remove(id);
}

export function searchDocuments(query: string): string[] {
  if (!index || !query.trim()) return [];
  const results = index.search(query, { enrich: false, limit: 50 });
  const ids = new Set<string>();
  for (const fieldResult of results) {
    for (const id of fieldResult.result) {
      ids.add(String(id));
    }
  }
  return Array.from(ids);
}
