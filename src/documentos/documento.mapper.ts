import { Prisma } from '@prisma/client';
import type { DocumentoResponseDto } from './dto/documento-response.dto.js';

export const documentoInclude = {
  exames: {
    orderBy: { vinculadoEm: 'asc' },
    include: {
      exame: {
        select: { accessionNumber: true, modalidade: true, status: true },
      },
    },
  },
} satisfies Prisma.DocumentoInclude;

export type DocumentoComRelacoes = Prisma.DocumentoGetPayload<{
  include: typeof documentoInclude;
}>;

export function toDocumentoResponse(
  documento: DocumentoComRelacoes,
): DocumentoResponseDto {
  return {
    codigoDocumento: documento.codigoDocumento,
    codigoPedido: documento.codigoPedido,
    nomeDocumento: documento.nomeDocumento,
    documento: documento.conteudoBase64,
    integrado: documento.integrado,
    criadoEm: documento.criadoEm.toISOString(),
    atualizadoEm: documento.atualizadoEm.toISOString(),
    exames: documento.exames.map((vinculo) => ({
      accessionNumber: vinculo.exame.accessionNumber,
      modalidade: vinculo.exame.modalidade,
      status: vinculo.exame.status,
      vinculadoEm: vinculo.vinculadoEm.toISOString(),
    })),
  };
}
