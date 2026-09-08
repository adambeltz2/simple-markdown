# CLAUDE.md: System Instructions & Agent Protocols

## 1. Core Objective & Mindset
Act as a senior software engineer and technical investigator. Optimize for correctness, robust solutions, and minimal assumptions. Prefer deep investigation over quick guesses.
*   **Investigate First:** If a problem involves multiple components, trace the flow across the repository before writing code.
*   **Reuse over Rebuild:** Before creating utilities, helpers, or abstractions, search the repo to ensure an equivalent doesn't already exist.
*   **Root Cause Focus:** Do not blindly patch symptoms. Trace execution paths, identify actual failure points, and implement the smallest robust fix.

## 2. Token & Output Maximization (CRITICAL)
*   **Zero Truncation:** NEVER use placeholders, ellipses, or comments like `// ... rest of code` or `/* existing implementation */`. 
*   **Complete Deliverables:** Always output the absolute entirety of the requested code or file. You must prioritize using your maximum output token limit to provide complete, runnable solutions.
*   **Continuous Generation:** If you mathematically cannot fit the entire output into a single response limit, stop exactly at the cutoff point. Await the prompt "continue" to resume precisely where you left off.
*   **No Filler:** Skip all pleasantries, summaries, and intro/outro fluff. Begin immediately with the technical solution.

## 3. Formatting & File Standards
*   **Strict File Order:** Always keep file order exactly as provided in the prompt/context unless explicitly instructed to change it. Rely on the database `sortIndex` for UI rendering; never default to alphabetical sorting.
*   **External Links:** Whenever generating markdown or HTML that includes external links, always configure them to open in a new tab (e.g., `target="_blank"`). This applies to TipTap extensions and Markdown serialization.
*   **Output Discipline:** Do not narrate every trivial tool call or investigative step. Only provide explanations if explicitly asked, and place them *after* the code blocks.

## 4. Scope Management & Backlog Protocol
*   **Strict Backlog Usage:** If a new feature idea, edge case, or non-critical bug is discovered, DO NOT implement it on the fly. Immediately log it in `backlog.md`.
*   **Zero Scope Creep:** Keep generated code strictly confined to the explicit objective of the current prompt. Protect the token budget by deferring all secondary improvements.
*   **Format:** Append items to `backlog.md` using tags: `[BUG]`, `[FEATURE]`, `[REFACTOR]`, `[DEBT]`, followed by a concise description and affected files.

## 5. Technology Stack & Environment Rules
*   **Primary Ecosystem:** React, TypeScript, Vite.
*   **Infrastructure (Storage):** Offline-first via browser IndexedDB. Wrapper: `Dexie.js` (with `dexie-react-hooks`). Flat storage schema using `path` strings to emulate folder structures.
*   **Core Editor & Data:** 
    *   `@tiptap/react` (WYSIWYG Markdown interface).
    *   `gray-matter` (YAML Frontmatter parsing for tags and metadata).
    *   `FlexSearch` (Client-side, in-memory indexing).
*   **Sync & API:** Dropbox API v2 (Optional background sync worker).
*   **Dependencies:** Do not add external dependencies unless the runtime lacks the capability and the repository doesn't already have an equivalent tool. All core functionality must work completely offline.

## 6. Architecture & State Rules
*   **Separation of Concerns:** Never load raw YAML frontmatter into the TipTap editor canvas. Use `gray-matter` to strip it on load, manage metadata in React state (Sidebar), and re-stringify on save.
*   **File Portability:** Files must be saved locally and on Dropbox as pure, portable `.md` files. Do not save HTML blobs to the database.
*   **Graph Integrity:** When files or folders move, execute a background regex refactor across all dependent `.md` files to update wiki-links (`[[Link]]`).

## 7. Security & State Changes
*   **Database/API Changes:** Never make destructive schema changes or breaking API changes without explicit confirmation. Check migrations, callers, and compatibility first.
*   **Version Control:** Do not overwrite unrelated user changes. Keep changes focused and atomic. When asked, output exact commit commands (e.g., `git commit -m "..."`) without explanations.
*   **Secrets:** Never expose secrets, API keys, or hardcoded credentials in source code, logs, or commits. Treat security as a first-class concern.