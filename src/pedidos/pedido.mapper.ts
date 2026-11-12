import { Prisma } from '@prisma/client';
import type {
  DocumentoResumoResponseDto,
  ItemPedidoResponseDto,
  PedidoResponseDto,
} from './dto/pedido-response.dto.js';

export const pedidoInclude = {
  itens: { orderBy: { codigoItemPedido: 'asc' } },
  documentos: {
    orderBy: { codigoDocumento: 'asc' },
    include: {
      exames: {
        include: {
          exame: { select: { accessionNumber: true, modalidade: true } },
        },
      },
    },
  },
} satisfies Prisma.PedidoInclude;

export type PedidoComRelacoes = Prisma.PedidoGetPayload<{
  include: typeof pedidoInclude;
}>;

export function toPedidoResponse(
  pedido: PedidoComRelacoes,
  accessionNumbersRecebidos: Set<string>,
): PedidoResponseDto {
  const exames: ItemPedidoResponseDto[] = pedido.itens.map((item) => ({
    codigoItemPedido: item.codigoItemPedido,
    accessionNumber: item.accessionNumber,
    modalidade: item.modalidade,
    nomeProcedimento: item.nomeProcedimento,
    exameRecebido: accessionNumbersRecebidos.has(item.accessionNumber),
  }));

  const documentos: DocumentoResumoResponseDto[] = pedido.documentos.map(
    (documento) => ({
      codigoDocumento: documento.codigoDocumento,
      nomeDocumento: documento.nomeDocumento,
      integrado: documento.integrado,
      exames: documento.exames.map((vinculo) => vinculo.exame.accessionNumber),
    }),
  );

  return {
    codigoPedido: pedido.codigoPedido,
    nomePaciente: pedido.nomePaciente,
    dataNascimento: pedido.dataNascimento,
    sexo: pedido.sexo,
    codUnidade: pedido.codUnidade,
    integrado: pedido.integrado,
    criadoEm: pedido.criadoEm.toISOString(),
    atualizadoEm: pedido.atualizadoEm.toISOString(),
    exames,
    documentos,
  };
}
