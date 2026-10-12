import { HttpErrorResponse, HttpResponse, type HttpInterceptorFn } from '@angular/common/http';
import { delay, mergeMap, of, throwError, timer } from 'rxjs';
import type { TokensResponse } from '../../../shared/token';
import { MOCK_PORTFOLIO } from './mock-portfolio';

export const MOCK_LATENCY_MS = 900;
/** Endereço que simula carteira vazia. */
export const MOCK_EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
/** Endereço que simula falha do proxy (502). */
export const MOCK_ERROR_ADDRESS = '0x000000000000000000000000000000000000dead';

/** Responde `/api/tokens` com dados falsos. Só entra no build pela configuração `mock`. */
export const mockTokensInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || !req.url.endsWith('/api/tokens')) return next(req);

  const address = (req.params.get('address') ?? '').toLowerCase();
  if (address === MOCK_ERROR_ADDRESS) {
    return timer(MOCK_LATENCY_MS).pipe(
      mergeMap(() =>
        throwError(() => new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway', url: req.url })),
      ),
    );
  }

  const body: TokensResponse = address === MOCK_EMPTY_ADDRESS ? { tokens: [], totalValueUsd: 0 } : MOCK_PORTFOLIO;
  return of(new HttpResponse({ status: 200, url: req.url, body })).pipe(delay(MOCK_LATENCY_MS));
};
