# Simple Markdown

A markdown editor/reader, built as a set of standalone apps that share the same local files.

## Projects

- [`android/`](android/) — native Android app (Kotlin + Jetpack Compose). See
  [android/README.md](android/README.md) for details and build instructions.
- `web/` — planned: a web app that reads/writes the same local markdown files (e.g. via the
  File System Access API), for editing on desktop.

Each project is self-contained with its own dependencies and build tooling; there's no shared
build system between them.
