---
name: environment
description: Check system status, view configuration, troubleshoot issues with the Cognova installation. Use when diagnosing problems, checking health, or understanding the current setup.
allowed-tools: Bash, Read
---

# Environment Skill

Check and manage the Cognova installation environment.

## Commands

### System info

```bash
python3 ~/.claude/skills/environment/environment.py info
```

Shows install directory, vault path, API URL, OS info, disk usage, vault file counts.

### Service status

```bash
python3 ~/.claude/skills/environment/environment.py status
```

Shows PM2 process status (memory, CPU, restarts), API health, and database connectivity.

### Recent logs

```bash
python3 ~/.claude/skills/environment/environment.py logs [--lines N]
```

Shows recent PM2 logs (default: 30 lines).

### API health check

```bash
python3 ~/.claude/skills/environment/environment.py health
```

Checks multiple API endpoints and reports response times.

## Natural Language Patterns

- "Is everything running?" → Use `status`
- "Check the system" → Use `status`
- "Show me the logs" → Use `logs`
- "What's the setup?" → Use `info`
- "Is the API working?" → Use `health`
- "How much disk space?" → Use `info`

## Key Paths

| Resource | How to Find |
|----------|-------------|
| Install dir | `$COGNOVA_PROJECT_DIR` or check `~/.cognova` metadata file |
| Vault | `$VAULT_PATH` |
| PM2 config | `$COGNOVA_PROJECT_DIR/ecosystem.config.cjs` |
| App logs | `$COGNOVA_PROJECT_DIR/logs/` |
| Environment | `$COGNOVA_PROJECT_DIR/.env` |
| Database migrations | `$COGNOVA_PROJECT_DIR/server/drizzle/migrations/` |

## Common Troubleshooting

| Symptom | Check |
|---------|-------|
| 503 errors | `status` — DB might not have initialized; check logs |
| API unreachable | `pm2 status` — process may have crashed; `pm2 restart cognova` |
| Skills not working | Verify `~/.claude/skills/` has skill directories; re-run `cognova update` |
| Out of memory | Check `info` for disk/memory; PM2 config has `--max-old-space-size=4096` |
| Build failures | `NODE_OPTIONS='--max-old-space-size=4096' pnpm build` |
