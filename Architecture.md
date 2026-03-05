# Cognova — Architecture & Decision Handoff

> This document is a first-pass handoff from an initial planning session. You (Claude Code /
> Opus) should read `../second-brain` in full before starting implementation. Use this doc
> for decisions already made, known constraints, and context on why things are the way they
> are. Ask clarifying questions before writing code. Trust the existing codebase over anything
> described here if they conflict.

---

## What Cognova Is

A self-hosted, multi-tenant AI agent hub. Users install domain-specific agents, configure
them via a generated UI form, and chat with them. Agents are modular packages — they ship
with their own tools, knowledge files, and a config schema. The framework handles auth,
model routing, knowledge loading, streaming, and MCP exposure.

This is a ground-up rewrite of `../second-brain`. The previous version used Claude Code CLI
as its agent execution engine (subprocesses calling the CLI). That architecture hit a hard
wall — tool calling was unreliable, local model support was impossible, and every new feature
deepened the coupling. This version uses AI SDK v6 as the execution foundation.

---

## Repo Context

- This repo: `./cognova` — Nuxt UI starter, nearly empty, start here
- Reference repo: `../second-brain` — previous implementation, read freely, copy and adapt
  as needed, do not import from it
- Knowledge directory: `~/knowledge/` — lives outside both repos on the host filesystem

---

## Decisions Made (Non-Negotiable)

These were explicitly decided during planning. Do not revisit without asking.

