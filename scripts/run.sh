#!/usr/bin/with-contenv bashio

export DB_HOST=$(bashio::config 'DB_HOST')

node /app/server.js