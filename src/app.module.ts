import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentosModule } from './documentos/documentos.module.js';
import { ExamesModule } from './exames/exames.module.js';
import { HealthController } from './health/health.controller.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PedidosModule,
    DocumentosModule,
    ExamesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
