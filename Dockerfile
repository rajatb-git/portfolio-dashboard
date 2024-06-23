# first install and build layer
FROM node:22-alpine as builder

ENV APP_ENV production
ENV NODE_ENV production
# This will ensure that we opt out of the anonymous data collection by Next
ENV NEXT_TELEMETRY_DISABLED 1

WORKDIR /app
COPY . .

#Installing only production and build dependencies
RUN npm ci --omit=dev
RUN npm run build

#final layer to run
FROM node:22-alpine as runner

WORKDIR /app

# This will ensure that we opt out of the anonymous data collection by Next
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

# a standalone build automatically imports the needed files from node modules
COPY --from=builder /app/.next/standalone /app
COPY --from=builder /app/public /app/public
COPY --from=builder /app/.next/static /app/.next/static
# COPY --from=builder /app/db /app/db

EXPOSE ${PORT}
CMD ["node", "/app/server.js"]
