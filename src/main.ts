import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap(): Promise<void> {
  const logger = new ConsoleLogger({ json: true, prefix: 'pedidos-api' });
  const app = await NestFactory.create(AppModule, { logger });

  configureApp(app);
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Integração de Pedidos e Documentos')
    .setDescription(
      'API que correlaciona pedidos de exame, documentos anexos e a chegada ' +
        'de exames pelo accession number. Consulte o README para as regras de ' +
        'integração e as decisões de modelagem.',
    )
    .setVersion('1.0')
    .addTag('Pedidos', 'Recebimento e consulta de pedidos de exame')
    .addTag('Documentos', 'Documentos vinculados aos pedidos')
    .addTag('Exames', 'Eventos de chegada de exame e consulta')
    .addTag('Health', 'Disponibilidade da API')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs/json',
    customSiteTitle: 'Integração de Pedidos e Documentos - API',
  });

  const port = Number(process.env.PORT ?? 3333);
  await app.listen(port);

  logger.log({
    event: 'application.started',
    port,
    docs: `http://localhost:${port}/docs`,
  });
}

bootstrap().catch((error: unknown) => {
  const logger = new ConsoleLogger({ json: true, prefix: 'pedidos-api' });
  logger.error({
    event: 'application.start_failed',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exitCode = 1;
});
