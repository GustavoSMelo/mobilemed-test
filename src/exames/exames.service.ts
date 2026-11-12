import { Injectable, Logger } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception.js';
import { IntegracaoService } from '../integracao/integracao.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateExameDto } from './dto/create-exame.dto.js';
import type { ExameResponseDto } from './dto/exame-response.dto.js';
import { exameInclude, toExameResponse } from './exame.mapper.js';

@Injectable()
export class ExamesService {
  private readonly logger = new Logger(ExamesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integracao: IntegracaoService,
  ) {}

  /**
   * Simula a chegada de um exame (evento do PACS).
   *
   * O exame é persistido pelo accession number. Todos os pedidos que possuem
   * um item com esse accession number passam a `integrado: true` e seus
   * documentos pendentes são vinculados aos exames existentes.
   */
  public async receber(dto: CreateExameDto): Promise<ExameResponseDto> {
    const resultado = await this.prisma.$transaction(async (tx) => {
      const existente = await tx.exame.findUnique({
        where: { accessionNumber: dto.accessionNumber },
        select: { id: true },
      });

      const exame = existente
        ? await tx.exame.update({
            where: { id: existente.id },
            data: {
              nomePaciente: dto.nomePaciente,
              modalidade: dto.modalidade,
              ...(dto.status === undefined ? {} : { status: dto.status }),
            },
          })
        : await tx.exame.create({
            data: {
              accessionNumber: dto.accessionNumber,
              nomePaciente: dto.nomePaciente,
              modalidade: dto.modalidade,
              status: dto.status ?? 'NOVO',
            },
          });

      const codigosPedido =
        await this.integracao.buscarCodigosPedidoPorAccessionNumber(
          tx,
          dto.accessionNumber,
        );

      let documentosVinculados = 0;
      for (const codigoPedido of codigosPedido) {
        const reconciliacao = await this.integracao.reconciliarPedido(
          tx,
          codigoPedido,
        );
        documentosVinculados += reconciliacao.documentosVinculados;
      }

      const salvo = await tx.exame.findUniqueOrThrow({
        where: { id: exame.id },
        include: exameInclude,
      });
      const pedidos = await tx.pedido.findMany({
        where: { itens: { some: { accessionNumber: dto.accessionNumber } } },
        select: { codigoPedido: true, integrado: true },
        orderBy: { codigoPedido: 'asc' },
      });

      return {
        response: toExameResponse(salvo, pedidos),
        exameId: exame.id,
        recemChegado: !existente,
        pedidosAtualizados: codigosPedido.length,
        documentosVinculados,
      };
    });

    this.logger.log({
      event: resultado.recemChegado ? 'exame.recebido' : 'exame.atualizado',
      exameId: resultado.exameId,
      accessionNumber: dto.accessionNumber,
      modalidade: dto.modalidade,
      pedidosAtualizados: resultado.pedidosAtualizados,
      documentosVinculados: resultado.documentosVinculados,
    });

    return resultado.response;
  }

  async buscarPorAccessionNumber(
    accessionNumber: string,
  ): Promise<ExameResponseDto> {
    const exame = await this.prisma.exame.findUnique({
      where: { accessionNumber },
      include: exameInclude,
    });

    if (!exame) {
      throw ApiException.exameNaoEncontrado(accessionNumber);
    }

    const pedidos = await this.prisma.pedido.findMany({
      where: { itens: { some: { accessionNumber } } },
      select: { codigoPedido: true, integrado: true },
      orderBy: { codigoPedido: 'asc' },
    });

    return toExameResponse(exame, pedidos);
  }
}
