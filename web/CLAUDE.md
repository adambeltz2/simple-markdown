# CLAUDE.md — web app

Stack-specific rules for this project. Shared, repo-wide principles live in the root
[`CLAUDE.md`](../CLAUDE.md) — read that first if you haven't.

## Stack

- **Frontend:** React + TypeScript, built with Vite.
- **Storage:** Browser IndexedDB via `Dexie.js` (+ `dexie-react-hooks`) is the source of truth.
  Folder structures are flattened into a single `documents` table using explicit `path` strings
  (e.g. `/Projects/Wiki.md`); UI order is driven by an integer `sortIndex`, never alphabetical.
- **Editor:** `@tiptap/react` — a WYSIWYG surface that parses Markdown on load and serializes back
  to raw `.md` on save.
- **Metadata:** `gray-matter` strips YAML frontmatter before it reaches the editor; tags/dates/
  custom properties are managed via the Context Sidebar and re-stringified on save.
- **Search:** `FlexSearch`, a client-side in-memory index built from IndexedDB on load.
- **Sync:** Dropbox API v2 is an optional, not-yet-implemented background sync worker (see
  `backlog.md`) — everything must keep working fully offline without it.
- **Dependencies:** don't add a new one unless the runtime genuinely lacks the capability and
  nothing already in the repo covers it.

## Architecture rules

- Never load raw YAML frontmatter into the TipTap editor canvas — strip it with `gray-matter`
  first, manage it in React state, re-stringify on save.
- Files must round-trip as pure, portable `.md` — both locally and on Dropbox. Never persist HTML
  blobs to the database.
- When a file or folder moves, run the background regex refactor across dependent `.md` files so
  wiki-links (`[[Link]]`) stay valid — don't leave links dangling.
- External links (in generated Markdown or HTML, including TipTap extensions and Markdown
  serialization) always open in a new tab (`target="_blank"`).

## Backlog protocol

If you find a new feature idea, edge case, or non-critical bug while working on something else,
don't implement it inline — log it in `backlog.md` using `[BUG]` / `[FEATURE]` / `[REFACTOR]` /
`[DEBT]`, a concise description, and the affected files. Keep the current task's diff focused.

## Commands

```bash
npm install
npm run dev       # vite dev server
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview
```
