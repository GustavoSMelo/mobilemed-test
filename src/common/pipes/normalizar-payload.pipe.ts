import { Injectable, type PipeTransform } from '@nestjs/common';

/**
 * Aceita payloads nos formatos do enunciado (PascalCase: `CodigoPedido`) e no
 * formato documentado na API (camelCase: `codigoPedido`). A normalização
 * recursiva transforma apenas a primeira letra de cada chave, preservando
 * valores, como o conteúdo base64 dos documentos.
 *
 * Deve ser registrado antes do `ValidationPipe` para que a validação e o
 * `whitelist` enxerguem as chaves normalizadas.
 */
@Injectable()
export class NormalizarPayloadPipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    return normalizar(value);
  }
}

function normalizar(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizar);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        lowerFirst(key),
        normalizar(child),
      ]),
    );
  }

  return value;
}

function lowerFirst(value: string): string {
  return value.length === 0
    ? value
    : value.charAt(0).toLowerCase() + value.slice(1);
}
