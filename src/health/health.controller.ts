import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';

interface HealthResponse {
  status: 'ok';
  uptimeSeconds: number;
  database: 'up';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  public constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Verifica a saúde da API e da conexão com o banco' })
  @ApiOkResponse({
    schema: {
      example: { status: 'ok', uptimeSeconds: 12, database: 'up' },
    },
  })
  @ApiServiceUnavailableResponse()
  public async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível.');
    }

    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      database: 'up',
    };
  }
}
