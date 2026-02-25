#!/bin/bash
set -e

echo "→ Bumping prerelease version"
npm version prerelease --preid=next

VERSION=$(node -p 'require("./package.json").version')

echo "→ Building CLI"
pnpm cli:build

echo "→ Building app"
pnpm build

echo "→ Publishing @next"
npm publish --tag next

echo "→ Pushing tag"
git push && git push --tags

echo ""
echo "✓ Published v$VERSION to @next"
echo "  Test with: cognova update --channel next"
