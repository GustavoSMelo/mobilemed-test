import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorCode } from '../errors/error-codes.js';

type RequestWithId = Request & { requestId?: string };

interface HttpExceptionBody {
  code?: string;
  message?: string | string[];
  details?: unknown;
}

/**
 * Converte qualquer exceção em uma resposta de erro previsível:
 * { statusCode, code, message, details?, path, method, requestId, timestamp }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithId>();
    const response = ctx.getResponse<Response>();

    const { statusCode, code, message, details } = this.describe(exception);
    const requestId = request.requestId ?? 'unknown';

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({
        event: 'http.request.failed',
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode,
        code,
        error:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    } else {
      this.logger.warn({
        event: 'http.request.rejected',
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode,
        code,
        message,
      });
    }

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      ...(details === undefined ? {} : { details }),
      path: request.originalUrl,
      method: request.method,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private describe(exception: unknown): {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return {
          statusCode,
          code: this.codeForStatus(statusCode),
          message: body,
        };
      }

      const parsed = body as HttpExceptionBody;
      const message = Array.isArray(parsed.message)
        ? parsed.message.join('; ')
        : (parsed.message ?? exception.message);

      return {
        statusCode,
        code: parsed.code ?? this.codeForStatus(statusCode),
        message,
        details:
          parsed.details ??
          (Array.isArray(parsed.message) ? parsed.message : undefined),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.ERRO_INTERNO,
      message: 'Erro interno inesperado.',
    };
  }

  private codeForStatus(statusCode: number): string {
    if (statusCode === HttpStatus.BAD_REQUEST)
      return ErrorCode.VALIDACAO_INVALIDA;
    if (statusCode === HttpStatus.NOT_FOUND) return 'NAO_ENCONTRADO';
    if (statusCode === HttpStatus.CONFLICT) return 'CONFLITO';
    return ErrorCode.ERRO_INTERNO;
  }
}
