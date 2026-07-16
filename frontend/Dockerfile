# syntax=docker/dockerfile:1

# --- Build stage: produce the static production bundle with Vite ---
FROM node:24-slim AS build
WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# VITE_* values are baked into the bundle at build time, so they must be
# present as build args (passed by docker-compose from the project .env).
ARG VITE_API_BASE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the SPA -> dist/  (package.json build = "tsc -b && vite build")
COPY . .
RUN npm run build

# --- Production stage: serve the static files with nginx ---
FROM nginx:1.27-alpine AS production

# SPA-aware config (history-API fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static bundle from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Use 127.0.0.1, not localhost: BusyBox wget resolves localhost to ::1 (IPv6)
# first, but nginx listens only on IPv4 :80 — localhost would refuse and the
# container would report unhealthy even while serving fine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
