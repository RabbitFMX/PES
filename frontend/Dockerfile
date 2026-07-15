# syntax=docker/dockerfile:1

# PES frontend — multi-stage build.
# Build stage produces the static Vite bundle; the production stage serves it
# with nginx (no Node runtime in the final image).

# ---- Build stage ----
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Vite inlines VITE_* variables into the bundle at BUILD time, so they must be
# present now (not at container runtime). docker compose passes them as build
# args from the project .env.
ARG VITE_API_BASE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY . .
RUN npm run build

# ---- Production stage ----
FROM nginx:1.27-alpine AS production

# SPA-aware config: unknown paths fall back to index.html (client-side routing).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static bundle from the build stage.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
