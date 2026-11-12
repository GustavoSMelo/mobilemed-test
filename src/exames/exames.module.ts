import { Module } from '@nestjs/common';
import { IntegracaoModule } from '../integracao/integracao.module.js';
import { ExamesController } from './exames.controller.js';
import { ExamesService } from './exames.service.js';

@Module({
  imports: [IntegracaoModule],
  controllers: [ExamesController],
  providers: [ExamesService],
})
export class ExamesModule {}
