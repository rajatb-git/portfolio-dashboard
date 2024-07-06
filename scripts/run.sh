#!/usr/bin/with-contenv bashio

export DB_HOST=$(bashio::config 'DB_HOST')

ls
echo 'zzzzzzzzzzzzzz'

ls standalone

node standalone/server.js