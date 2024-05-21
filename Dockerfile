ARG BUILD_FROM
FROM $BUILD_FROM

ENV APP_ENV production
ENV NODE_ENV production
# This will ensure that we opt out of the anonymous data collection by Next
ENV NEXT_TELEMETRY_DISABLED 1

WORKDIR /app
COPY . .

#Installing only production and build dependencies
RUN npm ci --omit=dev
RUN npm run build

ENV PORT 3000

# a standalone build automatically imports the needed files from node modules
COPY /app/.next/standalone /app
COPY /app/public /app/public
COPY /app/.next/static /app/.next/static

EXPOSE ${PORT}
CMD ["/run.sh"]
