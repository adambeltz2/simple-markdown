import { db } from './db';
import type { Backlink, DocumentRecord } from '../types';
import { extractWikiLinkTargets } from '../lib/wikilink';
import { titleFromPath } from '../lib/pathUtils';

export function resolveTarget(raw: string, documents: DocumentRecord[]): DocumentRecord | null {
  const norm = raw.trim().toLowerCase();
  return (
    documents.find((d) => {
      if (d.isFolder) return false;
      if (d.path.toLowerCase() === norm) return true;
      if (d.path.toLowerCase() === `/${norm}.md`) return true;
      return titleFromPath(d.path).toLowerCase() === norm;
    }) ?? null
  );
}

export async function syncLinksForDocument(sourceId: string, content: string): Promise<void> {
  const targets = extractWikiLinkTargets(content);
  const allDocs = await db.documents.toArray();
  const existingLinks = await db.links.where('sourceId').equals(sourceId).toArray();
  const existingKeys = new Set(existingLinks.map((l) => l.targetPath));
  const newKeys = new Set(targets);
  const toRemove = existingLinks.filter((l) => !newKeys.has(l.targetPath));
  const toAdd = targets.filter((t) => !existingKeys.has(t));

  await db.transaction('rw', db.links, async () => {
    for (const link of toRemove) {
      await db.links.delete([link.sourceId, link.targetPath]);
    }
    for (const target of toAdd) {
      const resolved = resolveTarget(target, allDocs);
      await db.links.put({ sourceId, targetPath: target, targetId: resolved?.id ?? null });
    }
  });
}

export async function getBacklinks(documentId: string): Promise<Backlink[]> {
  const links = await db.links.where('targetId').equals(documentId).toArray();
  const sources = await db.documents.bulkGet(links.map((l) => l.sourceId));
  const backlinks: Backlink[] = [];
  links.forEach((link, i) => {
    const source = sources[i];
    if (source) backlinks.push({ source, targetPath: link.targetPath });
  });
  return backlinks;
}

export async function refreshAllLinkResolutions(): Promise<void> {
  const allDocs = await db.documents.toArray();
  const allLinks = await db.links.toArray();
  await db.transaction('rw', db.links, async () => {
    for (const link of allLinks) {
      const resolved = resolveTarget(link.targetPath, allDocs);
      const newTargetId = resolved?.id ?? null;
      if (newTargetId !== link.targetId) {
        await db.links.put({ ...link, targetId: newTargetId });
      }
    }
  });
}
