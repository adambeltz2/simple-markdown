import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { DocumentRecord } from '../types';
import { basename, dirname, isDescendantPath, joinPath, titleFromPath } from '../lib/pathUtils';
import { renameWikiLinksInContent } from '../lib/wikilink';
import { refreshAllLinkResolutions, syncLinksForDocument } from './links';
import { removeFromSearchIndex, updateSearchIndex } from '../lib/search';

async function nextSortIndex(parentPath: string): Promise<number> {
  const siblings = await db.documents.filter((d) => dirname(d.path) === parentPath).toArray();
  return siblings.reduce((max, d) => Math.max(max, d.sortIndex), -1) + 1;
}

function uniquePath(parentPath: string, desiredName: string, existingPaths: Set<string>): string {
  let candidate = joinPath(parentPath, desiredName);
  if (!existingPaths.has(candidate)) return candidate;

  const dotIndex = desiredName.lastIndexOf('.');
  const base = dotIndex > 0 ? desiredName.slice(0, dotIndex) : desiredName;
  const ext = dotIndex > 0 ? desiredName.slice(dotIndex) : '';
  let counter = 2;
  do {
    candidate = joinPath(parentPath, `${base} ${counter}${ext}`);
    counter += 1;
  } while (existingPaths.has(candidate));
  return candidate;
}

export async function createDocument(parentPath: string, name: string, isFolder: boolean): Promise<DocumentRecord> {
  const existing = await db.documents.toArray();
  const existingPaths = new Set(existing.map((d) => d.path));
  const filename = isFolder || name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
  const path = uniquePath(parentPath, filename, existingPaths);
  const now = Date.now();
  const doc: DocumentRecord = {
    id: uuidv4(),
    path,
    title: titleFromPath(path),
    isFolder,
    content: '',
    tags: [],
    properties: {},
    sortIndex: await nextSortIndex(parentPath),
    createdAt: now,
    updatedAt: now,
  };
  await db.documents.put(doc);
  updateSearchIndex(doc);
  void refreshAllLinkResolutions();
  return doc;
}

export async function updateDocumentContent(id: string, content: string): Promise<void> {
  await db.documents.update(id, { content, updatedAt: Date.now() });
  const doc = await db.documents.get(id);
  if (doc) updateSearchIndex(doc);
  void syncLinksForDocument(id, content);
}

export async function updateDocumentMetadata(
  id: string,
  changes: { tags?: string[]; properties?: Record<string, string> },
): Promise<void> {
  await db.documents.update(id, { ...changes, updatedAt: Date.now() });
  const doc = await db.documents.get(id);
  if (doc) updateSearchIndex(doc);
}

async function refactorWikiLinksAfterRename(oldTitle: string, newTitle: string): Promise<void> {
  const allDocs = await db.documents.toArray();
  for (const doc of allDocs) {
    if (doc.isFolder) continue;
    const updated = renameWikiLinksInContent(doc.content, oldTitle, newTitle);
    if (updated !== doc.content) {
      await db.documents.update(doc.id, { content: updated, updatedAt: Date.now() });
      const refreshed = await db.documents.get(doc.id);
      if (refreshed) updateSearchIndex(refreshed);
      void syncLinksForDocument(doc.id, updated);
    }
  }
}

export async function renameDocument(id: string, newName: string): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  const oldTitle = titleFromPath(doc.path);
  const parentPath = dirname(doc.path);
  const existing = await db.documents.toArray();
  const existingPaths = new Set(existing.filter((d) => d.id !== id).map((d) => d.path));
  const filename = doc.isFolder || newName.toLowerCase().endsWith('.md') ? newName : `${newName}.md`;
  const newPath = uniquePath(parentPath, filename, existingPaths);
  const newTitle = titleFromPath(newPath);

  await db.transaction('rw', db.documents, async () => {
    await db.documents.update(id, { path: newPath, title: newTitle, updatedAt: Date.now() });
    if (doc.isFolder) {
      const descendants = existing.filter((d) => d.id !== id && isDescendantPath(d.path, doc.path));
      for (const descendant of descendants) {
        const rest = descendant.path.slice(doc.path.length);
        await db.documents.update(descendant.id, { path: `${newPath}${rest}` });
      }
    }
  });

  const renamed = await db.documents.get(id);
  if (renamed) updateSearchIndex(renamed);

  if (!doc.isFolder && oldTitle.toLowerCase() !== newTitle.toLowerCase()) {
    void refactorWikiLinksAfterRename(oldTitle, newTitle);
  }
  void refreshAllLinkResolutions();
}

export async function moveDocument(id: string, newParentPath: string): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  if (dirname(doc.path) === newParentPath) return;
  if (doc.isFolder && isDescendantPath(newParentPath, doc.path)) return;

  const name = basename(doc.path);
  const existing = await db.documents.toArray();
  const existingPaths = new Set(existing.filter((d) => d.id !== id).map((d) => d.path));
  const newPath = uniquePath(newParentPath, name, existingPaths);
  const newSortIndex = await nextSortIndex(newParentPath);

  await db.transaction('rw', db.documents, async () => {
    await db.documents.update(id, { path: newPath, sortIndex: newSortIndex, updatedAt: Date.now() });
    if (doc.isFolder) {
      const descendants = existing.filter((d) => d.id !== id && isDescendantPath(d.path, doc.path));
      for (const descendant of descendants) {
        const rest = descendant.path.slice(doc.path.length);
        await db.documents.update(descendant.id, { path: `${newPath}${rest}` });
      }
    }
  });
  void refreshAllLinkResolutions();
}

export async function reorderSiblings(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.documents, async () => {
    await Promise.all(orderedIds.map((id, index) => db.documents.update(id, { sortIndex: index })));
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const doc = await db.documents.get(id);
  if (!doc) return;
  const idsToDelete = [id];
  if (doc.isFolder) {
    const all = await db.documents.toArray();
    idsToDelete.push(...all.filter((d) => d.id !== id && isDescendantPath(d.path, doc.path)).map((d) => d.id));
  }
  await db.transaction('rw', db.documents, db.links, async () => {
    await db.documents.bulkDelete(idsToDelete);
    for (const docId of idsToDelete) {
      await db.links.where('sourceId').equals(docId).delete();
    }
  });
  for (const docId of idsToDelete) removeFromSearchIndex(docId);
  void refreshAllLinkResolutions();
}
