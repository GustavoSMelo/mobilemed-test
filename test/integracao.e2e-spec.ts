import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestApp,
  limparBanco,
  type TestContext,
} from './utils/test-app.js';

const pedidoBase = {
  codigoPedido: 616,
  nomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
  dataNascimento: '19970601',
  sexo: 'M',
  codUnidade: 104,
  exames: [
    {
      codigoItemPedido: 930,
      accessionNumber: '930',
      modalidade: 'CR',
      nomeProcedimento: 'RX ANTEBRACO ESQUERDO',
    },
  ],
};

const exameBase = {
  accessionNumber: '930',
  nomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
  modalidade: 'CR',
  status: 'NOVO',
};

const documentoBase = {
  codigoDocumento: 251,
  codigoPedido: 616,
  nomeDocumento: 'PEDIDO',
  documento: 'YmFzZTY0',
};

describe('Fluxo de integração (e2e)', () => {
  let contexto: TestContext;

  beforeAll(async () => {
    contexto = await createTestApp();
  });

  afterAll(async () => {
    await contexto.close();
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  it('salva pedido como não integrado quando o exame ainda não chegou', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post('/pedidos')
      .send(pedidoBase)
      .expect(201);

    expect(resposta.body.integrado).toBe(false);
    expect(resposta.body.exames).toHaveLength(1);
    expect(resposta.body.exames[0]).toMatchObject({
      codigoItemPedido: 930,
      accessionNumber: '930',
      exameRecebido: false,
    });

    const consulta = await request(contexto.app.getHttpServer())
      .get('/pedidos/616')
      .expect(200);

    expect(consulta.body.integrado).toBe(false);
  });

  it('salva pedido como integrado quando já existe exame com o accession number', async () => {
    await request(contexto.app.getHttpServer())
      .post('/exames')
      .send(exameBase)
      .expect(201);

    const resposta = await request(contexto.app.getHttpServer())
      .post('/pedidos')
      .send(pedidoBase)
      .expect(201);

    expect(resposta.body.integrado).toBe(true);
    expect(resposta.body.exames[0].exameRecebido).toBe(true);
  });

  it('salva documento pendente e o vincula quando o exame chega', async () => {
    await request(contexto.app.getHttpServer())
      .post('/pedidos')
      .send(pedidoBase)
      .expect(201);

    const documentoPendente = await request(contexto.app.getHttpServer())
      .post('/documentos')
      .send(documentoBase)
      .expect(201);

    expect(documentoPendente.body.integrado).toBe(false);
    expect(documentoPendente.body.exames).toEqual([]);

    const chegada = await request(contexto.app.getHttpServer())
      .post('/exames')
      .send(exameBase)
      .expect(201);

    expect(chegada.body.pedidos).toEqual([
      { codigoPedido: 616, integrado: true },
    ]);
    expect(chegada.body.documentos).toEqual([
      {
        codigoDocumento: 251,
        codigoPedido: 616,
        nomeDocumento: 'PEDIDO',
        integrado: true,
      },
    ]);

    const documentos = await request(contexto.app.getHttpServer())
      .get('/documentos/616')
      .expect(200);

    expect(documentos.body).toHaveLength(1);
    expect(documentos.body[0].integrado).toBe(true);
    expect(documentos.body[0].exames).toEqual([
      expect.objectContaining({ accessionNumber: '930' }),
    ]);

    const pedido = await request(contexto.app.getHttpServer())
      .get('/pedidos/616')
      .expect(200);

    expect(pedido.body.integrado).toBe(true);
    expect(pedido.body.documentos[0]).toMatchObject({
      codigoDocumento: 251,
      integrado: true,
      exames: ['930'],
    });
  });

  it('vincula documento imediatamente quando o pedido já está integrado', async () => {
    await request(contexto.app.getHttpServer())
      .post('/exames')
      .send(exameBase)
      .expect(201);
    await request(contexto.app.getHttpServer())
      .post('/pedidos')
      .send(pedidoBase)
      .expect(201);

    const resposta = await request(contexto.app.getHttpServer())
      .post('/documentos')
      .send(documentoBase)
      .expect(201);

    expect(resposta.body.integrado).toBe(true);
    expect(resposta.body.exames[0].accessionNumber).toBe('930');
  });

  it('aceita payload no formato PascalCase do enunciado', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post('/pedidos')
      .send({
        CodigoPedido: 616,
        NomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
        DataNascimento: '19970601',
        Sexo: 'M',
        CodUnidade: 104,
        Exames: [
          {
            CodigoItemPedido: 930,
            AccessionNumber: '930',
            Modalidade: 'CR',
            NomeProcedimento: 'RX ANTEBRACO ESQUERDO',
          },
        ],
      })
      .expect(201);

    expect(resposta.body).toMatchObject({
      codigoPedido: 616,
      integrado: false,
      exames: [{ accessionNumber: '930' }],
    });
  });

  it('adiciona apenas exames novos quando o pedido chega novamente', async () => {
    await request(contexto.app.getHttpServer())
      .post('/pedidos')
      .send(pedidoBase)
      .expect(201);

    const resposta = await request(contexto.app.getHttpServer())
      .post('/pedidos')
      .send({
        ...pedidoBase,
        exames: [
          ...pedidoBase.exames,
          {
            codigoItemPedido: 931,
            accessionNumber: '931',
            modalidade: 'CR',
            nomeProcedimento: 'RX MAO DIREITA',
          },
        ],
      })
      .expect(201);

    expect(
      resposta.body.exames.map(
        (item: { codigoItemPedido: number }) => item.codigoItemPedido,
      ),
    ).toEqual([930, 931]);

    const pedido = await request(contexto.app.getHttpServer())
      .get('/pedidos/616')
      .expect(200);

    expect(pedido.body.exames).toHaveLength(2);
  });

  it('retorna 409 ao receber documento duplicado', async () => {
    await request(contexto.app.getHttpServer())
      .post('/pedidos')
      .send(pedidoBase)
      .expect(201);
    await request(contexto.app.getHttpServer())
      .post('/documentos')
      .send(documentoBase)
      .expect(201);

    const resposta = await request(contexto.app.getHttpServer())
      .post('/documentos')
      .send(documentoBase)
      .expect(409);

    expect(resposta.body).toMatchObject({
      statusCode: 409,
      code: 'DOCUMENTO_DUPLICADO',
      details: { codigoDocumento: 251, codigoPedido: 616 },
    });
    expect(resposta.headers['x-request-id']).toBeTruthy();
  });

  it('retorna 404 para pedido, exame e documento de pedido inexistente', async () => {
    const pedido = await request(contexto.app.getHttpServer())
      .get('/pedidos/999')
      .expect(404);
    expect(pedido.body.code).toBe('PEDIDO_NAO_ENCONTRADO');

    const exame = await request(contexto.app.getHttpServer())
      .get('/exames/999')
      .expect(404);
    expect(exame.body.code).toBe('EXAME_NAO_ENCONTRADO');

    const documento = await request(contexto.app.getHttpServer())
      .post('/documentos')
      .send({ ...documentoBase, codigoPedido: 999 })
      .expect(404);
    expect(documento.body.code).toBe('PEDIDO_NAO_ENCONTRADO');
  });

  it('retorna 400 com código de validação para payload inválido', async () => {
    const resposta = await request(contexto.app.getHttpServer())
      .post('/pedidos')
      .send({ codigoPedido: 616 })
      .expect(400);

    expect(resposta.body.code).toBe('VALIDACAO_INVALIDA');
    expect(Array.isArray(resposta.body.details)).toBe(true);
  });
});
