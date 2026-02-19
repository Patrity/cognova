---
tags: []
shared: false
---
# Skills Ecosystem Expansion

## Context

The app has a working skills system (5 bundled skills, a skill-creator, shared `_lib/` Python client) but no way for users to browse, enable/disable, edit, or share skills through the UI. Secrets exist but aren't tightly enforced in system prompts. This plan covers three phases: (1) secrets hardening + secrets skill, (2) skills management page, (3) community skills library via GitHub repo.

---

## Phase 1: Secrets Hardening & Secrets Skill

### 1a. System prompt hardening

**Files to modify:**

- **`Claude/CLAUDE.md`** (lines 105-110) — Strengthen the existing "Secrets & Sensitive Data" section. Add: "When creating or modifying skills, NEVER embed API keys, tokens, or credentials in SKILL.md or Python scripts. Always use `get_secret()` from `_lib/api.py`."

- **`Claude/skills/skill-creator/SKILL.md`** — Add a prominent warning at the top of the Process section: "CRITICAL: Skills must NEVER contain hardcoded secrets. Always use `get_secret()`. If the user provides a key/token, store it via the secrets skill first, then reference it by key name."

- **`cli/src/templates/claude-md.ts`** — Add the secrets enforcement rule to the generated CLAUDE.md template so every new installation gets it.

### 1b. Secrets skill

Create `Claude/skills/secret/` with:

**`SKILL.md`:**
```yaml
---
name: secret
description: Manage encrypted secrets for API keys, tokens, and credentials. Use when the user needs to store, retrieve, list, or delete sensitive values.
allowed-tools: Bash, Read
version: "1.0.0"
requires-secrets: []
author: Cognova
---
```

Body instructs Claude on usage: `/secret list`, `/secret get KEY`, `/secret set KEY`, `/secret delete KEY`.

**`secret.py`:**
Python script using `_lib/api.py` with subcommands:
- `list` — `GET /api/secrets` → table of key, description, updated
- `get KEY` — `GET /api/secrets/{KEY}` → prints decrypted value
- `set KEY [--description DESC]` — Prompts for value via `--value`, calls `POST /api/secrets` or `PUT /api/secrets/{KEY}`
- `delete KEY` — `DELETE /api/secrets/{KEY}`

### 1c. Update SKILL.md frontmatter across all existing skills

Add new fields under `metadata:` in all bundled skills (`Claude/skills/*/SKILL.md`):

```yaml
metadata:
  version: "1.0.0"
  requires-secrets: []
  author: Cognova
  repository: ""
  installed-from: ""
```

> **Note:** Claude Code SKILL.md frontmatter only supports `name`, `description`, `compatibility`, `license`, `metadata` as top-level fields. Custom fields must be nested under `metadata:`.

### Phase 1 files

| File | Action |
|------|--------|
| `Claude/CLAUDE.md` | Strengthen secrets rules |
| `Claude/skills/skill-creator/SKILL.md` | Add secrets warning + new frontmatter |
| `Claude/skills/secret/SKILL.md` | New — secrets skill |
| `Claude/skills/secret/secret.py` | New — Python CLI for secrets CRUD |
| `Claude/skills/task/SKILL.md` | Add version/author/requires-secrets |
| `Claude/skills/project/SKILL.md` | Add version/author/requires-secrets |
| `Claude/skills/memory/SKILL.md` | Add version/author/requires-secrets |
| `Claude/skills/environment/SKILL.md` | Add version/author/requires-secrets |
| `cli/src/templates/claude-md.ts` | Add secrets enforcement to template |

---

## Phase 2: Skills Management Page

### 2a. Path utility + types

**`server/utils/skills-path.ts`** — New utility for `~/.claude/skills/` and `~/.claude/inactive-skills/`:
- `getSkillsDir()`, `getInactiveSkillsDir()`, `getSkillPath(name, active?)`
- `parseSkillFrontmatter(content: string): SkillMeta` — YAML frontmatter parser

**`shared/types/index.ts`** — Add:
```typescript
export interface SkillMeta {
  name: string
  description: string
  version: string
  author: string
  allowedTools: string[]
  requiresSecrets: string[]
  repository: string
  installedFrom: string
  disableModelInvocation: boolean
  userInvocable: boolean
  context: string
  agent: string
}

export interface SkillListItem {
  name: string
  description: string
  version: string
  author: string
  active: boolean
  core: boolean
  allowedTools: string[]
  requiresSecrets: string[]
  installedFrom: string
  fileCount: number
}

export interface SkillFile {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: SkillFile[]
}
```

