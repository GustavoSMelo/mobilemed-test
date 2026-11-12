import { Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntegracaoService } from '../integracao/integracao.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CreateDocumentoDto } from './dto/create-documento.dto.js';
import { DocumentosService } from './documentos.service.js';

const dto: CreateDocumentoDto = {
  codigoDocumento: 251,
  codigoPedido: 616,
  nomeDocumento: 'PEDIDO',
  documento: 'YmFzZTY0',
};

function documentoComRelacoes(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    codigoDocumento: 251,
    codigoPedido: 616,
    nomeDocumento: 'PEDIDO',
    conteudoBase64: 'YmFzZTY0',
    integrado: true,
    criadoEm: new Date('2026-01-01T10:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T10:00:00.000Z'),
    exames: [
      {
        documentoId: 1,
        exameId: 5,
        vinculadoEm: new Date('2026-01-01T10:05:00.000Z'),
        exame: {
          accessionNumber: '930',
          modalidade: 'CR',
          status: 'NOVO',
        },
      },
    ],
    ...overrides,
  };
}

function configurarServico() {
  const tx = {
    pedido: { findUnique: vi.fn() },
    documento: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  };

  const prisma = {
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(tx)),
    pedido: { findUnique: vi.fn() },
    documento: { findMany: vi.fn() },
  };

  const integracao = {
    reconciliarPedido: vi
      .fn()
      .mockResolvedValue({ integrado: true, documentosVinculados: 1 }),
  };

  const service = new DocumentosService(
    prisma as unknown as PrismaService,
    integracao as unknown as IntegracaoService,
  );

  return { service, prisma, tx, integracao };
}

describe('DocumentosService', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('salva o documento e o vincula quando o pedido está integrado', async () => {
    const { service, tx, integracao } = configurarServico();

    tx.pedido.findUnique.mockResolvedValue({ id: 1 });
    tx.documento.findUnique.mockResolvedValue(null);
    tx.documento.create.mockResolvedValue({ id: 1 });
    tx.documento.findUniqueOrThrow.mockResolvedValue(documentoComRelacoes());

    const resposta = await service.criar(dto);

    expect(tx.documento.create).toHaveBeenCalledWith({
      data: {
        codigoDocumento: 251,
        codigoPedido: 616,
        nomeDocumento: 'PEDIDO',
        conteudoBase64: 'YmFzZTY0',
      },
      select: { id: true },
    });
    expect(integracao.reconciliarPedido).toHaveBeenCalledWith(tx, 616);
    expect(resposta).toMatchObject({
      codigoDocumento: 251,
      codigoPedido: 616,
      documento: 'YmFzZTY0',
      integrado: true,
      exames: [{ accessionNumber: '930' }],
    });
  });

  it('retorna 409 quando o documento já existe para o pedido', async () => {
    const { service, tx } = configurarServico();

    tx.pedido.findUnique.mockResolvedValue({ id: 1 });
    tx.documento.findUnique.mockResolvedValue({ id: 1 });

    await expect(service.criar(dto)).rejects.toMatchObject({
      code: 'DOCUMENTO_DUPLICADO',
    });

    expect(tx.documento.create).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o pedido do documento não existe', async () => {
    const { service, tx } = configurarServico();

    tx.pedido.findUnique.mockResolvedValue(null);

    await expect(service.criar(dto)).rejects.toMatchObject({
      code: 'PEDIDO_NAO_ENCONTRADO',
    });

    expect(tx.documento.create).not.toHaveBeenCalled();
  });

  it('converte a corrida de unique (P2002) em 409', async () => {
    const { service, tx } = configurarServico();

    tx.pedido.findUnique.mockResolvedValue({ id: 1 });
    tx.documento.findUnique.mockResolvedValue(null);
    tx.documento.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
    );

    await expect(service.criar(dto)).rejects.toMatchObject({
      code: 'DOCUMENTO_DUPLICADO',
    });
  });

  it('retorna 404 ao listar documentos de pedido inexistente', async () => {
    const { service, prisma } = configurarServico();
    prisma.pedido.findUnique.mockResolvedValue(null);

    await expect(service.listarPorPedido(999)).rejects.toMatchObject({
      code: 'PEDIDO_NAO_ENCONTRADO',
    });
    expect(prisma.documento.findMany).not.toHaveBeenCalled();
  });

  it('lista os documentos do pedido com os exames vinculados', async () => {
    const { service, prisma } = configurarServico();

    prisma.pedido.findUnique.mockResolvedValue({ id: 1 });
    prisma.documento.findMany.mockResolvedValue([documentoComRelacoes()]);

    const documentos = await service.listarPorPedido(616);

    expect(prisma.documento.findMany).toHaveBeenCalledWith({
      where: { codigoPedido: 616 },
      include: expect.any(Object),
      orderBy: { codigoDocumento: 'asc' },
    });
    expect(documentos).toHaveLength(1);
    expect(documentos[0].exames[0]).toMatchObject({
      accessionNumber: '930',
      modalidade: 'CR',
      status: 'NOVO',
    });
  });
});
