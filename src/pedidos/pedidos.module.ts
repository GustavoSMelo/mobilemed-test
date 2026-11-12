import { Module } from '@nestjs/common';
import { IntegracaoModule } from '../integracao/integracao.module.js';
import { PedidosController } from './pedidos.controller.js';
import { PedidosService } from './pedidos.service.js';

@Module({
  imports: [IntegracaoModule],
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule {}
