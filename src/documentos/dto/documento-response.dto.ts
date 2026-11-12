import { ApiProperty } from '@nestjs/swagger';

export class ExameVinculadoResponseDto {
  @ApiProperty({ example: '930' })
  accessionNumber: string;

  @ApiProperty({ example: 'CR' })
  modalidade: string;

  @ApiProperty({ example: 'NOVO' })
  status: string;

  @ApiProperty({ example: '2026-11-12T16:00:00.000Z' })
  vinculadoEm: string;
}

export class DocumentoResponseDto {
  @ApiProperty({ example: 251 })
  codigoDocumento: number;

  @ApiProperty({ example: 615 })
  codigoPedido: number;

  @ApiProperty({ example: 'PEDIDO' })
  nomeDocumento: string;

  @ApiProperty({
    description: 'Conteúdo do documento em base64.',
    example: 'YmFzZTY0',
  })
  documento: string;

  @ApiProperty({
    description: 'true quando o documento está vinculado a ao menos um exame.',
    example: true,
  })
  integrado: boolean;

  @ApiProperty({ example: '2026-11-12T16:00:00.000Z' })
  criadoEm: string;

  @ApiProperty({ example: '2026-11-12T16:00:00.000Z' })
  atualizadoEm: string;

  @ApiProperty({ type: [ExameVinculadoResponseDto] })
  exames: ExameVinculadoResponseDto[];
}
