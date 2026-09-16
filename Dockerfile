# Multi-stage lightweight Node 24 image
FROM node:24-alpine AS base

# Create app directory
WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source code and public assets
COPY src/ ./src/
COPY public/ ./public/

# Setup persistent data directory with non-root ownership
RUN mkdir -p /data && chown -R node:node /data /app

# Configure default runtime environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DB_PATH=/data/taskflow.db

# Declare persistent volume mount point
VOLUME ["/data"]

# Switch to non-root user for security
USER node

# Expose standard HTTP port
EXPOSE 3000

# Container healthcheck using the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the TaskFlow server
CMD ["node", "src/server.js"]
