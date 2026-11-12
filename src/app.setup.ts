import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { NormalizarPayloadPipe } from './common/pipes/normalizar-payload.pipe.js';

/**
 * Configuração HTTP compartilhada entre o bootstrap e os testes de integração,
 * para que ambos validem as mesmas regras.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(
    new NormalizarPayloadPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  return app;
}
