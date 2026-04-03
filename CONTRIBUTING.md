# Contributing

Thanks for your interest in contributing to this project.

## Getting Started

1. Fork the repository and create a feature branch from `main`.
2. Use Node.js 24 locally (`nvm use` reads from `.nvmrc`).
3. Install dependencies:

```bash
npm install
```

## Development Workflow

Run checks before opening a pull request:

```bash
npm run lint
npm run test
npm run coverage
npm run build
```

## Coding Standards

- JavaScript only (ESM + JSDoc)
- No semicolons
- No trailing commas
- Prefer small, focused commits
- Add tests for all non-trivial logic
- Keep tests co-located with modules under `src` using `*.test.js`

## Pull Request Expectations

- Explain what changed and why.
- Link related issues if applicable.
- Keep scope tight; avoid mixing unrelated changes.
- Update docs when behavior or public API changes.

## Commit Guidance

Use clear, scoped commit messages. Examples:

- `feat(client): add section search filters`
- `fix(auth): correct canonical payload for POST`
- `docs: clarify updateArticle revision usage`

## Reporting Bugs

Please use the bug report issue template and include:

- Reproduction steps
- Expected behavior
- Actual behavior
- Node version
- Package version

## Questions

Open a discussion or issue if you are unsure before implementing larger changes.

## Releases

This project uses GitHub Releases with auto-generated release notes.

Release flow:

1. Ensure `main` is green (CI passing).
2. Create and push a version tag in semver format, such as `v0.1.0`:

```bash
git tag v0.1.0
git push origin v0.1.0
```

3. The `release.yml` workflow creates the GitHub Release and generates notes from merged pull requests.

You can also run the Release workflow manually from the Actions tab by providing a tag.
