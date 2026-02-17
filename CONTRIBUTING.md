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

## Questions?

Open an issue or start a discussion. I'll respond when I can.
