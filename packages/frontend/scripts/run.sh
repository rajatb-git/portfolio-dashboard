#!/usr/bin/with-contenv bashio

# nginx -g daemon off;error_log /dev/stdout debug;

export DB_HOST=$(bashio::config 'DB_HOST')

ls
echo 'zzzzzzzzzzzzzz'

ls standalone

node standalone/server.js