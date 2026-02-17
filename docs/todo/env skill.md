---
tags: []
shared: false
---
# Secrets Skill & Memory Reinforcement

## Overview

Two related improvements to make the agent safer and smarter:

1. **Secrets Skill** — Give agents a way to securely access stored secrets at runtime without ever seeing or storing plain-text values
2. **Memory Reinforcement** — Strengthen system prompts and hooks so agents use the memory system aggressively, not as an afterthought

## Problem

### Secrets

The secrets infrastructure exists (encrypted DB storage, settings UI, CRUD API) but agents have no safe way to _use_ them. If an agent needs a token for an integration, it has to either:
- Ask the user to paste it (ends up in conversation transcript, hook extractions, memory)
- Read it from `.env` (plain text on disk)

There's no skill that says "get me the value of `GITHUB_TOKEN` securely." The risk: sensitive values leak into memory chunks, JSONL transcripts, or auto-extracted memories.

### Memory

The memory system works (hooks extract, session-start injects, skill stores/searches), but agents don't lean on it enough. The CLAUDE.md mentions memory in a few bullet points, but doesn't establish it as a core workflow habit. Agents should:
- **Always** check memory before starting significant work
- **Always** store decisions and outcomes after completing work
- **Never** re-discover things they've already learned

## Part 1: Secrets Skill

### New Skill: `/secrets`

Create `Claude/skills/secrets/` with a Python skill that wraps the existing API.

**Commands:**

| Command | Description |
|---------|-------------|
| `secrets list` | List available secret keys (names + descriptions only, never values) |
| `secrets get <KEY>` | Retrieve a decrypted value for use in the current operation |
| `secrets set <KEY> <VALUE>` | Store a new secret (encrypts via API) |
| `secrets delete <KEY>` | Remove a secret |

**Critical Constraint:** The `get` command returns the decrypted value so the agent can use it (e.g., in a curl header), but the agent must be instructed via SKILL.md to:
- Never store the value in memory
- Never echo it to the user
- Never write it to a file
- Only use it inline in the immediate operation

### API Changes

The current secrets API (`server/api/secrets/`) never returns decrypted values. We need one new endpoint:

**`GET /api/secrets/:key/value`**
- Returns `{ value: string }` (decrypted)
- Requires API token auth (same as other skill endpoints)
- This is intentionally restricted to server-side/skill access — the frontend settings UI should never show values

### SKILL.md

```
Never log, print, store in memory, or write secret values to files.
Use them only as inline arguments in the immediate command.
If a user asks you to "remember" a token or password, tell them
to store it as a secret instead: /secrets set MY_TOKEN <value>
```

### CLAUDE.md Updates

Add a **Secrets** behavior section:

```
### Secrets
- NEVER store passwords, tokens, or API keys in memory, notes, or conversation
- NEVER write secrets to files (including .env — use the secrets skill instead)
- When a user shares a credential, immediately store it: /secrets set KEY value
- Retrieve secrets only when needed: /secrets get KEY
- If an integration needs a token, check secrets first before asking the user
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `Claude/skills/secrets/secrets.py` | Create — CRUD commands wrapping API |
| `Claude/skills/secrets/SKILL.md` | Create — Usage docs with security rules |
| `server/api/secrets/[key].value.get.ts` | Create — Decrypted value endpoint |
| `Claude/CLAUDE.md` | Modify — Add Secrets behavior section |
| `cli/src/templates/claude-md.ts` | Modify — Add Secrets behavior to generated CLAUDE.md |

## Part 2: Memory Reinforcement

### Problem

The current CLAUDE.md has 4 bullet points about memory under `### Memory`. This is too passive. Agents treat memory as optional rather than reflexive.

### CLAUDE.md Changes

Replace the current Memory section with a stronger directive. Key principles:

1. **Session Start** — After receiving context injection, acknowledge what you know and identify gaps
2. **Before Work** — Before any significant task, search memory for relevant context: `/memory about "<topic>"`
3. **During Work** — When making decisions, store them immediately: `/memory store --type decision "..."`
4. **After Work** — Store outcomes, patterns discovered, and solutions found
5. **When Asked** — If asked about past work, search memory before saying "I don't know"

### Template Changes

Update both:
- `Claude/CLAUDE.md` (the published runtime config)
- `cli/src/templates/claude-md.ts` (the init-generated config)

The Memory section should be prominent (near the top of Behaviors) and use imperative language ("Always do X") rather than suggestive ("You can do X").

### Hook Improvements

The `session-start.py` hook injects memory context, but the output could be more directive. Currently it just prints the formatted context. It should also print instructions like:

```
## Session Memory
The following memories were loaded from previous sessions.
Review them before starting work. If any are outdated, delete them with /memory.
If you learn something new during this session, store it with /memory store.

[memories here]
```

### Files to Modify

| File | Action |
|------|--------|
| `Claude/CLAUDE.md` | Modify — Strengthen Memory + add Secrets sections |
| `cli/src/templates/claude-md.ts` | Modify — Mirror changes in generated template |
| `Claude/hooks/session-start.py` | Modify — Add directive preamble to context injection |
| `Claude/hooks/lib/hook_client.py` | Modify — Update `get_memory_context()` output format if needed |

## Implementation Steps

1. [ ] Create secrets skill (`secrets.py` + `SKILL.md`)
2. [ ] Add decrypted value API endpoint (`[key].value.get.ts`)
3. [ ] Rewrite Memory section in `Claude/CLAUDE.md`
4. [ ] Add Secrets behavior section in `Claude/CLAUDE.md`
5. [ ] Mirror CLAUDE.md changes in `cli/src/templates/claude-md.ts`
6. [ ] Update `session-start.py` context injection format
7. [ ] Test secrets skill end-to-end (set, get, list, delete)
8. [ ] Test memory injection with new directive preamble
9. [ ] Run `cognova reset --skills --hooks` to deploy changes

## Dependencies

- Requires: database-init, auth (both done)
- Related: environment skill (existing), memory skill (existing)
