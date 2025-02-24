ARG BUILD_FROM
FROM $BUILD_FROM

# FROM node:22-alpine

ENV LANG C.UTF-8
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apk add --no-cache nodejs npm nginx && mkdir -p /run/nginx

COPY ingress.conf /etc/nginx/http.d/

# This will ensure that we opt out of the anonymous data collection by Next
ENV NEXT_TELEMETRY_DISABLED 1
ENV APP_ENV production
ENV NODE_ENV production
ENV PORT 8099

WORKDIR /app
COPY . .

RUN npm ci --omit=dev --unsafe-perm && npm run build

RUN rm -rf node_modules && cp -R /app/.next/standalone /app && cp -R /app/public /app/standalone && cp -R /app/.next/static /app/standalone/.next && chmod a+x /app/scripts/run.sh

CMD [ "scripts/run.sh" ]