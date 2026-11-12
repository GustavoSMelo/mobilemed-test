import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateItemPedidoDto {
  @ApiProperty({
    description: 'Código do item dentro do pedido.',
    example: 930,
  })
  @IsInt()
  @Min(1)
  codigoItemPedido: number;

  @ApiProperty({
    description: 'Chave que correlaciona o item ao exame que chega do PACS.',
    example: '930',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  accessionNumber: string;

  @ApiProperty({ description: 'Modalidade DICOM.', example: 'CR' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  modalidade: string;

  @ApiProperty({ example: 'RX ANTEBRACO ESQUERDO' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nomeProcedimento: string;
}

export class CreatePedidoDto {
  @ApiProperty({ example: 616 })
  @IsInt()
  @Min(1)
  codigoPedido: number;

  @ApiProperty({ example: 'ALEFHER MONTONI DE ALMEIDA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nomePaciente: string;

  @ApiProperty({
    description: 'Data no formato AAAAMMDD.',
    example: '19970601',
  })
  @Matches(/^\d{8}$/, {
    message: 'dataNascimento deve estar no formato AAAAMMDD.',
  })
  dataNascimento: string;

  @ApiProperty({ example: 'M' })
  @IsString()
  @Length(1, 1)
  sexo: string;

  @ApiProperty({ example: 104 })
  @IsInt()
  @Min(1)
  codUnidade: number;

  @ApiProperty({ type: [CreateItemPedidoDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateItemPedidoDto)
  exames: CreateItemPedidoDto[];
}