### 2b. Skills API endpoints

Operate on `~/.claude/skills/` and `~/.claude/inactive-skills/` (NOT the vault — separate from `validatePath()`).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/skills` | GET | List all skills (active + inactive), parse SKILL.md frontmatter |
| `/api/skills/[name]` | GET | Skill details + file tree |
| `/api/skills/[name]/toggle` | POST | Move between `skills/` ↔ `inactive-skills/` |
| `/api/skills/[name]/rename` | POST | Rename skill directory + update SKILL.md name |
| `/api/skills/[name]/files` | GET | List files in skill directory |
| `/api/skills/[name]/files/read` | POST | Read a file from skill directory |
| `/api/skills/[name]/files/write` | POST | Write a file in skill directory |
| `/api/skills/create` | POST | Create blank skill (mkdir + empty SKILL.md) |
| `/api/skills/generate` | POST | Agent-created skill (one-off SDK call) |

**Core skills** (non-toggleable): `['memory', 'task', 'project', 'secret', 'environment']`

### 2c. Agent-created skills

**`POST /api/skills/generate`** — New endpoint:

Request: `{ name: string, description: string }`

1. Create skill dir in `~/.claude/inactive-skills/{name}/` (inactive until reviewed)
2. Run one-off SDK call (same pattern as `chat-session-manager.ts`):
   - System prompt: skill-creation instructions + secrets rules + references to existing skills
   - `cwd`: the new skill directory
   - `maxTurns: 30`, `maxBudgetUsd: 0.50`
3. **Log token usage** via `logTokenUsage({ source: 'agent', sourceName: 'Skill Generator', ... })`
4. Return `{ name, path }` so UI can navigate to editor

### 2d. Components — `app/components/skills/`

| File | Template Name | Purpose |
|------|---------------|---------|
| `Card.vue` | `<SkillsCard>` | Skill card (name, description, toggle, status) |
| `CreateModal.vue` | `<SkillsCreateModal>` | Blank vs agent-generated, name/description input |
| `RenameModal.vue` | `<SkillsRenameModal>` | Rename skill modal |
| `FileTree.vue` | `<SkillsFileTree>` | File tree scoped to skill directory |
| `Editor.vue` | `<SkillsEditor>` | Wraps existing `EditorCodeEditor` (CodeMirror) |

### 2e. Pages

**`app/pages/skills/index.vue`** — Skills list:
- Navbar: "Skills" + "Create Skill" button
- Grid of `SkillsCard` components
- Toggle switch on each card (disabled for core)
- Search/filter bar

**`app/pages/skills/[name].vue`** — Skill editor:
- Two-panel (like docs page): file tree left, CodeMirror right
- Navbar: skill name, enable/disable toggle, rename button
- Auto-detect language from extension (`.py` → python, `.md` → markdown)
- Save writes via `/api/skills/{name}/files/write`

### 2f. Navigation

Add to `app/layouts/dashboard.vue` sidebar (after Hooks, before Memories):
```typescript
{ label: 'Skills', icon: 'i-lucide-puzzle', to: '/skills' }
```

### Phase 2 files

| File | Action |
|------|--------|
| `shared/types/index.ts` | Add skill types |
| `server/utils/skills-path.ts` | New — path helpers + frontmatter parser |
| `server/api/skills/index.get.ts` | New — list skills |
| `server/api/skills/[name]/index.get.ts` | New — skill details |
| `server/api/skills/[name]/toggle.post.ts` | New — enable/disable |
| `server/api/skills/[name]/rename.post.ts` | New — rename |
| `server/api/skills/[name]/files/index.get.ts` | New — list files |
| `server/api/skills/[name]/files/read.post.ts` | New — read file |
| `server/api/skills/[name]/files/write.post.ts` | New — write file |
| `server/api/skills/create.post.ts` | New — create blank skill |
| `server/api/skills/generate.post.ts` | New — agent-generated skill |
| `app/components/skills/Card.vue` | New |
| `app/components/skills/CreateModal.vue` | New |
| `app/components/skills/RenameModal.vue` | New |
| `app/components/skills/FileTree.vue` | New |
| `app/components/skills/Editor.vue` | New |
| `app/pages/skills/index.vue` | New — skills list |
| `app/pages/skills/[name].vue` | New — skill editor |
| `app/layouts/dashboard.vue` | Add Skills nav link |

---

## Phase 3: Community Skills Library

### 3a. Repository structure (`cognova-skills` on GitHub)

```
cognova-skills/
├── registry.json              # Auto-maintained catalog of all skills
├── CONTRIBUTING.md            # Submission guidelines
├── .github/workflows/
│   └── validate.yml           # CI: validate structure, regen registry.json
├── weather/
│   ├── SKILL.md
│   └── weather.py
├── github-issues/
│   ├── SKILL.md
│   └── github-issues.py
└── ...
```

**`registry.json`:**
```json
[
  {
    "name": "weather",
    "description": "Get weather forecasts for any location",
    "version": "1.0.0",
    "author": "username",
    "requiresSecrets": ["OPENWEATHER_API_KEY"],
    "files": ["SKILL.md", "weather.py"],
    "updatedAt": "2026-02-18T00:00:00Z"
  }
]
```

**CI (`validate.yml`):**
- Validates SKILL.md has required frontmatter (name, description, version, author)
- Regex scan for hardcoded secrets patterns
- Regenerates `registry.json` on merge to main

### 3b. Database — Skills catalog cache

**`server/db/schema.ts`** — New `skillsCatalog` table:
```typescript
export const skillsCatalog = pgTable('skills_catalog', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  version: text('version').notNull(),
  author: text('author').notNull(),
  requiresSecrets: text('requires_secrets').array().default([]),
  files: text('files').array().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull()
})
```

### 3c. Nitro plugin — Registry sync

**`server/plugins/05.skills-catalog.ts`:**
- On startup (10s delay) + every 30 minutes via `setInterval`
- Fetches `registry.json` from GitHub raw content
- Upserts into `skills_catalog` table
- Graceful failure: logs warning, uses cached data

### 3d. Library API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/skills/library` | GET | List all library skills from DB cache |
| `/api/skills/library/install` | POST | Fetch files from GitHub, write to `~/.claude/skills/` |
| `/api/skills/library/check-updates` | GET | Compare installed versions vs catalog |

