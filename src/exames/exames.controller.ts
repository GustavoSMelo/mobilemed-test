import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
import { CreateExameDto } from './dto/create-exame.dto.js';
import { ExameResponseDto } from './dto/exame-response.dto.js';
import { ExamesService } from './exames.service.js';

@ApiTags('Exames')
@Controller('exames')
export class ExamesController {
  constructor(private readonly examesService: ExamesService) {}

  @Post()
  @ApiOperation({
    summary: 'Simula a chegada de um exame',
    description:
      'Marca como integrados os pedidos que possuem item com o mesmo ' +
      'accession number e vincula os documentos pendentes desses pedidos.',
  })
  @ApiCreatedResponse({ type: ExameResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  public receber(@Body() dto: CreateExameDto): Promise<ExameResponseDto> {
    return this.examesService.receber(dto);
  }

  @Get(':accessionNumber')
  @ApiOperation({
    summary: 'Consulta um exame e os pedidos/documentos vinculados',
  })
  @ApiParam({ name: 'accessionNumber', example: '930' })
  @ApiOkResponse({ type: ExameResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  public buscarPorAccessionNumber(
    @Param('accessionNumber') accessionNumber: string,
  ): Promise<ExameResponseDto> {
    return this.examesService.buscarPorAccessionNumber(accessionNumber);
  }
}
