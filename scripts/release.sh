#!/bin/bash
set -e

BUMP=${1:-patch}

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: release.sh [patch|minor|major]"
  exit 1
fi

echo "→ Bumping $BUMP version"
npm version "$BUMP"

VERSION=$(node -p 'require("./package.json").version')

echo "→ Building CLI"
pnpm cli:build

echo "→ Building app"
pnpm build

echo "→ Publishing @latest"
npm publish

echo "→ Pushing to remote"
git push && git push --tags

echo "→ Creating GitHub release"
gh release create "v$VERSION" --generate-notes --verify-tag

echo ""
echo "✓ Released v$VERSION to @latest"
