# syntax=docker/dockerfile:1

# PES backend — multi-stage build.
# Build stage compiles the TypeScript (needs devDependencies); the production
# stage ships only the compiled output and runtime dependencies.

# ---- Build stage ----
FROM node:24-slim AS build
WORKDIR /app

# Install ALL dependencies (incl. dev) for the TypeScript build.
# Copying the manifests first keeps this layer cached until they change.
COPY package.json package-lock.json ./
RUN npm ci

# Compile src/ -> dist/ (tsc, outDir=dist).
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Production stage ----
FROM node:24-slim AS production
ENV NODE_ENV=production
WORKDIR /app

# Only production dependencies (tsx, vitest, typescript, etc. are dropped).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled JavaScript from the build stage.
COPY --from=build /app/dist ./dist

# Run as the unprivileged user baked into the node image.
USER node

# Server listens on PORT (default 3001, see src/server.ts).
EXPOSE 3001
CMD ["node", "dist/server.js"]
