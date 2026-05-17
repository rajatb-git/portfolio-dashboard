ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest
FROM ${BUILD_FROM}

ENV LANG=C.UTF-8

RUN apk add --no-cache nodejs npm nginx \
    && npm install -g pnpm

WORKDIR /build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages packages
RUN pnpm install --frozen-lockfile=false \
    && pnpm --filter @portfolio/backend run build \
    && VITE_DB_HOST=/api pnpm --filter @portfolio/frontend run build

RUN mkdir -p /app/backend /app/frontend \
    && cp -r packages/backend/dist /app/backend/dist \
    && cp packages/backend/package.json /app/backend/package.json \
    && cp -r packages/backend/node_modules /app/backend/node_modules \
    && cp -r packages/frontend/dist/* /app/frontend/ \
    && rm -rf /build /root/.local/share/pnpm /root/.npm

COPY homeassistant/portfolio-dashboard/nginx.conf /etc/nginx/http.d/portfolio.conf
RUN rm -f /etc/nginx/http.d/default.conf

COPY homeassistant/portfolio-dashboard/rootfs /

RUN chmod a+x /etc/cont-init.d/00-init.sh \
    /etc/services.d/backend/run /etc/services.d/backend/finish \
    /etc/services.d/nginx/run /etc/services.d/nginx/finish

LABEL \
  org.opencontainers.image.title="Portfolio Dashboard (Home Assistant Addon)" \
  org.opencontainers.image.description="Self-hosted portfolio dashboard for stocks & crypto - HA addon" \
  org.opencontainers.image.authors="Rajat Bansal" \
  org.opencontainers.image.source="https://github.com/rajatb-git/portfolio-dashboard" \
  org.opencontainers.image.url="https://github.com/rajatb-git/portfolio-dashboard" \
  org.opencontainers.image.documentation="https://github.com/rajatb-git/portfolio-dashboard/blob/develop/homeassistant/portfolio-dashboard/DOCS.md" \
  org.opencontainers.image.licenses="MIT" \
  org.opencontainers.image.vendor="Rajat Bansal"

EXPOSE 8099
