# Tasks

- [x] Task 1: Initialize Next.js project and configure Git. Install dependencies (`better-sqlite3`, `zod`, `ai`, `diff`, `commander`, `gray-matter`, `uuid`), configure git username to `xiaomajiang` and set English commit messages.
- [x] Task 2: Implement file system data layer. Create utilities for reading/writing `inbox/` and `library/` directories with YAML frontmatter parsing.
- [x] Task 3: Setup SQLite FTS5 indexing. Implement indexing script and database connection in `.kv-meta/index.sqlite`.
- [x] Task 4: Implement Capture API (`POST /api/capture`). Receive raw text, save to `inbox`, and trigger async LLM processing task.
- [x] Task 5: Implement LLM Organizer Service. Use LLM to analyze the inbox item and output structured JSON (content type, tags, auto-archive decision, merge candidates).
- [x] Task 6: Implement Auto-Archive and Merge API (`POST /api/merge/confirm`). Handle LLM output to either auto-create a new markdown file in `library/` or prepare and apply merge diffs.
- [x] Task 7: Implement Search API (`GET /api/search`). Query the SQLite FTS5 index and return sorted results.
- [x] Task 8: Build Frontend UI - Layout & CaptureBar. Create the main page layout with a top input bar for capturing and searching.
- [x] Task 9: Build Frontend UI - Inbox List and Merge Confirmation. Create pages to list inbox items and a diff viewer component for merge confirmation (`/inbox`, `/merge/[rawId]`).
- [x] Task 10: Build Frontend UI - Library & Search Results. Render markdown files for library items (`/library/[id]`) and display search result cards.
- [x] Task 11: Implement CLI Tool. Create `bin/kb.js` using `commander` to query the SQLite database directly from the terminal.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 4
- Task 6 depends on Task 5
- Task 7 depends on Task 3
- Tasks 8-10 depend on Tasks 4-7
- Task 11 depends on Task 3
