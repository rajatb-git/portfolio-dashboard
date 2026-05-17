#!/usr/bin/with-contenv bashio
set -e

mkdir -p /data/storage

LOG_LEVEL=$(bashio::config 'log_level')
FINN_HUB_API=$(bashio::config 'finnhub_api')
FINN_HUB_API_KEY=$(bashio::config 'finnhub_api_key')

mkdir -p /run
cat <<EOF > /run/portfolio.env
LOG_LEVEL=${LOG_LEVEL}
FINN_HUB_API=${FINN_HUB_API}
FINN_HUB_API_KEY=${FINN_HUB_API_KEY}
STORAGE_DIR=/data/storage
PORT=3001
EOF

bashio::log.info "Init complete; storage dir at /data/storage"
