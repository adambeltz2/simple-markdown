# CLAUDE.md

Guidance for working in this repo. This file covers what's shared across every project here;
each subproject has its own `CLAUDE.md` for stack-specific rules — read the one in the directory
you're actually touching too.

## What this repo is

Simple Markdown is a markdown editor/reader, shipped as multiple standalone apps that don't share
a build system but do share a philosophy:

- **Local-first.** Plain `.md` files (with optional YAML frontmatter) are the portable source of
  truth. No app should require an account or network connection for core editing/reading.
- **No proprietary formats.** Whatever a user writes must remain a plain, portable Markdown file —
  never trapped in an app-specific blob.
- **Respect user data.** Never silently drop, overwrite, or lose a user's document. Confirm before
  anything destructive.

## Repo layout

- [`android/`](android/) — native Android app (Kotlin, Jetpack Compose). See
  `android/CLAUDE.md` and `android/README.md`.
- [`web/`](web/) — offline-first web app (React, TypeScript, Vite). See
  `web/CLAUDE.md` and `web/README.md`.

Each project has its own dependencies, build tooling, and `README.md`. Don't reach across project
boundaries (e.g. don't add a web dependency to fix an Android problem) — if the two genuinely need
to share logic one day, that's a deliberate decision to raise with the user, not something to do
unprompted.

## Engineering principles (applies everywhere in this repo)

- **Investigate before writing code.** Trace how a change ripples across the relevant project
  before editing; don't guess at a fix for a problem you haven't reproduced.
- **Reuse over rebuild.** Check whether an equivalent helper/utility already exists in that
  project before adding a new one.
- **Root-cause fixes, not patches.** Find the actual failure point rather than papering over a
  symptom.
- **No scope creep.** Keep changes confined to what was asked. If you spot an unrelated bug or a
  good idea for later, log it in that project's `backlog.md` instead of doing it inline.
- **Minimal, honest diffs.** Don't restructure or "clean up" code that wasn't part of the ask.
- **Confirm before anything hard to reverse** — schema/breaking API changes, deleting user data,
  force-pushes — per the standard git safety rules.
- **Never hardcode secrets, API keys, or credentials** in source, logs, or commits.
