# Phase 4: Agent Management & Knowledge Editor

**Goal:** Users can install agents, configure them via generated forms, and edit knowledge files in-browser.

**Status:** Not started
**Depends on:** Phase 3

---

## Tasks

### 4.1 Agent Installer
- [ ] Create `server/agents/installer.ts`
  - `installAgent(source)` — source is GitHub repo URL (`author/repo`) or local path
  - GitHub install: clone repo into local agents directory (e.g. `~/.cognova/agents/`)
  - Local path: register path in DB (symlink or direct reference)
  - Parse manifest.yaml from agent directory
  - Extract config.schema.json if present
  - Run `pnpm install` inside agent directory if it has a package.json
  - Copy default knowledge files to ~/knowledge/[agent-id]/
  - Create `installed_agents` record (repoUrl or localPath, manifestJson, configSchemaJson, enabled)
  - `uninstallAgent(id)` — remove cloned directory, DB record, optionally knowledge files
  - `updateAgent(id)` — `git pull` in cloned repo, re-parse manifest
- [ ] API: `server/api/agents/install.post.ts`
- [ ] API: `server/api/agents/[id]/uninstall.post.ts`
- [ ] API: `server/api/agents/[id]/update.post.ts`

### 4.2 Agent CRUD
- [ ] API: `server/api/agents/index.get.ts` — list installed agents
- [ ] API: `server/api/agents/[id].get.ts` — get agent details
- [ ] API: `server/api/agents/[id].put.ts` — update (enable/disable)
- [ ] API: `server/api/agents/[id]/config.get.ts` — get agent config for current user
- [ ] API: `server/api/agents/[id]/config.put.ts` — save agent config

### 4.3 Agents Page (`/agents`)
- [ ] Create `app/pages/agents/index.vue`
- [ ] Card grid of installed agents
- [ ] Each card: name, description, version, status badge, source (GitHub/local)
- [ ] Enable/disable toggle per agent
- [ ] Configure button → /agents/[id]
- [ ] Install button → modal: enter GitHub repo (`author/repo`) or local path
- [ ] Update button (git pull latest)
- [ ] Uninstall with confirmation dialog

### 4.4 Agent Config Page (`/agents/[id]`)
- [ ] Create `app/pages/agents/[id].vue`
- [ ] Agent detail header (name, version, description, source)
- [ ] Generated config form from config.schema.json (flat schemas only)
- [ ] JSON Schema → form field mapping:
  - `string` → UInput
  - `string` + `format: "password"` → UInput type=password (stored encrypted)
  - `number` / `integer` → UInput type=number
  - `boolean` → UToggle
  - `string` + `enum` → USelect
  - `array of strings` → tag input or repeatable UInput
- [ ] `x-cognova-group` → group fields under section headers
- [ ] `description` → field help text
- [ ] `default` → pre-filled values
- [ ] Validate against schema before save
- [ ] Support per-user config (uses userId) and global config (userId = null, admin only)
- [ ] Create `app/composables/useJsonSchemaForm.ts` — schema-to-form mapper

### 4.5 Knowledge Editor (`/knowledge`)
- [ ] Create `app/pages/knowledge.vue`
- [ ] File browser sidebar: tree view of ~/knowledge/
  - Grouped by agent subdirectory
  - File icons by type (yaml, json, md)
  - Create file, rename, delete
- [ ] Editor area:
  - Markdown files: TipTap prose editor (Nuxt UI integration)
  - YAML/JSON files: monospace textarea with syntax highlighting
  - Large file warning (> 1MB)
- [ ] Share button per file: toggle public, copy public URL (uses shared_documents table)
- [ ] API: `server/api/knowledge/tree.get.ts` — directory listing
- [ ] API: `server/api/knowledge/file.get.ts` — read file content
- [ ] API: `server/api/knowledge/file.put.ts` — write file content
- [ ] API: `server/api/knowledge/file.post.ts` — create file
- [ ] API: `server/api/knowledge/file.delete.ts` — delete file
- [ ] Path security: validate all paths stay within ~/knowledge/
- [ ] Save triggers chokidar watcher automatically (no manual reload)

### 4.6 Agent Selector Enhancement
- [ ] Update `app/components/chat/AgentSelector.vue`
- [ ] Populated from installed agents (enabled only)
- [ ] Shows agent icon/avatar, name, short description
- [ ] Default agent pre-selected (no auto-classification)
- [ ] Persist selected agent per conversation

---

## Acceptance Criteria

1. User can install an agent from GitHub repo URL
2. User can install an agent from local path
3. Installed agents appear in agent list
4. Agent can be updated (git pull)
5. Agent config form generated correctly from JSON Schema
6. Config saved per-user in database
7. Knowledge editor shows file tree for ~/knowledge/
8. Knowledge files can be shared publicly via share button
9. Editing a knowledge file updates the agent's context on next request
10. Agent can be enabled/disabled
11. Agent can be uninstalled (with confirmation)
