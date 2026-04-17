# Init Knowledge Vault MVP Spec

## Why
Users need a frictionless way to capture fragmented information (URLs, commands, snippets) and have an LLM automatically organize and archive it for easy retrieval via a single search box or CLI.

## What Changes
- Initialize a Next.js App Router project.
- Configure Git for local persistence with username `xiaomajiang` and English commit messages.
- Implement two-tier data storage: `inbox/` (raw) and `library/` (curated).
- Implement Capture API and UI for rapid entry.
- Implement LLM integration for structuring and suggesting merges.
- Implement SQLite FTS5 index for full-text search.
- Implement frontend pages: Home (Search+Capture), Inbox, Item Detail, Merge Confirmation.
- Implement a read-only CLI tool `kb` for terminal-based querying.

## Impact
- Affected specs: Next.js App, CLI, Local SQLite Index.
- Affected code: New Next.js project inside `/workspace/memo-kb`.

## ADDED Requirements
### Requirement: MVP Features
The system SHALL provide:
1. Fast capture to `inbox`.
2. Async LLM organization (auto-archive or suggest merge).
3. Merge confirmation UI with diff viewer.
4. Single-box search (web).
5. Git-based local storage.
6. CLI tool `kb <query>` for fast retrieval.

#### Scenario: Success case
- **WHEN** user pastes a curl command into the CaptureBar
- **THEN** it saves to inbox immediately, LLM structures it, and either creates a new file in `library` automatically or prompts the user to merge it into an existing command list.
