import type { ChainId } from '../shared/token';
import type { LogoIndex } from './token-mapper';

/** Slug de cada rede nas listas públicas `tokens.coingecko.com/<slug>/all.json`. */
export const COINGECKO_PLATFORMS: Record<ChainId, string> = {
  ethereum: 'ethereum',
  arbitrum: 'arbitrum-one',
  base: 'base',
};

/** Mesmo `max-age` que a CoinGecko manda nas listas. */
export const LOGO_TTL_MS = 30 * 60_000;

/** Logo é enfeite: não pode segurar a resposta da carteira. */
export const LOGO_TIMEOUT_MS = 3_000;

export interface CoinGeckoToken {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

export interface CoinGeckoTokenList {
  name: string;
  logoURI: string;
  keywords: string[];
  timestamp: string;
  version: { major: number; minor: number; patch: number };
  tokens: CoinGeckoToken[];
}

export interface LogoSource {
  forChain(chain: ChainId): Promise<LogoIndex>;
}

export interface CoinGeckoLogosOptions {
  fetchFn?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

/**
 * Logos por contrato, a partir das listas públicas da CoinGecko (sem chave).
 * Guarda cada lista por `LOGO_TTL_MS` e nunca lança erro: na falha devolve a
 * última lista boa ou um índice vazio, e o token fica com as iniciais.
 */
export function createCoinGeckoLogos({
  fetchFn = fetch,
  now = Date.now,
  timeoutMs = LOGO_TIMEOUT_MS,
}: CoinGeckoLogosOptions = {}): LogoSource {
  const cache = new Map<ChainId, { fetchedAt: number; index: LogoIndex }>();

  return {
    async forChain(chain) {
      const cached = cache.get(chain);
      if (cached && now() - cached.fetchedAt < LOGO_TTL_MS) return cached.index;

      try {
        const index = await fetchLogoIndex(chain, fetchFn, timeoutMs);
        cache.set(chain, { fetchedAt: now(), index });
        return index;
      } catch (error) {
        console.warn(`Logos da CoinGecko indisponíveis (${chain}):`, String(error));
        return cached?.index ?? new Map();
      }
    },
  };
}

async function fetchLogoIndex(
  chain: ChainId,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<LogoIndex> {
  const url = `https://tokens.coingecko.com/${COINGECKO_PLATFORMS[chain]}/all.json`;
  const response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const body = (await response.json()) as Partial<CoinGeckoTokenList>;
  if (!Array.isArray(body.tokens)) throw new Error('lista sem tokens');

  const index = new Map<string, string>();
  for (const token of body.tokens) {
    // `thumb` tem 25px; `small` (50px) fica nítido no avatar de 32px.
    if (token.logoURI)
      index.set(token.address.toLowerCase(), token.logoURI.replace('/thumb/', '/small/'));
  }
  return index;
}
