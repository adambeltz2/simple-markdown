# Simple Markdown

A markdown editor/reader, built as a set of standalone apps that share the same local files.

## Projects

- [`android/`](android/) — native Android app (Kotlin + Jetpack Compose). See
  [android/README.md](android/README.md) for details and build instructions.
- [`web/`](web/) — offline-first web app (React + TypeScript + Vite), storing documents in the
  browser's IndexedDB with optional Dropbox sync. Responsive: single-pane layout on mobile,
  3-column on desktop. See [web/README.md](web/README.md).
  Live at https://adambeltz2.github.io/simple-markdown/, auto-deployed from `main` via
  [`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml).

Each project is self-contained with its own dependencies and build tooling; there's no shared
build system between them.
