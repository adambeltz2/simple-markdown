# CLAUDE.md — Android app

Stack-specific rules for this project. Shared, repo-wide principles live in the root
[`CLAUDE.md`](../CLAUDE.md) — read that first if you haven't.

## Stack

- **Language/UI:** Kotlin, Jetpack Compose (Material 3).
- **Storage:** Documents are plain `.md` files under the app's private storage
  (`DocumentRepository`, `context.filesDir/documents`). There is no database — the filesystem is
  the source of truth, same as the web app's principle of files as the portable unit.
- **Markdown rendering:** [Markwon](https://noties.io/Markwon/) for the read-only preview
  (`ui/screens/MarkdownPreview.kt`); the editor itself is plain monospace text plus a formatting
  toolbar that inserts/wraps Markdown syntax (`ui/screens/MarkdownFormatting.kt`).
- **Cross-app file exchange:** Storage Access Framework (`ACTION_OPEN_DOCUMENT` /
  `ACTION_CREATE_DOCUMENT`) for import/export, `FileProvider` + `ACTION_SEND` for sharing, and
  `ACTION_VIEW`/`ACTION_SEND` intent filters so `.md` files opened from other apps land here.
- **Dependencies:** don't add a new one unless the platform/AndroidX genuinely lacks the
  capability and nothing already in the repo covers it.

## Architecture rules

- Keep `DocumentRepository` as the only thing that touches the filesystem — screens/composables
  talk to it, never to `File`/`Uri` APIs directly.
- File names are sanitized and de-duplicated in `DocumentRepository.uniqueFileName` — don't bypass
  it when creating/renaming documents, or two documents can silently collide.
- The editor toolbar's text-manipulation helpers (`wrapSelection`, `prefixLines`, `insertLink`,
  `insertAtCursor` in `MarkdownFormatting.kt`) are pure functions over `TextFieldValue` — keep new
  formatting actions in that shape so they stay easy to test independently of Compose.

## Build

Requires the Android SDK (`ANDROID_HOME`, platform 34) — see `README.md` for full setup notes and
the current known limitation (this sandbox can't reach `dl.google.com`, so builds haven't been
verified end-to-end here; verify locally / in CI before treating a change as done).

```bash
./gradlew assembleDebug   # debug APK
./gradlew lint            # Android lint
```

There is currently no automated test suite for this app (see `README.md` → Next steps). If you
add one, prefer JVM-only unit tests (e.g. for `MarkdownFormatting.kt`'s pure functions and
`DocumentRepository`'s file-naming logic) over instrumented tests where possible, since those run
without an emulator.
