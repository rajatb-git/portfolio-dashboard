# rm -rf .next

# npm run build

# cp -R db .next/standalone/db
# cp -R public .next/standalone/public
# cp -R .next/static .next/standalone/.next/static

# node .next/standalone/server.js


# test
rm -rf app
mkdir app
cp -R src .dockerignore config.yaml Dockerfile next-env.d.ts next.config.js package.json package-lock.json tsconfig.json public scripts app
cd app
npm ci --omit=dev --unsafe-perm && npm run build
cd ..

rm -rf node_modules
cp -R app/.next/standalone app
cp -R app/public app/standalone
cp -R app/.next/static app/standalone/.next
chmod a+x app/scripts/run.sh
# CMD [ "/app/scripts/run.sh" ]