**Install flow:**
1. Look up skill in `skills_catalog`
2. For each file, fetch from `https://raw.githubusercontent.com/OWNER/cognova-skills/main/{name}/{file}`
3. Write to `~/.claude/skills/{name}/`
4. Inject `installed-from: "cognova-skills"` into SKILL.md frontmatter

**Check updates flow:**
1. Read all installed skills' `installed-from` + `version` fields
2. Compare against `skills_catalog` versions
3. Return `{ updates: [{ name, installed, latest }] }`

### 3e. Library page

**`app/components/skills/LibraryCard.vue`** — Library card with install/update button, required secrets list.

**`app/pages/skills/library.vue`:**
- Grid of community skills
- Install button per skill
- "Installed" badge + "Update" button for version mismatches
- Search bar
- Required secrets shown with warning if not configured

### Phase 3 files

| File | Action |
|------|--------|
| `server/db/schema.ts` | Add `skillsCatalog` table |
| `server/plugins/05.skills-catalog.ts` | New — periodic registry sync |
| `server/api/skills/library/index.get.ts` | New — list library skills |
| `server/api/skills/library/install.post.ts` | New — install from repo |
| `server/api/skills/library/check-updates.get.ts` | New — version check |
| `app/components/skills/LibraryCard.vue` | New |
| `app/pages/skills/library.vue` | New — library browser |

---

## Implementation Order

1. **Phase 1** — Secrets hardening (prerequisite for skill creation safety)
2. **Phase 2** — Skills management UI (core feature)
3. **Phase 3** — Library (depends on Phase 2 + external repo)

## Verification

**Phase 1:** `/secret list` shows secrets, `/secret set TEST_KEY --value hello` creates one, all SKILL.md files have new frontmatter, CLAUDE.md has strengthened secrets language.

**Phase 2:** `/skills` shows grid, toggle moves skills between dirs, create blank skill works, agent-generated skill creates in inactive dir, editor loads/saves files with CodeMirror.

**Phase 3:** Server fetches registry.json on start, `/skills/library` shows community skills, install downloads files, update detection works.
