# syntax = docker/dockerfile:1

# Build stage
FROM oven/bun:1 as builder
WORKDIR /app

# Install dependencies into temp directory
# This will cache them and speed up future builds
FROM builder AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy node_modules from temp directory
# Then copy all (non-ignored) project files into the image
FROM builder AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build the project
RUN bun run build

# Runtime stage with security hardening
FROM oven/bun:1-slim AS release

# Install dumb-init for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN groupadd -g 1001 appuser && \
    useradd -r -u 1001 -g appuser appuser

# Copy production dependencies and built application
COPY --from=install --chown=appuser:appuser /temp/prod/node_modules node_modules
COPY --from=prerelease --chown=appuser:appuser /app/dist dist
COPY --from=prerelease --chown=appuser:appuser /app/package.json .

# Switch to non-root user
USER appuser

# Expose port (using 3000 to match app default)
EXPOSE 3000/tcp

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --eval "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["bun", "run", "dist/index.js"]