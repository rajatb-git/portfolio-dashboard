# first install and build layer
FROM node: 18.19.0-alpine3.17 as builder

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
FROM node:18.19.0-alpine3.17 as runner

WORKDIR /app

# This will ensure that we opt out of the anonymous data collection by Next
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

# a standalone build automatically imports the needed files from node modules
COPY --from=builder /app/.next/standalone ./standalone
COPY --from=builder /app/public /app/standalone/public
COPY --from=builder /app/.next/static /app/standalone/.next/static

EXPOSE ${PORT}
CMD ["node", "/standalone/server.js"]
