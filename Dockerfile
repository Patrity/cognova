FROM node:20-bookworm

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Install node-pty build dependencies (fallback if prebuilts unavailable)
RUN apt-get update && apt-get install -y \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Rebuild node-pty native module for this platform
RUN cd node_modules/.pnpm/node-pty@*/node_modules/node-pty && \
    npx node-gyp rebuild && \
    ls -la build/Release/ && \
    test -f build/Release/pty.node

# Copy source code
COPY . .

# Build app
RUN pnpm build

EXPOSE 3000

# Set NODE_PATH so native modules can be found
ENV NODE_PATH=/app/node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", ".output/server/index.mjs"]
