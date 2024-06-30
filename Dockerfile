FROM node:22-alpine

RUN npm i

WORKDIR /app
COPY ./src /app

RUN npm ci --omit=dev
RUN npm run build

COPY /app/.next/standalone /app
COPY /app/public /app/public
COPY /app/.next/static /app/.next/static

RUN chmod a+x /scripts/run.sh

CMD [ "/scripts/run.sh" ]