rm -rf .next
rm -rf HAapp

npm run build

mkdir HAapp

cp -R .next/standalone/ HAapp/
cp -R public/ HAapp/public/
cp -R .next/static/ HAapp/.next/static/
cp -R db/ HAapp/db/