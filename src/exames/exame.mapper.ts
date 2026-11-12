import { Prisma } from '@prisma/client';
import type { ExameResponseDto } from './dto/exame-response.dto.js';

export const exameInclude = {
  documentos: {
    orderBy: { vinculadoEm: 'asc' },
    include: {
      documento: {
        select: {
          codigoDocumento: true,
          codigoPedido: true,
          nomeDocumento: true,
          integrado: true,
        },
      },
    },
  },
} satisfies Prisma.ExameInclude;

export type ExameComRelacoes = Prisma.ExameGetPayload<{
  include: typeof exameInclude;
}>;

export function toExameResponse(
  exame: ExameComRelacoes,
  pedidos: Array<{ codigoPedido: number; integrado: boolean }>,
): ExameResponseDto {
  return {
    accessionNumber: exame.accessionNumber,
    nomePaciente: exame.nomePaciente,
    modalidade: exame.modalidade,
    status: exame.status,
    criadoEm: exame.criadoEm.toISOString(),
    atualizadoEm: exame.atualizadoEm.toISOString(),
    pedidos: pedidos.map((pedido) => ({
      codigoPedido: pedido.codigoPedido,
      integrado: pedido.integrado,
    })),
    documentos: exame.documentos.map((vinculo) => ({
      codigoDocumento: vinculo.documento.codigoDocumento,
      codigoPedido: vinculo.documento.codigoPedido,
      nomeDocumento: vinculo.documento.nomeDocumento,
      integrado: vinculo.documento.integrado,
    })),
  };
}
