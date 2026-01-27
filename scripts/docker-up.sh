#!/bin/bash
# Smart docker compose up - starts local postgres only when needed

# Check if DATABASE_URL points to a remote database
if [[ -n "$DATABASE_URL" && "$DATABASE_URL" == *"neon.tech"* ]]; then
  echo "Using remote database (Neon)"
  docker compose up "$@"
else
  echo "Using local PostgreSQL"
  docker compose --profile local up "$@"
fi
