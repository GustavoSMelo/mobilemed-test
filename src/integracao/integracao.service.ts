import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface ResultadoReconciliacao {
  /** Se o pedido possui ao menos um exame recebido. */
  integrado: boolean;
  /** Documentos que estavam pendentes e passaram a estar vinculados a exames. */
  documentosVinculados: number;
}

/**
 * Centraliza a regra de correlação entre pedido, exame e documento.
 *
 * A reconciliação é idempotente: pode ser chamada em qualquer um dos fluxos
 * (chegada de pedido, de documento ou de exame) e sempre deixa o pedido com o
 * estado `integrado` coerente e os documentos vinculados aos exames existentes.
 */
@Injectable()
export class IntegracaoService {
  public async reconciliarPedido(
    tx: Prisma.TransactionClient,
    codigoPedido: number,
  ): Promise<ResultadoReconciliacao> {
    const pedido = await tx.pedido.findUnique({
      where: { codigoPedido },
      select: {
        id: true,
        integrado: true,
        itens: { select: { accessionNumber: true } },
        documentos: { select: { id: true, integrado: true } },
      },
    });

    if (!pedido) {
      return { integrado: false, documentosVinculados: 0 };
    }

    const accessionNumbers = [
      ...new Set(pedido.itens.map((item) => item.accessionNumber)),
    ];
    const exames = accessionNumbers.length
      ? await tx.exame.findMany({
          where: { accessionNumber: { in: accessionNumbers } },
          select: { id: true },
        })
      : [];
    const integrado = exames.length > 0;

    if (integrado !== pedido.integrado) {
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { integrado },
      });
    }

    if (!integrado || pedido.documentos.length === 0) {
      return { integrado, documentosVinculados: 0 };
    }

    return {
      integrado,
      documentosVinculados: await this.vincularDocumentosAosExames(
        tx,
        pedido.documentos,
        exames.map((exame) => exame.id),
      ),
    };
  }

  /**
   * Retorna os pedidos que possuem um item com o accession number informado.
   * É a chave de correlação entre o pedido e o exame que chega do PACS.
   */
  async buscarCodigosPedidoPorAccessionNumber(
    tx: Prisma.TransactionClient,
    accessionNumber: string,
  ): Promise<number[]> {
    const itens = await tx.itemPedido.findMany({
      where: { accessionNumber },
      select: { pedido: { select: { codigoPedido: true } } },
    });

    return [...new Set(itens.map((item) => item.pedido.codigoPedido))].sort(
      (a, b) => a - b,
    );
  }

  private async vincularDocumentosAosExames(
    tx: Prisma.TransactionClient,
    documentos: Array<{ id: number; integrado: boolean }>,
    exameIds: number[],
  ): Promise<number> {
    const documentoIds = documentos.map((documento) => documento.id);

    const vinculosExistentes = await tx.documentoExame.findMany({
      where: { documentoId: { in: documentoIds } },
      select: { documentoId: true, exameId: true },
    });
    const chavesExistentes = new Set(
      vinculosExistentes.map(
        (vinculo) => `${vinculo.documentoId}:${vinculo.exameId}`,
      ),
    );

    const novosVinculos = documentos.flatMap((documento) =>
      exameIds
        .filter(
          (exameId) => !chavesExistentes.has(`${documento.id}:${exameId}`),
        )
        .map((exameId) => ({ documentoId: documento.id, exameId })),
    );

    if (novosVinculos.length > 0) {
      await tx.documentoExame.createMany({ data: novosVinculos });
    }

    await tx.documento.updateMany({
      where: { id: { in: documentoIds } },
      data: { integrado: true },
    });

    const documentosPendentes = new Set(
      documentos
        .filter((documento) => !documento.integrado)
        .map((documento) => documento.id),
    );

    return new Set(
      novosVinculos
        .map((vinculo) => vinculo.documentoId)
        .filter((documentoId) => documentosPendentes.has(documentoId)),
    ).size;
  }
}
