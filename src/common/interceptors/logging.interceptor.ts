import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

type RequestWithId = Request & { requestId?: string };

/**
 * Atribui um request id, devolve-o no header `x-request-id` e registra a
 * conclusão de cada requisição em formato estruturado.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();

    const requestId = this.resolveRequestId(request);
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const durationMs =
          Number(process.hrtime.bigint() - startedAt) / 1_000_000;

        this.logger.log({
          event: 'http.request.completed',
          requestId,
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
        });
      }),
    );
  }

  private resolveRequestId(request: Request): string {
    const incoming = request.header('x-request-id');
    return incoming && incoming.length <= 200 ? incoming : randomUUID();
  }
}
