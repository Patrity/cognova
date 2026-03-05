# Phase 2: Settings & Provider Management

**Goal:** Users can configure AI providers, manage models, store secrets. `getModel()` resolves any model reference to an AI SDK LanguageModel.

**Status:** Not started
**Depends on:** Phase 1

---

## Tasks

### 2.1 Settings Layout
- [ ] Create `app/pages/settings.vue` — settings layout with side navigation
- [ ] Sub-pages: General, Account, Providers, Secrets
- [ ] Breadcrumb or tab navigation between sub-pages

### 2.2 General Settings (`/settings/general`)
- [ ] App name setting
- [ ] Default model selector (populated from models table)
- [ ] Knowledge directory path display (read-only)
- [ ] API: GET/PUT `server/api/settings.ts`

### 2.3 Account Settings (`/settings/account`)
- [ ] Profile form: name, email
- [ ] Password change form
- [ ] API key section: generate, view (masked), revoke
- [ ] better-auth API key plugin integration

### 2.4 Provider Type Seeding
- [ ] Create `server/db/seed/provider-types.ts`
- [ ] Seed on first boot (Nitro plugin or migration)
- [ ] Provider types:
  - `openai-compatible`: configSchema = { baseURL (required), apiKey (optional), name }
  - `anthropic`: configSchema = { apiKey (required) }
  - `openai`: configSchema = { apiKey (required), organization (optional) }
  - `claude-code`: configSchema = { note: "Uses local Claude Code CLI" }
- [ ] Each type stores its configSchema as JSON Schema for form generation

### 2.5 Provider CRUD
- [ ] API: `server/api/providers/index.get.ts` — list user's providers
- [ ] API: `server/api/providers/index.post.ts` — add provider
- [ ] API: `server/api/providers/[id].put.ts` — update provider
- [ ] API: `server/api/providers/[id].delete.ts` — delete provider
- [ ] Encrypt provider configJson (API keys) before storage
- [ ] Decrypt on read (server-side only, never expose raw keys to client)

### 2.6 Provider Management UI (`/settings/providers`)
- [ ] List configured providers (cards with type badge, name, status)
- [ ] Add provider: select type → dynamic form from configSchema
- [ ] Edit provider (modal or inline)
- [ ] Delete with confirmation
- [ ] Test connection button per provider

### 2.7 Model Management
- [ ] API: `server/api/providers/[id]/models.get.ts` — list models for provider
- [ ] API: `server/api/providers/[id]/models.post.ts` — add model
- [ ] API: `server/api/providers/[id]/models.delete.ts` — remove model
- [ ] Model properties: modelId (string for SDK), displayName, tags (text[])
- [ ] UI: model list per provider, add model form, tag editor
- [ ] Predefined tag suggestions: local, frontier, fast, coding, creative, general

### 2.8 getModel() Implementation
- [ ] Create `server/ai/get-model.ts`
- [ ] Input: `{ modelId: string }` or `{ tags: string[] }`
- [ ] Resolution: model → provider → provider_type
- [ ] Dynamic import of AI SDK package based on provider type
- [ ] Instantiate client with decrypted provider config
- [ ] Return `LanguageModel`
- [ ] Provider client cache (Map keyed by providerId, invalidate on config change)
- [ ] Fallback: if tag query yields nothing, log warning and try broader match
- [ ] Create `server/ai/provider-factory.ts` — maps type IDs to SDK constructors

### 2.9 Secrets Management (`/settings/secrets`)
- [ ] API: `server/api/secrets/index.get.ts` — list keys (values masked)
- [ ] API: `server/api/secrets/index.post.ts` — create/update secret
- [ ] API: `server/api/secrets/[key].delete.ts` — delete secret
- [ ] API: `server/api/secrets/[key].get.ts` — get decrypted value (server internal only)
- [ ] Encryption: AES-256-GCM with random IV per secret
- [ ] Encryption key from NUXT_ENCRYPTION_KEY env var
- [ ] UI: key-value list, add/edit modal, masked values, reveal toggle

### 2.10 Token Usage Tracking
- [ ] Create `server/ai/cost.ts` — pricing data per provider/model
- [ ] Create `server/ai/usage.ts` — `logTokenUsage()` helper
- [ ] API: `server/api/usage/index.get.ts` — usage summary (daily, by provider, by source)
- [ ] Usage display component (reusable for dashboard + settings)

---

## Acceptance Criteria

1. User can add an AI provider (e.g., Anthropic with API key)
2. Provider API key is stored encrypted
3. User can add models to a provider with tags
4. `getModel({ tags: ['frontier'] })` returns a LanguageModel
5. Secrets can be stored and retrieved (encrypted at rest)
6. Settings pages are navigable and functional
7. Provider test connection validates the endpoint
