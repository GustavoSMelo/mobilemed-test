import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestApp, type TestContext } from './utils/test-app.js';

describe('Health (e2e)', () => {
  let contexto: TestContext;

  beforeAll(async () => {
    contexto = await createTestApp();
  });

  afterAll(async () => {
    await contexto.close();
  });

  it('GET /health responde ok com o banco conectado', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(resposta.body).toMatchObject({ status: 'ok', database: 'up' });
  });
});
