import { Module } from '@nestjs/common';
import { IntegracaoModule } from '../integracao/integracao.module.js';
import { DocumentosController } from './documentos.controller.js';
import { DocumentosService } from './documentos.service.js';

@Module({
  imports: [IntegracaoModule],
  controllers: [DocumentosController],
  providers: [DocumentosService],
})
export class DocumentosModule {}
