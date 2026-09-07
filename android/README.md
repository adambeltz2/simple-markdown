# Simple Markdown

A native Android app for writing and reading Markdown, built with Kotlin and Jetpack Compose.

## Features

- **Document list** — all your `.md` files, stored locally on-device, sorted by last edited.
- **Editor** with a formatting toolbar (bold, italic, strikethrough, inline/block code, headings,
  bullet/numbered lists, task lists, quotes, links, horizontal rules).
- **Live preview** — switch to a rendered view powered by [Markwon](https://noties.io/Markwon/),
  supporting tables, task lists, strikethrough, and basic HTML.
- **Import** any text/markdown file from device storage (via the system file picker).
- **Export** to any location on device storage, or **share** to another app.
- Handles files opened from other apps (`ACTION_VIEW` / `ACTION_SEND` for `.md`/text content).

## Project structure

```
app/src/main/java/com/simplemarkdown/app/
├── MainActivity.kt              # Navigation host, SAF import/export, share/intent handling
├── data/
│   ├── MarkdownDocument.kt      # Document metadata model
│   └── DocumentRepository.kt    # File-backed storage in app-private storage
└── ui/
    ├── theme/Theme.kt           # Material 3 theme (dynamic color + light/dark)
    └── screens/
        ├── DocumentListScreen.kt
        ├── EditorScreen.kt
        ├── MarkdownFormatting.kt  # Text-selection helpers for the toolbar
        └── MarkdownPreview.kt     # Markwon-backed rendered preview
```

## Building

Requires Android Studio (Koala or newer) or the command line with the Android SDK installed
(`ANDROID_HOME` set, SDK Platform 34 and Build-Tools installed).

```bash
./gradlew assembleDebug
```

The debug APK will be at `app/build/outputs/apk/debug/app-debug.apk`. Install it with:

```bash
./gradlew installDebug
```

Minimum SDK: 24 (Android 7.0). Target/compile SDK: 34.

> Note: this project was scaffolded in a sandboxed environment without access to Google's Maven
> repository, so the build has not been compiled end-to-end here. The code has been carefully
> reviewed for correctness, but run a build locally and file/fix any dependency-resolution or
> compiler issues Android Studio surfaces on first sync.

## Next steps / ideas

- Word/character count in the editor.
- Search across documents.
- Optional persistent SAF access to a chosen folder (edit files in place, sync across the file tree).
- Export to HTML/PDF.
- Syntax highlighting in the editor itself (currently monospace plain text + toolbar).
