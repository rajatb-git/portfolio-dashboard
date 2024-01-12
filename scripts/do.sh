rm -rf .next

npm run build

cp -R db .next/standalone/db
cp -R public .next/standalone/public
cp -R .next/static .next/standalone/.next/static

node .next/standalone/server.js