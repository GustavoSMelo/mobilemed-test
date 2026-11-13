#!/bin/bash
# Executado pelo entrypoint oficial do MySQL apenas na primeira inicialização
# do volume. Cria o banco usado pelos testes de integração (`*_test`), que o
# `MYSQL_DATABASE` do Compose não cria.
set -eu

mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<EOSQL
  CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_test\`.* TO '${MYSQL_USER}'@'%';
EOSQL
