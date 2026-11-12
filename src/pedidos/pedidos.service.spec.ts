import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntegracaoService } from '../integracao/integracao.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { PedidosService } from './pedidos.service.js';

const dto: CreatePedidoDto = {
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

function itemPedido(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    pedidoId: 1,
    codigoItemPedido: 930,
    accessionNumber: '930',
    modalidade: 'CR',
    nomeProcedimento: 'RX ANTEBRACO ESQUERDO',
    ...overrides,
  };
}

function pedidoComRelacoes(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    codigoPedido: 616,
    nomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
    dataNascimento: '19970601',
    sexo: 'M',
    codUnidade: 104,
    integrado: false,
    criadoEm: new Date('2026-01-01T10:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T10:00:00.000Z'),
    itens: [itemPedido()],
    documentos: [],
    ...overrides,
  };
}

function configurarServico() {
  const tx = {
    pedido: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    itemPedido: { createMany: vi.fn() },
    exame: { findMany: vi.fn().mockResolvedValue([]) },
  };

  const prisma = {
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(tx)),
  };

  const integracao = {
    reconciliarPedido: vi
      .fn()
      .mockResolvedValue({ integrado: false, documentosVinculados: 0 }),
  };

  const service = new PedidosService(
    prisma as unknown as PrismaService,
    integracao as unknown as IntegracaoService,
  );

  return { service, prisma, tx, integracao };
}

describe('PedidosService', () => {
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

  it('cria um pedido novo com todos os itens', async () => {
    const { service, tx, integracao } = configurarServico();
    const pedidoSalvo = pedidoComRelacoes({ integrado: true });

    tx.pedido.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pedidoSalvo);
    tx.pedido.create.mockResolvedValue({ id: 1 });
    tx.exame.findMany.mockResolvedValue([{ accessionNumber: '930' }]);
    integracao.reconciliarPedido.mockResolvedValue({
      integrado: true,
      documentosVinculados: 1,
    });

    const resposta = await service.criar(dto);

    expect(tx.pedido.create).toHaveBeenCalledWith({
      data: {
        codigoPedido: 616,
        nomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
        dataNascimento: '19970601',
        sexo: 'M',
        codUnidade: 104,
      },
      select: { id: true },
    });
    expect(tx.itemPedido.createMany).toHaveBeenCalledWith({
      data: [
        {
          codigoItemPedido: 930,
          accessionNumber: '930',
          modalidade: 'CR',
          nomeProcedimento: 'RX ANTEBRACO ESQUERDO',
          pedidoId: 1,
        },
      ],
    });
    expect(integracao.reconciliarPedido).toHaveBeenCalledWith(tx, 616);
    expect(resposta).toMatchObject({
      codigoPedido: 616,
      integrado: true,
      exames: [{ codigoItemPedido: 930, exameRecebido: true }],
    });
  });

  it('adiciona apenas itens novos quando o pedido já existe', async () => {
    const { service, tx } = configurarServico();

    tx.pedido.findUnique
      .mockResolvedValueOnce({
        id: 1,
        itens: [{ codigoItemPedido: 930 }],
      })
      .mockResolvedValueOnce(
        pedidoComRelacoes({
          itens: [
            itemPedido(),
            itemPedido({
              id: 2,
              codigoItemPedido: 931,
              accessionNumber: '931',
              nomeProcedimento: 'RX MAO DIREITA',
            }),
          ],
        }),
      );
    tx.pedido.update.mockResolvedValue({ id: 1 });

    const resposta = await service.criar({
      codigoPedido: dto.codigoPedido,
      nomePaciente: dto.nomePaciente,
      dataNascimento: dto.dataNascimento,
      sexo: dto.sexo,
      codUnidade: dto.codUnidade,
      exames: [
        dto.exames[0],
        {
          codigoItemPedido: 931,
          accessionNumber: '931',
          modalidade: 'CR',
          nomeProcedimento: 'RX MAO DIREITA',
        },
      ],
    });

    expect(tx.pedido.create).not.toHaveBeenCalled();
    expect(tx.pedido.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        nomePaciente: 'ALEFHER MONTONI DE ALMEIDA',
        dataNascimento: '19970601',
        sexo: 'M',
        codUnidade: 104,
      },
    });
    expect(tx.itemPedido.createMany).toHaveBeenCalledWith({
      data: [
        {
          codigoItemPedido: 931,
          accessionNumber: '931',
          modalidade: 'CR',
          nomeProcedimento: 'RX MAO DIREITA',
          pedidoId: 1,
        },
      ],
    });
    expect(resposta.exames).toHaveLength(2);
  });

  it('não insere itens quando todos já existem no pedido', async () => {
    const { service, tx } = configurarServico();

    tx.pedido.findUnique
      .mockResolvedValueOnce({
        id: 1,
        itens: [{ codigoItemPedido: 930 }],
      })
      .mockResolvedValueOnce(pedidoComRelacoes());
    tx.pedido.update.mockResolvedValue({ id: 1 });

    await service.criar(dto);

    expect(tx.pedido.update).toHaveBeenCalled();
    expect(tx.itemPedido.createMany).not.toHaveBeenCalled();
  });

  it('rejeita codigoItemPedido repetido no payload', async () => {
    const { service, prisma } = configurarServico();

    await expect(
      service.criar({
        codigoPedido: dto.codigoPedido,
        nomePaciente: dto.nomePaciente,
        dataNascimento: dto.dataNascimento,
        sexo: dto.sexo,
        codUnidade: dto.codUnidade,
        exames: [
          dto.exames[0],
          {
            codigoItemPedido: 930,
            accessionNumber: '930',
            modalidade: 'CR',
            nomeProcedimento: 'RX ANTEBRACO ESQUERDO',
          },
        ],
      }),
    ).rejects.toMatchObject({ code: 'VALIDACAO_INVALIDA' });

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o pedido consultado não existe', async () => {
    const { service, tx } = configurarServico();
    tx.pedido.findUnique.mockResolvedValue(null);

    await expect(service.buscarPorCodigo(999)).rejects.toMatchObject({
      code: 'PEDIDO_NAO_ENCONTRADO',
    });
  });

  it('consulta pedido com exames recebidos e documentos vinculados', async () => {
    const { service, tx } = configurarServico();

    tx.pedido.findUnique.mockResolvedValue(
      pedidoComRelacoes({
        integrado: true,
        documentos: [
          {
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
                },
              },
            ],
          },
        ],
      }),
    );
    tx.exame.findMany.mockResolvedValue([{ accessionNumber: '930' }]);

    const resposta = await service.buscarPorCodigo(616);

    expect(resposta.integrado).toBe(true);
    expect(resposta.exames[0].exameRecebido).toBe(true);
    expect(resposta.documentos).toEqual([
      {
        codigoDocumento: 251,
        nomeDocumento: 'PEDIDO',
        integrado: true,
        exames: ['930'],
      },
    ]);
  });
});
