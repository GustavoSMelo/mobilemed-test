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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { DocumentosService } from './documentos.service.js';
import { CreateDocumentoDto } from './dto/create-documento.dto.js';
import { DocumentoResponseDto } from './dto/documento-response.dto.js';

@ApiTags('Documentos')
@Controller('documentos')
export class DocumentosController {
  public constructor(private readonly documentosService: DocumentosService) {}

  @Post()
  @ApiOperation({
    summary: 'Recebe um documento vinculado a um pedido',
    description:
      'A combinação CodigoDocumento + CodigoPedido é única. Se o pedido já ' +
      'estiver integrado, o documento é vinculado aos exames do pedido.',
  })
  @ApiCreatedResponse({ type: DocumentoResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Já existe documento com a mesma combinação de códigos.',
  })
  public criar(@Body() dto: CreateDocumentoDto): Promise<DocumentoResponseDto> {
    return this.documentosService.criar(dto);
  }

  @Get(':codigoPedido')
  @ApiOperation({
    summary: 'Lista os documentos de um pedido e seus exames vinculados',
  })
  @ApiParam({ name: 'codigoPedido', example: 615 })
  @ApiOkResponse({ type: [DocumentoResponseDto] })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  public listarPorPedido(
    @Param('codigoPedido', ParseIntPipe) codigoPedido: number,
  ): Promise<DocumentoResponseDto[]> {
    return this.documentosService.listarPorPedido(codigoPedido);
  }
}
