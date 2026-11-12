import type { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { IntegracaoService } from './integracao.service.js';

function asTransaction(tx: Record<string, unknown>): Prisma.TransactionClient {
  return tx as unknown as Prisma.TransactionClient;
}

describe('IntegracaoService', () => {
  const service = new IntegracaoService();

  it('mantém o pedido não integrado quando não existe exame', async () => {
    const txMock = {
      pedido: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          integrado: false,
          itens: [{ accessionNumber: '930' }],
          documentos: [{ id: 10, integrado: false }],
        }),
        update: vi.fn(),
      },
      exame: { findMany: vi.fn().mockResolvedValue([]) },
      documentoExame: { findMany: vi.fn(), createMany: vi.fn() },
      documento: { updateMany: vi.fn() },
    };

    const resultado = await service.reconciliarPedido(
      asTransaction(txMock),
      616,
    );

    expect(resultado).toEqual({ integrado: false, documentosVinculados: 0 });
    expect(txMock.pedido.update).not.toHaveBeenCalled();
    expect(txMock.documentoExame.createMany).not.toHaveBeenCalled();
  });

  it('integra o pedido e vincula documentos pendentes ao exame existente', async () => {
    const txMock = {
      pedido: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          integrado: false,
          itens: [{ accessionNumber: '930' }],
          documentos: [{ id: 10, integrado: false }],
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      exame: { findMany: vi.fn().mockResolvedValue([{ id: 5 }]) },
      documentoExame: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      documento: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };

    const resultado = await service.reconciliarPedido(
      asTransaction(txMock),
      616,
    );

    expect(resultado).toEqual({ integrado: true, documentosVinculados: 1 });
    expect(txMock.pedido.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { integrado: true },
    });
    expect(txMock.documentoExame.createMany).toHaveBeenCalledWith({
      data: [{ documentoId: 10, exameId: 5 }],
    });
    expect(txMock.documento.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [10] } },
      data: { integrado: true },
    });
  });

  it('é idempotente ao reconciliar um documento que já está vinculado', async () => {
    const txMock = {
      pedido: {
        findUnique: vi.fn().mockResolvedValue({
          id: 1,
          integrado: true,
          itens: [{ accessionNumber: '930' }],
          documentos: [{ id: 10, integrado: true }],
        }),
        update: vi.fn(),
      },
      exame: { findMany: vi.fn().mockResolvedValue([{ id: 5 }]) },
      documentoExame: {
        findMany: vi.fn().mockResolvedValue([{ documentoId: 10, exameId: 5 }]),
        createMany: vi.fn(),
      },
      documento: { updateMany: vi.fn() },
    };

    const resultado = await service.reconciliarPedido(
      asTransaction(txMock),
      616,
    );

    expect(resultado).toEqual({ integrado: true, documentosVinculados: 0 });
    expect(txMock.pedido.update).not.toHaveBeenCalled();
    expect(txMock.documentoExame.createMany).not.toHaveBeenCalled();
  });

  it('deduplica os pedidos encontrados pelo accession number', async () => {
    const txMock = {
      itemPedido: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { pedido: { codigoPedido: 616 } },
            { pedido: { codigoPedido: 616 } },
            { pedido: { codigoPedido: 615 } },
          ]),
      },
    };

    const codigos = await service.buscarCodigosPedidoPorAccessionNumber(
      asTransaction(txMock),
      '930',
    );

    expect(codigos).toEqual([615, 616]);
  });
});
