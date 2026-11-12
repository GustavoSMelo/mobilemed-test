import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  close: () => Promise<void>;
}

/**
 * Os testes usam um banco MySQL dedicado. O nome precisa terminar em `_test`,
 * pois o schema é recriado com `prisma db push --force-reset` antes da suíte.
 */
function resolveTestDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  const base = explicit ?? process.env.DATABASE_URL;

  if (!base) {
    throw new Error(
      'Defina TEST_DATABASE_URL (ou DATABASE_URL) para rodar os testes de integração.',
    );
  }

  const url = new URL(base);
  const currentDatabase = url.pathname.replace(/^\//, '');

  if (!explicit) {
    url.pathname = `/${currentDatabase}_test`;
  }

  const database = url.pathname.replace(/^\//, '');

  if (!database.endsWith('_test')) {
    throw new Error(
      `O banco de testes precisa terminar com "_test" (recebido: "${database}").`,
    );
  }

  return url.toString();
}

export async function createTestApp(): Promise<TestContext> {
  const databaseUrl = resolveTestDatabaseUrl();

  execFileSync(
    join(process.cwd(), 'node_modules', '.bin', 'prisma'),
    ['db', 'push', '--skip-generate', '--force-reset'],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    },
  );

  process.env.DATABASE_URL = databaseUrl;

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = configureApp(moduleFixture.createNestApplication());
  app.useLogger(false);
  await app.init();

  const prisma = app.get(PrismaService);

  return {
    app,
    prisma,
    close: async () => {
      await app.close();
    },
  };
}

export async function limparBanco(prisma: PrismaService): Promise<void> {
  await prisma.documentoExame.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.exame.deleteMany();
}