| Decision | Choice |
|----------|--------|
| Framework | Nuxt 4, `node-server` preset only |
| UI library | Nuxt UI v4 |
| AI execution | AI SDK v6 (`streamText`, `generateText`, tool loop) |
| Database | PostgreSQL via Drizzle ORM |
| Auth | better-auth, multi-user, admin + user roles, API key plugin |
| Package manager | pnpm |
| Knowledge storage | `~/knowledge/` on host filesystem, hot-watched with chokidar |
| Agent config storage | PostgreSQL — rendered as a generated form in the UI |
| Agent registry | Self-hosted (cognova's own DB + registry API, bootstrapped from a GitHub JSON file similar to the `cognova-skills` registry pattern in second-brain) |
| Process management | Global npm package with a CLI (`cognova init`, `cognova start`, `cognova update`) — reference the existing CLI in `../second-brain/cli/` |
| Language | TypeScript throughout |

---

## AI Provider Strategy

### The hierarchy

This distinction matters and was a source of confusion in the v1 implementation.
There are three distinct levels:

```
Provider Type     the AI SDK package that handles this class of provider
  └── Provider    a user-configured instance (baseURL, API key, name)
        └── Model a specific model ID available on that provider instance
```

For example: vLLM and LiteLLM are both **instances** of the `openai-compatible` provider
type. They use the same AI SDK package (`@ai-sdk/openai-compatible`) but have different
`baseURL` values and potentially different models available on each. A user could have
both running simultaneously.

### Provider types (shipped with cognova)

| Type ID | AI SDK Package | Examples |
|---|---|---|
| `openai-compatible` | `@ai-sdk/openai-compatible` | vLLM, LiteLLM, Ollama, any OpenAI-compat endpoint |
| `anthropic` | `@ai-sdk/anthropic` | Anthropic API |
| `openai` | `@ai-sdk/openai` | OpenAI API |
| `claude-code` | community-maintained adapter | Claude Code CLI (self-hosted users) |

Provider types are the extensibility point — community members can add new types.

### DB shape

```
provider_types   id, name, aiSdkPackage, configSchema (JSON Schema drives the add-provider form)
    ↓
providers        id, typeId, name, configJson (baseURL, apiKey, etc. — encrypted)
    ↓
models           id, providerId, modelId (string passed to SDK), displayName, tags
```

Tags on models are how agent manifests express preferences — e.g. `['coding', 'local']`,
`['fast']`, `['frontier']`. The framework resolves an agent's declared capability tags
against the models configured in the instance.

### getModel() contract

Takes a model DB record (or tag query), walks up to its provider and provider type,
instantiates the correct AI SDK client with that provider's config, and returns a
`LanguageModel`. Agents never call this directly — the framework calls it on their behalf.

### Claude Code adapter note

The Claude Code CLI adapter is a valid provider for self-hosted users who want to route
through it. It is listed and configured exactly like any other provider type. What
second-brain did that we are moving away from is using Claude Code CLI as the **agent
engine** — spawning subprocesses for every agent interaction. That pattern is replaced
by AI SDK v6 tool loops. The provider adapter is a different thing entirely.

---

## The Agent Package Contract

This is the most important interface to get right early. Everything else depends on it.

An agent is a self-contained directory installable as an npm package. It exports a single
`createAgent(config, context)` function that returns a `CognovaAgent`. The framework calls
this at runtime — agents never touch auth, streaming, model selection, or DB directly.

Key properties of this contract:

- **Config isolation**: agent config values come through `context.getConfig()`, never from
  env vars. This enables per-user config in multi-tenant deployments.
- **Knowledge isolation**: agents never read `~/knowledge/` directly. They receive a
  `context.knowledge` object that the framework populates from the knowledge loader.
- **Model isolation**: agents declare a preference; `getModel()` resolves it. An agent that
  says `preferred: 'local'` will transparently fall back to frontier if no local model is
  configured.
- **Tool portability**: tools are standard AI SDK v6 `tool()` definitions with Zod schemas.
  They work identically regardless of which underlying model is selected.

### Agent directory structure

```
cognova-agent-[name]/
  manifest.yaml          <- identity, keywords, model preference, capabilities
  index.ts               <- exports createAgent(config, context): CognovaAgent
  config.schema.json     <- optional JSON Schema draft-07, drives settings form
  tools/                 <- tool modules
  knowledge/             <- default knowledge files, copied to ~/knowledge/[id]/ on install
  README.md              <- required for registry submission
```

### manifest.yaml key fields

```yaml
id: cognova-agent-example
name: Example Agent
version: 1.0.0
keywords: [...]           # used by intent classifier for auto-routing
model:
  preferred: local        # local | frontier | any
  fallbackToFrontier: true
capabilities: [...]       # declarative, used by UI and MCP
knowledge: [...]          # filenames to copy to ~/knowledge/[id]/ on install
configSchema: ./config.schema.json
```

### config.schema.json

Standard JSON Schema draft-07. Cognova renders a settings form from this automatically.
Use "format": "password" for sensitive values (stored encrypted in DB).
Use "x-cognova-group" for grouping fields in the UI.

---

## Knowledge Architecture

```
~/knowledge/
├── _system/              <- reserved
└── [agent-id]/           <- one directory per installed agent
    ├── schema.json        <- generated (e.g. by DBML parser scripts)
    ├── relationships.yaml <- curated logical relationships
    ├── glossary.yaml      <- domain terminology
    ├── formulas.yaml      <- business rules / calculation logic
    └── *.yaml / *.json    <- anything else, available in context.knowledge.custom
```

Files are hot-watched with chokidar. On change, the framework invalidates only the affected
agent's cache. Next request re-loads from disk. No restart required.

The knowledge editor in the UI (/knowledge page) allows browsing and editing these files
directly. Markdown files use the Nuxt UI v4 prose editor (TipTap-based). YAML/JSON files
use a monospace textarea. Save triggers the watcher automatically.

---

## Intent Classifier

No LLM call for routing — keyword matching against agent manifests in the DB.

A message scores against each installed agent's keyword list. If hit count >= 2, route to
that agent. If no clear winner, fall back to the general agent.

The UI exposes an agent selector so users can manually pin to a specific agent, bypassing
the classifier entirely. The pinned agent ID is sent with each message.

---

## Database Tables (Additive to second-brain)

Second-brain already has the auth tables (users, sessions, accounts, verifications) and
tasks table via better-auth + Drizzle. Copy those patterns directly.

New tables needed for cognova:

- `provider_types` — built-in registry of supported AI SDK packages and their config schemas
- `providers` — user-configured instances (a vLLM endpoint, an Anthropic key, etc.)
- `models` — specific model IDs available on a provider, with capability tags
- `installed_agents` — manifest JSON, config schema JSON, enabled/disabled, built-in flag
- `agent_configs` — agentId + userId (nullable for global) + configJson, unique constraint
- `conversations` — userId, agentId, title
- `messages` — conversationId, role, content, toolCallsJson
- `registry_cache` — pulled from external registry JSON, cached locally
- `app_settings` — key/value for global app configuration

---

## What to Salvage from second-brain

Read the full codebase first. Known candidates:

- better-auth setup and DB tables — copy directly
- Task DB schema + API endpoints — copy and adapt
- Tasks UI page — copy and adapt
- File browser component (vault) — adapt for knowledge editor
- CLI (../second-brain/cli/) — reference closely, this becomes the cognova CLI
- Docker compose — adapt
- Drizzle config pattern — copy
- Streaming chat endpoint — adapt to AI SDK v6 (the pattern exists, the provider wiring differs)

The Skills system in second-brain (markdown files with YAML frontmatter, community registry,
enable/disable UI) is the direct predecessor of the Agent system. The agent manifest format
was designed to feel familiar to skill authors. Read the skills implementation carefully
before designing the agent loader.

---

## Known Constraints

- node-server preset only — no edge, no serverless, no Vercel. The app uses the filesystem
  (~/knowledge/), long-running connections (MCP SSE), and chokidar. None of these work
  on edge runtimes.
- The knowledge editor must handle large YAML files gracefully (some schema files will be
  several thousand lines).
- Agent install must support both npm package sources and local filesystem paths
  (file:///path/to/agent) for private agents that never touch the registry.
- Multi-tenant readiness: every user-scoped DB record needs a userId FK now, even if
  single-user is the initial target. Adding it later is a painful migration.

---

## Known Future Work (Not in Scope for Initial Build)

- Mem0 integration for persistent agent memory across sessions
- Scheduled agents (cron-based) — second-brain has this, port it later
- Hook events dashboard — second-brain has this, not a priority
- Cloud/SaaS tier — architecture should support it (userId on all records, knowledge loader
  abstraction) but don't build it yet
- MCP server — Phase 6, after core agent runtime is solid

---

## Phased Build Order

These phases were decided. The ordering matters — each phase's output is the foundation
for the next.

1. Foundation — DB schema, auth, Drizzle, app shell, login. App boots, users can log in.
2. Agent runtime — types, knowledge loader, classifier, general agent, chat endpoint,
   basic chat UI. End-to-end streaming chat works.
3. Agent management UI — install agents, configure via generated form, knowledge editor.
4. Tasks + example agent — task tools in general agent, tasks page, fully-commented
   example agent package for community authors.
5. Registry — browse, install, submit. Bootstrapped from GitHub JSON.
6. MCP server — expose task, memory, knowledge, and agent tools via MCP SSE.