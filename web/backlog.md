# Backlog

[FEATURE] Dropbox API v2 background sync worker. README lists this as optional; the `dropbox` package is installed but no sync code exists yet — needs a user-supplied Dropbox app key and an OAuth flow before it can be built. Files: none yet (would live in `src/lib/dropbox.ts`).

[FEATURE] Whole-vault import/export (zip, or a folder picker via the File System Access API). Only single-document import (`+ Import`) and export (`Export .md`) exist today. Files: src/components/Sidebar.tsx, src/components/EditorPane.tsx.

[FEATURE] Drag-and-drop in the file tree supports "drop onto a folder" (move into it) and "drop onto a file" (move + reorder after it), but there's no visual before/after drop-position indicator. Files: src/components/Sidebar.tsx.

[DEBT] The FlexSearch index lives in a module-level singleton in `src/lib/search.ts`, rebuilt once per app load from IndexedDB and updated incrementally afterward. Two tabs open at once each keep their own index in memory; edits made in one tab won't affect the other tab's search results until it reloads.

[FEATURE] The `[[Title]]` wiki-link autocomplete popup filters by plain substring match only (no fuzzy scoring/ranking). Files: src/editor/extensions/wikiLink.ts.
