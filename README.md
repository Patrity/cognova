# Cognova

Personal knowledge management system with an embedded AI terminal. Built for a unified place to manage notes, tasks, and AI-assisted workflows from any device.

> **Warning:** This application gives an AI agent unrestricted access to the host machine via an embedded terminal and the Claude Code CLI. It can read, write, and execute anything. **Do not run this on a personal machine or a server with sensitive data.** Deploy only in a sandboxed, isolated, or airgapped environment. See [Security](#security) for details.

## Features

- **File Browser** - Navigate your vault with drag-drop, context menus, search
- **Markdown Editor** - WYSIWYG editing powered by TipTap via Nuxt UI
- **Embedded Terminal** - Claude Code CLI in a floating terminal panel
- **Interactive Chat** - Conversational Claude interface with streaming, tool calls, and session history
- **Task Management** - Track tasks with status, priority, and project tags
- **Scheduled Agents** - Cron-based Claude agents with cost tracking and real-time status
- **Memory Dashboard** - View and manage Claude's memory context
- **Dashboard** - Overview of recent activity and quick capture
- **Custom Homepage** - Override the landing page by creating `index.md` in your vault
- **Public Document Sharing** - Share vault documents via unique link (no auth required)
- **Hook Events** - Monitor and review Claude Code hook activity

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Nuxt 4](https://nuxt.com) |
| UI | [Nuxt UI v4](https://ui.nuxt.com) |
| Editor | TipTap (via UEditor) |
| Terminal | xterm.js + node-pty |
| Database | PostgreSQL (local Docker or [Neon](https://neon.tech)) |
| AI | [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) |

## Installation

### Prerequisites

- Node.js 20+
- PostgreSQL (local Docker or hosted like [Neon](https://neon.tech))
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

### Install via CLI

```bash
# Install globally
npm install -g cognova

# Run the interactive setup wizard
cognova init
```

The setup wizard will:
1. Ask for your vault path (where your markdown files live)
2. Configure your database connection (local Docker or Neon)
3. Set up authentication secrets
4. Install dependencies and build the application
5. Start the app via PM2

Once running, visit `http://localhost:3000`.

### Managing the App

```bash
cognova start      # Start the app (PM2)
cognova stop       # Stop the app
cognova restart    # Restart the app
cognova update     # Update to the latest version (with automatic rollback)
cognova doctor     # Check health of all components
cognova reset      # Regenerate configuration files
```

### Default Admin User

On first startup with an empty database, a default admin user is created:
- Email: `admin@example.com`
- Password: `changeme123`

Customize via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your `.env` file.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VAULT_PATH` | Yes | Path to your markdown vault |
| `DATABASE_URL` | No | PostgreSQL URL (defaults to local Docker) |
| `BETTER_AUTH_SECRET` | Yes | Secret key for session encryption (generate with `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Yes | Base URL of your app (e.g., `http://localhost:3000`) |
| `ADMIN_EMAIL` | No | Default admin email (default: `admin@example.com`) |
| `ADMIN_PASSWORD` | No | Default admin password (default: `changeme123`) |
| `ADMIN_NAME` | No | Default admin display name (default: `Admin`) |

## Security

Cognova gives an AI agent (Claude Code) and any authenticated user **full, unrestricted access** to the host machine. This includes:

- Arbitrary command execution via the embedded terminal
- File system read/write through the vault mount and shell
- Network access from the host (API calls, outbound connections)
- Access to any credentials or secrets present on the machine

### Deployment Guidelines

- **Never run on a personal machine** — use a dedicated VM, container, or cloud instance
- **Isolate the environment** — sandbox or airgap the host so a compromised session can't reach sensitive infrastructure
- **Never expose directly to the internet** — always put a reverse proxy with TLS in front (Nginx, Traefik, Cloudflare Access, Tailscale, etc.)
- **Limit blast radius** — don't store SSH keys, cloud credentials, or production secrets on the same machine
- **Review agent activity** — use the Hook Events dashboard to monitor what Claude Code is doing

## Development

### Setup

```bash
git clone https://github.com/patrity/cognova.git
cd cognova
pnpm install
cp .env.example .env
# Edit .env with your VAULT_PATH and database config
```

### Local PostgreSQL

Docker Compose is used to run a local PostgreSQL instance for development:

```bash
# Start postgres
pnpm db:up

# Run dev server
pnpm dev

# Stop postgres when done
pnpm db:down
```

Alternatively, point `DATABASE_URL` at any PostgreSQL instance (hosted Neon, local install, etc.).

### Build

```bash
pnpm build
node .output/server/index.mjs
```

## Project Structure

```
cognova/
├── app/
│   ├── components/     # Vue components
│   ├── composables/    # Shared logic
│   ├── layouts/        # Dashboard, auth, view layouts
│   └── pages/          # Route pages
├── server/
│   ├── api/            # REST endpoints
│   ├── routes/         # WebSocket handlers
│   ├── services/       # Agent executor, cron scheduler
│   └── db/             # Drizzle schema + migrations
├── cli/                # CLI installer (cognova init/update/start/stop)
├── shared/             # Shared types and utilities
├── Claude/             # Claude Code skills, hooks, & config
└── docs/               # Architecture docs
```

## Documentation

| Document | Description |
|----------|-------------|
| [architecture.md](./docs/architecture.md) | System design and components |
| [ui-wireframes.md](./docs/ui-wireframes.md) | Interface layouts |

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - see [LICENSE](./LICENSE)
