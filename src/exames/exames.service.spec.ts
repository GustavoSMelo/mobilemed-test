import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntegracaoService } from '../integracao/integracao.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CreateExameDto } from './dto/create-exame.dto.js';
import { ExamesService } from './exames.service.js';

const dto: CreateExameDto = {
  accessionNumber: '930',
  nomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
  modalidade: 'CR',
};

function exameComRelacoes(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    accessionNumber: '930',
    nomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
    modalidade: 'CR',
    status: 'NOVO',
    criadoEm: new Date('2026-01-01T10:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T10:00:00.000Z'),
    documentos: [
      {
        documentoId: 1,
        exameId: 5,
        vinculadoEm: new Date('2026-01-01T10:05:00.000Z'),
        documento: {
          codigoDocumento: 251,
          codigoPedido: 616,
          nomeDocumento: 'PEDIDO',
          integrado: true,
        },
      },
    ],
    ...overrides,
  };
}

function configurarServico() {
  const tx = {
    exame: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    pedido: { findMany: vi.fn() },
  };

  const prisma = {
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(tx)),
    exame: { findUnique: vi.fn() },
    pedido: { findMany: vi.fn() },
  };

  const integracao = {
    buscarCodigosPedidoPorAccessionNumber: vi.fn().mockResolvedValue([]),
    reconciliarPedido: vi
      .fn()
      .mockResolvedValue({ integrado: true, documentosVinculados: 0 }),
  };

  const service = new ExamesService(
    prisma as unknown as PrismaService,
    integracao as unknown as IntegracaoService,
  );

  return { service, prisma, tx, integracao };
}

describe('ExamesService', () => {
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

  it('recebe exame novo, integra pedidos e vincula documentos', async () => {
    const { service, tx, integracao } = configurarServico();

    tx.exame.findUnique.mockResolvedValue(null);
    tx.exame.create.mockResolvedValue({ id: 5 });
    tx.exame.findUniqueOrThrow.mockResolvedValue(exameComRelacoes());
    tx.pedido.findMany.mockResolvedValue([
      { codigoPedido: 616, integrado: true },
    ]);
    integracao.buscarCodigosPedidoPorAccessionNumber.mockResolvedValue([616]);
    integracao.reconciliarPedido.mockResolvedValue({
      integrado: true,
      documentosVinculados: 1,
    });

    const resposta = await service.receber(dto);

    expect(tx.exame.create).toHaveBeenCalledWith({
      data: {
        accessionNumber: '930',
        nomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
        modalidade: 'CR',
        status: 'NOVO',
      },
    });
    expect(tx.exame.update).not.toHaveBeenCalled();
    expect(
      integracao.buscarCodigosPedidoPorAccessionNumber,
    ).toHaveBeenCalledWith(tx, '930');
    expect(integracao.reconciliarPedido).toHaveBeenCalledWith(tx, 616);
    expect(resposta).toMatchObject({
      accessionNumber: '930',
      pedidos: [{ codigoPedido: 616, integrado: true }],
      documentos: [{ codigoDocumento: 251, integrado: true }],
    });
  });

  it('atualiza exame existente sem sobrescrever o status quando não informado', async () => {
    const { service, tx } = configurarServico();

    tx.exame.findUnique.mockResolvedValue({ id: 5 });
    tx.exame.update.mockResolvedValue({ id: 5 });
    tx.exame.findUniqueOrThrow.mockResolvedValue(exameComRelacoes());
    tx.pedido.findMany.mockResolvedValue([]);

    await service.receber(dto);

    const dadosAtualizacao = tx.exame.update.mock.calls[0][0].data;
    expect(dadosAtualizacao).toMatchObject({
      nomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
      modalidade: 'CR',
    });
    expect(dadosAtualizacao).not.toHaveProperty('status');
    expect(tx.exame.create).not.toHaveBeenCalled();
  });

  it('atualiza o status quando informado no reenvio do exame', async () => {
    const { service, tx } = configurarServico();

    tx.exame.findUnique.mockResolvedValue({ id: 5 });
    tx.exame.update.mockResolvedValue({ id: 5 });
    tx.exame.findUniqueOrThrow.mockResolvedValue(
      exameComRelacoes({ status: 'PROCESSANDO' }),
    );
    tx.pedido.findMany.mockResolvedValue([]);

    await service.receber({
      accessionNumber: dto.accessionNumber,
      nomePaciente: dto.nomePaciente,
      modalidade: dto.modalidade,
      status: 'PROCESSANDO',
    });

    expect(tx.exame.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        nomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
        modalidade: 'CR',
        status: 'PROCESSANDO',
      },
    });
  });

  it('não reconcilia pedidos quando nenhum pedido usa o accession number', async () => {
    const { service, tx, integracao } = configurarServico();

    tx.exame.findUnique.mockResolvedValue(null);
    tx.exame.create.mockResolvedValue({ id: 5 });
    tx.exame.findUniqueOrThrow.mockResolvedValue(
      exameComRelacoes({ documentos: [] }),
    );
    tx.pedido.findMany.mockResolvedValue([]);
    integracao.buscarCodigosPedidoPorAccessionNumber.mockResolvedValue([]);

    const resposta = await service.receber(dto);

    expect(integracao.reconciliarPedido).not.toHaveBeenCalled();
    expect(resposta.pedidos).toEqual([]);
    expect(resposta.documentos).toEqual([]);
  });

  it('retorna 404 quando o exame consultado não existe', async () => {
    const { service, prisma } = configurarServico();
    prisma.exame.findUnique.mockResolvedValue(null);

    await expect(service.buscarPorAccessionNumber('999')).rejects.toMatchObject(
      { code: 'EXAME_NAO_ENCONTRADO' },
    );
  });

  it('consulta exame com pedidos e documentos vinculados', async () => {
    const { service, prisma } = configurarServico();

    prisma.exame.findUnique.mockResolvedValue(exameComRelacoes());
    prisma.pedido.findMany.mockResolvedValue([
      { codigoPedido: 616, integrado: true },
    ]);

    const resposta = await service.buscarPorAccessionNumber('930');

    expect(prisma.exame.findUnique).toHaveBeenCalledWith({
      where: { accessionNumber: '930' },
      include: expect.any(Object),
    });
    expect(resposta).toMatchObject({
      accessionNumber: '930',
      pedidos: [{ codigoPedido: 616, integrado: true }],
      documentos: [
        {
          codigoDocumento: 251,
          codigoPedido: 616,
          nomeDocumento: 'PEDIDO',
          integrado: true,
        },
      ],
    });
  });
});
