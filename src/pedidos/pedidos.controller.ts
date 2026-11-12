import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { CreatePedidoDto } from './dto/create-pedido.dto.js';
import { PedidoResponseDto } from './dto/pedido-response.dto.js';
import { PedidosService } from './pedidos.service.js';

@ApiTags('Pedidos')
@Controller('pedidos')
export class PedidosController {
  public constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  @ApiOperation({
    summary: 'Recebe um pedido de exame',
    description:
      'Faz upsert pelo CodigoPedido. Se o pedido já existir, apenas os itens ' +
      'com CodigoItemPedido ainda não cadastrado são adicionados. O pedido é ' +
      'marcado como integrado quando já existe exame com o mesmo accession number.',
  })
  @ApiCreatedResponse({ type: PedidoResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  public criar(@Body() dto: CreatePedidoDto): Promise<PedidoResponseDto> {
    return this.pedidosService.criar(dto);
  }

  @Get(':codigoPedido')
  @ApiOperation({
    summary: 'Consulta um pedido, seus exames e documentos',
  })
  @ApiParam({ name: 'codigoPedido', example: 616 })
  @ApiOkResponse({ type: PedidoResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  public buscarPorCodigo(
    @Param('codigoPedido', ParseIntPipe) codigoPedido: number,
  ): Promise<PedidoResponseDto> {
    return this.pedidosService.buscarPorCodigo(codigoPedido);
  }
}
