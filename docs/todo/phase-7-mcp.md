# Phase 7: MCP Server

**Goal:** Expose Cognova tools and data via Model Context Protocol for external agent consumption.

**Status:** Not started
**Depends on:** Phase 5

---

## Tasks

### 7.1 MCP SSE Endpoint
- [ ] Install `@modelcontextprotocol/sdk`
- [ ] Create `server/routes/mcp.ts` — MCP SSE server
- [ ] Auth via API key header
- [ ] Tool registration from Cognova's internal tools

### 7.2 Exposed Tools
- [ ] Task tools: create_task, list_tasks, update_task, complete_task
- [ ] Memory tools: remember, recall, search
- [ ] Knowledge tools: read_knowledge (read files from ~/knowledge/)
- [ ] Agent tools: list_agents, invoke_agent (run an agent with a prompt)

### 7.3 MCP Configuration
- [ ] Settings page section: enable/disable MCP server
- [ ] Display connection URL for MCP clients
- [ ] API key requirement for MCP access

---

## Acceptance Criteria

1. MCP SSE endpoint responds to compliant clients
2. External agents can call Cognova tools via MCP
3. Authentication required for MCP access
4. All core tools exposed (tasks, memory, knowledge, agents)
