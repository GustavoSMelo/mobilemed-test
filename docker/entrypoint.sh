#!/bin/sh
set -eu

echo '{"level":"log","event":"application.migrating","message":"Applying database migrations"}'
./node_modules/.bin/prisma migrate deploy

exec node dist/main.js
