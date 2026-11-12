import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExameDto {
  @ApiProperty({ example: '930' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  accessionNumber: string;

  @ApiProperty({ example: 'ALEFHER MONTONI DE ALMEIDA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nomePaciente: string;

  @ApiProperty({ example: 'CR' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  modalidade: string;

  @ApiPropertyOptional({
    description: 'Status informado pelo sistema de imagens.',
    example: 'NOVO',
    default: 'NOVO',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;
}
