import { HttpErrorResponse, HttpResponse, type HttpInterceptorFn } from '@angular/common/http';
import { delay, mergeMap, of, throwError, timer } from 'rxjs';
import { addressKind } from '../../../shared/address';
import type { TokensResponse } from '../../../shared/token';
import {
  MOCK_AAVE_DANGER_PORTFOLIO,
  MOCK_AAVE_DOWN_PORTFOLIO,
  MOCK_AAVE_PORTFOLIO,
  MOCK_PORTFOLIO,
  MOCK_SECOND_PORTFOLIO,
  MOCK_SOLANA_PORTFOLIO,
} from './mock-portfolio';

export const MOCK_LATENCY_MS = 900;
/** Endereço que simula carteira vazia. */
export const MOCK_EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
/** Endereço que simula falha do proxy (502). */
export const MOCK_ERROR_ADDRESS = '0x000000000000000000000000000000000000dead';
/** Endereço que simula Linea e Scroll fora do ar (resposta parcial). */
export const MOCK_PARTIAL_ADDRESS = '0x00000000000000000000000000000000000beef0';
/** Segunda carteira, com tokens em comum com a de exemplo (multi-carteira). */
export const MOCK_SECOND_ADDRESS = '0x00000000000000000000000000000000000000b2';
/** Carteira com posições na Aave (Ethereum e Base). */
export const MOCK_AAVE_ADDRESS = '0x00000000000000000000000000000000000aa7e1';
/** Carteira com health factor perigoso na Aave. */
export const MOCK_AAVE_DANGER_ADDRESS = '0x00000000000000000000000000000000000aa7e2';
/** Carteira cuja consulta à Aave falha. */
export const MOCK_AAVE_DOWN_ADDRESS = '0x00000000000000000000000000000000000aa7e3';
/** Carteira Solana de exemplo. */
export const MOCK_SOLANA_ADDRESS = '86xCnPeV69n6t3DnyGvkKobf9FdN2H9oiVDdaMpo2MMY';

/** Responde `/api/tokens` com dados falsos. Só entra no build pela configuração `mock`. */
export const mockTokensInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || !req.url.endsWith('/api/tokens')) return next(req);

  const raw = req.params.get('address') ?? '';
  // Solana distingue maiúsculas: qualquer endereço dela recebe a carteira de exemplo.
  if (addressKind(raw) === 'solana') {
    return of(new HttpResponse({ status: 200, url: req.url, body: MOCK_SOLANA_PORTFOLIO })).pipe(delay(MOCK_LATENCY_MS));
  }
  const address = raw.toLowerCase();
  if (address === MOCK_ERROR_ADDRESS) {
    return timer(MOCK_LATENCY_MS).pipe(
      mergeMap(() =>
        throwError(() => new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway', url: req.url })),
      ),
    );
  }

  const byAddress: Record<string, TokensResponse> = {
    [MOCK_EMPTY_ADDRESS]: { tokens: [], totalValueUsd: 0, failedChains: [] },
    [MOCK_PARTIAL_ADDRESS]: { ...MOCK_PORTFOLIO, failedChains: ['linea', 'scroll'] },
    [MOCK_SECOND_ADDRESS]: MOCK_SECOND_PORTFOLIO,
    [MOCK_AAVE_ADDRESS]: MOCK_AAVE_PORTFOLIO,
    [MOCK_AAVE_DANGER_ADDRESS]: MOCK_AAVE_DANGER_PORTFOLIO,
    [MOCK_AAVE_DOWN_ADDRESS]: MOCK_AAVE_DOWN_PORTFOLIO,
  };
  const body = byAddress[address] ?? MOCK_PORTFOLIO;
  return of(new HttpResponse({ status: 200, url: req.url, body })).pipe(delay(MOCK_LATENCY_MS));
};
