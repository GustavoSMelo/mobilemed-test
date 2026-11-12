import { Injectable, Logger } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception.js';
import { Prisma } from '@prisma/client';
import { IntegracaoService } from '../integracao/integracao.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateDocumentoDto } from './dto/create-documento.dto.js';
import type { DocumentoResponseDto } from './dto/documento-response.dto.js';
import { documentoInclude, toDocumentoResponse } from './documento.mapper.js';

@Injectable()
export class DocumentosService {
  private readonly logger = new Logger(DocumentosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integracao: IntegracaoService,
  ) {}

  /**
   * Salva um documento vinculado a um pedido.
   *
   * A combinação CodigoDocumento + CodigoPedido é única. Quando o pedido já
   * está integrado, o documento é vinculado de imediato aos exames existentes
   * e marcado como integrado.
   */
  public async criar(dto: CreateDocumentoDto): Promise<DocumentoResponseDto> {
    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        const pedido = await tx.pedido.findUnique({
          where: { codigoPedido: dto.codigoPedido },
          select: { id: true },
        });

        if (!pedido) {
          throw ApiException.pedidoNaoEncontrado(dto.codigoPedido);
        }

        const duplicado = await tx.documento.findUnique({
          where: {
            codigoDocumento_codigoPedido: {
              codigoDocumento: dto.codigoDocumento,
              codigoPedido: dto.codigoPedido,
            },
          },
          select: { id: true },
        });

        if (duplicado) {
          throw ApiException.documentoDuplicado(
            dto.codigoDocumento,
            dto.codigoPedido,
          );
        }

        const documento = await tx.documento.create({
          data: {
            codigoDocumento: dto.codigoDocumento,
            codigoPedido: dto.codigoPedido,
            nomeDocumento: dto.nomeDocumento,
            conteudoBase64: dto.documento,
          },
          select: { id: true },
        });

        const reconciliacao = await this.integracao.reconciliarPedido(
          tx,
          dto.codigoPedido,
        );

        const salvo = await tx.documento.findUniqueOrThrow({
          where: { id: documento.id },
          include: documentoInclude,
        });

        return {
          response: toDocumentoResponse(salvo),
          reconciliacao,
          documentoId: documento.id,
        };
      });

      this.logger.log({
        event: 'documento.criado',
        documentoId: resultado.documentoId,
        codigoDocumento: dto.codigoDocumento,
        codigoPedido: dto.codigoPedido,
        integrado: resultado.response.integrado,
        examesVinculados: resultado.response.exames.length,
      });

      return resultado.response;
    } catch (error) {
      // Protege contra a corrida entre a checagem acima e o insert, coberta
      // pela unique (codigoDocumento, codigoPedido).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw ApiException.documentoDuplicado(
          dto.codigoDocumento,
          dto.codigoPedido,
        );
      }

      throw error;
    }
  }

  public async listarPorPedido(
    codigoPedido: number,
  ): Promise<DocumentoResponseDto[]> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { codigoPedido },
      select: { id: true },
    });

    if (!pedido) {
      throw ApiException.pedidoNaoEncontrado(codigoPedido);
    }

    const documentos = await this.prisma.documento.findMany({
      where: { codigoPedido },
      include: documentoInclude,
      orderBy: { codigoDocumento: 'asc' },
    });

    return documentos.map(toDocumentoResponse);
  }
}
