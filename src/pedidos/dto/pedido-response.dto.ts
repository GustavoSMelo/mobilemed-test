import { ApiProperty } from '@nestjs/swagger';

export class ItemPedidoResponseDto {
  @ApiProperty({ example: 930 })
  codigoItemPedido: number;

  @ApiProperty({ example: '930' })
  accessionNumber: string;

  @ApiProperty({ example: 'CR' })
  modalidade: string;

  @ApiProperty({ example: 'RX ANTEBRACO ESQUERDO' })
  nomeProcedimento: string;

  @ApiProperty({
    description: 'Indica se o exame correspondente já chegou ao sistema.',
    example: true,
  })
  exameRecebido: boolean;
}

export class DocumentoResumoResponseDto {
  @ApiProperty({ example: 251 })
  codigoDocumento: number;

  @ApiProperty({ example: 'PEDIDO' })
  nomeDocumento: string;

  @ApiProperty({ example: false })
  integrado: boolean;

  @ApiProperty({
    description:
      'Accession numbers dos exames aos quais o documento está vinculado.',
    type: [String],
    example: ['930'],
  })
  exames: string[];
}

export class PedidoResponseDto {
  @ApiProperty({ example: 616 })
  codigoPedido: number;

  @ApiProperty({ example: 'ALEFHER MONTONI DE ALMEIDA' })
  nomePaciente: string;

  @ApiProperty({ example: '19970601' })
  dataNascimento: string;

  @ApiProperty({ example: 'M' })
  sexo: string;

  @ApiProperty({ example: 104 })
  codUnidade: number;

  @ApiProperty({
    description:
      'true quando ao menos um exame do pedido já chegou ao sistema.',
    example: true,
  })
  integrado: boolean;

  @ApiProperty({ example: '2026-11-12T16:00:00.000Z' })
  criadoEm: string;

  @ApiProperty({ example: '2026-11-12T16:00:00.000Z' })
  atualizadoEm: string;

  @ApiProperty({ type: [ItemPedidoResponseDto] })
  exames: ItemPedidoResponseDto[];

  @ApiProperty({ type: [DocumentoResumoResponseDto] })
  documentos: DocumentoResumoResponseDto[];
}
