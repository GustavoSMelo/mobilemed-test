#!/bin/sh
set -eu

echo '{"level":"log","event":"application.migrating","message":"Applying database migrations"}'

# O MySQL pode aceitar conexões antes de terminar o bootstrap do usuário/banco,
# então tenta algumas vezes antes de desistir.
attempt=1
while true; do
  if ./node_modules/.bin/prisma migrate deploy; then
    break
  fi

  if [ "$attempt" -ge 10 ]; then
    echo '{"level":"error","event":"application.migration_failed","message":"Migrations failed after 10 attempts"}'
    exit 1
  fi

  echo "{\"level\":\"warn\",\"event\":\"application.migration_retry\",\"attempt\":$attempt}"
  attempt=$((attempt + 1))
  sleep 3
done

exec node dist/main.js
