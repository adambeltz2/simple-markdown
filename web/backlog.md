# Backlog

Ordered by priority within each tier (highest first). When adding an item, use
`[BUG]` / `[FEATURE]` / `[REFACTOR]` / `[DEBT]` plus a concise description and affected files
(per `CLAUDE.md`), and place it in the tier that matches its impact vs. effort — don't just append
to the bottom.

## High priority

[FEATURE] No PWA/offline support — an "offline-first" app should still load and be usable with no network, and be installable to a phone home screen, but there's no service worker or web app manifest today. Data already lives in IndexedDB so the app logic is offline-capable; only the shell (HTML/JS/CSS) needs caching. Directly undercuts the app's core pitch. Files: vite.config.ts (add vite-plugin-pwa), index.html, new public/manifest.webmanifest.

[FEATURE] Icon-only buttons (delete 🗑, tag/property remove ×, panel toggles «/»/ⓘ, undo/redo, formatting toolbar) only carry a `title` attribute, which screen readers surface inconsistently. Add explicit `aria-label`s. Small, low-risk fix with real accessibility impact. Files: src/components/Sidebar.tsx, src/components/ContextSidebar.tsx, src/components/AppShell.tsx, src/editor/MarkdownEditor.tsx.

[FEATURE] Renaming a note/folder only works via double-click on its row (src/components/Sidebar.tsx) — not discoverable, and double-click/double-tap isn't a standard touch gesture on mobile, where this app now has a first-class layout. Add an explicit rename button next to delete in `.tree-node__actions`.

## Medium priority

[FEATURE] Whole-vault zip import/export, for browsers without the File System Access API (Safari, all mobile browsers) — desktop Chrome/Edge now has real folder-binding instead (`src/lib/localFolder.ts`, see Deployment/Known gaps in README), but everywhere else still only has single-document import/export. Files: src/components/Sidebar.tsx, src/components/EditorPane.tsx.

[FEATURE] No save-status feedback — content autosaves via a 400ms debounce (src/components/EditorPane.tsx) with nothing in the UI showing "Saving…" / "Saved", so a user can't tell whether their last keystroke is persisted yet. Cheap to add, meaningfully improves trust in the autosave.

[DEBT] Inconsistent keyboard submit in the context sidebar (src/components/ContextSidebar.tsx): the tag input submits on Enter, but the property key/value inputs only submit via the "Add" button. Give the property inputs the same Enter handling. Trivial fix.

[DEBT] Local folder sync (src/lib/localFolder.ts) only re-scans on connect/reconnect — an external edit to a file (made outside the browser, e.g. in another editor) while the tab stays open won't be picked up until you disconnect and reconnect. There's also no conflict resolution: if a file changes both in-app and on disk between scans, the app's next write silently overwrites the on-disk version. A `FileSystemObserver` (where supported) or periodic re-scan would close this gap.

[FEATURE] Dropbox API v2 background sync worker. README lists this as optional; the `dropbox` package is installed but no sync code exists yet — needs a user-supplied Dropbox app key and an OAuth flow before it can be built. Real feature but the highest-effort item here (external OAuth flow, background worker). Files: none yet (would live in `src/lib/dropbox.ts`).

## Low priority

[FEATURE] Theme follows `prefers-color-scheme` only (src/index.css) with no in-app override — a user whose OS is light but who wants the app dark (or vice versa) has no way to do that. Add a light/dark/system toggle, e.g. in the context sidebar.

[DEBT] `.editor-toolbar` (src/App.css) has no overflow handling — it's a plain flex row with no `overflow-x` or wrap. Fine today (it currently fits), but a very narrow device (<360px) or a future added button could clip the row with no way to reach it. Add `overflow-x: auto` (or wrap) before that happens.

[FEATURE] Drag-and-drop in the file tree supports "drop onto a folder" (move into it) and "drop onto a file" (move + reorder after it), but there's no visual before/after drop-position indicator. Purely cosmetic polish. Files: src/components/Sidebar.tsx.

[DEBT] The FlexSearch index lives in a module-level singleton in `src/lib/search.ts`, rebuilt once per app load from IndexedDB and updated incrementally afterward. Two tabs open at once each keep their own index in memory; edits made in one tab won't affect the other tab's search results until it reloads. Edge case (multi-tab usage) with low real-world impact.
