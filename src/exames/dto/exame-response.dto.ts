import { ApiProperty } from '@nestjs/swagger';

export class PedidoVinculadoResponseDto {
  @ApiProperty({ example: 616 })
  codigoPedido: number;

  @ApiProperty({ example: true })
  integrado: boolean;
}

export class DocumentoVinculadoResponseDto {
  @ApiProperty({ example: 251 })
  codigoDocumento: number;

  @ApiProperty({ example: 615 })
  codigoPedido: number;

  @ApiProperty({ example: 'PEDIDO' })
  nomeDocumento: string;

  @ApiProperty({ example: true })
  integrado: boolean;
}

export class ExameResponseDto {
  @ApiProperty({ example: '930' })
  accessionNumber: string;

  @ApiProperty({ example: 'ALEFHER MONTONI DE ALMEIDA' })
  nomePaciente: string;

  @ApiProperty({ example: 'CR' })
  modalidade: string;

  @ApiProperty({ example: 'NOVO' })
  status: string;

  @ApiProperty({ example: '2026-11-12T16:00:00.000Z' })
  criadoEm: string;

  @ApiProperty({ example: '2026-11-12T16:00:00.000Z' })
  atualizadoEm: string;

  @ApiProperty({ type: [PedidoVinculadoResponseDto] })
  pedidos: PedidoVinculadoResponseDto[];

  @ApiProperty({ type: [DocumentoVinculadoResponseDto] })
  documentos: DocumentoVinculadoResponseDto[];
}
