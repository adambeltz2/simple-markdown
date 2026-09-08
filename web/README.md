# Offline-First Markdown Wiki

A web-based, offline-first personal knowledge management application. It combines a seamless WYSIWYG editor with the portability of plaintext Markdown files, structured metadata, bidirectional linking, and optional Dropbox synchronization.

## 🏗 System Architecture

The application is built to run entirely in the browser without requiring a backend server. 

*   **Frontend:** React via Vite.
*   **Storage (Dexie.js):** The browser's IndexedDB acts as the source of truth. Folder structures are flattened into a single `documents` table using explicit `path` strings (e.g., `/Projects/Wiki.md`). File order in the UI is strictly dictated by a `sortIndex` integer.
*   **Editor (TipTap):** Provides a rich text editing experience. It natively parses Markdown on load and serializes back to raw `.md` on save.
*   **Metadata (gray-matter):** YAML frontmatter is intercepted before reaching the editor, allowing tags, dates, and custom properties to be managed via dedicated UI inputs in the Context Sidebar.
*   **Search (FlexSearch):** Upon load, a multi-entry index maps titles, tags, and document content for instant client-side querying.

## 🗄 Database Schema

The IndexedDB schema utilizes a relational graph structure to manage links and files quickly without constant text parsing.

```typescript
db.version(1).stores({
  documents: 'id, path, sortIndex, *tags', // Core files. *tags enables instant exact-match queries.
  links: '[sourceId+targetPath], targetId' // Junction table for bidirectional wiki-links.
});