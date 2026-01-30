#!/bin/sh
set -e

# Ensure Claude settings directory exists
mkdir -p /home/node/.claude

# Always sync Claude config files from repo (CLAUDE.md, rules, skills)
# This ensures updates to these files are applied on container restart
# User-generated files (.credentials.json, projects/, etc.) are preserved
echo "Syncing Claude settings from /app/Claude..."
cp -f /app/Claude/CLAUDE.md /home/node/.claude/
cp -rf /app/Claude/rules /home/node/.claude/
cp -rf /app/Claude/skills /home/node/.claude/

# Ensure correct ownership
chown -R node:node /home/node

# Execute the main command
exec "$@"
