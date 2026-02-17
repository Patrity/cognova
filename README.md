# Second Brain

A personal knowledge management system with an embedded AI terminal. Built out of personal necessity to have a unified place for notes, tasks, and AI-assisted workflows accessible from anywhere.

## Why This Exists

I wanted a single web interface where I could:
- Browse and edit my markdown notes from any device
- Have Claude Code available in a terminal right next to my documents
- Track tasks across projects without context-switching
- Eventually integrate reminders and notifications

This is an opinionated tool built for my workflow, but open-sourced in case others find it useful or want to adapt it.

## Features

- **File Browser** - Navigate your vault with drag-drop, context menus, search
- **Markdown Editor** - WYSIWYG editing powered by TipTap via Nuxt UI
- **Embedded Terminal** - Claude Code CLI in a floating terminal panel
- **Task Management** - Track tasks with status, priority, and project tags
- **Dashboard** - Overview of recent activity and quick capture

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Nuxt 4](https://nuxt.com) |
| UI | [Nuxt UI v4](https://ui.nuxt.com) |
| Editor | TipTap (via UEditor) |
| Terminal | xterm.js + node-pty |
| Database | PostgreSQL (local Docker or [Neon](https://neon.tech)) |
| AI | [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm

### Development

```bash
# Clone the repo
git clone https://github.com/patrity/second-brain.git
cd second-brain

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
# Edit .env with your VAULT_PATH

# Start dev server
pnpm dev
```

Visit `http://localhost:3000`. On first startup with an empty database, a default admin user is created automatically:
- Email: `admin@example.com`
- Password: `changeme123`

Customize via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env` file.

#### With Local PostgreSQL

```bash
# Start postgres container
pnpm db:up

# Run dev server
pnpm dev

# Stop postgres when done
pnpm db:down
```

### Docker

```bash
# Copy and configure environment
cp .env.example .env

# Build and run (auto-detects local vs Neon)
pnpm docker:up

# Or manually:
# Local postgres: docker compose --profile local up -d
# Neon: docker compose up -d
```

The container:
- Mounts your vault directory (configurable via `VAULT_PATH`)
- Has Claude Code CLI pre-installed
- Optionally mounts `~/.claude` and `~/.anthropic` if you have existing config

To authenticate Claude Code, open the terminal in the app and run `claude auth`.

## Deployment

### Docker Compose (Recommended)

```yaml
services:
  second-brain:
    build: .
    container_name: second-brain
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ${VAULT_PATH:-~/vault}:/vault:rw
      - ${HOME}/.claude:/home/node/.claude:rw
      - ${HOME}/.anthropic:/home/node/.anthropic:ro
    environment:
      - VAULT_PATH=/vault
      - DATABASE_URL=${DATABASE_URL}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VAULT_PATH` | Yes | Path to your markdown vault |
| `DATABASE_URL` | No | PostgreSQL URL - local (`localhost:5432`) or Neon |
| `BETTER_AUTH_SECRET` | Yes | Secret key for session encryption (generate with `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Yes | Base URL of your app (e.g., `http://localhost:3000`) |
| `ADMIN_EMAIL` | No | Default admin email (default: `admin@example.com`) |
| `ADMIN_PASSWORD` | No | Default admin password (default: `changeme123`) |
| `ADMIN_NAME` | No | Default admin display name (default: `Admin`) |

### Authentication

This app uses [BetterAuth](https://better-auth.com) for session-based authentication.

**First-run setup:** When the database is empty, a default admin user is created automatically on startup:
- Default: `admin@example.com` / `changeme123`
- Customize via `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` in `.env`

**Manual user creation:** If needed, you can still create users manually:
```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword pnpm auth:create-admin
```

### Reverse Proxy

For production, this app should sit behind a reverse proxy (Nginx, Traefik, Cloudflare Access, etc.) for TLS termination and additional security layers.

### Platform Options

- **Coolify** - Connect repo, set env vars, deploy
- **Docker host** - `docker-compose up -d`
- **Bare metal** - `pnpm build && node .output/server/index.mjs`

## Security Warning

**This application provides full shell access through an embedded terminal.** Anyone with access to the web interface can execute arbitrary commands on your server.

Before deploying:

- **Never expose this directly to the internet** without authentication
- Use a reverse proxy with authentication (Nginx + basic auth, Cloudflare Access, Authelia, etc.)
- Consider running on a private network or VPN only
- The container mounts your vault directory with read/write access
- Claude Code, when authenticated, has access to your Anthropic API key and can make API calls

This is a power-user tool designed for personal use on trusted networks. If you don't understand the security implications of running a web-accessible terminal, this project may not be for you.

## Project Structure

```
second-brain/
├── app/
│   ├── components/     # Vue components
│   ├── composables/    # Shared logic
│   ├── layouts/        # Dashboard layout
│   └── pages/          # Route pages
├── server/
│   ├── api/            # REST endpoints
│   └── routes/         # WebSocket handlers
├── docs/               # Architecture docs
└── .claude/            # Claude Code skills & rules
```

## Documentation

| Document | Description |
|----------|-------------|
| [architecture.md](./docs/architecture.md) | System design and components |
| [ui-wireframes.md](./docs/ui-wireframes.md) | Interface layouts |

## Status

This is an active personal project. Features are added as I need them. The core file browser, editor, and terminal are functional. Task management and notifications are in progress.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](./LICENSE)
