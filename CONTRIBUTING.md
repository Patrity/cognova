# Contributing to Cognova

Thanks for considering contributing! This is a personal project that I've open-sourced, so contributions are welcome but the scope is intentionally limited to my use cases.

## Ways to Contribute

### Bug Reports

Found a bug? Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, browser)

### Feature Requests

Open an issue describing:
- What you want to accomplish
- Why existing features don't solve it
- Any implementation ideas you have

Note: This is an opinionated tool for my workflow. Features that don't align with the project's direction may be declined, but forks are encouraged.

### Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run linting (`pnpm lint`)
5. Run type checking (`pnpm typecheck`)
6. Commit with clear messages
7. Open a PR against `main`

## Development Setup

```bash
git clone https://github.com/patrity/cognova.git
cd cognova
pnpm install
cp .env.example .env
# Edit .env with your VAULT_PATH

# Start local postgres (requires Docker)
pnpm db:up

# Start dev server
pnpm dev

# Run linting
pnpm lint

# Type check
pnpm typecheck

# Build for production
pnpm build
```

## Code Style

- TypeScript with strict mode
- No semicolons
- Single-line if/else when body is one line
- Vue 3 Composition API with `<script setup>`
- Follow existing patterns in the codebase

ESLint handles most formatting - just run `pnpm lint` before committing.

## Project Structure

```
app/
├── components/    # Vue components, organized by feature
├── composables/   # Shared reactive logic
├── layouts/       # Page layouts
└── pages/         # File-based routing

server/
├── api/           # REST endpoints (Nitro)
└── routes/        # WebSocket handlers
```

## Commit Messages

Keep them concise and descriptive:
- `fix: resolve editor crash on empty files`
- `feat: add file search to tree`
- `docs: update deployment guide`

## Releasing (Maintainers)

Cognova is published to npm. Users install and update via the CLI (`cognova init`, `cognova update`).

### Version Bump + Publish

```bash
# 1. Bump version — creates a git commit and tag automatically
npm version patch   # 0.1.0 → 0.1.1 (bug fixes)
npm version minor   # 0.1.0 → 0.2.0 (new features)
npm version major   # 0.1.0 → 1.0.0 (breaking changes)

# 2. Build the app and CLI (app output ships pre-built in the package)
pnpm build
pnpm cli:build

# 3. Verify
npm pack --dry-run
node dist/cli/index.js --help
node dist/cli/index.js --version

# 4. Publish to npm
npm publish

# 5. Push commit + tag
git push && git push --tags
```

### How Users Get Updates

When a user runs `cognova update`, the CLI:
1. Checks `npm view cognova version` for the latest published version
2. Downloads the new package via `npm pack`
3. Backs up the current install (automatic rollback on failure)
4. Copies pre-built app + source files, reinstalls deps, runs migrations
5. Restarts the app via PM2

### Pre-publish Checklist

- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds (app output ships in the package)
- [ ] `pnpm cli:build` succeeds
- [ ] `node dist/cli/index.js --help` shows correct output
- [ ] `npm pack --dry-run` includes expected files (including `.output/`)
- [ ] Version in `package.json` matches the intended release

## Questions?

Open an issue or start a discussion. I'll respond when I can.
