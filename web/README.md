# Offline-First Markdown Wiki

A web-based, offline-first personal knowledge management application. It combines a seamless WYSIWYG editor with the portability of plaintext Markdown files, structured metadata, bidirectional linking, and optional Dropbox synchronization.

**Live app:** https://adambeltz2.github.io/simple-markdown/ (deployed automatically from `main`, see [Deployment](#deployment) below)

## 🏗 System Architecture

The application is built to run entirely in the browser without requiring a backend server.

*   **Frontend:** React via Vite.
*   **Storage (Dexie.js):** The browser's IndexedDB acts as the source of truth. Folder structures are flattened into a single `documents` table using explicit `path` strings (e.g., `/Projects/Wiki.md`). File order in the UI is strictly dictated by a `sortIndex` integer.
*   **Editor (TipTap):** Provides a rich text editing experience. It natively parses Markdown on load and serializes back to raw `.md` on save.
*   **Metadata (gray-matter):** YAML frontmatter is intercepted before reaching the editor, allowing tags, dates, and custom properties to be managed via dedicated UI inputs in the Context Sidebar.
*   **Search (FlexSearch):** Upon load, a multi-entry index maps titles, tags, and document content for instant client-side querying. The `[[wiki-link]]` autocomplete ranks candidates with a fuzzy subsequence matcher (`src/lib/fuzzyMatch.ts`).

## 🗄 Database Schema

The IndexedDB schema utilizes a relational graph structure to manage links and files quickly without constant text parsing.

```typescript
db.version(1).stores({
  documents: 'id, path, sortIndex, *tags', // Core files. *tags enables instant exact-match queries.
  links: '[sourceId+targetPath], targetId' // Junction table for bidirectional wiki-links.
});
```

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

## Commands

```bash
npm run build      # typecheck (tsc -b) + production build to dist/
npm run test        # run the Vitest suite once
npm run test:watch  # Vitest in watch mode
npm run lint         # oxlint
npm run preview       # serve the production build locally
```

## Testing

Pure logic (path handling, frontmatter parsing, wiki-link parsing/renaming, fuzzy search ranking)
is covered by [Vitest](https://vitest.dev) unit tests colocated as `*.test.ts` next to the module
they test — e.g. `src/lib/pathUtils.test.ts`. Run them with `npm run test`. UI/editor integration
isn't covered yet; see `backlog.md`.

## Deployment

Pushes to `main` that touch `web/` trigger [`.github/workflows/deploy-web.yml`](../.github/workflows/deploy-web.yml),
which installs dependencies, lints, runs the test suite, builds with `VITE_BASE_PATH` set for a
GitHub Pages project page, and publishes `dist/` via GitHub's official Pages actions. You can also
trigger it manually from the Actions tab (`workflow_dispatch`).

This only works once **Settings → Pages → Build and deployment → Source** is set to
**GitHub Actions** for the repository (one-time, manual — GitHub doesn't allow enabling Pages via
the API used here). Until that's flipped, the workflow will run but the deploy job will fail with
a "Pages site not found" style error.
