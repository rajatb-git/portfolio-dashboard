#!/usr/bin/with-contenv bashio

export FINN_HUB_API_KEY=$(bashio::config 'FINN_HUB_API_KEY')
export FINN_HUB_API=$(bashio::config 'FINN_HUB_API')

npm run build

node dist/server.js