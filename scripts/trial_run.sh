npm run clean
npm run build

cp -r ./.next/standalone ./app
cp -r ./public ./app/public
cp -r ./.next/static ./app/.next/static

node .next/standalone/server.js