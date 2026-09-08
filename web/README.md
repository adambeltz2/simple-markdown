# Offline-First Markdown Wiki

A web-based, offline-first personal knowledge management application. It combines a seamless WYSIWYG editor with the portability of plaintext Markdown files, structured metadata, bidirectional linking, and optional Dropbox synchronization.

**Live app:** https://adambeltz2.github.io/simple-markdown/ (deployed automatically from `main`, see [Deployment](#deployment) below)

## Features

- **File tree** with folders, drag-and-drop move/reorder, and instant client-side search.
- **WYSIWYG Markdown editor** (TipTap) with a formatting toolbar (bold/italic/strike, headings,
  lists, task lists, quote, code block, rule) that round-trips to plain `.md` — content is
  autosaved to IndexedDB as you type.
- **`[[Wiki-links]]`** between notes, with fuzzy-ranked autocomplete and a live backlinks panel.
- **Frontmatter-backed metadata** — tags and arbitrary key/value properties, edited via the
  context sidebar and stored as real YAML frontmatter on save.
- **Persist to a real local folder** (desktop Chrome/Edge, via the File System Access API) — connect
  a folder from `+ Connect local folder` in the sidebar and every document becomes a real, portable
  `.md` file on disk (nested folders included), kept in sync as you edit. This is the actual answer
  to "how do I get real files, not just browser storage" — IndexedDB remains a local cache/index on
  top either way. See `src/lib/localFolder.ts`. Not available on mobile browsers or Safari — no
  browser exposes an equivalent API there yet — where single-document import/export
  (below) is the only way to get files out.
- **Single-document import/export** of `.md` files everywhere else; whole-vault zip import/export
  for browsers without folder-binding is not built yet (see `backlog.md`).
- **Responsive layout:** a 3-column desktop view (file tree / editor / metadata), collapsing to a
  single full-width pane below 768px — note list → editor (with a back button) → metadata as a
  slide-in drawer. See `src/App.css`'s "Mobile (single-pane) layout" section.
- **Dropbox sync** is scaffolded (the `dropbox` dependency is installed) but not implemented yet.

## 🏗 System Architecture

The application is built to run entirely in the browser without requiring a backend server.

*   **Frontend:** React via Vite.
*   **Storage (Dexie.js):** The browser's IndexedDB acts as the source of truth. Folder structures are flattened into a single `documents` table using explicit `path` strings (e.g., `/Projects/Wiki.md`). File order in the UI is strictly dictated by a `sortIndex` integer.
*   **Editor (TipTap):** Provides a rich text editing experience. It natively parses Markdown on load and serializes back to raw `.md` on save.
*   **Metadata (gray-matter):** YAML frontmatter is intercepted before reaching the editor, allowing tags, dates, and custom properties to be managed via dedicated UI inputs in the Context Sidebar.
*   **Search (FlexSearch):** Upon load, a multi-entry index maps titles, tags, and document content for instant client-side querying. The `[[wiki-link]]` autocomplete ranks candidates with a fuzzy subsequence matcher (`src/lib/fuzzyMatch.ts`).

## Project structure

```
src/
├── App.tsx / App.css          # Root component + all app styling (incl. responsive layout)
├── main.tsx, index.css        # Entry point, CSS variables/theme (light + prefers-color-scheme dark)
├── types.ts                   # Shared domain types (DocumentRecord, LinkRecord, TreeNode, …)
├── components/
│   ├── AppShell.tsx           # Top-level layout: sidebar / editor / context panel + mobile view state
│   ├── Sidebar.tsx             # File tree: search, create, import, drag-and-drop, rename, delete
│   ├── EditorPane.tsx          # Active document header (title, back/export/info) + editor host
│   └── ContextSidebar.tsx      # Metadata: created/updated, tags, properties, backlinks
├── editor/
│   ├── MarkdownEditor.tsx      # TipTap instance + formatting toolbar
│   └── extensions/wikiLink.ts  # Custom TipTap node for [[wiki-links]] + suggestion popup
├── db/
│   ├── db.ts                   # Dexie schema (documents, links, settings)
│   ├── documents.ts            # CRUD: create/rename/move/reorder/delete, keeps search index +
│   │                             connected local folder (if any) in sync
│   └── links.ts                 # Wiki-link resolution + backlinks
├── hooks/
│   ├── useAppState.tsx          # App-wide context: documents, selection, search, panel state,
│   │                             local-folder connection state
│   └── useDebouncedCallback.ts  # Debounce helper used for autosave
└── lib/                          # Pure, unit-tested logic — pathUtils, frontmatter, wikilink,
                                    fuzzyMatch, search, localFolder (no React dependencies; the
                                    File System Access API calls in localFolder.ts are isolated
                                    behind small structural interfaces so the scan/write/delete
                                    logic is testable without a browser)
```

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

This requires **Settings → Pages → Build and deployment → Source** to be set to **GitHub Actions**
for the repository (already done — noted here since it's a one-time manual step GitHub doesn't
expose through the API, so it'd need redoing if the repo were ever recreated).

## Known gaps / where to look next

See `backlog.md` for the full, current list. The most notable gaps right now: no offline/PWA
support (so, ironically, an "offline-first" app still needs network to load itself the first
time — see the backlog item), local-folder sync only re-scans on connect (no live watching of
external changes, no conflict resolution), no whole-vault zip import/export for browsers without
folder-binding, and no UI feedback for in-progress autosaves.

## Verification notes (local-folder feature)

The File System Access API requires a real user gesture and a native OS folder picker, so the
connect flow itself can't be driven headlessly in CI or by an agent. What *is* verified: the
scan/write/delete logic against a fake in-memory filesystem (`src/lib/localFolder.test.ts`),
`tsc -b` type-checking cleanly against the real DOM `FileSystemDirectoryHandle`/`FileSystemFileHandle`
types, and the connect/disconnect UI rendering correctly (and hiding on unsupported browsers) via
Playwright. The actual "click Connect, pick a folder, see files land on disk" round trip needs a
manual check in a real desktop Chrome/Edge — do that before relying on it for anything you can't
afford to lose.
