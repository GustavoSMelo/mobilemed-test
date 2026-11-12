import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.js';

/**
 * Exceção de negócio com um código estável, usado pelo cliente da API para
 * tratar o erro sem depender do texto da mensagem.
 */
export class ApiException extends HttpException {
  public constructor(
    statusCode: HttpStatus,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super({ statusCode, code, message, details }, statusCode);
  }

  public static pedidoNaoEncontrado(codigoPedido: number): ApiException {
    return new ApiException(
      HttpStatus.NOT_FOUND,
      ErrorCode.PEDIDO_NAO_ENCONTRADO,
      `Pedido ${codigoPedido} não encontrado.`,
      { codigoPedido },
    );
  }

  public static exameNaoEncontrado(accessionNumber: string): ApiException {
    return new ApiException(
      HttpStatus.NOT_FOUND,
      ErrorCode.EXAME_NAO_ENCONTRADO,
      `Exame ${accessionNumber} não encontrado.`,
      { accessionNumber },
    );
  }

  public static documentoDuplicado(
    codigoDocumento: number,
    codigoPedido: number,
  ): ApiException {
    return new ApiException(
      HttpStatus.CONFLICT,
      ErrorCode.DOCUMENTO_DUPLICADO,
      `Já existe um documento ${codigoDocumento} para o pedido ${codigoPedido}.`,
      { codigoDocumento, codigoPedido },
    );
  }
}
