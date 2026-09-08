# Backlog

[FEATURE] Dropbox API v2 background sync worker. README lists this as optional; the `dropbox` package is installed but no sync code exists yet — needs a user-supplied Dropbox app key and an OAuth flow before it can be built. Files: none yet (would live in `src/lib/dropbox.ts`).

[FEATURE] Whole-vault import/export (zip, or a folder picker via the File System Access API). Only single-document import (`+ Import`) and export (`Export .md`) exist today. Files: src/components/Sidebar.tsx, src/components/EditorPane.tsx.

[FEATURE] Drag-and-drop in the file tree supports "drop onto a folder" (move into it) and "drop onto a file" (move + reorder after it), but there's no visual before/after drop-position indicator. Files: src/components/Sidebar.tsx.

[DEBT] The FlexSearch index lives in a module-level singleton in `src/lib/search.ts`, rebuilt once per app load from IndexedDB and updated incrementally afterward. Two tabs open at once each keep their own index in memory; edits made in one tab won't affect the other tab's search results until it reloads.

[FEATURE] No PWA/offline support — an "offline-first" app should still load and be usable with no network, and be installable to a phone home screen, but there's no service worker or web app manifest today. Data already lives in IndexedDB so the app logic is offline-capable; only the shell (HTML/JS/CSS) needs caching. Files: vite.config.ts (add vite-plugin-pwa), index.html, new public/manifest.webmanifest.

[FEATURE] Icon-only buttons (delete 🗑, tag/property remove ×, panel toggles «/»/ⓘ, undo/redo, formatting toolbar) only carry a `title` attribute, which screen readers surface inconsistently. Add explicit `aria-label`s. Files: src/components/Sidebar.tsx, src/components/ContextSidebar.tsx, src/components/AppShell.tsx, src/editor/MarkdownEditor.tsx.

[DEBT] `.editor-toolbar` (src/App.css) has no overflow handling — it's a plain flex row with no `overflow-x` or wrap. Fine today, but a very narrow device (<360px) or a future added button could clip the row with no way to reach it. Add `overflow-x: auto` (or wrap) before that happens.

[FEATURE] Renaming a note/folder only works via double-click on its row (src/components/Sidebar.tsx) — not discoverable, and double-click/double-tap isn't a standard touch gesture on mobile. Add an explicit rename button next to delete in `.tree-node__actions`.

[FEATURE] No save-status feedback — content autosaves via a 400ms debounce (src/components/EditorPane.tsx) with nothing in the UI showing "Saving…" / "Saved", so a user can't tell whether their last keystroke is persisted yet.

[FEATURE] Theme follows `prefers-color-scheme` only (src/index.css) with no in-app override — a user whose OS is light but who wants the app dark (or vice versa) has no way to do that. Add a light/dark/system toggle, e.g. in the context sidebar.

[DEBT] Inconsistent keyboard submit in the context sidebar (src/components/ContextSidebar.tsx): the tag input submits on Enter, but the property key/value inputs only submit via the "Add" button. Give the property inputs the same Enter handling.

