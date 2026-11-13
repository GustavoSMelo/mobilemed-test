# Integração de Pedidos, Documentos e Exames

API REST em **NestJS** que recebe pedidos de exame, documentos anexos e eventos de
chegada de exames, correlacionando tudo pelo **accession number** — a chave usada
pelo padrão DICOM para identificar um exame.

O objetivo é reproduzir, de forma enxuta, o fluxo em que o pedido e os documentos
chegam por sistemas diferentes e precisam ser integrados quando o exame chega do
PACS.

## Stack

- **Node.js 26.13.1** (fixado no `.nvmrc` e na imagem Docker); projeto ESM
- **NestJS 12**
- **Prisma 6** + **MySQL/MariaDB**
- **Swagger** (`@nestjs/swagger`)
- **Vitest + Supertest** para testes automatizados
- **Docker** e **Docker Compose**

## Banco de dados

Dois modos suportados:

- **Docker Compose** (recomendado): o MySQL 8.4 sobe junto com a API, já com
  banco e usuário criados — veja [Com Docker Compose](#com-docker-compose).
- **MySQL/MariaDB já instalado na máquina** (por padrão em `127.0.0.1:3306`).
  Nesse caso crie os bancos de desenvolvimento e de teste e um usuário com
  permissão sobre eles:

```sql
CREATE DATABASE pedidos_integracao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE pedidos_integracao_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'pedidos_app'@'localhost' IDENTIFIED BY 'troque-esta-senha';
GRANT ALL PRIVILEGES ON pedidos_integracao.* TO 'pedidos_app'@'localhost';
GRANT ALL PRIVILEGES ON pedidos_integracao_test.* TO 'pedidos_app'@'localhost';
FLUSH PRIVILEGES;
```

O banco de teste é recriado a cada execução da suíte, por isso precisa ser um
banco separado e ter o sufixo `_test`. Depois configure o `.env`:

```bash
cp .env.example .env
# edite DATABASE_URL e TEST_DATABASE_URL com usuário/senha reais
```

## Migrations: criando as tabelas com Prisma

As tabelas são criadas pelas migrations versionadas em `prisma/migrations/`.
Com o banco criado e o `.env` configurado, aplique-as:

```bash
npm run db:migrate        # prisma migrate deploy — aplica migrations pendentes
```

Esse comando **não** cria uma migration nova; ele apenas executa as que já estão
no repositório. É o comando usado no setup local, no CI e no container (o
`docker/entrypoint.sh` roda `prisma migrate deploy` no start).

### Comandos úteis

| Comando                                      | Quando usar                                                                 |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `npm run db:migrate`                         | Aplicar migrations existentes (setup, CI, produção).                        |
| `npm run db:migrate:dev`                     | Desenvolvimento: cria/aplica migrations e regenera o client.                |
| `npx prisma migrate dev --name nome_da_mudanca` | Após alterar `prisma/schema.prisma`, para versionar a mudança.           |
| `npx prisma migrate status`                  | Conferir se o banco está em dia com as migrations.                          |
| `npx prisma migrate reset`                   | **Apaga** e recria o banco de desenvolvimento, reaplicando as migrations.   |
| `npx prisma db push`                         | Prototipagem: sincroniza o schema sem gerar migration (não versionado).     |
| `npm run db:studio`                          | Abrir o Prisma Studio para inspecionar os dados.                            |
| `npx prisma generate`                        | Regenerar o Prisma Client (também roda no `postinstall`/`prebuild`).        |

Fluxo para uma alteração de schema:

```bash
# 1. edite prisma/schema.prisma
npx prisma migrate dev --name descricao_da_mudanca
# 2. commite a pasta prisma/migrations gerada
# 3. em outros ambientes:
npm run db:migrate
```

> `prisma migrate dev` cria um banco _shadow_ temporário e exige permissão de
> `CREATE DATABASE`. Em ambientes compartilhados/produção use sempre
> `prisma migrate deploy`.

### Primeira execução local

```bash
npm install          # instala dependências + prisma generate
cp .env.example .env # configure DATABASE_URL/TEST_DATABASE_URL
npm run db:migrate   # cria as tabelas no MySQL
npm run start:dev
```

## Como executar

### Com Docker Compose

Pré-requisito: apenas Docker. O `docker-compose.yml` sobe **a API e o MySQL
juntos** — não é necessário ter um MySQL instalado na máquina:

```bash
docker compose up --build     # ou: cp .env.example .env && docker compose up --build
```

O que acontece:

1. `db` (imagem `mysql:8.4`) cria o banco `pedidos_integracao` e o usuário
   `pedidos_app` automaticamente, com os dados em um volume nomeado (`mysql-data`).
2. A API espera o healthcheck do MySQL passar (`depends_on: condition: service_healthy`).
3. O `docker/entrypoint.sh` roda `prisma migrate deploy` (com retry) e sobe a API.

A API sobe em `http://localhost:3333`:

- Swagger UI: `http://localhost:3333/docs`
- OpenAPI JSON: `http://localhost:3333/docs/json`
- Health check: `http://localhost:3333/health`

O MySQL fica publicado em `localhost:3307` (e não em `3306`) para não conflitar
com um MySQL/MariaDB já instalado na máquina. Para usar o banco do container a
partir do host, por exemplo com Prisma Studio ou os testes de integração:

```bash
MYSQL_URL="mysql://pedidos_app:senha@127.0.0.1:3307/pedidos_integracao"
npx prisma studio --url "$MYSQL_URL"
```

Personalize credenciais e portas pelo `.env` (variáveis `MYSQL_*` e `MYSQL_PORT`,
veja [Variáveis de ambiente](#variáveis-de-ambiente)). A API monta o `DATABASE_URL`
do container sozinha, apontando para o host `db`.

Comandos úteis:

```bash
docker compose logs -f api      # acompanhar a API
docker compose exec db mysql -upedidos_app -psenha pedidos_integracao
docker compose down             # parar (mantém os dados)
docker compose down -v          # parar e apagar o volume do MySQL
```

### Localmente

Pré-requisitos: Node.js 26.13.1 (veja `.nvmrc`), npm e o MySQL local rodando.

```bash
npm install          # instala dependências e executa `prisma generate`
cp .env.example .env # configure DATABASE_URL/TEST_DATABASE_URL
npm run db:migrate   # aplica as migrations no MySQL
npm run start:dev
```

Para executar o build de produção:

```bash
npm run build
npm run start:prod
```

### Testes

```bash
npm test             # testes unitários (Vitest)
npm run test:e2e     # testes de integração HTTP (Vitest + Supertest)
```

Os testes de integração usam `TEST_DATABASE_URL` (ou derivam `DATABASE_URL`
trocando o nome do banco para `*_test`). O helper executa
`prisma db push --force-reset`, portanto **o banco de teste é apagado e
recriado** antes de cada suíte. As suítes rodam em sequência para compartilhar o
mesmo banco com segurança.

> **Sobre o runner:** o projeto base deste desafio já vem configurado com
> **Vitest**, que mantém a API `describe/it/expect` compatível com Jest. A opção
> foi preservada para não trocar a configuração existente; os testes cobrem os
> mesmos cenários que uma suíte Jest cobriria (ver
> [Casos cobertos](#casos-cobertos-pelos-testes)).

## Variáveis de ambiente

| Variável              | Exemplo                                                            | Descrição                                                    |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `DATABASE_URL`        | `mysql://pedidos_app:senha@127.0.0.1:3306/pedidos_integracao`      | Conexão MySQL usada pela API (fora do Compose).              |
| `TEST_DATABASE_URL`   | `mysql://pedidos_app:senha@127.0.0.1:3306/pedidos_integracao_test` | Banco dos testes (precisa terminar `_test`).                 |
| `PORT`                | `3333`                                                             | Porta HTTP.                                                  |
| `NODE_ENV`            | —                                                                  | `production` no container.                                   |
| `MYSQL_ROOT_PASSWORD` | `root`                                                             | Senha de root do MySQL do Compose.                           |
| `MYSQL_DATABASE`      | `pedidos_integracao`                                               | Banco criado pelo serviço `db`.                              |
| `MYSQL_USER`          | `pedidos_app`                                                      | Usuário da aplicação criado pelo serviço `db`.               |
| `MYSQL_PASSWORD`      | `senha`                                                            | Senha desse usuário.                                         |
| `MYSQL_PORT`          | `3307`                                                             | Porta do MySQL publicada no host (3307 evita conflito local). |

> No Compose o `DATABASE_URL` da API é derivado de `MYSQL_USER`,
> `MYSQL_PASSWORD` e `MYSQL_DATABASE`, sempre apontando para o host `db:3306`.
> O `DATABASE_URL` do `.env` é usado apenas fora do Compose.

## Modelo de dados

```text
Pedido (codigoPedido único)
  └── ItemPedido[] (codigoItemPedido, accessionNumber, modalidade, nomeProcedimento)
Documento (único por codigoDocumento + codigoPedido)
  └── DocumentoExame[] ── Exame (accessionNumber único)
```

- `Pedido.integrado`: `true` quando ao menos um item do pedido possui exame
  recebido.
- `Documento.integrado`: `true` quando o documento está vinculado a ao menos um
  exame.
- `DocumentoExame`: tabela de junção N:N entre documentos e exames, criada na
  reconciliação.
- Restrições de unicidade no banco: `pedidos.codigoPedido`,
  `itens_pedido(pedidoId, codigoItemPedido)` e
  `documentos(codigoDocumento, codigoPedido)`.

## Regras de negócio

### 1. Recebimento de pedidos — `POST /pedidos`

- O pedido é um **upsert** por `CodigoPedido`.
- Se já existe, os dados cadastrais são atualizados e **somente itens com
  `CodigoItemPedido` ainda não cadastrado** são inseridos. Itens repetidos no
  mesmo payload são rejeitados com `400`.
- Depois de salvar, o pedido é reconciliado com os exames já recebidos.

### 2. Integração do pedido com exame existente

- A cada gravação, o sistema verifica se existe `Exame` com o mesmo
  `accessionNumber` de qualquer item do pedido.
- Se existir, `integrado = true`; caso contrário, permanece `false`.
- A reconciliação também é executada quando um pedido recebe um novo item.

### 3. Recebimento de documentos — `POST /documentos`

- A combinação `CodigoDocumento + CodigoPedido` é única. Documento repetido
  retorna **409 `DOCUMENTO_DUPLICADO`**.
- Pedido inexistente retorna **404 `PEDIDO_NAO_ENCONTRADO`**.
- Se o pedido já está integrado, o documento é vinculado imediatamente aos
  exames do pedido e marcado com `integrado = true`.
- Se o pedido ainda não está integrado, o documento é salvo como pendente
  (`integrado = false`) e será vinculado quando o exame chegar.
- O conteúdo base64 é persistido como texto; não há storage de anexos real.

### 4. Chegada de exame — `POST /exames`

- O exame é um **upsert** por `AccessionNumber` (permite reenvio de status).
- Todos os pedidos que possuem item com esse accession number passam a
  `integrado = true`.
- Os documentos pendentes desses pedidos são vinculados aos exames existentes.
  Quando o pedido tem mais de um exame, o documento é vinculado a todos eles, de
  forma idempotente.

### 5. Consultas

- `GET /pedidos/:codigoPedido` — pedido, itens e documentos (com os accession
  numbers dos exames vinculados).
- `GET /documentos/:codigoPedido` — documentos do pedido, incluindo o conteúdo e
  os exames vinculados. Retorna `404` se o pedido não existir.
- `GET /exames/:accessionNumber` — exame, pedidos correlacionados e documentos
  vinculados.

### Códigos HTTP

| Situação                              | Status | `code`                    |
| ------------------------------------- | ------ | ------------------------- |
| Criação/upsert                        | 201    | —                         |
| Consulta                              | 200    | —                         |
| Payload inválido                      | 400    | `VALIDACAO_INVALIDA`      |
| Pedido inexistente                    | 404    | `PEDIDO_NAO_ENCONTRADO`   |
| Exame inexistente                     | 404    | `EXAME_NAO_ENCONTRADO`    |
| Documento duplicado                   | 409    | `DOCUMENTO_DUPLICADO`     |
| Erro inesperado                       | 500    | `ERRO_INTERNO`            |

## Endpoints e exemplos

> Os payloads aceitam as chaves em **camelCase** (`codigoPedido`) ou em
> **PascalCase** (`CodigoPedido`), como nos exemplos do enunciado. As respostas
> são sempre em camelCase.

### `POST /pedidos`

```bash
curl -X POST http://localhost:3333/pedidos \
  -H 'content-type: application/json' \
  -d '{
    "codigoPedido": 616,
    "nomePaciente": "ALEFHER MONTONI DE ALMEIDA",
    "dataNascimento": "19970601",
    "sexo": "M",
    "codUnidade": 104,
    "exames": [
      {
        "codigoItemPedido": 930,
        "accessionNumber": "930",
        "modalidade": "CR",
        "nomeProcedimento": "RX ANTEBRACO ESQUERDO"
      }
    ]
  }'
```

Resposta (pedido ainda sem exame):

```json
{
  "codigoPedido": 616,
  "nomePaciente": "ALEFHER MONTONI DE ALMEIDA",
  "dataNascimento": "19970601",
  "sexo": "M",
  "codUnidade": 104,
  "integrado": false,
  "criadoEm": "2026-11-12T16:47:31.207Z",
  "atualizadoEm": "2026-11-12T16:47:31.207Z",
  "exames": [
    {
      "codigoItemPedido": 930,
      "accessionNumber": "930",
      "modalidade": "CR",
      "nomeProcedimento": "RX ANTEBRACO ESQUERDO",
      "exameRecebido": false
    }
  ],
  "documentos": []
}
```

### `POST /documentos`

```bash
curl -X POST http://localhost:3333/documentos \
  -H 'content-type: application/json' \
  -d '{
    "codigoDocumento": 251,
    "codigoPedido": 615,
    "nomeDocumento": "PEDIDO",
    "documento": "YmFzZTY0"
  }'
```

### `POST /exames`

```bash
curl -X POST http://localhost:3333/exames \
  -H 'content-type: application/json' \
  -d '{
    "accessionNumber": "930",
    "nomePaciente": "ALEFHER MONTONI DE ALMEIDA",
    "modalidade": "CR",
    "status": "NOVO"
  }'
```

Resposta:

```json
{
  "accessionNumber": "930",
  "nomePaciente": "ALEFHER MONTONI DE ALMEIDA",
  "modalidade": "CR",
  "status": "NOVO",
  "criadoEm": "2026-11-12T16:47:31.249Z",
  "atualizadoEm": "2026-11-12T16:47:31.249Z",
  "pedidos": [{ "codigoPedido": 616, "integrado": true }],
  "documentos": [
    {
      "codigoDocumento": 251,
      "codigoPedido": 616,
      "nomeDocumento": "PEDIDO",
      "integrado": true
    }
  ]
}
```

### Consultas

```bash
curl http://localhost:3333/pedidos/616
curl http://localhost:3333/documentos/616
curl http://localhost:3333/exames/930
```

Formato de erro:

```json
{
  "statusCode": 409,
  "code": "DOCUMENTO_DUPLICADO",
  "message": "Já existe um documento 251 para o pedido 616.",
  "details": { "codigoDocumento": 251, "codigoPedido": 616 },
  "path": "/documentos",
  "method": "POST",
  "requestId": "0a097f4c-da0e-48a0-ada6-acb5c8e4c5e0",
  "timestamp": "2026-11-12T16:47:34.976Z"
}
```

O `requestId` é aceito via header `x-request-id` ou gerado automaticamente e
devolvido na resposta. Ele também aparece nos logs, permitindo correlacionar uma
requisição com seus eventos.

## Arquitetura

```text
src/
├── common/          # filtro global de exceções, interceptor de logs, erros
├── prisma/          # PrismaService/PrismaModule
├── integracao/      # regra central e idempotente de correlação pedido ↔ exame ↔ documento
├── pedidos/         # controller, service, DTOs, mapper
├── documentos/      # controller, service, DTOs, mapper
├── exames/          # controller, service, DTOs, mapper
├── health/          # health check (API + banco)
├── app.module.ts
├── app.setup.ts     # pipes/filtros/interceptors compartilhados com os testes
└── main.ts          # bootstrap + Swagger + logs estruturados
```

A lógica de integração não fica duplicada nos três fluxos: `IntegracaoService`
expõe uma reconciliação única, executada dentro da transação do fluxo chamador.
Controllers só traduzem HTTP; services orquestram transações; mappers isolam o
formato de resposta do modelo do Prisma.

## Decisões técnicas

- **MySQL/MariaDB + Prisma**: mantém o modelo relacional próximo de um cenário de
  produção. `conteudoBase64` usa `LONGTEXT` para não limitar o tamanho do
  documento. O `docker compose` sobe um MySQL 8.4 dedicado (`mysql:8.4`) com
  volume nomeado, rede própria do Compose e usuário restrito ao schema; a API
  alcança o banco por `db:3306` e só inicia depois do healthcheck do MySQL. Um
  MySQL/MariaDB já instalado na máquina continua suportado via `DATABASE_URL`.
- **Reconciliação centralizada e idempotente**: os três eventos (pedido,
  documento, exame) convergem para o mesmo cálculo de estado. Isso evita regras
  divergentes e faz reenvios não gerarem duplicidade.
- **Transações**: cada fluxo de escrita roda em `prisma.$transaction`, incluindo
  a reconciliação, para não deixar pedido/documento parcialmente integrados.
- **Unicidade no banco**: além das validações de serviço, as constraints unique
  protegem contra corrida. O `P2002` de documento é traduzido para
  `DOCUMENTO_DUPLICADO`.
- **Accession number como string**: preserva zeros à esquerda e mantém a
  semântica do identificador DICOM.
- **Identidade do item**: `CodigoItemPedido` dentro do pedido. Reenviar o mesmo
  item é uma operação idempotente; o accession number é usado para correlação
  com o exame, não como identidade do item.
- **Documentos em todos os exames do pedido**: um documento pertence ao pedido;
  quando o pedido tem múltiplos exames, ele aparece em todos, o que é mais útil
  para o laudo do que escolher apenas o primeiro exame.
- **Logs estruturados em JSON** (`ConsoleLogger` do Nest com `json: true`), com
  eventos de negócio (`pedido.criado`, `documento.criado`, `exame.recebido`,
  `database.connected`) e de HTTP (`http.request.completed`), todos com
  `requestId`.
- **Entrada em PascalCase ou camelCase, saída em camelCase**: os DTOs espelham
  os payloads do enunciado (`CodigoPedido`, etc.) e um middleware normaliza a
  primeira letra das chaves, então as duas grafias são aceitas. A API responde
  sempre em camelCase.
- **`POST` sempre retorna 201**: pedido e exame funcionam como upsert; o corpo
  indica o estado final. A semântica de criação/atualização fica registrada nos
  logs.

## Casos cobertos pelos testes

Testes de integração (`test/integracao.e2e-spec.ts`):

1. Pedido chega sem exame correspondente → salvo como não integrado.
2. Pedido chega com exame já existente → salvo como integrado.
3. Documento chega antes do exame → salvo pendente; quando o exame chega, pedido
   fica integrado e documento é vinculado (validado por `GET`).
4. Documento chega com pedido já integrado → vinculado na hora.
5. Pedido chega novamente com item novo → apenas o item novo é adicionado.
6. Documento duplicado → `409 DOCUMENTO_DUPLICADO`.
7. Pedido, exame e documento de pedido inexistente → `404`.
8. Payload inválido → `400 VALIDACAO_INVALIDA`.
9. Payload em PascalCase (como no enunciado) é aceito e normalizado.

Testes unitários: `src/integracao/integracao.service.spec.ts` cobre a reconciliação
(sem exame, com documento pendente, idempotência e deduplicação por accession
number); `src/pedidos/pedidos.service.spec.ts`, `src/documentos/documentos.service.spec.ts`
e `src/exames/exames.service.spec.ts` cobrem cada fluxo de escrita, upsert,
duplicidade, validações e consultas com Prisma/integração mockados.
`test/health.e2e-spec.ts` valida o health check com banco conectado.

## Limitações e próximos passos

- Autenticação/autorização, mensageria, parsing real de DICOM/HL7 e storage real
  de anexos estão fora do escopo, conforme o enunciado.
- Para produção: serviço MySQL dedicado em vez do banco local, paginação nas
  listagens, rate limiting,
  idempotency keys nos endpoints de escrita e observabilidade (OpenTelemetry).
- O armazenamento do documento em base64 no MySQL serve apenas para demonstrar
  o vínculo; o conteúdo poderia ir para S3/object storage com metadados no banco.
