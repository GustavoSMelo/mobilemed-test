import { Module } from '@nestjs/common';
import { IntegracaoService } from './integracao.service.js';

@Module({
  providers: [IntegracaoService],
  exports: [IntegracaoService],
})
export class IntegracaoModule {}
