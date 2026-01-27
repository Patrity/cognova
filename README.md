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
| Database | [Neon](https://neon.tech) (PostgreSQL) |
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

Visit `http://localhost:3000`

### Docker

```bash
# Copy and configure environment
cp .env.example .env

# Build and run
docker-compose up -d
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
| `DATABASE_URL` | No | Neon PostgreSQL URL (for tasks) |
| `GOTIFY_URL` | No | Gotify server for notifications |
| `GOTIFY_TOKEN` | No | Gotify app token |

### Reverse Proxy

This app is designed to sit behind a reverse proxy with authentication. It does **not** include built-in auth - handle that at your proxy layer (Nginx, Traefik, Cloudflare Access, Pangolin, etc).

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
| [data-models.md](./docs/data-models.md) | Database schema |
| [api.md](./docs/api.md) | REST and WebSocket API |
| [ui-wireframes.md](./docs/ui-wireframes.md) | Interface layouts |

## Status

This is an active personal project. Features are added as I need them. The core file browser, editor, and terminal are functional. Task management and notifications are in progress.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](./LICENSE)
