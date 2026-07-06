rm -rf dist
tsc
ttab tsc --watch
nodemon ./dist/server.js