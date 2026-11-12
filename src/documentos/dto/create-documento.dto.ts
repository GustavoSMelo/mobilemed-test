import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDocumentoDto {
  @ApiProperty({ example: 251 })
  @IsInt()
  @Min(1)
  codigoDocumento: number;

  @ApiProperty({ example: 615 })
  @IsInt()
  @Min(1)
  codigoPedido: number;

  @ApiProperty({ example: 'PEDIDO' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nomeDocumento: string;

  @ApiProperty({
    description: 'Conteúdo do documento codificado em base64.',
    example: 'YmFzZTY0',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9+/]*={0,2}$/, {
    message: 'documento deve ser um conteúdo base64 válido.',
  })
  documento: string;
}
