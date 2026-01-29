#!/bin/sh
set -e

# Initialize Claude settings directory if empty (first run with fresh volume)
if [ -z "$(ls -A /home/node/.claude 2>/dev/null)" ]; then
  echo "Initializing Claude settings from /app/Claude..."
  cp -r /app/Claude/* /home/node/.claude/
  chown -R node:node /home/node/.claude
fi

# Execute the main command
exec "$@"
