ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest

# Build on host arch (no QEMU) — Vite 8 uses rolldown which has per-arch
# native bindings that pnpm fails to install correctly under emulation.
# Backend deps are all pure JS so node_modules ships cross-arch fine.
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

RUN apk add --no-cache git \
    && npm install -g pnpm

WORKDIR /build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages packages
RUN pnpm install --frozen-lockfile=false \
    && pnpm --filter @portfolio/backend run build \
    && VITE_DB_HOST=/api pnpm --filter @portfolio/frontend run build

FROM ${BUILD_FROM}

ENV LANG=C.UTF-8

RUN apk add --no-cache nodejs nginx

RUN mkdir -p /app/backend /app/frontend
COPY --from=builder /build/packages/backend/dist /app/backend/dist
COPY --from=builder /build/packages/backend/package.json /app/backend/package.json
COPY --from=builder /build/packages/backend/node_modules /app/backend/node_modules
COPY --from=builder /build/packages/frontend/dist /app/frontend

COPY portfolio-dashboard/nginx.conf /etc/nginx/http.d/portfolio.conf
RUN rm -f /etc/nginx/http.d/default.conf

COPY portfolio-dashboard/rootfs /

RUN chmod a+x /etc/cont-init.d/00-init.sh \
    /etc/services.d/backend/run /etc/services.d/backend/finish \
    /etc/services.d/nginx/run /etc/services.d/nginx/finish

LABEL \
  org.opencontainers.image.title="Portfolio Dashboard (Home Assistant Addon)" \
  org.opencontainers.image.description="Self-hosted portfolio dashboard for stocks & crypto - HA addon" \
  org.opencontainers.image.authors="Rajat Bansal" \
  org.opencontainers.image.source="https://github.com/rajatb-git/portfolio-dashboard" \
  org.opencontainers.image.url="https://github.com/rajatb-git/portfolio-dashboard" \
  org.opencontainers.image.documentation="https://github.com/rajatb-git/portfolio-dashboard/blob/develop/portfolio-dashboard/DOCS.md" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.vendor="Rajat Bansal"

EXPOSE 8099
