# AGENTS

This file documents agent-specific implementation context for this repository and complements README.

## Project Snapshot

- Package: @stephensauceda/apple-news
- Runtime target: Node.js 20+
- Module format: ESM
- Source language: JavaScript with JSDoc
- Bundler: tsup
- Test runner: Vitest
- Lint/format requirements: no semicolons, no trailing commas

## Current Scope and Priorities

- Milestone one mirrors micnews/apple-news method scope:
  - readChannel
  - listSections
  - readSection
  - createArticle
  - readArticle
  - updateArticle
  - deleteArticle
  - searchArticles
- Auth/signing correctness is a high-priority risk area and should be validated with focused tests.
- Keep commits small and narrowly scoped to one concern.

## Implementation Conventions for Agents

- Preserve ESM style and Promise-based APIs.
- Use native fetch for HTTP requests.
- Prefer isolated modules for:
  - request signing and auth headers
  - transport and response parsing
  - multipart assembly
  - helper utilities
- Add tests for all non-trivial behavior before or with implementation changes.
- When changing signing behavior, include explicit canonical-input tests and known-signature fixtures.

## Decision Log

Update this section when architecture or behavior decisions change.

- 2026-04-03: Use class-based client API instead of factory API.
- 2026-04-03: Core bundle handling accepts buffers/file payloads; URL downloading is an optional helper.
- 2026-04-03: Use tsup for library builds.
- 2026-04-03: Add ESLint and Prettier rules enforcing no trailing commas and no semicolons.
- 2026-04-03: Co-locate tests with source modules under src using *.test.js naming.

## Reference Docs

- Product overview and package usage: see README.
- Apple News security model and API details: Apple Developer documentation.

## Boilerplate Rules

### File Placement & Session Hygiene

### Do Not Commit Session Artifacts

- Never commit temporary files created to complete a task (one-off test scripts, debug utilities, data migration scratch scripts, planning/summary markdown files, or files created only to help reason through work).
- If it was created for a single session and is not part of the product or long-term workflow, it must not be committed.

### Use /temp for Scratch Work

- Use a git-ignored /temp directory at the project root for one-off scripts, temporary documentation, scratch outputs, and debug artifacts.
- Nothing in /temp should be committed.
- If /temp does not exist, create it and add it to .gitignore.

### Long-Lived Scripts Go in /local/scripts

- Scripts intended for ongoing use (integration testing, setup, teardown, maintenance) belong in /local/scripts.
- Each script must include documentation: what it does, when to use it, how to run it, and any required environment variables or dependencies.
- If it does not need to exist long-term, it belongs in /temp.
- If /local/scripts does not exist, create it.
- Do not place project-specific scripts in /scripts (reserved for cross-project tooling in App Engine codebases).

### Documentation Placement

- Agent-specific workflow or operational guidance -> AGENTS.md
- Long-lived project documentation -> /docs
- Link relevant docs from AGENTS.md where appropriate.

### Keep AGENTS.md Up to Date

- After foundational or architectural changes, update AGENTS.md to reflect changes to architecture, conventions, and how agents should operate.
