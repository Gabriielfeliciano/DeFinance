import type { ChainId } from '../shared/token';
import type { AlchemyPricesBySymbol, AlchemyToken, AlchemyTokensPage } from './alchemy-types';
import { CHAIN_CONFIG } from './chains';

/** Limite de páginas por rede: protege CU e tempo de resposta em carteiras gigantes. */
export const MAX_PAGES = 5;

export class AlchemyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlchemyError';
  }
}

/** Busca todos os tokens (nativo + ERC-20, com metadata e preço) de uma carteira em uma rede. */
export async function fetchChainTokens(
  address: string,
  chain: ChainId,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<AlchemyToken[]> {
  const url = `https://api.g.alchemy.com/data/v1/${apiKey}/assets/tokens/by-address`;
  const network = CHAIN_CONFIG[chain].alchemy;
  const byToken = new Map<string, AlchemyToken>();
  let pageKey: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        addresses: [{ address, networks: [network] }],
        withMetadata: true,
        withPrices: true,
        includeNativeTokens: true,
        includeErc20Tokens: true,
        ...(pageKey ? { pageKey } : {}),
      }),
    });
    if (!response.ok) {
      throw new AlchemyError(`${network} respondeu HTTP ${response.status}`);
    }

    const body = (await response.json()) as AlchemyTokensPage;
    if (body.error || !body.data) {
      throw new AlchemyError(`${network} falhou: ${body.error?.message ?? 'resposta sem data'}`);
    }

    for (const token of body.data.tokens) {
      byToken.set(token.tokenAddress?.toLowerCase() ?? 'native', token);
    }
    pageKey = body.data.pageKey ?? undefined;
    if (!pageKey) break;
  }

  return [...byToken.values()];
}

/** Preço em USD por símbolo (Prices API). Símbolo sem preço fica de fora do mapa. */
export async function fetchPricesBySymbol(
  symbols: readonly string[],
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Map<string, number>> {
  const query = new URLSearchParams(symbols.map((symbol) => ['symbols', symbol]));
  const response = await fetchFn(
    `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-symbol?${query}`,
  );
  if (!response.ok) {
    throw new AlchemyError(`prices by-symbol respondeu HTTP ${response.status}`);
  }

  const body = (await response.json()) as AlchemyPricesBySymbol;
  const prices = new Map<string, number>();
  for (const entry of body.data ?? []) {
    const usd = entry.prices.find((price) => price.currency.toLowerCase() === 'usd');
    const value = Number(usd?.value);
    if (value > 0) prices.set(entry.symbol, value);
  }
  return prices;
}
