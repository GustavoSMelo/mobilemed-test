import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ example: 'DOCUMENTO_DUPLICADO' })
  code: string;

  @ApiProperty({
    example: 'Já existe um documento 251 para o pedido 615.',
  })
  message: string;

  @ApiProperty({
    required: false,
    example: { codigoDocumento: 251, codigoPedido: 615 },
  })
  details?: unknown;

  @ApiProperty({ example: '/documentos' })
  path: string;

  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({ example: '0f8fad5b-d9cb-469f-a165-70867728950e' })
  requestId: string;

  @ApiProperty({ example: '2026-11-12T16:00:00.000Z' })
  timestamp: string;
}
