FROM node:22-slim AS base
COPY . /app
WORKDIR /app

FROM base AS prod-deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod

FROM base AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
RUN pnpm run build

FROM base
LABEL org.opencontainers.image.title="Portfolio Dashboard - backend"
LABEL org.opencontainers.image.description="Self-hosted portfolio dashboard for stocks & crypto (backend container)"
LABEL org.opencontainers.image.authors="Rajat Bansal"
LABEL org.opencontainers.image.source="https://github.com/rajatb-git/portfolio-dashboard"
LABEL org.opencontainers.image.url="https://github.com/rajatb-git/portfolio-dashboard"
LABEL org.opencontainers.image.documentation="https://github.com/rajatb-git/portfolio-dashboard#readme"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="Rajat Bansal"
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
EXPOSE 3001
CMD [ "node", "dist/server.js" ]
