#!/bin/sh
set -e

# Initialize Claude settings directory if empty (first run with fresh volume)
# Now mounting entire /home/node, so both .claude/ and .claude.json persist
if [ ! -d /home/node/.claude ]; then
  echo "Initializing Claude settings from /app/Claude..."
  mkdir -p /home/node/.claude
  cp -r /app/Claude/* /home/node/.claude/
fi

# Ensure correct ownership
chown -R node:node /home/node

# Execute the main command
exec "$@"
