import type { LendingMarket } from '../shared/lending';
import { fetchAaveHealthFactors, fetchAaveMarkets, fetchAaveUserPositions } from './aave-client';
import { chainFromAaveId, toLendingMarkets } from './aave-mapper';
import type { AaveMarket } from './aave-types';
import { CHAIN_CONFIG, contractKey } from './chains';

/** Mesmo ritmo do cache de logos: a lista de mercados quase não muda. */
export const AAVE_MARKETS_TTL_MS = 30 * 60_000;

export interface AaveResult {
  markets: LendingMarket[];
  /** `<chain>:<contractKey(chain, aToken)>` (mesmo formato de `TokenItem.id`) de toda reserva de todo mercado (não só os da carteira). */
  aTokens: ReadonlySet<string>;
}

export interface AaveSource {
  forUser(address: string): Promise<AaveResult>;
}

export interface AaveSourceOptions {
  fetchFn?: typeof fetch;
  now?: () => number;
  marketsTtlMs?: number;
}

/**
 * Posições Aave v3 da carteira. Guarda os mercados por `marketsTtlMs`; se a
 * atualização falhar usa a última lista boa. Qualquer outra falha propaga:
 * quem chama decide o que mostrar.
 */
export function createAaveSource({
  fetchFn = fetch,
  now = Date.now,
  marketsTtlMs = AAVE_MARKETS_TTL_MS,
}: AaveSourceOptions = {}): AaveSource {
  let cache: { fetchedAt: number; markets: AaveMarket[] } | undefined;
  const chainIds = Object.values(CHAIN_CONFIG).flatMap((config) =>
    config.chainId === undefined ? [] : [config.chainId],
  );

  async function loadMarkets(): Promise<AaveMarket[]> {
    if (cache && now() - cache.fetchedAt < marketsTtlMs) return cache.markets;
    try {
      const markets = await fetchAaveMarkets(chainIds, fetchFn);
      cache = { fetchedAt: now(), markets };
      return markets;
    } catch (error) {
      if (!cache) throw error;
      console.warn('Mercados da Aave indisponíveis, usando a última lista:', String(error));
      return cache.markets;
    }
  }

  return {
    async forUser(address) {
      const markets = await loadMarkets();
      const user = address.toLowerCase();
      const [{ supplies, borrows }, health] = await Promise.all([
        fetchAaveUserPositions(user, markets, fetchFn),
        fetchAaveHealthFactors(user, markets, fetchFn),
      ]);
      return {
        markets: toLendingMarkets(markets, supplies, borrows, health),
        aTokens: aTokenKeys(markets),
      };
    },
  };
}

function aTokenKeys(markets: readonly AaveMarket[]): Set<string> {
  const keys = new Set<string>();
  for (const market of markets) {
    const chain = chainFromAaveId(market.chain.chainId);
    if (!chain) continue;
    for (const reserve of market.reserves)
      keys.add(`${chain}:${contractKey(chain, reserve.aToken.address)}`);
  }
  return keys;
}
