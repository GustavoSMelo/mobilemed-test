import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception.js';
import { ErrorCode } from '../common/errors/error-codes.js';
import { Prisma } from '@prisma/client';
import { IntegracaoService } from '../integracao/integracao.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateItemPedidoDto,
  CreatePedidoDto,
} from './dto/create-pedido.dto.js';
import type { PedidoResponseDto } from './dto/pedido-response.dto.js';
import {
  pedidoInclude,
  toPedidoResponse,
  type PedidoComRelacoes,
} from './pedido.mapper.js';

@Injectable()
export class PedidosService {
  private readonly logger = new Logger(PedidosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integracao: IntegracaoService,
  ) {}

  /**
   * Cria ou atualiza um pedido pelo CodigoPedido.
   *
   * - Itens já existentes (mesmo CodigoItemPedido) não são duplicados.
   * - Apenas itens novos são adicionados ao pedido existente.
   * - Depois de persistir, reconcilia o pedido com os exames já recebidos,
   *   marcando `integrado` e vinculando documentos pendentes.
   */
  public async criar(dto: CreatePedidoDto): Promise<PedidoResponseDto> {
    const itens = this.deduplicarItens(dto.exames);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const existente = await tx.pedido.findUnique({
        where: { codigoPedido: dto.codigoPedido },
        select: {
          id: true,
          itens: { select: { codigoItemPedido: true } },
        },
      });

      let pedidoId: number;
      let itensAdicionados = 0;

      if (existente) {
        await tx.pedido.update({
          where: { id: existente.id },
          data: {
            nomePaciente: dto.nomePaciente,
            dataNascimento: dto.dataNascimento,
            sexo: dto.sexo,
            codUnidade: dto.codUnidade,
          },
        });

        const codigosExistentes = new Set(
          existente.itens.map((item) => item.codigoItemPedido),
        );
        const novosItens = itens.filter(
          (item) => !codigosExistentes.has(item.codigoItemPedido),
        );

        if (novosItens.length > 0) {
          await tx.itemPedido.createMany({
            data: novosItens.map((item) => ({
              codigoItemPedido: item.codigoItemPedido,
              accessionNumber: item.accessionNumber,
              modalidade: item.modalidade,
              nomeProcedimento: item.nomeProcedimento,
              pedidoId: existente.id,
            })),
          });
        }

        pedidoId = existente.id;
        itensAdicionados = novosItens.length;
      } else {
        const criado = await tx.pedido.create({
          data: {
            codigoPedido: dto.codigoPedido,
            nomePaciente: dto.nomePaciente,
            dataNascimento: dto.dataNascimento,
            sexo: dto.sexo,
            codUnidade: dto.codUnidade,
          },
          select: { id: true },
        });

        await tx.itemPedido.createMany({
          data: itens.map((item) => ({
            codigoItemPedido: item.codigoItemPedido,
            accessionNumber: item.accessionNumber,
            modalidade: item.modalidade,
            nomeProcedimento: item.nomeProcedimento,
            pedidoId: criado.id,
          })),
        });

        pedidoId = criado.id;
        itensAdicionados = itens.length;
      }

      const reconciliacao = await this.integracao.reconciliarPedido(
        tx,
        dto.codigoPedido,
      );
      const pedido = await this.buscarPedido(tx, dto.codigoPedido);
      const recebidos = await this.buscarAccessionNumbersRecebidos(
        tx,
        pedido.itens.map((item) => item.accessionNumber),
      );

      return {
        response: toPedidoResponse(pedido, recebidos),
        pedidoCriado: !existente,
        itensAdicionados,
        reconciliacao,
        pedidoId,
      };
    });

    this.logger.log({
      event: resultado.pedidoCriado ? 'pedido.criado' : 'pedido.atualizado',
      pedidoId: resultado.pedidoId,
      codigoPedido: dto.codigoPedido,
      itensAdicionados: resultado.itensAdicionados,
      integrado: resultado.response.integrado,
      documentosVinculados: resultado.reconciliacao.documentosVinculados,
    });

    return resultado.response;
  }

  public async buscarPorCodigo(codigoPedido: number): Promise<PedidoResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const pedido = await this.buscarPedido(tx, codigoPedido);
      const recebidos = await this.buscarAccessionNumbersRecebidos(
        tx,
        pedido.itens.map((item) => item.accessionNumber),
      );

      return toPedidoResponse(pedido, recebidos);
    });
  }

 private deduplicarItens(itens: CreateItemPedidoDto[]): CreateItemPedidoDto[] {
    const porCodigo = new Map<number, CreateItemPedidoDto>();

    for (const item of itens) {
      if (porCodigo.has(item.codigoItemPedido)) {
        throw new ApiException(
          HttpStatus.BAD_REQUEST,
          ErrorCode.VALIDACAO_INVALIDA,
          `O código de item ${item.codigoItemPedido} está repetido no pedido.`,
          { codigoItemPedido: item.codigoItemPedido },
        );
      }

      porCodigo.set(item.codigoItemPedido, item);
    }

    return [...porCodigo.values()];
  }

  private async buscarPedido(
    tx: Prisma.TransactionClient,
    codigoPedido: number,
  ): Promise<PedidoComRelacoes> {
    const pedido = await tx.pedido.findUnique({
      where: { codigoPedido },
      include: pedidoInclude,
    });

    if (!pedido) {
      throw ApiException.pedidoNaoEncontrado(codigoPedido);
    }

    return pedido;
  }

  private async buscarAccessionNumbersRecebidos(
    tx: Prisma.TransactionClient,
    accessionNumbers: string[],
  ): Promise<Set<string>> {
    const unicos = [...new Set(accessionNumbers)];

    if (unicos.length === 0) {
      return new Set();
    }

    const exames = await tx.exame.findMany({
      where: { accessionNumber: { in: unicos } },
      select: { accessionNumber: true },
    });

    return new Set(exames.map((exame) => exame.accessionNumber));
  }
}
