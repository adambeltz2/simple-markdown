/**
 * Binds the app to a real folder on disk via the File System Access API, so documents persist
 * as actual portable .md files instead of only living in IndexedDB. Desktop Chrome/Edge only —
 * there is no equivalent API on mobile browsers (see backlog.md).
 *
 * The scan/merge/write logic below is written against small structural interfaces
 * (MinimalFileHandle / MinimalDirectoryHandle) rather than the real DOM FileSystemHandle types,
 * so it can be unit-tested with an in-memory fake filesystem — see localFolder.test.ts.
 */
import { db } from '../db/db';
import { parseMarkdownFile, serializeMarkdownFile } from './frontmatter';
import { dirname, joinPath } from './pathUtils';

export interface MinimalFileHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<{ text(): Promise<string> }>;
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}

export interface MinimalDirectoryHandle {
  kind: 'directory';
  name: string;
  entries(): AsyncIterableIterator<[string, MinimalFileHandle | MinimalDirectoryHandle]>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MinimalDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<MinimalFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

export interface ScannedEntry {
  path: string;
  isFolder: boolean;
  content: string;
}

export interface ActivationResult {
  handle: MinimalDirectoryHandle;
  importedCount: number;
  /** Paths that failed to read or parse and were skipped, so one bad file can't sink the whole import. */
  skippedPaths: string[];
}

const SETTINGS_KEY = 'localFolderHandle';

let activeHandle: MinimalDirectoryHandle | null = null;

export function getActiveFolderHandle(): MinimalDirectoryHandle | null {
  return activeHandle;
}

export function setActiveFolderHandle(handle: MinimalDirectoryHandle | null): void {
  activeHandle = handle;
}

export function supportsLocalFolder(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Recursively walks a directory handle, reading every .md file's text content. A file or
 * subfolder that fails to read (permission hiccup, a cloud-sync placeholder file, a transient
 * I/O error) is skipped — reported in `skipped` — rather than aborting the entire scan.
 */
export async function scanMarkdownFiles(
  dir: MinimalDirectoryHandle,
  prefix = '',
  skipped: string[] = [],
): Promise<{ entries: ScannedEntry[]; skipped: string[] }> {
  const entries: ScannedEntry[] = [];
  for await (const [name, handle] of dir.entries()) {
    const path = joinPath(prefix || '/', name);
    try {
      if (handle.kind === 'directory') {
        // Recurse before recording the folder itself, so a subfolder that fails outright
        // (e.g. its entries() throws) is skipped as a whole rather than left as an empty husk.
        const nested = await scanMarkdownFiles(handle, path, skipped);
        entries.push({ path, isFolder: true, content: '' });
        entries.push(...nested.entries);
      } else if (name.toLowerCase().endsWith('.md')) {
        const file = await handle.getFile();
        entries.push({ path, isFolder: false, content: await file.text() });
      }
    } catch (err) {
      console.warn(`Skipping "${path}" — failed to read it:`, err);
      skipped.push(path);
    }
  }
  return { entries, skipped };
}

/**
 * Merges scanned folder entries into IndexedDB: updates existing documents by path, creates new
 * ones. Imported dynamically to avoid a static import cycle with db/documents.ts, which imports
 * this module's mirrorWrite/mirrorDelete to keep the connected folder in sync with edits made
 * inside the app. An entry that fails to parse (e.g. malformed YAML frontmatter) is skipped —
 * added to `skipped` — rather than aborting the rest of the import.
 */
export async function mergeScanIntoDb(entries: ScannedEntry[], skipped: string[] = []): Promise<string[]> {
  const { upsertDocumentAtPath } = await import('../db/documents');
  for (const entry of entries) {
    try {
      if (entry.isFolder) {
        await upsertDocumentAtPath(entry.path, true, { content: '', tags: [], properties: {} });
      } else {
        const { content, tags, properties } = parseMarkdownFile(entry.content);
        await upsertDocumentAtPath(entry.path, false, { content, tags, properties });
      }
    } catch (err) {
      console.warn(`Skipping "${entry.path}" — failed to import it:`, err);
      skipped.push(entry.path);
    }
  }
  return skipped;
}

async function getParentDirectory(
  root: MinimalDirectoryHandle,
  path: string,
  create: boolean,
): Promise<MinimalDirectoryHandle> {
  const parentPath = dirname(path);
  const segments = parentPath === '/' ? [] : parentPath.split('/').filter(Boolean);
  let dir = root;
  for (const segment of segments) {
    dir = await dir.getDirectoryHandle(segment, { create });
  }
  return dir;
}

function basenameOf(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Writes (creates or overwrites) a document as a real file/folder under the connected root. */
export async function mirrorWriteToFolder(
  root: MinimalDirectoryHandle,
  doc: { path: string; isFolder: boolean; content: string; tags: string[]; properties: Record<string, string> },
): Promise<void> {
  const parent = await getParentDirectory(root, doc.path, true);
  const name = basenameOf(doc.path);
  if (doc.isFolder) {
    await parent.getDirectoryHandle(name, { create: true });
    return;
  }
  const fileHandle = await parent.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(serializeMarkdownFile(doc));
  await writable.close();
}

/** Deletes a document's real file/folder under the connected root. Missing entries are ignored. */
export async function mirrorDeleteFromFolder(root: MinimalDirectoryHandle, path: string): Promise<void> {
  try {
    const parent = await getParentDirectory(root, path, false);
    await parent.removeEntry(basenameOf(path), { recursive: true });
  } catch {
    // Already gone, or the parent folder itself no longer exists — nothing to clean up.
  }
}

/** Best-effort mirror of a write to the connected folder, if any. Never throws. */
export async function mirrorWrite(doc: {
  path: string;
  isFolder: boolean;
  content: string;
  tags: string[];
  properties: Record<string, string>;
}): Promise<void> {
  const root = getActiveFolderHandle();
  if (!root) return;
  try {
    await mirrorWriteToFolder(root, doc);
  } catch (err) {
    console.warn('Failed to write to the connected local folder:', err);
  }
}

/** Best-effort mirror of a delete to the connected folder, if any. Never throws. */
export async function mirrorDelete(path: string): Promise<void> {
  const root = getActiveFolderHandle();
  if (!root) return;
  try {
    await mirrorDeleteFromFolder(root, path);
  } catch (err) {
    console.warn('Failed to delete from the connected local folder:', err);
  }
}

/** Scans a folder and merges it into IndexedDB, marking it as the active connection. */
async function activateFolder(handle: MinimalDirectoryHandle): Promise<ActivationResult> {
  const { entries, skipped } = await scanMarkdownFiles(handle);
  await mergeScanIntoDb(entries, skipped);
  setActiveFolderHandle(handle);
  return { handle, importedCount: entries.length - skipped.length, skippedPaths: skipped };
}

/** Prompts the user to pick a folder, connects to it, and imports its .md files into IndexedDB. */
export async function connectLocalFolder(): Promise<ActivationResult> {
  if (!supportsLocalFolder()) {
    throw new Error('This browser does not support connecting to a local folder.');
  }
  const picker = (window as unknown as { showDirectoryPicker: (opts?: { mode?: string }) => Promise<unknown> })
    .showDirectoryPicker;
  const handle = (await picker({ mode: 'readwrite' })) as MinimalDirectoryHandle;
  const result = await activateFolder(handle);
  await db.settings.put({ key: SETTINGS_KEY, value: handle });
  return result;
}

/** On app load: if a folder was connected before and permission is still granted, reconnect silently. */
export async function tryReconnectSavedFolder(): Promise<ActivationResult | null> {
  const saved = await db.settings.get(SETTINGS_KEY);
  const handle = saved?.value as (MinimalDirectoryHandle & { queryPermission?: (o: { mode: string }) => Promise<string> }) | undefined;
  if (!handle) return null;
  try {
    const state = await handle.queryPermission?.({ mode: 'readwrite' });
    if (state !== 'granted') return null;
    return await activateFolder(handle);
  } catch (err) {
    console.warn('Failed to reconnect the saved local folder:', err);
    return null;
  }
}

/** Re-requests permission for a previously connected folder — must be called from a user gesture. */
export async function reconnectSavedFolder(): Promise<ActivationResult | null> {
  const saved = await db.settings.get(SETTINGS_KEY);
  const handle = saved?.value as (MinimalDirectoryHandle & { requestPermission?: (o: { mode: string }) => Promise<string> }) | undefined;
  if (!handle) return null;
  const state = await handle.requestPermission?.({ mode: 'readwrite' });
  if (state !== 'granted') return null;
  return await activateFolder(handle);
}

export async function getSavedFolderName(): Promise<string | null> {
  const saved = await db.settings.get(SETTINGS_KEY);
  const handle = saved?.value as MinimalDirectoryHandle | undefined;
  return handle?.name ?? null;
}

export async function disconnectLocalFolder(): Promise<void> {
  await db.settings.delete(SETTINGS_KEY);
  setActiveFolderHandle(null);
}
