# Cognova

Self-hosted, multi-tenant AI agent hub built with Nuxt 4, Nuxt UI v4, AI SDK v6, PostgreSQL, and better-auth.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env — generate secrets:
#   openssl rand -base64 32   (for NUXT_BETTER_AUTH_SECRET)
#   openssl rand -hex 32      (for NUXT_ENCRYPTION_KEY)

# 3. Start PostgreSQL
pnpm db:up

# 4. Push schema to database
pnpm db:push

# 5. Start dev server
pnpm dev
```

The app starts at `http://localhost:3000`. An admin user is created automatically on first boot using the credentials in `.env` (defaults to `admin@example.com` / `changeme123`).

## Scripts

### Development

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Nuxt dev server with HMR |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Run ESLint with auto-fix |

### Database

| Command | Description |
|---------|-------------|
| `pnpm db:up` | Start PostgreSQL via Docker Compose |
| `pnpm db:down` | Stop PostgreSQL |
| `pnpm db:push` | Push schema directly to database (dev) |
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate` | Run pending migrations (production) |
| `pnpm db:studio` | Open Drizzle Studio in browser |

### Common Workflows

**Fresh setup / reset database:**
```bash
pnpm db:down
docker volume rm cognova-pgdata
pnpm db:up
pnpm db:push
```

**After pulling schema changes:**
```bash
pnpm db:push        # dev — applies schema diff directly
# or
pnpm db:migrate     # production — runs migration files
```

**After changing a schema file:**
```bash
pnpm db:generate    # creates migration in server/db/migrations/
pnpm db:push        # apply to local dev database
```

## Environment Variables

All server-side env vars use the `NUXT_` prefix for automatic mapping to Nuxt runtime config.

### Required

| Variable | Description |
|----------|-------------|
| `NUXT_DATABASE_URL` | PostgreSQL connection string |
| `NUXT_BETTER_AUTH_SECRET` | Auth session secret (generate with `openssl rand -base64 32`) |
| `NUXT_BETTER_AUTH_URL` | Base URL of the application |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `NUXT_ADMIN_EMAIL` | `admin@example.com` | Initial admin user email |
| `NUXT_ADMIN_PASSWORD` | `changeme123` | Initial admin user password |
| `NUXT_ADMIN_NAME` | `Admin` | Initial admin user display name |
| `NUXT_KNOWLEDGE_PATH` | `~/knowledge` | Path to knowledge files directory |
| `NUXT_ENCRYPTION_KEY` | — | AES-256 key for encrypting secrets (generate with `openssl rand -hex 32`) |

## Project Structure

```
cognova/
├── app/                        # Nuxt 4 frontend source
│   ├── assets/css/             # Tailwind + Nuxt UI styles
│   ├── components/             # Vue components (auto-imported)
│   ├── composables/            # Client composables (useAuth, etc.)
│   ├── layouts/                # default (dashboard), auth, public
│   ├── middleware/             # Client route guards
│   ├── pages/                  # File-based routing
│   ├── app.vue                 # Root component
│   └── app.config.ts           # Nuxt UI theme config
├── server/                     # Nitro server
│   ├── api/                    # API routes (*.get.ts, *.post.ts, etc.)
│   ├── db/                     # Drizzle ORM
│   │   ├── schema/             # Table definitions
│   │   ├── migrations/         # Generated migrations
│   │   └── index.ts            # Connection singleton
│   ├── middleware/             # Server middleware (auth)
│   ├── plugins/                # Startup plugins (env, db, admin seed)
│   └── utils/                  # Server utilities (auth, encryption)
├── shared/                     # Shared between frontend and server
│   └── types/                  # TypeScript types (inferred from Drizzle)
├── docs/                       # PRD, phase plans, progress tracker
├── nuxt.config.ts
├── drizzle.config.ts
├── docker-compose.yml
└── .env.example
```

## Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com/) with Node.js server preset
- **UI**: [Nuxt UI v4](https://ui.nuxt.com/) (dashboard components, forms, theming)
- **Database**: PostgreSQL 16 via [Drizzle ORM](https://orm.drizzle.team/) with node-postgres
- **Auth**: [better-auth](https://www.better-auth.com/) (email/password, session management)
- **AI**: AI SDK v6 (planned — Phase 3)
