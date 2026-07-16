# syntax=docker/dockerfile:1

# --- Build stage: install all deps and compile TypeScript -> dist/ ---
FROM node:24-slim AS build
WORKDIR /app

# Install deps first (better layer caching: only re-runs when lockfile changes)
COPY package.json package-lock.json ./
RUN npm ci

# Compile: tsc reads tsconfig.json and emits dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Production stage: slim runtime with only prod deps + compiled JS ---
FROM node:24-slim AS production
WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies (no typescript, tsx, eslint, etc.)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output from the build stage
COPY --from=build /app/dist ./dist

# Run as the unprivileged user that the node image ships with
USER node

EXPOSE 3001

# Liveness probe: hit the health endpoint using Node's built-in fetch (Node 24)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
