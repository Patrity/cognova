FROM node:20-bookworm

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Install node-pty build dependencies and Python for skills
RUN apt-get update && apt-get install -y \
    python3 python3-pip make g++ curl \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python

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

# Build app with increased memory for Nitro bundling
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm build

EXPOSE 3000

# Set NODE_PATH so native modules can be found
ENV NODE_PATH=/app/node_modules

# Create Claude settings directory (will be populated by entrypoint if volume is empty)
RUN mkdir -p /home/node/.claude && chown -R node:node /home/node/.claude

# Set environment for skills
ENV SECOND_BRAIN_API_URL=http://localhost:3000

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
