FROM node:22-slim AS base
COPY . /app
WORKDIR /app

FROM base AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
ARG VITE_DB_HOST=/api
ENV VITE_DB_HOST=$VITE_DB_HOST
RUN pnpm run build

FROM nginx:alpine
LABEL org.opencontainers.image.title="Portfolio Dashboard - frontend"
LABEL org.opencontainers.image.description="Self-hosted portfolio dashboard for stocks & crypto (frontend container)"
LABEL org.opencontainers.image.authors="Rajat Bansal"
LABEL org.opencontainers.image.source="https://github.com/rajatb-git/portfolio-dashboard"
LABEL org.opencontainers.image.url="https://github.com/rajatb-git/portfolio-dashboard"
LABEL org.opencontainers.image.documentation="https://github.com/rajatb-git/portfolio-dashboard#readme"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="Rajat Bansal"
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
